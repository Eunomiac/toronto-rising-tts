import { describe, expect, it } from "vitest";
import {
  applyMemoriamFields,
  inheritedNamedBlock,
  layoutMemoriamRoster,
  memoriamGenericLabel,
  memoriamOverrideAgainstSheet,
  parseMemoriamLocations,
  parseMemoriamPeriods,
  parseMemoriamYears,
  type MemoriamNpcView,
  type MemoriamSheetNpc
} from "./memoriamNpc";

const sheet = (partial: Partial<MemoriamSheetNpc> & Pick<MemoriamSheetNpc, "key">): MemoriamSheetNpc => ({
  filename: `npc_${partial.key}.webp`,
  label: partial.label ?? partial.key,
  location: partial.location ?? "",
  year: partial.year ?? "Modern",
  variantOfUnique: partial.variantOfUnique ?? "",
  isGeneric: partial.isGeneric ?? false,
  tags: partial.tags ?? "",
  periods: partial.periods ?? ["aishe2"],
  ...partial
});

const view = (npc: MemoriamSheetNpc): MemoriamNpcView => applyMemoriamFields(npc, undefined);

describe("Memoriam lists", () => {
  it("splits locations and years, and trims a double space", () => {
    expect(parseMemoriamLocations("New Orleans, Western")).toEqual(["New Orleans", "Western"]);
    expect(parseMemoriamYears("Modern, 1900s, 1800s,  1700s")).toEqual(["Modern", "1900s", "1800s", "1700s"]);
    expect(parseMemoriamLocations("")).toEqual([]);
  });

  it("rejects Present, an empty piece, and an unknown period", () => {
    expect(parseMemoriamYears("Present")).toMatch(/Modern/);
    expect(parseMemoriamLocations("Toronto,,Western")).toMatch(/empty entry/);
    expect(parseMemoriamPeriods("aishe2, no-such", new Set(["aishe2"]))).toMatch(/no-such/);
  });

  it("keeps a dashboard year when it differs from the sheet and drops it when it matches", () => {
    const npc = sheet({ key: "mem_a", year: "1800s", location: "Toronto", periods: ["aishe2"] });
    const edited = applyMemoriamFields(npc, { years: ["1900s"] });
    expect(edited.years).toEqual(["1900s"]);
    expect(edited.sheetYears).toEqual(["1800s"]);
    expect(memoriamOverrideAgainstSheet(
      { locations: ["Toronto"], years: ["1800s"], periods: ["aishe2"] },
      { locations: ["Toronto"], years: ["1800s"], periods: ["aishe2"] }
    )).toEqual({});
    expect(memoriamOverrideAgainstSheet(
      { locations: ["Ottoman"], years: ["1800s"], periods: ["aishe2"] },
      { locations: ["Toronto"], years: ["1800s"], periods: ["aishe2"] }
    )).toEqual({ locations: ["Ottoman"] });
  });
});

describe("Memoriam roster layout", () => {
  const servant = view(sheet({
    key: "mem_alamutHouseStaff_01",
    label: "Servant",
    year: "1800s",
    location: "Ottoman",
    isGeneric: true,
    periods: ["aishe2"]
  }));
  const servantTwin = view(sheet({
    key: "mem_alamutHouseStaff_02",
    label: "Servant",
    year: "1800s",
    location: "Ottoman",
    isGeneric: true,
    periods: ["aishe2"]
  }));
  const servant1800 = view(sheet({
    key: "mem_alamutHouseStaff1800_01",
    label: "Servant",
    year: "1800s",
    location: "Toronto",
    isGeneric: true,
    periods: ["fomorach8"]
  }));
  const adrian = view(sheet({
    key: "mem_adrian",
    label: "Adrian",
    year: "Modern, 1900s",
    location: "Toronto",
    periods: ["aishe2"]
  }));
  const bertrice = view(sheet({
    key: "mem_bertrice1800",
    label: "Bertrice",
    year: "1800s",
    location: "New Orleans, Western",
    variantOfUnique: "bertrice",
    periods: ["fomorach8"]
  }));
  const npcs = [servant, servantTwin, servant1800, adrian, bertrice];
  const layout = (periodKey?: string, year: "Modern" | "1900s" | "1800s" | "1700s" | null = null, location: string | null = null) =>
    layoutMemoriamRoster(npcs, { periodKey, year, location, spawnedGenerics: new Set(), names: {} });

  it("surfaces the open period, uniques loose and generics by stem", () => {
    const result = layout("aishe2");
    expect(result.surfacedUniques.map((member) => member.characterKey)).toEqual(["mem_adrian"]);
    expect(result.surfacedGenerics.map((group) => group.label)).toEqual(["Servant"]);
    expect(result.surfacedGenerics[0]?.members.map((member) => member.characterKey)).toEqual([
      "mem_alamutHouseStaff_01",
      "mem_alamutHouseStaff_02"
    ]);
    expect(result.remainingUniques.map((group) => group.label)).toEqual(["Memoriam 1800s"]);
    expect(result.remainingGenerics.map((group) => [group.key, group.label])).toEqual([
      ["memoriam:mem_alamutHouseStaff1800", "1800s Servant"]
    ]);
  });

  it("filters the remaining list by year and location together", () => {
    const result = layout(undefined, "1800s", "Western");
    expect(result.remainingUniques.flatMap((group) => group.members.map((member) => member.characterKey))).toEqual(["mem_bertrice1800"]);
    expect(result.remainingGenerics).toEqual([]);
    expect(result.locations).toEqual(["New Orleans", "Ottoman", "Toronto", "Western"]);
  });

  it("shows a multi-year NPC only in the selected year group", () => {
    const result = layout(undefined, "Modern", null);
    expect(result.remainingUniques.map((group) => group.label)).toEqual(["Memoriam Present"]);
    expect(result.remainingUniques[0]?.members.map((member) => member.characterKey)).toEqual(["mem_adrian"]);
  });

  it("puts a Modern generic's year in front only when another year is listed", () => {
    expect(memoriamGenericLabel("Servant", ["Modern"], true)).toBe("Servant");
    expect(memoriamGenericLabel("Servant", ["Modern", "1900s"], true)).toBe("1900s Servant");
    expect(memoriamGenericLabel("Servant", ["1800s"], false)).toBe("Servant");
  });
});

describe("variant stat fallback", () => {
  it("uses the linked NPC's block when this one has none", () => {
    const blocks = new Map<string, string>([["bertrice", "hers"], ["mem_bertrice", "closer"]]);
    const variantOf = (key: string): string => (key === "mem_bertrice1800" ? "mem_bertrice" : key === "mem_bertrice" ? "bertrice" : "");
    expect(inheritedNamedBlock((key) => blocks.get(key), variantOf, "mem_bertrice1800")).toBe("closer");
    blocks.delete("mem_bertrice");
    expect(inheritedNamedBlock((key) => blocks.get(key), variantOf, "mem_bertrice1800")).toBe("hers");
    expect(inheritedNamedBlock((key) => blocks.get(key), variantOf, "mem_bertrice")).toBe("hers");
  });
});
