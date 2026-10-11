import type { LibraryScene } from "../../shared/sceneLibrary";
import type { ClockDatetime } from "../worldState";
import type { SceneClock } from "./commands";

/** Minutes after the scene's time (or present day) that each button of the scene timing menu starts at. */
export const START_OFFSETS = [0, 15, 30, 45, 60, 90, 120, 180, 240] as const;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The time a library row plays at with "Scene Time" (TTS needs a full datetime; present-day rows may lack one). */
export const sceneTimeOf = (row: LibraryScene | undefined): ClockDatetime | undefined => {
  const clock = row?.sessionScene.clock;
  if (typeof clock !== "object" || clock === null) {
    return undefined;
  }
  const { year, month, day, hour, minute } = clock as Record<string, unknown>;
  return isNumber(year) && isNumber(month) && isNumber(day) && isNumber(hour) && isNumber(minute)
    ? { year, month, day, hour, minute }
    : undefined;
};

/** The evening a time belongs to: hours before noon count as the night that began the evening before. */
export const nightOf = (at: Date): Date => new Date(at.getTime() - 12 * 3_600_000);

export const isSameNight = (a: Date, b: Date): boolean => nightOf(a).toDateString() === nightOf(b).toDateString();

/**
 * ×5 to Now when the scene starts earlier on the same night as present day (so it catches up), otherwise ×2.
 */
export const defaultPace = (start: Date, present: Date | undefined): SceneClock["pace"] =>
  present !== undefined && start.getTime() < present.getTime() && isSameNight(start, present) ? "x5" : "x2";

/** "+45 min", "+2 h", "+1 h 30". */
export const offsetLabel = (minutes: number): string => {
  if (minutes < 60) {
    return `+${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `+${hours} h` : `+${hours} h ${rest}`;
};
