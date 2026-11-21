/**
 * Click-to-hide stage reminders for the empty IdleBoard (Intermission, Downtime, End).
 * Preload is the opening Play downtime of a session, not Intermission.
 * Awakening is once per dusk→dawn night; End NPC prompts are once per TTS sessionNum.
 */

export type ReminderId =
  | "recorder"
  | "scenesPreloaded"
  | "sessionTitle"
  | "awakening"
  | "darkBetween"
  | "ratsInWalls"
  | "blackCaesar";

export type StageReminder = { readonly id: ReminderId; readonly text: string };

export type StageReminderContext = {
  readonly phase?: string;
  readonly subPhase?: string;
  readonly sessionNum?: number;
  /** Live session title from TTS; blank means the Storyteller still needs to type one. */
  readonly sessionName?: string;
  /** Opening Play downtime after Intermission, before any scene is on the table. */
  readonly sessionStartDowntime?: boolean;
  /** Narrative clock used for dusk→dawn checks (present day / downtime now). */
  readonly now?: Date;
  readonly dusk?: Date;
  readonly dawn?: Date;
};

type IntermissionFlags = { readonly recorder: boolean; readonly scenesPreloaded: boolean; readonly sessionTitle: boolean };
type EndFlags = { readonly darkBetween: boolean; readonly ratsInWalls: boolean; readonly blackCaesar: boolean };

export type StageReminderStore = {
  readonly intermission: IntermissionFlags;
  /** Night keys (from dusk) the Storyteller has dismissed. */
  readonly awakeningDismissedNights: Readonly<Record<string, true>>;
  /** Per sessionNum: true means still visible (not dismissed). */
  readonly endBySession: Readonly<Record<string, EndFlags>>;
};

const STORAGE_KEY = "tr.dashboard.stageReminders";
const LEGACY_INTERMISSION_KEY = "tr.dashboard.intermissionRemindersDismissed";

const INTERMISSION_DEFAULT: IntermissionFlags = { recorder: true, scenesPreloaded: true, sessionTitle: true };
const END_DEFAULT: EndFlags = { darkBetween: true, ratsInWalls: true, blackCaesar: true };

export const REMINDER_TEXT: Readonly<Record<ReminderId, string>> = {
  recorder: "Ensure session recorder is connected",
  scenesPreloaded: "Ensure scenes are preloaded.",
  sessionTitle: "Enter a title for this session before advancing to Play.",
  awakening: "Confirm players have made their rouse checks for awakening from daysleep.",
  darkBetween: "Ask Aishe for her 'Dark Between the Stars' question.",
  ratsInWalls: "Ask Fomórach for his Rats in the Walls activation roll.",
  blackCaesar: "Confirm Black Caesar has performed his nightly scourging."
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Stable night identity from tonight's dusk stamp. */
export const nightKey = (dusk: Date): string =>
  `${dusk.getFullYear()}-${pad2(dusk.getMonth() + 1)}-${pad2(dusk.getDate())}T${pad2(dusk.getHours())}:${pad2(dusk.getMinutes())}`;

/** True when `now` falls in [dusk, dawn). */
export const isInNight = (now: Date, dusk: Date, dawn: Date): boolean => {
  const t = now.getTime();
  return t >= dusk.getTime() && t < dawn.getTime();
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const readIntermission = (row: Record<string, unknown> | null): IntermissionFlags => {
  if (!row) {
    return INTERMISSION_DEFAULT;
  }
  return {
    recorder: row.recorder !== false,
    scenesPreloaded: row.scenesPreloaded !== false,
    sessionTitle: row.sessionTitle !== false
  };
};

const readEndFlags = (row: Record<string, unknown> | null): EndFlags => {
  if (!row) {
    return END_DEFAULT;
  }
  return {
    darkBetween: row.darkBetween !== false,
    ratsInWalls: row.ratsInWalls !== false,
    blackCaesar: row.blackCaesar !== false
  };
};

const emptyStore = (): StageReminderStore => ({
  intermission: INTERMISSION_DEFAULT,
  awakeningDismissedNights: {},
  endBySession: {}
});

const parseStore = (raw: string | null): StageReminderStore => {
  if (!raw) {
    return emptyStore();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const root = asObject(parsed);
    if (!root) {
      return emptyStore();
    }
    const nightsRaw = asObject(root.awakeningDismissedNights) ?? {};
    const nights: Record<string, true> = {};
    for (const key of Object.keys(nightsRaw)) {
      if (nightsRaw[key] === true) {
        nights[key] = true;
      }
    }
    const endRaw = asObject(root.endBySession) ?? {};
    const endBySession: Record<string, EndFlags> = {};
    for (const key of Object.keys(endRaw)) {
      endBySession[key] = readEndFlags(asObject(endRaw[key]));
    }
    return {
      intermission: readIntermission(asObject(root.intermission)),
      awakeningDismissedNights: nights,
      endBySession
    };
  } catch {
    return emptyStore();
  }
};

const readLegacyIntermission = (storage: Storage): IntermissionFlags | null => {
  try {
    const raw = storage.getItem(LEGACY_INTERMISSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return readIntermission(asObject(parsed));
  } catch {
    return null;
  }
};

export const readStageReminderStore = (storage: Storage = sessionStorage): StageReminderStore => {
  const store = parseStore(storage.getItem(STORAGE_KEY));
  if (storage.getItem(STORAGE_KEY)) {
    return store;
  }
  const legacy = readLegacyIntermission(storage);
  if (!legacy) {
    return store;
  }
  return { ...store, intermission: legacy };
};

export const writeStageReminderStore = (store: StageReminderStore, storage: Storage = sessionStorage): void => {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const dismissStageReminder = (
  store: StageReminderStore,
  id: ReminderId,
  ctx: StageReminderContext
): StageReminderStore => {
  if (id === "recorder" || id === "scenesPreloaded" || id === "sessionTitle") {
    return {
      ...store,
      intermission: { ...store.intermission, [id]: false }
    };
  }
  if (id === "awakening") {
    if (!ctx.dusk) {
      return store;
    }
    const key = nightKey(ctx.dusk);
    return {
      ...store,
      awakeningDismissedNights: { ...store.awakeningDismissedNights, [key]: true }
    };
  }
  if (ctx.sessionNum === undefined) {
    return store;
  }
  const sessionKey = String(ctx.sessionNum);
  const current = store.endBySession[sessionKey] ?? END_DEFAULT;
  return {
    ...store,
    endBySession: {
      ...store.endBySession,
      [sessionKey]: { ...current, [id]: false }
    }
  };
};

/** Ordered reminders that should appear on the empty stage for this context + dismiss store. */
export const visibleStageReminders = (
  ctx: StageReminderContext,
  store: StageReminderStore
): readonly StageReminder[] => {
  const out: StageReminder[] = [];
  const push = (id: ReminderId): void => {
    out.push({ id, text: REMINDER_TEXT[id] });
  };

  if (ctx.phase === "Intermission") {
    if (store.intermission.recorder) {
      push("recorder");
    }
    const titleBlank = (ctx.sessionName ?? "").trim() === "";
    if (titleBlank && store.intermission.sessionTitle) {
      push("sessionTitle");
    }
    return out;
  }

  if (ctx.phase === "Play" && (ctx.subPhase ?? "Main") === "Downtime") {
    if (ctx.sessionStartDowntime === true && store.intermission.scenesPreloaded) {
      push("scenesPreloaded");
    }
    const { now, dusk, dawn } = ctx;
    if (now && dusk && dawn && isInNight(now, dusk, dawn)) {
      const key = nightKey(dusk);
      if (store.awakeningDismissedNights[key] !== true) {
        push("awakening");
      }
    }
    return out;
  }

  if (ctx.phase === "End" && ctx.sessionNum !== undefined) {
    const flags = store.endBySession[String(ctx.sessionNum)] ?? END_DEFAULT;
    if (flags.darkBetween) {
      push("darkBetween");
    }
    if (flags.ratsInWalls) {
      push("ratsInWalls");
    }
    if (flags.blackCaesar) {
      push("blackCaesar");
    }
  }

  return out;
};
