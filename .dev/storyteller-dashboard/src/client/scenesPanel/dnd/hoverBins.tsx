import { gsap } from "gsap";
import { useLayoutEffect, useRef, type ReactElement } from "react";
import { HOVER_BIN_ATTR } from "./mime";
import type { DropBin, DropKind } from "./types";

type Props = {
  readonly x: number;
  readonly y: number;
  readonly dropKind: DropKind;
  readonly bins: readonly DropBin[];
  readonly hotBinId?: string;
  readonly onPick: (bin: DropBin) => void;
};

/** Circular HOVER drop sites around a target (TraitRing-style motion, drop targets not click menus). */
export const HoverDropBins = ({ x, y, dropKind, bins, hotBinId, onPick }: Props): ReactElement | null => {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || bins.length === 0) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power2.out" });
      gsap.fromTo(
        root.querySelectorAll(".tr-dnd-hover-bin"),
        { scale: 0.45, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, stagger: 0.04, ease: "back.out(1.8)", delay: 0.02 }
      );
    }, root);
    return () => ctx.revert();
  }, [x, y, bins]);

  if (bins.length === 0) {
    return null;
  }

  const radius = 88;
  return (
    <div ref={rootRef} className="tr-dnd-hover" style={{ left: x, top: y }}>
      {bins.map((bin, index) => {
        const angle = (-90 + (360 / bins.length) * index) * (Math.PI / 180);
        const left = Math.cos(angle) * radius;
        const top = Math.sin(angle) * radius;
        return (
          <button
            key={bin.id}
            type="button"
            className={`tr-dnd-hover-bin${hotBinId === bin.id ? " is-hot" : ""}`}
            style={{ left, top }}
            {...{ [HOVER_BIN_ATTR]: bin.id, "data-tr-dnd-hover-drop": dropKind }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPick(bin);
            }}
            onClick={() => onPick(bin)}
          >
            {bin.label}
          </button>
        );
      })}
    </div>
  );
};
