import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map } from 'maplibre-gl';
import { DebugNotesSlot } from '#debug-notes';
import { CalibrationPanel } from './CalibrationPanel';
import {
  applyVisualCalibration,
  applyVisualCalibrationToLabels,
  DEFAULT_VISUAL_CALIBRATION,
  type VisualCalibration,
} from './calibration';
import { DistrictPanel } from './DistrictPanel';
import { LayerControls } from './LayerControls';
import { MapView } from './MapView';
import {
  layerVisibilityFromUrl,
  loadPublicMapData,
  selectedDistrictFromUrl,
  updateDistrictInUrl,
  updateLayersInUrl,
} from './data';
import type { MapLayerId, PublicMapData } from './types';

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
  const [layerVisibility, setLayerVisibility] = useState(() => layerVisibilityFromUrl(window.location.search));
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
    if (!selectedKey) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedKey(null);
      window.history.replaceState(null, '', updateDistrictInUrl(null));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedKey]);

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
    return data.districts.features.some((feature) => feature.properties.key === selectedKey) || data.pathDistrict.key === selectedKey
      ? selectedKey
      : null;
  }, [data, selectedKey]);

  const calibratedDistricts = useMemo(() => {
    if (!data) return null;
    return calibrationMode
      ? applyVisualCalibration(data.districts, data.manifest.bounds, visualCalibration)
      : data.districts;
  }, [calibrationMode, data, visualCalibration]);
  const calibratedLabels = useMemo(() => {
    if (!data) return null;
    return calibrationMode
      ? applyVisualCalibrationToLabels(data.labels, data.manifest.bounds, visualCalibration)
      : data.labels;
  }, [calibrationMode, data, visualCalibration]);

  const selectDistrict = useCallback((key: string) => {
    const nextKey = selectedKey === key ? null : key;
    setSelectedKey(nextKey);
    window.history.replaceState(null, '', updateDistrictInUrl(nextKey));
  }, [selectedKey]);
  const clearDistrict = useCallback(() => {
    setSelectedKey(null);
    window.history.replaceState(null, '', updateDistrictInUrl(null));
  }, []);
  const setLayerVisible = useCallback((layer: MapLayerId, visible: boolean) => {
    setLayerVisibility((current) => {
      const next = { ...current, [layer]: visible };
      window.history.replaceState(null, '', updateLayersInUrl(next));
      return next;
    });
  }, []);

  if (error) {
    return <main className="app app--error" role="alert"><h1>Toronto Rising</h1><p>Map data could not be loaded.</p><pre>{error}</pre></main>;
  }
  if (!data) {
    return <main className="app app--loading" aria-busy="true" aria-live="polite"><div className="loading-mark" aria-hidden="true">TR</div><p>Opening the city…</p></main>;
  }
  if (data.districts.features.length === 0) {
    return <main className="app app--empty"><h1>Toronto Rising</h1><p>No districts are available in this map release.</p></main>;
  }

  return (
    <main className="app">
      <MapView
        districts={calibratedDistricts ?? data.districts}
        regions={data.regions}
        sites={data.sites}
        labels={calibratedLabels ?? data.labels}
        pathRoutes={data.pathRoutes}
        pathEntrances={data.pathEntrances}
        pathInteraction={data.pathInteraction}
        pathLabel={data.pathLabel}
        cityMarkers={data.cityMarkers}
        basemapMasks={data.basemapMasks}
        basemapMaskLabels={data.basemapMaskLabels}
        pathBounds={data.manifest.pathNetwork.bounds}
        chronicleBounds={data.manifest.bounds}
        layerVisibility={layerVisibility}
        selectedKey={validSelectedKey}
        onSelect={selectDistrict}
        onMapReady={setMap}
      />
      {!calibrationMode ? (
        <LayerControls
          visibility={layerVisibility}
          siteCount={data.sites.features.length}
          onChange={setLayerVisible}
        />
      ) : null}
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
        <DistrictPanel
          districts={data.districts.features}
          pathDistrict={data.pathDistrict}
          selectedKey={validSelectedKey}
          onSelect={selectDistrict}
          onClear={clearDistrict}
        />
      )}
      <DebugNotesSlot map={map} selectedDistrict={validSelectedKey} />
    </main>
  );
}
