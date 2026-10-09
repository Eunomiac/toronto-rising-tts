import { describe, expect, it } from "vitest";
import type { ScenesCommand } from "./commands";
import { addToQueue, commandKind, commandsToSend, queueLines, type Describe, type QueueEntry } from "./queue";

const move = (key: string, u: number): ScenesCommand => ({ op: "stage", changes: { [key]: { u, v: 0.5 } } });
const scatter = (key: string, group?: number): ScenesCommand =>
  group === undefined ? { op: "scatterPlace", characterKey: key, kind: "npc" } : { op: "scatterPlace", characterKey: key, kind: "npc", group };

/** Every NPC starts at u 0.1, outside any Scatter group. */
const describeAgainstTable: Describe = (command) => {
  if (command.op === "stage" && "changes" in command) {
    const [key, change] = Object.entries(command.changes)[0] ?? [];
    return { subject: key ?? "", from: "0.1", to: change && "u" in change ? String(change.u) : "off" };
  }
  if (command.op === "scatterPlace") {
    return { subject: command.characterKey, from: "none", to: String(command.group ?? "none") };
  }
  throw new Error(`unexpected ${command.op}`);
};

describe("commandKind", () => {
  it("queues only stage board edits; Clear and Reset send the queue first; the rest goes straight to TTS", () => {
    expect(commandKind(move("victor", 0.4))).toBe("queue");
    expect(commandKind(scatter("victor", 2))).toBe("queue");
    expect(commandKind({ op: "stage", clear: true })).toBe("flush");
    expect(commandKind({ op: "seatPresence", seat: "Red", present: false })).toBe("direct");
    expect(commandKind({ op: "lighting", presetKey: "AdminDark" })).toBe("direct");
    expect(commandKind({ op: "playScene", key: "s1" })).toBe("direct");
  });
});

describe("queue entries", () => {
  it("collapses repeated edits of one target in place", () => {
    let entries: readonly QueueEntry[] = [];
    entries = addToQueue(entries, move("victor", 0.4), 1);
    entries = addToQueue(entries, scatter("mira", 1), 2);
    entries = addToQueue(entries, move("victor", 0.6), 3);
    expect(entries.map((entry) => entry.id)).toEqual([3, 2]);
  });

  it("drops a change that would leave the table as it is, and Send skips it", () => {
    let entries: readonly QueueEntry[] = [];
    entries = addToQueue(entries, move("victor", 0.4), 1);
    entries = addToQueue(entries, move("mira", 0.1), 2);
    entries = addToQueue(entries, scatter("rex", 3), 3);
    const lines = queueLines(entries, describeAgainstTable);
    expect(lines.map((line) => line.id)).toEqual([1, 3]);
    expect(commandsToSend(entries, lines)).toEqual([move("victor", 0.4), scatter("rex", 3)]);
  });

  it("moving an NPC back to where it stands cancels its queued change", () => {
    let entries: readonly QueueEntry[] = addToQueue([], move("victor", 0.4), 1);
    entries = addToQueue(entries, move("victor", 0.1), 2);
    expect(queueLines(entries, describeAgainstTable)).toEqual([]);
  });
});
