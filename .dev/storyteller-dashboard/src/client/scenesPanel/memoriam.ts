import type { MemoriamPeriod } from "./catalogs";
import type { MemoriamPayload } from "./commands";

/**
 * Memoriam set-up maths, matching the TTS modal (`core/memoriam_modal.ttslua`): the subject's periods from the
 * Memoriam catalog, the timeline bar and slider over their life, and the Advance payload `Memoriam.applyEnter` reads.
 */

/** Memoriam PC keys and names, in the TTS modal's order. */
export const MEMORIAM_PCS = [
  { key: "lucien", name: "Lord Lucien" },
  { key: "rashid", name: "Rashid Abdulrahman" },
  { key: "aishe", name: "Aishe Tache" },
  { key: "fomorach", name: "Fomórach" },
  { key: "blackCaesar", name: "Black Caesar" }
] as const;

/** The TTS modal has fourteen period columns. */
export const MEMORIAM_COLUMNS = 14;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

export const periodsFor = (periods: readonly MemoriamPeriod[], subjectKey: string): readonly MemoriamPeriod[] =>
  periods.filter((period) => period.characters.includes(subjectKey)).slice(0, MEMORIAM_COLUMNS);

/** Slider units across the whole bar, as in TTS. */
export const TIMELINE_UNITS = 5000;
const MIN_PERIOD_UNITS = 10;

/** One run of years on the timeline bar: a period's years, or a gap (`period` null) that plays as Just Smoke. */
export type TimelineSegment = {
  readonly period: MemoriamPeriod | null;
  readonly start: number;
  /** Exclusive. */
  readonly end: number;
  /** Nested inside a longer period: painted in the lighter pair of greys. */
  readonly overlay: boolean;
  /** Alternates 0/1 within the base and overlay pairs so neighbours never share a shade. */
  readonly stripe: number;
  /** Bar share in slider units (out of `TIMELINE_UNITS`), proportional to the years covered. */
  readonly width: number;
};

type Range = { readonly period: MemoriamPeriod; readonly index: number; readonly start: number; readonly finish: number };

const rangeSpan = (range: Range): number => range.finish - range.start;

/** Inclusive years. A boundary year shared by two multi-year periods is not overlap; a one-year period on it is. */
const rangesOverlap = (a: Range, b: Range): boolean => {
  const from = Math.max(a.start, b.start);
  const to = Math.min(a.finish - 1, b.finish - 1);
  if (from > to) {
    return false;
  }
  if (from < to || a.start === a.finish - 1 || b.start === b.finish - 1) {
    return true;
  }
  return (a.start < from && from < a.finish - 1) || (b.start < from && from < b.finish - 1);
};

/** Bar widths proportional to years, with a floor so a one-year period stays clickable (`normalizeSegmentWidths`). */
const scaleWidths = (runs: readonly { kind: "gap" | "period"; years: number }[]): number[] => {
  const totalYears = runs.reduce((sum, run) => sum + run.years, 0);
  const raw = runs.map((run) => (run.years / totalYears) * TIMELINE_UNITS);
  let deficit = 0;
  runs.forEach((run, i) => {
    if (run.kind === "period" && raw[i]! < MIN_PERIOD_UNITS) {
      deficit += MIN_PERIOD_UNITS - raw[i]!;
      raw[i] = MIN_PERIOD_UNITS;
    }
  });
  const shave = (eligible: (i: number) => boolean, floor: number): void => {
    const surplus = raw.reduce((sum, width, i) => sum + (eligible(i) ? width - floor : 0), 0);
    const take = Math.min(deficit, surplus);
    if (take > 0) {
      raw.forEach((width, i) => {
        if (eligible(i)) {
          raw[i] = width - ((width - floor) / surplus) * take;
        }
      });
      deficit -= take;
    }
  };
  if (deficit > 0) {
    shave((i) => runs[i]!.kind === "period" && raw[i]! > MIN_PERIOD_UNITS, MIN_PERIOD_UNITS);
  }
  if (deficit > 0.01) {
    shave((i) => runs[i]!.kind === "gap", 0);
  }
  return raw;
};

/**
 * The subject's life as the TTS bar draws it (`buildTimeline` in `core/memoriam_modal.ttslua`): earliest year on the
 * left to the present on the right, each run of years owned by the shortest period covering it (a nested period
 * splits the one around it), gaps between periods, widths proportional to years. Empty when no period falls on or
 * before the present.
 */
export const memoriamTimeline = (periods: readonly MemoriamPeriod[], presentYear: number): readonly TimelineSegment[] => {
  const presentEnd = presentYear + 1;
  const ranges: Range[] = periods
    .map((period, index) => {
      const start = Math.floor(period.startYear);
      return { period, index, start, finish: Math.min(Math.max(Math.floor(period.endYear), start) + 1, presentEnd) };
    })
    .filter((range) => range.finish > range.start);
  if (ranges.length === 0) {
    return [];
  }
  const overlay = new Set(ranges.filter((r) => ranges.some((other) => other !== r && rangesOverlap(r, other) && rangeSpan(r) < rangeSpan(other))));
  const winnerFor = (year: number): Range | null => {
    let best: Range | null = null;
    for (const r of ranges) {
      if (year < r.start || year >= r.finish) {
        continue;
      }
      // A multi-year period that only begins on another's last year does not take that year.
      if (year === r.start && r.start < r.finish - 1 && ranges.some((other) => other !== r && year === other.finish - 1 && !rangesOverlap(r, other))) {
        continue;
      }
      if (
        !best ||
        rangeSpan(r) < rangeSpan(best) ||
        (rangeSpan(r) === rangeSpan(best) && (r.start > best.start || (r.start === best.start && r.index > best.index)))
      ) {
        best = r;
      }
    }
    return best;
  };
  const runs: { winner: Range | null; start: number; end: number }[] = [];
  for (let year = Math.min(...ranges.map((r) => r.start)); year < presentEnd; year += 1) {
    const winner = winnerFor(year);
    const last = runs[runs.length - 1];
    if (last && last.winner?.index === winner?.index) {
      last.end = year + 1;
    } else {
      runs.push({ winner, start: year, end: year + 1 });
    }
  }
  const widths = scaleWidths(runs.map((run) => ({ kind: run.winner ? "period" : "gap", years: run.end - run.start })));
  const stripes = new Map<number, number>();
  const counts = { base: 0, overlay: 0 };
  return runs.map((run, i) => {
    const isOverlay = run.winner !== null && overlay.has(run.winner);
    let stripe = 0;
    if (run.winner) {
      const pair = isOverlay ? "overlay" : "base";
      stripe = stripes.get(run.winner.index) ?? counts[pair]++ % 2;
      stripes.set(run.winner.index, stripe);
    }
    return { period: run.winner?.period ?? null, start: run.start, end: run.end, overlay: isOverlay, stripe, width: widths[i]! };
  });
};

/** The segment and year under a slider position (`mapSliderToSegment` + `calendarYearInSegment`). */
export const timelineYearAt = (timeline: readonly TimelineSegment[], position: number): number => {
  let cursor = 0;
  for (const [i, segment] of timeline.entries()) {
    if (position < cursor + segment.width || i === timeline.length - 1) {
      const t = segment.width > 0 ? Math.min(1, Math.max(0, (position - cursor) / segment.width)) : 0;
      return Math.min(segment.end - 1, Math.floor(segment.start + (segment.end - segment.start) * t));
    }
    cursor += segment.width;
  }
  return 0;
};

/** The slider position at the middle of a year. */
export const timelinePosition = (timeline: readonly TimelineSegment[], year: number): number => {
  let cursor = 0;
  for (const segment of timeline) {
    if (year >= segment.start && year < segment.end) {
      return cursor + ((year + 0.5 - segment.start) / (segment.end - segment.start)) * segment.width;
    }
    cursor += segment.width;
  }
  return year < (timeline[0]?.start ?? 0) ? 0 : TIMELINE_UNITS;
};

/** The period owning a year on the timeline, or null in a gap. */
export const timelinePeriodAt = (timeline: readonly TimelineSegment[], year: number): MemoriamPeriod | null =>
  timeline.find((segment) => year >= segment.start && year < segment.end)?.period ?? null;

/** The year nearest `year` that a period owns on the timeline (a nested period may have taken some of its years). */
export const nearestYearIn = (timeline: readonly TimelineSegment[], period: MemoriamPeriod, year: number): number | null =>
  timeline
    .filter((segment) => segment.period === period)
    .map((segment) => Math.min(Math.max(year, segment.start), segment.end - 1))
    .reduce<number | null>((best, candidate) => (best === null || Math.abs(candidate - year) < Math.abs(best - year) ? candidate : best), null);

const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

/**
 * A day in the year, in the form `Memoriam.applyEnter` parses (`October 14, 1889`). TTS rolls a random month and
 * day; this one is fixed per year and subject so the date holds still while the slider moves.
 */
export const memoriamDate = (year: number, seed: number): string => {
  const month = ((year * 7919 + seed * 31) % 12) + 1;
  const day = ((year * 104729 + seed * 17) % daysInMonth(year, month)) + 1;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
};

export type MemoriamChoice = { readonly periodKey: string; readonly panel: string } | "smoke";

/** Everyone marked present plays themselves; the subject is always present. */
export const memoriamPayload = (subjectKey: string, year: number, choice: MemoriamChoice, period: MemoriamPeriod | null, present: ReadonlySet<string>): MemoriamPayload => {
  const seed = MEMORIAM_PCS.findIndex((pc) => pc.key === subjectKey);
  const assignments = Object.fromEntries([...new Set([subjectKey, ...present])].map((key) => [key, { kind: "self" as const }]));
  const date = memoriamDate(year, seed);
  if (choice === "smoke") {
    return { subjectKey, date, location: "", assignments, justSmoke: true };
  }
  if (!period || period.key !== choice.periodKey) {
    throw new Error(`Memoriam: the chosen panel's period ${choice.periodKey} is not the one passed in.`);
  }
  return { subjectKey, date, location: period.location, assignments, skyboxKey: choice.periodKey, panel: choice.panel };
};
