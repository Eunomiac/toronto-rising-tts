import { useSyncExternalStore } from "react";
import { executeLua } from "./ttsBridge.js";
import { extractSnapshotJson } from "./pcSheet/bridge.js";
import { subscribeTtsEvents, type TtsPushEvent } from "./ttsEvents.js";

/**
 * Live world state pushed by TTS (`dashboard/world_snapshot.ttslua`): one whole slice per topic.
 * Field meanings and when each topic fires: `.dev/Storyteller Dashboard Docs/Listening to TTS.md`.
 */

export const WORLD_TOPICS = ["phase", "scene", "clock", "soundscape", "seats"] as const;
export type WorldTopic = (typeof WORLD_TOPICS)[number];

export type PhaseSlice = {
  readonly phase?: string;
  readonly subPhase?: string;
  readonly sessionNum?: number;
  readonly sessionName: string;
  readonly sessionStartDowntime: boolean;
  readonly memoriamActive: boolean;
};

export type SceneSlice = {
  readonly liveKey?: string;
  readonly liveTitle?: string;
  readonly liveLinked: boolean;
  /** The live library row's own location; differs from the live one after an unlinked override. */
  readonly library?: { readonly districtKey?: string; readonly siteKey?: string };
  /** Scene condition ids; TTS encodes an empty list as `{}`, so read through `sceneConditions`. */
  readonly conditions?: readonly string[];
  /** Storyteller weather held over the schedule until `untilDatetime` (the next dawn). */
  readonly weatherOverride?: {
    readonly rain: string;
    readonly wind: string;
    readonly thunder: boolean;
    readonly untilDatetime?: ClockDatetime;
  };
  readonly districtKey?: string;
  readonly siteKey?: string;
  readonly tableKey?: string;
  readonly placementMode?: string;
  readonly lightingPresetKey?: string;
  readonly skyboxOverride?: string;
  readonly topFog: boolean;
  readonly weather: {
    readonly weather?: string;
    readonly rain?: string;
    readonly wind?: string;
    readonly thunder: boolean;
    readonly indoors: boolean;
  };
};

export type ClockDatetime = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
};

/**
 * Clock anchor: the datetimes TTS held at `at` (epoch ms). While `running`, the active clock
 * advances `speed` narrative minutes per real minute; use `clockNow` rather than reading
 * `scene` / `downtime` directly.
 */
export type ClockAnchor = {
  readonly activeClock: "scene" | "downtime";
  readonly running: boolean;
  readonly speed: number;
  readonly catchUpToPresentDay: boolean;
  readonly isPresentDay: boolean;
  readonly scene?: ClockDatetime;
  readonly downtime?: ClockDatetime;
  readonly presentDay?: ClockDatetime;
  /** Tonight's dusk and dawn for the running clock (before sunrise: last night's). */
  readonly dusk?: ClockDatetime;
  readonly dawn?: ClockDatetime;
  /** Chronicle-scheduled temperature for the running clock's hour. */
  readonly temperatureC?: number;
  readonly at: number;
};

export type SoundLane = {
  readonly id: string;
  readonly volume: number;
  readonly naturalVolume: number;
  readonly ducked: boolean;
  readonly active: boolean;
};

export type SoundscapeSlice = {
  readonly musicMode?: string;
  readonly musicMood?: string;
  readonly musicEnabled: boolean;
  readonly musicSuppressed: boolean;
  readonly locationMusic?: string;
  readonly location?: string;
  readonly siteSilent: boolean;
  readonly featuredKey?: string;
  readonly featuredActive: boolean;
  readonly sessionIntroKey?: string;
  readonly sessionIntroActive: boolean;
  readonly lanes: readonly SoundLane[];
};

export type SeatRow = {
  readonly seat: string;
  readonly kind: "pc" | "npc";
  readonly tableSlot?: number;
  /** Narrative presence: false = seated but out of the scene (seat dark). */
  readonly isPresent: boolean;
  readonly playerId?: string;
  readonly charKey?: string;
  /** PC only: disconnected at a blindfold checkpoint (connection state, not narrative absence). */
  readonly absentFromSession?: boolean;
  readonly playingNpcKey?: string;
  readonly characterKey?: string;
  readonly slotEmpty?: boolean;
};

export type StageNpc = {
  readonly characterKey: string;
  readonly u?: number;
  readonly v?: number;
  readonly lightMode?: string;
};

/** A generic NPC spawned into the scene; `characterKey` is its generic catalog key. */
export type GenericNpc = { readonly characterKey: string; readonly name: string };

/** A PC (`characterKey` = their charKey) or NPC in a Scatter group, by hole `slot`. */
export type ScatterMember = { readonly characterKey: string; readonly slot?: number };

export type ScatterGroup = { readonly group: number; readonly pcs: readonly ScatterMember[]; readonly npcs: readonly ScatterMember[] };

export type SeatsSlice = {
  readonly seats: readonly SeatRow[];
  readonly stage: readonly StageNpc[];
  readonly generics: readonly GenericNpc[];
  /** Scatter groups 1–6 (`sessionScene.scatterPlacements`); present outside Scatter too. */
  readonly scatter: readonly ScatterGroup[];
  readonly spotlightOrder: readonly string[];
  readonly spotlightFrontIndex?: number;
};

export type WorldState = {
  readonly phase?: PhaseSlice;
  readonly scene?: SceneSlice;
  readonly clock?: ClockAnchor;
  readonly soundscape?: SoundscapeSlice;
  readonly seats?: SeatsSlice;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Lua encodes an empty table as `{}`, so list fields may arrive as objects. */
const asList = <T>(value: unknown): readonly T[] => (Array.isArray(value) ? (value as T[]) : []);

const isWorldTopic = (topic: string): topic is WorldTopic => (WORLD_TOPICS as readonly string[]).includes(topic);

/** A clock TTS does not hold arrives as an empty table, which Lua encodes as `[]`. */
const asDatetime = (value: unknown): ClockDatetime | undefined =>
  isRecord(value) && typeof value.year === "number" ? (value as ClockDatetime) : undefined;

const normalizeSlice = (topic: WorldTopic, data: Record<string, unknown>, at: number): WorldState[WorldTopic] => {
  switch (topic) {
    case "clock":
      return {
        ...(data as Omit<ClockAnchor, "at">),
        scene: asDatetime(data.scene),
        downtime: asDatetime(data.downtime),
        presentDay: asDatetime(data.presentDay),
        dusk: asDatetime(data.dusk),
        dawn: asDatetime(data.dawn),
        temperatureC: typeof data.temperatureC === "number" ? data.temperatureC : undefined,
        at
      };
    case "soundscape":
      return { ...(data as Omit<SoundscapeSlice, "lanes">), lanes: asList<SoundLane>(data.lanes) };
    case "seats":
      return {
        ...(data as Omit<SeatsSlice, "seats" | "stage" | "generics" | "scatter" | "spotlightOrder">),
        seats: asList<SeatRow>(data.seats),
        stage: asList<StageNpc>(data.stage),
        generics: asList<GenericNpc>(data.generics),
        scatter: asList<Record<string, unknown>>(data.scatter).map((group) => ({
          group: Number(group.group),
          pcs: asList<ScatterMember>(group.pcs),
          npcs: asList<ScatterMember>(group.npcs)
        })),
        spotlightOrder: asList<string>(data.spotlightOrder)
      };
    default:
      return data as WorldState[WorldTopic];
  }
};

/**
 * Pure reducer: a world topic replaces its slice, `reload` (TTS loaded a game) clears everything,
 * other topics leave the state untouched.
 */
export const applyWorldEvent = (state: WorldState, event: TtsPushEvent, nowMs: number = Date.now()): WorldState => {
  if (event.topic === "reload") {
    return {};
  }
  if (!isWorldTopic(event.topic) || !isRecord(event.data)) {
    return state;
  }
  return { ...state, [event.topic]: normalizeSlice(event.topic, event.data, event.at ?? nowMs) };
};

/**
 * Pure merge of a `GlobalDashboardWorldSnapshot` result. Fills only slices the store does not
 * hold yet: a pushed slice is always the latest TTS state, while a snapshot may have been built
 * before a push that arrived during the round trip.
 */
export const mergeWorldSnapshot = (state: WorldState, snapshot: unknown, receivedAtMs: number): WorldState => {
  if (!isRecord(snapshot)) {
    return state;
  }
  let next = state;
  for (const topic of WORLD_TOPICS) {
    const data = snapshot[topic];
    if (next[topic] === undefined && isRecord(data)) {
      next = { ...next, [topic]: normalizeSlice(topic, data, receivedAtMs) };
    }
  }
  return next;
};

const toEpochMinutes = (dt: ClockDatetime): number => {
  const date = new Date(0);
  date.setUTCFullYear(dt.year, dt.month - 1, dt.day);
  date.setUTCHours(dt.hour, dt.minute, 0, 0);
  return Math.floor(date.getTime() / 60_000);
};

const fromEpochMinutes = (minutes: number): ClockDatetime => {
  const date = new Date(minutes * 60_000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes()
  };
};

/**
 * The narrative time the active clock shows at `nowMs`, extrapolated from the anchor the same way
 * the TTS ticker advances (`speed` narrative minutes per real minute). During present-day catch-up
 * it stops at the present day. Undefined when TTS has no active clock.
 */
export const clockNow = (clock: ClockAnchor, nowMs: number): ClockDatetime | undefined => {
  const base = clock.activeClock === "downtime" ? clock.downtime : clock.scene;
  if (!base) {
    return undefined;
  }
  if (!clock.running || clock.speed <= 0 || nowMs <= clock.at) {
    return base;
  }
  const elapsed = Math.floor((clock.speed * (nowMs - clock.at)) / 60_000);
  let minutes = toEpochMinutes(base) + elapsed;
  if (clock.catchUpToPresentDay && clock.presentDay) {
    minutes = Math.min(minutes, toEpochMinutes(clock.presentDay));
  }
  return fromEpochMinutes(minutes);
};

const SNAPSHOT_SCRIPT = ["local json = GlobalDashboardWorldSnapshot()", "return json"].join("\n");

/**
 * One-shot execute-lua read of every world slice, for a tab that opens before any push for that
 * slice is cached (server restarted mid-session). Throws when TTS does not answer.
 */
export const loadWorldSnapshot = async (): Promise<Record<string, unknown>> => {
  const result = await executeLua(SNAPSHOT_SCRIPT);
  if (result.timedOut) {
    throw new Error("TTS did not answer. Keep External Editor on; with Cursor open the Dashboard uses the TTS Tools gateway.");
  }
  const parsed: unknown = JSON.parse(extractSnapshotJson(result));
  if (!isRecord(parsed)) {
    throw new Error("TTS returned an unreadable world snapshot.");
  }
  if (parsed.ok !== true) {
    throw new Error(typeof parsed.error === "string" ? parsed.error : "TTS refused the world snapshot.");
  }
  return parsed;
};

let current: WorldState = {};
const listeners = new Set<() => void>();
let unsubscribeEvents: (() => void) | undefined;

const setState = (next: WorldState): void => {
  if (next === current) {
    return;
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
};

const subscribeStore = (listener: () => void): (() => void) => {
  listeners.add(listener);
  unsubscribeEvents ??= subscribeTtsEvents((event) => setState(applyWorldEvent(current, event)));
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribeEvents) {
      unsubscribeEvents();
      unsubscribeEvents = undefined;
      current = {};
    }
  };
};

/** Fill slices no push has delivered yet from a one-shot TTS snapshot. */
export const refreshWorldSnapshot = async (): Promise<void> => {
  const snapshot = await loadWorldSnapshot();
  setState(mergeWorldSnapshot(current, snapshot, Date.now()));
};

/**
 * Live world state for a component. The server replays its cached slices when the event stream
 * connects; call `refreshWorldSnapshot` when a slice the view needs is still missing.
 */
export const useWorldState = (): WorldState => useSyncExternalStore(subscribeStore, () => current, () => current);
