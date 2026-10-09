import { createContext, useContext } from "react";
import type { PlacementMode } from "../../shared/sceneLibrary";
import type { ClockDatetime } from "../worldState";

/** How a scene switch sets the clock (`PresentDayClock.resolveAndApplyActivationClock`). */
export type SceneClockMode =
  | "scene"
  | "x5"
  | "setPresent"
  | "present"
  | "presentPlus15"
  | "presentPlus30"
  | "presentPlus60"
  | "presentPlus120";

/** Storyteller lanes `Soundscape.setStorytellerLaneVolume` accepts. */
export type SoundLane = "music" | "location" | "featured" | "rain" | "wind" | "thunder";

/** Storyteller lighting presets (`HUD_selectAdminLightingScene`). */
export type LightingPreset = "AdminDark" | "AdminStandard" | "AdminBright";

export const LIGHTING_LABEL: Readonly<Record<LightingPreset, string>> = { AdminDark: "Dark", AdminStandard: "Standard", AdminBright: "Bright" };

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
  | { readonly op: "playSubPhase"; readonly subPhase: "Main" | "Downtime" }
  | { readonly op: "memoriam"; readonly payload: MemoriamPayload }
  | { readonly op: "location"; readonly districtKey: string; readonly siteKey: string }
  | { readonly op: "skybox"; readonly key: string }
  | { readonly op: "topFog"; readonly on: boolean }
  | { readonly op: "lighting"; readonly presetKey: LightingPreset }
  | { readonly op: "table"; readonly key: string }
  | { readonly op: "conditions"; readonly ids: readonly string[] }
  | { readonly op: "weatherOverride"; readonly rain: RainKey; readonly wind: 0 | 1 | 2 | 3; readonly thunder: boolean }
  | { readonly op: "weatherOverride"; readonly release: true }
  | { readonly op: "sessionNum"; readonly num: number }
  | { readonly op: "sessionName"; readonly name: string }
  | { readonly op: "spotlightRotate"; readonly delta: number }
  | { readonly op: "spotlightFront"; readonly color: string }
  | { readonly op: "realTime"; readonly running: boolean; readonly speed?: number }
  | { readonly op: "clockTo"; readonly datetime: ClockDatetime }
  | { readonly op: "presentDay"; readonly datetime: ClockDatetime }
  | { readonly op: "musicMood"; readonly mood: "main" | "combat" | "intrigue" }
  | { readonly op: "musicSilent" }
  | { readonly op: "locationMusic"; readonly key: string }
  | { readonly op: "laneVolume"; readonly lane: SoundLane; readonly volume: number }
  | { readonly op: "featuredPlay"; readonly key: string }
  | { readonly op: "featuredStop" }
  | { readonly op: "ambience"; readonly key: string }
  | { readonly op: "stopAll" }
  | { readonly op: "seatPresence"; readonly seat: string; readonly present: boolean }
  | { readonly op: "playScene"; readonly key: string; readonly clockMode?: SceneClockMode }
  | { readonly op: "endScene" }
  | {
    readonly op: "upsertScene";
    readonly key: string;
    readonly title: string;
    readonly placementMode: PlacementMode;
    readonly sessionScene: Readonly<Record<string, unknown>>;
  }
  | { readonly op: "deleteScene"; readonly key: string }
  | { readonly op: "unlinkScene" }
  | { readonly op: "forkScene"; readonly newTitle: string; readonly oldTitle?: string }
  | { readonly op: "stage"; readonly changes: StageChanges }
  | { readonly op: "stage"; readonly clear: true }
  | { readonly op: "stage"; readonly reset: true }
  | { readonly op: "scatterPlace"; readonly characterKey: string; readonly kind: "pc" | "npc"; readonly group?: number }
  | { readonly op: "genericAdd"; readonly keys: readonly string[]; readonly labels: Readonly<Record<string, string>> };

export type ScenesSend = (command: ScenesCommand) => void;

/** The Scenes tab's command sender; `null` (the Lab) leaves the panels on their mock state. */
export const ScenesCommandContext = createContext<ScenesSend | null>(null);

export const useScenesCommand = (): ScenesSend | null => useContext(ScenesCommandContext);

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
