import { describe, expect, it } from "vitest";
import type { ScenesCommand } from "./commands";
import { addToQueue, commandKind, commandsToSend, pendingGenerics, queueLines, withoutPendingGeneric, withoutQueuedStage, type Describe, type QueueEntry } from "./queue";

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
    expect(commandKind({ op: "seatMove", seat: "NPC1", chair: 6 })).toBe("direct");
    expect(commandKind({ op: "seatNpc", characterKey: "victor", chair: 7 })).toBe("direct");
    expect(commandKind({ op: "lighting", presetKey: "AdminDark" })).toBe("direct");
    expect(commandKind({ op: "playScene", key: "s1", from: "scene", plusMinutes: 0, pace: "x2" })).toBe("direct");
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

  it("an NPC taking a chair loses their queued stage changes, everyone else keeps theirs", () => {
    let entries: readonly QueueEntry[] = addToQueue([], move("victor", 0.4), 1);
    entries = addToQueue(entries, { op: "stage", changes: { victor: { u: 0.2, v: 0.2 }, mira: { u: 0.3, v: 0.3 } } }, 2);
    expect(withoutQueuedStage(entries, "victor").map((entry) => entry.command)).toEqual([
      { op: "stage", changes: { mira: { u: 0.3, v: 0.3 } } }
    ]);
  });

  it("moving an NPC back to where it stands cancels its queued change", () => {
    let entries: readonly QueueEntry[] = addToQueue([], move("victor", 0.4), 1);
    entries = addToQueue(entries, move("victor", 0.1), 2);
    expect(queueLines(entries, describeAgainstTable)).toEqual([]);
  });
});

describe("pending generic NPCs", () => {
  const add = (key: string, name: string): ScenesCommand => ({ op: "genericAdd", keys: [key], labels: { [key]: name } });

  it("queues spawns and renames, a re-name replacing the spawn in place", () => {
    expect(commandKind(add("bouncer1", "Bouncer"))).toBe("queue");
    expect(commandKind({ op: "genericRename", key: "bouncer1", name: "Doorman" })).toBe("queue");
    let entries: readonly QueueEntry[] = addToQueue([], add("bouncer1", "Bouncer"), 1);
    entries = addToQueue(entries, move("bouncer1", 0.2), 2);
    entries = addToQueue(entries, add("bouncer1", "Doorman"), 3);
    expect(entries.map((entry) => entry.id)).toEqual([3, 2]);
    expect(pendingGenerics(entries.map((entry) => entry.command))).toEqual({ bouncer1: "Doorman" });
  });

  it("forgets an unspawned generic and its stage changes, leaving everyone else's", () => {
    let entries: readonly QueueEntry[] = addToQueue([], add("bouncer1", "Bouncer"), 1);
    entries = addToQueue(entries, { op: "stage", changes: { bouncer1: { u: 0.2, v: 0.2 }, victor: { u: 0.3, v: 0.3 } } }, 2);
    entries = addToQueue(entries, move("bouncer1", 0.4), 3);
    expect(withoutPendingGeneric(entries, "bouncer1").map((entry) => entry.command)).toEqual([
      { op: "stage", changes: { victor: { u: 0.3, v: 0.3 } } }
    ]);
  });
});
