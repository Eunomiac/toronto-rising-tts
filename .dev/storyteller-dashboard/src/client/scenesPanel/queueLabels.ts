import { ambientLabel, featuredLabel } from "./glance";
import type { SceneCatalogs } from "./catalogs";
import type { WorldState } from "../worldState";
import { LIGHTING_LABEL, type ScenesCommand, type StageChange } from "./commands";
import {
  LOCATION_MUSIC_LABEL,
  MOOD_LABEL,
  lightingPreset,
  precipOf,
  sceneConditions,
  skyLabel,
  soundView,
  stageName,
  weatherOverride,
  weatherText
} from "./liveScene";
import type { Describe } from "./queue";
import { isRemoval, spotLabel } from "./stage";
import { boardToStage, type StagePack } from "./stageFrame";

const OFF_STAGE = "off the stage";
const IN_SCENE = "in the scene";
const OUT_OF_SCENE = "out of the scene";
const STOPPED = "stopped";
const ON = "on";
const OFF = "off";
const SCHEDULE = "schedule";
const UNKNOWN = "?";

/** Reads each queued change's current value from the world TTS last pushed, so a removed entry re-reads cleanly. */
export const describeQueued = (world: WorldState, catalogs: SceneCatalogs | null, packs: readonly StagePack[] = []): Describe => {
  const people = [...(catalogs?.pcs ?? []), ...(catalogs?.namedNpcs ?? [])];
  const nameOf = (key: string | undefined): string =>
    key ? people.find((entry) => entry.characterKey === key)?.fullName ?? key : UNKNOWN;
  const sound = world.soundscape ? soundView(world.soundscape) : null;
  const scene = world.scene;
  const conditionList = (ids: readonly string[]): string =>
    ids.length === 0 ? "none" : ids.map((id) => catalogs?.conditions.find((entry) => entry.id === id)?.displayName ?? id).join(", ");
  return (command: ScenesCommand) => {
    switch (command.op) {
      case "seatPresence": {
        const row = world.seats?.seats.find((entry) => entry.seat === command.seat);
        const who = row?.kind === "npc" ? row.characterKey : row?.playingNpcKey ?? row?.charKey;
        return {
          subject: nameOf(who),
          from: row ? (row.isPresent ? IN_SCENE : OUT_OF_SCENE) : UNKNOWN,
          to: command.present ? IN_SCENE : OUT_OF_SCENE
        };
      }
      case "musicMood":
        return { subject: "Music", from: sound?.playlist ?? UNKNOWN, to: MOOD_LABEL[command.mood] ?? command.mood };
      case "musicSilent":
        return { subject: "Music", from: sound?.playlist ?? UNKNOWN, to: "Silent" };
      case "locationMusic":
        return { subject: "Music", from: sound?.playlist ?? UNKNOWN, to: LOCATION_MUSIC_LABEL[command.key] ?? command.key };
      case "featuredPlay":
      case "featuredStop": {
        const from = sound ? (sound.featuredPlaying ? featuredLabel(sound.featuredKey) : STOPPED) : UNKNOWN;
        return { subject: "Featured", from, to: command.op === "featuredPlay" ? featuredLabel(command.key) : STOPPED };
      }
      case "ambience":
        return {
          subject: "Ambience",
          from: sound ? (sound.ambient ? ambientLabel(sound.ambient) : "Silent") : UNKNOWN,
          to: command.key === "none" ? "Silent" : ambientLabel(command.key)
        };
      case "skybox":
        return {
          subject: "Sky",
          from: scene ? skyLabel(scene, catalogs) : UNKNOWN,
          to: scene ? skyLabel({ ...scene, skyboxOverride: command.key === "none" ? undefined : command.key }, catalogs) : command.key
        };
      case "topFog":
        return { subject: "Top fog", from: scene ? (scene.topFog ? ON : OFF) : UNKNOWN, to: command.on ? ON : OFF };
      case "lighting": {
        const preset = scene ? lightingPreset(scene) : undefined;
        return { subject: "Lighting", from: preset ? LIGHTING_LABEL[preset] : UNKNOWN, to: LIGHTING_LABEL[command.presetKey] };
      }
      case "conditions":
        return {
          subject: "Scene conditions",
          from: scene ? conditionList(sceneConditions(scene)) : UNKNOWN,
          to: conditionList(command.ids)
        };
      case "weatherOverride": {
        const held = scene ? weatherOverride(scene) : null;
        return {
          subject: "Weather",
          from: scene ? (held ? weatherText(held) : SCHEDULE) : UNKNOWN,
          to: "release" in command ? SCHEDULE : weatherText({ precip: precipOf(command.rain), wind: command.wind, thunder: command.thunder })
        };
      }
      case "stage": {
        if (!("changes" in command)) {
          throw new Error("Scenes queue: Clear and Reset are never queued.");
        }
        const keys = Object.keys(command.changes).sort();
        const stage = world.seats?.stage ?? [];
        const where = (key: string, change?: StageChange): string => {
          if (change && isRemoval(change)) {
            return OFF_STAGE;
          }
          const now = stage.find((npc) => npc.characterKey === key);
          const u = change?.u ?? now?.u;
          const v = change?.v ?? now?.v;
          if (u === undefined || v === undefined) {
            return OFF_STAGE;
          }
          const lit = change?.lightMode ?? now?.lightMode ?? "STANDARD";
          return `${spotLabel(boardToStage(u, v), packs)}${lit === "OFF" ? " (dark)" : ""}`;
        };
        const names = keys.map((key) => stageName(key, catalogs, world.seats?.generics ?? []));
        return {
          subject: names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", "),
          from: keys.map((key) => where(key)).join("; "),
          to: keys.map((key) => where(key, command.changes[key])).join("; ")
        };
      }
      case "scatterPlace": {
        const group = world.seats?.scatter.find((entry) =>
          [...entry.pcs, ...entry.npcs].some((member) => member.characterKey === command.characterKey));
        const groupText = (n: number | undefined): string => (n === undefined ? OFF_STAGE : `group ${n}`);
        return {
          subject: command.kind === "pc" ? nameOf(command.characterKey) : stageName(command.characterKey, catalogs, world.seats?.generics ?? []),
          from: groupText(group?.group),
          to: groupText(command.group)
        };
      }
      default:
        throw new Error(`Scenes queue: no label for ${command.op}; it is not a queued command.`);
    }
  };
};
