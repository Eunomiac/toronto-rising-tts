import { describe, expect, it } from "vitest";
import { formatShortDate, formatSummation, numberToWords, sessionDisplayForNum, sessionTitleUpper } from "./xpDisplay.js";

describe("xpDisplay", () => {
  it("spells session numbers like the TTS sheet", () => {
    expect(numberToWords(42)).toBe("Forty-Two");
    expect(numberToWords(115)).toBe("One Hundred Fifteen");
    expect(sessionDisplayForNum(0)).toBe("Character Creation");
    expect(sessionDisplayForNum(-3)).toBe("Pre-Session Three");
    expect(sessionDisplayForNum(20)).toBe("Session Twenty");
  });

  it("prefers the stored session name for the title", () => {
    expect(sessionTitleUpper("Rollover", 0)).toBe("ROLLOVER");
    expect(sessionTitleUpper("", 2)).toBe("SESSION TWO");
  });

  it("builds the summation line and skips empty bins", () => {
    expect(formatSummation(12, 3, 5)).toBe("12 XP + 3 − 5 =");
    expect(formatSummation(12, 0, 0)).toBe("12 XP =");
  });

  it("formats short dates and ignores missing ones", () => {
    const seconds = new Date(2026, 9, 6, 12).getTime() / 1000;
    expect(formatShortDate(seconds)).toBe("Oct. 6, 2026");
    expect(formatShortDate(undefined)).toBe("");
    expect(formatShortDate(0)).toBe("");
  });
});
