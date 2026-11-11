import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  Map,
  NavigationControl,
  setWorkerUrl,
  type ErrorEvent as MapLibreErrorEvent,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { featureBounds } from './data';
import { labelsForViewport } from './viewport-labels';
import type {
  DistrictFeatureCollection,
  CityMarkerCollection,
  MapLabelCollection,
  MapLayerVisibility,
  PathEntranceCollection,
  PathInteractionCollection,
  PathLabelCollection,
  PathRouteCollection,
  PublicSiteCollection,
  RegionFeatureCollection,
} from './types';

const SOURCE_ID = 'districts';
const REGION_SOURCE_ID = 'regions';
const SITE_SOURCE_ID = 'sites';
const LABEL_SOURCE_ID = 'map-labels';
const PATH_ROUTE_SOURCE_ID = 'path-routes';
const PATH_ENTRANCE_SOURCE_ID = 'path-entrances';
const PATH_INTERACTION_SOURCE_ID = 'path-interaction';
const PATH_LABEL_SOURCE_ID = 'path-label';
const CITY_MARKER_SOURCE_ID = 'province-cities';
const FILL_LAYER_ID = 'district-fills';
const SELECTED_GLOW_LAYER_ID = 'district-selected-glow';
const LINE_LAYER_ID = 'district-lines';
const LABEL_LAYER_ID = 'district-labels';
const REGION_FILL_LAYER_ID = 'region-fills';
const REGION_LINE_LAYER_ID = 'region-lines';
const REGION_LABEL_LAYER_ID = 'region-labels';
const SITE_LAYER_ID = 'site-markers';
const PATH_ROUTE_LAYER_ID = 'path-route-lines';
const PATH_ENTRANCE_LAYER_ID = 'path-entrance-markers';
const PATH_INTERACTION_LAYER_ID = 'path-interaction-corridors';
const PATH_LABEL_LAYER_ID = 'path-label';
const CITY_MARKER_CIRCLE_LAYER_ID = 'province-city-markers';
const CITY_MARKER_LABEL_LAYER_ID = 'province-city-labels';
const PLAY_BOUNDS: [[number, number], [number, number]] = [[-80.2, 43.0], [-72.7, 46.2]];
const INITIAL_BOUNDS: [[number, number], [number, number]] = [[-79.44, 43.63], [-79.34, 43.70]];
const PROVINCE_VIEW_BOUNDS: [[number, number], [number, number]] = [[-79.65, 43.35], [-73.2, 45.75]];

setWorkerUrl(mapWorkerUrl);

interface MapViewProps {
  districts: DistrictFeatureCollection;
  regions: RegionFeatureCollection;
  sites: PublicSiteCollection;
  labels: MapLabelCollection;
  pathRoutes: PathRouteCollection;
  pathEntrances: PathEntranceCollection;
  pathInteraction: PathInteractionCollection;
  pathLabel: PathLabelCollection;
  cityMarkers: CityMarkerCollection;
  pathBounds: { south: number; west: number; north: number; east: number };
  chronicleBounds: [[number, number], [number, number]];
  layerVisibility: MapLayerVisibility;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onMapReady?: (map: Map | null) => void;
}

function positionBoundaryShade(
  map: Map,
  bounds: [[number, number], [number, number]],
  element: HTMLDivElement,
) {
  const northWest = map.project([bounds[0][0], bounds[1][1]]);
  const southEast = map.project([bounds[1][0], bounds[0][1]]);
  const width = map.getContainer().clientWidth;
  const height = map.getContainer().clientHeight;
  const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));
  element.style.setProperty('--chronicle-west', `${clamp(northWest.x, width)}px`);
  element.style.setProperty('--chronicle-east', `${clamp(southEast.x, width)}px`);
  element.style.setProperty('--chronicle-north', `${clamp(northWest.y, height)}px`);
  element.style.setProperty('--chronicle-south', `${clamp(southEast.y, height)}px`);
}

function updateViewportLabels(
  map: Map,
  districts: DistrictFeatureCollection,
  labels: MapLabelCollection,
) {
  const bounds = map.getBounds();
  const source = map.getSource(LABEL_SOURCE_ID) as GeoJSONSource | undefined;
  source?.setData(labelsForViewport(districts, labels, [
    bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
  ]));
}

function districtKey(feature: MapGeoJSONFeature | undefined): string | null {
  const value = feature?.properties?.key;
  return typeof value === 'string' ? value : null;
}

function focusDistrict(map: Map, districts: DistrictFeatureCollection, key: string) {
  const feature = districts.features.find((candidate) => candidate.properties.key === key);
  if (!feature) return;
  map.fitBounds(featureBounds(feature.geometry.coordinates), {
    padding: { top: 116, right: 52, bottom: 260, left: 52 },
    maxZoom: 14.5,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
  });
}

function focusPath(map: Map, bounds: MapViewProps['pathBounds']) {
  map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], {
    padding: { top: 116, right: 52, bottom: 260, left: 52 },
    maxZoom: 14,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
  });
}

function mapVisibility(visible: boolean) {
  return visible ? 'visible' as const : 'none' as const;
}

export function MapView({
  districts,
  regions,
  sites,
  labels,
  pathRoutes,
  pathEntrances,
  pathInteraction,
  pathLabel,
  cityMarkers,
  pathBounds,
  chronicleBounds,
  layerVisibility,
  selectedKey,
  onSelect,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boundaryShadeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const districtsRef = useRef(districts);
  const regionsRef = useRef(regions);
  const sitesRef = useRef(sites);
  const labelsRef = useRef(labels);
  const pathRoutesRef = useRef(pathRoutes);
  const pathEntrancesRef = useRef(pathEntrances);
  const pathInteractionRef = useRef(pathInteraction);
  const pathLabelRef = useRef(pathLabel);
  const cityMarkersRef = useRef(cityMarkers);
  const layerVisibilityRef = useRef(layerVisibility);
  const onSelectRef = useRef(onSelect);
  const onMapReadyRef = useRef(onMapReady);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [status, setStatus] = useState('Loading street map…');
  const [provinceView, setProvinceView] = useState(false);
  districtsRef.current = districts;
  regionsRef.current = regions;
  sitesRef.current = sites;
  labelsRef.current = labels;
  pathRoutesRef.current = pathRoutes;
  pathEntrancesRef.current = pathEntrances;
  pathInteractionRef.current = pathInteraction;
  pathLabelRef.current = pathLabel;
  cityMarkersRef.current = cityMarkers;
  layerVisibilityRef.current = layerVisibility;
  onSelectRef.current = onSelect;
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const map = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      bounds: INITIAL_BOUNDS,
      fitBoundsOptions: { padding: 44 },
      maxBounds: PLAY_BOUNDS,
      minZoom: 5.5,
      maxZoom: 18,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      attributionControl: false,
    });
    mapRef.current = map;
    onMapReadyRef.current?.(map);
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    let boundaryFrame: number | null = null;
    let labelTimer: number | null = null;
    const updateBoundaryShade = () => {
      if (boundaryFrame !== null) return;
      boundaryFrame = window.requestAnimationFrame(() => {
        boundaryFrame = null;
        if (boundaryShadeRef.current) positionBoundaryShade(map, chronicleBounds, boundaryShadeRef.current);
      });
    };
    const finalizeViewportLabels = () => {
      if (labelTimer !== null) window.clearTimeout(labelTimer);
      labelTimer = null;
      updateViewportLabels(map, districtsRef.current, labelsRef.current);
    };
    const queueViewportLabels = () => {
      if (labelTimer !== null) return;
      labelTimer = window.setTimeout(finalizeViewportLabels, 150);
    };

    const onLoad = () => {
      map.addSource(SOURCE_ID, { type: 'geojson', data: districtsRef.current, promoteId: 'key' });
      map.addSource(REGION_SOURCE_ID, { type: 'geojson', data: regionsRef.current, promoteId: 'key' });
      map.addSource(SITE_SOURCE_ID, { type: 'geojson', data: sitesRef.current, promoteId: 'key' });
      map.addSource(LABEL_SOURCE_ID, { type: 'geojson', data: labelsRef.current, promoteId: 'key' });
      map.addSource(PATH_ROUTE_SOURCE_ID, { type: 'geojson', data: pathRoutesRef.current });
      map.addSource(PATH_ENTRANCE_SOURCE_ID, { type: 'geojson', data: pathEntrancesRef.current });
      map.addSource(PATH_INTERACTION_SOURCE_ID, { type: 'geojson', data: pathInteractionRef.current });
      map.addSource(PATH_LABEL_SOURCE_ID, { type: 'geojson', data: pathLabelRef.current });
      map.addSource(CITY_MARKER_SOURCE_ID, { type: 'geojson', data: cityMarkersRef.current });
      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#c22933',
            ['boolean', ['feature-state', 'hovered'], false], '#7e2029',
            '#2a0b10',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.2,
            ['boolean', ['feature-state', 'hovered'], false], 0.34,
            0.18,
          ],
        },
        layout: { visibility: mapVisibility(layerVisibilityRef.current.districts) },
      });
      map.addLayer({
        id: SELECTED_GLOW_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#ff4f59',
          'line-width': 8,
          'line-blur': 5,
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.9,
            0,
          ],
        },
        layout: { visibility: mapVisibility(layerVisibilityRef.current.districts) },
      });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#ff6b72',
            '#8e343b',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.6,
            1.1,
          ],
          'line-opacity': 0.92,
        },
        layout: { visibility: mapVisibility(layerVisibilityRef.current.districts) },
      });
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: LABEL_SOURCE_ID,
        minzoom: 11.25,
        filter: ['==', ['get', 'kind'], 'district'],
        layout: {
          visibility: mapVisibility(layerVisibilityRef.current.districts),
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11.25, 10, 14, 13],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
          'text-max-width': 10,
        },
        paint: {
          'text-color': '#f0d9d5',
          'text-halo-color': '#14080a',
          'text-halo-width': 1.5,
        },
      });
      map.addLayer({
        id: REGION_FILL_LAYER_ID,
        type: 'fill',
        source: REGION_SOURCE_ID,
        layout: { visibility: mapVisibility(layerVisibilityRef.current.regions) },
        paint: {
          'fill-color': [
            'match', ['get', 'key'],
            'AnarchFreeZone', '#8753b8',
            'TheRack', '#b39135',
            'TheBarrens', '#6f2028',
            '#8e343b',
          ],
          'fill-opacity': 0.2,
        },
      });
      map.addLayer({
        id: REGION_LINE_LAYER_ID,
        type: 'line',
        source: REGION_SOURCE_ID,
        layout: { visibility: mapVisibility(layerVisibilityRef.current.regions) },
        paint: {
          'line-color': [
            'match', ['get', 'key'],
            'AnarchFreeZone', '#c58af5',
            'TheRack', '#e6c45d',
            'TheBarrens', '#dc6069',
            '#d9878d',
          ],
          'line-width': 2.2,
          'line-dasharray': [2, 1.5],
          'line-opacity': 0.92,
        },
      });
      map.addLayer({
        id: REGION_LABEL_LAYER_ID,
        type: 'symbol',
        source: LABEL_SOURCE_ID,
        minzoom: 10.5,
        filter: ['==', ['get', 'kind'], 'region'],
        layout: {
          visibility: mapVisibility(layerVisibilityRef.current.regions),
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10.5, 11, 14, 15],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.16,
          'text-max-width': 12,
        },
        paint: {
          'text-color': '#f4d878',
          'text-halo-color': '#14080a',
          'text-halo-width': 2,
        },
      });
      map.addLayer({
        id: SITE_LAYER_ID,
        type: 'circle',
        source: SITE_SOURCE_ID,
        minzoom: 12,
        layout: { visibility: mapVisibility(layerVisibilityRef.current.sites) },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 7],
          'circle-color': '#f1d27a',
          'circle-stroke-color': '#14080a',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: PATH_ROUTE_LAYER_ID,
        type: 'line',
        source: PATH_ROUTE_SOURCE_ID,
        minzoom: 11.5,
        layout: { visibility: mapVisibility(layerVisibilityRef.current.path), 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#e5cb6d',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11.5, 1.2, 16, 3.2],
          'line-opacity': 0.9,
          'line-blur': 0.35,
        },
      });
      map.addLayer({
        id: PATH_ENTRANCE_LAYER_ID,
        type: 'circle',
        source: PATH_ENTRANCE_SOURCE_ID,
        minzoom: 14,
        layout: { visibility: mapVisibility(layerVisibilityRef.current.path) },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2.5, 18, 6],
          'circle-color': [
            'match', ['get', 'kind'],
            'elevator', '#d79af2',
            'subway-entrance', '#f4e09a',
            '#e5cb6d',
          ],
          'circle-stroke-color': '#211013',
          'circle-stroke-width': 1.5,
        },
      });
      map.addLayer({
        id: PATH_LABEL_LAYER_ID,
        type: 'symbol',
        source: PATH_LABEL_SOURCE_ID,
        minzoom: 11.5,
        layout: {
          visibility: mapVisibility(layerVisibilityRef.current.path),
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11.5, 13, 15, 18],
          'text-letter-spacing': 0.2,
        },
        paint: {
          'text-color': '#f4e09a',
          'text-halo-color': '#14080a',
          'text-halo-width': 2,
        },
      });
      map.addLayer({
        id: PATH_INTERACTION_LAYER_ID,
        type: 'fill',
        source: PATH_INTERACTION_SOURCE_ID,
        minzoom: 11.5,
        layout: { visibility: mapVisibility(layerVisibilityRef.current.path) },
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.001 },
      });
      map.addLayer({
        id: CITY_MARKER_CIRCLE_LAYER_ID,
        type: 'circle',
        source: CITY_MARKER_SOURCE_ID,
        maxzoom: 9.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5.5, 5, 9, 8],
          'circle-color': '#d94852',
          'circle-stroke-color': '#f4ddd8',
          'circle-stroke-width': 1.5,
        },
      });
      map.addLayer({
        id: CITY_MARKER_LABEL_LAYER_ID,
        type: 'symbol',
        source: CITY_MARKER_SOURCE_ID,
        maxzoom: 9.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5.5, 12, 9, 16],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.16,
          'text-offset': [0, 1.35],
        },
        paint: {
          'text-color': '#f4ddd8',
          'text-halo-color': '#14080a',
          'text-halo-width': 2,
        },
      });
      if (selectedRef.current) {
        if (selectedRef.current === 'PATH') focusPath(map, pathBounds);
        else {
          map.setFeatureState({ source: SOURCE_ID, id: selectedRef.current }, { selected: true });
          focusDistrict(map, districtsRef.current, selectedRef.current);
        }
      }
      setStatus('Street map ready. Select a shaded district for details.');
      updateBoundaryShade();
      finalizeViewportLabels();
    };

    const onMouseMove = (event: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: [PATH_INTERACTION_LAYER_ID, FILL_LAYER_ID] })[0];
      const key = districtKey(feature);
      if (key === hoveredRef.current) return;
      if (hoveredRef.current && hoveredRef.current !== 'PATH') {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hovered: false });
      }
      hoveredRef.current = key;
      if (key && key !== 'PATH') map.setFeatureState({ source: SOURCE_ID, id: key }, { hovered: true });
      map.getCanvas().style.cursor = key ? 'pointer' : '';
    };
    const onClick = (event: MapMouseEvent) => {
      const key = districtKey(map.queryRenderedFeatures(event.point, { layers: [PATH_INTERACTION_LAYER_ID, FILL_LAYER_ID] })[0]);
      if (key) onSelectRef.current(key);
    };
    const onError = (event: MapLibreErrorEvent) => {
      if (event.error) setStatus(`Map error: ${event.error.message}`);
    };

    map.on('load', onLoad);
    map.on('mousemove', onMouseMove);
    map.on('click', onClick);
    map.on('error', onError);
    map.on('move', updateBoundaryShade);
    map.on('move', queueViewportLabels);
    map.on('moveend', finalizeViewportLabels);
    map.on('resize', updateBoundaryShade);
    return () => {
      if (boundaryFrame !== null) window.cancelAnimationFrame(boundaryFrame);
      if (labelTimer !== null) window.clearTimeout(labelTimer);
      onMapReadyRef.current?.(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(districts);
  }, [districts]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(REGION_SOURCE_ID) as GeoJSONSource | undefined)?.setData(regions);
  }, [regions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(SITE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(sites);
  }, [sites]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    updateViewportLabels(map, districtsRef.current, labels);
  }, [labels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(PATH_ROUTE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(pathRoutes);
    (map.getSource(PATH_ENTRANCE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(pathEntrances);
    (map.getSource(PATH_INTERACTION_SOURCE_ID) as GeoJSONSource | undefined)?.setData(pathInteraction);
    (map.getSource(PATH_LABEL_SOURCE_ID) as GeoJSONSource | undefined)?.setData(pathLabel);
  }, [pathEntrances, pathInteraction, pathLabel, pathRoutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(CITY_MARKER_SOURCE_ID) as GeoJSONSource | undefined)?.setData(cityMarkers);
  }, [cityMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    for (const layer of [FILL_LAYER_ID, SELECTED_GLOW_LAYER_ID, LINE_LAYER_ID, LABEL_LAYER_ID]) {
      map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.districts));
    }
    for (const layer of [REGION_FILL_LAYER_ID, REGION_LINE_LAYER_ID, REGION_LABEL_LAYER_ID]) {
      map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.regions));
    }
    map.setLayoutProperty(SITE_LAYER_ID, 'visibility', mapVisibility(layerVisibility.sites));
    for (const layer of [PATH_ROUTE_LAYER_ID, PATH_ENTRANCE_LAYER_ID, PATH_INTERACTION_LAYER_ID, PATH_LABEL_LAYER_ID]) {
      map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.path));
    }
    if ((!layerVisibility.districts || !layerVisibility.path) && hoveredRef.current) {
      if (hoveredRef.current !== 'PATH') {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hovered: false });
      }
      hoveredRef.current = null;
      map.getCanvas().style.cursor = '';
    }
  }, [layerVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    const previousKey = selectedRef.current;
    selectedRef.current = selectedKey;
    if (!map?.isStyleLoaded()) return;
    if (previousKey && previousKey !== 'PATH') map.setFeatureState({ source: SOURCE_ID, id: previousKey }, { selected: false });
    map.setPaintProperty(PATH_ROUTE_LAYER_ID, 'line-width', selectedKey === 'PATH'
      ? ['interpolate', ['linear'], ['zoom'], 11.5, 2.4, 16, 5]
      : ['interpolate', ['linear'], ['zoom'], 11.5, 1.2, 16, 3.2]);
    if (!selectedKey) return;
    if (selectedKey === 'PATH') focusPath(map, pathBounds);
    else {
      map.setFeatureState({ source: SOURCE_ID, id: selectedKey }, { selected: true });
      focusDistrict(map, districtsRef.current, selectedKey);
    }
  }, [selectedKey]);

  const toggleProvinceView = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextProvinceView = !provinceView;
    setProvinceView(nextProvinceView);
    map.fitBounds(nextProvinceView ? PROVINCE_VIEW_BOUNDS : INITIAL_BOUNDS, {
      padding: 44,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900,
    });
  };

  return (
    <section className="map-surface" data-note-surface="map" aria-label="Interactive map of Toronto Rising districts">
      <div ref={containerRef} className="map-surface__canvas" />
      <div ref={boundaryShadeRef} className={`chronicle-boundary-shade${provinceView ? ' chronicle-boundary-shade--province' : ''}`} aria-hidden="true">
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--north" />
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--south" />
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--west" />
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--east" />
      </div>
      <p className="map-surface__status" role="status">{status}</p>
      <button type="button" className="map-surface__province-view" onClick={toggleProvinceView}>
        {provinceView ? 'Return to Toronto' : 'Province view'}
      </button>
    </section>
  );
}
