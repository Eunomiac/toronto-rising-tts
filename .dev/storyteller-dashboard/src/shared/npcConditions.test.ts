import { describe, expect, it } from "vitest";
import { applyNpcConditions, npcConditionRatings, npcResolveRating, npcTraitChoices, withNpcTraitChoices, type NpcConditionView } from "./npcConditions";
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
  it("does not invent a Resolve rating from Willpower or a composite pool", () => {
    const view = applyNpcConditions(block, { ...effects(), wpMax: 6, rollFeatures: { resolveHalved: true } });
    expect(view.willpower).toBe(6);
    expect(view.mental).toBe(7);
    expect(view.exceptional[1]?.dice).toBe(7);
  });
  it("halves a known Resolve attribute and only its contribution to a combined pool", () => {
    const source = { ...block, exceptional: [...block.exceptional, { id: "r", name: "Resolve", dice: 5 }] };
    const e = { ...effects(), wpMax: 6, rollFeatures: { resolveHalved: true } };
    const view = applyNpcConditions(source, e);
    expect(npcResolveRating(source)).toBe(5);
    expect(view.exceptional.find((pool) => pool.id === "r")?.dice).toBe(2);
    expect(view.exceptional[1]?.dice).toBe(4); // Resolve 5 + Survival 2 becomes 2 + 2.
    expect(view.mental).toBe(7);
    expect(view.willpower).toBe(6);
    expect(source.exceptional[2]?.dice).toBe(5);
  });
  it("uses the ST's Resolve contribution without halving a composite pool total", () => {
    const e = { ...effects(), wpMax: 6, rollFeatures: { resolveHalved: true } };
    expect(npcResolveRating(block)).toBeUndefined();
    const view = applyNpcConditions(block, e, { rating: 5 });
    expect(view.exceptional[1]?.dice).toBe(4);
    expect(view.mental).toBe(7);
    const chosen = applyNpcConditions(block, e, { rating: 5, selectedPoolUsesResolve: true });
    expect(chosen.mental).toBe(4);
    expect(chosen.exceptional[1]?.dice).toBe(4); // Named pool is adjusted only once.
    expect(chosen.willpower).toBe(6);
  });
  it("halves Resolve before impairment and restores source values when the condition leaves", () => {
    const source = { ...block, exceptional: [...block.exceptional, { id: "r", name: "Resolve", dice: 5 }] };
    const e = { ...effects({ intelligence: -2, wits: -2, resolve: -2 }), rollFeatures: { resolveHalved: true } };
    const view = applyNpcConditions(source, e);
    expect(view.exceptional[2]?.dice).toBe(0); // floor(5 / 2) - 2.
    expect(view.exceptional[1]?.dice).toBe(2);
    const chosen = withNpcTraitChoices(view, npcTraitChoices(e), new Set(["mental"]));
    expect(chosen.exceptional[1]?.dice).toBe(2);
    expect(applyNpcConditions(source, effects()).exceptional[1]?.dice).toBe(7);
    expect(applyNpcConditions(source, effects()).exceptional[2]?.dice).toBe(5);
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
