import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import type { GameIntent } from "../protocol";
import { playSfx, unlockAudio } from "../audio/sfx";

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

async function fire(intent: GameIntent, onIntent: (i: GameIntent) => void) {
  await unlockAudio();
  switch (intent.op) {
    case "enhance":
      playSfx("enhance");
      break;
    case "negate":
      playSfx("negate");
      break;
    case "discard":
      playSfx("discard");
      break;
    case "stop":
      playSfx("stop");
      break;
    case "confirmEnd":
      playSfx("confirm");
      break;
    case "adjust":
      playSfx("tick");
      break;
    default:
      break;
  }
  onIntent(intent);
}

export function Controls({
  role,
  view,
  onIntent,
}: {
  role: ClientRole;
  view: PublicGameView;
  onIntent: (intent: GameIntent) => void;
}) {
  const stopLabel =
    view.mode === "select"
      ? "Resume"
      : view.mode === "confirm"
        ? "Confirm End"
        : "Stop";

  if (view.ended) {
    return (
      <div className="controls ended">
        <p>
          Game ended. Complications total:{" "}
          <strong>{signed(view.finalTotal ?? 0)}</strong>
        </p>
        <p className="hint">
          The Storyteller can apply this result to the roll from the Dashboard.
        </p>
      </div>
    );
  }

  if (role === "player") {
    return (
      <div className="controls player">
        <button
          type="button"
          className="btn yellow"
          onClick={() => void fire({ op: "stop" }, onIntent)}
        >
          Stop
        </button>
        <p className="hint">
          Flip a face-down card when you are ready. Press Stop when you want to
          end — the Storyteller confirms.
        </p>
      </div>
    );
  }

  return (
    <div className="controls storyteller">
      <button
        type="button"
        className={`btn ${view.mode === "confirm" ? "red" : view.mode === "select" ? "magenta" : "yellow"}`}
        onClick={() => {
          if (view.mode === "select") void fire({ op: "resume" }, onIntent);
          else if (view.mode === "confirm")
            void fire({ op: "confirmEnd" }, onIntent);
          else void fire({ op: "stop" }, onIntent);
        }}
      >
        {stopLabel}
      </button>
      {view.mode === "confirm" && (
        <button
          type="button"
          className="btn"
          onClick={() => void fire({ op: "cancelConfirm" }, onIntent)}
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        className="btn magenta"
        disabled={view.mode !== "stop"}
        onClick={() => void fire({ op: "forceSelect" }, onIntent)}
      >
        Force Select
      </button>
      <button
        type="button"
        className="btn magenta"
        onClick={() => void fire({ op: "enhance" }, onIntent)}
      >
        Enhance
      </button>
      <button
        type="button"
        className="btn blue"
        onClick={() => void fire({ op: "random", mode: "normal" }, onIntent)}
      >
        Random
      </button>
      <button
        type="button"
        className="btn red"
        onClick={() => void fire({ op: "negate" }, onIntent)}
      >
        Negate
      </button>
      <button
        type="button"
        className="btn red"
        onClick={() => void fire({ op: "discard" }, onIntent)}
      >
        Discard
      </button>
      <button
        type="button"
        className="btn yellow"
        onClick={() => void fire({ op: "adjust", delta: 1 }, onIntent)}
      >
        Adjust ({signed(view.adjust)})
      </button>
      <button
        type="button"
        className="btn yellow"
        onClick={() => void fire({ op: "adjust", delta: -1 }, onIntent)}
      >
        Adjust −
      </button>
      <button
        type="button"
        className={`btn ${view.autoDiscard ? "green" : ""}`}
        onClick={() => void fire({ op: "toggleAutoDiscard" }, onIntent)}
      >
        Auto-Disc {view.autoDiscard ? "ON" : "OFF"}
      </button>
      <label className="revalue">
        Revalue
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return;
            void fire({ op: "setValue", value: Number(v) }, onIntent);
            e.target.value = "";
          }}
        >
          <option value="">Selected card…</option>
          {Array.from({ length: 16 }, (_, i) => i - 5).map((n) => (
            <option key={n} value={n}>
              {signed(n)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
