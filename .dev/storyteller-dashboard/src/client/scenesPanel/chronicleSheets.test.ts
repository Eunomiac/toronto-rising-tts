import { describe, expect, it } from "vitest";
import { netModifiers } from "./huntOdds";

/**
 * Mirror of chronicleSheets resonance parsing for GEDiningHall-style bare Plus cells.
 * Kept local so the test does not need to export private helpers.
 */
const parseResonanceCell = (cell: string | undefined, defaultUp: boolean): { type: string; up: boolean }[] => {
  const match = /^(\w+)\s*([+-])?\s*$/.exec((cell ?? "").trim());
  if (!match?.[1]) {
    return [];
  }
  const sign = match[2];
  return [{ type: match[1].toLowerCase(), up: sign === undefined ? defaultUp : sign === "+" }];
};

const resonances = (plus: string | undefined, minus: string | undefined) => [
  ...parseResonanceCell(plus, true),
  ...parseResonanceCell(minus, false)
];

describe("site resonance cells", () => {
  it("treats a bare type in Resonance Plus as up (GEDiningHall ischemic)", () => {
    const list = resonances("ischemic", "");
    expect(list).toEqual([{ type: "ischemic", up: true }]);
    expect(netModifiers(list).modifiers.ischemic).toBe(1);
  });

  it("still honours explicit signs and the Minus column", () => {
    expect(resonances("sanguine +", "melancholic")).toEqual([
      { type: "sanguine", up: true },
      { type: "melancholic", up: false }
    ]);
  });
});
