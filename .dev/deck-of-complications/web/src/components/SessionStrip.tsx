import { useEffect, useState } from "react";
import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import type { GameIntent } from "../protocol";
import { Totals } from "./Totals";
import { fireIntent } from "../lib/fireIntent";

function statusLine(view: PublicGameView, role: ClientRole): string {
  if (view.ended) {
    return role === "storyteller"
      ? "Game sealed — apply the result from the Dashboard when ready."
      : "The Storyteller will apply this result to your roll.";
  }
  if (view.mode === "confirm") {
    return role === "storyteller"
      ? "Stop requested — confirm the end, or cancel to keep playing."
      : "Waiting for the Storyteller to confirm.";
  }
  if (view.enhanceNext) return "Next flipped card will be enhanced.";
  if (view.mode === "select" && role === "player") {
    return "The Storyteller is resolving a card effect…";
  }
  if (role === "player") return "Flip a card, or stop when you are ready.";
  return "Click a face-up card for actions · right-click or long-press for the ring.";
}

export function SessionStrip({
  role,
  view,
  onIntent,
}: {
  role: ClientRole;
  view: PublicGameView;
  onIntent: (intent: GameIntent) => void;
}) {
  const [gearOpen, setGearOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !view.ended) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
        e.preventDefault();
        if (role === "player") void fireIntent({ op: "stop" }, onIntent);
        else if (view.mode === "select") void fireIntent({ op: "resume" }, onIntent);
        else if (view.mode === "confirm") void fireIntent({ op: "confirmEnd" }, onIntent);
        else void fireIntent({ op: "stop" }, onIntent);
      }
      if (e.key === "Escape" && view.mode === "confirm" && role === "storyteller") {
        void fireIntent({ op: "cancelConfirm" }, onIntent);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role, view.ended, view.mode, onIntent]);

  const stopLabel =
    view.mode === "select"
      ? "Resume"
      : view.mode === "confirm"
        ? "Confirm End"
        : "Stop";

  return (
    <div className={`session-strip role-${role}`}>
      <Totals
        view={view}
        className={role === "storyteller" ? "strip" : ""}
        onAdjustClick={
          role === "storyteller" && !view.ended
            ? () => setAdjustOpen((v) => !v)
            : undefined
        }
        adjust={view.adjust}
      />
      <p className="status-whisper">{statusLine(view, role)}</p>
      <div className="session-actions">
        {!view.ended && (
          <button
            type="button"
            className={`btn session ${view.mode === "confirm" ? "red" : "yellow"}`}
            onClick={() => {
              if (role === "player") void fireIntent({ op: "stop" }, onIntent);
              else if (view.mode === "select") void fireIntent({ op: "resume" }, onIntent);
              else if (view.mode === "confirm")
                void fireIntent({ op: "confirmEnd" }, onIntent);
              else void fireIntent({ op: "stop" }, onIntent);
            }}
          >
            {role === "player" ? "Stop" : stopLabel}
          </button>
        )}
        {role === "storyteller" && view.mode === "confirm" && (
          <button
            type="button"
            className="btn session"
            onClick={() => void fireIntent({ op: "cancelConfirm" }, onIntent)}
          >
            Cancel
          </button>
        )}
        {role === "storyteller" && (
          <div className="gear-wrap">
            <button
              type="button"
              className="btn gear"
              aria-expanded={gearOpen}
              aria-label="Table options"
              onClick={() => setGearOpen((v) => !v)}
            >
              ⚙
            </button>
            {gearOpen && (
              <div className="gear-menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    void fireIntent({ op: "toggleAutoDiscard" }, onIntent);
                    setGearOpen(false);
                  }}
                >
                  Auto-discard categories: {view.autoDiscard ? "On" : "Off"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {adjustOpen && role === "storyteller" && (
        <div className="adjust-popover">
          <span>Storyteller adjust</span>
          <button
            type="button"
            onClick={() => void fireIntent({ op: "adjust", delta: -1 }, onIntent)}
          >
            −
          </button>
          <strong>
            {view.adjust > 0 ? `+${view.adjust}` : view.adjust}
          </strong>
          <button
            type="button"
            onClick={() => void fireIntent({ op: "adjust", delta: 1 }, onIntent)}
          >
            +
          </button>
          <button type="button" className="ghost" onClick={() => setAdjustOpen(false)}>
            Done
          </button>
        </div>
      )}
      {view.ended && (
        <div className="ended-seal" aria-live="polite">
          Complications {view.finalTotal != null && view.finalTotal > 0
            ? `+${view.finalTotal}`
            : String(view.finalTotal ?? 0)}
        </div>
      )}
    </div>
  );
}
