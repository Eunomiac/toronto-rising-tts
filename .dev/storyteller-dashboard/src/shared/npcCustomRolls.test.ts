import { describe, expect, it } from "vitest";
import { formatNpcDifficulty, normalizeNpcRollMetadata, npcDifficultyAllows, parseNpcDifficulty } from "./npcCustomRolls";
import { normalizeStatBlock, preserveNpcRollMetadata, type NpcStatBlock } from "./npcStats";

const block: NpcStatBlock = {
  kind: "vampire",
  exceptional: [{ id: "roll", name: "Concentration", dice: 8, traits: ["Resolve", "Composure"], difficulty: "3-5" }],
  attacks: [{ id: "attack", name: "Strike", pool: "ex:roll", bonus: 2, traits: ["Strength", "Brawl"], difficulty: "4" }],
  powers: [{ name: "Dominate", powers: [{ level: 1, name: "Command", pool: "atk:attack", rouse: 1, traits: ["Charisma", "Dominate"], difficulty: "3+" }] }]
};

describe("NPC custom roll rules", () => {
  it.each([
    ["3", { kind: "fixed", min: 3 }], ["0", { kind: "fixed", min: 0 }],
    ['"2-5"', { kind: "range", min: 2, max: 5 }], [" 03 + ", { kind: "minimum", min: 3 }]
  ])("parses %s", (text, expected) => expect(parseNpcDifficulty(text as string)).toEqual(expected));
  it("filters minimums while preserving zero and filters ranges strictly", () => {
    const choices = Array.from({ length: 16 }, (_, n) => n);
    expect(choices.filter((n) => npcDifficultyAllows(parseNpcDifficulty("12+"), n))).toEqual([0, 12, 13, 14, 15]);
    expect(choices.filter((n) => npcDifficultyAllows(parseNpcDifficulty("2-5"), n))).toEqual([2, 3, 4, 5]);
    expect(npcDifficultyAllows(parseNpcDifficulty("3"), 10)).toBe(true);
  });
  it.each(["-1", "2.5", "16", "5-2", "3-16", "3++", "three", "1e1", "2/5"])("rejects %s", (text) => {
    expect(parseNpcDifficulty(text)).toBeNull();
  });
  it("normalizes authored free-text traits and preserves all three entry types", () => {
    expect(normalizeStatBlock(block)).toEqual(block);
    expect(normalizeNpcRollMetadata({ traits: ["  Blood Potency ", ""], difficulty: '"02 - 05"' }))
      .toEqual({ traits: ["Blood Potency", ""], difficulty: "2-5" });
    expect(normalizeNpcRollMetadata({ traits: [4, {}], difficulty: "invalid" })).toEqual({});
    expect(formatNpcDifficulty(parseNpcDifficulty("4+")!)).toBe("4+");
  });
  it("preserves local metadata after a sheet import changes ids and dice", () => {
    const imported: NpcStatBlock = {
      exceptional: [{ id: "new", name: "Concentration", dice: 9 }],
      attacks: [{ id: "newatk", name: "Strike", pool: "ex:new", bonus: 3 }],
      powers: [{ name: "Dominate", powers: [{ level: 1, name: "Command", pool: "atk:newatk", rouse: 0 }] }]
    };
    const merged = preserveNpcRollMetadata(imported, block);
    expect(merged.exceptional[0]).toMatchObject({ id: "new", dice: 9, traits: ["Resolve", "Composure"], difficulty: "3-5" });
    expect(merged.attacks[0]).toMatchObject({ bonus: 3, traits: ["Strength", "Brawl"], difficulty: "4" });
    expect(merged.powers[0]?.powers[0]).toMatchObject({ rouse: 0, traits: ["Charisma", "Dominate"], difficulty: "3+" });
  });
});
