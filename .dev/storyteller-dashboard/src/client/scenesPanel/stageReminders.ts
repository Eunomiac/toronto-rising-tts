/**
 * Click-to-hide stage reminders for the empty IdleBoard (Intermission, Downtime, End).
 * A deck click preloads a scene that is not ready yet, so the stage no longer reminds you to preload.
 * Awakening is once per dusk→dawn night; End NPC prompts are once per TTS sessionNum.
 */

export type ReminderId =
  | "recorder"
  | "scenesPreloaded"
  | "sessionTitle"
  | "onboarding"
  | "setDesires"
  | "awakening"
  | "darkBetween"
  | "blackCaesar"
  | "saveGame"
  | `remorse:${string}`;

export type StageReminder = { readonly id: ReminderId; readonly text: string };

export type StageReminderContext = {
  readonly phase?: string;
  readonly subPhase?: string;
  readonly sessionNum?: number;
  /** Live session title from TTS; blank means the Storyteller still needs to type one. */
  readonly sessionName?: string;
  /** Opening Play downtime after Intermission, before any scene is on the table. */
  readonly sessionStartDowntime?: boolean;
  /** Intermission reached by leaving End, rather than a fresh session-start save. */
  readonly closingIntermission?: boolean;
  /** Narrative clock used for dusk→dawn checks (present day / downtime now). */
  readonly now?: Date;
  readonly dusk?: Date;
  readonly dawn?: Date;
  /** Players with one or more Humanity Stains, in seat order. End phase only. */
  readonly stained?: readonly { readonly color: string; readonly name: string }[];
};

type IntermissionFlags = { readonly recorder: boolean; readonly scenesPreloaded: boolean; readonly sessionTitle: boolean };
type EndFlags = { readonly darkBetween: boolean; readonly blackCaesar: boolean; readonly saveGame: boolean };

export type StageReminderStore = {
  readonly intermission: IntermissionFlags;
  /** Night keys (from dusk) the Storyteller has dismissed. */
  readonly awakeningDismissedNights: Readonly<Record<string, true>>;
  /** Per sessionNum: the opening Downtime Desire reminder was dismissed. */
  readonly desiresDismissedSessions: Readonly<Record<string, true>>;
  /** Per sessionNum: the Intermission onboarding reminder was dismissed. */
  readonly onboardingDismissedSessions: Readonly<Record<string, true>>;
  /** Per sessionNum: true means still visible (not dismissed). */
  readonly endBySession: Readonly<Record<string, EndFlags>>;
  /** Per sessionNum, seat colors whose Remorse reminder was clicked. */
  readonly remorseDismissedBySession?: Readonly<Record<string, Readonly<Record<string, true>>>>;
};

const STORAGE_KEY = "tr.dashboard.stageReminders";
const LEGACY_INTERMISSION_KEY = "tr.dashboard.intermissionRemindersDismissed";

const INTERMISSION_DEFAULT: IntermissionFlags = { recorder: true, scenesPreloaded: true, sessionTitle: true };
const END_DEFAULT: EndFlags = { darkBetween: true, blackCaesar: true, saveGame: true };

type StaticReminderId = Exclude<ReminderId, `remorse:${string}`>;

export const REMINDER_TEXT: Readonly<Record<StaticReminderId, string>> = {
  recorder: "Ensure session recorder is connected",
  scenesPreloaded: "Ensure scenes are preloaded.",
  sessionTitle: "Enter a title for this session before advancing to Play.",
  onboarding: "Run the full onboarding process before advancing to Play.",
  setDesires: "Tell the players to set their Desires.",
  awakening: "Confirm players have made their rouse checks for awakening from daysleep.",
  darkBetween: "Ask Aishe for her 'Dark Between the Stars' question.",
  blackCaesar: "Confirm Black Caesar has performed his nightly scourging.",
  saveGame: "Save the game."
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
    blackCaesar: row.blackCaesar !== false,
    saveGame: row.saveGame !== false
  };
};

const emptyStore = (): StageReminderStore => ({
  intermission: INTERMISSION_DEFAULT,
  awakeningDismissedNights: {},
  desiresDismissedSessions: {},
  onboardingDismissedSessions: {},
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
    const desiresRaw = asObject(root.desiresDismissedSessions) ?? {};
    const desiresDismissedSessions: Record<string, true> = {};
    for (const key of Object.keys(desiresRaw)) {
      if (desiresRaw[key] === true) {
        desiresDismissedSessions[key] = true;
      }
    }
    const onboardingRaw = asObject(root.onboardingDismissedSessions) ?? {};
    const onboardingDismissedSessions: Record<string, true> = {};
    for (const key of Object.keys(onboardingRaw)) {
      if (onboardingRaw[key] === true) {
        onboardingDismissedSessions[key] = true;
      }
    }
    const endRaw = asObject(root.endBySession) ?? {};
    const endBySession: Record<string, EndFlags> = {};
    for (const key of Object.keys(endRaw)) {
      endBySession[key] = readEndFlags(asObject(endRaw[key]));
    }
    const remorseRaw = asObject(root.remorseDismissedBySession) ?? {};
    const remorseDismissedBySession: Record<string, Record<string, true>> = {};
    for (const key of Object.keys(remorseRaw)) {
      const colors = asObject(remorseRaw[key]) ?? {};
      const row: Record<string, true> = {};
      for (const color of Object.keys(colors)) {
        if (colors[color] === true) {
          row[color] = true;
        }
      }
      remorseDismissedBySession[key] = row;
    }
    return {
      intermission: readIntermission(asObject(root.intermission)),
      awakeningDismissedNights: nights,
      desiresDismissedSessions,
      onboardingDismissedSessions,
      endBySession,
      remorseDismissedBySession
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
  if (id === "setDesires") {
    if (ctx.sessionNum === undefined) {
      return store;
    }
    const key = String(ctx.sessionNum);
    return {
      ...store,
      desiresDismissedSessions: { ...store.desiresDismissedSessions, [key]: true }
    };
  }
  if (id === "onboarding") {
    if (ctx.sessionNum === undefined) {
      return store;
    }
    const key = String(ctx.sessionNum);
    return {
      ...store,
      onboardingDismissedSessions: { ...store.onboardingDismissedSessions, [key]: true }
    };
  }
  if (id.startsWith("remorse:")) {
    if (ctx.sessionNum === undefined) {
      return store;
    }
    const key = String(ctx.sessionNum);
    const color = id.slice("remorse:".length);
    const current = store.remorseDismissedBySession?.[key] ?? {};
    return {
      ...store,
      remorseDismissedBySession: {
        ...store.remorseDismissedBySession,
        [key]: { ...current, [color]: true }
      }
    };
  }
  if (id !== "darkBetween" && id !== "blackCaesar" && id !== "saveGame") {
    return store;
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
  const push = (id: StaticReminderId): void => {
    out.push({ id, text: REMINDER_TEXT[id] });
  };

  if (ctx.phase === "Intermission") {
    if (ctx.closingIntermission === true) {
      if (ctx.sessionNum !== undefined) {
        const flags = store.endBySession[String(ctx.sessionNum)] ?? END_DEFAULT;
        if (flags.saveGame) {
          push("saveGame");
        }
      }
      return out;
    }
    if (store.intermission.recorder) {
      push("recorder");
    }
    const titleBlank = (ctx.sessionName ?? "").trim() === "";
    if (titleBlank && store.intermission.sessionTitle) {
      push("sessionTitle");
    }
    if (ctx.sessionNum !== undefined && store.onboardingDismissedSessions[String(ctx.sessionNum)] !== true) {
      push("onboarding");
    }
    return out;
  }

  if (ctx.phase === "Play" && (ctx.subPhase ?? "Main") === "Downtime") {
    if (ctx.sessionStartDowntime === true && ctx.sessionNum !== undefined && store.desiresDismissedSessions[String(ctx.sessionNum)] !== true) {
      push("setDesires");
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
    if (flags.blackCaesar) {
      push("blackCaesar");
    }
    const dismissed = store.remorseDismissedBySession?.[String(ctx.sessionNum)] ?? {};
    for (const person of ctx.stained ?? []) {
      if (person.color === "" || dismissed[person.color] === true) {
        continue;
      }
      out.push({
        id: `remorse:${person.color}`,
        text: `Click to initiate ${person.name}'s Remorse Roll`
      });
    }
  }

  return out;
};
