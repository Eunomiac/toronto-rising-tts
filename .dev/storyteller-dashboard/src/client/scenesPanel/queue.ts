import type { ScenesCommand } from "./commands";

/**
 * The stage queue. Stage board edits (moves, lights, adding and removing NPCs, Scatter groups) wait in a pop-up
 * over the board until Send, so a group of them lands together. Clear and Reset send the queue first, then
 * themselves. Every other command goes to TTS at once.
 */
export type CommandKind = "queue" | "flush" | "direct";

export const commandKind = (command: ScenesCommand): CommandKind => {
  if (command.op === "stage") {
    return "changes" in command ? "queue" : "flush";
  }
  return command.op === "scatterPlace" ? "queue" : "direct";
};

/** Queued commands with the same target replace each other, so the queue holds one entry per thing changed. */
export const queueTarget = (command: ScenesCommand): string => {
  switch (command.op) {
    case "stage":
      return "changes" in command ? `stage:${Object.keys(command.changes).sort().join(",")}` : "stage";
    case "scatterPlace":
      return `scatter:${command.characterKey}`;
    default:
      return command.op;
  }
};

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
