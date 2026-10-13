import { isDeepStrictEqual } from "node:util";
import type { NpcPower, NpcPowerCategory, NpcStatBlock } from "../../src/shared/npcStats.ts";
import { blank, COLUMNS, GENERATIONS, parseCharacterRow, splitTop, type Column } from "./sheet.ts";

/**
 * A dashboard stat block → the CHARACTERS cells that must change for the sheet to say the same thing (the inverse
 * of `sheet.ts`). Only columns whose meaning differs are written, so edits made on the sheet in other columns
 * survive. Every plan is checked by parsing the row with the new cells: if it would not import back to the same
 * stats, the plan reports a problem instead. Notes are not written (they are built from the Ancilla, Elder and
 * Methuselah columns); ancilla power descriptions are taken from the Notes, else from the sheet.
 */

/** The columns a write may change. `apps-script/Code.gs` WRITABLE lists the same headers. */
export const WRITE_COLUMNS = [
  "type", "clan", "generation", "rank", "bloodPotency", "humanity", "difficulty", "health", "willpower",
  "physical", "social", "mental", "supernatural", "exceptional", "attacks", "powers", "ancilla"
] as const satisfies readonly Column[];
type WriteColumn = (typeof WRITE_COLUMNS)[number];

export type WritePlan = {
  /** Header → new cell value. */
  readonly cells: Readonly<Record<string, string | number>>;
  readonly problems: readonly string[];
  /** The block's Notes differ from what the sheet's power columns produce, so a Notes edit will not survive. */
  readonly notesDiffer: boolean;
};

const EMPTY = "~";
const STANDARD_TEXT: Readonly<Record<string, string>> = { physical: "Phy", social: "Soc", mental: "Men", supernatural: "Pow" };
const POWER_GROUP = /^(.+?)\s+(\d+)\s*\(([\s\S]*)\)$/;
const DESCRIBED = /^([\s\S]*?)\|"([\s\S]*)"$/;
const NOTE_LINE = /^(.+) \((.+) ancilla power\): ([\s\S]+)$/;

const poolName = (block: NpcStatBlock, ref: string): string => {
  if (ref.startsWith("ex:")) {
    return block.exceptional.find((pool) => `ex:${pool.id}` === ref)?.name ?? "";
  }
  if (ref.startsWith("atk:")) {
    return block.attacks.find((attack) => `atk:${attack.id}` === ref)?.name ?? "";
  }
  return STANDARD_TEXT[ref] ?? "";
};

/** A pool ref by meaning (ids differ between the dashboard and the import). */
const poolLabel = (block: NpcStatBlock, ref: string): string =>
  ref.startsWith("ex:") || ref.startsWith("atk:") ? `${ref.slice(0, ref.indexOf(":"))}:${poolName(block, ref).toLowerCase()}` : ref;

const regular = (category: NpcPowerCategory): readonly NpcPower[] => category.powers.filter((power) => !power.ancilla);
const ancillary = (category: NpcPowerCategory): readonly NpcPower[] => category.powers.filter((power) => power.ancilla);
/** Categories written to Powers: any with a regular power, or with no powers at all. */
const inPowers = (category: NpcPowerCategory): boolean => category.powers.length === 0 || regular(category).length > 0;

/** What one column says about a block, for comparing the dashboard with the sheet. */
const view = (block: NpcStatBlock, column: WriteColumn): unknown => {
  const power = (entry: NpcPower): unknown[] => [entry.level, entry.rouse, entry.name, poolLabel(block, entry.pool)];
  switch (column) {
    case "type":
      return block.kind ?? null;
    case "difficulty":
      return [block.difficultyStrong ?? null, block.difficultyWeak ?? null];
    case "exceptional":
      return block.exceptional.map((pool) => [pool.name, pool.dice]);
    case "attacks":
      return block.attacks.map((attack) => [attack.name, poolLabel(block, attack.pool), attack.bonus]);
    case "powers":
      return block.powers.filter(inPowers).map((category) => [category.name, category.dots ?? null, regular(category).map(power)]);
    case "ancilla":
      return block.powers.filter((category) => ancillary(category).length > 0)
        .map((category) => [category.name, ancillary(category).map(power)])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    default:
      return block[column] ?? null;
  }
};

const capitalized = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const powerEntry = (block: NpcStatBlock, entry: NpcPower, description?: string): string => {
  const pool = poolName(block, entry.pool);
  const tail = description === undefined ? "" : `|"${description.replace(/"/g, "'")}"`;
  return `${entry.level}|${entry.rouse}|${entry.name}${pool === "" ? "" : `|${pool}`}${tail}`;
};

/** The current Ancilla cell's group number per discipline and description per power name (lower case). */
const sheetAncilla = (cell: string): { numbers: Map<string, string>; descriptions: Map<string, string> } => {
  const numbers = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const group of blank(cell) ? [] : splitTop(cell)) {
    const match = POWER_GROUP.exec(group);
    if (!match) {
      continue;
    }
    numbers.set(match[1]!.trim().toLowerCase(), match[2]!);
    for (const entry of splitTop(match[3]!)) {
      const described = DESCRIBED.exec(entry);
      const name = described?.[1]!.split("|")[2]?.trim();
      if (described && name) {
        descriptions.set(name.toLowerCase(), described[2]!);
      }
    }
  }
  return { numbers, descriptions };
};

/** The sheet Type for a block's kind, keeping the current Type where the sheet has two for one kind. */
const typeText = (block: NpcStatBlock, currentType: string): string | null => {
  const current = currentType.trim().toLowerCase();
  switch (block.kind) {
    case "vampire":
      return "Kindred";
    case "ghoul":
      return current === "revenant" ? "Revenant" : "Mortal";
    case "mortal":
      return "Mortal";
    case "animal":
      return "Animal";
    case "werewolf":
      return "Werewolf";
    case "spirit":
      return current === "wraith" || current === "aapilu" ? currentType.trim() : "Wraith";
    default:
      return null;
  }
};

/** Clan for the block: a vampire's clan, `Ghoul` on a Mortal-type ghoul, else the current cell minus a stale `Ghoul`. */
const clanText = (block: NpcStatBlock, type: string, currentClan: string): string => {
  if (block.kind === "vampire") {
    return block.clan ?? EMPTY;
  }
  if (block.kind === "ghoul" && type === "Mortal") {
    return "Ghoul";
  }
  return currentClan.trim().toLowerCase() === "ghoul" ? EMPTY : currentClan.trim();
};

const cellText = (block: NpcStatBlock, column: WriteColumn, current: (column: Column) => string): string | number => {
  switch (column) {
    case "type":
      return typeText(block, current("type")) ?? EMPTY;
    case "clan":
      return clanText(block, String(cellText(block, "type", current)), current("clan"));
    case "generation":
      return block.generation === undefined ? EMPTY : capitalized(GENERATIONS[block.generation - 1]!);
    case "difficulty":
      return block.difficultyStrong === undefined ? EMPTY : `${block.difficultyStrong}/${block.difficultyWeak}`;
    case "exceptional":
      return block.exceptional.map((pool) => `${pool.name} ${pool.dice}`).join(", ") || EMPTY;
    case "attacks":
      return block.attacks
        .map((attack) => `${attack.name}|${poolName(block, attack.pool)}${attack.bonus < 0 ? "" : "+"}${attack.bonus}`)
        .join(", ") || EMPTY;
    case "powers":
      return block.powers.filter(inPowers).map((category) => {
        const dots = category.dots ?? Math.max(0, ...category.powers.map((entry) => entry.level));
        return `${category.name} ${dots} (${regular(category).map((entry) => powerEntry(block, entry)).join(", ")})`;
      }).join(", ") || EMPTY;
    case "ancilla": {
      const sheet = sheetAncilla(current("ancilla"));
      const fromNotes = new Map<string, string>();
      for (const line of (block.notes ?? "").split("\n")) {
        const match = NOTE_LINE.exec(line);
        if (match) {
          fromNotes.set(match[1]!.trim().toLowerCase(), match[3]!.trim());
        }
      }
      return block.powers.filter((category) => ancillary(category).length > 0).map((category) => {
        const entries = ancillary(category);
        const number = sheet.numbers.get(category.name.toLowerCase()) ?? String(Math.max(...entries.map((entry) => entry.level)));
        const text = entries.map((entry) => {
          const name = entry.name.toLowerCase();
          return powerEntry(block, entry, fromNotes.get(name) ?? sheet.descriptions.get(name));
        });
        return `${category.name} ${number} (${text.join(", ")})`;
      }).join(", ") || EMPTY;
    }
    default:
      return block[column] ?? EMPTY;
  }
};

export const planRowWrite = (key: string, block: NpcStatBlock, current: (column: Column) => string): WritePlan => {
  const failed = (problem: string): WritePlan => ({ cells: {}, problems: [problem], notesDiffer: false });
  let sheetBlock: NpcStatBlock;
  try {
    sheetBlock = parseCharacterRow(current, key);
  } catch (error: unknown) {
    return failed(`the sheet row cannot be read, so fix it there first (${error instanceof Error ? error.message : String(error)})`);
  }
  if ((block.difficultyStrong === undefined) !== (block.difficultyWeak === undefined)) {
    return failed("the sheet's Difficulty needs both values (well suited / otherwise)");
  }

  if (typeText(block, current("type")) === null) {
    return failed(`kind "${block.kind ?? "none"}" has no sheet Type`);
  }

  const changed = new Set(WRITE_COLUMNS.filter((column) => !isDeepStrictEqual(view(block, column), view(sheetBlock, column))));
  if (changed.has("type") || changed.has("clan")) {
    changed.add("type").add("clan");
  }
  const next = new Map<Column, string | number>();
  for (const column of changed) {
    const value = cellText(block, column, current);
    if (String(value) !== current(column).trim()) {
      next.set(column, value);
    }
  }

  const written = (column: Column): string => {
    const value = next.get(column);
    return value === undefined ? current(column) : String(value);
  };
  let result: NpcStatBlock;
  try {
    result = parseCharacterRow(written, key);
  } catch (error: unknown) {
    return failed(`the new cells would not import (${error instanceof Error ? error.message : String(error)})`);
  }
  const lost = WRITE_COLUMNS.filter((column) => !isDeepStrictEqual(view(block, column), view(result, column)));
  if (lost.length > 0) {
    return failed(`${lost.map((column) => COLUMNS[column]).join(", ")} cannot be written in the sheet's format`);
  }
  const cells = Object.fromEntries([...next].map(([column, value]) => [COLUMNS[column], value]));
  return { cells, problems: [], notesDiffer: (block.notes ?? "") !== (result.notes ?? "") };
};
