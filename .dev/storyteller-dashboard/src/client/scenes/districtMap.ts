import lockedPinClipboard from "./districtPinPositions.json";

export const DISTRICT_MAP_WIDTH = 800;
export const DISTRICT_MAP_HEIGHT = 1000;
export const DISTRICT_MAP_SRC = "/scenes-assets/districtMap.webp";

const PIN_GRID_COLS = 6;
const PIN_GRID_PAD = 8;
const PIN_ROW_HEIGHT = 30;

export type DistrictPinPosition = {
  readonly key: string;
  readonly name: string;
  readonly left: number;
  readonly top: number;
};

export type DistrictPinClipboard = {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly pins: readonly DistrictPinPosition[];
};

type DistrictRow = {
  readonly key: string;
  readonly name: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const roundPx = (value: number): number => Math.round(value * 10) / 10;

export const defaultDistrictPinPositions = (districts: readonly DistrictRow[]): DistrictPinPosition[] => {
  const innerW = DISTRICT_MAP_WIDTH - PIN_GRID_PAD * 2;
  const colW = innerW / PIN_GRID_COLS;
  return districts.map((row, index) => ({
    key: row.key,
    name: row.name,
    left: PIN_GRID_PAD + (index % PIN_GRID_COLS) * colW,
    top: PIN_GRID_PAD + Math.floor(index / PIN_GRID_COLS) * PIN_ROW_HEIGHT
  }));
};

export const mergeDistrictPinPositions = (
  districts: readonly DistrictRow[],
  stored: readonly DistrictPinPosition[] | null
): DistrictPinPosition[] => {
  const byKey = new Map((stored ?? []).map((pin) => [pin.key, pin]));
  return defaultDistrictPinPositions(districts).map((pin) => {
    const saved = byKey.get(pin.key);
    if (!saved) {
      return pin;
    }
    return {
      key: pin.key,
      name: pin.name,
      left: saved.left,
      top: saved.top
    };
  });
};

export const lockedDistrictPinPositions = (districts: readonly DistrictRow[]): DistrictPinPosition[] =>
  mergeDistrictPinPositions(districts, lockedPinClipboard.pins);

export const formatDistrictPinClipboard = (pins: readonly DistrictPinPosition[]): string =>
  JSON.stringify(
    {
      mapWidth: DISTRICT_MAP_WIDTH,
      mapHeight: DISTRICT_MAP_HEIGHT,
      pins: pins.map((pin) => ({
        key: pin.key,
        name: pin.name,
        left: roundPx(pin.left),
        top: roundPx(pin.top)
      }))
    } satisfies DistrictPinClipboard,
    null,
    2
  );

export const parseDistrictPinPositions = (text: string | null): DistrictPinPosition[] | null => {
  if (text === null || text.trim() === "") {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.pins)
      ? parsed.pins
      : null;
  if (!rows) {
    return null;
  }
  const pins: DistrictPinPosition[] = [];
  for (const row of rows) {
    if (!isRecord(row) || typeof row.key !== "string" || typeof row.left !== "number" || typeof row.top !== "number") {
      continue;
    }
    pins.push({
      key: row.key,
      name: typeof row.name === "string" ? row.name : row.key,
      left: row.left,
      top: row.top
    });
  }
  return pins.length > 0 ? pins : null;
};

export const pinBoxFromElement = (el: HTMLElement): { left: number; top: number } => ({
  left: Number.parseFloat(el.style.left) || 0,
  top: Number.parseFloat(el.style.top) || 0
});
