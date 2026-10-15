import { describe, expect, it } from "vitest";
import {
  buildSubject,
  DEFAULT_RING_COLOR,
  fingerprint,
  renderLuaModule,
  renderOverridesLuaModule,
  wrapName,
  type NameSources,
  type Roster
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
      "https://cloud.test/back/",
      new Map([
        ["zed", { figurineFront: "https://cloud.test/zed/", tokenFront: "https://cloud.test/zedF/", tokenBack: "https://cloud.test/zedB/" }],
        ["amy", { figurineFront: "https://cloud.test/amy/", tokenFront: "https://cloud.test/amyF/", tokenBack: "https://cloud.test/amyB/", genericLabel: "Street \"Amy\"" }]
      ]),
      "test"
    );
    expect(lua).toContain('local FIGURINE_BACK = "https://cloud.test/back/"');
    expect(lua.indexOf("  amy = {")).toBeLessThan(lua.indexOf("  zed = {"));
    expect(lua).toContain('figurine = { front = "https://cloud.test/amy/", back = FIGURINE_BACK },');
    expect(lua).toContain('token = { front = "https://cloud.test/zedF/", back = "https://cloud.test/zedB/" },');
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
