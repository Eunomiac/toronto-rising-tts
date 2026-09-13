import { describe, expect, it } from "vitest";
import { applyLeadLightToFamily, placeKeysOnPolarFamily, polarTokensInFamily } from "./groupRelocate";
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

describe("polarTokensInFamily", () => {
  it("returns only tokens sitting on that pack", () => {
    const snaps = snapsWith([
      snap({ familyId: "1:0", snapIndex: 1, familyK: 0 }),
      snap({ familyId: "1:1", snapIndex: 4, familyK: 0 })
    ]);
    const tokens = polarTokensInFamily(
      [
        { characterKey: "rashid", snapIndex: 1, npcLightMode: "OFF" },
        { characterKey: "lexie", snapIndex: 4, npcLightMode: "OFF" }
      ],
      "1:0",
      snaps
    );
    expect(tokens.map((token) => token.characterKey)).toEqual(["rashid"]);
  });
});

describe("applyLeadLightToFamily", () => {
  it("toggles the anchor light and copies it to the rest of the pack", () => {
    const snaps = snapsWith([
      snap({ familyId: "2:3", snapIndex: 1, familyK: 0 }),
      snap({ familyId: "2:3", snapIndex: 2, familyK: 1 }),
      snap({ familyId: "1:0", snapIndex: 9, familyK: 0 })
    ]);
    const next = applyLeadLightToFamily(
      [
        { characterKey: "lead", snapIndex: 1, npcLightMode: "OFF" },
        { characterKey: "neighbor", snapIndex: 2, npcLightMode: "STANDARD" },
        { characterKey: "other", snapIndex: 9, npcLightMode: "OFF" }
      ],
      "2:3",
      snaps
    );
    expect(next?.find((token) => token.characterKey === "lead")?.npcLightMode).toBe("STANDARD");
    expect(next?.find((token) => token.characterKey === "neighbor")?.npcLightMode).toBe("STANDARD");
    expect(next?.find((token) => token.characterKey === "other")?.npcLightMode).toBe("OFF");
  });
});
