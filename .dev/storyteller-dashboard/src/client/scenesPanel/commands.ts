import { createContext, useContext } from "react";
import type { NpcTier } from "../../shared/npcStats";
import type { PlacementMode, SceneStatus } from "../../shared/sceneLibrary";
import type { LightingPreset, MusicMood } from "../catalogVocab";
import type { ClockDatetime, GenericNpc } from "../worldState";

/**
 * How a scene switch sets the clock (`PresentDayClock.resolveAndApplyActivationClock`): start `plusMinutes` after
 * the scene's own time or present day (which moves present day on); real time runs at ×2, or at ×5 until it
 * reaches present day.
 */
export type SceneClock = { readonly from: "scene" | "present"; readonly plusMinutes: number; readonly pace: "x2" | "x5" };

/** Storyteller lanes `Soundscape.setStorytellerLaneVolume` accepts. */
export type SoundLane = "music" | "location" | "featured" | "rain" | "wind" | "thunder";

/** Rain layers TTS has (no snow yet). */
export type RainKey = "none" | "rainLight" | "rainHeavy";

/** Who plays whom in a Memoriam; the subject is always listed. */
export type MemoriamAssignment = { readonly kind: "self" };

/** The TTS Memoriam modal's Advance payload (`Memoriam.applyEnter`). */
export type MemoriamPayload = {
  readonly subjectKey: string;
  /** `Month D, YYYY`. */
  readonly date: string;
  readonly location: string;
  readonly assignments: Readonly<Record<string, MemoriamAssignment>>;
} & ({ readonly skyboxKey: string; readonly panel: string } | { readonly justSmoke: true });

export type StageLight = "OFF" | "STANDARD" | "SPOTLIGHT";

/** A stage NPC's new spot in control-board (u, v); no `lightMode` keeps their light as it is. */
export type StagePlace = { readonly u: number; readonly v: number; readonly lightMode?: StageLight };

export type StageChange = StagePlace | { readonly remove: true };

/** Stage changes by NPC `characterKey`. */
export type StageChanges = Readonly<Record<string, StageChange>>;

/** One Scenes tab command for `GlobalDashboardScenesApply` (`dashboard/scenes.ttslua` lists what each does). */
export type ScenesCommand =
  | { readonly op: "phaseAdvance" }
  | { readonly op: "leaveMemoriam" }
  | { readonly op: "memoriam"; readonly payload: MemoriamPayload }
  | { readonly op: "location"; readonly districtKey: string; readonly siteKey: string }
  | { readonly op: "skybox"; readonly key: string }
  | { readonly op: "topFog"; readonly on: boolean }
  | { readonly op: "lighting"; readonly presetKey: LightingPreset }
  | { readonly op: "table"; readonly key: string }
  | { readonly op: "conditions"; readonly ids: readonly string[] }
  /**
   * `cold`: the scene's scheduled temperature is at or below `C.WEATHER.WARM_TEMPERATURE_THRESHOLD`, so wind takes
   * the winter layer. TTS works that out from its own clock; a scene draft stores the layer this picks.
   */
  | { readonly op: "weatherOverride"; readonly rain: RainKey; readonly wind: 0 | 1 | 2 | 3; readonly thunder: boolean; readonly cold: boolean }
  | { readonly op: "weatherOverride"; readonly release: true }
  | { readonly op: "sessionNum"; readonly num: number }
  | { readonly op: "sessionName"; readonly name: string }
  | { readonly op: "spotlightRotate"; readonly delta: number }
  | { readonly op: "spotlightFront"; readonly color: string }
  | { readonly op: "realTime"; readonly running: boolean; readonly speed?: number }
  | { readonly op: "clockTo"; readonly datetime: ClockDatetime }
  | { readonly op: "presentDay"; readonly datetime: ClockDatetime }
  | { readonly op: "musicMood"; readonly mood: MusicMood }
  | { readonly op: "musicSilent" }
  | { readonly op: "locationMusic"; readonly key: string }
  | { readonly op: "laneVolume"; readonly lane: SoundLane; readonly volume: number }
  | { readonly op: "featuredPlay"; readonly key: string }
  | { readonly op: "featuredStop" }
  | { readonly op: "ambience"; readonly key: string }
  | { readonly op: "stopAll" }
  | { readonly op: "seatPresence"; readonly seat: string; readonly present: boolean }
  | { readonly op: "seatMove"; readonly seat: string; readonly chair: number }
  | { readonly op: "seatNpc"; readonly characterKey: string; readonly chair: number }
  | { readonly op: "signalOff"; readonly color: string }
  | ({ readonly op: "playScene"; readonly key: string } & SceneClock)
  | { readonly op: "endScene" }
  | {
    readonly op: "upsertScene";
    readonly key: string;
    readonly title: string;
    readonly placementMode: PlacementMode;
    readonly sessionScene: Readonly<Record<string, unknown>>;
    /** Only used when TTS does not have the row yet; TTS keeps an existing row's status. */
    readonly status: SceneStatus;
  }
  | { readonly op: "setSceneStatus"; readonly key: string; readonly status: SceneStatus }
  | { readonly op: "deleteScene"; readonly key: string }
  | { readonly op: "unlinkScene" }
  | { readonly op: "forkScene"; readonly newTitle: string; readonly oldTitle?: string }
  | { readonly op: "stage"; readonly changes: StageChanges }
  | { readonly op: "stage"; readonly clear: true }
  | { readonly op: "stage"; readonly reset: true }
  | { readonly op: "scatterPlace"; readonly characterKey: string; readonly kind: "pc" | "npc"; readonly group?: number }
  | {
    readonly op: "genericAdd";
    readonly keys: readonly string[];
    readonly labels: Readonly<Record<string, string>>;
    /** Stat tier per key; a key left out has none (its type has no tier blocks). */
    readonly tiers?: Readonly<Record<string, NpcTier>>;
  }
  | { readonly op: "genericRename"; readonly key: string; readonly name: string }
  /** No `tier` clears it. */
  | { readonly op: "genericTier"; readonly key: string; readonly tier?: NpcTier }
  /** One click on an NPC's trackers; `max` (from the stat block) caps Health / Willpower damage. */
  | {
    readonly op: "npcTracker";
    readonly key: string;
    readonly which: NpcTrackerWhich;
    readonly mode: NpcTrackerMode;
    readonly max?: { readonly health?: number; readonly willpower?: number };
  };

export type NpcTrackerWhich = "health" | "willpower" | "hunger" | "rage";
export type NpcTrackerMode = "addSuper" | "addAgg" | "removeSuper" | "removeAgg" | "clearSuper" | "clearAgg" | "up" | "down";

export type ScenesSend = (command: ScenesCommand) => void;

/** The command sender: the table's queue on the Scenes tab, or a scene draft's editor in a preview. */
export const ScenesCommandContext = createContext<ScenesSend | null>(null);

export const useScenesCommand = (): ScenesSend => {
  const send = useContext(ScenesCommandContext);
  if (!send) {
    throw new Error("Scenes panels need a ScenesCommandContext provider (the Scenes tab or a scene draft).");
  }
  return send;
};

/** Generic NPCs waiting in the stage queue to be spawned, by catalog key → the name they will get. */
export const PendingGenericsContext = createContext<Readonly<Record<string, string>>>({});

/** The generic NPCs of the scene the roster adds to: a preview's draft; `null` is the table's (from the push). */
export const SceneGenericsContext = createContext<readonly GenericNpc[] | null>(null);

/** Stat tier of each generic NPC in the scene or waiting in the stage queue, by key (queued tiers win). */
export const GenericTiersContext = createContext<Readonly<Record<string, NpcTier>>>({});

export const isStageChanges = (command: ScenesCommand): command is Extract<ScenesCommand, { op: "stage"; changes: StageChanges }> =>
  command.op === "stage" && "changes" in command;

/** Every stage change in the list merged in order (a later change to the same NPC wins). */
export const mergedStageChanges = (commands: readonly ScenesCommand[]): StageChanges =>
  commands.reduce<StageChanges>((merged, command) => (isStageChanges(command) ? { ...merged, ...command.changes } : merged), {});

/**
 * Stage changes between two whole-stage commands (Clear, Reset) become one stage write at the place of the last
 * of them, so their figurines move together in one animation.
 */
const mergeStageRuns = (commands: readonly ScenesCommand[]): readonly ScenesCommand[] => {
  const out: ScenesCommand[] = [];
  let run: StageChanges | null = null;
  let runAt = -1;
  const close = (): void => {
    if (run) {
      out.splice(runAt, 0, { op: "stage", changes: run });
      run = null;
    }
  };
  for (const command of commands) {
    if (isStageChanges(command)) {
      run = { ...(run ?? {}), ...command.changes };
      runAt = out.length;
    } else {
      if (command.op === "stage") {
        close();
      }
      out.push(command);
    }
  }
  close();
  return out;
};

/**
 * A batch the queue gathered while TTS was busy. A dragged slider queues a volume per frame and a speed ring can
 * be clicked twice, so only the last volume per lane and the last real-time setting are worth sending; stage
 * edits merge into one write; every other command keeps its place.
 */
export const coalesceCommands = (commands: readonly ScenesCommand[]): readonly ScenesCommand[] => {
  const supersededKey = (command: ScenesCommand): string | null =>
    command.op === "laneVolume" ? `laneVolume:${command.lane}` : command.op === "realTime" ? "realTime" : null;
  const lastIndex = new Map<string, number>();
  commands.forEach((command, index) => {
    const key = supersededKey(command);
    if (key) {
      lastIndex.set(key, index);
    }
  });
  return mergeStageRuns(commands.filter((command, index) => {
    const key = supersededKey(command);
    return key === null || lastIndex.get(key) === index;
  }));
};
