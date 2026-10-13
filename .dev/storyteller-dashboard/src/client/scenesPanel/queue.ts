import type { NpcTier } from "../../shared/npcStats";
import type { GenericNpc } from "../worldState";
import { isStageChanges, type ScenesCommand } from "./commands";

/**
 * The stage queue. Stage board edits (moves, lights, adding and removing NPCs, Scatter groups, spawning and
 * renaming generic NPCs) wait in a pop-up over the board until Send, so a group of them lands together. Clear and
 * Reset send the queue first, then themselves. Every other command goes to TTS at once.
 */
export type CommandKind = "queue" | "flush" | "direct";

const QUEUED_OPS: ReadonlySet<ScenesCommand["op"]> = new Set(["scatterPlace", "genericAdd", "genericRename", "genericTier"]);

export const commandKind = (command: ScenesCommand): CommandKind => {
  if (command.op === "stage") {
    return "changes" in command ? "queue" : "flush";
  }
  return QUEUED_OPS.has(command.op) ? "queue" : "direct";
};

/** Queued commands with the same target replace each other, so the queue holds one entry per thing changed. */
export const queueTarget = (command: ScenesCommand): string => {
  switch (command.op) {
    case "stage":
      return "changes" in command ? `stage:${Object.keys(command.changes).sort().join(",")}` : "stage";
    case "scatterPlace":
      return `scatter:${command.characterKey}`;
    case "genericAdd":
      return `generic:${[...command.keys].sort().join(",")}`;
    case "genericRename":
      return `genericName:${command.key}`;
    case "genericTier":
      return `genericTier:${command.key}`;
    default:
      return command.op;
  }
};

/** Generic NPCs a queued `genericAdd` will spawn, by catalog key → name. */
export const pendingGenerics = (commands: readonly ScenesCommand[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const command of commands) {
    if (command.op === "genericAdd") {
      for (const key of command.keys) {
        out[key] = command.labels[key] ?? key;
      }
    }
  }
  return out;
};

/** Generic NPCs a queued `genericRename` will rename, by key → new name. */
export const pendingRenames = (commands: readonly ScenesCommand[]): Record<string, string> =>
  Object.fromEntries(commands.flatMap((command) => (command.op === "genericRename" ? [[command.key, command.name]] : [])));

/**
 * Each generic NPC's stat tier once the queue is sent: the scene's own, then queued spawns and tier changes in order
 * (a cleared tier drops out).
 */
export const genericTiers = (generics: readonly GenericNpc[], commands: readonly ScenesCommand[]): Record<string, NpcTier> => {
  const out: Record<string, NpcTier> = {};
  for (const npc of generics) {
    if (npc.tier) {
      out[npc.characterKey] = npc.tier;
    }
  }
  for (const command of commands) {
    if (command.op === "genericAdd") {
      for (const key of command.keys) {
        const tier = command.tiers?.[key];
        if (tier) {
          out[key] = tier;
        } else {
          delete out[key];
        }
      }
    } else if (command.op === "genericTier") {
      if (command.tier) {
        out[command.key] = command.tier;
      } else {
        delete out[command.key];
      }
    }
  }
  return out;
};

/** A `genericAdd` for some of its keys only (`null` when none are left). */
export const genericAddFor = (command: Extract<ScenesCommand, { op: "genericAdd" }>, keep: (key: string) => boolean): ScenesCommand | null => {
  const keys = command.keys.filter(keep);
  if (keys.length === 0) {
    return null;
  }
  const labels = Object.fromEntries(Object.entries(command.labels).filter(([key]) => keep(key)));
  const tiers = Object.entries(command.tiers ?? {}).filter(([key]) => keep(key));
  return { op: "genericAdd", keys, labels, ...(tiers.length > 0 ? { tiers: Object.fromEntries(tiers) } : {}) };
};

/** Drop every queued stage change for one NPC (an NPC who takes a chair must not go back on the stage at Send). */
export const withoutQueuedStage = (entries: readonly QueueEntry[], key: string): readonly QueueEntry[] =>
  entries.flatMap((entry): QueueEntry[] => {
    const { command } = entry;
    if (!isStageChanges(command) || !(key in command.changes)) {
      return [entry];
    }
    const changes = Object.fromEntries(Object.entries(command.changes).filter(([other]) => other !== key));
    if (Object.keys(changes).length === 0) {
      return [];
    }
    const next: ScenesCommand = { op: "stage", changes };
    return [{ ...entry, target: queueTarget(next), command: next }];
  });

/**
 * Forget a generic NPC that has not been spawned yet: its `genericAdd` and every queued stage change for it go,
 * so taking it off the stage before Send never spawns it at all.
 */
export const withoutPendingGeneric = (entries: readonly QueueEntry[], key: string): readonly QueueEntry[] =>
  withoutQueuedStage(entries.flatMap((entry): QueueEntry[] => {
    const { command } = entry;
    if (command.op !== "genericAdd" || !command.keys.includes(key)) {
      return [entry];
    }
    const next = genericAddFor(command, (other) => other !== key);
    return next ? [{ ...entry, target: queueTarget(next), command: next }] : [];
  }), key);

export type QueueEntry = { readonly id: number; readonly target: string; readonly command: ScenesCommand };

/** A repeated target keeps its place in the list with the newer command. */
export const addToQueue = (entries: readonly QueueEntry[], command: ScenesCommand, id: number): readonly QueueEntry[] => {
  const target = queueTarget(command);
  const index = entries.findIndex((entry) => entry.target === target);
  if (index < 0) {
    return [...entries, { id, target, command }];
  }
  return entries.map((entry, at) => (at === index ? { id, target, command } : entry));
};

/** What one queued change does: the thing changed, its value on the table now, and the value it will get. */
export type QueueLine = { readonly id: number; readonly subject: string; readonly from: string; readonly to: string };

export type Describe = (command: ScenesCommand) => { readonly subject: string; readonly from: string; readonly to: string };

/** Lines for the pop-up; a change that would leave the table as it is drops out of the count. */
export const queueLines = (entries: readonly QueueEntry[], describe: Describe): readonly QueueLine[] =>
  entries.flatMap((entry) => {
    const line = describe(entry.command);
    return line.from === line.to ? [] : [{ id: entry.id, ...line }];
  });

/** The commands Send delivers: the queue's live lines, in order. */
export const commandsToSend = (entries: readonly QueueEntry[], lines: readonly QueueLine[]): readonly ScenesCommand[] => {
  const live = new Set(lines.map((line) => line.id));
  return entries.filter((entry) => live.has(entry.id)).map((entry) => entry.command);
};
