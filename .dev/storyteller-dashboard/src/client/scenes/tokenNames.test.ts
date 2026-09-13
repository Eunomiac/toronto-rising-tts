import { describe, expect, it } from "vitest";
import { captionClassForSide, nameLayoutForPolarSnap, nameLayoutForSeat } from "./tokenNames";
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
        snap({ snapIndex: 1, familyId: "2:3", ringIndex: 2, u: 0.46 }),
        snap({ snapIndex: 2, familyId: "2:3", ringIndex: 2, u: 0.5 }),
        snap({ snapIndex: 3, familyId: "2:3", ringIndex: 2, u: 0.54 })
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
        snap({ snapIndex: 10, familyId: "3:0", ringIndex: 3, u: 0.22 }),
        snap({ snapIndex: 11, familyId: "3:0", ringIndex: 3, u: 0.24 })
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
      seatKey: "NPC4",
      kind: "npc",
      tableSlot: 9,
      u: 0.35,
      v: 0.12
    };
    expect(nameLayoutForSeat(seat, 9, 0).side).toBe("below");
    expect(nameLayoutForSeat(seat, 9, 1).side).toBe("below");
    expect(nameLayoutForSeat(seat, 9, 1).oy).not.toBe(nameLayoutForSeat(seat, 9, 0).oy);
  });
});
