import type { CSSProperties, ReactElement } from "react";
import { identityForColor } from "./identity.js";
import { ROLL_TYPES, SEAT_ACCENT } from "./layout.js";
import type { ApplyCommand, SeatColor, SeatSnapshot } from "./types.js";

type Props = {
  readonly seats: readonly SeatSnapshot[];
  readonly selected: SeatColor;
  readonly onSelect: (color: SeatColor) => void;
  readonly onCommand: (command: ApplyCommand) => void;
};

export const PlayerRail = ({ seats, selected, onSelect, onCommand }: Props): ReactElement => (
  <aside className="pc-rail" aria-label="Players">
    {seats.map((seat) => {
      const identity = identityForColor(seat.color);
      const open = seat.color === selected;
      return (
        <article
          key={seat.color}
          className={`pc-card${open ? " selected" : ""}`}
          style={{ "--seat": SEAT_ACCENT[seat.color] } as CSSProperties}
        >
          <button className="pc-card-main" type="button" onClick={() => onSelect(seat.color)}>
            <span className="pc-card-pip" />
            <span className="pc-card-copy">
              <strong>{identity.fullName}</strong>
              <em>{seat.playerName || seat.color}</em>
            </span>
            <span className="pc-card-flags">
              {seat.absentFromSession ? "Absent" : "Present"}
              {seat.torpor ? " · Torpor" : ""}
              {seat.hudFrenzy ? " · Frenzy" : ""}
            </span>
          </button>
          {open ? (
            <div className="pc-card-tools">
              <label>
                <input
                  type="checkbox"
                  checked={seat.absentFromSession}
                  onChange={(event) => onCommand({ op: "absent", color: seat.color, value: event.target.checked })}
                />
                Absent
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={seat.deferAutoSeat}
                  onChange={(event) => onCommand({ op: "deferAutoSeat", color: seat.color, value: event.target.checked })}
                />
                Defer seat
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={seat.deferConnect}
                  onChange={(event) => onCommand({ op: "deferConnect", color: seat.color, value: event.target.checked })}
                />
                Defer connect
              </label>
              <div className="pc-card-actions">
                <button type="button" onClick={() => onCommand({ op: "autoSeat", color: seat.color })}>Auto-Seat</button>
                <button type="button" onClick={() => onCommand({ op: "connect", color: seat.color })}>Connect</button>
              </div>
              <div className="pc-card-actions">
                <button type="button" className={seat.hudFrenzy ? "on" : undefined} onClick={() => onCommand({ op: "toggleFrenzy", color: seat.color })}>Frenzy</button>
                <button type="button" className={seat.hudBlindfold ? "on" : undefined} onClick={() => onCommand({ op: "toggleBlindfold", color: seat.color })}>Blindfold</button>
                <button type="button" disabled={!seat.torpor} onClick={() => onCommand({ op: "torporClear", color: seat.color })}>Clear Torpor</button>
              </div>
              <div className="pc-rolls" role="group" aria-label="Storyteller rolls">
                {ROLL_TYPES.map((roll) => (
                  <button
                    key={roll.id}
                    type="button"
                    onClick={() => onCommand({ op: "initiateRoll", color: seat.color, rollType: roll.id })}
                  >
                    {roll.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      );
    })}
  </aside>
);
