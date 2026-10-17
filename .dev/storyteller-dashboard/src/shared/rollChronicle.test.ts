import { describe, expect, it } from "vitest";
import { appendRolls, normalizeRollChronicle, type SavedRoll } from "./rollChronicle";

const roll = (rollId: string): SavedRoll => ({
  rollId,
  color: "Red",
  label: rollId,
  rollType: "standard",
  text: "WIN",
  at: "2026-10-17T00:00:00.000Z",
  entry: { rollId }
});

describe("roll chronicle", () => {
  it("fills missing automation flags and drops a row with no id", () => {
    const chronicle = normalizeRollChronicle({ entries: [{ color: "Red" }, roll("a")], permanent: { autoHunger: false } });
    expect(chronicle.entries.map((entry) => entry.rollId)).toEqual(["a"]);
    expect(chronicle.permanent.autoHunger).toBe(false);
    expect(chronicle.permanent.autoWp).toBe(true);
  });

  it("appends a roll once", () => {
    const start = normalizeRollChronicle({ entries: [roll("a")] });
    const again = appendRolls(start, [roll("a")]);
    expect(again).toBe(start);
    expect(appendRolls(start, [roll("b")]).entries.map((entry) => entry.rollId)).toEqual(["a", "b"]);
  });
});
