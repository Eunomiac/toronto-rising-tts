import { activeCanvas } from "../sketch";
import { getDndSession } from "./session";
import type { DragPayload } from "./types";

export const ROLL_CONTROL_EVENT = "tr-dnd-roll-control";
export type RollControlRequest = {
  readonly action: "adjustPool" | "convertType" | "rerollSelected";
  readonly payload: DragPayload;
  readonly at: { readonly x: number; readonly y: number };
};
export const requestRollControl = (
  action: RollControlRequest["action"],
  payload: DragPayload,
): boolean => {
  const point = getDndSession().pointer;
  const rect = activeCanvas()?.getBoundingClientRect();
  const detail: RollControlRequest = {
    action,
    payload,
    at: {
      x: (point?.x ?? 1700) - (rect?.left ?? 0),
      y: (point?.y ?? 500) - (rect?.top ?? 0),
    },
  };
  return !window.dispatchEvent(
    new CustomEvent(ROLL_CONTROL_EVENT, { detail, cancelable: true }),
  );
};
