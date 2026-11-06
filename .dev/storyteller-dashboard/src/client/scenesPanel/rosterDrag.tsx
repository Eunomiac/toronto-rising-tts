import { gsap } from "gsap";
import { useLayoutEffect, useRef, useSyncExternalStore, type DragEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { getDndPointer, getDndSession, subscribeDndPointer, subscribeDndSession } from "./dnd/session";
import { startNativeDrag } from "./dnd/native";
import { StageTokenView } from "./stageEdit";
import type { ScenesSend } from "./commands";

type Held = { readonly characterKey: string; readonly name: string };
export const startRosterDrag = (
  event: DragEvent<HTMLElement>, members: readonly Held[],
  options?: { readonly openSession?: boolean; readonly groupKey?: string; readonly scenes?: ScenesSend }
): void => {
  if (options?.openSession === false || !members[0]) return;
  const payload = options?.groupKey
    ? { dragKind: "npcRosterGroup" as const, groupKey: options.groupKey, members }
    : { dragKind: "npcRoster" as const, characterKey: members[0].characterKey };
  startNativeDrag(event, payload, { members }, options?.scenes);
};

/** A viewport-level preview survives every stage/roster clipping and stacking context. */
export const RosterDragGhost = (): ReactElement | null => {
  const session = useSyncExternalStore(subscribeDndSession, getDndSession);
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !session.active) return undefined;
    const setX = gsap.quickSetter(element, "x", "px");
    const setY = gsap.quickSetter(element, "y", "px");
    let frame = 0;
    const paint = (): void => {
      frame = 0;
      const pointer = getDndPointer();
      if (pointer) {
        setX(pointer.x);
        setY(pointer.y);
      }
    };
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };
    paint();
    const unsubscribe = subscribeDndPointer(schedule);
    return () => {
      unsubscribe();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [session.active, session.preview]);
  if (!session.active || !session.pointer || !session.preview) return null;
  const { members = [], label } = session.preview;
  const shown = members.slice(0, 5);
  return createPortal(
    <div ref={root} className="tr-dnd-ghost" aria-hidden>
      {shown.map((member, index) => <StageTokenView key={member.characterKey} characterKey={member.characterKey}
        name={shown.length === 1 ? member.name : ""} lit x={(index - (shown.length - 1) / 2) * 34} y={0}
        color={undefined} boss={false} dragging />)}
      {members.length > 1 && <span className="tr-dnd-ghost-count">{members.length} characters</span>}
      {label && <span className="tr-dnd-ghost-card">{label}</span>}
    </div>, document.body
  );
};
