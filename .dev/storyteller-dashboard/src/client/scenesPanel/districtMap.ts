import pinFile from "./districtPinPositions.json";

/** The Toronto district map (`assets/scenes/districtMap.webp`), drawn at its native size. */
export const DISTRICT_MAP_WIDTH = 800;
export const DISTRICT_MAP_HEIGHT = 1000;
export const DISTRICT_MAP_SRC = "/scenes-assets/districtMap.webp";

/** Top-left of each district's printed label on the map, in map pixels. */
export type DistrictPin = { readonly key: string; readonly left: number; readonly top: number };

const PINS: ReadonlyMap<string, DistrictPin> = new Map(pinFile.pins.map((pin) => [pin.key, { key: pin.key, left: pin.left, top: pin.top }]));

export const districtPin = (key: string): DistrictPin | undefined => PINS.get(key);
