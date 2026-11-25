import { describe, expect, it } from "vitest";
import { reorderCategories } from "./roster";

describe("reorderCategories", () => {
  const categories = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves a category onto the one it was dropped on", () => {
    expect(reorderCategories(categories, "a", "c").map((category) => category.id)).toEqual(["b", "c", "a"]);
    expect(reorderCategories(categories, "c", "a").map((category) => category.id)).toEqual(["c", "a", "b"]);
  });

  it("leaves the list alone when the drop is the same category or unknown", () => {
    expect(reorderCategories(categories, "b", "b")).toBe(categories);
    expect(reorderCategories(categories, "missing", "a")).toBe(categories);
  });
});
