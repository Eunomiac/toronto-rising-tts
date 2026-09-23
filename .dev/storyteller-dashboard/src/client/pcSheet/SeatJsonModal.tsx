import { useEffect, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { SeatSnapshot } from "./types.js";

type Props = {
  readonly seat: SeatSnapshot;
  readonly onClose: () => void;
};

export const SeatJsonModal = ({ seat, onClose }: Props): ReactElement => {
  const json = JSON.stringify(seat, null, 2);
  const title = seat.charName || seat.charKey || seat.color;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const root = typeof document !== "undefined" ? document.getElementById("modal-root") : null;
  const body = (
    <div
      className="modal-backdrop pc-json-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
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
          <button type="button" className="pc-json-modal-close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body pc-json-modal-body">
          <pre className="pc-json-modal-pre">{json}</pre>
        </div>
      </div>
    </div>
  );

  return root ? createPortal(body, root) : body;
};
