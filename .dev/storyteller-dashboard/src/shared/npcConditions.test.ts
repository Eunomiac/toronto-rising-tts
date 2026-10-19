import { describe, expect, it } from "vitest";
import { applyNpcConditions, npcConditionRatings, npcTraitChoices, withNpcTraitChoices, type NpcConditionView } from "./npcConditions";
import { type NpcStatBlock } from "./npcStats";

const block: NpcStatBlock = {
  kind: "vampire", bloodPotency: 2, health: 7, willpower: 8, physical: 6, social: 5, mental: 7,
  exceptional: [{ id: "e1", name: "Etiquette", dice: 6 }, { id: "e2", name: "Resolve + Survival", dice: 7 }],
  attacks: [], powers: []
};
const effects = (changes: Record<string, number> = {}): NpcConditionView => ({
  conditions: [], manual: [], statChanges: changes, rollFeatures: {}
});

describe("NPC condition consumers", () => {
  it("uses effective Blood Potency without rewriting its source stat block", () => {
    const view = applyNpcConditions(block, { ...effects(), bloodPotency: 3 });
    expect(view.bloodPotency).toBe(3);
    expect(block.bloodPotency).toBe(2);
  });
  it("applies health impairment to the Physical pool", () => {
    expect(applyNpcConditions(block, effects({ strength: -2, dexterity: -2, stamina: -2 })).physical).toBe(4);
  });
  it("does not guess that every Physical pool uses a single modified attribute", () => {
    expect(applyNpcConditions(block, effects({ strength: 2 })).physical).toBe(6);
  });
  it("reduces Willpower without changing Mental or named Resolve pools", () => {
    const view = applyNpcConditions(block, { ...effects(), wpMax: 6 });
    expect(view.willpower).toBe(6);
    expect(view.mental).toBe(7);
    expect(view.exceptional[1]?.dice).toBe(7);
  });
  it("applies named skill bonuses automatically and offers a broad-pool checkbox", () => {
    const e = effects({ etiquette: 2 });
    const view = applyNpcConditions(block, e);
    expect(view.exceptional[0]?.dice).toBe(8);
    expect(view.social).toBe(5);
    const chosen = withNpcTraitChoices(view, npcTraitChoices(e), new Set(["etiquette"]));
    expect(chosen.social).toBe(7);
    expect(chosen.exceptional[0]?.dice).toBe(8);
  });
  it("does not apply a second impairment penalty through the Resolve checkbox", () => {
    expect(npcTraitChoices(effects({ intelligence: -2, wits: -2, resolve: -5 })))
      .toEqual([{ key: "resolve", delta: -3 }]);
  });
  it("lets the ST apply impairment to an exceptional pool without double-counting a named attribute", () => {
    const e = effects({ strength: -2, dexterity: -2, stamina: -2 });
    const source = { ...block, exceptional: [{ id: "b", name: "Brawl", dice: 8 }, { id: "d", name: "Dexterity + Stealth", dice: 7 }] };
    const view = applyNpcConditions(source, e);
    const chosen = withNpcTraitChoices(view, npcTraitChoices(e), new Set(["physical"]));
    expect(chosen.physical).toBe(4);
    expect(chosen.exceptional.map((pool) => pool.dice)).toEqual([6, 5]);
  });
  it("mirrors only primitive ratings needed for conditions", () => {
    expect(npcConditionRatings({ ...block, notes: "private notes", clan: "Ventrue" }))
      .not.toHaveProperty("notes");
    expect(npcConditionRatings(block)).not.toHaveProperty("exceptional");
  });
});
