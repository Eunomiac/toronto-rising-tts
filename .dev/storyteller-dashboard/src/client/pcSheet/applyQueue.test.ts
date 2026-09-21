import { describe, expect, it, vi } from "vitest";
import { createApplyQueue } from "./applyQueue.js";
import type { ApplyCommand, SheetSnapshot } from "./types.js";

const hunger = (delta: number): ApplyCommand => ({ op: "hunger", color: "Pink", delta });

const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const okSnapshot = (hungerValue: number): SheetSnapshot => ({
  ok: true,
  seats: [{
    color: "Pink",
    charKey: "test",
    charName: "Test",
    playerName: "P",
    desire: "",
    absentFromSession: false,
    deferAutoSeat: false,
    deferConnect: false,
    attributes: {},
    skills: {},
    specialties: [],
    health: { base: 4, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
    willpower: { base: 3, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
    humanity: { base: 7, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
    bloodPotency: { base: 1, temp: 0, disabled: 0 },
    xp: 0,
    hunger: hungerValue,
    hungerMax: 5,
    resolvedStatChanges: {},
    badges: {},
    bloodSurge: 1,
    mending: 1,
    healthMax: 4,
    willpowerMax: 3,
    humanityMax: 7,
    torpor: false,
    hudFrenzy: false,
    hudBlindfold: false
  }]
});

describe("createApplyQueue", () => {
  it("holds TTS replies until the queue is empty so a slow apply cannot rewind later clicks", async () => {
    const first = deferred<SheetSnapshot>();
    const second = deferred<SheetSnapshot>();
    const sends = [first, second];
    const send = vi.fn(() => {
      const next = sends.shift();
      if (next === undefined) {
        throw new Error("unexpected send");
      }
      return next.promise;
    });
    const onSettled = vi.fn();
    const onFailure = vi.fn();
    const onPendingChange = vi.fn();
    const queue = createApplyQueue({ send, onSettled, onFailure, onPendingChange });

    queue.enqueue(hunger(1));
    queue.enqueue(hunger(1));
    first.resolve(okSnapshot(2));
    await vi.waitFor(() => {
      expect(send).toHaveBeenCalledTimes(2);
    });
    expect(onSettled).not.toHaveBeenCalled();

    second.resolve(okSnapshot(3));
    await vi.waitFor(() => {
      expect(onSettled).toHaveBeenCalledTimes(1);
    });
    expect(onSettled.mock.calls[0]?.[0]).toEqual(okSnapshot(3));
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("drops remaining commands and reports failure when TTS rejects an apply", async () => {
    const first = deferred<SheetSnapshot>();
    const send = vi.fn(() => first.promise);
    const onSettled = vi.fn();
    const onFailure = vi.fn();
    const queue = createApplyQueue({
      send,
      onSettled,
      onFailure,
      onPendingChange: vi.fn()
    });
    queue.enqueue(hunger(1));
    queue.enqueue(hunger(1));
    first.resolve({ ok: false, error: "No player for color Pink", seats: [] });
    await vi.waitFor(() => {
      expect(onFailure).toHaveBeenCalledTimes(1);
    });
    expect(onSettled).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.pending).toBe(0);
  });
});
