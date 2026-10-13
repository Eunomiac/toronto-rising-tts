/**
 * The Toronto Rising sheet's CHARACTERS tab → named NPC stat blocks (`NpcStatBlock`, src/shared/npcStats.ts).
 * Pure: `import.ts` fetches the tab and writes `data/npc-stats.json`. Columns are found by their row-1 header.
 *
 * Cell formats:
 * - Exceptional Pools: `Stealth 12, Academics [Theology] 7`
 * - Attacks: `<name>|<pool>+<bonus>` (`Feral Claws|Brawl+2`)
 * - Powers / Ancilla Power(s): `<category> <dots> (<level>|<rouse>|<name>[|<pool>][|"<description>"], …), …`
 * - Elder / Methuselah Power(s): `<name> (<description>), …`
 * A pool is `Phy` / `Soc` / `Men` / `Pow`, the exact name of one of the row's Exceptional pools or, for powers, of
 * one of its attacks (case-insensitive). Blank and `~` cells are empty.
 */
import type { CsvRows } from "../../src/shared/csv.ts";
import {
  NOTES_MAX,
  NPC_CLANS,
  NPC_RANKS,
  RANGES,
  supernaturalPoolName,
  usesRouse,
  type NpcAttack,
  type NpcKind,
  type NpcPool,
  type NpcPower,
  type NpcPowerCategory,
  type NpcStatBlock
} from "../../src/shared/npcStats.ts";

export const COLUMNS = {
  key: "API key",
  type: "Type",
  clan: "Clan",
  generation: "Generation",
  rank: "Rank",
  bloodPotency: "Blood Potency",
  humanity: "Humanity",
  difficulty: "Difficulty",
  health: "Health",
  willpower: "Willpower",
  physical: "Phy",
  social: "Soc",
  mental: "Men",
  supernatural: "Pow",
  exceptional: "Exceptional Pools",
  attacks: "Attacks",
  powers: "Powers",
  ancilla: "Ancilla Power(s)",
  elder: "Elder Power(s)",
  methuselah: "Methuselah Power(s)"
} as const;
type Column = keyof typeof COLUMNS;

/** The cells that make a row a stat block; a row with none of them (a PC, an unstatted NPC) is skipped. */
const STAT_COLUMNS: readonly Column[] = [
  "difficulty", "health", "willpower", "physical", "social", "mental", "supernatural", "exceptional", "attacks", "powers"
];

const KEY_PATTERN = /^[A-Za-z0-9_]{1,80}$/;

const KINDS: Readonly<Record<string, NpcKind>> = {
  kindred: "vampire",
  revenant: "ghoul",
  mortal: "mortal",
  animal: "animal",
  werewolf: "werewolf",
  wraith: "spirit",
  aapilu: "spirit"
};

const GENERATIONS = [
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh",
  "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth"
];

const STANDARD_REFS: Readonly<Record<string, string>> = { phy: "physical", soc: "social", men: "mental", pow: "supernatural" };

export type SheetImport = {
  readonly blocks: ReadonlyMap<string, NpcStatBlock>;
  /** Keys of rows with no stats. */
  readonly skipped: readonly string[];
  readonly errors: readonly string[];
};

const headerName = (cell: string): string => cell.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Each column's index: the first header cell with its name. */
export const findColumns = (header: readonly string[]): Record<Column, number> => {
  const names = header.map(headerName);
  const out = {} as Record<Column, number>;
  const missing: string[] = [];
  for (const [column, label] of Object.entries(COLUMNS) as [Column, string][]) {
    const index = names.indexOf(label.toLowerCase());
    if (index < 0) {
      missing.push(label);
    }
    out[column] = index;
  }
  if (missing.length > 0) {
    throw new Error(`CHARACTERS is missing header(s): ${missing.join(", ")}`);
  }
  return out;
};

const blank = (cell: string | undefined): boolean => cell === undefined || cell.trim() === "" || cell.trim() === "~";

/** Splits on commas outside parentheses, brackets and double quotes. */
export const splitTop = (text: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let current = "";
  for (const ch of text) {
    if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && (ch === "(" || ch === "[")) {
      depth++;
    } else if (!quoted && (ch === ")" || ch === "]")) {
      depth--;
    }
    if (ch === "," && depth === 0 && !quoted) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") {
    out.push(current.trim());
  }
  return out;
};

/** A short id that stays the same for the same name on every import (FNV-1a, base 36). */
export const stableId = (name: string, used: Set<string>): string => {
  for (let salt = 0; ; salt++) {
    let hash = 0x811c9dc5;
    for (const ch of `${name.toLowerCase()}#${salt}`) {
      hash ^= ch.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    const id = hash.toString(36);
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
};

const optionalInt = <K extends string>(key: K, value: number | undefined): Partial<Record<K, number>> =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, number>>;

/** Parses one row; throws with every problem in the row. */
const parseRow = (cell: (column: Column) => string, key: string): NpcStatBlock => {
  const problems: string[] = [];
  const int = (column: Column, range: readonly [number, number]): number | undefined => {
    const raw = cell(column);
    if (blank(raw)) {
      return undefined;
    }
    const value = /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
    if (!Number.isInteger(value) || value < range[0] || value > range[1]) {
      problems.push(`${COLUMNS[column]} "${raw}" is not a whole number from ${range[0]} to ${range[1]}`);
      return undefined;
    }
    return value;
  };

  const type = cell("type").trim();
  const clanCell = cell("clan").trim();
  const kind = type.toLowerCase() === "mortal" && clanCell.toLowerCase() === "ghoul" ? "ghoul" : KINDS[type.toLowerCase()];
  if (!kind) {
    throw new Error(`${key}: unknown Type "${type}"`);
  }
  const vampire = kind === "vampire";
  const hasSupernatural = supernaturalPoolName(kind) !== null;

  let generation: number | undefined;
  let clan: string | undefined;
  let rank: string | undefined;
  if (vampire) {
    const genCell = cell("generation").trim();
    if (!blank(genCell)) {
      const index = GENERATIONS.indexOf(genCell.toLowerCase());
      generation = index >= 0 ? index + 1 : /^\d+$/.test(genCell) ? Number(genCell) : undefined;
      if (generation === undefined || generation < RANGES.generation[0] || generation > RANGES.generation[1]) {
        problems.push(`Generation "${genCell}" is not a generation`);
        generation = undefined;
      }
    }
    if (!blank(clanCell)) {
      clan = NPC_CLANS.find((option) => option.toLowerCase() === clanCell.toLowerCase());
      if (!clan) {
        problems.push(`Clan "${clanCell}" is not one of ${NPC_CLANS.join(", ")}`);
      }
    }
    const rankCell = cell("rank").trim();
    if (!blank(rankCell)) {
      rank = NPC_RANKS.find((option) => option.toLowerCase() === rankCell.toLowerCase());
      if (!rank) {
        problems.push(`Rank "${rankCell}" is not one of ${NPC_RANKS.join(", ")}`);
      }
    }
  }

  let difficultyStrong: number | undefined;
  let difficultyWeak: number | undefined;
  const difficulty = cell("difficulty").trim();
  if (!blank(difficulty)) {
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(difficulty);
    const [strong, weak] = match ? [Number(match[1]), Number(match[2])] : [NaN, NaN];
    if (!match || strong > RANGES.difficulty[1] || weak > RANGES.difficulty[1]) {
      problems.push(`Difficulty "${difficulty}" is not "<well suited>/<otherwise>"`);
    } else {
      difficultyStrong = strong;
      difficultyWeak = weak;
    }
  }

  const supernatural = int("supernatural", RANGES.dice);
  if (supernatural !== undefined && !hasSupernatural) {
    problems.push(`Pow ${supernatural} on a ${type} (no supernatural pool for that kind)`);
  }

  const ids = new Set<string>();
  const exceptional: NpcPool[] = [];
  for (const entry of blank(cell("exceptional")) ? [] : splitTop(cell("exceptional"))) {
    const match = /^(.+?)\s+(\d+)$/.exec(entry);
    const dice = match ? Number(match[2]) : NaN;
    if (!match || dice > RANGES.dice[1]) {
      problems.push(`Exceptional pool "${entry}" is not "<name> <dice>"`);
      continue;
    }
    const name = match[1]!.trim();
    exceptional.push({ id: stableId(name, ids), name, dice });
  }

  const poolRef = (ref: string): string | undefined => {
    const lower = ref.trim().toLowerCase();
    const standard = STANDARD_REFS[lower];
    if (standard) {
      return standard === "supernatural" && !hasSupernatural ? undefined : standard;
    }
    const exceptionalPool = exceptional.find((pool) => pool.name.toLowerCase() === lower);
    return exceptionalPool ? `ex:${exceptionalPool.id}` : undefined;
  };

  const attacks: NpcAttack[] = [];
  for (const entry of blank(cell("attacks")) ? [] : splitTop(cell("attacks"))) {
    const match = /^([^|]+)\|([^|]+?)\s*([+-]\d+)$/.exec(entry);
    if (!match) {
      problems.push(`Attack "${entry}" is not "<name>|<pool>+<bonus>"`);
      continue;
    }
    const pool = poolRef(match[2]!);
    const bonus = Number(match[3]);
    if (!pool) {
      problems.push(`Attack "${entry}": "${match[2]!.trim()}" is not Phy, Soc, Men${hasSupernatural ? ", Pow" : ""} or an Exceptional pool`);
      continue;
    }
    if (bonus < RANGES.bonus[0] || bonus > RANGES.bonus[1]) {
      problems.push(`Attack "${entry}": bonus ${bonus} is outside ${RANGES.bonus[0]} to ${RANGES.bonus[1]}`);
      continue;
    }
    const name = match[1]!.trim();
    attacks.push({ id: stableId(name, ids), name, pool, bonus });
  }

  const powerRef = (ref: string): string | undefined => {
    const pool = poolRef(ref);
    if (pool) {
      return pool;
    }
    const attack = attacks.find((candidate) => candidate.name.toLowerCase() === ref.trim().toLowerCase());
    return attack ? `atk:${attack.id}` : undefined;
  };

  const notes: string[] = [];
  const powers: NpcPowerCategory[] = [];
  const addPowers = (column: "powers" | "ancilla"): void => {
    for (const group of blank(cell(column)) ? [] : splitTop(cell(column))) {
      const match = /^(.+?)\s+(\d+)\s*\(([\s\S]*)\)$/.exec(group);
      if (!match) {
        problems.push(`${COLUMNS[column]} "${group}" is not "<category> <dots> (<powers>)"`);
        continue;
      }
      const categoryName = match[1]!.trim();
      const dots = Number(match[2]);
      let category = powers.find((candidate) => candidate.name.toLowerCase() === categoryName.toLowerCase());
      if (!category) {
        category = { name: categoryName, ...(dots <= RANGES.dots[1] ? { dots } : {}), powers: [] };
        powers.push(category);
      }
      const entries = category.powers as NpcPower[];
      for (const raw of splitTop(match[3]!)) {
        const described = /^([\s\S]*?)\|"([\s\S]*)"$/.exec(raw);
        const [levelText = "", rouseText = "", name = "", poolText, ...extra] = (described ? described[1]! : raw)
          .split("|")
          .map((piece) => piece.trim());
        const level = Number(levelText);
        const rouse = Number(rouseText);
        if (!/^\d$/.test(levelText) || !/^\d$/.test(rouseText) || name === "" || extra.length > 0
          || level < RANGES.level[0] || level > RANGES.level[1] || rouse > RANGES.rouse[1]) {
          problems.push(`${COLUMNS[column]} power "${raw}" is not "<level>|<rouse>|<name>[|<pool>]"`);
          continue;
        }
        const pool = poolText === undefined ? "" : powerRef(poolText);
        if (pool === undefined) {
          problems.push(`${COLUMNS[column]} power "${raw}": "${poolText}" is not a standard pool, Exceptional pool or attack`);
          continue;
        }
        entries.push({
          level,
          name,
          rouse: usesRouse(kind) ? rouse : 0,
          pool,
          ...(column === "ancilla" ? { ancilla: true as const } : {})
        });
        if (described) {
          notes.push(`${name} (${categoryName} ancilla power): ${described[2]!.trim()}`);
        }
      }
    }
  };
  addPowers("powers");
  addPowers("ancilla");

  for (const [column, label] of [["elder", "Elder power"], ["methuselah", "Methuselah power"]] as const) {
    for (const entry of blank(cell(column)) ? [] : splitTop(cell(column))) {
      const match = /^(.+?)\s*\(([\s\S]*)\)$/.exec(entry);
      notes.push(match ? `${label}: ${match[1]!.trim()}: ${match[2]!.trim()}` : `${label}: ${entry}`);
    }
  }
  const noteText = notes.join("\n");
  if (noteText.length > NOTES_MAX) {
    problems.push(`ancilla / elder / methuselah text is ${noteText.length} characters (Notes hold ${NOTES_MAX})`);
  }

  const block: NpcStatBlock = {
    kind,
    ...(generation !== undefined ? { generation } : {}),
    ...(clan !== undefined ? { clan } : {}),
    ...(rank !== undefined ? { rank } : {}),
    ...optionalInt("bloodPotency", vampire ? int("bloodPotency", RANGES.bloodPotency) : undefined),
    ...optionalInt("humanity", vampire ? int("humanity", RANGES.humanity) : undefined),
    ...optionalInt("difficultyStrong", difficultyStrong),
    ...optionalInt("difficultyWeak", difficultyWeak),
    ...optionalInt("health", int("health", RANGES.tracker)),
    ...optionalInt("willpower", int("willpower", RANGES.tracker)),
    ...optionalInt("physical", int("physical", RANGES.dice)),
    ...optionalInt("social", int("social", RANGES.dice)),
    ...optionalInt("mental", int("mental", RANGES.dice)),
    ...optionalInt("supernatural", hasSupernatural ? supernatural : undefined),
    exceptional,
    attacks,
    powers,
    ...(noteText !== "" ? { notes: noteText } : {})
  };
  if (problems.length > 0) {
    throw new Error(`${key}: ${problems.join("; ")}`);
  }
  return block;
};

/** Every statted row of the CHARACTERS tab (header in row 1). */
export const parseCharacters = (rows: CsvRows): SheetImport => {
  const [header, ...body] = rows;
  if (!header) {
    throw new Error("CHARACTERS is empty");
  }
  const columns = findColumns(header);
  const blocks = new Map<string, NpcStatBlock>();
  const skipped: string[] = [];
  const errors: string[] = [];
  for (const row of body) {
    const cell = (column: Column): string => row[columns[column]] ?? "";
    const key = cell("key").trim();
    if (key === "") {
      continue;
    }
    if (STAT_COLUMNS.every((column) => blank(cell(column)))) {
      skipped.push(key);
      continue;
    }
    if (!KEY_PATTERN.test(key)) {
      errors.push(`${key}: API key is not letters, digits and underscores`);
      continue;
    }
    if (blocks.has(key)) {
      errors.push(`${key}: API key appears twice`);
      continue;
    }
    try {
      blocks.set(key, parseRow(cell, key));
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { blocks, skipped, errors };
};
