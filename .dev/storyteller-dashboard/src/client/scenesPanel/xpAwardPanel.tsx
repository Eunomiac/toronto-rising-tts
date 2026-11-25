import { useMemo, useState, type ReactElement } from "react";
import { isSeatColor, type SeatColor } from "../catalogVocab";
import type { ApplyCommand, SeatSnapshot } from "../pcSheet/types";
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

const clickKey = (description: string, color: SeatColor): string => `${description}|${color}`;

/** Seats whose latest Experience Log line is this award, plus seats clicked this visit. */
export const colorsAwarded = (
  seats: readonly Pick<SeatSnapshot, "color" | "lastXpEntry">[],
  description: string,
  clicked: ReadonlySet<string>
): ReadonlySet<SeatColor> => {
  const out = new Set<SeatColor>();
  for (const seat of seats) {
    if (seat.lastXpEntry?.description === description) {
      out.add(seat.color);
    }
  }
  for (const key of clicked) {
    const split = key.indexOf("|");
    const desc = key.slice(0, split);
    const color = key.slice(split + 1);
    if (desc === description && isSeatColor(color)) {
      out.add(color);
    }
  }
  return out;
};

/** Per-seat XP row: grey out disconnected seats when `requireConnected`. */
const SeatRow = ({
  label,
  pcs,
  requireConnected,
  awarded,
  onAward
}: {
  label: string;
  pcs: readonly PcSeat[];
  requireConnected: boolean;
  awarded: ReadonlySet<SeatColor>;
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
            className={`lab-xp-seat lab-xp-seat--${pc.color.toLowerCase()}${disabled ? " is-disabled" : ""}${awarded.has(pc.color) ? " is-awarded" : ""}`}
            disabled={disabled}
            aria-pressed={awarded.has(pc.color)}
            title={disabled ? `${pc.name} is not connected` : awarded.has(pc.color) ? `${pc.name} has this XP` : `Award 1 XP to ${pc.name}`}
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
  sheetSeats,
  apply
}: {
  phase: "End" | "Feedback";
  seats: readonly SeatSketch[];
  /** Live sheet seats, so a button stays lit when that XP is already on the character. */
  sheetSeats?: readonly Pick<SeatSnapshot, "color" | "lastXpEntry">[];
  apply: (command: ApplyCommand) => void;
}): ReactElement => {
  const pcs = useMemo(() => pcSeats(seats), [seats]);
  const seed = seedColor(pcs);
  const [amountText, setAmountText] = useState("1");
  const [description, setDescription] = useState("");
  const [personal, setPersonal] = useState<Readonly<Record<string, { amount: string; description: string }>>>({});
  const [personalSent, setPersonalSent] = useState<ReadonlySet<SeatColor>>(() => new Set());
  const [clicked, setClicked] = useState<ReadonlySet<string>>(() => new Set());
  const mark = (desc: string, color: SeatColor): void => {
    setClicked((prev) => new Set(prev).add(clickKey(desc, color)));
  };
  const awarded = (desc: string): ReadonlySet<SeatColor> => colorsAwarded(sheetSeats ?? [], desc, clicked);

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
      <div className="lab-xp-panel is-feedback">
        <h3 className="lab-xp-title">Session XP</h3>
        <SeatRow
          label="Provided Feedback"
          pcs={pcs}
          requireConnected={false}
          awarded={awarded("Provided Feedback")}
          onAward={(color) => {
            mark("Provided Feedback", color);
            awardOne(color, "Provided Feedback");
          }}
        />
      </div>
    );
  }

  const customAmount = Math.floor(Number(amountText));
  const canCustom = Number.isFinite(customAmount) && customAmount !== 0 && description.trim() !== "";

  return (
    <div className="lab-xp-panel is-end">
      <h3 className="lab-xp-title">Session XP</h3>
      <div className="lab-xp-bulk">
        <button type="button" className="lab-btn" onClick={() => awardConnected("Session Attendance")}>
          +1 connected · Session Attendance
        </button>
        <button type="button" className="lab-btn" onClick={() => awardEveryone(1, "End of Story")}>
          +1 everyone · End of Story
        </button>
      </div>
      <SeatRow label="Promoted Team Play" pcs={pcs} requireConnected awarded={awarded("Promoted Team Play")} onAward={(color) => { mark("Promoted Team Play", color); awardOne(color, "Promoted Team Play"); }} />
      <SeatRow label="Compulsion Roleplay" pcs={pcs} requireConnected awarded={awarded("Compulsion Roleplay")} onAward={(color) => { mark("Compulsion Roleplay", color); awardOne(color, "Compulsion Roleplay"); }} />
      <SeatRow label="Compulsion Resolution" pcs={pcs} requireConnected awarded={awarded("Compulsion Resolution")} onAward={(color) => { mark("Compulsion Resolution", color); awardOne(color, "Compulsion Resolution"); }} />
      {pcs.map((pc) => {
        const row = personal[pc.color] ?? { amount: "1", description: "" };
        const amount = Math.floor(Number(row.amount));
        const text = row.description.trim();
        const ready = Number.isFinite(amount) && amount !== 0 && text !== "";
        return (
          <div className="lab-xp-custom is-one" key={pc.color}>
            <span className="lab-xp-row-label">{pc.name}</span>
            <input
              type="number"
              className="lab-xp-amount"
              value={row.amount}
              aria-label={`${pc.name} XP amount`}
              onChange={(event) => setPersonal((prev) => ({ ...prev, [pc.color]: { ...row, amount: event.target.value } }))}
            />
            <input
              type="text"
              className="lab-xp-desc"
              value={row.description}
              placeholder="Description"
              aria-label={`${pc.name} XP description`}
              onChange={(event) => setPersonal((prev) => ({ ...prev, [pc.color]: { ...row, description: event.target.value } }))}
            />
            <button
              type="button"
              className={`lab-btn lab-xp-seat lab-xp-seat--${pc.color.toLowerCase()}${personalSent.has(pc.color) ? " is-awarded" : ""}`}
              disabled={!ready}
              onClick={() => {
                apply({ op: "xpAppend", color: pc.color, amount, description: text });
                setPersonalSent((prev) => new Set(prev).add(pc.color));
              }}
            >
              Award
            </button>
          </div>
        );
      })}
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
