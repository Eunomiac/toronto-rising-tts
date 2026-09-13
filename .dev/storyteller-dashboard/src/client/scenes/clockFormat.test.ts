import { describe, expect, it } from "vitest";
import { formatChronicleDate, formatClockTime12h } from "./clockFormat";

describe("clockFormat", () => {
  it("formats the in-game date line without an ordinal suffix", () => {
    expect(formatChronicleDate(2026, 9, 7)).toBe("Monday, September 7, 2026");
  });

  it("formats 12-hour time the way the overlay does", () => {
    expect(formatClockTime12h(21, 0)).toBe("9:00 PM");
    expect(formatClockTime12h(10, 20)).toBe("10:20 AM");
    expect(formatClockTime12h(0, 5)).toBe("12:05 AM");
    expect(formatClockTime12h(12, 0)).toBe("12:00 PM");
  });
});
