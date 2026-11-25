import { describe, expect, it } from "vitest";
import {
  buildSubject,
  DEFAULT_RING_COLOR,
  renderLuaModule,
  renderOverridesLuaModule,
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
    ["loner", { characterKey: "loner", fullName: "Lone Wolf", pickerGroups: [] }],
    ["princeDoran", { characterKey: "princeDoran", fullName: "Prince Doran", pickerGroups: [] }]
  ]),
  genericLabels: new Map([["streetThug_01", "Street Thug"], ["arabiaLearnedMedia_01", "Learned Media"]])
};

describe("buildSubject", () => {
  it("names a named NPC by its first word and colours it from its first picker group's category", () => {
    expect(buildSubject("Named", "rosie", sources, roster, {})).toMatchObject({ name: "Rosie", color: "#e91616", manualCrop: null });
  });

  it("skips a leading title and prefers a group's own colour", () => {
    expect(buildSubject("Named", "theAristocrat", sources, roster, {})).toMatchObject({ name: "Aristocrat", color: "#abcdef" });
  });

  it("uses the default ring colour when the NPC has no coloured group", () => {
    expect(buildSubject("Named", "loner", sources, roster, {})?.color).toBe(DEFAULT_RING_COLOR);
  });

  it("shows a generic NPC's catalog label and colours it from its generic roster group", () => {
    expect(buildSubject("Generic", "streetThug_01", sources, roster, {})).toMatchObject({ name: "Street Thug", color: "#123456" });
  });

  it("names a Memoriam NPC by its first non-title word, and a generic Memoriam NPC by its full label", () => {
    expect(buildSubject("Named", "princeDoran", sources, roster, {})?.name).toBe("Doran");
    expect(buildSubject("Generic", "arabiaLearnedMedia_01", sources, roster, {})?.name).toBe("Learned Media");
  });

  it("gives no art to a figurine missing from its folder's catalog", () => {
    expect(buildSubject("Named", "ladyAvelineDubois", sources, roster, {})).toBeNull();
    expect(buildSubject("Generic", "rosie", sources, roster, {})).toBeNull();
  });

  it("carries a hand-set crop", () => {
    const crop = { cx: 0.5, cy: 0.1, size: 0.2 };
    expect(buildSubject("Named", "rosie", sources, roster, { rosie: crop })?.manualCrop).toEqual(crop);
  });

  it("rejects a roster colour that is not hex", () => {
    const bad: Roster = { ...roster, groupColors: { redFlag: "red" } };
    expect(() => buildSubject("Named", "rosie", sources, bad, {})).toThrow(/not a #rrggbb/);
  });

  it("applies an override's name and colour", () => {
    const overrides = { rosie: { name: "Lady Rosa Vance", color: "#00ff00" }, streetThug_01: { name: "Bruiser" } };
    expect(buildSubject("Named", "rosie", sources, roster, {}, overrides)).toMatchObject({ name: "Rosa", color: "#00ff00" });
    expect(buildSubject("Generic", "streetThug_01", sources, roster, {}, overrides)).toMatchObject({ name: "Bruiser", color: "#123456" });
  });
});

describe("renderLuaModule", () => {
  it("writes sorted entries with a shared figurine back", () => {
    const lua = renderLuaModule(
      "https://cloud.test/back/",
      new Map([
        ["zed", { figurineFront: "https://cloud.test/zed/" }],
        ["amy", { figurineFront: "https://cloud.test/amy/", genericLabel: "Street \"Amy\"" }]
      ]),
      "test"
    );
    expect(lua).toContain('local FIGURINE_BACK = "https://cloud.test/back/"');
    expect(lua.indexOf("  amy = {")).toBeLessThan(lua.indexOf("  zed = {"));
    expect(lua).toContain('figurine = { front = "https://cloud.test/amy/", back = FIGURINE_BACK },');
    expect(lua).not.toContain("token =");
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
