import { describe, expect, it } from "vitest";
import { deepMerge } from "./deepMerge.js";

describe("deepMerge", () => {
  it("replaces arrays instead of concatenating", () => {
    expect(deepMerge(
      { titles: ["Primogen"], convictions: ["Keep Everyone Guessing"] },
      { titles: ["Seneschal"], convictions: ["Keep Everyone Guessing", "Keep Every Door Open"] }
    )).toEqual({
      titles: ["Seneschal"],
      convictions: ["Keep Everyone Guessing", "Keep Every Door Open"]
    });
  });

  it("deep-merges nested objects", () => {
    expect(deepMerge(
      {
        attributes: {
          charisma: { base: 3, temp: 0, disabled: 0 }
        }
      },
      {
        attributes: {
          charisma: { base: 4 }
        }
      }
    )).toEqual({
      attributes: {
        charisma: { base: 4, temp: 0, disabled: 0 }
      }
    });
  });

  it("replaces scalars and keeps untouched siblings", () => {
    expect(deepMerge(
      { desire: "old", ambition: "keep", xp: 2 },
      { desire: "new", xp: 5 }
    )).toEqual({ desire: "new", ambition: "keep", xp: 5 });
  });

  it("deletes keys set to null (including nested)", () => {
    expect(deepMerge(
      { desire: "hunt", ambition: "keep", xp: { "0": { newTotal: 1 }, "-5": { newTotal: 3 } } },
      { desire: null, xp: { "-5": null } }
    )).toEqual({
      ambition: "keep",
      xp: { "0": { newTotal: 1 } }
    });
  });
});
