import { DropBinButton } from "./DropBinButton";
import { gsap } from "gsap";
import { useLayoutEffect, useRef, type ReactElement } from "react";
import { panelBinsFor } from "./matrix";
import { PANEL_EDGE_ATTR } from "./mime";
import type { DragKind, DropBin, PanelEdge } from "./types";

type PanelProps = {
  readonly edge: PanelEdge;
  readonly dragKind: DragKind;
  readonly open: boolean;
  readonly hotBinId?: string;
  readonly onBinDrop: (bin: DropBin) => void;
};

const edgeClass = (edge: PanelEdge): string =>
  edge === "A" ? "tr-dnd-panel--a" : edge === "B" ? "tr-dnd-panel--b" : "tr-dnd-panel--c";

const edgeTitle = (edge: PanelEdge): string => (edge === "A" ? "Primary" : edge === "B" ? "Secondary" : "Admin");

/** One edge shelf: GSAP slides it in when `open` and the drag kind has bins for this edge. */
export const SlideOutPanel = ({ edge, dragKind, open, hotBinId, onBinDrop }: PanelProps): ReactElement | null => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bins = panelBinsFor(dragKind, edge);
  const shouldShow = open && bins.length > 0;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const from =
        edge === "A"
          ? { x: -36, opacity: 0 }
          : edge === "C"
            ? { x: 36, opacity: 0 }
            : { y: -24, opacity: 0 };
      if (shouldShow) {
        gsap.fromTo(
          root,
          from,
          { x: 0, y: 0, opacity: 1, duration: reduced ? 0 : 0.32, ease: "power3.out", overwrite: "auto" }
        );
        const binEls = root.querySelectorAll(".tr-dnd-bin");
        gsap.fromTo(
          binEls,
          { scale: 0.55, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: reduced ? 0 : 0.38,
            stagger: reduced ? 0 : 0.055,
            ease: "back.out(1.8)",
            delay: 0.06,
            overwrite: "auto"
          }
        );
      } else {
        gsap.to(root, {
          ...from,
          duration: 0.2,
          ease: "power2.in",
          overwrite: "auto"
        });
      }
    }, root);
    return () => ctx.revert();
  }, [shouldShow, edge, dragKind]);


  if (bins.length === 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`tr-dnd-panel ${edgeClass(edge)}${shouldShow ? " is-open" : ""}`}
      {...{ [PANEL_EDGE_ATTR]: edge }}
      aria-hidden={!shouldShow}
    >
      <div className="tr-dnd-panel-title">{edgeTitle(edge)}</div>
      <div className="tr-dnd-panel-bins">
        {bins.map((bin) => (
          <DropBinButton key={bin.id} bin={bin} hot={hotBinId === bin.id} onDrop={() => onBinDrop(bin)} />
        ))}
      </div>
    </div>
  );
};
