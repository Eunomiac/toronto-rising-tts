import { describe, expect, it } from "vitest";
import { dragHelpTitle, helpBulletsFor } from "./helpLegend";
import { DRAG_KINDS } from "./types";

describe("helpLegend", () => {
  it("titles every drag kind", () => {
    for (const drag of DRAG_KINDS) {
      expect(dragHelpTitle(drag).length).toBeGreaterThan(0);
    }
  });

  it("lists non-obvious drops for seated PC (skips panel bins already labeled on screen)", () => {
    const bullets = helpBulletsFor("pcSeated");
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.some((b) => b.drop === "out")).toBe(true);
    expect(bullets.every((b) => b.drop !== "panelA" && b.drop !== "panelB" && b.drop !== "panelC")).toBe(true);
    expect(bullets.every((b) => b.text.length > 0 && b.dropLabel.length > 0)).toBe(true);
  });

  it("skips impossible-only drags without crashing", () => {
    for (const drag of DRAG_KINDS) {
      expect(() => helpBulletsFor(drag)).not.toThrow();
    }
  });
});
