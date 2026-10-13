import type { NpcTier } from "../../shared/npcStats";
import { TIER_LABELS } from "../npcTierBadges";
import type { SceneCatalogs } from "./catalogs";
import type { WorldState } from "../worldState";
import type { ScenesCommand, StageChange } from "./commands";
import { stageName as liveStageName } from "./liveScene";
import type { Describe } from "./queue";
import { isRemoval, spotLabel } from "./stage";
import { boardToStage, type StagePack } from "./stageFrame";

const OFF_STAGE = "off the stage";
const UNKNOWN = "?";

/**
 * Reads each queued change's current value from the world TTS last pushed, so a removed entry re-reads cleanly.
 * `spawning` names the generic NPCs the queue will spawn (catalog key → name).
 */
export const describeQueued = (
  world: WorldState,
  catalogs: SceneCatalogs | null,
  packs: readonly StagePack[] = [],
  spawning: Readonly<Record<string, string>> = {}
): Describe => {
  const people = [...(catalogs?.pcs ?? []), ...(catalogs?.namedNpcs ?? [])];
  const nameOf = (key: string | undefined): string =>
    key ? people.find((entry) => entry.characterKey === key)?.fullName ?? key : UNKNOWN;
  const generics = world.seats?.generics ?? [];
  const stageName = (key: string): string => spawning[key] ?? liveStageName(key, catalogs, generics);
  return (command: ScenesCommand) => {
    switch (command.op) {
      case "genericAdd": {
        const tiers = [...new Set(command.keys.flatMap((key) => (command.tiers?.[key] ? [TIER_LABELS[command.tiers[key]]] : [])))];
        return {
          subject: command.keys.map((key) => command.labels[key] ?? key).join(", "),
          from: "not spawned",
          to: `spawned (generic${tiers.length > 0 ? `, ${tiers.join(" / ")}` : ""})`
        };
      }
      case "genericRename": {
        const now = generics.find((npc) => npc.characterKey === command.key)?.name ?? command.key;
        return { subject: `Rename ${now}`, from: now, to: command.name.trim() };
      }
      case "genericTier": {
        const npc = generics.find((entry) => entry.characterKey === command.key);
        const tierText = (tier: NpcTier | undefined): string => (tier ? TIER_LABELS[tier] : "no tier");
        return { subject: `Tier of ${stageName(command.key)}`, from: tierText(npc?.tier), to: tierText(command.tier) };
      }
      case "stage": {
        if (!("changes" in command)) {
          throw new Error("Stage queue: Clear and Reset are never queued.");
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
        const names = keys.map(stageName);
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
          subject: command.kind === "pc" ? nameOf(command.characterKey) : stageName(command.characterKey),
          from: groupText(group?.group),
          to: groupText(command.group)
        };
      }
      default:
        throw new Error(`Stage queue: ${command.op} is not a stage edit.`);
    }
  };
};
