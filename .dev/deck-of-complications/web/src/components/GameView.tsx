import { useEffect, useRef } from "react";
import type { ClientRole } from "../engine/types";
import { playSfx, unlockAudio } from "../audio/sfx";
import { bannerIn } from "../motion";
import { useGameRoom } from "../hooks/useGameRoom";
import { Board } from "./Board";
import { Controls } from "./Controls";
import { MuteButton } from "./MuteButton";
import { Totals } from "./Totals";

export function GameView({
  roomId,
  role,
  token,
  playerUrl,
}: {
  roomId: string;
  role: ClientRole;
  token: string;
  playerUrl?: string;
}) {
  const { view, error, connected, sendIntent } = useGameRoom(roomId, role, token);
  const confirmBanner = useRef<HTMLParagraphElement>(null);
  const prevMode = useRef<string | null>(null);

  useEffect(() => {
    if (!view) return;
    if (view.mode === "confirm" && prevMode.current !== "confirm") {
      bannerIn(confirmBanner.current);
      playSfx("stop");
    }
    if (view.ended && prevMode.current !== "ended") {
      playSfx("confirm");
    }
    prevMode.current = view.ended ? "ended" : view.mode;
  }, [view]);

  if (error && !view) {
    return (
      <div className="page error">
        <MuteButton />
        <h1>Deck of Complications</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="page loading">
        <MuteButton />
        <h1>Deck of Complications</h1>
        <p>{connected ? "Loading the board…" : "Connecting to the game room…"}</p>
      </div>
    );
  }

  return (
    <div className={`page game role-${role}`}>
      <MuteButton />
      <header className="top-bar">
        <div>
          <h1>Deck of Complications</h1>
          <p className="subtitle">
            {view.target.playerLabel} · {view.target.rollType} · room {roomId}
            {connected ? "" : " · reconnecting…"}
          </p>
        </div>
        {role === "storyteller" && playerUrl && (
          <button
            type="button"
            className="btn copy"
            onClick={async () => {
              await navigator.clipboard.writeText(playerUrl);
            }}
          >
            Copy player link
          </button>
        )}
      </header>

      <Totals view={view} />
      <Board
        view={view}
        role={role}
        onFlip={(cardId) => {
          void unlockAudio().then(() => {
            playSfx("flip");
            sendIntent({ op: "flip", cardId });
          });
        }}
        onSelect={(cardId) => sendIntent({ op: "select", cardId })}
      />
      <Controls role={role} view={view} onIntent={sendIntent} />
      {error && <p className="banner error">{error}</p>}
      {view.mode === "confirm" && (
        <p className="banner warn" ref={confirmBanner}>
          Stop requested — Storyteller: Confirm End or Cancel.
        </p>
      )}
      {view.enhanceNext && (
        <p className="banner info">Next flipped card will be enhanced.</p>
      )}
    </div>
  );
}
