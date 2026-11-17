import type { ClientRole } from "../engine/types";
import { playSfx, unlockAudio } from "../audio/sfx";
import { useGameRoom } from "../hooks/useGameRoom";
import { Board } from "./Board";
import { MuteButton } from "./MuteButton";
import { SessionStrip } from "./SessionStrip";

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
            className="btn"
            onClick={async () => {
              await navigator.clipboard.writeText(playerUrl);
            }}
          >
            Copy player link
          </button>
        )}
      </header>

      <div className="game-stage">
        <div className="game-main">
          <SessionStrip role={role} view={view} onIntent={sendIntent} />
          <Board
            view={view}
            role={role}
            onFlip={(cardId) => {
              void unlockAudio().then(() => {
                playSfx("burn");
                sendIntent({ op: "flip", cardId });
              });
            }}
            onSelect={(cardId) => sendIntent({ op: "select", cardId })}
            onIntent={sendIntent}
          />
        </div>
      </div>
      {error && <p className="banner error">{error}</p>}
    </div>
  );
}
