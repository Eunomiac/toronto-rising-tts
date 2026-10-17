import { describe, expect, it } from "vitest";
import { rollCardKeys, NPC_FOLD } from "./rollFolds";
import type { RollsSlice } from "../../worldState";
const snapshot = (id: string, done = false): RollsSlice => ({
  pcs: [{ color: "Pink", name: "PC", rollId: id, done }],
  storyteller: { slots: [], live: { rollId: id, npcCharacterKey: "fatherDiaz" } }
} as unknown as RollsSlice);
describe("manual roll folds", () => {
  it("resets PC and NPC folds when a new roll replaces one directly", () => {
    const before = rollCardKeys(snapshot("first"));
    const after = rollCardKeys(snapshot("second"));
    for (const key of ["Pink", NPC_FOLD]) expect(after.get(key)).not.toBe(before.get(key));
  });
  it("keeps identity through broadcast without automatic folding", () => {
    expect(rollCardKeys(snapshot("first", true))).toEqual(rollCardKeys(snapshot("first")));
  });
});
