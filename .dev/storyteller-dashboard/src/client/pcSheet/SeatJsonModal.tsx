import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { parseJsonLenient } from "./jsonSanitize.js";

type Props = {
  readonly title: string;
  /** Raw gameState.playerData for this seat. */
  readonly playerData: Record<string, unknown>;
  readonly applying?: boolean;
  readonly onClose: () => void;
  /** Patch object only (keys the author typed) — merged into playerData. */
  readonly onApply: (patch: Record<string, unknown>) => Promise<void>;
};

export const SeatJsonModal = ({
  title,
  playerData,
  applying = false,
  onClose,
  onApply
}: Props): ReactElement => {
  const json = JSON.stringify(playerData, null, 2);
  const [patchText, setPatchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !busy && !applying) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy, applying]);

  const handleApply = async (): Promise<void> => {
    setError(null);
    const body = patchText.trim();
    if (body === "") {
      setError("Add at least one property to apply.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = parseJsonLenient(`{\n${body}\n}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not parse JSON.");
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("Patch must be a JSON object.");
      return;
    }
    setBusy(true);
    try {
      await onApply(parsed as Record<string, unknown>);
      setPatchText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Apply failed.");
    } finally {
      setBusy(false);
    }
  };

  const root = typeof document !== "undefined" ? document.getElementById("modal-root") : null;
  const waiting = busy || applying;
  const body = (
    <div
      className="modal-backdrop pc-json-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !waiting) {
          onClose();
        }
      }}
    >
      <div
        className="modal-card pc-json-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-json-modal-title"
      >
        <header className="modal-header pc-json-modal-header">
          <div>
            <h2 id="pc-json-modal-title">Player data — {title}</h2>
          </div>
          <button type="button" className="pc-json-modal-close" disabled={waiting} onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body pc-json-modal-body">
          <div className="pc-json-patch-frame">
            <span className="pc-json-brace" aria-hidden="true">{"{"}</span>
            <textarea
              id="pc-json-patch"
              className="pc-json-patch"
              spellCheck={false}
              value={patchText}
              disabled={waiting}
              placeholder={'"xp": { "-5": { "newTotal": 3 } },\n"desire": null'}
              onChange={(event) => {
                setPatchText(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
            />
            <span className="pc-json-brace" aria-hidden="true">{"}"}</span>
          </div>
          <div className="pc-json-patch-actions">
            <button
              type="button"
              className="pc-json-apply"
              disabled={waiting || patchText.trim() === ""}
              onClick={() => void handleApply()}
            >
              {waiting ? "Applying…" : "Apply"}
            </button>
            {error ? <p className="pc-json-patch-error" role="alert">{error}</p> : null}
          </div>
          <pre className="pc-json-modal-pre">{json}</pre>
        </div>
      </div>
    </div>
  );

  return root ? createPortal(body, root) : body;
};
