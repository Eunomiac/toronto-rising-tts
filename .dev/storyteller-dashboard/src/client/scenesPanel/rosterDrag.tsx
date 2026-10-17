import { useSyncExternalStore, type DragEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { getDndSession, subscribeDndSession } from "./dnd/session";
import { startNativeDrag } from "./dnd/native";
import { StageTokenView } from "./stageEdit";

type Held = { readonly characterKey: string; readonly name: string };
export const startRosterDrag = (
  event: DragEvent<HTMLElement>, members: readonly Held[],
  options?: { readonly openSession?: boolean; readonly groupKey?: string }
): void => {
  if (options?.openSession === false || !members[0]) return;
  const payload = options?.groupKey
    ? { dragKind: "npcRosterGroup" as const, groupKey: options.groupKey, members }
    : { dragKind: "npcRoster" as const, characterKey: members[0].characterKey };
  startNativeDrag(event, payload, { members });
};

/** A viewport-level preview survives every stage/roster clipping and stacking context. */
export const RosterDragGhost = (): ReactElement | null => {
  const session = useSyncExternalStore(subscribeDndSession, getDndSession);
  if (!session.active || !session.pointer || !session.preview) return null;
  const { members = [], label } = session.preview;
  const shown = members.slice(0, 5);
  return createPortal(
    <div className="tr-dnd-ghost" aria-hidden style={{ left: session.pointer.x, top: session.pointer.y }}>
      {shown.map((member, index) => <StageTokenView key={member.characterKey} characterKey={member.characterKey}
        name={shown.length === 1 ? member.name : ""} lit x={(index - (shown.length - 1) / 2) * 34} y={0}
        color={undefined} boss={false} dragging />)}
      {members.length > 1 && <span className="tr-dnd-ghost-count">{members.length} characters</span>}
      {label && <span className="tr-dnd-ghost-card">{label}</span>}
    </div>, document.body
  );
};
