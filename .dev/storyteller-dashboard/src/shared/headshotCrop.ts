/**
 * Square head crop of a full-body figurine cutout. `cx` is a fraction of the image width; `cy` and `size`
 * (the square's side) are fractions of the image height, so a crop survives re-exporting the cutout at a
 * different resolution.
 */
export type HeadshotCrop = { readonly cx: number; readonly cy: number; readonly size: number };

/** Hand corrections keyed by characterKey; characters without an entry use the automatic crop. */
export type HeadshotCropFile = { readonly crops: Readonly<Record<string, HeadshotCrop>> };

export const HEADSHOT_KEY_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

export const isHeadshotCrop = (value: unknown): value is HeadshotCrop => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const crop = value as Record<string, unknown>;
  return inRange(crop.cx, -1, 2) && inRange(crop.cy, -1, 2) && inRange(crop.size, 0.005, 3);
};

const round = (value: number): number => Math.round(value * 10000) / 10000;

export const roundHeadshotCrop = (crop: HeadshotCrop): HeadshotCrop => ({
  cx: round(crop.cx),
  cy: round(crop.cy),
  size: round(crop.size)
});
