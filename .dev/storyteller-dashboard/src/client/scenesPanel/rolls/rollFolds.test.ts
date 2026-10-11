import { describe, expect, it } from "vitest";
import { foldChanges } from "./rollFolds";

const states = (entries: Record<string, boolean>): ReadonlyMap<string, boolean> => new Map(Object.entries(entries));

describe("foldChanges", () => {
  it("folds a card when its roll is broadcast", () => {
    expect(foldChanges(states({ Red: false }), states({ Red: true }))).toEqual({ fold: ["Red"], unfold: [] });
  });

  it("folds a drawer that appears already broadcast", () => {
    expect(foldChanges(states({}), states({ "drawer-2": true }))).toEqual({ fold: ["drawer-2"], unfold: [] });
  });

  it("unfolds when a new roll starts in the same seat", () => {
    expect(foldChanges(states({ Red: true }), states({ Red: false }))).toEqual({ fold: [], unfold: ["Red"] });
  });

  it("leaves unchanged cards alone", () => {
    expect(foldChanges(states({ Red: true, Pink: false }), states({ Red: true, Pink: false }))).toEqual({ fold: [], unfold: [] });
  });
});
