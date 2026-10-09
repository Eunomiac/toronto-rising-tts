import { describe, expect, it } from "vitest";
import type { ScatterGroup } from "../worldState";
import { fillOrder, movePack, moveInScatter, offStage, slotNear, spreadOnPack, withChanges, type StageSpot } from "./stage";
import { boardToStage, stageToBoard, type StagePack, type StageSlot } from "./stageFrame";

/** A five-slot arc pack in stage fractions, anchor in the middle. */
const arcPack = (familyId: string, u: number, v: number): StagePack => {
  const slots: StageSlot[] = [-2, -1, 0, 1, 2].map((step, index) => ({
    snapIndex: index,
    isAnchor: step === 0,
    u: u + step * 0.04,
    v
  }));
  return { familyId, label: familyId, far: false, slots, center: { u, v } };
};

const left = arcPack("Left", 0.2, 0.5);
const right = arcPack("Right", 0.7, 0.5);
const packs = [left, right];

const at = (slot: StageSlot): { u: number; v: number } => stageToBoard(slot.u, slot.v);

const near = (actual: { u: number; v: number }, expected: { u: number; v: number }): void => {
  expect(actual.u).toBeCloseTo(expected.u, 6);
  expect(actual.v).toBeCloseTo(expected.v, 6);
};

const spot = (characterKey: string, slot: StageSlot, lit = true): StageSpot => ({ characterKey, lit, u: slot.u, v: slot.v });

describe("fillOrder", () => {
  it("starts on the anchor and works outward, left before right", () => {
    expect(fillOrder(left).map((slot) => slot.snapIndex)).toEqual([2, 1, 3, 0, 4]);
  });
});

describe("slotNear / offStage", () => {
  it("snaps only within reach of a slot", () => {
    const slot = left.slots[2] as StageSlot;
    expect(slotNear({ u: slot.u + 5 / 1000, v: slot.v }, packs, 1000, 500)?.slot).toBe(slot);
    expect(slotNear({ u: slot.u, v: slot.v + 0.2 }, packs, 1000, 500)).toBeNull();
  });

  it("treats the seat band and outside the drawing as off the stage", () => {
    expect(offStage({ u: 0.5, v: 0.9 })).toBe(true);
    expect(offStage({ u: -0.1, v: 0.5 })).toBe(true);
    expect(offStage({ u: 0.5, v: 0.5 })).toBe(false);
  });
});

describe("spreadOnPack", () => {
  it("puts the leader on the anchor and lights NPCs new to the stage", () => {
    const changes = spreadOnPack(["boss", "second"], left, packs, []);
    const boss = changes.boss;
    const second = changes.second;
    expect(boss && "lightMode" in boss ? boss.lightMode : undefined).toBe("STANDARD");
    near(boss && !("remove" in boss) ? boss : { u: NaN, v: NaN }, at(left.slots[2] as StageSlot));
    near(second && !("remove" in second) ? second : { u: NaN, v: NaN }, at(left.slots[1] as StageSlot));
  });

  it("moves anyone already on the pack to the nearest free slot elsewhere, unlit", () => {
    const changes = spreadOnPack(["boss"], left, packs, [spot("squatter", left.slots[2] as StageSlot)]);
    const squatter = changes.squatter;
    expect(squatter && "lightMode" in squatter ? squatter.lightMode : undefined).toBe("OFF");
    near(squatter && !("remove" in squatter) ? squatter : { u: NaN, v: NaN }, at(right.slots[0] as StageSlot));
  });

  it("keeps the light of NPCs already on the stage", () => {
    const changes = spreadOnPack(["boss"], left, packs, [spot("boss", right.slots[2] as StageSlot, false)]);
    expect(changes.boss && "lightMode" in changes.boss).toBe(false);
  });
});

describe("movePack", () => {
  it("carries a pack's tokens to another pack in anchor order", () => {
    const changes = movePack(left, right, packs, [spot("a", left.slots[2] as StageSlot), spot("b", left.slots[1] as StageSlot)]);
    near(changes.a && !("remove" in changes.a) ? changes.a : { u: NaN, v: NaN }, at(right.slots[2] as StageSlot));
    near(changes.b && !("remove" in changes.b) ? changes.b : { u: NaN, v: NaN }, at(right.slots[1] as StageSlot));
  });

  it("does nothing when dropped back on itself", () => {
    expect(movePack(left, left, packs, [spot("a", left.slots[2] as StageSlot)])).toEqual({});
  });
});

describe("withChanges", () => {
  it("moves, darkens, removes and adds tokens", () => {
    const board = stageToBoard(0.5, 0.3);
    const spots = [spot("a", left.slots[0] as StageSlot), spot("b", left.slots[1] as StageSlot)];
    const out = withChanges(spots, {
      a: { u: board.u, v: board.v, lightMode: "OFF" },
      b: { remove: true },
      c: { u: board.u, v: board.v }
    });
    expect(out.map((entry) => [entry.characterKey, entry.lit])).toEqual([["a", false], ["c", true]]);
    near(out[0] as StageSpot, boardToStage(board.u, board.v));
  });
});

describe("moveInScatter", () => {
  const groups: readonly ScatterGroup[] = [
    { group: 1, pcs: [{ characterKey: "pc1" }], npcs: [{ characterKey: "npc1" }] },
    { group: 2, pcs: [], npcs: [] }
  ];

  it("moves a character from one group to another", () => {
    const out = moveInScatter(groups, { characterKey: "npc1", kind: "npc", group: 2 });
    expect(out[0]?.npcs).toEqual([]);
    expect(out[1]?.npcs).toEqual([{ characterKey: "npc1" }]);
  });

  it("takes an NPC off with no group", () => {
    const out = moveInScatter(groups, { characterKey: "npc1", kind: "npc" });
    expect(out.flatMap((entry) => entry.npcs)).toEqual([]);
    expect(out[0]?.pcs).toEqual([{ characterKey: "pc1" }]);
  });
});
