import { describe, expect, it } from "vitest";
import {
  FAMILY_HANDLE_LAYOUT,
  familyHandleLayoutFor,
  layoutBoardFrame,
  nearestPolarSnap,
  polarAreaNameForFamily,
  sceneKeyFromTitle,
  tableChoiceIsSelected,
  tableChoiceKeys
} from "./payload";
import type { ControlBoardSnaps, PolarSnap } from "./types";

const polarSnap = (
  row: Pick<PolarSnap, "familyId" | "ringIndex" | "u" | "v"> & Partial<Pick<PolarSnap, "snapIndex">>
): PolarSnap => ({
  snapIndex: 1,
  snapKind: "polar",
  familyK: 0,
  isAnchor: true,
  rayIndex: 0,
  defaultLightMode: "OFF",
  ...row
});

const snapsWith = (polar: PolarSnap[]): ControlBoardSnaps => ({
  generatedBy: "test",
  polar,
  seats: [],
  scatter: { areaOrder: [], areas: {} }
});

describe("sceneKeyFromTitle", () => {
  it("returns untitledScene for empty titles", () => {
    expect(sceneKeyFromTitle("")).toBe("untitledScene");
    expect(sceneKeyFromTitle("   ")).toBe("untitledScene");
  });

  it("builds a camelCase key from words", () => {
    expect(sceneKeyFromTitle("The Elysium")).toBe("theElysium");
  });

  it("prefixes scene when the key would start with a digit", () => {
    expect(sceneKeyFromTitle("13th Precinct")).toBe("scene13thPrecinct");
  });
});

describe("family handle layout", () => {
  const farLeft = snapsWith([
    polarSnap({ familyId: "3:0", ringIndex: 3, u: 0.22, v: 0.58 }),
    polarSnap({ familyId: "3:0", ringIndex: 3, u: 0.28, v: 0.62 })
  ]);

  const centerRing = snapsWith([
    polarSnap({ familyId: "1:0", ringIndex: 1, u: 0.5, v: 0.47 }),
    polarSnap({ familyId: "1:1", ringIndex: 1, u: 0.36, v: 0.43 }),
    polarSnap({ familyId: "1:7", ringIndex: 1, u: 0.64, v: 0.43 })
  ]);

  it("uses the Inspector-authored CSS box for Far Left", () => {
    expect(polarAreaNameForFamily(farLeft, "3:0")).toBe("Far Left");
    expect(familyHandleLayoutFor(farLeft, "3:0")).toEqual(FAMILY_HANDLE_LAYOUT["Far Left"]);
  });

  it("uses the Inspector-authored CSS box for CENTER and side packs", () => {
    expect(polarAreaNameForFamily(centerRing, "1:0")).toBe("CENTER");
    expect(familyHandleLayoutFor(centerRing, "1:0")).toEqual(FAMILY_HANDLE_LAYOUT.CENTER);
    expect(familyHandleLayoutFor(centerRing, "1:1")?.leftPct).toBe(36.8);
    expect(familyHandleLayoutFor(centerRing, "1:7")?.leftPct).toBe(63.2);
  });
});

describe("tableChoiceKeys", () => {
  it("collapses Table B variants into one family button", () => {
    expect(tableChoiceKeys([
      { key: "Table A" },
      { key: "Table B0" },
      { key: "Table B4" },
      { key: "Table C" }
    ])).toEqual(["Table A", "Table B", "Table C"]);
  });

  it("treats B variants as the Table B choice", () => {
    expect(tableChoiceIsSelected("Table B", "Table B2")).toBe(true);
    expect(tableChoiceIsSelected("Table B", "Table A")).toBe(false);
  });
});

describe("layoutBoardFrame", () => {
  it("fits the crop window inside the wrap without covering past it", () => {
    const layout = layoutBoardFrame(1000, 500, 3000, 1500);
    const cropW = 0.8 * layout.width;
    const cropH = 0.8 * layout.height;
    expect(cropW).toBeLessThanOrEqual(1000 + 1);
    expect(cropH).toBeLessThanOrEqual(500 + 1);
    expect(layout.left).toBeLessThanOrEqual(1);
  });
});

describe("nearestPolarSnap", () => {
  it("stays inside the nearer family even if another pack has a slightly closer member", () => {
    const snaps = snapsWith([
      polarSnap({ familyId: "1:0", ringIndex: 1, u: 0.5, v: 0.5, snapIndex: 1 }),
      polarSnap({ familyId: "1:0", ringIndex: 1, u: 0.52, v: 0.5, snapIndex: 2 }),
      polarSnap({ familyId: "2:3", ringIndex: 2, u: 0.56, v: 0.5, snapIndex: 3 })
    ]);
    const hit = nearestPolarSnap(snaps, 0.53, 0.5, 0.12);
    expect(hit?.familyId).toBe("1:0");
    expect(hit?.snapIndex).toBe(2);
  });
});
