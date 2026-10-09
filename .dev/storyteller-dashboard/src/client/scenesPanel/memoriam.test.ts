import { describe, expect, it } from "vitest";
import type { MemoriamPeriod } from "../scenes/types";
import { memoriamDate, memoriamPayload, periodForYear, periodsFor } from "./memoriam";

const period = (key: string, startYear: number, endYear: number, characters: readonly string[] = ["lucien"]): MemoriamPeriod =>
  ({ key, characters, startYear, endYear, location: `${key} town`, panels: [{ key: "panelA", display: "A" }] });

describe("Memoriam set-up", () => {
  const periods = [period("long", 1800, 1850), period("short", 1810, 1815), period("other", 1700, 1710, ["rashid"])];

  it("lists only the subject's periods", () => {
    expect(periodsFor(periods, "lucien").map((entry) => entry.key)).toEqual(["long", "short"]);
  });

  it("picks the shortest period covering a year, and none in a gap", () => {
    const own = periodsFor(periods, "lucien");
    expect(periodForYear(own, 1812)?.key).toBe("short");
    expect(periodForYear(own, 1820)?.key).toBe("long");
    expect(periodForYear(own, 1900)).toBeNull();
  });

  it("writes a date Memoriam.applyEnter parses, steady for the same year", () => {
    const date = memoriamDate(1889, 0);
    expect(date).toMatch(/^[A-Z][a-z]+ \d{1,2}, 1889$/);
    expect(memoriamDate(1889, 0)).toBe(date);
  });

  it("builds a panel payload with the subject always present", () => {
    const payload = memoriamPayload("lucien", 1812, { periodKey: "short", panel: "panelA" }, periods[1] ?? null, new Set(["rashid"]));
    expect(payload).toMatchObject({ subjectKey: "lucien", location: "short town", skyboxKey: "short", panel: "panelA" });
    expect(payload.assignments).toEqual({ lucien: { kind: "self" }, rashid: { kind: "self" } });
  });

  it("builds a Just Smoke payload with no location", () => {
    expect(memoriamPayload("lucien", 1900, "smoke", null, new Set())).toMatchObject({ justSmoke: true, location: "" });
  });
});
