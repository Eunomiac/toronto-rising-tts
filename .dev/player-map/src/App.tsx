import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import { DebugNotesSlot } from '#debug-notes';
import { CalibrationPanel } from './CalibrationPanel';
import {
  applyVisualCalibration,
  applyVisualCalibrationToLabels,
  DEFAULT_VISUAL_CALIBRATION,
  type VisualCalibration,
} from './calibration';
import { DistrictChrome } from './DistrictChrome';
import { DistrictPanel } from './DistrictPanel';
import { CoterieModal } from './CoterieModal';
import { coterieByKey } from './coteries';
import { DomainOverlay } from './DomainOverlay';
import {
  DOMAIN_CATALOG,
  domainSiteKeys,
  EMPTY_DOMAIN_SELECTION,
  type DomainSelection,
} from './domains';
import { IconRail } from './IconRail';
import { MapView, type BasemapMaskImage } from './MapView';
import {
  layerVisibilityFromUrl,
  loadPublicMapData,
  selectedDistrictFromUrl,
  updateDistrictInUrl,
  updateLayersInUrl,
} from './data';
import { type MapOverlaySelection } from './mapOverlays';
import { SiteCardModal } from './SiteCardModal';
import { TorontoLocator } from './TorontoLocator';
import { PlayerPinsLayer } from './PlayerPinsLayer';
import {
  PLAYER_MAP_HOME_ZOOM,
  resolvePlayerPinHomeCenter,
  TORONTO_HOME,
  type PublicPlayerPinsSnapshot,
} from './sessionPins';
import type { PublicMapData, PublicSiteProperties, RegionVisibility } from './types';
import { useDistrictLayout } from './useDistrictLayout';

const CALIBRATION_STORAGE_PREFIX = 'toronto-rising-map-visual-calibration';
/** Districts and colored overlays turn off once the map is this far out. */
const OVERLAY_CLEAR_ZOOM = 11.5;
/** Turning an overlay on from farther out comes back to the city at this zoom. */
const OVERLAY_RETURN_ZOOM = 12;

function loadVisualCalibration(revision: number): VisualCalibration {
  try {
    const stored = window.localStorage.getItem(`${CALIBRATION_STORAGE_PREFIX}-${revision}`);
    if (!stored) return DEFAULT_VISUAL_CALIBRATION;
    return { ...DEFAULT_VISUAL_CALIBRATION, ...JSON.parse(stored) } as VisualCalibration;
  } catch {
    return DEFAULT_VISUAL_CALIBRATION;
  }
}

function defaultRegionVisibility(data: PublicMapData): RegionVisibility {
  return Object.fromEntries(data.regions.features.map((feature) => [feature.properties.key, false]));
}

export function App() {
  const [data, setData] = useState<PublicMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => selectedDistrictFromUrl(window.location.search));
  const [layerVisibility, setLayerVisibility] = useState(() => layerVisibilityFromUrl(window.location.search));
  const [regionVisibility, setRegionVisibility] = useState<RegionVisibility>({});
  const [toggledSiteKeys, setToggledSiteKeys] = useState<string[]>([]);
  const [visualCalibration, setVisualCalibration] = useState(DEFAULT_VISUAL_CALIBRATION);
  const [calibrationStorageRevision, setCalibrationStorageRevision] = useState<number | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  useEffect(() => {
    (window as Window & { __trPlayerMap?: Map | null }).__trPlayerMap = map;
    return () => {
      delete (window as Window & { __trPlayerMap?: Map | null }).__trPlayerMap;
    };
  }, [map]);
  const [activeSite, setActiveSite] = useState<PublicSiteProperties | null>(null);
  const [overlay, setOverlay] = useState<MapOverlaySelection>({ kind: 'none' });
  const [domainSelection, setDomainSelection] = useState<DomainSelection>(EMPTY_DOMAIN_SELECTION);
  const [openCoterieKey, setOpenCoterieKey] = useState<string | null>(null);
  const openCoterie = useCallback((key: string) => {
    if (coterieByKey(key)) setOpenCoterieKey(key);
  }, []);
  const [pinSnapshot, setPinSnapshot] = useState<PublicPlayerPinsSnapshot | null>(null);
  const skipNextDistrictFocusRef = useRef(false);
  /** Ignore pin-18 zoom-out clears while fitBounds/easeTo from a selection is still running. */
  const ignoreZoomClearUntilRef = useRef(0);
  const armZoomClearSuppress = () => {
    ignoreZoomClearUntilRef.current = performance.now() + 2_000;
  };
  const onPinSnapshot = useCallback((snapshot: PublicPlayerPinsSnapshot | null) => {
    setPinSnapshot(snapshot);
  }, []);
  const calibrationMode = new URLSearchParams(window.location.search).get('calibrate') === '1';
  // Author pin UI is swapped in only via the Vite #debug-notes alias during serve.
  const { mode: layoutMode, setMode: setLayoutMode, useImageChrome } = useDistrictLayout(import.meta.env.DEV);

  useEffect(() => {
    let active = true;
    loadPublicMapData()
      .then((value) => {
        if (!active) return;
        setData(value);
        setRegionVisibility(defaultRegionVisibility(value));
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, []);

  const activeDomains = useMemo(
    () => DOMAIN_CATALOG.domains.filter((domain) => domainSelection.domainKeys.includes(domain.key)),
    [domainSelection],
  );

  const pinRevealedSiteKeys = useMemo(() => {
    if (!pinSnapshot?.live) return [] as string[];
    return [...new Set(
      pinSnapshot.pins.filter((pin) => pin.visible).map((pin) => pin.siteKey),
    )];
  }, [pinSnapshot]);

  const resolveHomeCenter = useCallback((): [number, number] => {
    if (!data) return TORONTO_HOME;
    return resolvePlayerPinHomeCenter(pinSnapshot, data.sites) ?? TORONTO_HOME;
  }, [data, pinSnapshot]);

  const focusHomeIfPins = useCallback(() => {
    if (!map || !data) return;
    const center = resolvePlayerPinHomeCenter(pinSnapshot, data.sites);
    if (!center) return;
    armZoomClearSuppress();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      map.jumpTo({ center, zoom: PLAYER_MAP_HOME_ZOOM });
      return;
    }
    map.easeTo({
      center,
      zoom: PLAYER_MAP_HOME_ZOOM,
      duration: 700,
    });
  }, [data, map, pinSnapshot]);

  useEffect(() => {
    if (!selectedKey) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedKey(null);
      window.history.replaceState(null, '', updateDistrictInUrl(null));
      focusHomeIfPins();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusHomeIfPins, selectedKey]);

  // Zooming out past the district streets clears the district and every overlay.
  // Use zoomend so a dip in the middle of a focus animation does not clear; also suppress
  // briefly after a selection so PATH/district focus on narrow viewports can finish.
  useEffect(() => {
    if (!map) return undefined;
    const onZoomEnd = () => {
      if (performance.now() < ignoreZoomClearUntilRef.current) return;
      if (map.getZoom() >= OVERLAY_CLEAR_ZOOM) return;
      setOverlay((current) => (current.kind === 'none' ? current : { kind: 'none' }));
      setDomainSelection((current) => (
        current.domainKeys.length === 0 && current.affiliations.length === 0
          ? current
          : EMPTY_DOMAIN_SELECTION
      ));
      setSelectedKey((current) => {
        if (!current) return current;
        window.history.replaceState(null, '', updateDistrictInUrl(null));
        return null;
      });
    };
    map.on('zoomend', onZoomEnd);
    return () => { map.off('zoomend', onZoomEnd); };
  }, [map]);

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
    if (data.districts.features.some((feature) => feature.properties.key === selectedKey)) return selectedKey;
    if (data.pathDistrict.key === selectedKey) return selectedKey;
    if (data.sheetOnlyDistricts.some((district) => district.key === selectedKey)) return selectedKey;
    return null;
  }, [data, selectedKey]);

  const selectedDistrictName = useMemo(() => {
    if (!data || !validSelectedKey) return null;
    const surface = data.districts.features.find((feature) => feature.properties.key === validSelectedKey);
    if (surface) return surface.properties.name;
    if (data.pathDistrict.key === validSelectedKey) return data.pathDistrict.name;
    return data.sheetOnlyDistricts.find((district) => district.key === validSelectedKey)?.name ?? validSelectedKey;
  }, [data, validSelectedKey]);

  /** Map highlight only for polygon districts and PATH — not Sewers/Streets/Subway. */
  const mapSelectedKey = useMemo(() => {
    if (!data || !validSelectedKey) return null;
    if (data.sheetOnlyDistricts.some((district) => district.key === validSelectedKey)) return null;
    return validSelectedKey;
  }, [data, validSelectedKey]);

  const activeSiteDistrictName = useMemo(() => {
    if (!data || !activeSite) return '';
    const surface = data.districts.features.find((feature) => feature.properties.key === activeSite.districtKey);
    if (surface) return surface.properties.name;
    if (data.pathDistrict.key === activeSite.districtKey) return data.pathDistrict.name;
    return data.sheetOnlyDistricts.find((district) => district.key === activeSite.districtKey)?.name
      ?? activeSite.districtKey;
  }, [activeSite, data]);

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

  const basemapMaskImages = useMemo<BasemapMaskImage[]>(() => {
    const images = data?.manifest.basemapMaskImages;
    if (!images) return [];
    return images.map((image) => ({
      key: image.key,
      url: image.url,
      coordinates: image.coordinates,
    }));
  }, [data]);

  const selectDistrict = useCallback((key: string) => {
    const nextKey = selectedKey === key ? null : key;
    if (nextKey) armZoomClearSuppress();
    setSelectedKey(nextKey);
    window.history.replaceState(null, '', updateDistrictInUrl(nextKey));
    if (nextKey === null) focusHomeIfPins();
    if (nextKey === 'PATH') {
      setLayerVisibility((layers) => {
        if (layers.path) return layers;
        const updated = { ...layers, path: true };
        window.history.replaceState(null, '', updateLayersInUrl(updated));
        return updated;
      });
    }
  }, [focusHomeIfPins, selectedKey]);
  const clearDistrict = useCallback(() => {
    setSelectedKey(null);
    window.history.replaceState(null, '', updateDistrictInUrl(null));
    focusHomeIfPins();
  }, [focusHomeIfPins]);
  const toggleSite = useCallback((key: string) => {
    setToggledSiteKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }, []);
  const focusSite = useCallback((key: string) => {
    const feature = data?.sites.features.find((item) => item.properties.key === key);
    const coordinates = feature?.geometry.type === 'Point' ? feature.geometry.coordinates : null;
    const lng = coordinates?.[0];
    const lat = coordinates?.[1];
    const districtKey = feature?.properties.districtKey;
    if (districtKey) {
      // Site easeTo must win over MapView's district fitBounds (pin 19).
      skipNextDistrictFocusRef.current = true;
      armZoomClearSuppress();
      setSelectedKey(districtKey);
      window.history.replaceState(null, '', updateDistrictInUrl(districtKey));
      setLayerVisibility((layers) => {
        if (districtKey !== 'PATH' || layers.path) return layers;
        const updated = { ...layers, path: true };
        window.history.replaceState(null, '', updateLayersInUrl(updated));
        return updated;
      });
    }
    if (!map || lng === undefined || lat === undefined) return;
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 15),
      duration: 700,
    });
  }, [data, map]);
  const focusToronto = useCallback(() => {
    if (!map) return;
    armZoomClearSuppress();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      map.jumpTo({ center: TORONTO_HOME, zoom: OVERLAY_RETURN_ZOOM });
      return;
    }
    map.easeTo({ center: TORONTO_HOME, zoom: OVERLAY_RETURN_ZOOM, duration: 700 });
  }, [map]);
  const changeOverlay = useCallback((next: MapOverlaySelection) => {
    if (next.kind !== 'none' && map && map.getZoom() < OVERLAY_CLEAR_ZOOM) focusToronto();
    setOverlay(next);
  }, [focusToronto, map]);
  const changeDomains = useCallback((next: DomainSelection) => {
    const adding = next.domainKeys.some((key) => !domainSelection.domainKeys.includes(key));
    if (adding && map && map.getZoom() < OVERLAY_CLEAR_ZOOM) focusToronto();
    setDomainSelection(next);
  }, [domainSelection, focusToronto, map]);
  const toggleRegion = useCallback((key: string) => {
    setRegionVisibility((current) => {
      const next = { ...current, [key]: !current[key] };
      const anyVisible = Object.values(next).some(Boolean);
      setLayerVisibility((layers) => {
        const updated = { ...layers, regions: anyVisible, districts: layers.districts };
        window.history.replaceState(null, '', updateLayersInUrl(updated));
        return updated;
      });
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
        basemapMaskImages={basemapMaskImages}
        pathBounds={data.manifest.pathNetwork.bounds}
        chronicleBounds={data.manifest.bounds}
        layerVisibility={layerVisibility}
        regionVisibility={regionVisibility}
        selectedKey={mapSelectedKey}
        toggledSiteKeys={toggledSiteKeys}
        revealedSiteKeys={[...pinRevealedSiteKeys, ...domainSiteKeys(activeDomains)]}
        overlay={overlay}
        skipNextDistrictFocusRef={skipNextDistrictFocusRef}
        onSelect={selectDistrict}
        onSiteSelect={(key) => {
          const site = data.sites.features.find((feature) => feature.properties.key === key);
          if (site) setActiveSite(site.properties);
        }}
        onMapReady={setMap}
      />
      <DomainOverlay
        map={map}
        districts={calibratedDistricts ?? data.districts}
        sites={data.sites}
        domains={activeDomains}
        onOpenCoterie={openCoterie}
      />
      <TorontoLocator map={map} resolveHomeCenter={resolveHomeCenter} />
      <PlayerPinsLayer map={map} sites={data.sites} onSnapshot={onPinSnapshot} />
      {!calibrationMode ? (
        <IconRail
          regions={data.regions.features.map((feature) => feature.properties)}
          districts={data.districts.features.map((feature) => feature.properties)}
          pathDistrict={data.pathDistrict}
          sheetOnlyDistricts={data.sheetOnlyDistricts}
          regionVisibility={regionVisibility}
          selectedDistrictKey={validSelectedKey}
          sites={data.sites.features.map((feature) => feature.properties)}
          toggledSiteKeys={toggledSiteKeys}
          overlay={overlay}
          domainSelection={domainSelection}
          onToggleRegion={toggleRegion}
          onSelectDistrict={selectDistrict}
          onToggleSite={toggleSite}
          onFocusHub={focusSite}
          onOverlayChange={changeOverlay}
          onDomainSelectionChange={changeDomains}
          onOpenCoterie={openCoterie}
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
      ) : useImageChrome && validSelectedKey && selectedDistrictName ? (
        <DistrictChrome districtKey={validSelectedKey} districtName={selectedDistrictName} />
      ) : (
        <DistrictPanel
          districts={data.districts.features}
          pathDistrict={data.pathDistrict}
          sheetOnlyDistricts={data.sheetOnlyDistricts}
          selectedKey={validSelectedKey}
          onClear={clearDistrict}
        />
      )}
      <CoterieModal coterieKey={openCoterieKey} onClose={() => setOpenCoterieKey(null)} />
      {activeSite ? (
        <SiteCardModal
          open
          onClose={() => setActiveSite(null)}
          siteKey={activeSite.key}
          siteName={activeSite.name}
          hub={activeSite.hub}
          districtKey={activeSite.districtKey}
          districtName={activeSiteDistrictName}
        />
      ) : null}
      <DebugNotesSlot
        map={map}
        districts={calibratedDistricts ?? data.districts}
        selectedDistrict={validSelectedKey}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
      />
    </main>
  );
}
