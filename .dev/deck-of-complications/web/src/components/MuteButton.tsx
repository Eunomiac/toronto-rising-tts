import { useState } from "react";
import { isMuted, toggleMuted, unlockAudio } from "../audio/sfx";

export function MuteButton() {
  const [muted, setMutedState] = useState(isMuted);

  return (
    <button
      type="button"
      className="mute-toggle"
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      aria-pressed={muted}
      onClick={async () => {
        await unlockAudio();
        setMutedState(toggleMuted());
      }}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 9v6h3l5 4V5L7 9H4zm12.5 3a3.5 3.5 0 0 0-1.8-3.05l1.05-1.7A5.5 5.5 0 0 1 19.5 12a5.5 5.5 0 0 1-3.75 5.2l-1.05-1.7A3.5 3.5 0 0 0 16.5 12zM3.3 4.7l16 16 1.4-1.4-16-16z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 9v6h3l5 4V5L7 9H4zm12.5 3a3.5 3.5 0 0 0-1.8-3.05l1.05-1.7A5.5 5.5 0 0 1 19.5 12a5.5 5.5 0 0 1-3.75 5.2l-1.05-1.7A3.5 3.5 0 0 0 16.5 12z" />
        </svg>
      )}
    </button>
  );
}
