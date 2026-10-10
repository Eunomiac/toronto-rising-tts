import { describe, expect, it } from "vitest";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { defaultPace, offsetLabel, sceneTimeOf } from "./sceneClock";

const row = (clock: unknown): LibraryScene =>
  ({ key: "s", title: "S", placementMode: "standard", linked: false, sessionScene: { clock } }) as LibraryScene;

describe("sceneTimeOf", () => {
  it("reads a full datetime, even on a present-day row", () => {
    expect(sceneTimeOf(row({ year: 2026, month: 10, day: 9, hour: 22, minute: 5, isPresentDay: true })))
      .toEqual({ year: 2026, month: 10, day: 9, hour: 22, minute: 5 });
  });

  it("has no time for a row that only follows present day", () => {
    expect(sceneTimeOf(row({ isPresentDay: true }))).toBeUndefined();
    expect(sceneTimeOf(undefined)).toBeUndefined();
  });
});

describe("defaultPace", () => {
  const present = new Date(2026, 9, 10, 1, 30);

  it("catches up at ×5 when the scene is earlier the same night", () => {
    expect(defaultPace(new Date(2026, 9, 9, 22, 0), present)).toBe("x5");
    expect(defaultPace(new Date(2026, 9, 10, 0, 45), present)).toBe("x5");
  });

  it("runs at ×2 for an earlier night, a later time, or no present day", () => {
    expect(defaultPace(new Date(2026, 9, 8, 23, 0), present)).toBe("x2");
    expect(defaultPace(new Date(2026, 9, 10, 2, 0), present)).toBe("x2");
    expect(defaultPace(present, present)).toBe("x2");
    expect(defaultPace(new Date(2026, 9, 9, 22, 0), undefined)).toBe("x2");
  });
});

describe("offsetLabel", () => {
  it("reads minutes and hours", () => {
    expect(offsetLabel(45)).toBe("+45 min");
    expect(offsetLabel(120)).toBe("+2 h");
    expect(offsetLabel(90)).toBe("+1 h 30");
  });
});
