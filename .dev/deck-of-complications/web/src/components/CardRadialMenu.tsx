import { useEffect, useRef } from "react";
import type { GameIntent } from "../protocol";
import { menuFan } from "../motion";
import { fireIntent } from "../lib/fireIntent";
import { playSfx, unlockAudio } from "../audio/sfx";

const ITEMS: { op: GameIntent; label: string; angle: number }[] = [
  { op: { op: "enhance" }, label: "Enhance", angle: -90 },
  { op: { op: "negate" }, label: "Negate", angle: -18 },
  { op: { op: "discard" }, label: "Discard", angle: 54 },
  { op: { op: "random", mode: "normal" }, label: "Random", angle: 126 },
  { op: { op: "select", cardId: null }, label: "Clear", angle: 198 },
];

export function CardRadialMenu({
  x,
  y,
  onIntent,
  onClose,
}: {
  x: number;
  y: number;
  onIntent: (intent: GameIntent) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void unlockAudio().then(() => playSfx("tick"));
    menuFan(root.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const radius = 78;

  return (
    <div
      className="card-radial"
      ref={root}
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Card actions"
    >
      <div className="radial-hub" aria-hidden />
      {ITEMS.map((item) => {
        const rad = (item.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * radius;
        const ty = Math.sin(rad) * radius;
        return (
          <button
            key={item.label}
            type="button"
            className="radial-item"
            style={{ transform: `translate(${tx}px, ${ty}px)` }}
            onClick={() => {
              void fireIntent(item.op, onIntent);
              onClose();
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
