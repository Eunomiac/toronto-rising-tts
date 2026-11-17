import { useEffect, useRef } from "react";
import type { PublicGameView } from "../engine/game";
import { totalsPunch, waxSeal } from "../motion";

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export function Totals({
  view,
  className = "",
  onAdjustClick,
  adjust,
}: {
  view: PublicGameView;
  className?: string;
  onAdjustClick?: () => void;
  adjust?: number;
}) {
  const { totals } = view;
  const rootRef = useRef<HTMLDivElement>(null);
  const prev = useRef(totals.complicationsTotal);
  const sealRef = useRef<HTMLDivElement>(null);
  const wasEnded = useRef(false);

  useEffect(() => {
    if (prev.current !== totals.complicationsTotal) {
      totalsPunch(rootRef.current?.querySelector(".complications .value") ?? null);
      prev.current = totals.complicationsTotal;
    }
  }, [totals.complicationsTotal]);

  useEffect(() => {
    if (view.ended && !wasEnded.current) {
      waxSeal(sealRef.current);
      wasEnded.current = true;
    }
    if (!view.ended) wasEnded.current = false;
  }, [view.ended]);

  return (
    <div className={`totals ${className}`.trim()} role="status" ref={rootRef}>
      <div className="total-block original">
        <span className="label">Original</span>
        <span className="value">{signed(totals.originalMargin)}</span>
      </div>
      <div className="total-block complications">
        <span className="label">Complications</span>
        <span className="value">{signed(totals.complicationsTotal)}</span>
      </div>
      <div className="total-block adjusted">
        <span className="label">Adjusted</span>
        <span className="value">
          {signed(totals.adjustedMargin)}
          {totals.buzzkillCapped ? " *" : ""}
        </span>
      </div>
      {onAdjustClick && (
        <button
          type="button"
          className="total-block adjust-edit"
          onClick={onAdjustClick}
          title="Storyteller adjust"
        >
          <span className="label">ST Adjust</span>
          <span className="value">
            {adjust != null && adjust > 0 ? `+${adjust}` : String(adjust ?? 0)}
          </span>
        </button>
      )}
      {view.ended && (
        <div className="wax-seal" ref={sealRef} aria-hidden>
          Sealed
        </div>
      )}
    </div>
  );
}
