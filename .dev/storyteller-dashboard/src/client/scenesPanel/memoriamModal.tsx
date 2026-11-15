import { useMemo, useState, type ReactElement } from "react";
import type { MemoriamPayload } from "./commands";
import {
  MEMORIAM_PCS,
  TIMELINE_UNITS,
  formatMemoriamCalendarDate,
  memoriamDate,
  memoriamPayload,
  memoriamTimeline,
  nearestYearIn,
  parseMemoriamDisplayDate,
  periodsFor,
  timelinePeriodAt,
  timelinePosition,
  timelineYearAt,
  type MemoriamChoice,
  type MemoriamLocationPick,
  type TimelineSegment
} from "./memoriam";
import { useChronicleLocations, type SheetSite } from "./chronicleSheets";
import { useSceneCatalogs } from "./roster";
import { Overlay } from "./sketch";

const PANEL_KEYS = ["panelA", "panelB", "panelC", "panelD"] as const;

const segmentClass = (segment: TimelineSegment, current: boolean): string =>
  !segment.period ? "gap" : current ? "highlighted" : `${segment.overlay ? "overlay" : "base"}-${segment.stripe}`;

const toDateInputValue = (year: number, month: number, day: number): string => {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

/**
 * Memoriam set-up in the TTS modal's layout: pick the subject, slide back through their life (earliest on the
 * left, present day on the right), pick a period's scene panel or Just Smoke, and mark who else is present.
 * A calendar icon sets an exact day; an optional Toronto District/Site presents skybox and overlay as a normal scene.
 */
export const MemoriamModal = ({ presentYear, onClose, onAdvance }: {
  presentYear: number;
  onClose: () => void;
  onAdvance: (payload: MemoriamPayload) => void;
}): ReactElement => {
  const { catalogs, error } = useSceneCatalogs();
  const { data: locations } = useChronicleLocations();
  const [subject, setSubject] = useState<string | null>(null);
  const [year, setYear] = useState(presentYear);
  const [picked, setPicked] = useState<MemoriamChoice | null>(null);
  const [present, setPresent] = useState<ReadonlySet<string>>(new Set());
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [toronto, setToronto] = useState<MemoriamLocationPick | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickDistrictKey, setPickDistrictKey] = useState<string | null>(null);
  const periods = subject && catalogs ? periodsFor(catalogs.memoriamPeriods, subject) : [];
  const timeline = memoriamTimeline(periods, presentYear);
  const atYear = timelinePeriodAt(timeline, year);
  const choice: MemoriamChoice | null = picked ?? (subject && !atYear ? "smoke" : null);
  const chosenPeriod = choice && choice !== "smoke" ? periods.find((period) => period.key === choice.periodKey) ?? null : null;
  const seed = MEMORIAM_PCS.findIndex((pc) => pc.key === subject);
  const displayDate = calendarDate ?? (subject ? memoriamDate(year, seed) : "Choose a character");
  const torontoLabel = useMemo(() => {
    if (!toronto || !locations) {
      return null;
    }
    const district = locations.districts.find((entry) => entry.key === toronto.districtKey);
    const site = locations.sites.find((entry) => entry.key === toronto.siteKey);
    if (!district || !site) {
      return `${toronto.districtKey} · ${toronto.siteKey}`;
    }
    const siteName = site.subtitle ? `${site.title}: ${site.subtitle}` : site.title;
    return `${district.name} · ${siteName}`;
  }, [toronto, locations]);
  /** Sliding out of the chosen panel's period drops the choice; a Just Smoke the Storyteller clicked stays. */
  const moveTo = (next: number): void => {
    setYear(next);
    setCalendarDate(null);
    if (picked !== null && picked !== "smoke" && timelinePeriodAt(timeline, next) !== chosenPeriod) {
      setPicked(null);
    }
  };
  const onCalendarChange = (value: string): void => {
    if (!value) {
      setCalendarDate(null);
      return;
    }
    const [yText, mText, dText] = value.split("-");
    const nextYear = Number(yText);
    const month = Number(mText);
    const day = Number(dText);
    if (!Number.isFinite(nextYear) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return;
    }
    const clampedYear = Math.min(presentYear, Math.max(1, nextYear));
    setYear(clampedYear);
    setCalendarDate(formatMemoriamCalendarDate(clampedYear, month, day));
  };
  const calendarValue = (() => {
    const parsed = parseMemoriamDisplayDate(typeof displayDate === "string" ? displayDate : "");
    if (!parsed) {
      return "";
    }
    return toDateInputValue(parsed.year, parsed.month, parsed.day);
  })();
  const advance = (): void => {
    if (subject && choice) {
      onAdvance(memoriamPayload(subject, year, choice, chosenPeriod, present, {
        ...(calendarDate ? { date: calendarDate } : {}),
        toronto
      }));
    }
    onClose();
  };
  if (pickingLocation && locations) {
    const homeOf = new Map((catalogs?.sites ?? []).map((site) => [site.key, site.districtKey]));
    const siteLabel = (site: SheetSite): string => (site.subtitle ? `${site.title}: ${site.subtitle}` : site.title);
    if (pickDistrictKey === null) {
      return (
        <Overlay onClose={() => setPickingLocation(false)}>
          <div className="lab-modal lab-memoriam-location">
            <span className="lab-modal-title">Toronto District for this Memoriam</span>
            <p className="lab-note">Optional. When set, skybox and location overlay present as a normal scene.</p>
            <div className="lab-memoriam-location-list">
              {locations.districts.map((district) => (
                <button key={district.key} type="button" className="lab-btn" onClick={() => setPickDistrictKey(district.key)}>
                  {district.name}
                </button>
              ))}
            </div>
            <button type="button" className="lab-btn" onClick={() => setPickingLocation(false)}>Cancel</button>
          </div>
        </Overlay>
      );
    }
    const district = locations.districts.find((entry) => entry.key === pickDistrictKey);
    const unique = locations.sites.filter((site) => site.unique && homeOf.get(site.key) === pickDistrictKey);
    const generic = locations.sites.filter((site) => !site.unique);
    const pickSite = (siteKey: string): void => {
      setToronto({ districtKey: pickDistrictKey, siteKey });
      setPickDistrictKey(null);
      setPickingLocation(false);
    };
    return (
      <Overlay onClose={() => { setPickDistrictKey(null); setPickingLocation(false); }}>
        <div className="lab-modal lab-memoriam-location">
          <div className="lab-row">
            <button type="button" className="lab-btn" onClick={() => setPickDistrictKey(null)}>◂ Districts</button>
            <span className="lab-modal-title">{district?.name ?? pickDistrictKey} — choose a Site</span>
          </div>
          {unique.length > 0 && (
            <>
              <span className="lab-note">Unique to {district?.name ?? pickDistrictKey}</span>
              <div className="lab-memoriam-location-list">
                {unique.map((site) => (
                  <button key={site.key} type="button" className="lab-btn" onClick={() => pickSite(site.key)}>{siteLabel(site)}</button>
                ))}
              </div>
            </>
          )}
          <span className="lab-note">Generic sites</span>
          <div className="lab-memoriam-location-list">
            {generic.map((site) => (
              <button key={site.key} type="button" className="lab-btn" onClick={() => pickSite(site.key)}>{siteLabel(site)}</button>
            ))}
          </div>
          <button type="button" className="lab-btn" onClick={() => { setPickDistrictKey(null); setPickingLocation(false); }}>Cancel</button>
        </div>
      </Overlay>
    );
  }
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
                setCalendarDate(null);
                setToronto(null);
              }}
            >
              {pc.name}
            </button>
          ))}
        </div>
        <div className="lab-memoriam-date-row">
          <span className="lab-memoriam-date">{displayDate}</span>
          {subject && (
            <label className="lab-memoriam-calendar" title="Pick an exact day, month, and year">
              <span aria-hidden="true">Cal</span>
              <input
                type="date"
                max={toDateInputValue(presentYear, 12, 31)}
                value={calendarValue}
                onChange={(event) => onCalendarChange(event.target.value)}
              />
            </label>
          )}
        </div>
        <span className="lab-memoriam-place">
          {subject
            ? (torontoLabel ?? (chosenPeriod ?? atYear)?.location ?? "Just Smoke")
            : "\u00a0"}
        </span>
        <div className="lab-memoriam-location-row">
          <button
            type="button"
            className="lab-btn"
            disabled={!subject || !locations}
            title={!locations ? "Loading chronicle locations…" : "Present skybox and location overlay as a normal Toronto scene"}
            onClick={() => {
              setPickDistrictKey(null);
              setPickingLocation(true);
            }}
          >
            {toronto ? "Change Toronto location…" : "Toronto location…"}
          </button>
          {toronto && (
            <button type="button" className="lab-btn" onClick={() => setToronto(null)}>
              Clear location
            </button>
          )}
        </div>
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
                        setCalendarDate(null);
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
