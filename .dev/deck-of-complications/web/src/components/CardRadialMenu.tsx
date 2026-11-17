import { useEffect, useRef } from "react";
import type { GameIntent } from "../protocol";
import { menuFan } from "../motion";
import { fireIntent } from "../lib/fireIntent";
import { playSfx, unlockAudio } from "../audio/sfx";

const REVALUE_ROWS: number[][] = [
  [-5, -4, -3, -2, -1],
  [0],
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];

function chipLabel(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export function CardRadialMenu({
  x,
  y,
  cardId,
  enhanced,
  negated,
  value,
  revalued,
  onIntent,
  onClose,
}: {
  x: number;
  y: number;
  cardId: string;
  enhanced: boolean;
  negated: boolean;
  value: number;
  revalued: boolean;
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

  function act(intent: GameIntent) {
    void fireIntent(intent, onIntent);
    onClose();
  }

  return (
    <div
      className="card-radial"
      ref={root}
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Card actions"
    >
      <div className="radial-hub" aria-hidden />

      <div className="radial-revalue" role="group" aria-label="Revalue">
        {REVALUE_ROWS.map((row) => (
          <div key={row.join(",")} className="radial-revalue-row">
            {row.map((n) => {
              const active = revalued && value === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={`radial-chip${active ? " active" : ""}`}
                  onClick={() => act({ op: "setValue", cardId, value: n })}
                >
                  {chipLabel(n)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="radial-actions">
        <button
          type="button"
          className={`radial-pill${enhanced ? " active" : ""}`}
          onClick={() => act({ op: "enhance", cardId })}
        >
          Enhance
        </button>
        <button
          type="button"
          className={`radial-pill${negated ? " active" : ""}`}
          onClick={() => act({ op: "negate", cardId })}
        >
          Negate
        </button>
        <button
          type="button"
          className="radial-pill danger"
          onClick={() => act({ op: "discard", cardId })}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
