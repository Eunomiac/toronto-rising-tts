import { describe, expect, it } from "vitest";
import { parseStatRecord, type SheetRecord } from "./sheet.ts";
import { planRowWrite, WRITE_HEADERS } from "./sheetWrite.ts";

const row: SheetRecord = {
  Kind: "Mortal", Clan: "", Generation: "~", Rank: "~", "Blood Potency": "~", Humanity: "~",
  Difficulty: "3/2", Health: "5", Willpower: "4", Phy: "4", Soc: "3", Men: "5", Pow: "~",
  "Exceptional Pools": "Investigation:Intelligence+Investigation", Attacks: "Fists=Phy+0:Strength+Brawl",
  Powers: "~", Advantages: "Resources 2", "Ancilla Power(s)": "~", "Elder Power(s)": "~",
  "Methuselah Power(s)": "~", "Special Abilities": "~"
};

describe("Sheet write-back", () => {
  it("serializes the new notation and round-trips it", () => {
    const block = parseStatRecord(row, "detective", true);
    const edited = { ...block, difficultyStrong: 4, exceptional: block.exceptional.map((pool) => ({ ...pool, dice: 8 })),
      advantages: [...(block.advantages ?? []), { id: "extra", name: "Contacts 3" }] };
    const plan = planRowWrite("detective", edited, row);
    expect(plan.problems).toEqual([]);
    expect(plan.cells).toMatchObject({ Difficulty: "4/2", Advantages: "Resources 2|Contacts 3" });
    expect(plan.cells["Exceptional Pools"]).toBeUndefined();
  });

  it("uses only headers permitted by the Apps Script", () => {
    expect(WRITE_HEADERS).toContain("Kind");
    expect(WRITE_HEADERS).toContain("Advantages");
    expect(WRITE_HEADERS).not.toContain("Type");
  });
});
