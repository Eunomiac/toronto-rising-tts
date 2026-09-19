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
      mode: "addAgg"
    });
    expect(next.seats.find((seat) => seat.color === "Pink")?.health.aggravated).toBe(1);
  });

  it("converts leftmost superficial to aggravated when a full tracker takes more damage", () => {
    const filled = applyLocal(fixtureSnapshot(), {
      op: "damage",
      color: "Pink",
      which: "health",
      mode: "addSuper"
    });
    const withFourSuper = [0, 1, 2, 3].reduce(
      (snapshot) => applyLocal(snapshot, { op: "damage", color: "Pink", which: "health", mode: "addSuper" }),
      filled
    );
    const pink = withFourSuper.seats.find((seat) => seat.color === "Pink");
    expect(pink?.health.superficial).toBe(5);
    expect(pink?.health.aggravated).toBe(0);
    const overflow = applyLocal(withFourSuper, { op: "damage", color: "Pink", which: "health", mode: "addSuper" });
    const after = overflow.seats.find((seat) => seat.color === "Pink");
    expect(after?.health.superficial).toBe(4);
    expect(after?.health.aggravated).toBe(1);
  });

  it("does not add a hidden stain while already impaired", () => {
    let snapshot = fixtureSnapshot();
    for (let i = 0; i < 4; i += 1) {
      snapshot = applyLocal(snapshot, { op: "humanity", color: "Pink", kind: "stain", delta: 1 });
    }
    const impaired = snapshot.seats.find((seat) => seat.color === "Pink");
    expect(impaired?.humanity.stains).toBe(4);
    const extra = applyLocal(snapshot, { op: "humanity", color: "Pink", kind: "stain", delta: 1 });
    expect(extra.seats.find((seat) => seat.color === "Pink")?.humanity.stains).toBe(4);
    const minus = applyLocal(extra, { op: "humanity", color: "Pink", kind: "stain", delta: -1 });
    expect(minus.seats.find((seat) => seat.color === "Pink")?.humanity.stains).toBe(3);
  });

  it("clamps badges between -5 and +5", () => {
    const next = applyLocal(fixtureSnapshot(), { op: "badgeDelta", color: "Pink", key: "etiquette", delta: 4 });
    expect(next.seats.find((seat) => seat.color === "Pink")?.badges.etiquette).toBe(5);
  });

  it("mends up to the current mending value", () => {
    let snapshot = fixtureSnapshot();
    for (let i = 0; i < 4; i += 1) {
      snapshot = applyLocal(snapshot, { op: "damage", color: "Pink", which: "health", mode: "addSuper" });
    }
    const mended = applyLocal(snapshot, { op: "damage", color: "Pink", which: "health", mode: "mend" });
    expect(mended.seats.find((seat) => seat.color === "Pink")?.health.superficial).toBe(2);
  });
});
