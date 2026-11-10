import { useState } from 'react';
import {
  DEFAULT_VISUAL_CALIBRATION,
  serializeVisualCalibration,
  type VisualCalibration,
} from './calibration';

interface CalibrationPanelProps {
  value: VisualCalibration;
  publishedHorizontalScale: number;
  onChange: (value: VisualCalibration) => void;
}

interface NumericControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function NumericControl({ label, value, min, max, step, onChange }: NumericControlProps) {
  const update = (rawValue: string) => {
    const next = Number(rawValue);
    if (Number.isFinite(next)) onChange(next);
  };

  return (
    <label className="calibration-control">
      <span>{label}</span>
      <div>
        <input
          type="range"
          aria-label={`${label} slider`}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => update(event.target.value)}
        />
        <input
          type="number"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => update(event.target.value)}
        />
      </div>
    </label>
  );
}
export function CalibrationPanel({ value, publishedHorizontalScale, onChange }: CalibrationPanelProps) {
  const [copyStatus, setCopyStatus] = useState('');
  const set = <Key extends keyof VisualCalibration>(key: Key, next: VisualCalibration[Key]) => {
    setCopyStatus('');
    onChange({ ...value, [key]: next });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(serializeVisualCalibration(value));
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy failed — select the values below');
    }
  };

  return (
    <aside className="calibration-panel" aria-label="Map calibration controls">
      <div className="calibration-panel__heading">
        <div>
          <p>Author tool</p>
          <h2>Visual calibration</h2>
        </div>
        <a href="/" aria-label="Close calibration controls">×</a>
      </div>
      <p className="calibration-panel__instructions">
        Adjust the red district geometry against the street map. Changes are saved only in this browser until you copy the result.
      </p>

      <NumericControl
        label="Horizontal scale"
        value={value.horizontalScale}
        min={0.99}
        max={1.01}
        step={0.0001}
        onChange={(next) => set('horizontalScale', next)}
      />
      <label className="calibration-anchor">
        <span>Horizontal anchor</span>
        <select
          value={value.horizontalAnchor}
          onChange={(event) => set('horizontalAnchor', event.target.value as VisualCalibration['horizontalAnchor'])}
        >
          <option value="west">West edge</option>
          <option value="centre">Centre</option>
          <option value="east">East edge</option>
        </select>
      </label>
      <NumericControl
        label="Vertical scale"
        value={value.verticalScale}
        min={0.99}
        max={1.01}
        step={0.0001}
        onChange={(next) => set('verticalScale', next)}
      />
      <label className="calibration-anchor">
        <span>Vertical anchor</span>
        <select
          value={value.verticalAnchor}
          onChange={(event) => set('verticalAnchor', event.target.value as VisualCalibration['verticalAnchor'])}
        >
          <option value="north">North edge</option>
          <option value="centre">Centre</option>
          <option value="south">South edge</option>
        </select>
      </label>
      <NumericControl
        label="East / west shift (m)"
        value={value.offsetEastMetres}
        min={-250}
        max={250}
        step={1}
        onChange={(next) => set('offsetEastMetres', next)}
      />
      <NumericControl
        label="North / south shift (m)"
        value={value.offsetNorthMetres}
        min={-250}
        max={250}
        step={1}
        onChange={(next) => set('offsetNorthMetres', next)}
      />

      <div className="calibration-panel__actions">
        <button type="button" onClick={() => { setCopyStatus(''); onChange(DEFAULT_VISUAL_CALIBRATION); }}>Reset</button>
        <button type="button" className="calibration-panel__copy" onClick={copy}>Copy settings</button>
      </div>
      <p className="calibration-panel__status" role="status">{copyStatus}</p>
      <details>
        <summary>Exact result</summary>
        <p>Published horizontal scale: <strong>{publishedHorizontalScale}</strong>. Values below are additional live adjustments.</p>
        <pre data-testid="calibration-result">{serializeVisualCalibration(value)}</pre>
      </details>
    </aside>
  );
}
