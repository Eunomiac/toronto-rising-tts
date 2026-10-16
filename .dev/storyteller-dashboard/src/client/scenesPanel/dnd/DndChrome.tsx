import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { activeCanvas } from "../sketch";
import type { DndUiHooks } from "./apply";
import { sessionTargetsAt, tryCommitAtPoint, tryCommitDrop } from "./commit";
import { DragHelpPanel } from "./DragHelpPanel";
import { HoverDropBins } from "./hoverBins";
import { matrixCell } from "./matrix";
import { endDrag, getDndSession, moveDrag, subscribeDndSession } from "./session";
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
 * Bridges HTML5 dragover/drop into the same hit-test + commit path as pointer stage drags.
 */
export const DndChrome = ({ scenes, rolls, ui }: Props): ReactElement | null => {
  const session = useSyncExternalStore(subscribeDndSession, getDndSession);
  const veilRef = useRef<HTMLDivElement>(null);
  const canvas = activeCanvas();
  const ctx = useMemo(() => ({ scenes, rolls, ui }), [scenes, rolls, ui]);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

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
        overwrite: "auto"
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
    const onDragOver = (event: DragEvent): void => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      const payload = getDndSession().payload;
      if (!payload) {
        return;
      }
      const point = { x: event.clientX, y: event.clientY };
      const { highlight, hover } = sessionTargetsAt(point, payload.dragKind);
      moveDrag(point, highlight, hover);
    };
    const onDrop = (event: DragEvent): void => {
      const payload = getDndSession().payload;
      if (!payload) {
        return;
      }
      event.preventDefault();
      const point = { x: event.clientX, y: event.clientY };
      if (tryCommitAtPoint(payload, point, ctxRef.current)) {
        endDrag();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [session.active]);

  const commitBin = (bin: DropBin, dropKind: DropTarget["dropKind"]): void => {
    const payload = session.payload;
    if (!payload) {
      return;
    }
    const target: DropTarget = { dropKind, binId: bin.id };
    if (tryCommitDrop(payload, target, ctx)) {
      endDrag();
      return;
    }
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
  const hotBinId = session.highlight && "binId" in session.highlight ? session.highlight.binId : undefined;

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
            hotBinId={hotBinId}
            onBinDrop={(bin) => commitBin(bin, edge === "A" ? "panelA" : edge === "B" ? "panelB" : "panelC")}
          />
        ))}
      {session.pointer && hoverBins.length > 0 && session.hover && (
        <HoverDropBins
          x={session.pointer.x}
          y={session.pointer.y}
          dropKind={session.hover.dropKind}
          bins={hoverBins}
          hotBinId={hotBinId}
          onPick={(bin) => commitBin(bin, session.hover!.dropKind)}
        />
      )}
    </div>,
    canvas
  );
};
