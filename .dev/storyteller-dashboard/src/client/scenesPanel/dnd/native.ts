import type { DragEvent } from "react";
import { beginDrag, type DragPreview } from "./session";
import type { DragPayload } from "./types";

const blank = new Image();
blank.src =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const startNativeDrag = (
  event: DragEvent<HTMLElement>,
  payload: DragPayload,
  preview?: DragPreview,
): void => {
  event.dataTransfer.effectAllowed = "copyMove";
  event.dataTransfer.setDragImage(blank, 0, 0);
  const pointer = { x: event.clientX, y: event.clientY };
  // Let the browser capture the source before React mounts the drag shelves.
  // Synchronous external-store updates during dragstart can abort a native drag.
  const cancel = (): void => {
    cancelAnimationFrame(frame);
    document.removeEventListener("dragend", cancel, true);
  };
  const frame = requestAnimationFrame(() => {
    document.removeEventListener("dragend", cancel, true);
    beginDrag(payload, pointer, preview);
  });
  document.addEventListener("dragend", cancel, true);
};

/** Respect the source's allowed operations, including browser-native move-only drags. */
export const acceptNativeDrag = (transfer: DataTransfer | null): void => {
  if (transfer) {
    transfer.dropEffect = transfer.effectAllowed === "move" ? "move" : "copy";
  }
};
