import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { LabPins } from "./LabPins";
import { SCENES_ROUND_1 } from "./scenesRound1";
import type { SketchState } from "../scenesPanel/sketch";

/**
 * Dev-only Lab: throwaway design sketches at the real 1920×1080 fullscreen size, with click-to-comment pins.
 * `?lab=<sketch id>` opens a sketch directly. Controls live in the app tab bar so they never cover a sketch.
 */

const SKETCHES = SCENES_ROUND_1;
const STATE_KEY = "tr-lab-state";

const STATE_LABELS: readonly { key: keyof SketchState; label: string }[] = [
  { key: "previewOpen", label: "Preview" },
  { key: "clockDiffers", label: "Flashback" },
  { key: "weatherOverride", label: "Weather override" },
  { key: "heatWave", label: "Heat wave" },
  { key: "coldSnap", label: "Cold snap" },
  { key: "popoverOpen", label: "Pop-up" },
  { key: "ttsDisconnected", label: "TTS offline" }
];

const DEFAULT_STATE: SketchState = {
  previewOpen: false,
  clockDiffers: false,
  weatherOverride: false,
  heatWave: false,
  coldSnap: false,
  popoverOpen: false,
  ttsDisconnected: false
};

/** Heat wave and cold snap are opposite extremes, so turning one on turns the other off. */
const toggled = (state: SketchState, key: keyof SketchState): SketchState => {
  const next = { ...state, [key]: !state[key] };
  if (key === "heatWave" && next.heatWave) {
    next.coldSnap = false;
  }
  if (key === "coldSnap" && next.coldSnap) {
    next.heatWave = false;
  }
  return next;
};

const initialSketchId = (): string => {
  const requested = new URLSearchParams(window.location.search).get("lab");
  return SKETCHES.some((sketch) => sketch.id === requested) ? requested ?? "" : SKETCHES[0]?.id ?? "";
};

const initialState = (): SketchState => {
  const stored = window.localStorage.getItem(STATE_KEY);
  return stored ? { ...DEFAULT_STATE, ...(JSON.parse(stored) as Partial<SketchState>) } : DEFAULT_STATE;
};

export const LabTab = ({ active }: { active: boolean }): ReactElement => {
  const [sketchId, setSketchId] = useState(initialSketchId);
  const [state, setState] = useState(initialState);
  const [pinsVisible, setPinsVisible] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [controlsTarget, setControlsTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setControlsTarget(document.getElementById("lab-controls"));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("lab", sketchId);
    window.history.replaceState(null, "", url);
  }, [active, sketchId]);

  const sketch = SKETCHES.find((entry) => entry.id === sketchId) ?? SKETCHES[0];
  if (!sketch) {
    return <p>No Lab sketches registered.</p>;
  }

  const controls = (
    <div className="lab-controls">
      {SKETCHES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={entry.id === sketch.id ? "lock active" : undefined}
          title={entry.summary}
          onClick={() => setSketchId(entry.id)}
        >
          {entry.label}
        </button>
      ))}
      <span className="lab-controls-sep" />
      {STATE_LABELS.map(({ key, label }) => (
        <label key={key} className="lab-controls-toggle">
          <input type="checkbox" checked={state[key]} onChange={() => setState(toggled(state, key))} />
          {label}
        </label>
      ))}
      <span className="lab-controls-sep" />
      <button type="button" className={addMode ? "lock active" : undefined} onClick={() => setAddMode(!addMode)}>
        {addMode ? "Adding notes: click the sketch" : "Add note"}
      </button>
      <label className="lab-controls-toggle">
        <input type="checkbox" checked={pinsVisible} onChange={() => setPinsVisible(!pinsVisible)} />
        Show notes
      </label>
    </div>
  );

  return (
    <>
      {active && controlsTarget && createPortal(controls, controlsTarget)}
      <div className="lab-canvas" aria-label={sketch.summary}>
        {active && sketch.render(state)}
        {active && <LabPins sketch={sketch.id} addMode={addMode} visible={pinsVisible} />}
      </div>
    </>
  );
};
