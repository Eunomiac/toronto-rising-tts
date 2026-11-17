import { useEffect, useRef } from "react";
import type { PublicGameView } from "../engine/game";
import { totalsPunch } from "../motion";

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export function Totals({ view }: { view: PublicGameView }) {
  const { totals } = view;
  const rootRef = useRef<HTMLDivElement>(null);
  const prev = useRef(totals.complicationsTotal);

  useEffect(() => {
    if (prev.current !== totals.complicationsTotal) {
      totalsPunch(rootRef.current?.querySelector(".complications .value") ?? null);
      prev.current = totals.complicationsTotal;
    }
  }, [totals.complicationsTotal]);

  return (
    <div className="totals" role="status" ref={rootRef}>
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
    </div>
  );
}
