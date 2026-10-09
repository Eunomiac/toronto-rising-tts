import type { MemoriamPeriod } from "./catalogs";
import type { MemoriamPayload } from "./commands";

/**
 * Memoriam set-up maths, matching the TTS modal (`core/memoriam_modal.ttslua`): the subject's periods from the
 * Memoriam catalog, the period a year falls in, and the Advance payload `Memoriam.applyEnter` reads.
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

/** The shortest period covering a year (a nested period wins over the one around it), or null in a gap. */
export const periodForYear = (periods: readonly MemoriamPeriod[], year: number): MemoriamPeriod | null =>
  periods
    .filter((period) => year >= period.startYear && year <= period.endYear)
    .reduce<MemoriamPeriod | null>((best, period) => (!best || period.endYear - period.startYear < best.endYear - best.startYear ? period : best), null);

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
