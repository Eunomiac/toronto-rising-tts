import { useState, type ReactElement } from "react";
import type { MemoriamPayload } from "./commands";
import {
  MEMORIAM_PCS,
  TIMELINE_UNITS,
  memoriamDate,
  memoriamPayload,
  memoriamTimeline,
  nearestYearIn,
  periodsFor,
  timelinePeriodAt,
  timelinePosition,
  timelineYearAt,
  type MemoriamChoice,
  type TimelineSegment
} from "./memoriam";
import { useSceneCatalogs } from "./roster";
import { Overlay } from "./sketch";

const PANEL_KEYS = ["panelA", "panelB", "panelC", "panelD"] as const;

const segmentClass = (segment: TimelineSegment, current: boolean): string =>
  !segment.period ? "gap" : current ? "highlighted" : `${segment.overlay ? "overlay" : "base"}-${segment.stripe}`;

/**
 * Memoriam set-up in the TTS modal's layout: pick the subject, slide back through their life (earliest on the
 * left, present day on the right), pick a period's scene panel or Just Smoke, and mark who else is present.
 * Periods come from the Memoriam catalog (`SkyboxesCatalog.MemoriamSkyboxes`). The bar above the slider gives each
 * run of years a width in proportion to how many years it covers, as in TTS. A year in a gap between periods
 * selects Just Smoke.
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
  const timeline = memoriamTimeline(periods, presentYear);
  const atYear = timelinePeriodAt(timeline, year);
  const choice: MemoriamChoice | null = picked ?? (subject && !atYear ? "smoke" : null);
  const chosenPeriod = choice && choice !== "smoke" ? periods.find((period) => period.key === choice.periodKey) ?? null : null;
  const seed = MEMORIAM_PCS.findIndex((pc) => pc.key === subject);
  /** Sliding out of the chosen panel's period drops the choice; a Just Smoke the Storyteller clicked stays. */
  const moveTo = (next: number): void => {
    setYear(next);
    if (picked !== null && picked !== "smoke" && timelinePeriodAt(timeline, next) !== chosenPeriod) {
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
          {timeline.map((segment) => (
            <span
              key={segment.start}
              className={segmentClass(segment, segment.period !== null && segment.period === atYear)}
              style={{ flexGrow: segment.width }}
              title={`${segment.start}–${segment.end - 1}${segment.period ? ` · ${segment.period.location}` : " · Just Smoke"}`}
            />
          ))}
        </div>
        <input
          type="range"
          className="lab-memoriam-slider"
          min={0}
          max={TIMELINE_UNITS}
          value={timeline.length > 0 ? timelinePosition(timeline, year) : TIMELINE_UNITS}
          disabled={timeline.length === 0}
          onChange={(event) => moveTo(timelineYearAt(timeline, Number(event.target.value)))}
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
                const ownYear = nearestYearIn(timeline, period, year);
                return (
                  <button
                    key={panelKey}
                    type="button"
                    className={`lab-memoriam-pick${selected ? " selected" : period === atYear ? " highlighted" : ""}`}
                    disabled={ownYear === null}
                    title={ownYear === null ? "Nested periods cover every year of this one" : undefined}
                    onClick={() => {
                      if (ownYear !== null) {
                        setPicked({ periodKey: period.key, panel: panelKey });
                        setYear(ownYear);
                      }
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
