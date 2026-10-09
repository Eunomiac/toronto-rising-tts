import type { ScenesCommand } from "./commands";

/**
 * Send / Live queue for the Scenes tab. In Live mode every command goes to TTS at once; in Queued mode the small
 * changes below wait for Send so a group of them lands together. Multi-step actions never wait: they send the
 * queue first, then themselves. Volumes, real time and the spotlight carousel always go straight through.
 */
export type SendMode = "live" | "queued";

export type CommandKind = "queue" | "flush" | "direct";

export const commandKind = (command: ScenesCommand): CommandKind => {
  switch (command.op) {
    case "seatPresence":
    case "musicMood":
    case "musicSilent":
    case "locationMusic":
    case "featuredPlay":
    case "featuredStop":
    case "ambience":
    case "skybox":
    case "topFog":
    case "lighting":
    case "conditions":
    case "weatherOverride":
      return "queue";
    case "laneVolume":
    case "realTime":
    case "spotlightRotate":
    case "spotlightFront":
    case "stopAll":
      return "direct";
    case "phaseAdvance":
    case "playSubPhase":
    case "memoriam":
    case "location":
    case "table":
    case "sessionNum":
    case "sessionName":
    case "clockTo":
    case "presentDay":
    case "playScene":
    case "endScene":
    case "upsertScene":
    case "deleteScene":
    case "unlinkScene":
    case "forkScene":
      return "flush";
  }
};

/** Queued commands with the same target replace each other, so the queue holds one entry per thing changed. */
export const queueTarget = (command: ScenesCommand): string => {
  switch (command.op) {
    case "seatPresence":
      return `seat:${command.seat}`;
    case "musicMood":
    case "musicSilent":
    case "locationMusic":
      return "music";
    case "featuredPlay":
    case "featuredStop":
      return "featured";
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

/** Lines for the panel; a change that would leave the table as it is drops out of the count. */
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

const MODE_KEY = "tr-scenes-send-mode";

export const loadSendMode = (): SendMode => (window.localStorage.getItem(MODE_KEY) === "queued" ? "queued" : "live");

export const saveSendMode = (mode: SendMode): void => window.localStorage.setItem(MODE_KEY, mode);
