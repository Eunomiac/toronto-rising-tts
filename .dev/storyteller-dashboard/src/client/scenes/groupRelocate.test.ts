import { describe, expect, it } from "vitest";
import { placeKeysOnPolarFamily } from "./groupRelocate";
import type { ControlBoardSnaps, PolarSnap } from "./types";

const snap = (
  row: Pick<PolarSnap, "familyId" | "snapIndex" | "familyK"> & Partial<PolarSnap>
): PolarSnap => ({
  snapKind: "polar",
  ringIndex: 1,
  rayIndex: 0,
  isAnchor: row.familyK === 0,
  u: 0.5,
  v: 0.5,
  defaultLightMode: "OFF",
  ...row
});

const snapsWith = (polar: PolarSnap[]): ControlBoardSnaps => ({
  generatedBy: "test",
  polar,
  seats: [],
  scatter: { areaOrder: [], areas: {} }
});

describe("placeKeysOnPolarFamily", () => {
  it("puts the first drawer NPC on the family anchor", () => {
    const snaps = snapsWith([
      snap({ familyId: "2:3", snapIndex: 2, familyK: -1 }),
      snap({ familyId: "2:3", snapIndex: 1, familyK: 0 }),
      snap({ familyId: "2:3", snapIndex: 3, familyK: 1 })
    ]);
    const next = placeKeysOnPolarFamily([], ["myleneHamelin", "zuriOluwusi"], "2:3", snaps);
    expect(next[0]?.characterKey).toBe("myleneHamelin");
    expect(next[0]?.snapIndex).toBe(1);
    expect(next[1]?.snapIndex).toBe(2);
  });
});
