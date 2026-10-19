import { applyNpcConditions } from "./npcConditions.js";
import { describe, expect, it } from "vitest";
import { planNpcRoll, planNpcTypeSeed, undamagedWillpower, type NpcRollInput } from "./npcRollPlan.js";
import type { NpcStatBlock } from "./npcStats.js";

const rules = { withoutHunger: ["simpleCheck", "rouse", "rouseOblivion", "werewolf", "willpowerRoll", "humanityRoll", "frenzy", "remorse"] };
const bp2 = { bloodSurge: 2, discBonus: 1, discReroll: 1 };

const mylene: NpcStatBlock = {
  kind: "vampire",
  bloodPotency: 2,
  humanity: 5,
  willpower: 4,
  physical: 6,
  social: 4,
  supernatural: 5,
  exceptional: [{ id: "brawl", name: "Brawl", dice: 7 }],
  attacks: [{ id: "claws", name: "Feral Claws", pool: "ex:brawl", bonus: 2 }],
  powers: [
    {
      name: "Protean",
      powers: [
        { level: 1, name: "Eyes of the Beast", rouse: 1, pool: "" },
        { level: 2, name: "Feral Weapons", rouse: 1, pool: "atk:claws" },
        { level: 3, name: "Earth Meld", rouse: 0, pool: "" }
      ]
    },
    { name: "Oblivion", powers: [{ level: 2, name: "Shadow Cloak", rouse: 2, pool: "supernatural" }] }
  ]
};

const input = (overrides: Partial<NpcRollInput>): NpcRollInput => ({
  name: "Mylene",
  block: mylene,
  levels: { hunger: 2 },
  rollType: "standard",
  entry: { kind: "pool", ref: "physical" },
  bloodPotency: bp2,
  rules,
  ...overrides
});

describe("planNpcRoll", () => {
  it("splits a standard pool into normal and Hunger dice", () => {
    const plan = planNpcRoll(input({}));
    expect(plan).toMatchObject({ kind: "roll", normal: 4, hunger: 2, rage: 0, rouse: [], heading: "Physical", line: "Mylene rolls Physical" });
  });

  it("takes no Hunger dice on roll types without them", () => {
    expect(planNpcRoll(input({ rollType: "simpleCheck" }))).toMatchObject({ normal: 6, hunger: 0 });
  });

  it("caps Hunger dice at the pool size", () => {
    expect(planNpcRoll(input({ levels: { hunger: 5 }, entry: { kind: "pool", ref: "ex:brawl" }, block: { ...mylene, exceptional: [{ id: "brawl", name: "Brawl", dice: 3 }] } }))).toMatchObject({ normal: 0, hunger: 3 });
  });

  it("rolls an attack with its margin bonus", () => {
    const plan = planNpcRoll(input({ entry: { kind: "attack", id: "claws" } }));
    expect(plan).toMatchObject({ poolDice: 7, heading: "Attack", line: "Mylene attacks with Brawl (Feral Claws)", marginBonus: 2, marginLabel: "Feral Claws" });
  });

  it("adds the discipline bonus and a rerolled rouse check to a power at or below the reroll level", () => {
    const plan = planNpcRoll(input({ rollType: "discipline", entry: { kind: "power", category: 1, power: 0 } }));
    expect(plan).toMatchObject({ poolDice: 5, discBonus: 1, normal: 4, hunger: 2, hungerOnFail: true, heading: "Oblivion", line: "Mylene uses Shadow Cloak (Oblivion)" });
    expect(plan.rouse).toEqual([{ dice: 1, oblivion: true }, { dice: 1, oblivion: true }]);
  });

  it("adds the discipline bonus to a standard pool when the roll type is Discipline", () => {
    expect(planNpcRoll(input({ rollType: "discipline" }))).toMatchObject({
      poolDice: 6,
      discBonus: 1,
      normal: 5,
      hunger: 2,
      heading: "Physical"
    });
  });

  it("gives two dice per check when the power level is within the reroll value", () => {
    const plan = planNpcRoll(input({ bloodPotency: { ...bp2, discReroll: 2 }, entry: { kind: "power", category: 0, power: 1 } }));
    expect(plan.rouse).toEqual([{ dice: 2, oblivion: false }]);
    expect(plan).toMatchObject({ poolDice: 7, marginBonus: 2, heading: "Protean", line: "Mylene uses Feral Weapons (Protean)" });
  });

  it("makes a pool-less power with rouse checks rouse-only, and one without passive", () => {
    expect(planNpcRoll(input({ entry: { kind: "power", category: 0, power: 0 } }))).toMatchObject({
      kind: "rouseOnly",
      rollType: "rouse",
      normal: 0,
      rouse: [{ dice: 2, oblivion: false }],
      line: "Mylene activates Eyes of the Beast (Protean)"
    });
    expect(planNpcRoll(input({ entry: { kind: "power", category: 0, power: 2 } }))).toMatchObject({ kind: "passive", rouse: [], line: "Mylene activates Earth Meld (Protean)" });
  });

  it("rolls Rage dice for werewolves and gives ghouls rouse checks without Hunger", () => {
    const wolf: NpcStatBlock = { kind: "werewolf", physical: 5, exceptional: [], attacks: [], powers: [] };
    expect(planNpcRoll(input({ block: wolf, rollType: "werewolf", levels: { rage: 3 } }))).toMatchObject({ normal: 2, rage: 3, hunger: 0 });
    const ghoul: NpcStatBlock = { kind: "ghoul", physical: 3, exceptional: [], attacks: [], powers: [{ name: "Potence", powers: [{ level: 1, name: "Lethal Body", rouse: 1, pool: "physical" }] }] };
    const plan = planNpcRoll(input({ block: ghoul, entry: { kind: "power", category: 0, power: 0 } }));
    expect(plan).toMatchObject({ normal: 3, hunger: 0, discBonus: 0, hungerOnFail: false, rouse: [{ dice: 1, oblivion: false }] });
  });

  it("pre-populates Willpower from undamaged boxes and ignores the Configure entry", () => {
    expect(planNpcRoll(input({
      rollType: "willpowerRoll",
      levels: { hunger: 2, wpSup: 1, wpAgg: 0 },
      entry: { kind: "pool", ref: "physical" }
    }))).toMatchObject({
      poolDice: 3,
      discBonus: 0,
      normal: 3,
      hunger: 0,
      heading: "Willpower",
      line: "Mylene rolls Willpower"
    });
  });

  it("pre-populates Frenzy as undamaged Willpower plus one third of Humanity", () => {
    // Willpower 4 − 1 sup = 3; Humanity 5 → floor(5/3)=1 → 4 dice, no Hunger.
    expect(planNpcRoll(input({
      rollType: "frenzy",
      levels: { hunger: 2, wpSup: 1, wpAgg: 0 }
    }))).toMatchObject({
      poolDice: 4,
      normal: 4,
      hunger: 0,
      heading: "Frenzy",
      line: "Mylene resists Frenzy"
    });
  });
});

describe("planNpcTypeSeed", () => {
  const seedInput = {
    name: "Mylene",
    block: mylene,
    levels: { hunger: 2, wpSup: 0, wpAgg: 0 },
    bloodPotency: bp2,
    rules
  };

  it("seeds Discipline with only the Blood Potency bonus", () => {
    expect(planNpcTypeSeed({ ...seedInput, rollType: "discipline" })).toMatchObject({
      poolDice: 0,
      discBonus: 1,
      normal: 0,
      hunger: 1,
      heading: "Discipline"
    });
  });

  it("seeds Willpower from undamaged boxes", () => {
    expect(planNpcTypeSeed({ ...seedInput, rollType: "willpowerRoll" })).toMatchObject({
      poolDice: 4,
      normal: 4,
      hunger: 0
    });
  });

  it("returns null for standard rolls", () => {
    expect(planNpcTypeSeed({ ...seedInput, rollType: "standard" })).toBeNull();
  });
});

describe("undamagedWillpower", () => {
  it("subtracts superficial and aggravated from the stat-block maximum", () => {
    expect(undamagedWillpower(mylene, { wpSup: 1, wpAgg: 1 })).toBe(2);
    expect(undamagedWillpower({ ...mylene, willpower: undefined }, {})).toBe(0);
  });
});

describe("custom roll associations", () => {
  const effects = {
    conditions: [], manual: [], statChanges: { etiquette: 2, awareness: -2 }, rollFeatures: { resolveHalved: true }
  };
  const source: NpcStatBlock = {
    ...mylene, exceptional: [{ id: "roll", name: "Focus", dice: 8, traits: ["Resolve", "Etiquette"], difficulty: "2-5" }],
    attacks: [{ id: "attack", name: "Strike", pool: "ex:roll", bonus: 2 }],
    powers: [{ name: "Dominate", powers: [{ name: "Command", level: 2, rouse: 1, pool: "atk:attack" }] }]
  };
  it("weights a two-trait multiplier and then adds the matching skill bonus", () => {
    const plan = planNpcRoll(input({ block: source, conditionSource: source, conditions: effects, entry: { kind: "pool", ref: "ex:roll" } }));
    expect(plan).toMatchObject({ poolDice: 8, difficultyRule: "2-5" }); // 8 * .75 + 2
  });
  it("inherits associations through an Attack and Power", () => {
    expect(planNpcRoll(input({ block: source, conditionSource: source, conditions: effects, entry: { kind: "attack", id: "attack" } })))
      .toMatchObject({ poolDice: 8, difficultyRule: "2-5", marginBonus: 2 });
    expect(planNpcRoll(input({ block: source, conditionSource: source, conditions: effects, entry: { kind: "power", category: 0, power: 0 } })))
      .toMatchObject({ poolDice: 8, discBonus: 1, difficultyRule: "2-5", marginBonus: 2 });
  });
  it("uses an Attack's override instead of stacking its referenced pool's conditions", () => {
    const raw: NpcStatBlock = { ...source,
      exceptional: [{ ...source.exceptional[0]!, dice: 12 }],
      attacks: [{ ...source.attacks[0]!, traits: ["Wits", "Awareness"], difficulty: "4+" }] };
    const block = applyNpcConditions(raw, effects);
    expect(block.exceptional[0]?.dice).toBe(11); // 12 * .75 + 2
    const plan = planNpcRoll(input({ block, conditionSource: raw, conditions: effects, entry: { kind: "attack", id: "attack" } }));
    expect(plan).toMatchObject({ poolDice: 10, difficultyRule: "4+" }); // original 12 - 2, not 11 - 2

  });
  it("weights a Power's single trait at one and preserves attack damage and Discipline Bonus", () => {
    const block: NpcStatBlock = { ...source, powers: [{ name: "Dominate", powers: [{ ...source.powers[0]!.powers[0]!, traits: ["", "Resolve"], difficulty: "3" }] }] };
    const plan = planNpcRoll(input({ block, conditionSource: block, conditions: effects, entry: { kind: "power", category: 0, power: 0 } }));
    expect(plan).toMatchObject({ poolDice: 4, discBonus: 1, normal: 3, hunger: 2, marginBonus: 2, difficultyRule: "3" });
  });
});
