import { applyDndAction, type DndApplyContext } from "./apply";
import { matrixCell } from "./matrix";
import { hitTestDrop, resolveBinAction } from "./resolve";
import type { ActionId, ClientPoint, DragKind, DragPayload, DropTarget } from "./types";

/** Stage geometry still owned by StageLayer — do not steal these unless coords are present. */
const STAGE_GEOMETRY: ReadonlySet<string> = new Set([
  "moveOnStage",
  "addToStage",
  "addNearStaged",
  "packJoin",
  "packAddFromRoster",
  "packWithStaged",
  "seatToStage",
  "packFromSeated",
  "seatedOntoStaged"
]);

const hasCoords = (target: DropTarget): boolean =>
  "u" in target && typeof (target as { u?: number }).u === "number" && typeof (target as { v?: number }).v === "number";

/** Highlight + hover targets for the pointer, derived from the matrix cell under it. */
export const sessionTargetsAt = (
  point: ClientPoint,
  drag: DragKind
): { readonly highlight: DropTarget | null; readonly hover: DropTarget | null } => {
  const target = hitTestDrop(point);
  const cell = matrixCell(drag, target.dropKind);
  if (cell.kind === "hover") {
    return { highlight: target.binId ? target : null, hover: { dropKind: target.dropKind } };
  }
  if (cell.kind === "panel") {
    return { highlight: target.binId ? target : null, hover: null };
  }
  if (cell.kind === "noop" || cell.kind === "impossible") {
    return { highlight: null, hover: null };
  }
  return { highlight: target, hover: null };
};

/**
 * Apply a matrix drop when the chrome / pointer path owns it.
 * Returns true when the drop was consumed (caller must not also place/remove on the stage).
 */
export const tryCommitDrop = (
  payload: DragPayload,
  target: DropTarget,
  ctx: DndApplyContext
): boolean => {
  const resolved = resolveBinAction(payload.dragKind, target);
  if (!resolved || resolved.action === "noop" || resolved.action === "impossible") {
    return false;
  }
  if (STAGE_GEOMETRY.has(resolved.action) && !hasCoords(target)) {
    return false;
  }
  applyDndAction(resolved.action as ActionId, payload, target, ctx, {
    secretSafe: resolved.secretSafe
  });
  return true;
};

/** Hit-test at the client point and try to commit. */
export const tryCommitAtPoint = (
  payload: DragPayload,
  point: ClientPoint,
  ctx: DndApplyContext
): boolean => tryCommitDrop(payload, hitTestDrop(point), ctx);
