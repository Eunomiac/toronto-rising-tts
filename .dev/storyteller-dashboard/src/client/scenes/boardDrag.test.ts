import { describe, expect, it } from "vitest";
import { pointInRect } from "./boardDrag";

describe("pointInRect", () => {
  const box = { left: 100, right: 200, top: 50, bottom: 150 };

  it("accepts a point inside the box", () => {
    expect(pointInRect(box, 150, 100)).toBe(true);
  });

  it("rejects a point to the left or right", () => {
    expect(pointInRect(box, 99, 100)).toBe(false);
    expect(pointInRect(box, 201, 100)).toBe(false);
  });
});
