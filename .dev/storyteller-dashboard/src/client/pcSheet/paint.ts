import type { Rating, Tracker } from "./types.js";

export type DotFill = "dot_yellow" | "dot_white" | "dot_grey" | "dot_red";

export type DotSlot = {
  readonly active: boolean;
  readonly image?: DotFill;
};

export const resolveDotSlot = (key: string, base: number, temp: number, conditionDelta: number, slot: number): DotSlot => {
  const eff = temp + conditionDelta;
  const rating = base + eff;
  const fillImage: DotFill = key === "bloodPotency" ? "dot_red" : "dot_yellow";
  if (slot <= base && slot <= rating) {
    return { active: true, image: fillImage };
  }
  if (eff > 0 && slot > base && slot <= rating) {
    return { active: true, image: "dot_white" };
  }
  if (eff < 0 && slot > rating && slot <= base) {
    return { active: true, image: "dot_grey" };
  }
  return { active: false };
};

export const paintDotLine = (key: string, rating: Rating, conditionDelta: number, slots = 5): readonly DotSlot[] => {
  const line: DotSlot[] = [];
  for (let slot = 1; slot <= slots; slot += 1) {
    line.push(resolveDotSlot(key, rating.base, rating.temp, conditionDelta, slot));
  }
  return line;
};

export type BoxLayer = "undamaged" | "superficial" | "aggravated" | "filled" | "stain" | "impaired";

export type BoxSlot = {
  readonly active: boolean;
  readonly layer?: BoxLayer;
  readonly image?: string;
};

const BOX_IMAGE: Record<BoxLayer, string> = {
  undamaged: "box_white",
  filled: "box_white",
  superficial: "box_grey_slash",
  aggravated: "box_red_x",
  stain: "box_purple",
  impaired: "box_red"
};

export const paintDamageTrack = (tracker: Tracker, maxBoxes: number): readonly BoxSlot[] => {
  const cells: Array<BoxLayer | undefined> = Array.from({ length: 10 });
  let idx = 0;
  for (let i = 0; i < tracker.aggravated; i += 1) {
    if (idx < maxBoxes) {
      cells[idx] = "aggravated";
      idx += 1;
    }
  }
  for (let i = 0; i < tracker.superficial; i += 1) {
    if (idx < maxBoxes) {
      cells[idx] = "superficial";
      idx += 1;
    }
  }
  while (idx < maxBoxes) {
    cells[idx] = "undamaged";
    idx += 1;
  }
  return cells.map((layer) => (
    layer === undefined
      ? { active: false }
      : { active: true, layer, image: BOX_IMAGE[layer] }
  ));
};

export const paintHumanityTrack = (tracker: Tracker, lineLen: number): readonly BoxSlot[] => {
  const cells: Array<BoxLayer | undefined> = Array.from({ length: 10 });
  for (let i = 0; i < lineLen; i += 1) {
    cells[i] = "filled";
  }
  let sIdx = 9;
  for (let n = 0; n < tracker.stains; n += 1) {
    if (sIdx < 0) {
      break;
    }
    if (cells[sIdx] === "filled") {
      cells[sIdx] = "impaired";
      break;
    }
    cells[sIdx] = "stain";
    sIdx -= 1;
  }
  return cells.map((layer) => (
    layer === undefined
      ? { active: false }
      : { active: true, layer, image: BOX_IMAGE[layer] }
  ));
};
