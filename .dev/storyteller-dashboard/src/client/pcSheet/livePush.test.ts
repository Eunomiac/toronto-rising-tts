import { describe, expect, it } from "vitest";
import { emptySeat } from "./fixture.js";
import { mergeSeatPush } from "./livePush.js";
import type { SheetSnapshot } from "./types.js";

const live = (): SheetSnapshot => ({
  ok: true,
  seats: [
    { ...emptySeat("Red"), hunger: 1, playerData: { charKey: "red" } },
    { ...emptySeat("Pink"), hunger: 2, playerData: { charKey: "pink" } }
  ]
});

describe("mergeSeatPush", () => {
  it("replaces the pushed seat and keeps its playerData", () => {
    const { playerData: _omit, ...slim } = { ...emptySeat("Pink"), hunger: 4 };
    void _omit;
    const next = mergeSeatPush(live(), "Pink", slim);
    expect(next.seats[1]?.hunger).toBe(4);
    expect(next.seats[1]?.playerData).toEqual({ charKey: "pink" });
    expect(next.seats[0]?.hunger).toBe(1);
  });

  it("ignores pushes for an offline sheet or an unknown color", () => {
    const offline: SheetSnapshot = { ok: false, seats: [] };
    expect(mergeSeatPush(offline, "Pink", emptySeat("Pink"))).toBe(offline);
    const current = live();
    expect(mergeSeatPush(current, "Black", emptySeat("Pink"))).toBe(current);
    expect(mergeSeatPush(current, "Pink", undefined)).toBe(current);
  });

  it("appends a seat the snapshot did not have yet", () => {
    const next = mergeSeatPush(live(), "Brown", emptySeat("Brown"));
    expect(next.seats.map((row) => row.color)).toEqual(["Red", "Pink", "Brown"]);
    expect(next.seats[2]?.playerData).toEqual({});
  });

  it("reads a condition list that arrived as a numbered object", () => {
    const next = mergeSeatPush(live(), "Pink", {
      ...emptySeat("Pink"),
      personalCards: { "1": { id: "pc-1", title: "Late", displayType: "general", displayOnSheet: true, removalTrigger: "Manual", triggerLabel: "Manual" } }
    });
    expect(next.seats[1]?.personalCards).toEqual([
      expect.objectContaining({ id: "pc-1", title: "Late" })
    ]);
  });

  it("keeps conditions already on the seat when a push leaves them out", () => {
    const original = live();
    const current = {
      ...original,
      seats: original.seats.map((seat, index) => index === 1 ? {
        ...seat,
        personalCards: [{ id: "pc-1", title: "Late", displayType: "general", displayOnSheet: true, removalTrigger: "Manual", triggerLabel: "Manual" }]
      } : seat)
    };
    const { personalCards: _omit, ...slim } = { ...emptySeat("Pink"), hunger: 4, personalCards: undefined };
    void _omit;
    const next = mergeSeatPush(current, "Pink", slim);
    expect(next.seats[1]?.hunger).toBe(4);
    expect(next.seats[1]?.personalCards?.[0]?.title).toBe("Late");
  });
});
