import { describe, expect, it } from "vitest";
import { packTwoColumns, parseRelationshipRows, relationshipSections } from "./relationships.js";

const row = (key: string, pcLinks: Record<string, string>, extra: Record<string, unknown> = {}) => ({
  key,
  entry: { pcLinks, headerLeft: key, body: ["line"], ...extra }
});

describe("parseRelationshipRows", () => {
  it("keeps rows with a key and an entry, defaulting missing text fields", () => {
    const rows = parseRelationshipRows([row("drake", { fomorach: "sire" }), { key: 3 }, "junk"]);
    expect(rows).toEqual([{
      key: "drake",
      entry: { pcLinks: { fomorach: "sire" }, portrait: "", headerLeft: "drake", headerRight: "", subheaderLeft: "", subheaderRight: "", body: ["line"] }
    }]);
  });

  it("treats Lua's empty-table [] as no rows", () => {
    expect(parseRelationshipRows([])).toEqual([]);
    expect(parseRelationshipRows({})).toEqual([]);
  });
});

describe("relationshipSections", () => {
  it("groups by this PC's link type, thralls before regnants, unknown types in others", () => {
    const rows = parseRelationshipRows([
      row("regnantA", { fomorach: "regnant" }, { bondStrength: 2 }),
      row("thrallB", { fomorach: "thrall" }, { bondStrength: 6 }),
      row("enzo", { fomorach: "touchstone" }),
      row("kiera", { fomorach: "enemy", aishe: "touchstone" }),
      row("mara", { fomorach: "childe" }),
      row("notMine", { aishe: "sire" })
    ]);
    const sections = relationshipSections(rows, "fomorach");
    expect(sections.touchstones.map((r) => r.key)).toEqual(["enzo"]);
    expect(sections.sires).toEqual([]);
    expect(sections.childer.map((r) => r.key)).toEqual(["mara"]);
    expect(sections.bloodBonds.map((r) => r.key)).toEqual(["thrallB", "regnantA"]);
    expect(sections.others.map((r) => r.key)).toEqual(["kiera"]);
    expect(relationshipSections(rows, "aishe").touchstones.map((r) => r.key)).toEqual(["kiera"]);
  });
});

describe("packTwoColumns", () => {
  it("places the heaviest entries first into the lighter column", () => {
    const rows = parseRelationshipRows([
      row("light", { a: "childe" }, { body: [] }),
      row("heavy", { a: "childe" }, { body: ["1", "2", "3", "4"] }),
      row("mid", { a: "childe" }, { body: ["1", "2"] })
    ]);
    const [left, right] = packTwoColumns(rows);
    expect(left.map((r) => r.key)).toEqual(["heavy"]);
    expect(right.map((r) => r.key)).toEqual(["mid", "light"]);
  });
});
