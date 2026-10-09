import { createContext, useContext } from "react";
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
export type SoundLane = "music" | "location" | "featured" | "rain" | "wind";

/** One Scenes tab command for `GlobalDashboardScenesApply` (`dashboard/scenes.ttslua` lists what each does). */
export type ScenesCommand =
  | { readonly op: "phaseAdvance" }
  | { readonly op: "playSubPhase"; readonly subPhase: string }
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
  | { readonly op: "endScene" };

export type ScenesSend = (command: ScenesCommand) => void;

/** The Scenes tab's command sender; `null` (the Lab) leaves the panels on their mock state. */
export const ScenesCommandContext = createContext<ScenesSend | null>(null);

export const useScenesCommand = (): ScenesSend | null => useContext(ScenesCommandContext);

/**
 * A batch the queue gathered while TTS was busy. A dragged slider queues a volume per frame and a speed ring can
 * be clicked twice, so only the last volume per lane and the last real-time setting are worth sending; every
 * other command keeps its place.
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
  return commands.filter((command, index) => {
    const key = supersededKey(command);
    return key === null || lastIndex.get(key) === index;
  });
};
