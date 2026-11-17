import { useEffect, useRef } from "react";
import type { PublicGameView } from "../engine/game";
import type { GameIntent } from "../protocol";
import { menuFan } from "../motion";
import { fireIntent } from "../lib/fireIntent";

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export function CardActionPopover({
  view,
  anchor,
  onIntent,
  onClose,
}: {
  view: PublicGameView;
  anchor: DOMRect;
  onIntent: (intent: GameIntent) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const slot = view.slots.find((s) => s?.id === view.selected);

  useEffect(() => {
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

  if (!slot) return null;

  const left = Math.min(
    Math.max(8, anchor.left + anchor.width / 2 - 140),
    window.innerWidth - 288,
  );
  const top = Math.min(anchor.bottom + 10, window.innerHeight - 220);

  return (
    <div
      className="card-popover"
      ref={root}
      style={{ left, top }}
      role="dialog"
      aria-label={`Actions for ${slot.name}`}
    >
      <header>
        <strong>{slot.name}</strong>
        <span>{signed(slot.value)}</span>
      </header>
      <div className="actions">
        <button
          type="button"
          onClick={() => void fireIntent({ op: "enhance" }, onIntent)}
        >
          {slot.enhanced ? "Pass Enhance" : "Enhance"}
        </button>
        <button
          type="button"
          onClick={() => void fireIntent({ op: "negate" }, onIntent)}
        >
          {slot.negated ? "Un-negate" : "Negate"}
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            void fireIntent({ op: "discard" }, onIntent);
            onClose();
          }}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={() => {
            void fireIntent({ op: "random", mode: "normal" }, onIntent);
          }}
        >
          Random
        </button>
      </div>
      <div className="revalue-row">
        <span>Revalue</span>
        <div className="chips">
          {Array.from({ length: 16 }, (_, i) => i - 5).map((n) => (
            <button
              key={n}
              type="button"
              className={slot.value === n && slot.revalued ? "active" : ""}
              onClick={() => void fireIntent({ op: "setValue", value: n }, onIntent)}
            >
              {signed(n)}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          void fireIntent({ op: "select", cardId: null }, onIntent);
          onClose();
        }}
      >
        Deselect
      </button>
    </div>
  );
}
