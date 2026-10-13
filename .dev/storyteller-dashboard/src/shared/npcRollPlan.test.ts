import { describe, expect, it } from "vitest";
import { planNpcRoll, type NpcRollInput } from "./npcRollPlan.js";
import type { NpcStatBlock } from "./npcStats.js";

const rules = { withoutHunger: ["simpleCheck", "rouse", "rouseOblivion", "werewolf"] };
const bp2 = { bloodSurge: 2, discBonus: 1, discReroll: 1 };

const mylene: NpcStatBlock = {
  kind: "vampire",
  bloodPotency: 2,
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
});
