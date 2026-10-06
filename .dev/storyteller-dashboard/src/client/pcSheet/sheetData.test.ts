import { describe, expect, it } from "vitest";
import {
  advantageTitle,
  canAddRitual,
  formatSourceLine,
  packColumns,
  parseAdvantages,
  parseDisciplines,
  parseXpLog,
  powersByLevel,
  ritualLayout,
  ritualsOf,
  statusDotSlots,
  traitDotSlots,
  unownedDisciplines,
  type AdvantageEntry
} from "./sheetData.js";

const advantage = (partial: Partial<AdvantageEntry>): AdvantageEntry => ({
  category: "merits",
  index: 1,
  name: "Test",
  focus: "",
  base: 0,
  temp: 0,
  disabled: 0,
  description: [],
  rules: [],
  sheetDisplay: true,
  ...partial
});

const images = (slots: readonly { active: boolean; image?: string }[]): string[] =>
  slots.map((slot) => (slot.active ? slot.image ?? "?" : "blank"));

describe("advantage dots", () => {
  it("paints title-bar dots base then temp from the left, blanks on the right", () => {
    expect(images(traitDotSlots(advantage({ base: 2, temp: 2, max: 6 }), 0))).toEqual([
      "dot_yellow", "dot_yellow", "dot_white", "dot_white", "blank", "blank"
    ]);
  });

  it("lets disabled then staked dots replace the rightmost filled dots (temp first)", () => {
    expect(images(traitDotSlots(advantage({ base: 2, temp: 2, disabled: 1, max: 6 }), 1))).toEqual([
      "dot_yellow", "dot_yellow", "dot_project", "dot_grey_red_x", "blank", "blank"
    ]);
  });

  it("uses red for flaws and base as the slot count when max is missing", () => {
    expect(images(traitDotSlots(advantage({ category: "flaws", base: 2 }), 0))).toEqual(["dot_red", "dot_red"]);
  });

  it("paints the Status strip left to right with filled slots only", () => {
    const status = advantage({ category: "backgrounds", name: "Status", base: 2, temp: 1, disabled: 1, sheetDisplay: false });
    expect(images(statusDotSlots(status, 0))).toEqual(["dot_yellow", "dot_yellow", "dot_grey_red_x"]);
  });
});

describe("packColumns", () => {
  it("drops each item, heaviest first, into the lightest column", () => {
    const columns = packColumns([5, 30, 12, 10, 3], (n) => n);
    expect(columns).toEqual([[30], [12, 3], [10, 5]]);
  });
});

const playerData = {
  stats: {
    disciplines: {
      oblivion: {
        base: 3,
        temp: 0,
        powers: [{ name: "Shadow Cloak", level: 1 }],
        ceremonies: { "1": { name: "Summon Spirit", level: 1, notes: "" } }
      },
      auspex: {
        base: 3,
        temp: 1,
        powers: [
          { name: "Sense the Unseen", level: 1 },
          { name: "Doomsaying", level: 3, notes: "Amalgam: Dominate 3" },
          { name: "Heightened Senses", level: 1 }
        ]
      }
    },
    merits: [
      { name: "Bloodhound", focus: "", base: 1, temp: 0, description: ["Smell"], rules: "One rule", source: { book: "VTM", page: 182 } },
      { blank: true, name: "hidden" }
    ],
    backgrounds: [{ name: "Status", focus: "Camarilla", base: 4, max: 5, sheetDisplay: false }]
  },
  xp: {
    "0": { sessionDisplay: "Character Creation", prevTotal: 0, gainTotal: 35, spendTotal: 20, newTotal: 15, gains: [{ amount: 35, description: "Rollover" }], spends: [] },
    "-1": { prevTotal: 15, newTotal: 15, gains: [], spends: [] },
    "2": { prevTotal: 15, gainTotal: 3, spendTotal: 0, newTotal: 18, gains: [{ amount: 3, description: "Attendance" }], spends: [] }
  }
};

describe("parseDisciplines", () => {
  it("returns owned disciplines in chronicle order with 1-based row indices", () => {
    const rows = parseDisciplines(playerData);
    expect(rows.map((row) => row.key)).toEqual(["auspex", "oblivion"]);
    expect(rows[0]?.powers[1]).toEqual({ index: 2, name: "Doomsaying", level: 3, notes: "Amalgam: Dominate 3" });
    expect(ritualsOf(rows, "ceremonies")[0]?.name).toBe("Summon Spirit");
    expect(unownedDisciplines(rows)).not.toContain("auspex");
  });

  it("groups powers by level with names sorted", () => {
    const rows = parseDisciplines(playerData);
    const groups = powersByLevel(rows[0]?.powers ?? []);
    expect(groups.map((g) => g.level)).toEqual([1, 3]);
    expect(groups[0]?.powers.map((p) => p.name)).toEqual(["Heightened Senses", "Sense the Unseen"]);
  });
});

describe("ritual capacity and layout", () => {
  it("allows 10 of one kind, or 5 + 5 of both", () => {
    expect(canAddRitual("rituals", 9, 0)).toBe(true);
    expect(canAddRitual("rituals", 10, 0)).toBe(false);
    expect(canAddRitual("ceremonies", 6, 0)).toBe(false);
    expect(canAddRitual("ceremonies", 5, 4)).toBe(true);
  });

  it("spills a single kind into the right column", () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({ index: i + 1, name: `R${i + 1}`, level: 1, notes: "" }));
    const layout = ritualLayout(entries, []);
    expect(layout?.divider).toBe("divider_rituals");
    expect(layout?.right[1]?.entry.name).toBe("R7");
    expect(layout?.right[2]).toBeNull();
    expect(ritualLayout([], [])).toBeNull();
  });
});

describe("parseAdvantages", () => {
  it("skips blank entries and coerces string rules into lines", () => {
    const merits = parseAdvantages(playerData, "merits");
    expect(merits).toHaveLength(1);
    expect(merits[0]?.rules).toEqual(["One rule"]);
    expect(formatSourceLine(merits[0]?.source)).toBe("VTM, p.182");
    const bg = parseAdvantages(playerData, "backgrounds")[0];
    expect(bg?.sheetDisplay).toBe(false);
    expect(bg ? advantageTitle(bg) : "").toBe("STATUS: CAMARILLA");
  });
});

describe("parseXpLog", () => {
  it("sorts sessions newest first, including negative keys", () => {
    expect(parseXpLog(playerData).map((s) => s.key)).toEqual(["2", "0", "-1"]);
  });
});
