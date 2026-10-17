import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { activeCanvas } from "../sketch";
import type { DndUiHooks } from "./apply";
import { sessionTargetsAt, STAGE_GEOMETRY, tryCommitDrop } from "./commit";
import { hitTestDrop } from "./resolve";
import { DragHelpPanel } from "./DragHelpPanel";
import { HoverDropBins } from "./hoverBins";
import { acceptNativeDrag } from "./native";
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
      acceptNativeDrag(event.dataTransfer);
      const payload = getDndSession().payload;
      if (!payload) {
        return;
      }
      const point = { x: event.clientX, y: event.clientY };
      const { highlight, hover } = sessionTargetsAt(point, payload.dragKind);
      const cell = matrixCell(payload.dragKind, hitTestDrop(point).dropKind);
      if (event.dataTransfer && (cell.kind === "noop" || cell.kind === "impossible" || (cell.kind === "panel" && !highlight))) {
        event.dataTransfer.dropEffect = "none";
      }
      moveDrag(point, highlight, hover);
    };
    const onDrop = (event: DragEvent): void => {
      const payload = getDndSession().payload;
      if (!payload) {
        return;
      }
      event.preventDefault();
      const point = { x: event.clientX, y: event.clientY };
      const target = hitTestDrop(point);
      const cell = matrixCell(payload.dragKind, target.dropKind);
      // Stage geometry is handled by the stage layer; all other matrix outcomes
      // (including invalid/cancelled drops) terminate here before legacy handlers.
      if (cell.kind === "action" && STAGE_GEOMETRY.has(cell.action)) return;
      event.stopPropagation();
      const resolvedTarget = target.binId && getDndSession().hover && cell.kind === "hover"
        ? { ...getDndSession().hover!, binId: target.binId } : target;
      tryCommitDrop(payload, resolvedTarget, ctxRef.current);
      endDrag();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("drop", onDrop, true);
    document.addEventListener("dragend", endDrag);
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("drop", onDrop, true);
      document.removeEventListener("dragend", endDrag);
      window.removeEventListener("blur", endDrag);
      endDrag();
    };
  }, [session.active]);

  const commitBin = (bin: DropBin, dropKind: DropTarget["dropKind"]): void => {
    const payload = session.payload;
    if (!payload) {
      return;
    }
    const target: DropTarget = { ...(session.hover?.dropKind === dropKind ? session.hover : { dropKind }), binId: bin.id };
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
      {session.hoverPointer && hoverBins.length > 0 && session.hover && (
        <HoverDropBins
          x={session.hoverPointer.x - canvas.getBoundingClientRect().left}
          y={session.hoverPointer.y - canvas.getBoundingClientRect().top}
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
