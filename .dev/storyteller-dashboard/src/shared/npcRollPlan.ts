/**
 * Turns an NPC stat block entry (pool, attack or power) into the dice the Storyteller rolls for it.
 * Pure: the Configure pop-up on the live NPC roll card shows the plan and sends it as `npcStatRoll`
 * (`dashboard/rolls.ttslua`), which rolls the dice and judges each rouse check on its own dice.
 */
import { poolOptions, standardPoolLabel, STANDARD_POOLS, type NpcStatBlock, type StandardPool } from "./npcStats.js";

/** What the Configure grid picked. */
export type NpcRollEntry =
  | { readonly kind: "pool"; readonly ref: string }
  | { readonly kind: "attack"; readonly id: string }
  | { readonly kind: "power"; readonly category: number; readonly power: number };

/** One rouse check: it passes when any of its dice shows 6 or more. */
export type RouseCheck = { readonly dice: 1 | 2; readonly oblivion: boolean };

/** The Blood Potency columns the planner reads (`BPC.BloodPotency`). */
export type PlanBloodPotency = { readonly bloodSurge: number; readonly discBonus: number; readonly discReroll: number };

/** Roll types that allow Blood Surge, and that never take Hunger dice (`C.RollTypesBloodSurge` / `C.RollTypesWithoutHunger`). */
export type PlanRollTypeRules = { readonly bloodSurge: readonly string[]; readonly withoutHunger: readonly string[] };

export type NpcRollInput = {
  /** The name on the broadcast ("Mylene"). */
  readonly name: string;
  readonly block: NpcStatBlock;
  /** Tonight's Hunger / Rage (missing means 0). */
  readonly levels: { readonly hunger?: number; readonly rage?: number };
  readonly rollType: string;
  readonly entry: NpcRollEntry;
  readonly surge: boolean;
  readonly bloodPotency: PlanBloodPotency;
  readonly rules: PlanRollTypeRules;
};

export type NpcRollPlan = {
  /** `passive` powers only announce; `rouseOnly` powers roll just their rouse checks. */
  readonly kind: "roll" | "rouseOnly" | "passive";
  /** The roll type to roll as: the card's type, or Rouse / Oblivion Rouse for a rouse-only power. */
  readonly rollType: string;
  /** Normal dice (Werewolf dice for werewolves). */
  readonly normal: number;
  readonly hunger: number;
  readonly rage: number;
  /** The entry's own dice, before the bonuses below. */
  readonly poolDice: number;
  readonly discBonus: number;
  readonly surgeBonus: number;
  /** Whether the Blood Surge toggle applies to this entry. */
  readonly surgeAllowed: boolean;
  /** Power checks first, then the Blood Surge check. */
  readonly rouse: readonly RouseCheck[];
  /** Failed checks raise the NPC's Hunger (vampires; a ghoul's checks are only shown). */
  readonly hungerOnFail: boolean;
  readonly heading: string;
  readonly line: string;
  /** Added to the margin on a success ("Feral Claws +2"); 0 when none. */
  readonly marginBonus: number;
  readonly marginLabel: string;
};

const OBLIVION_CATEGORIES = new Set(["oblivion", "ceremonies"]);

const isStandardPool = (ref: string): ref is StandardPool => STANDARD_POOLS.some((pool) => pool === ref);

/** Dice and label for a pool ref (standard, `ex:<id>` or `atk:<id>`). */
const resolvePool = (block: NpcStatBlock, ref: string): { readonly dice: number; readonly label: string } => {
  if (isStandardPool(ref)) {
    return { dice: block[ref] ?? 0, label: standardPoolLabel(ref, block.kind) ?? ref };
  }
  const option = poolOptions(block, true).find((candidate) => candidate.ref === ref);
  if (!option) {
    throw new Error(`Unknown NPC pool "${ref}".`);
  }
  return { dice: option.dice ?? 0, label: option.label };
};

const attackById = (block: NpcStatBlock, id: string) => {
  const attack = block.attacks.find((candidate) => candidate.id === id);
  if (!attack) {
    throw new Error(`Unknown NPC attack "${id}".`);
  }
  return attack;
};

const clampLevel = (value: number | undefined): number => Math.max(0, Math.min(5, Math.floor(value ?? 0)));

/** Builds the roll for one Configure grid entry. */
export const planNpcRoll = (input: NpcRollInput): NpcRollPlan => {
  const { block, entry, name, bloodPotency } = input;
  const vampire = block.kind === "vampire";
  const ghoul = block.kind === "ghoul";
  const werewolf = block.kind === "werewolf";

  let poolRef = "";
  let poolLabel = "";
  let poolDice = 0;
  let heading = "";
  let line = "";
  let marginBonus = 0;
  let marginLabel = "";
  let rouse: RouseCheck[] = [];
  let isPower = false;
  let passivePower = false;

  if (entry.kind === "pool") {
    poolRef = entry.ref;
  } else if (entry.kind === "attack") {
    poolRef = `atk:${entry.id}`;
  } else {
    const category = block.powers[entry.category];
    const power = category?.powers[entry.power];
    if (!category || !power) {
      throw new Error("Unknown NPC power.");
    }
    isPower = true;
    poolRef = power.pool;
    passivePower = power.pool === "";
    const oblivion = OBLIVION_CATEGORIES.has(category.name.trim().toLowerCase());
    const twoDice = vampire && bloodPotency.discReroll > 0 && power.level <= bloodPotency.discReroll;
    if (vampire || ghoul) {
      rouse = Array.from({ length: power.rouse }, (): RouseCheck => ({ dice: twoDice ? 2 : 1, oblivion }));
    }
    heading = category.name;
    line = passivePower ? `${name} activates ${power.name} (${category.name})` : `${name} uses ${power.name} (${category.name})`;
  }

  if (poolRef.startsWith("atk:")) {
    const attack = attackById(block, poolRef.slice(4));
    const pool = resolvePool(block, attack.pool);
    poolDice = pool.dice;
    poolLabel = pool.label;
    marginBonus = attack.bonus;
    marginLabel = attack.name;
    if (!isPower) {
      heading = "Attack";
      line = `${name} attacks with ${pool.label} (${attack.name})`;
    }
  } else if (poolRef !== "") {
    const pool = resolvePool(block, poolRef);
    poolDice = pool.dice;
    poolLabel = pool.label;
    if (!isPower) {
      heading = pool.label;
      line = `${name} rolls ${pool.label}`;
    }
  }

  const hungerOnFail = vampire && rouse.length > 0;
  if (passivePower) {
    const kind = rouse.length > 0 ? "rouseOnly" : "passive";
    const rollType = rouse.some((check) => check.oblivion) ? "rouseOblivion" : "rouse";
    return {
      kind,
      rollType: kind === "rouseOnly" ? rollType : input.rollType,
      normal: 0,
      hunger: 0,
      rage: 0,
      poolDice: 0,
      discBonus: 0,
      surgeBonus: 0,
      surgeAllowed: false,
      rouse,
      hungerOnFail,
      heading,
      line,
      marginBonus: 0,
      marginLabel: ""
    };
  }

  const discBonus = vampire && isPower ? bloodPotency.discBonus : 0;
  const surgeAllowed = vampire && input.rules.bloodSurge.includes(input.rollType);
  const surging = surgeAllowed && input.surge;
  const surgeBonus = surging ? bloodPotency.bloodSurge : 0;
  if (surging) {
    rouse = [...rouse, { dice: 1, oblivion: false }];
  }
  const total = poolDice + discBonus + surgeBonus;
  const hunger = vampire && !input.rules.withoutHunger.includes(input.rollType) ? Math.min(total, clampLevel(input.levels.hunger)) : 0;
  const rage = werewolf ? Math.min(total, clampLevel(input.levels.rage)) : 0;
  return {
    kind: "roll",
    rollType: input.rollType,
    normal: total - hunger - rage,
    hunger,
    rage,
    poolDice,
    discBonus,
    surgeBonus,
    surgeAllowed,
    rouse,
    hungerOnFail: vampire && rouse.length > 0,
    heading: heading || poolLabel,
    line,
    marginBonus,
    marginLabel
  };
};
