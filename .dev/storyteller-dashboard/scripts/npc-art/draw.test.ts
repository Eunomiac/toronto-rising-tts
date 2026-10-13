// @vitest-environment node
import opentype from "opentype.js";
import { describe, expect, it } from "vitest";
import { pathData } from "./draw";

const pathOf = (commands: opentype.PathCommand[]): opentype.Path => {
  const path = new opentype.Path();
  path.commands = commands;
  return path;
};

describe("pathData", () => {
  it("keeps a coordinate with a tiny floating-point remainder (opentype.js 2.0 writes NaN there)", () => {
    const d = pathData(pathOf([
      { type: "M", x: 109.00000000000001, y: 300 },
      { type: "Q", x1: 1, y1: 2.005, x: 3, y: 4 },
      { type: "C", x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
      { type: "L", x: 0, y: 0 },
      { type: "Z" }
    ]));
    expect(d).toBe("M109.00 300.00Q1.00 2.00 3.00 4.00C1.00 2.00 3.00 4.00 5.00 6.00L0.00 0.00Z");
  });

  it("throws on a non-finite coordinate", () => {
    expect(() => pathData(pathOf([{ type: "M", x: Number.NaN, y: 0 }]))).toThrow(/non-finite/);
  });
});
