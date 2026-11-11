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
import type { MapFeatureCollection } from './types';

const SOURCE_ID = 'districts';
const FILL_LAYER_ID = 'district-fills';
const LINE_LAYER_ID = 'district-lines';
const LABEL_LAYER_ID = 'district-labels';
const PLAY_BOUNDS: [[number, number], [number, number]] = [[-79.455, 43.61], [-79.325, 43.71]];
const INITIAL_BOUNDS: [[number, number], [number, number]] = [[-79.44, 43.63], [-79.34, 43.70]];

setWorkerUrl(mapWorkerUrl);

interface MapViewProps {
  districts: MapFeatureCollection;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onMapReady?: (map: Map | null) => void;
}

function districtKey(feature: MapGeoJSONFeature | undefined): string | null {
  const value = feature?.properties?.key;
  return typeof value === 'string' ? value : null;
}

function focusDistrict(map: Map, districts: MapFeatureCollection, key: string) {
  const feature = districts.features.find((candidate) => candidate.properties.key === key);
  if (!feature) return;
  map.fitBounds(featureBounds(feature.geometry.coordinates), {
    padding: { top: 116, right: 52, bottom: 260, left: 52 },
    maxZoom: 14.5,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
  });
}

export function MapView({ districts, selectedKey, onSelect, onMapReady }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const districtsRef = useRef(districts);
  const onSelectRef = useRef(onSelect);
  const onMapReadyRef = useRef(onMapReady);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [status, setStatus] = useState('Loading street map…');
  districtsRef.current = districts;
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
      minZoom: 10.25,
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

    const onLoad = () => {
      map.addSource(SOURCE_ID, { type: 'geojson', data: districtsRef.current, promoteId: 'key' });
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
            ['boolean', ['feature-state', 'selected'], false], 0.58,
            ['boolean', ['feature-state', 'hovered'], false], 0.42,
            0.24,
          ],
        },
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
      });
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 11.25,
        layout: {
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
      if (selectedRef.current) {
        map.setFeatureState({ source: SOURCE_ID, id: selectedRef.current }, { selected: true });
        focusDistrict(map, districtsRef.current, selectedRef.current);
      }
      setStatus('Street map ready. Select a shaded district for details.');
    };

    const onMouseMove = (event: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: [FILL_LAYER_ID] })[0];
      const key = districtKey(feature);
      if (key === hoveredRef.current) return;
      if (hoveredRef.current) map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hovered: false });
      hoveredRef.current = key;
      if (key) map.setFeatureState({ source: SOURCE_ID, id: key }, { hovered: true });
      map.getCanvas().style.cursor = key ? 'pointer' : '';
    };
    const onClick = (event: MapMouseEvent) => {
      const key = districtKey(map.queryRenderedFeatures(event.point, { layers: [FILL_LAYER_ID] })[0]);
      if (key) onSelectRef.current(key);
    };
    const onError = (event: MapLibreErrorEvent) => {
      if (event.error) setStatus(`Map error: ${event.error.message}`);
    };

    map.on('load', onLoad);
    map.on('mousemove', onMouseMove);
    map.on('click', onClick);
    map.on('error', onError);
    return () => {
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
    const previousKey = selectedRef.current;
    selectedRef.current = selectedKey;
    if (!map?.isStyleLoaded()) return;
    if (previousKey) map.setFeatureState({ source: SOURCE_ID, id: previousKey }, { selected: false });
    if (!selectedKey) return;
    map.setFeatureState({ source: SOURCE_ID, id: selectedKey }, { selected: true });
    focusDistrict(map, districtsRef.current, selectedKey);
  }, [selectedKey]);

  return (
    <section className="map-surface" data-note-surface="map" aria-label="Interactive map of Toronto Rising districts">
      <div ref={containerRef} className="map-surface__canvas" />
      <p className="map-surface__status" role="status">{status}</p>
    </section>
  );
}
