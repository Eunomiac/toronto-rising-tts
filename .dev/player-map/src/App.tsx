import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map } from 'maplibre-gl';
import { DebugNotesSlot } from '#debug-notes';
import { CalibrationPanel } from './CalibrationPanel';
import {
  applyVisualCalibration,
  DEFAULT_VISUAL_CALIBRATION,
  type VisualCalibration,
} from './calibration';
import { DistrictPanel } from './DistrictPanel';
import { MapView } from './MapView';
import { loadPublicMapData, selectedDistrictFromUrl, updateDistrictInUrl } from './data';
import type { PublicMapData } from './types';

const CALIBRATION_STORAGE_PREFIX = 'toronto-rising-map-visual-calibration';

function loadVisualCalibration(revision: number): VisualCalibration {
  try {
    const stored = window.localStorage.getItem(`${CALIBRATION_STORAGE_PREFIX}-${revision}`);
    if (!stored) return DEFAULT_VISUAL_CALIBRATION;
    return { ...DEFAULT_VISUAL_CALIBRATION, ...JSON.parse(stored) } as VisualCalibration;
  } catch {
    return DEFAULT_VISUAL_CALIBRATION;
  }
}

export function App() {
  const [data, setData] = useState<PublicMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => selectedDistrictFromUrl(window.location.search));
  const [visualCalibration, setVisualCalibration] = useState(DEFAULT_VISUAL_CALIBRATION);
  const [calibrationStorageRevision, setCalibrationStorageRevision] = useState<number | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const calibrationMode = new URLSearchParams(window.location.search).get('calibrate') === '1';

  useEffect(() => {
    let active = true;
    loadPublicMapData()
      .then((value) => { if (active) setData(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const revision = data?.manifest.calibration.revision;
    if (!calibrationMode || revision === undefined || calibrationStorageRevision === revision) return;
    window.localStorage.removeItem(CALIBRATION_STORAGE_PREFIX);
    setVisualCalibration(loadVisualCalibration(revision));
    setCalibrationStorageRevision(revision);
  }, [calibrationMode, calibrationStorageRevision, data]);

  useEffect(() => {
    const revision = data?.manifest.calibration.revision;
    if (!calibrationMode || revision === undefined || calibrationStorageRevision !== revision) return;
    window.localStorage.setItem(`${CALIBRATION_STORAGE_PREFIX}-${revision}`, JSON.stringify(visualCalibration));
  }, [calibrationMode, calibrationStorageRevision, data, visualCalibration]);

  const validSelectedKey = useMemo(() => {
    if (!data || !selectedKey) return null;
    return data.districts.features.some((feature) => feature.properties.key === selectedKey) ? selectedKey : null;
  }, [data, selectedKey]);

  const calibratedDistricts = useMemo(() => {
    if (!data) return null;
    return calibrationMode
      ? applyVisualCalibration(data.districts, data.manifest.bounds, visualCalibration)
      : data.districts;
  }, [calibrationMode, data, visualCalibration]);

  const selectDistrict = useCallback((key: string) => {
    setSelectedKey(key);
    window.history.replaceState(null, '', updateDistrictInUrl(key));
  }, []);
  const clearDistrict = useCallback(() => {
    setSelectedKey(null);
    window.history.replaceState(null, '', updateDistrictInUrl(null));
  }, []);

  if (error) {
    return <main className="app app--error"><h1>Toronto Rising</h1><p>Map data could not be loaded.</p><pre>{error}</pre></main>;
  }
  if (!data) {
    return <main className="app app--loading"><div className="loading-mark" aria-hidden="true">TR</div><p>Opening the city…</p></main>;
  }

  return (
    <main className="app">
      <header className="app-header" data-note-surface="app-header">
        <div>
          <p>Vampire: The Masquerade</p>
          <h1>Toronto Rising</h1>
        </div>
        <span className="app-header__phase">Map prototype</span>
      </header>
      <MapView
        districts={calibratedDistricts ?? data.districts}
        selectedKey={validSelectedKey}
        onSelect={selectDistrict}
        onMapReady={setMap}
      />
      {calibrationMode ? (
        <CalibrationPanel
          value={visualCalibration}
          publishedHorizontalScale={
            (data.manifest.calibration.adjustments?.horizontalScale ?? 1)
            * (data.manifest.calibration.visualCalibration?.horizontalScale ?? 1)
          }
          onChange={setVisualCalibration}
        />
      ) : (
        <>
          <DistrictPanel
            districts={data.districts.features}
            selectedKey={validSelectedKey}
            onSelect={selectDistrict}
            onClear={clearDistrict}
          />
          <a
            className="calibration-badge"
            data-note-surface="calibration-badge"
            href="/?calibrate=1"
            title={`${data.manifest.calibration.controlPointCount} controls; ${data.manifest.calibration.validationRootMeanSquareErrorMetres ?? 'no'} m validation error`}
          >
            <span aria-hidden="true" /> Calibrated vector map
          </a>
        </>
      )}
      <DebugNotesSlot map={map} selectedDistrict={validSelectedKey} />
    </main>
  );
}
