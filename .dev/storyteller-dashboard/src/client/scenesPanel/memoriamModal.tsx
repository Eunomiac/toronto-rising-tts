import { useState, type ReactElement } from "react";
import type { MemoriamPayload } from "./commands";
import { MEMORIAM_PCS, memoriamDate, memoriamPayload, periodForYear, periodsFor, type MemoriamChoice } from "./memoriam";
import { useSceneCatalogs } from "./roster";
import { Overlay } from "./sketch";

const PANEL_KEYS = ["panelA", "panelB", "panelC", "panelD"] as const;
const MARKS = 30;

/**
 * Memoriam set-up in the TTS modal's layout: pick the subject, slide back through their life (earliest on the
 * left, present day on the right), pick a period's scene panel or Just Smoke, and mark who else is present.
 * Periods come from the Memoriam catalog (`SkyboxesCatalog.MemoriamSkyboxes`). A year in a gap between
 * periods selects Just Smoke, as in TTS.
 */
export const MemoriamModal = ({ presentYear, onClose, onAdvance }: {
  presentYear: number;
  onClose: () => void;
  /** Absent in the Lab, where Advance only closes. */
  onAdvance?: (payload: MemoriamPayload) => void;
}): ReactElement => {
  const { catalogs, error } = useSceneCatalogs();
  const [subject, setSubject] = useState<string | null>(null);
  const [year, setYear] = useState(presentYear);
  const [picked, setPicked] = useState<MemoriamChoice | null>(null);
  const [present, setPresent] = useState<ReadonlySet<string>>(new Set());
  const periods = subject && catalogs ? periodsFor(catalogs.memoriamPeriods, subject) : [];
  const firstYear = periods[0]?.startYear ?? presentYear - 100;
  const atYear = periodForYear(periods, year);
  const choice: MemoriamChoice | null = picked ?? (subject && !atYear ? "smoke" : null);
  const chosenPeriod = choice && choice !== "smoke" ? periods.find((period) => period.key === choice.periodKey) ?? null : null;
  const span = Math.max(1, presentYear - firstYear);
  const mark = Math.min(MARKS - 1, Math.floor(((year - firstYear) / span) * MARKS));
  const markInPeriod = (index: number): boolean => {
    const from = firstYear + (index / MARKS) * span;
    const to = firstYear + ((index + 1) / MARKS) * span;
    return periods.some((period) => period.startYear <= to && period.endYear >= from);
  };
  const seed = MEMORIAM_PCS.findIndex((pc) => pc.key === subject);
  /** Sliding out of the chosen panel's period drops the choice; a Just Smoke the Storyteller clicked stays. */
  const moveTo = (next: number): void => {
    setYear(next);
    const left = picked !== null && picked !== "smoke" && (!chosenPeriod || next < chosenPeriod.startYear || next > chosenPeriod.endYear);
    if (left) {
      setPicked(null);
    }
  };
  const advance = (): void => {
    if (subject && choice) {
      onAdvance?.(memoriamPayload(subject, year, choice, chosenPeriod, present));
    }
    onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-memoriam">
        <span className="lab-memoriam-title">Memoriam</span>
        {error && <p className="lab-note">{error}</p>}
        <div className="lab-memoriam-pcs">
          {MEMORIAM_PCS.map((pc) => (
            <button
              key={pc.key}
              type="button"
              className={`lab-memoriam-pick${subject === pc.key ? " selected" : ""}`}
              onClick={() => {
                setSubject(pc.key);
                setYear(presentYear);
                setPicked(null);
                setPresent(new Set());
              }}
            >
              {pc.name}
            </button>
          ))}
        </div>
        <span className="lab-memoriam-date">{subject ? memoriamDate(year, seed) : "Choose a character"}</span>
        <span className="lab-memoriam-place">{subject ? (chosenPeriod ?? atYear)?.location ?? "Just Smoke" : "\u00a0"}</span>
        <div className="lab-memoriam-marks">
          {Array.from({ length: MARKS }, (_, index) => (
            <span key={index} className={index === mark && subject ? "highlighted" : markInPeriod(index) ? "period" : undefined} />
          ))}
        </div>
        <input
          type="range"
          className="lab-memoriam-slider"
          min={firstYear}
          max={presentYear}
          value={year}
          disabled={!subject}
          onChange={(event) => moveTo(Number(event.target.value))}
        />
        <div className="lab-memoriam-grid">
          {periods.map((period) => (
            <div key={period.key} className={`lab-memoriam-period${period === atYear ? " current" : ""}`} title={`${period.startYear}–${period.endYear} · ${period.location}`}>
              {PANEL_KEYS.map((panelKey) => {
                const panel = period.panels.find((entry) => entry.key === panelKey);
                if (!panel) {
                  return <span key={panelKey} className="lab-memoriam-pick empty" />;
                }
                const selected = choice !== null && choice !== "smoke" && choice.periodKey === period.key && choice.panel === panelKey;
                return (
                  <button
                    key={panelKey}
                    type="button"
                    className={`lab-memoriam-pick${selected ? " selected" : period === atYear ? " highlighted" : ""}`}
                    onClick={() => {
                      setPicked({ periodKey: period.key, panel: panelKey });
                      setYear(Math.min(Math.max(year, period.startYear), period.endYear));
                    }}
                  >
                    {panel.display}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`lab-memoriam-pick smoke${choice === "smoke" ? " selected" : " highlighted"}`}
          disabled={!subject}
          onClick={() => setPicked("smoke")}
        >
          Just Smoke
        </button>
        <div className="lab-memoriam-cast">
          {MEMORIAM_PCS.map((pc) => {
            const isSubject = pc.key === subject;
            const here = isSubject || present.has(pc.key);
            return (
              <div key={pc.key} className="lab-memoriam-cast-row">
                <button
                  type="button"
                  className={`lab-memoriam-presence${here ? " selected" : ""}`}
                  title={isSubject ? "The subject is always present" : "Present in this memoriam"}
                  disabled={!subject || isSubject}
                  onClick={() => {
                    const next = new Set(present);
                    if (next.has(pc.key)) {
                      next.delete(pc.key);
                    } else {
                      next.add(pc.key);
                    }
                    setPresent(next);
                  }}
                />
                <span className={`lab-memoriam-pc${isSubject ? " subject" : ""}`}>{pc.name}</span>
              </div>
            );
          })}
        </div>
        <div className="lab-row lab-memoriam-actions">
          <button type="button" className="lab-btn primary" disabled={!subject || !choice} onClick={advance}>Advance</button>
          <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
};
