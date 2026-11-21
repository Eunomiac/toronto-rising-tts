import { describe, expect, it } from "vitest";
import { colorsAwarded } from "./xpAwardPanel";

describe("colorsAwarded", () => {
  it("lights a seat from the latest Experience Log line or from a click this visit", () => {
    const seats = [
      { color: "Pink" as const, lastXpEntry: { kind: "gain" as const, amount: 1, description: "Provided Feedback" } },
      { color: "Red" as const, lastXpEntry: { kind: "gain" as const, amount: 1, description: "Session attendance" } }
    ];
    expect([...colorsAwarded(seats, "Provided Feedback", new Set())]).toEqual(["Pink"]);
    expect([...colorsAwarded(seats, "Promoted Team Play", new Set(["Promoted Team Play|Orange"]))]).toEqual(["Orange"]);
  });
});
