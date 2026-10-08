import type { HeadshotCrop } from "../../shared/headshotCrop";

/** Height the silhouette is resampled to before measuring; all thresholds below assume it. */
export const ANALYSIS_HEIGHT = 400;

export type HeadshotConfidence = "confident" | "probable" | "guessed";

export type AutoCrop = {
  readonly crop: HeadshotCrop;
  readonly confidence: HeadshotConfidence;
  /** Plain-English reason shown in the editor when the crop is not confident. */
  readonly reason: string;
};

/** Neck-width multiple for the crop side: the median ratio across the catalogued cutouts with a real neck. */
const NECK_TO_SIDE = 1.91;
/** Where the narrowest neck row sits, as a fraction of the crop side from its top edge. */
const CHIN_LINE = 0.84;

/**
 * Finds a head-and-face crop from a cutout's alpha channel (RGBA bytes, `imageWidth`×`imageHeight`).
 * Rows are measured by opaque-pixel count: the head's widest row, the neck pinch below it, and the sharpest
 * widening into the shoulders. With a real neck, the crop is anchored on the chin so mouths stay in frame
 * and hats or big hair do not push the face down; otherwise it hangs from the top of the head.
 */
export const computeAutoCrop = (rgba: ArrayLike<number>, imageWidth: number, imageHeight: number): AutoCrop => {
  const n = new Array<number>(imageHeight).fill(0);
  const sx = new Array<number>(imageHeight).fill(0);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < imageHeight; y += 1) {
    let count = 0;
    let sum = 0;
    for (let x = 0; x < imageWidth; x += 1) {
      if ((rgba[(y * imageWidth + x) * 4 + 3] ?? 0) > 128) {
        count += 1;
        sum += x;
      }
    }
    n[y] = count;
    sx[y] = sum;
    if (count > 0) {
      if (top < 0) {
        top = y;
      }
      bottom = y;
    }
  }
  if (top < 0 || bottom - top < 20) {
    return { crop: { cx: 0.5, cy: 0.09, size: 0.14 }, confidence: "guessed", reason: "no figure found" };
  }

  const H = bottom - top;
  const at = (f: number): number => top + Math.round(f * H);
  const frac = (y: number): number => (y - top) / H;
  const sm = n.map((_, y) => {
    let total = 0;
    let rows = 0;
    for (let d = -2; d <= 2; d += 1) {
      const value = n[y + d];
      if (value !== undefined) {
        total += value;
        rows += 1;
      }
    }
    return total / rows;
  });
  const rowWidth = (y: number): number => sm[Math.max(0, Math.min(imageHeight - 1, y))] ?? 0;

  let headMax = at(0.03);
  for (let y = at(0.03); y <= at(0.12); y += 1) {
    if (rowWidth(y) > rowWidth(headMax)) {
      headMax = y;
    }
  }
  let neck = headMax;
  for (let y = headMax; y <= at(0.26); y += 1) {
    if (rowWidth(y) < rowWidth(neck)) {
      neck = y;
    }
  }
  const step = Math.max(2, Math.round(0.02 * H));
  let shoulder = at(0.18);
  let jump = -Infinity;
  for (let y = at(0.08); y <= at(0.32); y += 1) {
    const rise = rowWidth(y + step) - rowWidth(y);
    if (rise > jump) {
      jump = rise;
      shoulder = y + Math.round(step / 2);
    }
  }

  const headWidth = Math.max(1, rowWidth(headMax));
  const strongShoulder = jump / headWidth >= 0.45 && frac(shoulder) >= 0.13 && frac(shoulder) <= 0.21;
  const realNeck = rowWidth(neck) / headWidth <= 0.9 && frac(headMax) < 0.115;
  const neckInBand = frac(neck) >= 0.1 && frac(neck) <= 0.17;
  const gap = (shoulder - neck) / H;
  const agree = gap >= 0.01 && gap <= 0.07;
  const aspect = (neck - top) / headWidth;
  const bodyWiden = rowWidth(shoulder + 3 * step) / headWidth;
  const sane = bodyWiden <= 3.5 && (!realNeck || (aspect >= 0.8 && aspect <= 1.5));

  let cropLine: number;
  if (strongShoulder) {
    cropLine = shoulder;
  } else if (neckInBand) {
    cropLine = neck + Math.round(0.035 * H);
  } else if (frac(shoulder) >= 0.11 && frac(shoulder) <= 0.21) {
    cropLine = shoulder;
  } else {
    cropLine = at(0.17);
  }

  let confidence: HeadshotConfidence;
  let reason: string;
  if (!sane) {
    confidence = "guessed";
    reason = "odd shape";
  } else if (strongShoulder && realNeck && agree) {
    confidence = "confident";
    reason = "";
  } else if (strongShoulder && realNeck) {
    confidence = "probable";
    reason = "neck and shoulders disagree";
  } else if (strongShoulder) {
    confidence = "probable";
    reason = "no neck found";
  } else if (realNeck && neckInBand) {
    confidence = "probable";
    reason = "weak shoulders";
  } else {
    confidence = "guessed";
    reason = "no clear neck or shoulders";
  }

  const meanX = (y0: number, y1: number): number => {
    let count = 0;
    let sum = 0;
    for (let y = Math.max(0, y0); y <= Math.min(imageHeight - 1, y1); y += 1) {
      count += n[y] ?? 0;
      sum += sx[y] ?? 0;
    }
    return count > 0 ? sum / count : imageWidth / 2;
  };

  const L = cropLine - top;
  let side: number;
  let cx: number;
  let cy: number;
  if (realNeck) {
    side = Math.min(0.95 * L, Math.max(0.6 * L, NECK_TO_SIDE * rowWidth(neck)));
    cx = meanX(headMax, neck);
    cy = neck - CHIN_LINE * side + side / 2;
  } else {
    side = 0.8 * L;
    cx = meanX(top, top + Math.round(0.8 * L));
    cy = top + 0.56 * L;
  }
  return { crop: { cx: cx / imageWidth, cy: cy / imageHeight, size: side / imageHeight }, confidence, reason };
};
