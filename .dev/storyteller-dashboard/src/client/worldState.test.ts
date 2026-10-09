import { describe, expect, it } from "vitest";
import { applyWorldEvent, clockNow, mergeWorldSnapshot, type ClockAnchor, type WorldState } from "./worldState.js";

const MINUTE = 60_000;

const anchor = (overrides: Partial<ClockAnchor> = {}): ClockAnchor => ({
  activeClock: "scene",
  running: true,
  speed: 1,
  catchUpToPresentDay: false,
  isPresentDay: false,
  scene: { year: 2026, month: 3, day: 14, hour: 21, minute: 30 },
  at: 1_000_000,
  ...overrides
});

describe("applyWorldEvent", () => {
  it("replaces one slice per world topic and stamps the clock with the server time", () => {
    let state: WorldState = {};
    state = applyWorldEvent(state, { topic: "phase", data: { phase: "Play", sessionName: "", sessionStartDowntime: false, memoriamActive: false } });
    state = applyWorldEvent(state, { topic: "clock", data: { activeClock: "scene", running: false, speed: 0 }, at: 42 });
    expect(state.phase?.phase).toBe("Play");
    expect(state.clock?.at).toBe(42);
    state = applyWorldEvent(state, { topic: "phase", data: { phase: "Intermission", sessionName: "", sessionStartDowntime: false, memoriamActive: false } });
    expect(state.phase?.phase).toBe("Intermission");
    expect(state.clock?.at).toBe(42);
  });

  it("turns Lua empty tables into empty lists", () => {
    const state = applyWorldEvent({}, { topic: "seats", data: { seats: {}, stage: {}, spotlightOrder: {}, generics: {}, scatter: {} } });
    expect(state.seats).toEqual({ seats: [], stage: [], spotlightOrder: [], generics: [], scatter: [] });
    const sound = applyWorldEvent({}, { topic: "soundscape", data: { lanes: {} } });
    expect(sound.soundscape?.lanes).toEqual([]);
  });

  it("reads the rolls slice, with Lua empty tables as empty lists and missing flags as false", () => {
    const empty = applyWorldEvent({}, { topic: "rolls", data: { pcs: {}, storyteller: { canInitiate: true, slots: {} }, werewolves: {}, oblivionSeats: {} } });
    expect(empty.rolls).toEqual({ pcs: [], storyteller: { canInitiate: true, slots: [] }, werewolves: [], oblivionSeats: [] });
    const state = applyWorldEvent({}, {
      topic: "rolls",
      data: {
        pcs: [{ color: "Red", name: "Rashid", rollType: "standard", phase: "setup", pool: { normal: 4, hunger: 0, bogus: 2 }, dice: {} }],
        storyteller: {
          canInitiate: false,
          slots: [{ index: 1, label: "Drake", live: true, canBroadcast: false, pendingBroadcast: false }],
          live: { rollType: "werewolf", hint: "Pick the pool.", pool: { werewolf: 3, rage: 1 }, dice: {}, actions: {}, secret: true, wpReroll: true }
        },
        werewolves: ["drake"],
        oblivionSeats: {}
      }
    });
    const pc = state.rolls?.pcs[0];
    expect(pc?.pool).toEqual({ normal: 4 });
    expect(pc?.dice).toEqual([]);
    expect(pc?.conditions).toBe("");
    expect(pc?.done).toBe(false);
    expect(pc?.canModifyPool).toBe(false);
    expect(pc?.wpReroll).toBe(false);
    expect(state.rolls?.storyteller.live?.wpReroll).toBe(true);
    expect(state.rolls?.storyteller.live?.pool).toEqual({ werewolf: 3, rage: 1 });
    expect(state.rolls?.storyteller.live?.secret).toBe(true);
    expect(state.rolls?.storyteller.live?.quiet).toBe(false);
    expect(state.rolls?.werewolves).toEqual(["drake"]);
  });

  it("reads a clock encoded as an empty Lua table as no clock", () => {
    const state = applyWorldEvent({}, {
      topic: "clock",
      data: { activeClock: "scene", running: false, speed: 1, scene: [], presentDay: { year: 2026, month: 9, day: 22, hour: 5, minute: 33 } },
      at: 1
    });
    expect(state.clock?.scene).toBeUndefined();
    expect(state.clock?.presentDay?.day).toBe(22);
  });

  it("clears on reload and ignores other topics", () => {
    const state = applyWorldEvent({}, { topic: "scene", data: { liveKey: "elysium" } });
    expect(applyWorldEvent(state, { topic: "pcSeat", color: "Red", data: {} })).toBe(state);
    expect(applyWorldEvent(state, { topic: "scene" })).toBe(state);
    expect(applyWorldEvent(state, { topic: "reload" })).toEqual({});
  });
});

describe("mergeWorldSnapshot", () => {
  it("fills only slices no push has delivered", () => {
    const pushed = applyWorldEvent({}, { topic: "scene", data: { liveKey: "pushed" } });
    const merged = mergeWorldSnapshot(pushed, {
      ok: true,
      scene: { liveKey: "stale" },
      clock: { activeClock: "scene", running: false, speed: 0 }
    }, 7);
    expect(merged.scene).toEqual({ liveKey: "pushed" });
    expect(merged.clock?.at).toBe(7);
  });
});

describe("clockNow", () => {
  it("returns the anchor while paused", () => {
    const clock = anchor({ running: false });
    expect(clockNow(clock, clock.at + 90 * MINUTE)).toEqual(clock.scene);
  });

  it("advances speed narrative minutes per real minute", () => {
    expect(clockNow(anchor(), 1_000_000 + 5 * MINUTE + 59_000)).toEqual({ year: 2026, month: 3, day: 14, hour: 21, minute: 35 });
    expect(clockNow(anchor({ speed: 5 }), 1_000_000 + 3 * MINUTE)).toEqual({ year: 2026, month: 3, day: 14, hour: 21, minute: 45 });
  });

  it("rolls over midnight, month end and leap day", () => {
    const leap = anchor({ scene: { year: 2028, month: 2, day: 28, hour: 23, minute: 50 } });
    expect(clockNow(leap, leap.at + 20 * MINUTE)).toEqual({ year: 2028, month: 2, day: 29, hour: 0, minute: 10 });
    const plain = anchor({ scene: { year: 2026, month: 2, day: 28, hour: 23, minute: 50 } });
    expect(clockNow(plain, plain.at + 20 * MINUTE)).toEqual({ year: 2026, month: 3, day: 1, hour: 0, minute: 10 });
    const newYear = anchor({ scene: { year: 2026, month: 12, day: 31, hour: 23, minute: 59 } });
    expect(clockNow(newYear, newYear.at + MINUTE)).toEqual({ year: 2027, month: 1, day: 1, hour: 0, minute: 0 });
  });

  it("stops at the present day during catch-up", () => {
    const clock = anchor({
      speed: 5,
      catchUpToPresentDay: true,
      presentDay: { year: 2026, month: 3, day: 14, hour: 22, minute: 0 }
    });
    expect(clockNow(clock, clock.at + 60 * MINUTE)).toEqual(clock.presentDay);
  });

  it("follows the Downtime clock in Downtime", () => {
    const clock = anchor({ activeClock: "downtime", downtime: { year: 2026, month: 4, day: 1, hour: 20, minute: 0 } });
    expect(clockNow(clock, clock.at + 2 * MINUTE)).toEqual({ year: 2026, month: 4, day: 1, hour: 20, minute: 2 });
    expect(clockNow(anchor({ activeClock: "downtime" }), 0)).toBeUndefined();
  });
});
