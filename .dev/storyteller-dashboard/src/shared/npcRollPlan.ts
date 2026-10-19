import { npcTraitAdjustedDice, type NpcConditionView } from "./npcConditions.js";
import { rollTraits, type NpcRollMetadata } from "./npcCustomRolls.js";
/**
 * Turns an NPC stat block entry (pool, attack or power) into the dice the Storyteller rolls for it.
 * Pure: the Configure pop-up on the live NPC roll card shows the plan and sends it as `npcStatRoll`
 * (`dashboard/rolls.ttslua`), which rolls the dice and judges each rouse check on its own dice.
 *
 * Preliminary pools for Willpower / Frenzy / Humanity / Discipline match the PC auto-pool rules in
 * `RC.computeAutoPoolForRollType` (`core/roll_controller.ttslua`): undamaged Willpower boxes, plus
 * floor(Humanity/3) for Frenzy, and Blood Potency Discipline Bonus on Discipline rolls (and on powers).
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

/** Roll types that never take Hunger dice (`C.RollTypesWithoutHunger`). */
export type PlanRollTypeRules = { readonly withoutHunger: readonly string[] };

/** Tonight's Hunger / Rage and Willpower damage (missing means 0). */
export type NpcRollLevels = {
  readonly hunger?: number;
  readonly rage?: number;
  readonly wpSup?: number;
  readonly wpAgg?: number;
};

export type NpcRollInput = {
  /** The name on the broadcast ("Mylene"). */
  readonly name: string;
  readonly block: NpcStatBlock;
  readonly levels: NpcRollLevels;
  readonly rollType: string;
  readonly entry: NpcRollEntry;
  readonly bloodPotency: PlanBloodPotency;
  readonly rules: PlanRollTypeRules;
  /** Raw ratings let an Attack/Power override its referenced pool's associations without stacking effects. */
  readonly conditionSource?: NpcStatBlock;
  readonly conditions?: NpcConditionView;
};

/** Same as `NpcRollInput` without a Configure grid entry (initiate seed for auto-pool types). */
export type NpcRollSeedInput = Omit<NpcRollInput, "entry">;

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
  /** The power's rouse checks. Blood Surge is not planned here: TTS adds its dice and check (`npcSurge`). */
  readonly rouse: readonly RouseCheck[];
  /** Failed checks raise the NPC's Hunger (vampires; a ghoul's checks are only shown). */
  readonly hungerOnFail: boolean;
  readonly heading: string;
  readonly line: string;
  /** Added to the margin on a success ("Feral Claws +2"); 0 when none. */
  readonly marginBonus: number;
  readonly marginLabel: string;
  readonly difficultyRule?: string;
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

const inheritMetadata = (parent: NpcRollMetadata, own: NpcRollMetadata): NpcRollMetadata => ({
  ...(own.traits ?? parent.traits ? { traits: own.traits ?? parent.traits } : {}),
  ...(own.difficulty ?? parent.difficulty ? { difficulty: own.difficulty ?? parent.difficulty } : {})
});

const metadataForRef = (block: NpcStatBlock, ref: string): NpcRollMetadata => {
  if (ref.startsWith("ex:")) return block.exceptional.find((pool) => pool.id === ref.slice(3)) ?? {};
  if (ref.startsWith("atk:")) {
    const attack = block.attacks.find((row) => row.id === ref.slice(4));
    return attack ? inheritMetadata(metadataForRef(block, attack.pool), attack) : {};
  }
  return {};
};

export const npcRollMetadata = (block: NpcStatBlock, entry: NpcRollEntry): NpcRollMetadata => {
  if (entry.kind === "pool") return metadataForRef(block, entry.ref);
  if (entry.kind === "attack") return metadataForRef(block, `atk:${entry.id}`);
  const power = block.powers[entry.category]?.powers[entry.power];
  return power ? inheritMetadata(metadataForRef(block, power.pool), power) : {};
};

const attackById = (block: NpcStatBlock, id: string) => {
  const attack = block.attacks.find((candidate) => candidate.id === id);
  if (!attack) {
    throw new Error(`Unknown NPC attack "${id}".`);
  }
  return attack;
};

const clampLevel = (value: number | undefined): number => Math.max(0, Math.min(5, Math.floor(value ?? 0)));

/** Empty (undamaged) Willpower boxes: max from the stat block minus tonight's superficial and aggravated. */
export const undamagedWillpower = (block: NpcStatBlock, levels: NpcRollLevels): number => {
  const max = Math.max(0, Math.floor(block.willpower ?? 0));
  const damaged = Math.max(0, Math.floor(levels.wpSup ?? 0)) + Math.max(0, Math.floor(levels.wpAgg ?? 0));
  return Math.max(0, max - damaged);
};

/**
 * Roll types whose preliminary dice come from trackers / Humanity alone (like a PC Willpower or Frenzy roll).
 * Discipline is seeded separately: Blood Potency bonus alone at initiate, then pool + bonus from Configure.
 */
export const isTrackerSeedRollType = (rollType: string): boolean =>
  rollType === "willpowerRoll" || rollType === "frenzy" || rollType === "humanityRoll";

const splitPool = (
  input: NpcRollSeedInput,
  total: number
): { readonly normal: number; readonly hunger: number; readonly rage: number } => {
  const werewolf = input.block.kind === "werewolf";
  const vampire = input.block.kind === "vampire";
  const hunger = vampire && !input.rules.withoutHunger.includes(input.rollType)
    ? Math.min(total, clampLevel(input.levels.hunger))
    : 0;
  const rage = werewolf ? Math.min(total, clampLevel(input.levels.rage)) : 0;
  return { normal: total - hunger - rage, hunger, rage };
};

const rollPlan = (
  input: NpcRollSeedInput,
  opts: {
    readonly poolDice: number;
    readonly discBonus: number;
    readonly heading: string;
    readonly line: string;
    readonly rouse?: readonly RouseCheck[];
    readonly hungerOnFail?: boolean;
    readonly marginBonus?: number;
    readonly marginLabel?: string;
    readonly difficultyRule?: string;
  }
): NpcRollPlan => {
  const total = opts.poolDice + opts.discBonus;
  const split = splitPool(input, total);
  return {
    kind: "roll",
    rollType: input.rollType,
    ...split,
    poolDice: opts.poolDice,
    discBonus: opts.discBonus,
    rouse: opts.rouse ?? [],
    hungerOnFail: opts.hungerOnFail === true,
    heading: opts.heading,
    line: opts.line,
    marginBonus: opts.marginBonus ?? 0,
    marginLabel: opts.marginLabel ?? "",
    ...(opts.difficultyRule ? { difficultyRule: opts.difficultyRule } : {})
  };
};

/**
 * Preliminary pool for a roll type that does not need a Configure grid pick — Willpower, Frenzy,
 * Humanity, or Discipline (Blood Potency bonus only). Null when the type has no auto seed.
 */
export const planNpcTypeSeed = (input: NpcRollSeedInput): NpcRollPlan | null => {
  const { name, block, rollType, bloodPotency } = input;
  const vampire = block.kind === "vampire";

  if (rollType === "willpowerRoll") {
    const poolDice = undamagedWillpower(block, input.levels);
    return rollPlan(input, {
      poolDice,
      discBonus: 0,
      heading: "Willpower",
      line: `${name} rolls Willpower`
    });
  }

  if (rollType === "frenzy") {
    const humanity = Math.max(0, Math.floor(block.humanity ?? 0));
    const poolDice = undamagedWillpower(block, input.levels) + Math.floor(humanity / 3);
    return rollPlan(input, {
      poolDice,
      discBonus: 0,
      heading: "Frenzy",
      line: `${name} resists Frenzy`
    });
  }

  if (rollType === "humanityRoll") {
    const poolDice = Math.max(0, Math.floor(block.humanity ?? 0));
    return rollPlan(input, {
      poolDice,
      discBonus: 0,
      heading: "Humanity",
      line: `${name} rolls Humanity`
    });
  }

  if (rollType === "discipline") {
    const discBonus = vampire ? Math.max(0, Math.floor(bloodPotency.discBonus)) : 0;
    return rollPlan(input, {
      poolDice: 0,
      discBonus,
      heading: "Discipline",
      line: `${name} rolls Discipline`
    });
  }

  return null;
};

/** Builds the roll for one Configure grid entry. */
export const planNpcRoll = (input: NpcRollInput): NpcRollPlan => {
  // Tracker-seeded types ignore the grid entry: their dice come from Willpower / Humanity alone.
  if (isTrackerSeedRollType(input.rollType)) {
    const seed = planNpcTypeSeed(input);
    if (seed === null) {
      throw new Error(`No preliminary pool for roll type "${input.rollType}".`);
    }
    return seed;
  }

  const { block, entry, name, bloodPotency } = input;
  const vampire = block.kind === "vampire";
  const ghoul = block.kind === "ghoul";

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
      rouse,
      hungerOnFail,
      heading,
      line,
      marginBonus: 0,
      marginLabel: ""
    };
  }

  const source = input.conditionSource ?? block;
  const metadata = npcRollMetadata(source, entry);
  if (input.conditions && rollTraits(metadata).length > 0) {
    poolDice = npcTraitAdjustedDice(resolvePool(source, poolRef).dice, metadata, input.conditions);
  }

  // Discipline Bonus: powers always (discipline dice pools), and any entry when the card type is Discipline.
  const discBonus = vampire && (isPower || input.rollType === "discipline") ? Math.max(0, Math.floor(bloodPotency.discBonus)) : 0;
  return rollPlan(input, {
    poolDice,
    discBonus,
    heading: heading || poolLabel,
    line,
    rouse,
    hungerOnFail: vampire && rouse.length > 0,
    marginBonus,
    marginLabel,
    ...(metadata.difficulty ? { difficultyRule: metadata.difficulty } : {})
  });
};
