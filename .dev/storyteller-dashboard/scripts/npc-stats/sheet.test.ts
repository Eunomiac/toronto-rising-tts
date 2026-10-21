import { describe, expect, it } from "vitest";
import { normalizeStatBlock } from "../../src/shared/npcStats.ts";
import { parseStatRecord, parseTier, sheetRecords, stableId, type SheetRecord } from "./sheet.ts";

const base = (patch: Partial<SheetRecord> = {}): SheetRecord => ({
  Kind: "Vampire", Clan: "Caitiff", Generation: "Ninth", Rank: "Ancilla", "Blood Potency": "3", Humanity: "6",
  Difficulty: "5/3", Health: "7", Willpower: "6", Phy: "5", Soc: "4", Men: "3", Pow: "6",
  "Exceptional Pools": "Stealth:Dexterity+Stealth|Blood Sorcery:Intelligence+Occult",
  Attacks: "Fists=Phy+0:Strength+Brawl|Shiv=Stealth+2:Dexterity+Melee",
  Powers: "Obfuscate 3 (1-0:Cloak of Shadows,2-1:Unseen Passage=Stealth:Dexterity+Stealth_3,5-1:Vanish=Pow:Wits+Stealth_3,5)",
  "Ancilla Power(s)": "Secret Step (Spend one Rouse Check to disappear.)", "Elder Power(s)": "~", "Methuselah Power(s)": "~",
  Advantages: "Resources 3|Mask 2", "Special Abilities": "Iron Will (Add two dice against coercion.)", ...patch
});
describe("new NPC Sheet notation", () => {
  it("derives Exceptional dice and imports traits, difficulty lists, advantages and rich Notes", () => {
    const block = parseStatRecord(base(), "example", true);
    expect(block.exceptional[0]).toMatchObject({ name: "Stealth", dice: 10, traits: ["Dexterity", "Stealth"] });
    expect(block.attacks[1]).toMatchObject({ name: "Shiv", bonus: 2, traits: ["Dexterity", "Melee"] });
    expect(block.powers[0]?.powers[2]).toMatchObject({ name: "Vanish", difficulty: "3,5" });
    expect(block.advantages?.map((entry) => entry.name)).toEqual(["Resources 3", "Mask 2"]);
    expect(block.notes).toContain("<strong>Secret Step</strong>");
    expect(block.notes).toContain("<strong>Iron Will</strong>");
    expect(normalizeStatBlock(block)).toEqual(block);
  });

  it("supports a Powers pool on a mortal and omits generic Advantages", () => {
    const block = parseStatRecord(base({ Kind: "Mortal", Clan: "", Generation: "", Rank: "", "Blood Potency": "~", Humanity: "~",
      Pow: "2", Powers: "Manifestations 1 (1:Whisper Through Host=Pow:Resolve+Occult)", Advantages: "Resources 5" }), "host", false);
    expect(block).toMatchObject({ kind: "mortal", supernatural: 2 });
    expect(block.advantages).toEqual([]);
  });

  it("recognizes the Superhuman generic tier", () => expect(parseTier("Superhuman")).toBe("superhuman"));

  it("reports bad references instead of guessing", () => {
    expect(() => parseStatRecord(base({ Attacks: "Bite=Brawl+1" }), "bad", true)).toThrow(/unknown pool/);
  });
});

describe("Sheet utilities", () => {
  it("keeps the first duplicate header and ignores blank headers", () => {
    expect(sheetRecords([["Key", "", "Key"], ["first", "x", "second"]], "TEST")).toEqual([{ Key: "first" }]);
  });
  it("makes deterministic, collision-free ids", () => {
    const used = new Set<string>();
    const first = stableId("Stealth", used);
    expect(stableId("Stealth", new Set())).toBe(first);
    expect(stableId("Stealth", used)).not.toBe(first);
  });
});
