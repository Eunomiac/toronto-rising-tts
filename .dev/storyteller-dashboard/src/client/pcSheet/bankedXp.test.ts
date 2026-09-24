import { describe, expect, it } from "vitest";
import { bankedXpFromLog } from "./bankedXp.js";

describe("bankedXpFromLog", () => {
  it("uses newTotal from the highest session key", () => {
    expect(bankedXpFromLog({
      "-5": { newTotal: 3 },
      "0": { newTotal: 10 },
      "1": { newTotal: 12 }
    })).toBe(12);
  });

  it("accepts a legacy scalar", () => {
    expect(bankedXpFromLog(7)).toBe(7);
  });

  it("returns 0 for empty or invalid input", () => {
    expect(bankedXpFromLog({})).toBe(0);
    expect(bankedXpFromLog(null)).toBe(0);
  });
});
