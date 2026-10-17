import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { StagePoint } from "../stageFrame";

import { endDrag } from "./session";

const DRAG_PX = 4;

export type PointerHandlers = {
  readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerCancel: () => void;
  readonly onLostPointerCapture: () => void;
};

export const pointIn = (board: RefObject<HTMLDivElement | null>, clientX: number, clientY: number): StagePoint => {
  const rect = board.current?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return { u: 0, v: 0 };
  }
  return { u: (clientX - rect.left) / rect.width, v: (clientY - rect.top) / rect.height };
};

/**
 * Pointer-capture drag for stage tokens. Local React state only while moving — does not rewrite the board each frame.
 * Lifted from stageEdit for the shared DnD layer.
 */
export const useBoardDrag = <T,>(
  board: RefObject<HTMLDivElement | null>,
  onDrop: (item: T, point: StagePoint, client: { x: number; y: number }) => void,
  onTap?: (item: T, client: { x: number; y: number }) => void,
  onMove?: (item: T, point: StagePoint, client: { x: number; y: number }) => void
): {
  drag: { item: T; point: StagePoint } | null;
  handlers: (item: T) => PointerHandlers;
} => {
  const [drag, setDrag] = useState<{ item: T; point: StagePoint } | null>(null);
  const press = useRef<{ item: T; x: number; y: number; moved: boolean } | null>(null);
  const cancel = (): void => { press.current = null; setDrag(null); endDrag(); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => { if (event.key === "Escape" && press.current) cancel(); };
    const onBlur = (): void => { if (press.current) cancel(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("blur", onBlur); if (press.current) endDrag(); };
  }, []);
  const handlers = (item: T): PointerHandlers => ({
    onPointerDown: (event) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      press.current = { item, x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMove: (event) => {
      const held = press.current;
      if (!held || (!held.moved && Math.hypot(event.clientX - held.x, event.clientY - held.y) < DRAG_PX)) {
        return;
      }
      held.moved = true;
      const point = pointIn(board, event.clientX, event.clientY);
      setDrag({ item: held.item, point });
      onMove?.(held.item, point, { x: event.clientX, y: event.clientY });
    },
    onPointerUp: (event) => {
      const held = press.current;
      press.current = null;
      setDrag(null);
      if (held?.moved) {
        onDrop(held.item, pointIn(board, event.clientX, event.clientY), { x: event.clientX, y: event.clientY });
      } else if (held) {
        onTap?.(held.item, { x: event.clientX, y: event.clientY });
      }
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel
  });
  return { drag, handlers };
};
