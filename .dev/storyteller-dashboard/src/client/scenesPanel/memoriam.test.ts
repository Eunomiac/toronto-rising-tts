import { describe, expect, it } from "vitest";
import type { MemoriamPeriod } from "./catalogs";
import {
  TIMELINE_UNITS,
  memoriamDate,
  memoriamPayload,
  memoriamTimeline,
  nearestYearIn,
  periodsFor,
  timelinePeriodAt,
  timelinePosition,
  timelineYearAt
} from "./memoriam";

const period = (key: string, startYear: number, endYear: number, characters: readonly string[] = ["lucien"]): MemoriamPeriod =>
  ({ key, characters, startYear, endYear, location: `${key} town`, panels: [{ key: "panelA", display: "A" }] });

describe("Memoriam set-up", () => {
  const periods = [period("long", 1800, 1850), period("short", 1810, 1815), period("other", 1700, 1710, ["rashid"])];

  it("lists only the subject's periods", () => {
    expect(periodsFor(periods, "lucien").map((entry) => entry.key)).toEqual(["long", "short"]);
  });

  it("splits a long period around a nested one, with a gap up to the present", () => {
    const timeline = memoriamTimeline(periodsFor(periods, "lucien"), 1900);
    expect(timeline.map((s) => [s.period?.key ?? "gap", s.start, s.end, s.overlay])).toEqual([
      ["long", 1800, 1810, false],
      ["short", 1810, 1816, true],
      ["long", 1816, 1851, false],
      ["gap", 1851, 1901, false]
    ]);
    expect(timelinePeriodAt(timeline, 1812)?.key).toBe("short");
    expect(timelinePeriodAt(timeline, 1820)?.key).toBe("long");
    expect(timelinePeriodAt(timeline, 1900)).toBeNull();
  });

  it("sizes segments by the years they cover", () => {
    const timeline = memoriamTimeline(periodsFor(periods, "lucien"), 1900);
    expect(timeline.reduce((sum, s) => sum + s.width, 0)).toBeCloseTo(TIMELINE_UNITS);
    expect(timeline[3]!.width / timeline[0]!.width).toBeCloseTo(5);
  });

  it("gives a one-year period a clickable minimum width", () => {
    const timeline = memoriamTimeline([period("long", 1000, 1899), period("blink", 1500, 1500)], 1900);
    expect(timeline.find((s) => s.period?.key === "blink")!.width).toBeGreaterThanOrEqual(10);
  });

  it("does not let a period that starts on another's last year take that year", () => {
    const timeline = memoriamTimeline([period("a", 1949, 1955), period("b", 1955, 1965)], 1965);
    expect(timelinePeriodAt(timeline, 1955)?.key).toBe("a");
  });

  it("maps slider positions to years and back", () => {
    const timeline = memoriamTimeline(periodsFor(periods, "lucien"), 1900);
    for (const year of [1800, 1812, 1849, 1870, 1900]) {
      expect(timelineYearAt(timeline, timelinePosition(timeline, year))).toBe(year);
    }
    expect(timelineYearAt(timeline, 0)).toBe(1800);
    expect(timelineYearAt(timeline, TIMELINE_UNITS)).toBe(1900);
  });

  it("finds the nearest year a period still owns", () => {
    const timeline = memoriamTimeline(periodsFor(periods, "lucien"), 1900);
    expect(nearestYearIn(timeline, periods[0]!, 1812)).toBe(1809);
    expect(nearestYearIn(timeline, periods[1]!, 1890)).toBe(1815);
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
