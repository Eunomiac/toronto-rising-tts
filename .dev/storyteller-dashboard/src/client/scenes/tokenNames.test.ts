import { describe, expect, it } from "vitest";
import { captionClassForSide, nameAlignColor, nameLayoutForPolarSnap, nameLayoutForSeat, nextNameAlign } from "./tokenNames";
import type { ControlBoardSnaps, PolarSnap, SeatSnap } from "./types";

const snap = (row: Pick<PolarSnap, "snapIndex" | "familyId" | "u" | "ringIndex">): PolarSnap => ({
  snapKind: "polar",
  familyK: 0,
  isAnchor: true,
  rayIndex: 0,
  v: 0.5,
  defaultLightMode: "OFF",
  ...row
});

describe("nameLayoutForPolarSnap", () => {
  it("puts Mid Center names above the pack", () => {
    const snaps: ControlBoardSnaps = {
      generatedBy: "test",
      polar: [
        snap({ snapIndex: 901, familyId: "2:3", ringIndex: 2, u: 0.46 }),
        snap({ snapIndex: 902, familyId: "2:3", ringIndex: 2, u: 0.5 }),
        snap({ snapIndex: 903, familyId: "2:3", ringIndex: 2, u: 0.54 })
      ],
      seats: [],
      scatter: { areaOrder: [], areas: {} }
    };
    expect(nameLayoutForPolarSnap(snaps, snaps.polar[1]!).side).toBe("above");
    expect(captionClassForSide("above")).toBe("scenes-token-caption-above");
  });

  it("fans Far Left names to the left", () => {
    const snaps: ControlBoardSnaps = {
      generatedBy: "test",
      polar: [
        snap({ snapIndex: 910, familyId: "3:0", ringIndex: 3, u: 0.22 }),
        snap({ snapIndex: 911, familyId: "3:0", ringIndex: 3, u: 0.24 })
      ],
      seats: [],
      scatter: { areaOrder: [], areas: {} }
    };
    expect(nameLayoutForPolarSnap(snaps, snaps.polar[0]!).side).toBe("left");
    expect(nameLayoutForPolarSnap(snaps, snaps.polar[1]!).oy).not.toBe(
      nameLayoutForPolarSnap(snaps, snaps.polar[0]!).oy
    );
  });
});

describe("nameLayoutForSeat", () => {
  it("keeps chair names below the row and staggers them", () => {
    const seat: SeatSnap = {
      snapIndex: 50,
      snapKind: "seat",
      seatKey: "NPC99",
      kind: "npc",
      tableSlot: 9,
      u: 0.35,
      v: 0.12
    };
    expect(nameLayoutForSeat(seat, 9, 0).side).toBe("below");
    expect(nameLayoutForSeat(seat, 9, 1).side).toBe("below");
    expect(nameLayoutForSeat(seat, 9, 1).oy).not.toBe(nameLayoutForSeat(seat, 9, 0).oy);
    expect(nameLayoutForSeat(seat, 9, 0).align).toBe("center");
  });
});

describe("authored name offsets", () => {
  it("uses the saved polar dump as the starting layout", () => {
    const snaps: ControlBoardSnaps = {
      generatedBy: "test",
      polar: [snap({ snapIndex: 5, familyId: "1:0", ringIndex: 1, u: 0.4 })],
      seats: [],
      scatter: { areaOrder: [], areas: {} }
    };
    expect(nameLayoutForPolarSnap(snaps, snaps.polar[0]!)).toMatchObject({
      ox: 74,
      oy: -32,
      align: "center"
    });
  });

  it("uses the saved seat dump as the starting layout", () => {
    const seat: SeatSnap = {
      snapIndex: 50,
      snapKind: "seat",
      seatKey: "Red",
      kind: "pc",
      tableSlot: 3,
      u: 0.5,
      v: 0.12
    };
    expect(nameLayoutForSeat(seat, 9, 4)).toMatchObject({ ox: 0, oy: -75, align: "center" });
  });
});

describe("name alignment", () => {
  it("cycles center → left → right and color-codes each", () => {
    expect(nextNameAlign("center")).toBe("left");
    expect(nextNameAlign("left")).toBe("right");
    expect(nextNameAlign("right")).toBe("center");
    expect(nameAlignColor("center")).toBe("#00FF00");
    expect(nameAlignColor("left")).toBe("#FFFF00");
    expect(nameAlignColor("right")).toBe("#00FFFF");
  });
});
