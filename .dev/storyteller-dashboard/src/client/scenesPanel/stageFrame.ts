import { polarAreaNameForFamily } from "../scenes/payload";
import type { ControlBoardSnaps } from "../scenes/types";

/**
 * The drawn stage and the in-game control board share one mapping, so the slots drawn on the dashboard sit
 * exactly where the board's snap points are. The board keeps the seat row at small v; the drawing puts it
 * along the bottom, so v flips. Fitted to the polar snap extents in `data/control-board-snaps.json`
 * (u 0.202–0.798, v 0.388–0.849) so the outermost snaps land on the drawing's margins.
 */
const BOARD_U = { min: 0.202, max: 0.798 } as const;
const BOARD_V = { min: 0.388, max: 0.849 } as const;
const STAGE_U = { min: 0.07, max: 0.93 } as const;
/** Bottom edge stays above the seat row band. */
const STAGE_V = { top: 0.07, bottom: 0.74 } as const;

const U_SCALE = (STAGE_U.max - STAGE_U.min) / (BOARD_U.max - BOARD_U.min);
const V_SCALE = (STAGE_V.bottom - STAGE_V.top) / (BOARD_V.max - BOARD_V.min);

export type StagePoint = { readonly u: number; readonly v: number };

/** Control board (u, v) → the drawn stage (fractions of its width and height). */
export const boardToStage = (u: number, v: number): StagePoint => ({
  u: STAGE_U.min + (u - BOARD_U.min) * U_SCALE,
  v: STAGE_V.top + (BOARD_V.max - v) * V_SCALE
});

/** The drawn stage → control board (u, v); the inverse of `boardToStage`. */
export const stageToBoard = (u: number, v: number): StagePoint => ({
  u: BOARD_U.min + (u - STAGE_U.min) / U_SCALE,
  v: BOARD_V.max - (v - STAGE_V.top) / V_SCALE
});

export type StageSlot = { readonly snapIndex: number; readonly isAnchor: boolean } & StagePoint;

export type StagePack = {
  readonly familyId: string;
  readonly label: string;
  /** Far packs sit on an ellipse of six; the others on a shallow arc of five. */
  readonly far: boolean;
  /** Ordered left to right along the pack (`familyK`). */
  readonly slots: readonly StageSlot[];
  readonly center: StagePoint;
};

const FAR_RINGS = new Set([3, 4, 5, 6]);

/** Every Standard-placement pack on the board, with its snaps in drawing coordinates. */
export const stagePacks = (snaps: ControlBoardSnaps): readonly StagePack[] => {
  const families = new Map<string, ControlBoardSnaps["polar"][number][]>();
  for (const snap of snaps.polar) {
    families.set(snap.familyId, [...(families.get(snap.familyId) ?? []), snap]);
  }
  return [...families.entries()].map(([familyId, members]) => {
    const ordered = [...members].sort((a, b) => a.familyK - b.familyK);
    const slots = ordered.map((snap) => ({ snapIndex: snap.snapIndex, isAnchor: snap.isAnchor, ...boardToStage(snap.u, snap.v) }));
    const center = {
      u: slots.reduce((sum, slot) => sum + slot.u, 0) / slots.length,
      v: slots.reduce((sum, slot) => sum + slot.v, 0) / slots.length
    };
    return { familyId, label: polarAreaNameForFamily(snaps, familyId), far: FAR_RINGS.has(ordered[0]?.ringIndex ?? 0), slots, center };
  });
};
