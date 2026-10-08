import { describe, expect, it } from "vitest";
import { withoutScene, withTableScene } from "./deck";

describe("scene deck", () => {
  const deck = [{ key: "elysium", title: "Elysium" }];

  it("adds the table's scene once and keeps the same array when unchanged", () => {
    expect(withTableScene(deck, "elysium", "Elysium")).toBe(deck);
    expect(withTableScene(deck, "docks", "The Docks")).toEqual([...deck, { key: "docks", title: "The Docks" }]);
  });

  it("refreshes a renamed scene in place", () => {
    expect(withTableScene(deck, "elysium", "Elysium — Great Hall")).toEqual([{ key: "elysium", title: "Elysium — Great Hall" }]);
  });

  it("removes an ended scene", () => {
    expect(withoutScene(deck, "elysium")).toEqual([]);
  });
});
