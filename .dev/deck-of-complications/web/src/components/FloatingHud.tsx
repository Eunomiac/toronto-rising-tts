import { useEffect, useRef } from "react";
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
      else if (view.mode === "select") void fireIntent({ op: "resume" }, onIntent);
      else if (view.mode === "confirm") void fireIntent({ op: "confirmEnd" }, onIntent);
      else void fireIntent({ op: "stop" }, onIntent);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role, view.ended, view.mode, onIntent]);

  const stopLabel =
    role === "player"
      ? "Stop"
      : view.mode === "select"
        ? "Resume"
        : view.mode === "confirm"
          ? "Confirm"
          : "Stop";

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

      {!view.ended && (
        <button
          type="button"
          className="float-stop"
          onClick={() => {
            if (role === "player") void fireIntent({ op: "stop" }, onIntent);
            else if (view.mode === "select") void fireIntent({ op: "resume" }, onIntent);
            else if (view.mode === "confirm") void fireIntent({ op: "confirmEnd" }, onIntent);
            else void fireIntent({ op: "stop" }, onIntent);
          }}
        >
          {stopLabel}
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

      {role === "storyteller" && (
        <div className="float-st-tools">
          <button
            type="button"
            className="float-gear"
            title="Toggle auto-discard"
            onClick={() => void fireIntent({ op: "toggleAutoDiscard" }, onIntent)}
          >
            {view.autoDiscard ? "Auto-disc On" : "Auto-disc Off"}
          </button>
          <div className="float-adjust">
            <button
              type="button"
              onClick={() => void fireIntent({ op: "adjust", delta: -1 }, onIntent)}
            >
              −
            </button>
            <span>{signed(view.adjust)}</span>
            <button
              type="button"
              onClick={() => void fireIntent({ op: "adjust", delta: 1 }, onIntent)}
            >
              +
            </button>
          </div>
        </div>
      )}

      {view.ended && (
        <div className="float-sealed">
          Sealed {signed(view.finalTotal ?? 0)}
        </div>
      )}
    </div>
  );
}
