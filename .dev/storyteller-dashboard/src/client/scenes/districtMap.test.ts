import { describe, expect, it } from "vitest";
import {
  DISTRICT_MAP_HEIGHT,
  DISTRICT_MAP_WIDTH,
  defaultDistrictPinPositions,
  formatDistrictPinClipboard,
  lockedDistrictPinPositions,
  mergeDistrictPinPositions,
  parseDistrictPinPositions
} from "./districtMap";

const DISTRICTS = [
  { key: "Yorkville", name: "Yorkville" },
  { key: "Annex", name: "The Annex" },
  { key: "PATH", name: "P.A.T.H." },
  { key: "LakeOntario", name: "Lake Ontario" },
  { key: "Cabbagetown", name: "Cabbagetown" },
  { key: "Chinatown", name: "Chinatown" },
  { key: "Riverdale", name: "Riverdale" }
] as const;

describe("district map pin layout", () => {
  it("starts pins in a grid on the 800×1000 map", () => {
    const pins = defaultDistrictPinPositions(DISTRICTS);
    expect(pins).toHaveLength(DISTRICTS.length);
    for (const pin of pins) {
      expect(pin.left).toBeGreaterThanOrEqual(0);
      expect(pin.top).toBeGreaterThanOrEqual(0);
      expect(pin.left).toBeLessThan(DISTRICT_MAP_WIDTH);
      expect(pin.top).toBeLessThan(DISTRICT_MAP_HEIGHT);
    }
    expect(new Set(pins.map((pin) => `${pin.left},${pin.top}`)).size).toBe(pins.length);
  });

  it("keeps saved pixel positions when merging", () => {
    const stored = [
      { key: "Yorkville", name: "stale", left: 412.5, top: 188 },
      { key: "gone", name: "Gone", left: 10, top: 10 }
    ];
    const merged = mergeDistrictPinPositions(DISTRICTS, stored);
    expect(merged.find((pin) => pin.key === "Yorkville")).toEqual({
      key: "Yorkville",
      name: "Yorkville",
      left: 412.5,
      top: 188
    });
    expect(merged.some((pin) => pin.key === "gone")).toBe(false);
    expect(merged.find((pin) => pin.key === "Annex")?.left).toBe(defaultDistrictPinPositions(DISTRICTS)[1]?.left);
  });

  it("round-trips clipboard JSON including map size", () => {
    const pins = [
      { key: "Yorkville", name: "Yorkville", left: 412.55, top: 188.04 }
    ];
    const text = formatDistrictPinClipboard(pins);
    const parsed = parseDistrictPinPositions(text);
    expect(JSON.parse(text)).toMatchObject({
      mapWidth: DISTRICT_MAP_WIDTH,
      mapHeight: DISTRICT_MAP_HEIGHT
    });
    expect(parsed).toEqual([
      { key: "Yorkville", name: "Yorkville", left: 412.6, top: 188 }
    ]);
  });

  it("reads a bare pin array from storage", () => {
    expect(
      parseDistrictPinPositions(JSON.stringify([{ key: "PATH", name: "P.A.T.H.", left: 40, top: 900 }]))
    ).toEqual([{ key: "PATH", name: "P.A.T.H.", left: 40, top: 900 }]);
    expect(parseDistrictPinPositions("not json")).toBeNull();
    expect(parseDistrictPinPositions(null)).toBeNull();
  });

  it("locks pins from the authored map coordinates", () => {
    const pins = lockedDistrictPinPositions(DISTRICTS);
    expect(pins.find((pin) => pin.key === "Yorkville")).toEqual({
      key: "Yorkville",
      name: "Yorkville",
      left: 296.3,
      top: 273
    });
    expect(pins.find((pin) => pin.key === "PATH")?.top).toBe(876);
  });
});
