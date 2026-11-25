import { describe, expect, it } from "vitest";
import {
  dismissStageReminder,
  isInNight,
  nightKey,
  readStageReminderStore,
  visibleStageReminders,
  writeStageReminderStore,
  type StageReminderStore
} from "./stageReminders.js";

const at = (y: number, m: number, d: number, h: number, min = 0): Date => new Date(y, m - 1, d, h, min);

const emptyStore = (): StageReminderStore => ({
  intermission: { recorder: true, scenesPreloaded: true, sessionTitle: true },
  awakeningDismissedNights: {},
  endBySession: {}
});

describe("nightKey / isInNight", () => {
  it("keys a night by dusk stamp", () => {
    expect(nightKey(at(2026, 11, 14, 19, 2))).toBe("2026-11-14T19:02");
  });

  it("treats dusk→dawn as one night across midnight", () => {
    const dusk = at(2026, 11, 14, 19, 0);
    const dawn = at(2026, 11, 15, 7, 0);
    expect(isInNight(at(2026, 11, 14, 21, 0), dusk, dawn)).toBe(true);
    expect(isInNight(at(2026, 11, 15, 1, 30), dusk, dawn)).toBe(true);
    expect(isInNight(at(2026, 11, 15, 6, 59), dusk, dawn)).toBe(true);
    expect(isInNight(at(2026, 11, 15, 7, 0), dusk, dawn)).toBe(false);
    expect(isInNight(at(2026, 11, 14, 12, 0), dusk, dawn)).toBe(false);
  });
});

describe("visibleStageReminders", () => {
  const dusk = at(2026, 11, 14, 19, 0);
  const dawn = at(2026, 11, 15, 7, 0);

  it("shows Intermission recorder and session title until dismissed or filled, and not the preload reminder", () => {
    const store = emptyStore();
    expect(visibleStageReminders({ phase: "Intermission", sessionName: "" }, store).map((r) => r.id)).toEqual([
      "recorder",
      "sessionTitle"
    ]);
    const after = dismissStageReminder(store, "recorder", { phase: "Intermission" });
    expect(visibleStageReminders({ phase: "Intermission", sessionName: "" }, after).map((r) => r.id)).toEqual([
      "sessionTitle"
    ]);
    expect(visibleStageReminders({ phase: "Intermission", sessionName: "The Wake" }, after).map((r) => r.id)).toEqual([]);
  });

  it("shows the preload reminder only on the opening Play downtime", () => {
    const store = emptyStore();
    const opening = { phase: "Play" as const, subPhase: "Downtime", sessionStartDowntime: true };
    expect(visibleStageReminders(opening, store).map((r) => r.id)).toEqual(["scenesPreloaded"]);
    expect(visibleStageReminders({ phase: "Play", subPhase: "Downtime" }, store).map((r) => r.id)).toEqual([]);
    const dismissed = dismissStageReminder(store, "scenesPreloaded", opening);
    expect(visibleStageReminders(opening, dismissed).map((r) => r.id)).toEqual([]);
  });

  it("shows awakening on Downtime inside the night", () => {
    const ids = visibleStageReminders(
      { phase: "Play", subPhase: "Downtime", now: at(2026, 11, 14, 22, 0), dusk, dawn },
      emptyStore()
    ).map((r) => r.id);
    expect(ids).toEqual(["awakening"]);
  });

  it("hides awakening in daylight", () => {
    const ids = visibleStageReminders(
      { phase: "Play", subPhase: "Downtime", now: at(2026, 11, 15, 12, 0), dusk, dawn },
      emptyStore()
    );
    expect(ids).toEqual([]);
  });

  it("suppresses awakening after dismiss for the same night, even on a later Downtime", () => {
    const ctx = { phase: "Play" as const, subPhase: "Downtime", now: at(2026, 11, 15, 2, 0), dusk, dawn };
    const dismissed = dismissStageReminder(emptyStore(), "awakening", ctx);
    expect(visibleStageReminders(ctx, dismissed)).toEqual([]);
    expect(
      visibleStageReminders(
        { ...ctx, now: at(2026, 11, 15, 5, 0) },
        dismissed
      )
    ).toEqual([]);
  });

  it("re-arms awakening when dusk advances to a new night", () => {
    const firstNight = { phase: "Play" as const, subPhase: "Downtime", now: at(2026, 11, 14, 22, 0), dusk, dawn };
    const dismissed = dismissStageReminder(emptyStore(), "awakening", firstNight);
    const nextDusk = at(2026, 11, 15, 19, 0);
    const nextDawn = at(2026, 11, 16, 7, 0);
    const ids = visibleStageReminders(
      { phase: "Play", subPhase: "Downtime", now: at(2026, 11, 15, 21, 0), dusk: nextDusk, dawn: nextDawn },
      dismissed
    ).map((r) => r.id);
    expect(ids).toEqual(["awakening"]);
  });

  it("shows the three End reminders once per sessionNum and dismisses independently", () => {
    const ctx = { phase: "End" as const, sessionNum: 12 };
    const store = emptyStore();
    expect(visibleStageReminders(ctx, store).map((r) => r.id)).toEqual([
      "darkBetween",
      "ratsInWalls",
      "blackCaesar",
      "saveGame"
    ]);
    const afterOne = dismissStageReminder(store, "ratsInWalls", ctx);
    expect(visibleStageReminders(ctx, afterOne).map((r) => r.id)).toEqual(["darkBetween", "blackCaesar", "saveGame"]);
    expect(visibleStageReminders({ phase: "End", sessionNum: 13 }, afterOne).map((r) => r.id)).toEqual([
      "darkBetween",
      "ratsInWalls",
      "blackCaesar",
      "saveGame"
    ]);
  });

  it("omits End reminders without a sessionNum", () => {
    expect(visibleStageReminders({ phase: "End" }, emptyStore())).toEqual([]);
  });
});

describe("sessionStorage round-trip", () => {
  it("persists dismissals and migrates the legacy Intermission key", () => {
    const memory: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => memory[key] ?? null,
      setItem: (key: string, value: string) => {
        memory[key] = value;
      },
      removeItem: (key: string) => {
        delete memory[key];
      },
      clear: () => {
        for (const key of Object.keys(memory)) {
          delete memory[key];
        }
      },
      key: () => null,
      length: 0
    } as Storage;

    storage.setItem(
      "tr.dashboard.intermissionRemindersDismissed",
      JSON.stringify({ recorder: false, scenesPreloaded: true })
    );
    const migrated = readStageReminderStore(storage);
    expect(migrated.intermission.recorder).toBe(false);
    expect(migrated.intermission.scenesPreloaded).toBe(true);

    const next = dismissStageReminder(migrated, "scenesPreloaded", { phase: "Intermission" });
    writeStageReminderStore(next, storage);
    expect(readStageReminderStore(storage).intermission).toEqual({
      recorder: false,
      scenesPreloaded: false,
      sessionTitle: true
    });
  });
});
