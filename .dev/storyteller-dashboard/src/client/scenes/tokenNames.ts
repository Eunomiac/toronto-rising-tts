import { polarAreaNameForFamily } from "./payload.js";
import type { ControlBoardSnaps, PolarSnap, SeatSnap } from "./types.js";

export type NameSide = "below" | "above" | "left" | "right";

export type TokenNameLayout = {
  side: NameSide;
  ox: number;
  oy: number;
};

/** Author-editable per-snap name placement. Missing keys use the family heuristic. */
export const SNAP_NAME_LAYOUT: Readonly<Record<number, Partial<TokenNameLayout>>> = {};

/** Author-editable per-seat name placement. */
export const SEAT_NAME_LAYOUT: Readonly<Record<string, Partial<TokenNameLayout>>> = {};

const SIDE_BY_AREA: Readonly<Record<string, NameSide>> = {
  CENTER: "below",
  "Center Left": "left",
  "Center Right": "right",
  "Mid Center": "above",
  "Mid Left": "left",
  "Mid Right": "right",
  "Far Left": "left",
  "Far Right": "right",
  "Far Center-Left": "above",
  "Far Center-Right": "above"
};

const familyMembers = (snaps: ControlBoardSnaps, familyId: string): PolarSnap[] =>
  snaps.polar.filter((snap) => snap.familyId === familyId).sort((a, b) => a.familyK - b.familyK);

const mergeLayout = (base: TokenNameLayout, authored?: Partial<TokenNameLayout>): TokenNameLayout => ({
  side: authored?.side ?? base.side,
  ox: authored?.ox ?? base.ox,
  oy: authored?.oy ?? base.oy
});

export const captionClassForSide = (side: NameSide): string => {
  if (side === "above") {
    return "scenes-token-caption-above";
  }
  if (side === "left") {
    return "scenes-token-caption-left";
  }
  if (side === "right") {
    return "scenes-token-caption-right";
  }
  return "";
};

export const nameLayoutForPolarSnap = (snaps: ControlBoardSnaps, snap: PolarSnap): TokenNameLayout => {
  const area = polarAreaNameForFamily(snaps, snap.familyId);
  const members = familyMembers(snaps, snap.familyId);
  const index = Math.max(0, members.findIndex((row) => row.snapIndex === snap.snapIndex));
  const spread = index - (members.length - 1) / 2;
  let base: TokenNameLayout;
  if (area === "CENTER") {
    const side: NameSide = snap.u < 0.5 - 0.002 ? "left" : snap.u > 0.5 + 0.002 ? "right" : "above";
    base = { side, ox: 0, oy: spread * 18 };
  } else if (area.startsWith("Mid") || area.startsWith("Far Center")) {
    base = { side: "above", ox: spread * 20, oy: 0 };
  } else if (area === "Far Left" || area === "Center Left") {
    base = { side: "left", ox: 0, oy: spread * 20 };
  } else if (area === "Far Right" || area === "Center Right") {
    base = { side: "right", ox: 0, oy: spread * 20 };
  } else {
    const side = SIDE_BY_AREA[area] ?? "below";
    base =
      side === "left" || side === "right"
        ? { side, ox: 0, oy: spread * 16 }
        : { side, ox: spread * 14, oy: 0 };
  }
  return mergeLayout(base, SNAP_NAME_LAYOUT[snap.snapIndex]);
};

export const nameLayoutForSeat = (seat: SeatSnap, seatCount: number, seatIndex: number): TokenNameLayout => {
  const spread = seatIndex - (seatCount - 1) / 2;
  return mergeLayout(
    { side: "below", ox: spread * 22, oy: seatIndex % 2 === 0 ? 0 : 16 },
    SEAT_NAME_LAYOUT[seat.seatKey]
  );
};

export const applyTokenNameLayout = (tokenEl: HTMLElement, layout: TokenNameLayout): void => {
  tokenEl.classList.remove("scenes-token-caption-above", "scenes-token-caption-left", "scenes-token-caption-right");
  const caption = captionClassForSide(layout.side);
  if (caption !== "") {
    tokenEl.classList.add(caption);
  }
  tokenEl.style.setProperty("--name-ox", `${layout.ox}px`);
  tokenEl.style.setProperty("--name-oy", `${layout.oy}px`);
};
