import { describe, expect, it } from "vitest";
import { masonryLayout } from "./masonryLayout.js";

describe("masonryLayout", () => {
  it("uses one column per box when there are fewer boxes than columns", () => {
    const layout = masonryLayout([[80, 50, 40]], 3, 2);
    expect(layout.columns).toBe(1);
    expect(layout.placements).toEqual([{ col: 0, span: 1, top: 0, height: 80 }]);
  });

  it("widens a column's bottom box into a neighbour that ends above it", () => {
    const layout = masonryLayout([
      [100, 60, 40],
      [90, 55, 35],
      [40, 25, 20],
      [50, 30, 25],
      [30, 20, 15]
    ], 3, 0);
    // Columns: [0] | [1, 4] | [3, 2]. Box 4 starts at 90, where column 2 has just ended.
    expect(layout.placements[4]).toEqual({ col: 1, span: 2, top: 90, height: 20 });
    expect(layout.height).toBe(110);
    expect(layout.placements[0]).toEqual({ col: 0, span: 1, top: 0, height: 110 });
    expect(layout.placements[2]).toEqual({ col: 2, span: 1, top: 50, height: 40 });
  });

  it("stretches boxes to close gaps when nothing can widen", () => {
    const layout = masonryLayout([[100, 60], [60, 40]], 2, 2);
    expect(layout.placements).toEqual([
      { col: 0, span: 1, top: 0, height: 100 },
      { col: 1, span: 1, top: 0, height: 100 }
    ]);
  });
});
