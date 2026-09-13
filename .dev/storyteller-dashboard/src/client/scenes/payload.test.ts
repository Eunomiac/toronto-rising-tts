import { describe, expect, it } from "vitest";
import { sceneKeyFromTitle } from "./payload";

describe("sceneKeyFromTitle", () => {
  it("returns untitledScene for empty titles", () => {
    expect(sceneKeyFromTitle("")).toBe("untitledScene");
    expect(sceneKeyFromTitle("   ")).toBe("untitledScene");
  });

  it("builds a camelCase key from words", () => {
    expect(sceneKeyFromTitle("The Elysium")).toBe("theElysium");
  });

  it("prefixes scene when the key would start with a digit", () => {
    expect(sceneKeyFromTitle("13th Precinct")).toBe("scene13thPrecinct");
  });
});
