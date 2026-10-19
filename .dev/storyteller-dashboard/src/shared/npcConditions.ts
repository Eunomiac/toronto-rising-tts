import { normalizeTraitName, rollTraits, type NpcRollMetadata } from "./npcCustomRolls.js";
import type { NpcStatBlock } from "./npcStats.js";

export type NpcConditionView = {
  readonly conditions: readonly { readonly id: string; readonly label: string; readonly type: string }[];
  readonly manual: readonly { readonly id: string; readonly label: string; readonly on: boolean }[];
  readonly statChanges: Readonly<Record<string, number>>;
  readonly bloodPotency?: number;
  readonly healthMax?: number;
  readonly wpMax?: number;
  readonly humanity?: number;
  readonly rollFeatures: Readonly<Record<string, boolean>>;
  readonly hungerDiceAllowed?: boolean;
  readonly base?: Partial<NpcStatBlock>;
};

const ATTRIBUTE_GROUPS = {
  physical: ["strength", "dexterity", "stamina"],
  social: ["charisma", "manipulation", "composure"],
  mental: ["intelligence", "wits", "resolve"]
} as const;
type TraitChoice = { readonly key: string; readonly delta: number; readonly exceptionalOnly?: boolean };

const RATING_KEYS = ["kind", "health", "willpower", "bloodPotency", "humanity",
  "physical", "social", "mental", "supernatural", "generation"] as const;

/** Mirror only rule inputs, never biography, artwork, notes or power text. */
export const npcConditionRatings = (block: Partial<NpcStatBlock>): Partial<NpcStatBlock> =>
  Object.fromEntries(RATING_KEYS.flatMap((key) => block[key] === undefined ? [] : [[key, block[key]]]));

/** Explicit associations take precedence over display names and broad-pool guesses. */
export const npcTraitAdjustedDice = (dice: number, metadata: NpcRollMetadata, effects: NpcConditionView): number => {
  const traits = rollTraits(metadata);
  const additive = Object.entries(effects.statChanges ?? {}).reduce((sum, [key, delta]) =>
    sum + (traits.includes(normalizeTraitName(key)) ? delta : 0), 0);
  const multiplier = effects.rollFeatures.resolveHalved && traits.includes("resolve") ? 1 - 0.5 / traits.length : 1;
  return Math.max(0, Math.floor(dice * multiplier) + additive);
};

/** A pool named only Resolve supplies the attribute; composite pool totals cannot supply it. */
export const npcResolveRating = (block: NpcStatBlock): number | undefined => {
  const rating = block.exceptional.find((pool) => (rollTraits(pool).length === 1 && rollTraits(pool)[0] === "resolve")
    || (rollTraits(pool).length === 0 && pool.name.trim().toLowerCase() === "resolve"))?.dice;
  return rating !== undefined && Number.isInteger(rating) && rating >= 0 && rating <= 10 ? rating : undefined;
};

type ResolveChoice = { readonly rating?: number; readonly selectedPoolUsesResolve?: boolean };

/** Apply the shared registry's resolved deltas to a stat block without altering its saved source. */
export const applyNpcConditions = (
  block: NpcStatBlock, effects: NpcConditionView | undefined, resolveChoice: ResolveChoice = {}
): NpcStatBlock => {
  if (!effects) return block;
  const d = effects.statChanges ?? {};
  const resolveRating = resolveChoice.rating ?? npcResolveRating(block);
  const resolveDelta = effects.rollFeatures.resolveHalved && resolveRating !== undefined
    ? -Math.ceil(resolveRating / 2) : 0;
  const selectedResolveDelta = resolveChoice.selectedPoolUsesResolve ? resolveDelta : 0;
  const common = (keys: readonly string[]): number => {
    const values = keys.map((key) => d[key] ?? 0);
    return values.every((value) => value === values[0]) ? values[0] ?? 0 : 0;
  };
  const change = (key: "physical" | "social" | "mental", delta: number): Partial<NpcStatBlock> =>
    block[key] === undefined ? {} : { [key]: Math.max(0, block[key] + delta) };
  return {
    ...block,
    ...change("physical", common(["strength", "dexterity", "stamina"]) + selectedResolveDelta),
    ...change("social", common(["charisma", "manipulation", "composure"]) + selectedResolveDelta),
    // Resolve-specific effects apply only to named Resolve pools or pools identified by the ST.
    ...change("mental", common(["intelligence", "wits"]) + selectedResolveDelta),
    ...(block.supernatural === undefined ? {} : { supernatural: Math.max(0, block.supernatural + selectedResolveDelta) }),
    ...(effects.bloodPotency === undefined ? {} : { bloodPotency: effects.bloodPotency }),
    ...(effects.healthMax === undefined ? {} : { health: effects.healthMax }),
    ...(effects.wpMax === undefined ? {} : { willpower: effects.wpMax }),
    ...(effects.humanity === undefined || block.humanity === undefined ? {} : { humanity: effects.humanity }),
    exceptional: block.exceptional.map((pool) => {
      if (rollTraits(pool).length > 0) return { ...pool, dice: npcTraitAdjustedDice(pool.dice, pool, effects) };
      const words = new Set(pool.name.toLowerCase().match(/[a-z]+/g) ?? []);
      const statDelta = Object.entries(d).reduce((sum, [key, value]) => sum + (words.has(key.toLowerCase()) ? value : 0), 0);
      const delta = statDelta + (words.has("resolve") ? resolveDelta : selectedResolveDelta);
      return delta === 0 ? pool : { ...pool, dice: Math.max(0, pool.dice + delta) };
    })
  };
};

/** Trait-specific changes need the ST's judgement when the NPC uses a broad pool. */
export const npcTraitChoices = (effects: NpcConditionView | undefined): readonly TraitChoice[] => {
  const d = effects?.statChanges ?? {};
  const aggregate = new Set(["health", "willpower", "humanity", "bloodPotency",
    "strength", "dexterity", "stamina", "charisma", "manipulation", "composure", "intelligence", "wits"]);
  const traits = Object.entries(d).flatMap(([key, value]) => {
    const delta = key === "resolve" ? value - Math.max(d.intelligence ?? 0, d.wits ?? 0) : value;
    return !aggregate.has(key) && delta !== 0 ? [{ key, delta }] : [];
  });
  const groups = Object.entries(ATTRIBUTE_GROUPS).flatMap(([key, attributes]) => {
    const values = attributes.map((attribute) => d[attribute] ?? 0);
    const delta = values.every((value) => value === values[0]) ? values[0] ?? 0 : 0;
    return delta === 0 ? [] : [{ key, delta, exceptionalOnly: true }];
  });
  return [...traits, ...groups];
};

export const withNpcTraitChoices = (
  block: NpcStatBlock, choices: readonly TraitChoice[], selected: ReadonlySet<string>
): NpcStatBlock => {
  const delta = choices.reduce((sum, choice) => sum + (selected.has(choice.key) && !choice.exceptionalOnly ? choice.delta : 0), 0);
  return {
    ...block,
    exceptional: block.exceptional.map((pool) => {
      if (rollTraits(pool).length > 0) return pool;
      const words = new Set(pool.name.toLowerCase().match(/[a-z]+/g) ?? []);
      const extra = choices.reduce((sum, choice) => {
        if (!choice.exceptionalOnly || !selected.has(choice.key)) return sum;
        const attributes = ATTRIBUTE_GROUPS[choice.key as keyof typeof ATTRIBUTE_GROUPS];
        // Named attributes already received their registry delta in applyNpcConditions.
        return sum + (attributes.some((attribute) => words.has(attribute)) ? 0 : choice.delta);
      }, 0);
      return extra === 0 ? pool : { ...pool, dice: Math.max(0, pool.dice + extra) };
    }),
    ...Object.fromEntries((["physical", "social", "mental", "supernatural"] as const)
      .flatMap((key) => block[key] === undefined ? [] : [[key, Math.max(0, block[key] + delta)]]))
  };
};
