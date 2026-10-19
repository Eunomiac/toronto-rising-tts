import { normalizeNpcRollMetadata, type NpcRollMetadata } from "./npcCustomRolls.ts";

/**
 * NPC stat blocks set from the token configuration window's Stats button (`data/npc-stats.json`, git-ignored),
 * keyed three ways:
 * - a named NPC's characterKey: one block under `named`;
 * - `generic:<catalog label>`: up to four tier blocks, shared by every numbered figurine of that generic type;
 * - `kept:<id>`: a generic instance kept as a character, with its own block under `named` and `kept` details.
 * Blocks feed the Storyteller roll pool grid and the NPC trackers.
 */

export const NPC_KINDS = ["mortal", "animal", "ghoul", "vampire", "werewolf", "spirit", "other"] as const;
export type NpcKind = (typeof NPC_KINDS)[number];

export const NPC_TIERS = ["weak", "average", "gifted", "deadly"] as const;
export type NpcTier = (typeof NPC_TIERS)[number];
export type NpcStatSlot = "named" | NpcTier;

/** C.Clans in lib/constants.ttslua. */
export const NPC_CLANS = [
  "Banu Haqim", "Brujah", "Caitiff", "Cappadocian", "Gangrel", "Giovanni", "Lasombra", "Malkavian", "Ministry",
  "Nosferatu", "Ravnos", "Salubri", "Thin-Blooded", "Toreador", "Tremere", "Tzimisce", "Ventrue"
] as const;
export const NPC_RANKS = ["Fledgling", "Neonate", "Ancilla", "Elder", "Methuselah", "Blood God"] as const;

export const STANDARD_POOLS = ["physical", "social", "mental", "supernatural"] as const;
export type StandardPool = (typeof STANDARD_POOLS)[number];

export const RANGES = {
  generation: [1, 17],
  bloodPotency: [0, 10],
  humanity: [0, 10],
  difficulty: [0, 15],
  tracker: [1, 20],
  dice: [0, 30],
  bonus: [-10, 20],
  dots: [0, 10],
  level: [1, 5],
  rouse: [0, 5]
} as const satisfies Record<string, readonly [number, number]>;

export const NOTES_MAX = 4000;
const NAME_MAX = 80;
const ID_PATTERN = /^[a-z0-9]{1,12}$/;
// eslint-disable-next-line no-control-regex
export const NPC_STATS_KEY_PATTERN = /^(?:[A-Za-z0-9_]{1,80}|generic:[^\u0000-\u001f]{1,80}|kept:[a-z0-9]{1,12})$/;

export const genericStatsKey = (label: string): string => `generic:${label}`;
export const keptStatsKey = (id: string): string => `kept:${id}`;

export type NpcPool = NpcRollMetadata & { readonly id: string; readonly name: string; readonly dice: number };
/** `pool` is a pool ref: a standard pool name or `ex:<id>`. */
export type NpcAttack = NpcRollMetadata & { readonly id: string; readonly name: string; readonly pool: string; readonly bonus: number };
/**
 * `pool` is a pool ref (standard, `ex:<id>` or `atk:<id>`); "" is a passive power with no roll. `ancilla` marks a
 * power from the sheet's Ancilla Power(s) column, so a write-back returns it there.
 */
export type NpcPower = NpcRollMetadata & { readonly level: number; readonly name: string; readonly rouse: number; readonly pool: string; readonly ancilla?: true };
export type NpcPowerCategory = { readonly name: string; readonly dots?: number; readonly powers: readonly NpcPower[] };

export type NpcStatBlock = {
  readonly kind?: NpcKind;
  readonly generation?: number;
  readonly clan?: string;
  readonly rank?: string;
  readonly bloodPotency?: number;
  readonly humanity?: number;
  /** Actions against the NPC where it is well suited / everything else. */
  readonly difficultyStrong?: number;
  readonly difficultyWeak?: number;
  readonly health?: number;
  readonly willpower?: number;
  readonly physical?: number;
  readonly social?: number;
  readonly mental?: number;
  /** Disciplines / Gifts / Manifestations, by kind. */
  readonly supernatural?: number;
  readonly exceptional: readonly NpcPool[];
  readonly attacks: readonly NpcAttack[];
  readonly powers: readonly NpcPowerCategory[];
  readonly notes?: string;
};

/** Who a `kept:<id>` entry is: the name given in the scene, the figurine it uses and its generic type. */
export type KeptNpc = { readonly name: string; readonly figurineKey: string; readonly label: string };

export type NpcStats = Readonly<Partial<Record<NpcStatSlot, NpcStatBlock>> & { kept?: KeptNpc }>;
export type NpcStatsFile = Readonly<Record<string, NpcStats>>;

export const EMPTY_STAT_BLOCK: NpcStatBlock = { exceptional: [], attacks: [], powers: [] };

/** The fourth standard pool's label, or null for kinds without one. */
export const supernaturalPoolName = (kind: NpcKind | undefined): string | null =>
  kind === "vampire" || kind === "ghoul" ? "Disciplines"
    : kind === "werewolf" ? "Gifts"
      : kind === "spirit" ? "Manifestations"
        : null;

export const usesRouse = (kind: NpcKind | undefined): boolean => kind === "vampire" || kind === "ghoul";

export const newStatId = (): string => Math.random().toString(36).slice(2, 10);

export const standardPoolLabel = (pool: StandardPool, kind: NpcKind | undefined): string | null =>
  pool === "physical" ? "Physical" : pool === "social" ? "Social" : pool === "mental" ? "Mental" : supernaturalPoolName(kind);

export type PoolOption = { readonly ref: string; readonly label: string; readonly dice: number | undefined };

/** What `poolOptions` reads; a half-filled editor draft qualifies. */
export type PoolSource = Pick<NpcStatBlock, "kind" | StandardPool> & {
  readonly exceptional: readonly { readonly id: string; readonly name: string; readonly dice?: number | undefined }[];
  readonly attacks: readonly { readonly id: string; readonly name: string; readonly pool: string }[];
};

/** Standard and named Exceptional pools, plus named Attacks when `withAttacks`: what a pool dropdown offers. */
export const poolOptions = (block: PoolSource, withAttacks: boolean): readonly PoolOption[] => {
  const options: PoolOption[] = [];
  for (const pool of STANDARD_POOLS) {
    const label = standardPoolLabel(pool, block.kind);
    if (label !== null) {
      options.push({ ref: pool, label, dice: block[pool] });
    }
  }
  for (const pool of block.exceptional) {
    if (pool.name.trim() !== "") {
      options.push({ ref: `ex:${pool.id}`, label: pool.name.trim(), dice: pool.dice });
    }
  }
  if (withAttacks) {
    const rolls = [...options];
    for (const attack of block.attacks) {
      if (attack.name.trim() !== "") {
        options.push({ ref: `atk:${attack.id}`, label: attack.name.trim(), dice: rolls.find((option) => option.ref === attack.pool)?.dice });
      }
    }
  }
  return options;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const intIn = (value: unknown, [min, max]: readonly [number, number]): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : undefined;

const text = (value: unknown, max = NAME_MAX): string => (typeof value === "string" ? value.trim().slice(0, max) : "");

const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | undefined =>
  options.find((option) => option === value);

const optional = <K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

/**
 * The block in `value`, normalized: out-of-range or wrong-kind fields dropped, incomplete Exceptional pools,
 * nameless attacks and powers removed, empty power categories removed, and pool refs that no longer resolve
 * cleared. Null when nothing is left.
 */
export const normalizeStatBlock = (value: unknown): NpcStatBlock | null => {
  if (!isRecord(value)) {
    return null;
  }
  const kind = oneOf(value.kind, NPC_KINDS);
  const vampire = kind === "vampire";
  const exceptional: NpcPool[] = [];
  for (const raw of Array.isArray(value.exceptional) ? value.exceptional : []) {
    const name = isRecord(raw) ? text(raw.name) : "";
    const dice = isRecord(raw) ? intIn(raw.dice, RANGES.dice) : undefined;
    const id = isRecord(raw) && typeof raw.id === "string" && ID_PATTERN.test(raw.id) ? raw.id : newStatId();
    if (name !== "" && dice !== undefined) {
      exceptional.push({ id, name, dice, ...normalizeNpcRollMetadata(raw) });
    }
  }
  const hasSupernatural = supernaturalPoolName(kind) !== null;
  const supernatural = hasSupernatural ? intIn(value.supernatural, RANGES.dice) : undefined;
  const rollPools = new Set<string>([
    "physical", "social", "mental", ...(hasSupernatural ? ["supernatural"] : []),
    ...exceptional.map((pool) => `ex:${pool.id}`)
  ]);
  const attacks: NpcAttack[] = [];
  for (const raw of Array.isArray(value.attacks) ? value.attacks : []) {
    if (!isRecord(raw) || text(raw.name) === "") {
      continue;
    }
    const pool = typeof raw.pool === "string" && rollPools.has(raw.pool) ? raw.pool : "";
    const id = typeof raw.id === "string" && ID_PATTERN.test(raw.id) ? raw.id : newStatId();
    attacks.push({ id, name: text(raw.name), pool, bonus: intIn(raw.bonus, RANGES.bonus) ?? 0, ...normalizeNpcRollMetadata(raw) });
  }
  const powerPools = new Set([...rollPools, ...attacks.map((attack) => `atk:${attack.id}`)]);
  const powers: NpcPowerCategory[] = [];
  for (const raw of Array.isArray(value.powers) ? value.powers : []) {
    if (!isRecord(raw)) {
      continue;
    }
    const entries: NpcPower[] = [];
    for (const entry of Array.isArray(raw.powers) ? raw.powers : []) {
      if (!isRecord(entry) || text(entry.name) === "") {
        continue;
      }
      entries.push({
        level: intIn(entry.level, RANGES.level) ?? 1,
        name: text(entry.name),
        rouse: usesRouse(kind) ? intIn(entry.rouse, RANGES.rouse) ?? 0 : 0,
        pool: typeof entry.pool === "string" && powerPools.has(entry.pool) ? entry.pool : "",
        ...normalizeNpcRollMetadata(entry),
        ...(entry.ancilla === true ? { ancilla: true as const } : {})
      });
    }
    const name = text(raw.name);
    const dots = intIn(raw.dots, RANGES.dots);
    if (name !== "" || dots !== undefined || entries.length > 0) {
      powers.push({ name, ...optional("dots", dots), powers: entries });
    }
  }
  const notes = text(value.notes, NOTES_MAX);
  const block: NpcStatBlock = {
    ...optional("kind", kind),
    ...optional("generation", vampire ? intIn(value.generation, RANGES.generation) : undefined),
    ...optional("clan", vampire ? oneOf(value.clan, NPC_CLANS) : undefined),
    ...optional("rank", vampire ? oneOf(value.rank, NPC_RANKS) : undefined),
    ...optional("bloodPotency", vampire ? intIn(value.bloodPotency, RANGES.bloodPotency) : undefined),
    ...optional("humanity", vampire ? intIn(value.humanity, RANGES.humanity) : undefined),
    ...optional("difficultyStrong", intIn(value.difficultyStrong, RANGES.difficulty)),
    ...optional("difficultyWeak", intIn(value.difficultyWeak, RANGES.difficulty)),
    ...optional("health", intIn(value.health, RANGES.tracker)),
    ...optional("willpower", intIn(value.willpower, RANGES.tracker)),
    ...optional("physical", intIn(value.physical, RANGES.dice)),
    ...optional("social", intIn(value.social, RANGES.dice)),
    ...optional("mental", intIn(value.mental, RANGES.dice)),
    ...optional("supernatural", supernatural),
    exceptional,
    attacks,
    powers,
    ...optional("notes", notes === "" ? undefined : notes)
  };
  const empty = Object.keys(block).length === 3 && exceptional.length === 0 && attacks.length === 0 && powers.length === 0;
  return empty ? null : block;
};

const normalizeKept = (value: unknown): KeptNpc | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const name = text(value.name);
  const figurineKey = typeof value.figurineKey === "string" && /^[A-Za-z0-9_]{1,80}$/.test(value.figurineKey) ? value.figurineKey : "";
  const label = text(value.label);
  return name !== "" && figurineKey !== "" && label !== "" ? { name, figurineKey, label } : undefined;
};

/** One NPC's blocks, normalized; slots with nothing set are dropped. A kept entry keeps its details even with no block. */
export const normalizeNpcStats = (value: unknown): NpcStats => {
  const out: Partial<Record<NpcStatSlot, NpcStatBlock>> & { kept?: KeptNpc } = {};
  if (!isRecord(value)) {
    return out;
  }
  for (const slot of ["named", ...NPC_TIERS] as const) {
    const block = normalizeStatBlock(value[slot]);
    if (block) {
      out[slot] = block;
    }
  }
  const kept = normalizeKept(value.kept);
  if (kept) {
    out.kept = kept;
  }
  return out;
};

/** Which stats a live NPC rolls from: a kept character's own block, its generic type's tier, or a named NPC's block. */
export const statBlockFor = (
  file: NpcStatsFile,
  npc: { readonly characterKey: string; readonly genericLabel?: string | undefined; readonly tier?: NpcTier | undefined; readonly keptId?: string | undefined }
): NpcStatBlock | undefined => {
  if (npc.keptId) {
    return file[keptStatsKey(npc.keptId)]?.named;
  }
  if (npc.genericLabel !== undefined) {
    return npc.tier ? file[genericStatsKey(npc.genericLabel)]?.[npc.tier] : undefined;
  }
  return file[npc.characterKey]?.named;
};

/** The whole file, keyed by character key; NPCs with no blocks are dropped. */
export const normalizeNpcStatsFile = (value: unknown): NpcStatsFile => {
  const out: Record<string, NpcStats> = {};
  if (!isRecord(value)) {
    return out;
  }
  for (const key of Object.keys(value).sort()) {
    const stats = normalizeNpcStats(value[key]);
    if (NPC_STATS_KEY_PATTERN.test(key) && Object.keys(stats).length > 0) {
      out[key] = stats;
    }
  }
  return out;
};

/** A PUT body: `{ <characterKey>: NpcStats }`; an NPC with no blocks is cleared. */
export const parseNpcStatsPatch = (value: unknown): Partial<NpcStatsFile> => {
  if (!isRecord(value)) {
    throw new Error("Expected an object keyed by character key.");
  }
  const out: Record<string, NpcStats> = {};
  for (const [key, stats] of Object.entries(value)) {
    if (!NPC_STATS_KEY_PATTERN.test(key)) {
      throw new Error(`Unknown character key "${key}".`);
    }
    out[key] = normalizeNpcStats(stats);
  }
  return out;
};

/** Slots with a block, in tab order. */
export const configuredSlots = (stats: NpcStats | undefined): readonly NpcStatSlot[] =>
  stats ? (["named", ...NPC_TIERS] as const).filter((slot) => stats[slot] !== undefined) : [];

/** Tiers a generic type has blocks for, Weak to Deadly. */
export const configuredTiers = (stats: NpcStats | undefined): readonly NpcTier[] =>
  stats ? NPC_TIERS.filter((tier) => stats[tier] !== undefined) : [];

export const isNpcTier = (value: unknown): value is NpcTier => NPC_TIERS.some((tier) => tier === value);

/** Sheet cells cannot hold these associations yet. Keep matching entries' local metadata on import. */
export const preserveNpcRollMetadata = (imported: NpcStatBlock, before: NpcStatBlock | undefined): NpcStatBlock => {
  if (!before) return imported;
  const merge = <T extends { readonly name: string } & NpcRollMetadata>(rows: readonly T[], old: readonly T[]): T[] => {
    const remaining = [...old];
    return rows.map((row) => {
      const at = remaining.findIndex((candidate) => candidate.name.trim().toLowerCase() === row.name.trim().toLowerCase());
      const previous = at < 0 ? undefined : remaining.splice(at, 1)[0];
      return { ...row, ...(previous?.traits ? { traits: previous.traits } : {}),
        ...(previous?.difficulty ? { difficulty: previous.difficulty } : {}) };
    });
  };
  return {
    ...imported,
    exceptional: merge(imported.exceptional, before.exceptional),
    attacks: merge(imported.attacks, before.attacks),
    powers: imported.powers.map((category) => ({ ...category,
      powers: merge(category.powers, before.powers.find((old) => old.name.trim().toLowerCase() === category.name.trim().toLowerCase())?.powers ?? [])
    }))
  };
};
