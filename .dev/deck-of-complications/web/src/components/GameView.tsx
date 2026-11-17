import type { ClientRole } from "../engine/types";
import { playSfx, unlockAudio } from "../audio/sfx";
import { useGameRoom } from "../hooks/useGameRoom";
import { Board } from "./Board";
import { FloatingHud } from "./FloatingHud";
import { MuteButton } from "./MuteButton";

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
        <p>{connected ? "Loading the board…" : "Connecting…"}</p>
      </div>
    );
  }

  return (
    <div className={`page game immersive role-${role}`}>
      <MuteButton />
      {role === "storyteller" && playerUrl && (
        <button
          type="button"
          className="solo-dev-tools copy-link"
          onClick={async () => {
            await navigator.clipboard.writeText(playerUrl);
          }}
        >
          Copy player link · {roomId}
        </button>
      )}
      {!connected && <p className="reconnect-pill">Reconnecting…</p>}
      <FloatingHud role={role} view={view} onIntent={sendIntent} />
      <Board
        view={view}
        role={role}
        onFlip={(cardId) => {
          void unlockAudio().then(() => {
            playSfx("burn");
            sendIntent({ op: "flip", cardId });
          });
        }}
        onToggleSelect={(cardId) => sendIntent({ op: "toggleSelect", cardId })}
        onIntent={sendIntent}
      />
      {error && <p className="banner error">{error}</p>}
    </div>
  );
}
