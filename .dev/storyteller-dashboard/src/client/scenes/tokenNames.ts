import type { ControlBoardSnaps, PolarSnap } from "./types.js";

/** Author-editable per-snap `translateX` percentages for token names. Missing keys use the family heuristic. */
export const SNAP_NAME_TRANSLATE_X: Readonly<Record<number, number>> = {};

const familyMedianU = (snaps: ControlBoardSnaps, familyId: string): number => {
  const members = snaps.polar.filter((snap) => snap.familyId === familyId);
  if (members.length === 0) {
    return 0.5;
  }
  const sorted = [...members].sort((a, b) => a.u - b.u);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return mid?.u ?? 0.5;
};

export const nameTranslateXForSnap = (snaps: ControlBoardSnaps, snap: PolarSnap): number => {
  const authored = SNAP_NAME_TRANSLATE_X[snap.snapIndex];
  if (authored !== undefined) {
    return authored;
  }
  const median = familyMedianU(snaps, snap.familyId);
  if (snap.u < median - 0.002) {
    return -90;
  }
  if (snap.u > median + 0.002) {
    return -10;
  }
  return -50;
};
