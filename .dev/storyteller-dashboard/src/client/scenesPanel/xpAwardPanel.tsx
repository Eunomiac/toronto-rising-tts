import { useMemo, useState, type ReactElement } from "react";
import { isSeatColor, type SeatColor } from "../catalogVocab";
import type { ApplyCommand } from "../pcSheet/types";
import type { SeatSketch } from "./sketch";

const SEAT_ORDER: readonly SeatColor[] = ["Brown", "Red", "Orange", "Pink", "Purple"];

type PcSeat = { readonly color: SeatColor; readonly name: string; readonly connected: boolean };

const pcSeats = (seats: readonly SeatSketch[]): readonly PcSeat[] => {
  const byColor = new Map<SeatColor, PcSeat>();
  for (const seat of seats) {
    if (seat.kind !== "pc" || !isSeatColor(seat.color)) {
      continue;
    }
    byColor.set(seat.color, {
      color: seat.color,
      name: seat.playedBy ?? seat.name ?? seat.color,
      connected: seat.state !== "disconnected"
    });
  }
  return SEAT_ORDER.filter((color) => byColor.has(color)).map((color) => byColor.get(color)!);
};

const seedColor = (pcs: readonly PcSeat[]): SeatColor => pcs[0]?.color ?? "Brown";

/** Per-seat XP row: grey out disconnected seats when `requireConnected`. */
const SeatRow = ({
  label,
  pcs,
  requireConnected,
  onAward
}: {
  label: string;
  pcs: readonly PcSeat[];
  requireConnected: boolean;
  onAward: (color: SeatColor) => void;
}): ReactElement => (
  <div className="lab-xp-row">
    <span className="lab-xp-row-label">{label}</span>
    <div className="lab-xp-row-seats">
      {pcs.map((pc) => {
        const disabled = requireConnected && !pc.connected;
        return (
          <button
            key={pc.color}
            type="button"
            className={`lab-xp-seat lab-xp-seat--${pc.color.toLowerCase()}${disabled ? " is-disabled" : ""}`}
            disabled={disabled}
            title={disabled ? `${pc.name} is not connected` : `Award 1 XP to ${pc.name}`}
            onClick={() => onAward(pc.color)}
          >
            {pc.color}
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * END stage XP awards, plus Feedback XP on the first Play / Downtime idle stage of a session.
 * Uses the sheet bridge (`xpAppend` / `xpAppendAll`).
 * "Not connected" means a disconnected PC (`absentFromSession`), not narrative absence.
 */
export const XpAwardPanel = ({
  phase,
  seats,
  apply
}: {
  phase: "End" | "Feedback";
  seats: readonly SeatSketch[];
  apply: (command: ApplyCommand) => void;
}): ReactElement => {
  const pcs = useMemo(() => pcSeats(seats), [seats]);
  const seed = seedColor(pcs);
  const [amountText, setAmountText] = useState("1");
  const [description, setDescription] = useState("");

  const awardOne = (color: SeatColor, desc: string): void => {
    apply({ op: "xpAppend", color, amount: 1, description: desc });
  };
  const awardConnected = (desc: string): void => {
    apply({ op: "xpAppendAll", color: seed, amount: 1, description: desc });
  };
  const awardEveryone = (amount: number, desc: string): void => {
    apply({ op: "xpAppendAll", color: seed, amount, description: desc, includeDisconnected: true });
  };

  if (phase === "Feedback") {
    return (
      <div className="lab-xp-panel">
        <h3 className="lab-xp-title">Session XP</h3>
        <SeatRow
          label="Provided Feedback"
          pcs={pcs}
          requireConnected={false}
          onAward={(color) => awardOne(color, "Provided Feedback")}
        />
      </div>
    );
  }

  const customAmount = Math.floor(Number(amountText));
  const canCustom = Number.isFinite(customAmount) && customAmount !== 0 && description.trim() !== "";

  return (
    <div className="lab-xp-panel">
      <h3 className="lab-xp-title">Session XP</h3>
      <div className="lab-xp-bulk">
        <button type="button" className="lab-btn" onClick={() => awardConnected("Session attendance")}>
          +1 connected · Session attendance
        </button>
        <button type="button" className="lab-btn" onClick={() => awardEveryone(1, "End of Story")}>
          +1 everyone · End of Story
        </button>
      </div>
      <SeatRow label="Promoted Team Play" pcs={pcs} requireConnected onAward={(color) => awardOne(color, "Promoted Team Play")} />
      <SeatRow label="Compulsion Roleplay" pcs={pcs} requireConnected onAward={(color) => awardOne(color, "Compulsion Roleplay")} />
      <SeatRow label="Compulsion Resolution" pcs={pcs} requireConnected onAward={(color) => awardOne(color, "Compulsion Resolution")} />
      <div className="lab-xp-custom">
        <input
          type="number"
          className="lab-xp-amount"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          aria-label="XP amount"
        />
        <input
          type="text"
          className="lab-xp-desc"
          value={description}
          placeholder="Description for everyone"
          onChange={(event) => setDescription(event.target.value)}
        />
        <button
          type="button"
          className="lab-btn primary"
          disabled={!canCustom}
          onClick={() => awardEveryone(customAmount, description.trim())}
        >
          Award all
        </button>
      </div>
    </div>
  );
};
