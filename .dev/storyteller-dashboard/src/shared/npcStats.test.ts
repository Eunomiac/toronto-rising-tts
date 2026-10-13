import { describe, expect, it } from "vitest";
import { configuredSlots, normalizeNpcStatsFile, normalizeStatBlock, parseNpcStatsPatch, poolOptions } from "./npcStats.js";

const vampire = {
  kind: "vampire",
  generation: 12,
  clan: "Lasombra",
  rank: "Ancilla",
  bloodPotency: 2,
  humanity: 5,
  difficultyStrong: 3,
  difficultyWeak: 5,
  health: 3,
  willpower: 3,
  physical: 2,
  social: 5,
  mental: 4,
  supernatural: 3,
  exceptional: [{ id: "occ", name: "Occult", dice: 9 }, { id: "half", name: "Academics" }, { id: "brawl", name: "Brawl (Feral Claws)", dice: 11 }],
  attacks: [{ id: "claws", name: "Feral Claws", pool: "ex:brawl", bonus: 2 }, { id: "gone", name: "Kick", pool: "ex:half", bonus: 0 }, { id: "x", name: "" }],
  powers: [
    { name: "Dominate", dots: 1, powers: [{ level: 1, name: "Compel", rouse: 0, pool: "social" }, { level: 2, name: "", pool: "" }] },
    { name: "", powers: [] },
    { name: "Protean", dots: 2, powers: [{ level: 2, name: "Feral Claws", rouse: 1, pool: "atk:claws" }] }
  ],
  notes: "  Hates the Prince.  "
};

describe("normalizeStatBlock", () => {
  it("drops incomplete pools, nameless attacks and powers, empty categories, and dangling pool refs", () => {
    const block = normalizeStatBlock(vampire);
    expect(block?.exceptional.map((pool) => pool.name)).toEqual(["Occult", "Brawl (Feral Claws)"]);
    expect(block?.attacks).toEqual([
      { id: "claws", name: "Feral Claws", pool: "ex:brawl", bonus: 2 },
      { id: "gone", name: "Kick", pool: "", bonus: 0 }
    ]);
    expect(block?.powers).toEqual([
      { name: "Dominate", dots: 1, powers: [{ level: 1, name: "Compel", rouse: 0, pool: "social" }] },
      { name: "Protean", dots: 2, powers: [{ level: 2, name: "Feral Claws", rouse: 1, pool: "atk:claws" }] }
    ]);
    expect(block?.notes).toBe("Hates the Prince.");
  });

  it("keeps vampire fields, the fourth pool and rouse checks only for kinds that have them", () => {
    const mortal = normalizeStatBlock({ ...vampire, kind: "mortal" });
    expect(mortal).not.toHaveProperty("generation");
    expect(mortal).not.toHaveProperty("clan");
    expect(mortal).not.toHaveProperty("supernatural");
    expect(mortal?.powers[1]?.powers[0]?.rouse).toBe(0);
    const ghoul = normalizeStatBlock({ ...vampire, kind: "ghoul" });
    expect(ghoul).not.toHaveProperty("bloodPotency");
    expect(ghoul?.supernatural).toBe(3);
  });

  it("drops out-of-range numbers and unknown clans, and returns null for an empty block", () => {
    const block = normalizeStatBlock({ ...vampire, generation: 20, clan: "Baali", health: 0 });
    expect(block).not.toHaveProperty("generation");
    expect(block).not.toHaveProperty("clan");
    expect(block).not.toHaveProperty("health");
    expect(normalizeStatBlock({ exceptional: [{ name: "Occult" }], notes: " " })).toBeNull();
  });
});

describe("pool options", () => {
  it("lists standard pools by kind, then exceptional pools, then attacks with their pool's dice", () => {
    const block = normalizeStatBlock(vampire);
    if (!block) {
      throw new Error("expected a block");
    }
    expect(poolOptions(block, false).map((option) => option.label)).toEqual([
      "Physical", "Social", "Mental", "Disciplines", "Occult", "Brawl (Feral Claws)"
    ]);
    expect(poolOptions(block, true).slice(-2)).toEqual([
      { ref: "atk:claws", label: "Feral Claws", dice: 11 },
      { ref: "atk:gone", label: "Kick", dice: undefined }
    ]);
  });
});

describe("the stats file", () => {
  it("keeps named and tier slots, and drops NPCs with no blocks", () => {
    const file = normalizeNpcStatsFile({ mylene: { named: vampire }, thug: { average: { physical: 3 }, deadly: { notes: "" } }, empty: {} });
    expect(Object.keys(file)).toEqual(["mylene", "thug"]);
    expect(configuredSlots(file.thug)).toEqual(["average"]);
    expect(configuredSlots(file.mylene)).toEqual(["named"]);
  });

  it("rejects bad character keys in a PUT", () => {
    expect(() => parseNpcStatsPatch({ "../x": {} })).toThrow(/Unknown/);
    expect(parseNpcStatsPatch({ thug: {} })).toEqual({ thug: {} });
  });
});
