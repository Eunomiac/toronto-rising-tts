import { describe, expect, it } from "vitest";
import { applyLocal } from "./applyLocal.js";
import { fixtureSnapshot } from "./fixture.js";

describe("applyLocal", () => {
  it("raises hunger on the selected seat only", () => {
    const next = applyLocal(fixtureSnapshot(), { op: "hunger", color: "Pink", delta: 1 });
    const pink = next.seats.find((seat) => seat.color === "Pink");
    const brown = next.seats.find((seat) => seat.color === "Brown");
    expect(pink?.hunger).toBe(2);
    expect(brown?.hunger).toBe(1);
  });

  it("fills aggravated health from the left", () => {
    const next = applyLocal(fixtureSnapshot(), {
      op: "damage",
      color: "Pink",
      which: "health",
      superficialDelta: 0,
      aggravatedDelta: 1
    });
    expect(next.seats.find((seat) => seat.color === "Pink")?.health.aggravated).toBe(1);
  });
});
