import { describe, expect, it } from "vitest";
import { tokenStackZIndex } from "./tokenStack";

describe("tokenStackZIndex", () => {
  it("puts tokens closer to the bottom of the board in front", () => {
    expect(tokenStackZIndex(0)).toBeGreaterThan(tokenStackZIndex(1));
    expect(tokenStackZIndex(0.12)).toBeGreaterThan(tokenStackZIndex(0.5));
    expect(tokenStackZIndex(0.5)).toBeGreaterThan(tokenStackZIndex(0.8));
  });
});
