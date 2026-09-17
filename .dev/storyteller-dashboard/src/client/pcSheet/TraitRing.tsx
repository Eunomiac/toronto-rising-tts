import { gsap } from "gsap";
import { useLayoutEffect, useRef, type ReactElement } from "react";
import type { RingAction } from "./types.js";

type Props = {
  readonly x: number;
  readonly y: number;
  readonly actions: readonly RingAction[];
  readonly onPick: (action: RingAction) => void;
  readonly onClose: () => void;
};

export const TraitRing = ({ x, y, actions, onPick, onClose }: Props): ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power2.out" });
      gsap.fromTo(
        root.querySelectorAll(".pc-ring-btn"),
        { scale: 0.45, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.28, stagger: 0.04, ease: "back.out(1.7)", delay: 0.02 }
      );
    }, root);
    return () => ctx.revert();
  }, [actions, x, y]);

  const radius = 78;
  return (
    <div className="pc-ring-layer" onClick={onClose} role="presentation">
      <div
        ref={rootRef}
        className="pc-ring"
        style={{ left: x, top: y }}
        onClick={(event) => event.stopPropagation()}
        role="menu"
      >
        {actions.map((action, index) => {
          const angle = (-90 + (360 / actions.length) * index) * (Math.PI / 180);
          const left = Math.cos(angle) * radius;
          const top = Math.sin(angle) * radius;
          return (
            <button
              key={action.id}
              className="pc-ring-btn"
              type="button"
              role="menuitem"
              style={{ left: `calc(50% + ${left}px)`, top: `calc(50% + ${top}px)` }}
              onClick={() => onPick(action)}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
