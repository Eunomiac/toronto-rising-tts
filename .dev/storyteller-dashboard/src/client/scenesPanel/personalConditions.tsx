import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { isSeatColor } from "../catalogVocab";
import type { ApplyCommand, ManualCondition, SeatSnapshot } from "../pcSheet/types";
import type { PersonalDue } from "../worldState";

const TEMPERAMENTS = ["fleetingly", "intensely", "acutely"] as const;
const RESONANCE_TYPES = ["Choleric", "Melancholic", "Phlegmatic", "Sanguine", "Primal", "Ischemic", "Mercurial"] as const;
const SHEET_TYPES = [
  { id: "theBeast", label: "The Beast" },
  { id: "debilitation", label: "Debilitation" },
  { id: "general", label: "General" }
] as const;
const TEXT_COLORS = [
  { id: "white", label: "White" },
  { id: "gold", label: "Gold" },
  { id: "red", label: "Red" }
] as const;

type Kind = "EndOfScene" | "EndOfSession" | "Clock" | "ChangeOfBlood" | "Manual";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

const ordinal = (day: number): string => {
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) {
    return `${day}th`;
  }
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
};

const shortDate = (year: number, month: number, day: number): string =>
  `${MONTHS[month - 1] ?? "?"} ${ordinal(day)}, ${year}`;

/** The line the sheet shows for a removal trigger. Manual stays blank until you type one. */
export const durationForTrigger = (kind: Kind, session: number, year: number, month: number, day: number): string => {
  if (kind === "EndOfScene") return "This Condition persists until the end of the current scene.";
  if (kind === "EndOfSession") return `This Condition persists until the end of Session ${session}.`;
  if (kind === "Clock") return `This Condition persists until nightfall on ${shortDate(year, month, day)}.`;
  if (kind === "ChangeOfBlood") return "This Condition persists until you feed on another mortal's blood or your Hunger reaches 5.";
  return "";
};

const temperamentLabel = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const TriggerFields = ({ sessionNum, hunger, kind, session, year, month, day, duration, onKind, onSession, onYear, onMonth, onDay, onDuration }: {
  sessionNum: number;
  hunger: number;
  kind: Kind;
  session: number;
  year: number;
  month: number;
  day: number;
  duration: string;
  onKind: (kind: Kind) => void;
  onSession: (session: number) => void;
  onYear: (year: number) => void;
  onMonth: (month: number) => void;
  onDay: (day: number) => void;
  onDuration: (duration: string) => void;
}): ReactElement => (
  <>
    <label className="pc-cond-field">
      Ends
      <select value={kind} onChange={(event) => onKind(event.target.value as Kind)}>
        <option value="EndOfScene">End of the scene</option>
        <option value="EndOfSession">End of a session</option>
        <option value="Clock">A calendar date</option>
        <option value="ChangeOfBlood" disabled={hunger >= 5}>Hunger drops, or Hunger reaches 5</option>
        <option value="Manual">Manual</option>
      </select>
    </label>
    {kind === "EndOfSession" && (
      <div className="pc-cond-choices">
        {[sessionNum, sessionNum + 1, sessionNum + 2].map((number) => (
          <button key={number} type="button" className={`lab-btn${session === number ? " on" : ""}`} onClick={() => onSession(number)}>
            Session {number}
          </button>
        ))}
      </div>
    )}
    {kind === "Clock" && (
      <div className="pc-cond-date">
        <input aria-label="Month" type="number" min={1} max={12} value={month} onChange={(event) => onMonth(Number(event.target.value))} />
        <input aria-label="Day" type="number" min={1} max={31} value={day} onChange={(event) => onDay(Number(event.target.value))} />
        <input aria-label="Year" type="number" min={1} max={9999} value={year} onChange={(event) => onYear(Number(event.target.value))} />
      </div>
    )}
    {kind === "ChangeOfBlood" && hunger >= 5 && (
      <p className="pc-cond-note">Hunger is already 5, so this ending cannot be used.</p>
    )}
    <label className="pc-cond-field">
      Duration
      <input value={duration} onChange={(event) => onDuration(event.target.value)} />
    </label>
  </>
);

const useTrigger = (sessionNum: number): {
  kind: Kind;
  session: number;
  year: number;
  month: number;
  day: number;
  duration: string;
  setKind: (kind: Kind) => void;
  setSession: (session: number) => void;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setDay: (day: number) => void;
  setDuration: (duration: string) => void;
} => {
  const today = new Date();
  const [kind, setKind] = useState<Kind>("EndOfScene");
  const [session, setSession] = useState(sessionNum);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [duration, setDuration] = useState(durationForTrigger("EndOfScene", sessionNum, today.getFullYear(), today.getMonth() + 1, today.getDate()));
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) {
      setDuration(durationForTrigger(kind, session, year, month, day));
    }
  }, [edited, kind, session, year, month, day]);
  return {
    kind, session, year, month, day, duration,
    setKind: (next) => {
      setEdited(false);
      setKind(next);
    },
    setSession: (next) => {
      setEdited(false);
      setSession(next);
    },
    setYear: (next) => {
      setEdited(false);
      setYear(next);
    },
    setMonth: (next) => {
      setEdited(false);
      setMonth(next);
    },
    setDay: (next) => {
      setEdited(false);
      setDay(next);
    },
    setDuration: (next) => {
      setEdited(true);
      setDuration(next);
    }
  };
};

/** Keep the form inside the stage. It grows up from the tracker popup, and opens to the left when the right side has no room. */
const placeConditionPanel = (node: HTMLElement): void => {
  const frame = node.closest(".lab-box") ?? node.closest(".lab-canvas");
  const pop = node.parentElement;
  if (frame === null || pop === null) {
    return;
  }
  const bounds = frame.getBoundingClientRect();
  const anchor = pop.getBoundingClientRect();
  const gap = 8;
  const roomRight = bounds.right - anchor.right - gap;
  const roomLeft = anchor.left - bounds.left - gap;
  const openLeft = roomRight < 360 && roomLeft > roomRight;
  const available = Math.max(160, openLeft ? roomLeft : roomRight);
  const room = Math.min(460, available);
  node.classList.toggle("left", openLeft);
  node.style.width = `${Math.floor(room)}px`;
  node.style.maxHeight = `${Math.max(180, Math.floor(anchor.bottom - bounds.top - gap))}px`;
};

/** Resonance grid, or the other-condition form, beside the seat tracker popup. */
export const ConditionPanel = ({ seat, sessionNum, manualConditions, pane, apply }: {
  seat: SeatSnapshot;
  sessionNum: number;
  manualConditions: readonly ManualCondition[];
  pane: "resonance" | "other";
  apply: (command: ApplyCommand) => void;
}): ReactElement => {
  const [dyscrasia, setDyscrasia] = useState(false);
  const [dyscrasiaTitle, setDyscrasiaTitle] = useState("");
  const [dyscrasiaDescription, setDyscrasiaDescription] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayType, setDisplayType] = useState<(typeof SHEET_TYPES)[number]["id"]>("general");
  const [textColor, setTextColor] = useState<(typeof TEXT_COLORS)[number]["id"]>("white");
  const [onSheet, setOnSheet] = useState(true);
  const [condition, setCondition] = useState("");
  const trigger = useTrigger(sessionNum);
  const resonance = seat.personalResonance;
  const cards = Array.isArray(seat.personalCards) ? seat.personalCards : [];
  const shown = cards.filter((card) => card.displayOnSheet).length;
  const sheetFull = onSheet && shown >= 8;
  const bloodBlocked = trigger.kind === "ChangeOfBlood" && seat.hunger >= 5;

  const pickResonance = (temperament: string, resonanceType: string): void => {
    const same = resonance?.temperament === temperament && resonance.resonanceType === resonanceType;
    apply({ op: "personalResonance", color: seat.color, temperament, resonanceType });
    if (!same && temperament === "acutely") {
      setDyscrasiaTitle("");
      setDyscrasiaDescription("");
      setDyscrasia(true);
    } else {
      setDyscrasia(false);
    }
  };

  const addCard = (): void => {
    apply({
      op: "personalCardAdd",
      color: seat.color,
      condition: condition === "" ? undefined : condition,
      displayOnSheet: onSheet,
      displayType,
      textColor,
      kind: trigger.kind,
      session: trigger.session,
      year: trigger.year,
      month: trigger.month,
      day: trigger.day,
      title,
      subtitle,
      description,
      duration: trigger.duration
    });
  };

  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = panelRef.current;
    if (node) placeConditionPanel(node);
  }, [pane]);

  return (
        <div ref={panelRef} className="pc-cond-panel" role="dialog" aria-label={pane === "resonance" ? "Resonance" : "Condition"}>
          {pane === "resonance" ? (
            <>
              <div className="pc-cond-grid">
                {TEMPERAMENTS.map((temperament) => (
                  <div key={temperament} className="pc-cond-grid-row">
                    <span>{temperamentLabel(temperament)}</span>
                    {RESONANCE_TYPES.map((resonanceType) => {
                      const selected = resonance?.temperament === temperament && resonance.resonanceType === resonanceType;
                      return (
                        <button
                          key={resonanceType}
                          type="button"
                          className={`lab-btn${selected ? " on" : ""}`}
                          aria-pressed={selected}
                          onClick={() => pickResonance(temperament, resonanceType)}
                        >
                          {resonanceType}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {dyscrasia && (
                <form className="pc-cond-form" onSubmit={(event) => {
                  event.preventDefault();
                  apply({ op: "personalDyscrasia", color: seat.color, title: dyscrasiaTitle, description: dyscrasiaDescription });
                  setDyscrasia(false);
                }}>
                  <p className="pc-cond-note">The resonance is on the sheet. Add a dyscrasia, or cancel and leave that panel off.</p>
                  <label className="pc-cond-field">Title<input value={dyscrasiaTitle} onChange={(event) => setDyscrasiaTitle(event.target.value)} /></label>
                  <label className="pc-cond-field">Description<textarea value={dyscrasiaDescription} onChange={(event) => setDyscrasiaDescription(event.target.value)} /></label>
                  <div className="pc-cond-choices">
                    <button type="submit" className="lab-btn">Save dyscrasia</button>
                    <button type="button" className="lab-btn" onClick={() => setDyscrasia(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <form className="pc-cond-form" onSubmit={(event) => {
              event.preventDefault();
              if (!sheetFull && !bloodBlocked) addCard();
            }}>
              <label className="pc-cond-field">
                Mechanic
                <select value={condition} onChange={(event) => setCondition(event.target.value)}>
                  <option value="">None</option>
                  {manualConditions.map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
                </select>
              </label>
              <label className="pc-cond-field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label className="pc-cond-field">Subtitle<input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} /></label>
              <label className="pc-cond-field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
              <label className="pc-cond-field">
                Look
                <select value={displayType} onChange={(event) => setDisplayType(event.target.value as typeof displayType)}>
                  {SHEET_TYPES.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
                </select>
              </label>
              <label className="pc-cond-field">
                Text color
                <select value={textColor} onChange={(event) => setTextColor(event.target.value as typeof textColor)}>
                  {TEXT_COLORS.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
                </select>
              </label>
              <label className="pc-cond-check">
                <input type="checkbox" checked={onSheet} onChange={(event) => setOnSheet(event.target.checked)} />
                Show on the sheet
              </label>
              <TriggerFields
                sessionNum={sessionNum}
                hunger={seat.hunger}
                kind={trigger.kind}
                session={trigger.session}
                year={trigger.year}
                month={trigger.month}
                day={trigger.day}
                duration={trigger.duration}
                onKind={trigger.setKind}
                onSession={trigger.setSession}
                onYear={trigger.setYear}
                onMonth={trigger.setMonth}
                onDay={trigger.setDay}
                onDuration={trigger.setDuration}
              />
              {sheetFull && <p className="pc-cond-note">The sheet already has eight conditions. Remove one, or leave this one off the sheet.</p>}
              <button type="submit" className="lab-btn" disabled={sheetFull || bloodBlocked}>Add condition</button>
              <ul className="pc-cond-list">
                {cards.map((card) => (
                  <li key={card.id}>
                    <span>{card.title || "Untitled"} — {card.triggerLabel}</span>
                    <button type="button" className="lab-btn" onClick={() => apply({ op: "personalCardRemove", color: seat.color, id: card.id })}>Remove</button>
                  </li>
                ))}
              </ul>
            </form>
          )}
        </div>
  );
};

const DueEdit = ({ row, sessionNum, apply }: {
  row: PersonalDue;
  sessionNum: number;
  apply: (command: ApplyCommand) => void;
}): ReactElement => {
  const trigger = useTrigger(sessionNum);
  const color = isSeatColor(row.color) ? row.color : null;
  return (
    <form className="pc-cond-form" onSubmit={(event) => {
      event.preventDefault();
      if (color === null || (trigger.kind === "ChangeOfBlood" && (row.hunger ?? 0) >= 5)) return;
      apply({
        op: "personalDueEdit",
        color,
        id: row.id,
        kind: trigger.kind,
        session: trigger.session,
        year: trigger.year,
        month: trigger.month,
        day: trigger.day,
        duration: trigger.duration
      });
    }}>
      <TriggerFields
        sessionNum={sessionNum}
        hunger={row.hunger ?? 0}
        kind={trigger.kind}
        session={trigger.session}
        year={trigger.year}
        month={trigger.month}
        day={trigger.day}
        duration={trigger.duration}
        onKind={trigger.setKind}
        onSession={trigger.setSession}
        onYear={trigger.setYear}
        onMonth={trigger.setMonth}
        onDay={trigger.setDay}
        onDuration={trigger.setDuration}
      />
      <button type="submit" className="lab-btn" disabled={color === null}>Save ending</button>
    </form>
  );
};

/** One list of every seat's conditions that are ready to come off. */
export const PersonalDueList = ({ rows, sessionNum, apply }: {
  rows: readonly PersonalDue[];
  sessionNum: number;
  apply: (command: ApplyCommand) => void;
}): ReactElement | null => {
  const [editing, setEditing] = useState<string | null>(null);
  if (rows.length === 0) return null;
  return (
    <div className="pc-cond-due" role="region" aria-label="Conditions ready to remove">
      {rows.map((row) => {
        const color = isSeatColor(row.color) ? row.color : null;
        const key = `${row.color}:${row.id}`;
        return (
          <div key={key} className="pc-cond-due-row">
            <p>{row.name}: {row.title} can come off. {row.trigger}.</p>
            <div className="pc-cond-choices">
              <button type="button" className="lab-btn" disabled={color === null} onClick={() => color && apply({ op: "personalDueConfirm", color, id: row.id })}>Remove it</button>
              {row.fixedEnding !== true && (
                <button type="button" className="lab-btn" onClick={() => setEditing(editing === key ? null : key)}>Change the ending</button>
              )}
              <button type="button" className="lab-btn" disabled={color === null} onClick={() => color && apply({ op: "personalDueSkip", color, id: row.id })}>Not yet</button>
            </div>
            {editing === key && <DueEdit row={row} sessionNum={sessionNum} apply={apply} />}
          </div>
        );
      })}
    </div>
  );
};
