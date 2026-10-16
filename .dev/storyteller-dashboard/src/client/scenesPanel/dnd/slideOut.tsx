import { gsap } from "gsap";
import { useLayoutEffect, useRef, type ReactElement } from "react";
import { panelBinsFor } from "./matrix";
import { PANEL_BIN_ATTR, PANEL_EDGE_ATTR } from "./mime";
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
    const ctx = gsap.context(() => {
      const from =
        edge === "A"
          ? { x: -36, opacity: 0 }
          : edge === "C"
            ? { x: 36, opacity: 0 }
            : { y: 32, opacity: 0 };
      if (shouldShow) {
        gsap.fromTo(
          root,
          from,
          { x: 0, y: 0, opacity: 1, duration: 0.32, ease: "power3.out", overwrite: "auto" }
        );
        const binEls = root.querySelectorAll(".tr-dnd-bin");
        gsap.fromTo(
          binEls,
          { scale: 0.55, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.38,
            stagger: 0.055,
            ease: "back.out(1.8)",
            delay: 0.06,
            overwrite: "auto",
            onComplete: () => {
              gsap.to(binEls, {
                boxShadow: "0 0 0 0 rgba(232, 196, 120, 0.35)",
                duration: 1.4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                stagger: { each: 0.12, from: "start" }
              });
            }
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

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !shouldShow) {
      return;
    }
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>(".tr-dnd-bin").forEach((el) => {
        const hot = hotBinId !== undefined && el.getAttribute(PANEL_BIN_ATTR) === hotBinId;
        gsap.to(el, {
          scale: hot ? 1.08 : 1,
          duration: 0.16,
          ease: "power2.out",
          overwrite: "auto"
        });
      });
    }, root);
    return () => ctx.revert();
  }, [hotBinId, shouldShow]);

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
          <button
            key={bin.id}
            type="button"
            className={`tr-dnd-bin${bin.secretSafe ? " tr-dnd-bin--secret" : ""}${hotBinId === bin.id ? " is-hot" : ""}`}
            {...{ [PANEL_BIN_ATTR]: bin.id }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBinDrop(bin);
            }}
            onClick={() => onBinDrop(bin)}
          >
            {bin.secretSafe && <span className="tr-dnd-bin-badge">Secret</span>}
            <span className="tr-dnd-bin-label">{bin.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
