import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { activeCanvas } from "../sketch";
import { applyDndAction, type DndUiHooks } from "./apply";
import { DragHelpPanel } from "./DragHelpPanel";
import { HoverDropBins } from "./hoverBins";
import { matrixCell } from "./matrix";
import { resolveBinAction } from "./resolve";
import { endDrag, getDndSession, subscribeDndSession } from "./session";
import { SlideOutPanel } from "./slideOut";
import type { DropBin, DropTarget, PanelEdge } from "./types";
import type { ScenesSend } from "../commands";
import type { RollsSend } from "../rolls/commands";

type Props = {
  readonly scenes: ScenesSend;
  readonly rolls: RollsSend;
  readonly ui?: DndUiHooks;
};

const EDGES: readonly PanelEdge[] = ["A", "B", "C"];

/**
 * Canvas overlay: veil + edge slide-outs + hover bins. Mount once on the Scenes canvas.
 * Subscribes to the DnD session store; GSAP owns enter/exit motion.
 */
export const DndChrome = ({ scenes, rolls, ui }: Props): ReactElement | null => {
  const session = useSyncExternalStore(subscribeDndSession, getDndSession);
  const veilRef = useRef<HTMLDivElement>(null);
  const canvas = activeCanvas();

  const ctx = useMemo(() => ({ scenes, rolls, ui }), [scenes, rolls, ui]);

  useLayoutEffect(() => {
    const veil = veilRef.current;
    if (!veil) {
      return;
    }
    const ctxG = gsap.context(() => {
      gsap.to(veil, {
        opacity: session.veil ? 0.28 : 0,
        duration: session.veil ? 0.22 : 0.16,
        ease: "power2.out",
        overwrite: "auto",
        pointerEvents: session.veil ? "auto" : "none"
      });
    }, veil);
    return () => ctxG.revert();
  }, [session.veil]);

  useEffect(() => {
    if (!session.active) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        endDrag();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session.active]);

  const commitBin = (bin: DropBin, dropKind: DropTarget["dropKind"]): void => {
    const payload = session.payload;
    if (!payload) {
      return;
    }
    const target: DropTarget = { dropKind, binId: bin.id };
    const resolved = resolveBinAction(payload.dragKind, target);
    if (!resolved || resolved.action === "noop" || resolved.action === "impossible") {
      endDrag();
      return;
    }
    applyDndAction(resolved.action as Parameters<typeof applyDndAction>[0], payload, target, ctx, {
      secretSafe: resolved.secretSafe
    });
    endDrag();
  };

  if (!canvas) {
    return null;
  }

  const hoverCell =
    session.active && session.payload && session.hover
      ? matrixCell(session.payload.dragKind, session.hover.dropKind)
      : null;
  const hoverBins = hoverCell?.kind === "hover" ? hoverCell.bins : [];

  return createPortal(
    <div className={`tr-dnd-chrome${session.active ? " is-active" : ""}`}>
      <div ref={veilRef} className="tr-dnd-veil" aria-hidden />
      {session.payload && (
        <DragHelpPanel dragKind={session.payload.dragKind} open={session.active} />
      )}
      {session.payload &&
        EDGES.map((edge) => (
          <SlideOutPanel
            key={edge}
            edge={edge}
            dragKind={session.payload!.dragKind}
            open={session.openEdges.includes(edge)}
            onBinDrop={(bin) => commitBin(bin, edge === "A" ? "panelA" : edge === "B" ? "panelB" : "panelC")}
          />
        ))}
      {session.pointer && hoverBins.length > 0 && session.hover && (
        <HoverDropBins
          x={session.pointer.x}
          y={session.pointer.y}
          dropKind={session.hover.dropKind}
          bins={hoverBins}
          onPick={(bin) => commitBin(bin, session.hover!.dropKind)}
        />
      )}
    </div>,
    canvas
  );
};
