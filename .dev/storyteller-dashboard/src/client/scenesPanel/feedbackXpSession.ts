/**
 * Feedback XP is shown once per chronicle session on the first Play / Downtime idle stage.
 * Tracked in localStorage by session number so a later Downtime in the same session stays clear.
 */

const STORAGE_KEY = "tr-dashboard:feedback-xp-sessions";

const defaultStorage = (): Storage => localStorage;

const readDone = (storage: Storage = defaultStorage()): ReadonlySet<number> => {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n)));
  } catch {
    return new Set();
  }
};

const writeDone = (done: ReadonlySet<number>, storage: Storage = defaultStorage()): void => {
  storage.setItem(STORAGE_KEY, JSON.stringify([...done]));
};

/** True when Feedback XP was already shown for this session number. */
export const isFeedbackXpDoneForSession = (sessionNum: number, storage?: Storage): boolean =>
  readDone(storage).has(sessionNum);

/** Record that Feedback XP has been shown for this session (subsequent Downtimes skip it). */
export const markFeedbackXpDoneForSession = (sessionNum: number, storage?: Storage): void => {
  const store = storage ?? defaultStorage();
  const next = new Set(readDone(store));
  next.add(sessionNum);
  writeDone(next, store);
};
