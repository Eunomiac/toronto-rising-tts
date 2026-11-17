import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import type { GameIntent } from "../protocol";
import { floatBob, totalsPunch } from "../motion";
import { fireIntent } from "../lib/fireIntent";

gsap.registerPlugin(useGSAP);

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n === 0) return "+0";
  return String(n);
}

function statusFor(view: PublicGameView, role: ClientRole): string | null {
  if (view.ended) return null;
  if (view.mode === "confirm") {
    return role === "storyteller" ? "Confirm end?" : "Waiting for Storyteller…";
  }
  if (view.mode === "select" && role === "player") {
    return "Waiting for Storyteller…";
  }
  if (view.enhanceNext) return "Next card enhanced";
  return null;
}

function parseSignedInput(raw: string): number | null {
  const t = raw.trim().replace(/^\+/, "");
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function HoldEndButton({ onComplete }: { onComplete: () => void }) {
  const [pct, setPct] = useState(0);
  const holding = useRef(false);
  const raf = useRef(0);
  const started = useRef(0);

  function stopHold(done: boolean) {
    holding.current = false;
    cancelAnimationFrame(raf.current);
    if (done) {
      setPct(100);
      onComplete();
      window.setTimeout(() => setPct(0), 200);
    } else {
      setPct(0);
    }
  }

  function tick(now: number) {
    if (!holding.current) return;
    const p = Math.min(1, (now - started.current) / 900);
    setPct(p * 100);
    if (p >= 1) {
      stopHold(true);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }

  function startHold() {
    holding.current = true;
    started.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      type="button"
      className="st-btn st-hold-end"
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        startHold();
      }}
      onPointerUp={() => stopHold(false)}
      onPointerCancel={() => stopHold(false)}
      onPointerLeave={() => {
        if (holding.current) stopHold(false);
      }}
    >
      <span className="st-hold-fill" style={{ width: `${pct}%` }} />
      <span className="st-hold-label">End Game</span>
    </button>
  );
}

export function FloatingHud({
  role,
  view,
  onIntent,
}: {
  role: ClientRole;
  view: PublicGameView;
  onIntent: (intent: GameIntent) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const prevTotal = useRef(view.totals.complicationsTotal);
  const status = statusFor(view, role);
  const [marginDraft, setMarginDraft] = useState(signed(view.totals.originalMargin));
  const [modifyDraft, setModifyDraft] = useState(signed(view.adjust));

  useEffect(() => {
    setMarginDraft(signed(view.totals.originalMargin));
  }, [view.totals.originalMargin]);

  useEffect(() => {
    setModifyDraft(signed(view.adjust));
  }, [view.adjust]);

  useGSAP(
    () => {
      if (!root.current) return;
      const floats = Array.from(
        root.current.querySelectorAll(".float-score .bob, .float-status .bob"),
      );
      floatBob(floats);
    },
    { scope: root, dependencies: [status] },
  );

  useEffect(() => {
    if (prevTotal.current !== view.totals.complicationsTotal) {
      totalsPunch(root.current?.querySelector(".float-score.complications") ?? null);
      prevTotal.current = view.totals.complicationsTotal;
    }
  }, [view.totals.complicationsTotal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || view.ended) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (role === "player") void fireIntent({ op: "stop" }, onIntent);
      else if (view.mode === "confirm") void fireIntent({ op: "confirmEnd" }, onIntent);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role, view.ended, view.mode, onIntent]);

  const marginTone =
    view.totals.originalMargin < 0
      ? "tone-red"
      : "tone-gold";
  const modifyTone =
    view.adjust < 0 ? "tone-red" : view.adjust > 0 ? "tone-gold" : "tone-grey";
  const stHasControl = view.mode === "select" || view.mode === "confirm";
  const hasSelection = view.selectedIds.length > 0;

  return (
    <div className={`floating-hud role-${role}`} ref={root}>
      <div className="float-score original" aria-label="Original margin">
        <span className="bob">{signed(view.totals.originalMargin)}</span>
      </div>
      <div className="float-score complications" aria-label="Complications total">
        <span className="bob">{signed(view.totals.complicationsTotal)}</span>
      </div>
      <div className="float-score adjusted" aria-label="Adjusted margin">
        <span className="bob">
          {signed(view.totals.adjustedMargin)}
          {view.totals.buzzkillCapped ? "*" : ""}
        </span>
      </div>

      {status && (
        <p className="float-status" role="status">
          <span className="bob">{status}</span>
        </p>
      )}

      {role === "player" && !view.ended && (
        <button
          type="button"
          className="float-stop"
          onClick={() => void fireIntent({ op: "stop" }, onIntent)}
        >
          Stop
        </button>
      )}

      {role === "storyteller" && view.mode === "confirm" && (
        <button
          type="button"
          className="float-cancel"
          onClick={() => void fireIntent({ op: "cancelConfirm" }, onIntent)}
        >
          Cancel
        </button>
      )}

      {role === "storyteller" && !view.ended && (
        <>
          <div className="st-panel st-panel-left">
            <div className="st-field">
              <label htmlFor="st-margin">Margin</label>
              <input
                id="st-margin"
                className={marginTone}
                value={marginDraft}
                onChange={(e) => setMarginDraft(e.target.value)}
                onBlur={() => {
                  const n = parseSignedInput(marginDraft);
                  if (n == null) {
                    setMarginDraft(signed(view.totals.originalMargin));
                    return;
                  }
                  void fireIntent({ op: "setMargin", value: n }, onIntent);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className="st-field">
              <label htmlFor="st-modify">Modify</label>
              <input
                id="st-modify"
                className={modifyTone}
                value={modifyDraft}
                onChange={(e) => setModifyDraft(e.target.value)}
                onBlur={() => {
                  const n = parseSignedInput(modifyDraft);
                  if (n == null) {
                    setModifyDraft(signed(view.adjust));
                    return;
                  }
                  void fireIntent({ op: "setAdjust", value: n }, onIntent);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <button
              type="button"
              className={`st-btn ${stHasControl ? "neutral" : "danger"}`}
              onClick={() => {
                if (stHasControl) void fireIntent({ op: "resume" }, onIntent);
                else void fireIntent({ op: "forceSelect" }, onIntent);
              }}
            >
              {stHasControl ? "Pass Back" : "Take Control"}
            </button>
            <button
              type="button"
              className="st-btn neutral"
              disabled={!hasSelection}
              onClick={() => {
                if (!hasSelection) return;
                void fireIntent({ op: "pickRandomSelected" }, onIntent);
              }}
            >
              {hasSelection ? "Pick Random" : "Select Card(s)"}
            </button>
          </div>

          <div className="st-panel st-panel-right">
            <button
              type="button"
              className={`st-btn ${view.autoDiscard ? "on" : "neutral"}`}
              onClick={() => void fireIntent({ op: "toggleAutoDiscard" }, onIntent)}
            >
              {view.autoDiscard ? "Category Discard On" : "Category Discard Off"}
            </button>
            <HoldEndButton
              onComplete={() => void fireIntent({ op: "confirmEnd" }, onIntent)}
            />
          </div>
        </>
      )}

      {view.ended && (
        <div className="float-sealed">
          Sealed {signed(view.finalTotal ?? 0)}
        </div>
      )}
    </div>
  );
}
