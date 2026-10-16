import { useEffect, useState, useSyncExternalStore, type DragEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { beginDrag, endDrag } from "./dnd/session";
import { activeCanvas } from "./sketch";
import { StageTokenView } from "./stageEdit";

/**
 * Roster drags show the dragged NPCs as the stage draws them, following the pointer, instead of the browser's
 * drag picture (which Windows draws as a faint box that hides where the token lands). The drag data itself
 * still travels in `dataTransfer`; this store only says who is in hand.
 */

type Held = { readonly characterKey: string; readonly name: string };

let held: readonly Held[] | null = null;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

const BLANK = new Image();
BLANK.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Call from `onDragStart` after setting the drag data; the leader (if any) comes first.
 * Pass `openSession: false` when the caller already began a DnD session (e.g. seated NPC). */
export const startRosterDrag = (
  event: DragEvent<HTMLElement>,
  members: readonly Held[],
  options?: { readonly openSession?: boolean }
): void => {
  event.dataTransfer.setDragImage(BLANK, 0, 0);
  held = members;
  notify();
  if (options?.openSession === false) {
    return;
  }
  const leader = members[0];
  if (leader) {
    beginDrag(
      { dragKind: "npcRoster", characterKey: leader.characterKey },
      { x: event.clientX, y: event.clientY }
    );
  }
};

const endRosterDrag = (): void => {
  if (held) {
    held = null;
    notify();
  }
  endDrag();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const GHOST_LIMIT = 5;
const GHOST_PITCH = 34;

/** The NPCs in hand at the pointer, drawn into the dashboard canvas above everything; mount once per roster. */
export const RosterDragGhost = (): ReactElement | null => {
  const members = useSyncExternalStore(subscribe, () => held);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!members) {
      setAt(null);
      return undefined;
    }
    const onDragOver = (event: globalThis.DragEvent): void => {
      const rect = activeCanvas()?.getBoundingClientRect();
      if (rect) {
        setAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", endRosterDrag);
    document.addEventListener("dragend", endRosterDrag);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", endRosterDrag);
      document.removeEventListener("dragend", endRosterDrag);
    };
  }, [members]);
  const canvas = activeCanvas();
  if (!members || !at || !canvas) {
    return null;
  }
  const shown = members.slice(0, GHOST_LIMIT);
  return createPortal(
    <div className="lab-roster-ghost">
      {shown.map((member, index) => (
        <StageTokenView
          key={member.characterKey}
          characterKey={member.characterKey}
          name={shown.length === 1 ? member.name : ""}
          lit
          x={at.x + (index - (shown.length - 1) / 2) * GHOST_PITCH}
          y={at.y}
          color={undefined}
          boss={false}
          dragging
        />
      ))}
      {members.length > shown.length && (
        <span className="lab-roster-ghost-more" style={{ left: at.x, top: at.y + 22 }}>+{members.length - shown.length} more</span>
      )}
    </div>,
    canvas
  );
};
