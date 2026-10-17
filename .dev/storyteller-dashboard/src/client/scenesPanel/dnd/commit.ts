import { applyDndAction, type DndApplyContext } from "./apply";
import { getDndSession } from "./session";
import { animateDrop } from "./feedback";
import { matrixCell } from "./matrix";
import { hitTestDrop, resolveBinAction } from "./resolve";
import type { ActionId, ClientPoint, DragKind, DragPayload, DropTarget } from "./types";

/** Stage geometry still owned by StageLayer — do not steal these unless coords are present. */
export const STAGE_GEOMETRY: ReadonlySet<string> = new Set([
  "addRosterGroupToStage",
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
  const previous = getDndSession();
  if (previous.hover && previous.hoverPointer && !target.binId
    && (target.dropKind === "out" || target.dropKind === "stage")
    && Math.hypot(point.x - previous.hoverPointer.x, point.y - previous.hoverPointer.y) <= 145) {
    // Keep the ring reachable across the empty space between its center and bins.
    return { highlight: null, hover: previous.hover };
  }
  if (cell.kind === "hover") {
    return { highlight: target.binId ? target : null, hover: target.binId ? getDndSession().hover : target };
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
  if (target.binId && getDndSession().hover?.dropKind === target.dropKind) target = { ...getDndSession().hover!, binId: target.binId };
  const resolved = resolveBinAction(payload.dragKind, target);
  if (!resolved || resolved.action === "noop" || resolved.action === "impossible") {
    return false;
  }
  if (STAGE_GEOMETRY.has(resolved.action) && !hasCoords(target)) {
    return false;
  }
  const result = applyDndAction(resolved.action as ActionId, payload, target, ctx, {
    secretSafe: resolved.secretSafe
  });
  if (!result.ok) ctx.ui?.notify?.(result.reason);
  else animateDrop(target);
  return result.ok;
};

/** Hit-test at the client point and try to commit. */
export const tryCommitAtPoint = (
  payload: DragPayload,
  point: ClientPoint,
  ctx: DndApplyContext
): boolean => tryCommitDrop(payload, hitTestDrop(point), ctx);
