import { describe, expect, it } from "vitest";
import { flavorOdds, intensityOdds, locationOdds, netModifiers } from "./huntOdds";

/** The verification case from `.dev/Storyteller Dashboard Docs/Hunting & Resonance.md`. */
const { modifiers } = netModifiers([
  { type: "ischemic", up: true },
  { type: "sanguine", up: false },
  { type: "melancholic", up: false }
]);

const pct = (value: number): number => Math.round(value * 1_000_000) / 10_000;

describe("hunt odds", () => {
  it("weights the location", () => {
    expect(pct(locationOdds(modifiers).ischemic)).toBe(48.951);
    expect(pct(locationOdds(netModifiers([{ type: "sanguine", up: false }]).modifiers).sanguine)).toBe(13.2948);
    expect(pct(locationOdds(netModifiers([{ type: "sanguine", up: false }, { type: "sanguine", up: false }]).modifiers).sanguine)).toBe(0.6623);
  });

  it.each([
    ["basic", 89.751, [26.8805, 32.6412, 29.7481, 10.7303]],
    ["critical", 95, [15.5814, 29.5255, 37.7371, 17.156]],
    ["messy", 34.8755, [2.928, 15.9345, 45.4076, 35.7298]]
  ] as const)("matches the %s verification row at margin +3", (outcome, ischemic, intensity) => {
    expect(pct(flavorOdds({ modifiers, target: "ischemic", margin: 3, outcome }).ischemic)).toBe(ischemic);
    const odds = intensityOdds(3, outcome);
    expect([odds.none, odds.fleeting, odds.intense, odds.acute].map(pct)).toEqual(intensity);
  });

  it("sums every flavor distribution to 1 and keeps unsupported rare flavors at 0", () => {
    for (const outcome of ["basic", "critical", "messy"] as const) {
      const odds = flavorOdds({ modifiers, target: "sanguine", margin: 2, outcome });
      expect(Object.values(odds).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
      expect(odds.primal).toBe(0);
      expect(odds.mercurial).toBe(0);
    }
  });
});
