import { useCallback, useEffect, useMemo, useState } from 'react';
import { DistrictPanel } from './DistrictPanel';
import { MapView } from './MapView';
import { loadPublicMapData, selectedDistrictFromUrl, updateDistrictInUrl } from './data';
import type { PublicMapData } from './types';

export function App() {
  const [data, setData] = useState<PublicMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => selectedDistrictFromUrl(window.location.search));

  useEffect(() => {
    let active = true;
    loadPublicMapData()
      .then((value) => { if (active) setData(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, []);

  const validSelectedKey = useMemo(() => {
    if (!data || !selectedKey) return null;
    return data.districts.features.some((feature) => feature.properties.key === selectedKey) ? selectedKey : null;
  }, [data, selectedKey]);

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
      <header className="app-header">
        <div>
          <p>Vampire: The Masquerade</p>
          <h1>Toronto Rising</h1>
        </div>
        <span className="app-header__phase">Map prototype</span>
      </header>
      <MapView districts={data.districts} selectedKey={validSelectedKey} onSelect={selectDistrict} />
      <DistrictPanel
        districts={data.districts.features}
        selectedKey={validSelectedKey}
        onSelect={selectDistrict}
        onClear={clearDistrict}
      />
      <div
        className="calibration-badge"
        title={`${data.manifest.calibration.controlPointCount} controls; ${data.manifest.calibration.validationRootMeanSquareErrorMetres ?? 'no'} m validation error`}
      >
        <span aria-hidden="true" /> Calibrated vector map
      </div>
    </main>
  );
}
