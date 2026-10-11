import { describe, expect, it } from "vitest";
import {
  buildSubject,
  DEFAULT_RING_COLOR,
  fingerprint,
  planFigurineAssets,
  renderLuaModule,
  renderOverridesLuaModule,
  wrapName,
  type NameSources,
  type Roster,
  type UiAssetRow
} from "./model.ts";

const roster: Roster = {
  categories: [
    { id: "cat-anarch", color: "#E91616" },
    { id: "cat-generic", color: "#123456" }
  ],
  assigned: { redFlag: "cat-anarch", "generic:Street Thug": "cat-generic" },
  groupColors: { harpies: "#abcdef" }
};

const sources: NameSources = {
  named: new Map([
    ["rosie", { characterKey: "rosie", fullName: "Rosie Delgado", pickerGroups: ["redFlag", "harpies"] }],
    ["theAristocrat", { characterKey: "theAristocrat", fullName: "The Aristocrat", pickerGroups: ["harpies"] }],
    ["loner", { characterKey: "loner", fullName: "Lone Wolf", pickerGroups: [] }]
  ]),
  genericLabels: new Map([["streetThug_01", "Street Thug"]]),
  memoriamNames: new Map([["mem_princeDoran", "Prince Doran"]])
};

describe("buildSubject", () => {
  it("names a named NPC by its first word and colours it from its first picker group's category", () => {
    expect(buildSubject("Catalogued", "rosie", sources, roster, {})).toMatchObject({ name: "Rosie", color: "#e91616", manualCrop: null });
  });

  it("skips a leading title and prefers a group's own colour", () => {
    expect(buildSubject("Catalogued", "theAristocrat", sources, roster, {})).toMatchObject({ name: "Aristocrat", color: "#abcdef" });
  });

  it("uses the default ring colour when the NPC has no coloured group", () => {
    expect(buildSubject("Catalogued", "loner", sources, roster, {})?.color).toBe(DEFAULT_RING_COLOR);
  });

  it("shows a generic NPC's catalog label and colours it from its generic roster group", () => {
    expect(buildSubject("Generic", "streetThug_01", sources, roster, {})).toMatchObject({ name: "Street Thug", color: "#123456" });
  });

  it("names a Memoriam NPC by its first non-title word", () => {
    expect(buildSubject("Memoriam", "mem_princeDoran", sources, roster, {})?.name).toBe("Doran");
  });

  it("gives no art to a figurine missing from its folder's catalog", () => {
    expect(buildSubject("Catalogued", "ladyAvelineDubois", sources, roster, {})).toBeNull();
    expect(buildSubject("Generic", "rosie", sources, roster, {})).toBeNull();
    expect(buildSubject("Memoriam", "mem_nobody", sources, roster, {})).toBeNull();
  });

  it("carries a hand-set crop", () => {
    const crop = { cx: 0.5, cy: 0.1, size: 0.2 };
    expect(buildSubject("Catalogued", "rosie", sources, roster, { rosie: crop })?.manualCrop).toEqual(crop);
  });

  it("rejects a roster colour that is not hex", () => {
    const bad: Roster = { ...roster, groupColors: { redFlag: "red" } };
    expect(() => buildSubject("Catalogued", "rosie", sources, bad, {})).toThrow(/not a #rrggbb/);
  });

  it("applies an override's name and colour", () => {
    const overrides = { rosie: { name: "Lady Rosa Vance", color: "#00ff00" }, streetThug_01: { name: "Bruiser" } };
    expect(buildSubject("Catalogued", "rosie", sources, roster, {}, overrides)).toMatchObject({ name: "Rosa", color: "#00ff00" });
    expect(buildSubject("Generic", "streetThug_01", sources, roster, {}, overrides)).toMatchObject({ name: "Bruiser", color: "#123456" });
  });
});

describe("planFigurineAssets", () => {
  const base = "https://example.test/NPCs/";
  const row = (Name: string, URL: string): UiAssetRow => ({ Type: 0, Name, URL });

  it("adds missing figurines, updates changed links and leaves other rows in place", () => {
    const plan = planFigurineAssets(
      [row("siteCard_Bar", "https://steam/bar"), row("rosie", "https://steam/rosie"), row("amy", `${base}Catalogued/amy.webp?v=1`)],
      new Map([
        ["rosie", `${base}Catalogued/rosie.webp?v=2`],
        ["amy", `${base}Catalogued/amy.webp?v=1`],
        ["zed", `${base}Memoriam/zed.webp?v=3`]
      ]),
      new Set(["rosie", "amy", "zed"]),
      base
    );
    expect(plan.rows.map((r) => r.Name)).toEqual(["siteCard_Bar", "rosie", "amy", "zed"]);
    expect(plan.rows[1]?.URL).toBe(`${base}Catalogued/rosie.webp?v=2`);
    expect(plan.rows[3]).toEqual({ Type: 0, Name: "zed", URL: `${base}Memoriam/zed.webp?v=3` });
    expect(plan).toMatchObject({ added: ["zed"], updated: ["rosie"], removed: [] });
  });

  it("drops repo-art rows and character rows that are no longer wanted, and duplicates", () => {
    const plan = planFigurineAssets(
      [
        row("gone", `${base}Catalogued/gone.webp?v=1`),
        row("kai", "https://steam/kai"),
        row("rosie", `${base}Catalogued/rosie.webp?v=2`),
        row("rosie", "https://steam/rosie"),
        row("overlay_x", "https://steam/x")
      ],
      new Map([["rosie", `${base}Catalogued/rosie.webp?v=2`]]),
      new Set(["rosie", "kai"]),
      base
    );
    expect(plan.rows.map((r) => r.Name)).toEqual(["rosie", "overlay_x"]);
    expect(plan).toMatchObject({ added: [], updated: [], removed: ["gone", "kai", "rosie"] });
  });
});

describe("wrapName", () => {
  const measure = (text: string): number => text.length * 10;

  it("keeps a name that fits on one line", () => {
    expect(wrapName("Rosie", [100, 100, 100], measure, "…")).toEqual(["Rosie"]);
  });

  it("wraps onto two lines by words", () => {
    expect(wrapName("Wounded Civilian Seated", [100, 160, 100], measure, "…")).toEqual(["Wounded Civilian", "Seated"]);
  });

  it("ends the second line in an ellipsis when the rest does not fit", () => {
    expect(wrapName("Alpha Beta Gamma Delta", [50, 110, 50], measure, "…")).toEqual(["Alpha Beta", "Gamm…"]);
  });

  it("ellipsizes a single word too long for any line", () => {
    expect(wrapName("Extraordinarily", [50, 60, 50], measure, "…")).toEqual(["Extra…"]);
  });
});

describe("fingerprint", () => {
  it("is stable and changes with any input", () => {
    expect(fingerprint("a", "b")).toBe(fingerprint("a", "b"));
    expect(fingerprint("a", "b")).not.toBe(fingerprint("ab"));
    expect(fingerprint("a")).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("renderLuaModule", () => {
  it("writes sorted entries with a shared figurine back", () => {
    const lua = renderLuaModule(
      "https://example.test/NPCs/",
      "Shared/figurineBack.webp?v=1",
      new Map([
        ["zed", { figurineFront: "Catalogued/zed.webp?v=2", tokenFront: "Tokens/zed.front.webp?v=3", tokenBack: "Tokens/zed.back.webp?v=3" }],
        ["amy", { figurineFront: "Generic/amy.webp?v=4", tokenFront: "Tokens/amy.front.webp?v=5", tokenBack: "Tokens/amy.back.webp?v=5", genericLabel: "Street \"Amy\"" }]
      ]),
      "test"
    );
    expect(lua).toContain('local FIGURINE_BACK = BASE .. "Shared/figurineBack.webp?v=1"');
    expect(lua.indexOf("  amy = {")).toBeLessThan(lua.indexOf("  zed = {"));
    expect(lua).toContain('figurine = { front = BASE .. "Generic/amy.webp?v=4", back = FIGURINE_BACK },');
    expect(lua).toContain('token = { front = BASE .. "Tokens/zed.front.webp?v=3", back = BASE .. "Tokens/zed.back.webp?v=3" },');
    expect(lua).toContain('    genericLabel = "Street \\"Amy\\"",');
    expect(lua.match(/genericLabel = /g)).toHaveLength(1);
  });
});

describe("renderOverridesLuaModule", () => {
  it("writes the TTS fields sorted by key and skips colour-only overrides", () => {
    const lua = renderOverridesLuaModule(
      { zed: { cardScale: 60, seatedY: -50.5 }, amy: { name: 'Amy "Ace" Lee' }, colourOnly: { color: "#ffffff" } },
      "test"
    );
    expect(lua.indexOf("  amy = {")).toBeLessThan(lua.indexOf("  zed = {"));
    expect(lua).toContain('  amy = { name = "Amy \\"Ace\\" Lee" },');
    expect(lua).toContain("  zed = { cardScale = 60, seatedY = -50.5 },");
    expect(lua).not.toContain("colourOnly");
  });
});
