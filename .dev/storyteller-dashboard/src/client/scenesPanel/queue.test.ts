import { describe, expect, it } from "vitest";
import type { ScenesCommand } from "./commands";
import { addToQueue, commandKind, commandsToSend, queueLines, type Describe, type QueueEntry } from "./queue";

const absent = (seat: string): ScenesCommand => ({ op: "seatPresence", seat, present: false });

/** Every seat starts in the scene; music starts on Main. */
const describeAgainstTable: Describe = (command) => {
  if (command.op === "seatPresence") {
    return { subject: command.seat, from: "in", to: command.present ? "in" : "out" };
  }
  if (command.op === "musicMood") {
    return { subject: "Music", from: "main", to: command.mood };
  }
  throw new Error(`unexpected ${command.op}`);
};

describe("commandKind", () => {
  it("queues small changes, flushes before multi-step actions and never holds volumes", () => {
    expect(commandKind(absent("Red"))).toBe("queue");
    expect(commandKind({ op: "ambience", key: "none" })).toBe("queue");
    expect(commandKind({ op: "playScene", key: "s1" })).toBe("flush");
    expect(commandKind({ op: "clockTo", datetime: { year: 2026, month: 9, day: 1, hour: 21, minute: 0 } })).toBe("flush");
    expect(commandKind({ op: "laneVolume", lane: "rain", volume: 0.5 })).toBe("direct");
  });
});

describe("queue entries", () => {
  it("collapses repeated edits of one target in place", () => {
    let entries: readonly QueueEntry[] = [];
    entries = addToQueue(entries, absent("Red"), 1);
    entries = addToQueue(entries, { op: "musicMood", mood: "combat" }, 2);
    entries = addToQueue(entries, { op: "musicSilent" }, 3);
    expect(entries.map((entry) => entry.id)).toEqual([1, 3]);
    expect(entries[1]?.command.op).toBe("musicSilent");
  });

  it("drops a change that would leave the table as it is, and Send skips it", () => {
    let entries: readonly QueueEntry[] = [];
    entries = addToQueue(entries, absent("Red"), 1);
    entries = addToQueue(entries, { op: "musicMood", mood: "main" }, 2);
    entries = addToQueue(entries, absent("Pink"), 3);
    const lines = queueLines(entries, describeAgainstTable);
    expect(lines.map((line) => line.id)).toEqual([1, 3]);
    expect(lines[0]).toMatchObject({ subject: "Red", from: "in", to: "out" });
    expect(commandsToSend(entries, lines)).toEqual([absent("Red"), absent("Pink")]);
  });

  it("toggling a seat back cancels its queued change", () => {
    let entries: readonly QueueEntry[] = addToQueue([], absent("Red"), 1);
    entries = addToQueue(entries, { op: "seatPresence", seat: "Red", present: true }, 2);
    expect(queueLines(entries, describeAgainstTable)).toEqual([]);
  });
});
