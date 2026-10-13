import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { NpcStatBlock } from "../../src/shared/npcStats.ts";
import { COLUMNS, parseCharacterRow, type Column } from "./sheet.ts";
import { planRowWrite, WRITE_COLUMNS } from "./sheetWrite.ts";

type Row = Partial<Record<Column, string>>;

const VAMPIRE: Row = {
  key: "testVamp",
  type: "Kindred",
  clan: "Nosferatu",
  generation: "Tenth",
  rank: "~",
  bloodPotency: "2",
  humanity: "~",
  difficulty: "5/3",
  health: "6",
  willpower: "5",
  physical: "4",
  social: "3",
  mental: "5",
  supernatural: "6",
  exceptional: "Stealth 9, Melee [Knives] 7",
  attacks: "Fists|Phy+0, Shiv|Melee [Knives]+2",
  powers: "Obfuscate 3 (1|0|Silence of Death, 2|1|Unseen Passage|Stealth), Potence 1 (1|0|Lethal Body)",
  ancilla: 'Obfuscate 2 (3|1|Murmur|Stealth|"Whispers, unheard.")',
  elder: "~",
  methuselah: "~"
};

const getter = (row: Row) => (column: Column): string => row[column] ?? "";
const imported = (row: Row): NpcStatBlock => parseCharacterRow(getter(row), row.key!);
const plan = (row: Row, block: NpcStatBlock) => planRowWrite(row.key!, block, getter(row));

describe("planRowWrite", () => {
  it("writes nothing when the dashboard matches the sheet", () => {
    expect(plan(VAMPIRE, imported(VAMPIRE))).toEqual({ cells: {}, problems: [], notesDiffer: false });
  });

  it("ignores ids, which differ between the dashboard and the import", () => {
    const block = imported(VAMPIRE);
    const exceptional = block.exceptional.map((pool, index) => ({ ...pool, id: `p${index}` }));
    const attacks = block.attacks.map((attack) => ({ ...attack, id: `a${attack.name.length}`, pool: attack.pool.startsWith("ex:") ? "ex:p1" : attack.pool }));
    expect(plan(VAMPIRE, { ...block, exceptional, attacks }).cells).toEqual({});
  });

  it("writes only the columns whose meaning changed", () => {
    const block = imported(VAMPIRE);
    const stealth = block.exceptional[0]!;
    const result = plan(VAMPIRE, {
      ...block,
      health: 7,
      bloodPotency: undefined as never,
      attacks: [...block.attacks, { id: "x", name: "Lunge", pool: `ex:${stealth.id}`, bonus: -1 }]
    });
    expect(result.problems).toEqual([]);
    expect(result.cells).toEqual({
      [COLUMNS.health]: 7,
      [COLUMNS.bloodPotency]: "~",
      [COLUMNS.attacks]: "Fists|Phy+0, Shiv|Melee [Knives]+2, Lunge|Stealth-1"
    });
  });

  it("keeps the Ancilla group number and description, and takes an edited description from Notes", () => {
    const block = imported(VAMPIRE);
    const powers = block.powers.map((category) => category.name === "Obfuscate"
      ? { ...category, powers: category.powers.map((power) => power.ancilla ? { ...power, rouse: 2 } : power) }
      : category);
    expect(plan(VAMPIRE, { ...block, powers }).cells).toEqual({
      [COLUMNS.ancilla]: 'Obfuscate 2 (3|2|Murmur|Stealth|"Whispers, unheard.")'
    });
    const edited = { ...block, powers, notes: "Murmur (Obfuscate ancilla power): Heard by one.\nOther text." };
    const result = plan(VAMPIRE, edited);
    expect(result.cells).toEqual({ [COLUMNS.ancilla]: 'Obfuscate 2 (3|2|Murmur|Stealth|"Heard by one.")' });
    expect(result.notesDiffer).toBe(true);
  });

  it("writes a new ancilla discipline after the regular ones and still round-trips", () => {
    const block = imported(VAMPIRE);
    const powers = [
      { name: "Auspex", powers: [{ level: 2, name: "Glimpse", rouse: 1, pool: "supernatural", ancilla: true as const }] },
      ...block.powers
    ];
    expect(plan(VAMPIRE, { ...block, powers })).toMatchObject({
      problems: [],
      cells: { [COLUMNS.ancilla]: 'Auspex 2 (2|1|Glimpse|Pow), Obfuscate 2 (3|1|Murmur|Stealth|"Whispers, unheard.")' }
    });
  });

  it("sets Type and Clan together when the kind changes", () => {
    const mortal: Row = { key: "testMortal", type: "Mortal", clan: "~", physical: "3", social: "2", mental: "2" };
    expect(plan(mortal, { ...imported(mortal), kind: "ghoul", supernatural: 1 }).cells).toEqual({
      [COLUMNS.clan]: "Ghoul",
      [COLUMNS.supernatural]: 1
    });
    const ghoul: Row = { ...mortal, clan: "Ghoul", supernatural: "1" };
    expect(plan(ghoul, { ...imported(ghoul), kind: "mortal", supernatural: undefined as never }).cells).toEqual({
      [COLUMNS.clan]: "~",
      [COLUMNS.supernatural]: "~"
    });
    expect(plan(VAMPIRE, { ...imported(VAMPIRE), clan: "Caitiff", generation: 12 }).cells).toEqual({
      [COLUMNS.clan]: "Caitiff",
      [COLUMNS.generation]: "Twelfth"
    });
  });

  it("refuses what the sheet cannot hold", () => {
    const block = imported(VAMPIRE);
    expect(plan(VAMPIRE, { ...block, kind: "other" }).problems).toEqual(['kind "other" has no sheet Type']);
    expect(plan(VAMPIRE, { ...block, difficultyWeak: undefined as never }).problems[0]).toMatch(/Difficulty needs both/);
    expect(plan(VAMPIRE, { ...block, exceptional: [...block.exceptional, { id: "c", name: "Odd, Name", dice: 3 }] }).problems[0])
      .toMatch(/would not import|cannot be written/);
    expect(plan({ ...VAMPIRE, health: "lots" }, block).problems[0]).toMatch(/sheet row cannot be read/);
  });
});

describe("WRITE_COLUMNS", () => {
  it("matches the Apps Script's WRITABLE headers", () => {
    const code = readFileSync(path.join(import.meta.dirname, "apps-script", "Code.gs"), "utf8");
    const list = /var WRITABLE = \[([\s\S]*?)\];/.exec(code)![1]!;
    const writable = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(writable).toEqual(WRITE_COLUMNS.map((column) => COLUMNS[column]));
  });
});
