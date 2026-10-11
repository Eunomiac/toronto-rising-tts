import { describe, expect, it } from "vitest";
import { buildSubject, DEFAULT_RING_COLOR, fingerprint, humanizeKey, renderLuaModule, wrapName, type NameSources, type Roster } from "./model.ts";

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
    const { subject, uncatalogued } = buildSubject("Catalogued", "rosie", sources, roster, {});
    expect(subject).toMatchObject({ name: "Rosie", color: "#e91616", manualCrop: null });
    expect(uncatalogued).toBe(false);
  });

  it("skips a leading title and prefers a group's own colour", () => {
    expect(buildSubject("Catalogued", "theAristocrat", sources, roster, {}).subject).toMatchObject({ name: "Aristocrat", color: "#abcdef" });
  });

  it("uses the default ring colour when the NPC has no coloured group", () => {
    expect(buildSubject("Catalogued", "loner", sources, roster, {}).subject.color).toBe(DEFAULT_RING_COLOR);
  });

  it("shows a generic NPC's catalog label and colours it from its generic roster group", () => {
    expect(buildSubject("Generic", "streetThug_01", sources, roster, {}).subject).toMatchObject({ name: "Street Thug", color: "#123456" });
  });

  it("names a Memoriam NPC by its first non-title word", () => {
    expect(buildSubject("Memoriam", "mem_princeDoran", sources, roster, {}).subject.name).toBe("Doran");
  });

  it("flags figurines missing from every catalog and names them from the file key", () => {
    const report = buildSubject("Catalogued", "ladyAvelineDubois", sources, roster, {});
    expect(report.uncatalogued).toBe(true);
    expect(report.subject.name).toBe("Aveline");
  });

  it("carries a hand-set crop", () => {
    const crop = { cx: 0.5, cy: 0.1, size: 0.2 };
    expect(buildSubject("Catalogued", "rosie", sources, roster, { rosie: crop }).subject.manualCrop).toEqual(crop);
  });

  it("rejects a roster colour that is not hex", () => {
    const bad: Roster = { ...roster, groupColors: { redFlag: "red" } };
    expect(() => buildSubject("Catalogued", "rosie", sources, bad, {})).toThrow(/not a #rrggbb/);
  });
});

describe("humanizeKey", () => {
  it("splits camel case and drops the Memoriam prefix and generic suffix", () => {
    expect(humanizeKey("mem_jeanDucheskiIPreDeath")).toBe("Jean Ducheski I Pre Death");
    expect(humanizeKey("streetThug_04")).toBe("Street Thug");
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
        ["amy", { figurineFront: "Generic/amy.webp?v=4", tokenFront: "Tokens/amy.front.webp?v=5", tokenBack: "Tokens/amy.back.webp?v=5" }]
      ]),
      "test"
    );
    expect(lua).toContain('local FIGURINE_BACK = BASE .. "Shared/figurineBack.webp?v=1"');
    expect(lua.indexOf("  amy = {")).toBeLessThan(lua.indexOf("  zed = {"));
    expect(lua).toContain('figurine = { front = BASE .. "Generic/amy.webp?v=4", back = FIGURINE_BACK },');
    expect(lua).toContain('token = { front = BASE .. "Tokens/zed.front.webp?v=3", back = BASE .. "Tokens/zed.back.webp?v=3" },');
  });
});
