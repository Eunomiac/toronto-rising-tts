import { describe, expect, it } from "vitest";
import {
  familyLabelUv,
  polarAreaNameForFamily,
  sceneKeyFromTitle,
  tableChoiceIsSelected,
  tableChoiceKeys
} from "./payload";
import type { ControlBoardSnaps, PolarSnap } from "./types";

const polarSnap = (row: Pick<PolarSnap, "familyId" | "ringIndex" | "u" | "v">): PolarSnap => ({
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

describe("familyLabelUv", () => {
  const farLeft = snapsWith([
    polarSnap({ familyId: "3:0", ringIndex: 3, u: 0.22, v: 0.58 }),
    polarSnap({ familyId: "3:0", ringIndex: 3, u: 0.28, v: 0.62 })
  ]);

  const centerRing = snapsWith([
    polarSnap({ familyId: "1:0", ringIndex: 1, u: 0.5, v: 0.47 }),
    polarSnap({ familyId: "1:1", ringIndex: 1, u: 0.36, v: 0.43 }),
    polarSnap({ familyId: "1:7", ringIndex: 1, u: 0.64, v: 0.43 })
  ]);

  it("keeps satellite-ring labels on the oval centroid", () => {
    expect(familyLabelUv(farLeft, "3:0")).toEqual({ u: 0.25, v: 0.6 });
    expect(polarAreaNameForFamily(farLeft, "3:0")).toBe("Far Left");
  });

  it("places CENTER to the left of the pack and side names outward", () => {
    expect(familyLabelUv(centerRing, "1:0")).toEqual({ u: 0.445, v: 0.47 });
    expect(polarAreaNameForFamily(centerRing, "1:0")).toBe("CENTER");
    const left = familyLabelUv(centerRing, "1:1");
    const right = familyLabelUv(centerRing, "1:7");
    expect(left?.u).toBeLessThan(0.36);
    expect(right?.u).toBeGreaterThan(0.64);
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
