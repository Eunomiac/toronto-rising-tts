import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { deepMerge } from "./deepMerge.js";
import type { SeatSnapshot } from "./types.js";

type Props = {
  readonly seat: SeatSnapshot;
  readonly applying?: boolean;
  readonly onClose: () => void;
  readonly onApply: (merged: SeatSnapshot) => Promise<void>;
};

export const SeatJsonModal = ({ seat, applying = false, onClose, onApply }: Props): ReactElement => {
  const json = JSON.stringify(seat, null, 2);
  const title = seat.charName || seat.charKey || seat.color;
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(patchText);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not parse JSON.");
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("Patch must be a JSON object.");
      return;
    }
    const merged = deepMerge(seat, parsed);
    setBusy(true);
    try {
      await onApply(merged);
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
            <h2 id="pc-json-modal-title">Sheet JSON — {title}</h2>
            <p>{seat.color} seat · live snapshot from Tabletop Simulator</p>
          </div>
          <button type="button" className="pc-json-modal-close" disabled={waiting} onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body pc-json-modal-body">
          <label className="pc-json-patch-label" htmlFor="pc-json-patch">
            Patch JSON (deep-merge into the sheet below; arrays replace, objects merge)
          </label>
          <textarea
            id="pc-json-patch"
            className="pc-json-patch"
            spellCheck={false}
            value={patchText}
            disabled={waiting}
            placeholder={'{\n  "titles": ["Seneschal"],\n  "attributes": { "charisma": { "base": 4 } }\n}'}
            onChange={(event) => {
              setPatchText(event.target.value);
              if (error) {
                setError(null);
              }
            }}
          />
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
