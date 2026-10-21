import type { CsvRows } from "../../src/shared/csv.ts";
import { parseNpcDifficulty, type NpcRollMetadata } from "../../src/shared/npcCustomRolls.ts";
import { npcNotesFromSheetSections } from "../../src/shared/npcNotes.ts";
import {
  NPC_CLANS, NPC_KINDS, NPC_RANKS, NPC_TIERS, RANGES, usesRouse,
  type NpcAdvantage, type NpcAttack, type NpcPool, type NpcPower, type NpcPowerCategory,
  type NpcStatBlock, type NpcTier
} from "../../src/shared/npcStats.ts";

export type SheetRecord = Readonly<Record<string, string>>;
const cleanHeader = (value: string): string => value.replace(/\*/g, "").replace(/\s+/g, " ").trim();
export const blank = (value: string | undefined): boolean => !value || value.trim() === "" || value.trim() === "~";

export const sheetRecords = (rows: CsvRows, tab: string): readonly SheetRecord[] => {
  const [header, ...body] = rows;
  if (!header) throw new Error(`${tab} is empty.`);
  const names = header.map(cleanHeader);
  const indexes = names.flatMap((name, index) => name !== "" && names.indexOf(name) === index ? [[name, index] as const] : []);
  return body.map((row) => Object.fromEntries(indexes.map(([name, index]) => [name, row[index]?.trim() ?? ""])));
};

export const stableId = (name: string, used: Set<string>): string => {
  for (let salt = 0; ; salt++) {
    let hash = 0x811c9dc5;
    for (const ch of `${name.toLowerCase()}#${salt}`) {
      hash ^= ch.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    const id = hash.toString(36);
    if (!used.has(id)) { used.add(id); return id; }
  }
};

const splitPipe = (value: string | undefined): string[] => blank(value) ? [] : value!.split("|").map((part) => part.trim()).filter(Boolean);
const metadata = (text: string | undefined, problems: string[]): NpcRollMetadata => {
  if (blank(text)) return {};
  const traits = text!.split("+").map((part) => part.trim());
  if (traits.length > 2 || traits.some((trait) => !trait)) problems.push(`traits "${text}" must contain one or two names separated by +`);
  return { traits: [traits[0] ?? "", traits[1] ?? ""] };
};
const GENERATIONS = [
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh",
  "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth"
] as const;
const optional = <K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

export const parseTier = (value: string): NpcTier | undefined => NPC_TIERS.find((tier) => tier === value.trim().toLowerCase());

export const parseStatRecord = (row: SheetRecord, key: string, named: boolean): NpcStatBlock => {
  const problems: string[] = [];
  const readInt = (header: string, range: readonly [number, number]): number | undefined => {
    const raw = row[header];
    if (blank(raw)) return undefined;
    const value = Number(raw);
    if (!/^\d+$/.test(raw!) || !Number.isInteger(value) || value < range[0] || value > range[1]) {
      problems.push(`${header} "${raw}" is not a whole number from ${range[0]} to ${range[1]}`);
      return undefined;
    }
    return value;
  };
  const kind = NPC_KINDS.find((candidate) => candidate === (row.Kind ?? "").toLowerCase());
  if (!kind) throw new Error(`${key}: unknown Kind "${row.Kind ?? ""}"`);
  const vampire = kind === "vampire";
  let generation: number | undefined;
  if (named && vampire && !blank(row.Generation)) {
    const normalized = row.Generation!.toLowerCase().replace(/\s+generation$/, "");
    const at = GENERATIONS.indexOf(normalized as (typeof GENERATIONS)[number]);
    generation = at >= 0 ? at + 1 : undefined;
    if (!generation) problems.push(`Generation "${row.Generation}" is not First through Seventeenth`);
  }
  const clan = named && vampire && !blank(row.Clan)
    ? NPC_CLANS.find((candidate) => candidate.toLowerCase() === row.Clan!.toLowerCase()) : undefined;
  if (named && vampire && !blank(row.Clan) && !clan) problems.push(`Clan "${row.Clan}" is not supported`);
  const rank = vampire && !blank(row.Rank)
    ? NPC_RANKS.find((candidate) => candidate.toLowerCase() === row.Rank!.toLowerCase()) : undefined;
  if (vampire && !blank(row.Rank) && !rank) problems.push(`Rank "${row.Rank}" is not supported`);

  let difficultyStrong: number | undefined;
  let difficultyWeak: number | undefined;
  if (!blank(row.Difficulty)) {
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(row.Difficulty!);
    if (!match || Number(match[1]) > RANGES.difficulty[1] || Number(match[2]) > RANGES.difficulty[1]) {
      problems.push(`Difficulty "${row.Difficulty}" is not <exceptional>/<general>`);
    } else { difficultyStrong = Number(match[1]); difficultyWeak = Number(match[2]); }
  }

  const ids = new Set<string>();
  const exceptional: NpcPool[] = [];
  for (const entry of splitPipe(row["Exceptional Pools"])) {
    const [namePart = "", traitsPart, ...extra] = entry.split(":");
    const name = namePart.trim();
    if (!name || extra.length > 0) { problems.push(`Exceptional pool "${entry}" has invalid notation`); continue; }
    if (difficultyStrong === undefined) { problems.push(`Exceptional pool "${name}" needs an exceptional Difficulty`); continue; }
    exceptional.push({ id: stableId(name, ids), name, dice: difficultyStrong * 2, ...metadata(traitsPart, problems) });
  }

  const standard: Readonly<Record<string, string>> = { phy: "physical", soc: "social", men: "mental", pow: "supernatural" };
  const poolRef = (raw: string): string | undefined => {
    const value = raw.trim().toLowerCase();
    const builtIn = standard[value];
    if (builtIn) return builtIn;
    const found = exceptional.find((pool) => pool.name.toLowerCase() === value);
    return found ? `ex:${found.id}` : undefined;
  };
  const attacks: NpcAttack[] = [];
  for (const entry of splitPipe(row.Attacks)) {
    const match = /^(.+?)=(.+?)([+-]\d+)(?::(.+))?$/.exec(entry);
    if (!match) { problems.push(`Attack "${entry}" is not <name>=<pool>+<bonus>[:traits]`); continue; }
    const pool = poolRef(match[2]!);
    const bonus = Number(match[3]);
    if (!pool) { problems.push(`Attack "${entry}" refers to unknown pool "${match[2]!.trim()}"`); continue; }
    if (bonus < RANGES.bonus[0] || bonus > RANGES.bonus[1]) { problems.push(`Attack "${entry}" has an invalid bonus`); continue; }
    const name = match[1]!.trim();
    attacks.push({ id: stableId(name, ids), name, pool, bonus, ...metadata(match[4], problems) });
  }

  const powerRef = (raw: string): string | undefined => {
    const direct = poolRef(raw);
    if (direct) return direct;
    const attack = attacks.find((candidate) => candidate.name.toLowerCase() === raw.trim().toLowerCase());
    return attack ? `atk:${attack.id}` : undefined;
  };
  const powers: NpcPowerCategory[] = [];
  for (const group of splitPipe(row.Powers)) {
    const match = /^(.+?)\s+(\d+)\s*\(([\s\S]*)\)$/.exec(group);
    if (!match) { problems.push(`Powers group "${group}" is not <category> <rating> (<powers>)`); continue; }
    const dots = Number(match[2]);
    if (dots < RANGES.dots[0] || dots > RANGES.dots[1]) { problems.push(`Powers group "${group}" has an invalid rating`); continue; }
    const entries: NpcPower[] = [];
    for (const raw of match[3]!.split(/,(?=\s*\d+(?:-\d+)?:)/).map((value) => value.trim()).filter(Boolean)) {
      const power = /^(\d+)(?:-(\d+))?:([^=_:]+?)(?:=([^_:]+))?(?::([^_]+))?(?:_(.+))?$/.exec(raw);
      if (!power) { problems.push(`Power "${raw}" has invalid notation`); continue; }
      const level = Number(power[1]);
      const rouse = power[2] === undefined ? 0 : Number(power[2]);
      if (level < RANGES.level[0] || level > RANGES.level[1] || rouse > RANGES.rouse[1]) {
        problems.push(`Power "${raw}" has an invalid level or Rouse cost`); continue;
      }
      if (usesRouse(kind) && power[2] === undefined) problems.push(`Power "${raw}" must include its Rouse cost`);
      const pool = blank(power[4]) ? "" : powerRef(power[4]!);
      if (pool === undefined) { problems.push(`Power "${raw}" refers to unknown pool "${power[4]}"`); continue; }
      const difficulty = power[6]?.trim();
      if (difficulty && parseNpcDifficulty(difficulty) === null) { problems.push(`Power "${raw}" has invalid Difficulty "${difficulty}"`); continue; }
      entries.push({ level, rouse: usesRouse(kind) ? rouse : 0, name: power[3]!.trim(), pool,
        ...metadata(power[5], problems), ...(difficulty ? { difficulty } : {}) });
    }
    powers.push({ name: match[1]!.trim(), dots, powers: entries });
  }

  const advantages: NpcAdvantage[] = named ? splitPipe(row.Advantages).map((name) => ({ id: stableId(name, ids), name })) : [];
  const notes = npcNotesFromSheetSections([
    { label: "Ancilla Powers", entries: splitPipe(row["Ancilla Power(s)"]) },
    { label: "Elder Powers", entries: splitPipe(row["Elder Power(s)"]) },
    { label: "Methuselah Powers", entries: splitPipe(row["Methuselah Power(s)"]) },
    { label: "Special Abilities", entries: splitPipe(row["Special Abilities"]) }
  ]);
  const block: NpcStatBlock = {
    kind,
    ...optional("generation", generation), ...optional("clan", clan), ...optional("rank", rank),
    ...optional("bloodPotency", vampire ? readInt("Blood Potency", RANGES.bloodPotency) : undefined),
    ...optional("humanity", vampire ? readInt("Humanity", RANGES.humanity) : undefined),
    ...optional("difficultyStrong", difficultyStrong), ...optional("difficultyWeak", difficultyWeak),
    ...optional("health", readInt("Health", RANGES.tracker)), ...optional("willpower", readInt("Willpower", RANGES.tracker)),
    ...optional("physical", readInt("Phy", RANGES.dice)), ...optional("social", readInt("Soc", RANGES.dice)),
    ...optional("mental", readInt("Men", RANGES.dice)), ...optional("supernatural", readInt("Pow", RANGES.dice)),
    exceptional, attacks, powers, advantages, ...optional("notes", notes || undefined)
  };
  if (problems.length > 0) throw new Error(`${key}: ${problems.join("; ")}`);
  return block;
};
