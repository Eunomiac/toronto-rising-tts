import { describe, expect, it } from "vitest";
import { normalizeStatBlock } from "../../src/shared/npcStats.ts";
import { COLUMNS, parseCharacters, splitTop, stableId } from "./sheet.ts";

const HEADER = ["Name", "Quote", ...Object.values(COLUMNS), "Quote"];

const row = (cells: Partial<Record<keyof typeof COLUMNS, string>>): string[] =>
  ["Someone", "", ...Object.keys(COLUMNS).map((column) => cells[column as keyof typeof COLUMNS] ?? ""), ""];

const parse = (...rows: Partial<Record<keyof typeof COLUMNS, string>>[]) => parseCharacters([HEADER, ...rows.map(row)]);

describe("splitTop", () => {
  it("splits only on top-level commas", () => {
    expect(splitTop('A 2 (1-0-B, 2-1-C), D [E, F] 3, G-"x, y"')).toEqual(["A 2 (1-0-B, 2-1-C)", "D [E, F] 3", 'G-"x, y"']);
  });
});

describe("stableId", () => {
  it("is the same for the same name and never repeats within a block", () => {
    const used = new Set<string>();
    const first = stableId("Stealth", used);
    expect(stableId("Stealth", new Set())).toBe(first);
    expect(stableId("Stealth", used)).not.toBe(first);
  });
});

describe("parseCharacters", () => {
  it("reads a vampire block and resolves pool refs", () => {
    const { blocks, errors } = parse({
      key: "testVamp",
      type: "Kindred",
      clan: "caitiff",
      generation: "Ninth",
      rank: "Ancilla",
      bloodPotency: "3",
      humanity: "6",
      difficulty: "6/4",
      health: "7",
      willpower: "6",
      physical: "5",
      social: "4",
      mental: "3",
      supernatural: "6",
      exceptional: "Stealth 9, Melee [Knives] 8",
      attacks: "Fists-Phy+0, Shiv-Melee+2, Shove-Athletics+1",
      powers: "Obfuscate 3 (1-0-Silence of Death, 2-1-Unseen Passage-Stealth, 3-1-Self-Assurance, 3-1-Ghost Step-Script-pow)",
      ancilla: 'Obfuscate 4 (4-1-Vanish-Stealth-"Disappears, even when watched.")',
      elder: "Old Trick (Does a thing, slowly.)"
    });
    expect(errors).toEqual([]);
    const block = blocks.get("testVamp")!;
    const stealth = block.exceptional!.find((pool) => pool.name === "Stealth")!;
    const knives = block.exceptional!.find((pool) => pool.name === "Melee [Knives]")!;
    expect(block).toMatchObject({
      kind: "vampire", clan: "Caitiff", generation: 9, rank: "Ancilla", bloodPotency: 3, humanity: 6,
      difficultyStrong: 6, difficultyWeak: 4, health: 7, willpower: 6, physical: 5, supernatural: 6
    });
    expect(block.attacks).toEqual([
      expect.objectContaining({ name: "Fists", pool: "physical", bonus: 0 }),
      expect.objectContaining({ name: "Shiv", pool: `ex:${knives.id}`, bonus: 2 }),
      expect.objectContaining({ name: "Shove", pool: "physical", bonus: 1 })
    ]);
    expect(block.powers).toEqual([{
      name: "Obfuscate",
      dots: 3,
      powers: [
        { level: 1, name: "Silence of Death", rouse: 0, pool: "" },
        { level: 2, name: "Unseen Passage", rouse: 1, pool: `ex:${stealth.id}` },
        { level: 3, name: "Self-Assurance", rouse: 1, pool: "" },
        { level: 3, name: "Ghost Step-Script", rouse: 1, pool: "supernatural" },
        { level: 4, name: "Vanish", rouse: 1, pool: `ex:${stealth.id}`, ancilla: true }
      ]
    }]);
    expect(block.notes).toBe(
      "Vanish (Obfuscate ancilla power): Disappears, even when watched.\nElder power: Old Trick: Does a thing, slowly."
    );
    expect(normalizeStatBlock(block)).toEqual(block);
  });

  it("maps types to kinds and drops fields the kind does not use", () => {
    const { blocks, errors } = parse(
      { key: "testGhoul", type: "Mortal", clan: "Ghoul", physical: "4", supernatural: "2" },
      { key: "testWolf", type: "Werewolf", rank: "Fostern", physical: "8", supernatural: "5" },
      { key: "testShade", type: "Wraith", mental: "5" },
      { key: "testMortal", type: "Mortal", clan: "~", social: "3", powers: "Faith 1 (1-2-Prayer-Soc)" }
    );
    expect(errors).toEqual([]);
    expect(blocks.get("testGhoul")).toMatchObject({ kind: "ghoul", supernatural: 2 });
    expect(blocks.get("testWolf")).toMatchObject({ kind: "werewolf", supernatural: 5 });
    expect(blocks.get("testWolf")).not.toHaveProperty("rank");
    expect(blocks.get("testShade")).toMatchObject({ kind: "spirit", mental: 5 });
    expect(blocks.get("testMortal")!.powers![0]!.powers[0]).toEqual({ level: 1, name: "Prayer", rouse: 0, pool: "social" });
  });

  it("skips rows without stats", () => {
    const { blocks, skipped, errors } = parse({ key: "testPc", type: "Kindred", bloodPotency: "2" }, { key: "" });
    expect(errors).toEqual([]);
    expect(blocks.size).toBe(0);
    expect(skipped).toEqual(["testPc"]);
  });

  it("reports bad cells instead of guessing", () => {
    const { blocks, errors } = parse(
      { key: "testBad", type: "Kindred", clan: "Nobody", difficulty: "6", physical: "x", attacks: "Bite-Teeth+1" },
      { key: "testMortalPow", type: "Mortal", supernatural: "3" },
      { key: "testAmbiguous", type: "Animal", exceptional: "Melee [A] 3, Melee [B] 4", attacks: "Hit-Melee+0" },
      { key: "testType", type: "Ghost", physical: "1" }
    );
    expect(blocks.size).toBe(0);
    expect(errors).toHaveLength(4);
    for (const problem of [/Clan "Nobody"/, /Difficulty "6"/, /Phy "x"/, /Attack "Bite-Teeth\+1"/]) {
      expect(errors[0]).toMatch(problem);
    }
    expect(errors[1]).toMatch(/testMortalPow: Pow 3/);
    expect(errors[2]).toMatch(/testAmbiguous: Attack "Hit-Melee\+0"/);
    expect(errors[3]).toMatch(/testType: unknown Type "Ghost"/);
  });

  it("requires every header", () => {
    expect(() => parseCharacters([["API key", "Type"]])).toThrow(/missing header\(s\): Clan/);
  });
});
