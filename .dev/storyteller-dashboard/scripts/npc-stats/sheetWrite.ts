import { isDeepStrictEqual } from "node:util";
import type { NpcPower, NpcStatBlock } from "../../src/shared/npcStats.ts";
import { parseStatRecord, type SheetRecord } from "./sheet.ts";

export const WRITE_HEADERS = [
  "Kind", "Clan", "Generation", "Rank", "Blood Potency", "Humanity", "Difficulty", "Health", "Willpower",
  "Phy", "Soc", "Men", "Pow", "Exceptional Pools", "Attacks", "Powers", "Advantages"
] as const;

export type WritePlan = {
  readonly cells: Readonly<Record<string, string | number>>;
  readonly problems: readonly string[];
  readonly notesDiffer: boolean;
};

const EMPTY = "~";
const STANDARD_TEXT: Readonly<Record<string, string>> = { physical: "Phy", social: "Soc", mental: "Men", supernatural: "Pow" };
const GENERATIONS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh",
  "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth"
] as const;

const poolName = (block: NpcStatBlock, ref: string): string => {
  if (ref.startsWith("ex:")) return block.exceptional.find((pool) => `ex:${pool.id}` === ref)?.name ?? "";
  if (ref.startsWith("atk:")) return block.attacks.find((attack) => `atk:${attack.id}` === ref)?.name ?? "";
  return STANDARD_TEXT[ref] ?? "";
};
const traitText = (value: { readonly traits?: readonly [string, string] }): string =>
  value.traits?.filter(Boolean).join("+") ?? "";
const powerText = (block: NpcStatBlock, power: NpcPower): string => {
  const cost = block.kind === "vampire" || block.kind === "ghoul" ? `-${power.rouse}` : "";
  const pool = poolName(block, power.pool);
  const traits = traitText(power);
  return `${power.level}${cost}:${power.name}${pool ? `=${pool}` : ""}${traits ? `:${traits}` : ""}${power.difficulty ? `_${power.difficulty}` : ""}`;
};
const value = (block: NpcStatBlock, header: (typeof WRITE_HEADERS)[number]): string | number => {
  switch (header) {
    case "Kind": return block.kind ? block.kind[0]!.toUpperCase() + block.kind.slice(1) : EMPTY;
    case "Clan": return block.kind === "vampire" ? block.clan ?? EMPTY : EMPTY;
    case "Generation": return block.generation ? GENERATIONS[block.generation - 1] ?? EMPTY : EMPTY;
    case "Rank": return block.rank ?? EMPTY;
    case "Blood Potency": return block.bloodPotency ?? EMPTY;
    case "Humanity": return block.humanity ?? EMPTY;
    case "Difficulty": return block.difficultyStrong === undefined || block.difficultyWeak === undefined
      ? EMPTY : `${block.difficultyStrong}/${block.difficultyWeak}`;
    case "Health": return block.health ?? EMPTY;
    case "Willpower": return block.willpower ?? EMPTY;
    case "Phy": return block.physical ?? EMPTY;
    case "Soc": return block.social ?? EMPTY;
    case "Men": return block.mental ?? EMPTY;
    case "Pow": return block.supernatural ?? EMPTY;
    case "Exceptional Pools": return block.exceptional.map((pool) => `${pool.name}${traitText(pool) ? `:${traitText(pool)}` : ""}`).join("|") || EMPTY;
    case "Attacks": return block.attacks.map((attack) => {
      const traits = traitText(attack);
      return `${attack.name}=${poolName(block, attack.pool)}${attack.bonus < 0 ? "" : "+"}${attack.bonus}${traits ? `:${traits}` : ""}`;
    }).join("|") || EMPTY;
    case "Powers": return block.powers.map((category) => {
      const dots = category.dots ?? Math.max(0, ...category.powers.map((power) => power.level));
      return `${category.name} ${dots} (${category.powers.map((power) => powerText(block, power)).join(",")})`;
    }).join("|") || EMPTY;
    case "Advantages": return block.advantages?.map((advantage) => advantage.name).join("|") || EMPTY;
  }
};

const comparable = (block: NpcStatBlock): unknown => ({
  ...Object.fromEntries(Object.entries(block).filter(([key]) => !["notes", "exceptional", "attacks", "powers", "advantages"].includes(key))),
  exceptional: block.exceptional.map(({ id: _id, ...pool }) => pool),
  attacks: block.attacks.map(({ id: _id, pool, ...attack }) => ({ ...attack, pool: poolName(block, pool) })),
  powers: block.powers.map((category) => ({ ...category,
    powers: category.powers.map((power) => ({ ...power, pool: poolName(block, power.pool) }))
  })),
  advantages: block.advantages?.map((advantage) => advantage.name) ?? []
});

export const planRowWrite = (key: string, block: NpcStatBlock, current: SheetRecord): WritePlan => {
  if ((block.difficultyStrong === undefined) !== (block.difficultyWeak === undefined)) {
    return { cells: {}, problems: ["Difficulty needs both exceptional and general values"], notesDiffer: false };
  }
  try { parseStatRecord(current, key, true); }
  catch (reason) {
    return { cells: {}, problems: [`the Sheet row cannot be read first (${reason instanceof Error ? reason.message : String(reason)})`], notesDiffer: false };
  }
  const cells = Object.fromEntries(WRITE_HEADERS.flatMap((header) => {
    if (header === "Clan" && block.kind !== "vampire") return [];
    const next = value(block, header);
    return String(next) === (current[header] ?? "").trim() ? [] : [[header, next]];
  }));
  const merged = { ...current, ...Object.fromEntries(Object.entries(cells).map(([header, cell]) => [header, String(cell)])) };
  try {
    const reparsed = parseStatRecord(merged, key, true);
    if (!isDeepStrictEqual(comparable(block), comparable(reparsed))) {
      return { cells: {}, problems: ["the edited block cannot make a lossless round trip through the Sheet notation"], notesDiffer: false };
    }
    return { cells, problems: [], notesDiffer: (block.notes ?? "") !== (reparsed.notes ?? "") };
  } catch (reason) {
    return { cells: {}, problems: [`the new cells would not import (${reason instanceof Error ? reason.message : String(reason)})`], notesDiffer: false };
  }
};
