import { describe, expect, it } from "vitest";
import { nameTranslateXForSnap } from "./tokenNames";
import type { ControlBoardSnaps, PolarSnap } from "./types";

const snap = (row: Pick<PolarSnap, "snapIndex" | "familyId" | "u">): PolarSnap => ({
  snapKind: "polar",
  ringIndex: 2,
  familyK: 0,
  isAnchor: true,
  rayIndex: 0,
  v: 0.5,
  defaultLightMode: "OFF",
  ...row
});

describe("nameTranslateXForSnap", () => {
  it("pushes Mid Center names outward from the family middle", () => {
    const snaps: ControlBoardSnaps = {
      generatedBy: "test",
      polar: [
        snap({ snapIndex: 1, familyId: "2:3", u: 0.46 }),
        snap({ snapIndex: 2, familyId: "2:3", u: 0.5 }),
        snap({ snapIndex: 3, familyId: "2:3", u: 0.54 })
      ],
      seats: [],
      scatter: { areaOrder: [], areas: {} }
    };
    expect(nameTranslateXForSnap(snaps, snaps.polar[0]!)).toBe(-90);
    expect(nameTranslateXForSnap(snaps, snaps.polar[1]!)).toBe(-50);
    expect(nameTranslateXForSnap(snaps, snaps.polar[2]!)).toBe(-10);
  });
});
