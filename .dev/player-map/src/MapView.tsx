import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { siteCardUrl, siteHubCardUrl } from './districtAssets';
import { overlayPaintForDistrict, type MapOverlaySelection } from './mapOverlays';
import {
  AttributionControl,
  Map,
  Marker,
  setWorkerUrl,
  type ErrorEvent as MapLibreErrorEvent,
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { featureBounds } from './data';
import { interiorDistrictBorders } from './district-borders';
import { DISTRICT_GLOW_COLOR, districtPulseAmount, districtPulseFrame } from './district-pulse';
import { ORIENTATION_STREETS, type OrientationStreetCategory } from './orientation-streets';
import {
  createDistrictLabelElement,
  DISTRICT_LABEL_MIN_ZOOM,
  setDistrictLabelState,
} from './district-html-labels';
import {
  filterOrientationStubArtifacts,
  STREET_LABEL_MIN_ZOOM,
  stitchOrientationStreetFeatures,
  streetLabelCollection,
} from './street-labels';
import { labelsForViewport } from './viewport-labels';
import type {
  DistrictFeatureCollection,
  CityMarkerCollection,
  BasemapMaskCollection,
  BasemapMaskLabelCollection,
  MapLabelCollection,
  MapLayerVisibility,
  PathEntranceCollection,
  PathInteractionCollection,
  PathLabelCollection,
  PathRouteCollection,
  PublicSiteCollection,
  RegionFeatureCollection,
  RegionVisibility,
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
const BASEMAP_MASK_SOURCE_ID = 'basemap-masks';
const BASEMAP_MASK_LABEL_SOURCE_ID = 'basemap-mask-labels';
const FILL_LAYER_ID = 'district-fills';
const BORDER_SOURCE_ID = 'district-borders';
const HOVER_BORDER_SOURCE_ID = 'district-hover-borders';
const HOVER_BORDER_LAYER_ID = 'district-hover-lines';
const DISTRICT_GLOW_LAYER_IDS = ['district-selected-glow', 'district-selected-glow-b'] as const;
const LINE_LAYER_ID = 'district-lines';
const REGION_GLOW_LAYER_ID = 'region-glow';
const BASEMAP_IMAGE_PREFIX = 'basemap-mask-image-';
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
const PRIMARY_STREET_CASING_LAYER_ID = 'primary-street-casing';
const PRIMARY_STREET_LINE_LAYER_ID = 'primary-street-lines';
const ORIENTATION_STREET_CASING_LAYER_ID = 'orientation-street-casing';
const ORIENTATION_STREET_LINE_LAYER_ID = 'orientation-street-lines';
const ORIENTATION_STREET_SOURCE_ID = 'orientation-streets';
const FORCED_STREET_NAMES = ORIENTATION_STREETS.flatMap((street) => street.matchNames);
const STREET_LINE_LAYER_IDS = [
  PRIMARY_STREET_CASING_LAYER_ID,
  PRIMARY_STREET_LINE_LAYER_ID,
  ORIENTATION_STREET_CASING_LAYER_ID,
  ORIENTATION_STREET_LINE_LAYER_ID,
] as const;
const BASEMAP_MASK_FILL_LAYER_ID = 'basemap-mask-fills';
const BASEMAP_MASK_LINE_LAYER_ID = 'basemap-mask-lines';
const BASEMAP_MASK_LABEL_LAYER_ID = 'basemap-mask-labels';
/** Wide enough for New South Wales Colony (Sydney) and European markers; south of Australia. */
const PLAY_BOUNDS: [[number, number], [number, number]] = [[-130, -45], [160, 62]];
const INITIAL_BOUNDS: [[number, number], [number, number]] = [[-79.44, 43.63], [-79.34, 43.70]];
const CITY_SHADE_MIN_ZOOM = 10;
const JOKE_HOME_COORDINATES: [number, number] = [-80.0197, 44.5101];
/** Remap the last generated street snapshot onto the current whitelist until streets are re-fetched. */
const ORIENTATION_STREET_DISPLAY_REMAP = new globalThis.Map<string, { category: OrientationStreetCategory; displayName: string }>([
  ['Yonge Street', { category: 'orientation', displayName: 'YONGE' }],
  ['Don Valley Parkway', { category: 'primary', displayName: 'DON VALLEY PARKWAY' }],
  ['Gardiner Expressway', { category: 'primary', displayName: 'GARDINER EXPRESSWAY' }],
  ['St. Clair West', { category: 'orientation', displayName: 'ST. CLAIR' }],
  ['St. Clair East', { category: 'orientation', displayName: 'ST. CLAIR' }],
  ['Bloor West', { category: 'orientation', displayName: 'BLOOR' }],
  ['Bloor East', { category: 'orientation', displayName: 'BLOOR' }],
  ['Dundas West', { category: 'orientation', displayName: 'DUNDAS' }],
  ['Dundas East', { category: 'orientation', displayName: 'DUNDAS' }],
  ['Front West', { category: 'orientation', displayName: 'FRONT' }],
  ['Front East', { category: 'orientation', displayName: 'FRONT' }],
  ...ORIENTATION_STREETS.map((street) => [street.displayName, { category: street.category, displayName: street.displayName }] as const),
]);
const BASEMAP_LABEL_LAYER_IDS = [
  'highway_name_other',
  'highway_name_motorway',
  'place_suburb',
  'place_village',
  'place_town',
  'place_city',
  'place_city_large',
];

setWorkerUrl(mapWorkerUrl);

export interface BasemapMaskImage {
  key: string;
  url: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

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
  basemapMasks: BasemapMaskCollection;
  basemapMaskLabels: BasemapMaskLabelCollection;
  basemapMaskImages: BasemapMaskImage[];
  pathBounds: { south: number; west: number; north: number; east: number };
  chronicleBounds: [[number, number], [number, number]];
  layerVisibility: MapLayerVisibility;
  regionVisibility: RegionVisibility;
  selectedKey: string | null;
  toggledSiteKeys: readonly string[];
  overlay?: MapOverlaySelection;
  /** When true, the next selectedKey change skips district fitBounds (site focus wins). */
  skipNextDistrictFocusRef?: MutableRefObject<boolean>;
  onSelect: (key: string) => void;
  onSiteSelect?: (key: string) => void;
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
    padding: { top: 116, right: 52, bottom: 260, left: 120 },
    maxZoom: 14.5,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
  });
}

function focusPath(map: Map, bounds: MapViewProps['pathBounds']) {
  map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], {
    padding: { top: 116, right: 52, bottom: 260, left: 120 },
    maxZoom: 14,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
  });
}

function mapVisibility(visible: boolean) {
  return visible ? 'visible' as const : 'none' as const;
}

function syncDistrictBorders(map: Map, districts: DistrictFeatureCollection, selectedKey: string | null) {
  const source = map.getSource(BORDER_SOURCE_ID) as GeoJSONSource | undefined;
  source?.setData(interiorDistrictBorders(districts, selectedKey));
}

function syncHoverBorders(map: Map, districts: DistrictFeatureCollection, hoveredKey: string | null) {
  const source = map.getSource(HOVER_BORDER_SOURCE_ID) as GeoJSONSource | undefined;
  // Same edge-stripped outline as selection so map-rim districts stay open to the blur.
  source?.setData(interiorDistrictBorders(districts, hoveredKey));
}

/** Pulse above white roads, under symbol labels (pin 11). HTML street labels sit above the canvas. */
function restackPulseAboveStreets(map: Map) {
  for (const layerId of STREET_LINE_LAYER_IDS) {
    if (!map.getLayer(layerId)) return;
  }
  for (const layerId of [...DISTRICT_GLOW_LAYER_IDS, LINE_LAYER_ID, HOVER_BORDER_LAYER_ID]) {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  }
  for (const layerId of [
    REGION_GLOW_LAYER_ID,
    REGION_LINE_LAYER_ID,
    REGION_LABEL_LAYER_ID,
    SITE_LAYER_ID,
    BASEMAP_MASK_LABEL_LAYER_ID,
  ]) {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  }
}

function syncPathVisibility(map: Map, selectedKey: string | null) {
  const show = selectedKey === 'PATH';
  if (map.getLayer(PATH_ROUTE_LAYER_ID)) map.setLayoutProperty(PATH_ROUTE_LAYER_ID, 'visibility', mapVisibility(show));
  if (map.getLayer(PATH_INTERACTION_LAYER_ID)) map.setLayoutProperty(PATH_INTERACTION_LAYER_ID, 'visibility', mapVisibility(show));
  if (map.getLayer(PATH_ENTRANCE_LAYER_ID)) map.setLayoutProperty(PATH_ENTRANCE_LAYER_ID, 'visibility', 'none');
}

const rasterizedBasemapImages = new globalThis.Map<string, string>();

async function rasterizeSvg(url: string, pixelSize?: number): Promise<string> {
  const cacheKey = pixelSize ? `${url}@${pixelSize}` : url;
  const cached = rasterizedBasemapImages.get(cacheKey);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load basemap mask ${url}`);
  const blob = new Blob([await response.text()], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = pixelSize || image.naturalWidth || 1024;
    canvas.height = pixelSize || image.naturalHeight || 1024;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not draw the basemap mask');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('Could not encode the basemap mask'))), 'image/png');
    });
    const pngUrl = URL.createObjectURL(png);
    rasterizedBasemapImages.set(cacheKey, pngUrl);
    return pngUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function syncBasemapImages(map: Map, images: BasemapMaskImage[]) {
  if (!map.getLayer(FILL_LAYER_ID)) return;
  const wanted = new Set(images.map((image) => `${BASEMAP_IMAGE_PREFIX}${image.key}`));
  for (const layer of map.getStyle().layers ?? []) {
    if (!layer.id.startsWith(BASEMAP_IMAGE_PREFIX) || wanted.has(layer.id)) continue;
    map.removeLayer(layer.id);
    if (map.getSource(layer.id)) map.removeSource(layer.id);
  }
  for (const image of images) {
    const id = `${BASEMAP_IMAGE_PREFIX}${image.key}`;
    if (map.getSource(id)) continue;
    void rasterizeSvg(image.url).then((url) => {
      if (!map.getLayer(FILL_LAYER_ID) || map.getSource(id)) return;
      map.addSource(id, { type: 'image', url, coordinates: image.coordinates });
      map.addLayer({ id, type: 'raster', source: id }, FILL_LAYER_ID);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not draw the basemap mask';
      console.error(message);
    });
  }
}

function hideBasemapLabels(map: Map) {
  for (const layerId of BASEMAP_LABEL_LAYER_IDS) {
    if (layerId.startsWith('highway_')) continue;
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
  }
  const exclude: FilterSpecification = ['match', ['coalesce', ['get', 'name'], ['get', 'name_en'], ''], FORCED_STREET_NAMES, false, true];
  for (const layerId of ['highway_name_other', 'highway_name_motorway']) {
    if (!map.getLayer(layerId)) continue;
    map.setLayoutProperty(layerId, 'visibility', 'visible');
    const existing = map.getFilter(layerId);
    map.setFilter(layerId, existing ? ['all', existing, exclude] as FilterSpecification : exclude);
  }
  // Keep CA / US / AU state-province labels; quiet foreign regional admin names (pin 26).
  const stateAllow: FilterSpecification = [
    'any',
    ['match', ['slice', ['coalesce', ['get', 'iso_3166_2'], ''], 0, 2], ['CA', 'US', 'AU'], true, false],
    ['match', ['slice', ['coalesce', ['get', 'iso_3166_1'], ''], 0, 2], ['CA', 'US', 'AU'], true, false],
  ];
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const id = layer.id.toLowerCase();
    if (!id.includes('place')) continue;
    if (id.includes('country')) continue;
    if (!(id.includes('state') || id.includes('province') || id.includes('region'))) continue;
    if (!map.getLayer(layer.id)) continue;
    map.setLayoutProperty(layer.id, 'visibility', 'visible');
    const existing = map.getFilter(layer.id);
    map.setFilter(layer.id, existing ? ['all', existing, stateAllow] as FilterSpecification : stateAllow);
  }
}

function addStreetLineLayers(
  map: Map,
  category: OrientationStreetCategory,
  ids: { casing: string; line: string },
  style: {
    minzoom: number;
    casingWidth: ExpressionSpecification;
    lineWidth: ExpressionSpecification;
    lineColor: string;
    lineOpacity: number;
  },
) {
  const filter: FilterSpecification = ['==', ['get', 'category'], category];
  map.addLayer({
    id: ids.casing,
    type: 'line',
    source: ORIENTATION_STREET_SOURCE_ID,
    minzoom: style.minzoom,
    filter,
    layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#14080a',
      'line-width': style.casingWidth,
      'line-opacity': 0.88,
    },
  });
  map.addLayer({
    id: ids.line,
    type: 'line',
    source: ORIENTATION_STREET_SOURCE_ID,
    minzoom: style.minzoom,
    filter,
    layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': style.lineColor,
      'line-width': style.lineWidth,
      'line-opacity': style.lineOpacity,
    },
  });
}

function createStreetLabelMarkerElement(displayName: string, category: OrientationStreetCategory) {
  const element = document.createElement('div');
  element.className = `street-label street-label--${category}`;
  element.textContent = displayName;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function syncStreetLabelVisibility(markers: Marker[], zoom: number) {
  const visible = zoom >= STREET_LABEL_MIN_ZOOM;
  for (const marker of markers) {
    const element = marker.getElement();
    element.style.display = visible ? '' : 'none';
  }
}

function syncDistrictHtmlLabelVisibility(markers: Marker[], zoom: number, districtsVisible: boolean) {
  const visible = districtsVisible && zoom >= DISTRICT_LABEL_MIN_ZOOM;
  for (const marker of markers) {
    marker.getElement().style.display = visible ? '' : 'none';
  }
}

function syncDistrictHtmlLabelStates(
  markers: Marker[],
  hoveredKey: string | null,
  selectedKey: string | null,
) {
  for (const marker of markers) {
    const element = marker.getElement();
    const key = element.dataset.districtKey ?? '';
    const state = key && key === selectedKey
      ? 'selected'
      : (key && key === hoveredKey ? 'hovered' : 'default');
    setDistrictLabelState(element, state);
  }
}

function mountDistrictHtmlMarkers(
  map: Map,
  labels: MapLabelCollection,
  hoveredKey: string | null,
  selectedKey: string | null,
): Marker[] {
  const markers: Marker[] = [];
  for (const feature of labels.features) {
    if (feature.properties.kind !== 'district') continue;
    const element = createDistrictLabelElement(feature.properties.name);
    element.dataset.districtKey = feature.properties.key;
    // Same map-locked Marker options as street labels (rotation stays 0 — names stay upright).
    const marker = new Marker({
      element,
      anchor: 'center',
      pitchAlignment: 'map',
      rotationAlignment: 'map',
    })
      .setLngLat(feature.geometry.coordinates as [number, number])
      .addTo(map);
    markers.push(marker);
  }
  syncDistrictHtmlLabelStates(markers, hoveredKey, selectedKey);
  syncDistrictHtmlLabelVisibility(markers, map.getZoom(), true);
  return markers;
}

function mountStreetLabelMarkers(
  map: Map,
  labels: GeoJSON.FeatureCollection<GeoJSON.Point, { category: string; displayName: string; entryKey: string; bearing: number }>,
): Marker[] {
  const markers: Marker[] = [];
  for (const feature of labels.features) {
    const category = feature.properties.category === 'primary' ? 'primary' : 'orientation';
    const marker = new Marker({
      element: createStreetLabelMarkerElement(feature.properties.displayName, category),
      anchor: 'center',
      pitchAlignment: 'map',
      rotationAlignment: 'map',
    })
      .setLngLat(feature.geometry.coordinates as [number, number])
      .setRotation(feature.properties.bearing ?? 0)
      .addTo(map);
    markers.push(marker);
  }
  syncStreetLabelVisibility(markers, map.getZoom());
  return markers;
}

function resolveOrientationStreetFeature(feature: GeoJSON.Feature): GeoJSON.Feature | null {
  const displayName = typeof feature.properties?.displayName === 'string' ? feature.properties.displayName : '';
  const matchName = typeof feature.properties?.matchName === 'string' ? feature.properties.matchName : '';
  const entryKey = typeof feature.properties?.entryKey === 'string' ? feature.properties.entryKey : '';
  const byMatch = matchName
    ? ORIENTATION_STREETS.find((street) => street.matchNames.includes(matchName))
    : undefined;
  const byEntry = entryKey
    ? ORIENTATION_STREETS.find((street) => street.matchNames.includes(entryKey) || street.matchNames[0] === entryKey)
    : undefined;
  const byDisplay = ORIENTATION_STREET_DISPLAY_REMAP.get(displayName);
  const resolved = byMatch ?? byEntry;
  if (resolved) {
    const preservedKey = matchName && resolved.matchNames.includes(matchName)
      ? matchName
      : (entryKey && resolved.matchNames.includes(entryKey) ? entryKey : resolved.matchNames[0]);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        category: resolved.category,
        displayName: resolved.displayName,
        entryKey: preservedKey,
        matchName: matchName || preservedKey,
      },
    };
  }
  if (!byDisplay) return null;
  return {
    ...feature,
    properties: {
      ...feature.properties,
      category: byDisplay.category,
      displayName: byDisplay.displayName,
      entryKey: entryKey || displayName,
    },
  };
}

function loadOrientationStreets(
  map: Map,
  bounds: [[number, number], [number, number]],
  onLabelsMounted: (markers: Marker[]) => void,
) {
  void fetch('/generated/orientation-streets.geojson')
    .then((response) => {
      if (!response.ok) throw new Error('Could not load the orientation streets');
      return response.json() as Promise<GeoJSON.FeatureCollection>;
    })
    .then((data) => {
      if (!map.getLayer(FILL_LAYER_ID) || map.getSource(ORIENTATION_STREET_SOURCE_ID)) return;
      const resolved = data.features.flatMap((feature) => {
        const next = resolveOrientationStreetFeature(feature);
        if (!next || next.geometry.type !== 'LineString') return [];
        return [next as GeoJSON.Feature<GeoJSON.LineString>];
      });
      const cleaned = filterOrientationStubArtifacts(resolved);
      // Paint uses stitched corridors; labels must use pre-stitch ways so West/East
      // entryKeys survive (stitched templates were dropping BLOOR/DUNDAS/ST. CLAIR names).
      const painted: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: stitchOrientationStreetFeatures(cleaned),
      };
      // Full OSM geometry — lines continue under the exterior blur (pin 7).
      map.addSource(ORIENTATION_STREET_SOURCE_ID, { type: 'geojson', data: painted });
      addStreetLineLayers(map, 'primary', {
        casing: PRIMARY_STREET_CASING_LAYER_ID,
        line: PRIMARY_STREET_LINE_LAYER_ID,
      }, {
        minzoom: 9,
        casingWidth: ['interpolate', ['linear'], ['zoom'], 10.2, 4.2, 15, 8],
        lineWidth: ['interpolate', ['linear'], ['zoom'], 10.2, 1.6, 15, 3.8],
        lineColor: '#BBBBBB',
        lineOpacity: 0.96,
      });
      addStreetLineLayers(map, 'orientation', {
        casing: ORIENTATION_STREET_CASING_LAYER_ID,
        line: ORIENTATION_STREET_LINE_LAYER_ID,
      }, {
        minzoom: 10,
        casingWidth: ['interpolate', ['linear'], ['zoom'], 11.1, 3.2, 15, 6],
        lineWidth: ['interpolate', ['linear'], ['zoom'], 11.1, 1.05, 15, 2.6],
        lineColor: '#FFFFFF',
        lineOpacity: 0.92,
      });
      // HTML labels: Voltaire (orientation) / one marker per whitelist entry; hidden below zoom 12.
      const labelPoints = streetLabelCollection({ type: 'FeatureCollection', features: cleaned }, bounds);
      onLabelsMounted(mountStreetLabelMarkers(map, labelPoints));
      restackPulseAboveStreets(map);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Could not load the orientation streets');
    });
}

function siteIconId(icon: string) {
  return `site-icon-${icon}`;
}

function siteFilter(selectedKey: string | null, toggledSiteKeys: readonly string[]): FilterSpecification {
  const toggled: FilterSpecification = toggledSiteKeys.length > 0
    ? ['in', ['get', 'key'], ['literal', [...toggledSiteKeys]]]
    : ['literal', false];
  const district: FilterSpecification = selectedKey
    ? ['==', ['get', 'districtKey'], selectedKey]
    : ['literal', false];
  return ['any', ['==', ['get', 'hub'], true], toggled, district];
}

const rasterizedSiteIcons = new globalThis.Map<string, HTMLImageElement>();

async function loadSiteIcon(icon: string) {
  const cached = rasterizedSiteIcons.get(icon);
  if (cached) return cached;
  const url = await rasterizeSvg(`/assets/icons/sites/${encodeURIComponent(icon)}.svg`, 48);
  const image = new Image();
  image.src = url;
  await image.decode();
  rasterizedSiteIcons.set(icon, image);
  return image;
}

function syncSiteIcons(map: Map, sites: PublicSiteCollection) {
  if (!map.getLayer(SITE_LAYER_ID)) return;
  for (const icon of new Set(sites.features.map((feature) => feature.properties.icon))) {
    const id = siteIconId(icon);
    if (map.hasImage(id)) continue;
    void loadSiteIcon(icon).then((image) => {
      if (!map.getLayer(SITE_LAYER_ID) || map.hasImage(id)) return;
      map.addImage(id, image);
      // Icons load after the layer; re-assert icon layout once the first image lands.
      map.setLayoutProperty(SITE_LAYER_ID, 'icon-image', ['concat', 'site-icon-', ['get', 'icon']]);
    }).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : `Could not load site icon ${icon}`);
    });
  }
}

function addSiteMarkerLayer(map: Map, selectedKey: string | null, toggledSiteKeys: readonly string[]) {
  if (map.getLayer(SITE_LAYER_ID)) return;
  map.addLayer({
    id: SITE_LAYER_ID,
    type: 'symbol',
    source: SITE_SOURCE_ID,
    minzoom: 12.5,
    filter: siteFilter(selectedKey, toggledSiteKeys),
    layout: {
      // Icons are applied in syncSiteIcons once rasterized — missing sprite ids must not block text.
      'icon-anchor': 'bottom',
      // One zoom interpolate only (MapLibre rejects nested zoom expressions).
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        12.5, ['case', ['get', 'hub'], 0.625, 0.5],
        16, ['case', ['get', 'hub'], 1.1875, 0.95],
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': [
        'case',
        ['get', 'hub'], ['upcase', ['get', 'name']],
        ['get', 'name'],
      ],
      // OpenFreeMap dark only ships Noto Sans Regular — Bold yields blank glyphs.
      'text-font': ['Noto Sans Regular'],
      'text-size': [
        'case',
        ['get', 'hub'], 15,
        11,
      ],
      'text-anchor': 'bottom',
      // Hubs sit closer to the icon; one zoom interpolate only (MapLibre rejects nested zoom exprs).
      'text-offset': [
        'interpolate', ['linear'], ['zoom'],
        12.5, ['case', ['get', 'hub'], ['literal', [0, -1.55]], ['literal', [0, -3.1]]],
        16, ['case', ['get', 'hub'], ['literal', [0, -2.2]], ['literal', [0, -4.6]]],
      ],
      'text-max-width': 12,
      'text-justify': 'center',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': [
        'case',
        ['get', 'hub'], '#ffffff',
        '#f7f4ef',
      ],
      'text-halo-color': '#000000',
      'text-halo-width': 1.35,
      'text-halo-blur': 0,
    },
  });
}

function regionFilter(visibility: RegionVisibility): FilterSpecification {
  const enabled = Object.entries(visibility).filter(([, visible]) => visible).map(([key]) => key);
  if (enabled.length === 0) return ['==', ['get', 'key'], '__none__'];
  return ['match', ['get', 'key'], enabled, true, false];
}

function applyWhenStyleReady(map: Map, layerId: string, apply: () => void) {
  let finished = false;
  const run = () => {
    if (finished || !map.getLayer(layerId)) return;
    finished = true;
    apply();
  };
  run();
  if (finished) return () => undefined;
  map.once('idle', run);
  return () => {
    finished = true;
    map.off('idle', run);
  };
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
  basemapMasks,
  basemapMaskLabels,
  basemapMaskImages,
  pathBounds,
  chronicleBounds,
  layerVisibility,
  regionVisibility,
  selectedKey,
  toggledSiteKeys,
  overlay = { kind: 'none' },
  skipNextDistrictFocusRef,
  onSelect,
  onSiteSelect,
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
  const basemapMasksRef = useRef(basemapMasks);
  const basemapMaskLabelsRef = useRef(basemapMaskLabels);
  const basemapMaskImagesRef = useRef(basemapMaskImages);
  const layerVisibilityRef = useRef(layerVisibility);
  const regionVisibilityRef = useRef(regionVisibility);
  const onSelectRef = useRef(onSelect);
  const onSiteSelectRef = useRef(onSiteSelect);
  const onMapReadyRef = useRef(onMapReady);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const toggledSiteKeysRef = useRef(toggledSiteKeys);
  const pulseOriginRef = useRef<number | null>(null);
  const streetLabelMarkersRef = useRef<Marker[]>([]);
  const districtHtmlMarkersRef = useRef<Marker[]>([]);
  const [status, setStatus] = useState('Loading street map…');
  const [distantView, setDistantView] = useState(false);
  const [siteTooltip, setSiteTooltip] = useState<{
    key: string;
    hub: boolean;
    left: number;
    top: number;
  } | null>(null);
  districtsRef.current = districts;
  regionsRef.current = regions;
  sitesRef.current = sites;
  labelsRef.current = labels;
  pathRoutesRef.current = pathRoutes;
  pathEntrancesRef.current = pathEntrances;
  pathInteractionRef.current = pathInteraction;
  pathLabelRef.current = pathLabel;
  cityMarkersRef.current = cityMarkers;
  basemapMasksRef.current = basemapMasks;
  basemapMaskLabelsRef.current = basemapMaskLabels;
  basemapMaskImagesRef.current = basemapMaskImages;
  layerVisibilityRef.current = layerVisibility;
  regionVisibilityRef.current = regionVisibility;
  toggledSiteKeysRef.current = toggledSiteKeys;
  onSelectRef.current = onSelect;
  onSiteSelectRef.current = onSiteSelect;
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const map = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      bounds: INITIAL_BOUNDS,
      fitBoundsOptions: { padding: 44 },
      maxBounds: PLAY_BOUNDS,
      minZoom: 1,
      maxZoom: 18,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      attributionControl: false,
    });
    mapRef.current = map;
    onMapReadyRef.current?.(map);
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    const jokeHome = document.createElement('button');
    jokeHome.type = 'button';
    jokeHome.className = 'joke-home-pin';
    jokeHome.title = 'I Live Here!';
    jokeHome.setAttribute('aria-label', 'I Live Here!');
    const jokeMarker = new Marker({ element: jokeHome, anchor: 'center' })
      .setLngLat(JOKE_HOME_COORDINATES)
      .addTo(map);
    let boundaryFrame: number | null = null;
    let labelTimer: number | null = null;
    const updateBoundaryShade = () => {
      if (boundaryFrame !== null) return;
      boundaryFrame = window.requestAnimationFrame(() => {
        boundaryFrame = null;
        if (boundaryShadeRef.current) positionBoundaryShade(map, chronicleBounds, boundaryShadeRef.current);
        setDistantView(map.getZoom() < CITY_SHADE_MIN_ZOOM);
        const zoom = map.getZoom();
        syncStreetLabelVisibility(streetLabelMarkersRef.current, zoom);
        syncDistrictHtmlLabelVisibility(
          districtHtmlMarkersRef.current,
          zoom,
          layerVisibilityRef.current.districts,
        );
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

    let styleApplied = false;
    const onLoad = () => {
      if (styleApplied) return;
      styleApplied = true;
      hideBasemapLabels(map);
      map.addSource(SOURCE_ID, { type: 'geojson', data: districtsRef.current, promoteId: 'key' });
      map.addSource(REGION_SOURCE_ID, { type: 'geojson', data: regionsRef.current, promoteId: 'key' });
      map.addSource(SITE_SOURCE_ID, { type: 'geojson', data: sitesRef.current, promoteId: 'key' });
      map.addSource(LABEL_SOURCE_ID, { type: 'geojson', data: labelsRef.current, promoteId: 'key' });
      map.addSource(PATH_ROUTE_SOURCE_ID, { type: 'geojson', data: pathRoutesRef.current });
      map.addSource(PATH_ENTRANCE_SOURCE_ID, { type: 'geojson', data: pathEntrancesRef.current });
      map.addSource(PATH_INTERACTION_SOURCE_ID, { type: 'geojson', data: pathInteractionRef.current });
      map.addSource(PATH_LABEL_SOURCE_ID, { type: 'geojson', data: pathLabelRef.current });
      map.addSource(CITY_MARKER_SOURCE_ID, { type: 'geojson', data: cityMarkersRef.current });
      map.addSource(BASEMAP_MASK_SOURCE_ID, { type: 'geojson', data: basemapMasksRef.current });
      map.addSource(BASEMAP_MASK_LABEL_SOURCE_ID, { type: 'geojson', data: basemapMaskLabelsRef.current });

      map.addLayer({
        id: BASEMAP_MASK_FILL_LAYER_ID,
        type: 'fill',
        source: BASEMAP_MASK_SOURCE_ID,
        minzoom: 10,
        paint: { 'fill-color': '#160c0e', 'fill-opacity': 0.97 },
      });
      map.addLayer({
        id: BASEMAP_MASK_LINE_LAYER_ID,
        type: 'line',
        source: BASEMAP_MASK_SOURCE_ID,
        minzoom: 10,
        paint: { 'line-color': '#5a252b', 'line-width': 1.4, 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#c22933',
            ['>', ['coalesce', ['feature-state', 'overlayOpacity'], 0], 0],
            ['coalesce', ['feature-state', 'overlayColor'], '#c22933'],
            ['boolean', ['feature-state', 'hovered'], false], '#c22933',
            '#2a0b10',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.06,
            ['>', ['coalesce', ['feature-state', 'overlayOpacity'], 0], 0],
            ['coalesce', ['feature-state', 'overlayOpacity'], 0],
            ['boolean', ['feature-state', 'hovered'], false], 0.04,
            0,
          ],
        },
        layout: { visibility: mapVisibility(layerVisibilityRef.current.districts) },
      });
      map.addSource(BORDER_SOURCE_ID, {
        type: 'geojson',
        data: interiorDistrictBorders(districtsRef.current, selectedRef.current),
      });
      map.addSource(HOVER_BORDER_SOURCE_ID, {
        type: 'geojson',
        data: interiorDistrictBorders(districtsRef.current, null),
      });
      for (const layerId of DISTRICT_GLOW_LAYER_IDS) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: BORDER_SOURCE_ID,
          layout: {
            visibility: mapVisibility(layerVisibilityRef.current.districts),
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': DISTRICT_GLOW_COLOR,
            'line-width': 9,
            'line-blur': 6,
            'line-opacity': 1,
          },
        });
      }
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: BORDER_SOURCE_ID,
        layout: {
          visibility: mapVisibility(layerVisibilityRef.current.districts),
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': DISTRICT_GLOW_COLOR,
          'line-width': 2,
          'line-opacity': 1,
        },
      });
      map.addLayer({
        id: HOVER_BORDER_LAYER_ID,
        type: 'line',
        source: HOVER_BORDER_SOURCE_ID,
        layout: {
          visibility: mapVisibility(layerVisibilityRef.current.districts),
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#ff2a2a',
          'line-width': 1.35,
          'line-dasharray': [0.8, 1.4],
          'line-opacity': 0.95,
        },
      });
      map.addLayer({
        id: REGION_FILL_LAYER_ID,
        type: 'fill',
        source: REGION_SOURCE_ID,
        filter: regionFilter(regionVisibilityRef.current),
        layout: { visibility: mapVisibility(layerVisibilityRef.current.regions) },
        paint: {
          'fill-color': [
            'match', ['get', 'key'],
            'AnarchFreeZone', '#c22933',
            'TheRack', '#ff0def',
            'TheBarrens', '#2e1700',
            'UniversityOfToronto', '#06fbff',
            '#8e343b',
          ],
          // Pin 10: drop the heavy wash; keep a whisper of tint under the inner glow.
          'fill-opacity': 0.06,
        },
      });
      map.addLayer({
        id: REGION_GLOW_LAYER_ID,
        type: 'line',
        source: REGION_SOURCE_ID,
        filter: regionFilter(regionVisibilityRef.current),
        layout: { visibility: mapVisibility(layerVisibilityRef.current.regions) },
        paint: {
          'line-color': [
            'match', ['get', 'key'],
            'AnarchFreeZone', '#ff5a63',
            'TheRack', '#ff7ef5',
            'TheBarrens', '#a56a3a',
            'UniversityOfToronto', '#7ff6ff',
            '#d9878d',
          ],
          'line-width': 10,
          'line-blur': 7,
          'line-opacity': 0.45,
        },
      });
      map.addLayer({
        id: REGION_LINE_LAYER_ID,
        type: 'line',
        source: REGION_SOURCE_ID,
        filter: regionFilter(regionVisibilityRef.current),
        layout: { visibility: mapVisibility(layerVisibilityRef.current.regions) },
        paint: {
          'line-color': [
            'match', ['get', 'key'],
            'AnarchFreeZone', '#ff5a63',
            'TheRack', '#ff7ef5',
            'TheBarrens', '#a56a3a',
            'UniversityOfToronto', '#7ff6ff',
            '#d9878d',
          ],
          'line-width': 1.15,
          'line-dasharray': [2, 1.5],
          'line-opacity': 0.78,
        },
      });
      addSiteMarkerLayer(map, selectedRef.current, toggledSiteKeysRef.current);
      map.addLayer({
        id: PATH_ROUTE_LAYER_ID,
        type: 'line',
        source: PATH_ROUTE_SOURCE_ID,
        minzoom: 11.5,
        layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
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
        layout: { visibility: 'none' },
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
        id: PATH_INTERACTION_LAYER_ID,
        type: 'fill',
        source: PATH_INTERACTION_SOURCE_ID,
        minzoom: 11.5,
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.001 },
      });
      // Keep the unused path-label source registered; the visible legend is HTML.
      map.addLayer({
        id: PATH_LABEL_LAYER_ID,
        type: 'symbol',
        source: PATH_LABEL_SOURCE_ID,
        layout: { visibility: 'none' },
      });

      loadOrientationStreets(map, chronicleBounds, (markers) => {
        for (const marker of streetLabelMarkersRef.current) marker.remove();
        streetLabelMarkersRef.current = markers;
        addSiteMarkerLayer(map, selectedRef.current, toggledSiteKeysRef.current);
        syncSiteIcons(map, sitesRef.current);
        restackPulseAboveStreets(map);
      });

      for (const marker of districtHtmlMarkersRef.current) marker.remove();
      districtHtmlMarkersRef.current = mountDistrictHtmlMarkers(
        map,
        labelsRef.current,
        hoveredRef.current,
        selectedRef.current,
      );

      map.addLayer({
        id: REGION_LABEL_LAYER_ID,
        type: 'symbol',
        source: LABEL_SOURCE_ID,
        minzoom: 10.5,
        filter: ['all',
          ['==', ['get', 'kind'], 'region'],
          regionFilter(regionVisibilityRef.current),
        ] as FilterSpecification,
        layout: {
          visibility: mapVisibility(layerVisibilityRef.current.regions),
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10.5, 12, 14, 18],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.18,
          'text-max-width': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': [
            'match', ['get', 'key'],
            'AnarchFreeZone', '#ff5a63',
            'TheRack', '#ff7ef5',
            'TheBarrens', '#c48a55',
            'UniversityOfToronto', '#7ff6ff',
            '#f4d878',
          ],
          'text-halo-color': '#14080a',
          'text-halo-width': 2,
          'text-opacity': 0.88,
        },
      });
      map.addLayer({
        id: BASEMAP_MASK_LABEL_LAYER_ID,
        type: 'symbol',
        source: BASEMAP_MASK_LABEL_SOURCE_ID,
        minzoom: 11,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 14],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
        },
        paint: { 'text-color': '#c77a78', 'text-halo-color': '#14080a', 'text-halo-width': 2 },
      });
      map.addLayer({
        id: CITY_MARKER_CIRCLE_LAYER_ID,
        type: 'circle',
        source: CITY_MARKER_SOURCE_ID,
        maxzoom: 9.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 5.5, 5, 9, 8],
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
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 11, 5.5, 12, 9, 16],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.16,
          'text-anchor': ['coalesce', ['get', 'labelAnchor'], 'bottom'],
          'text-offset': ['get', 'labelOffset'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#f4ddd8',
          'text-halo-color': '#14080a',
          'text-halo-width': 2,
        },
      });
      syncBasemapImages(map, basemapMaskImagesRef.current);
      // Re-assert site symbols — a failed icon/font bind must not leave markers absent.
      try {
        addSiteMarkerLayer(map, selectedRef.current, toggledSiteKeysRef.current);
        if (map.getLayer(SITE_LAYER_ID)) map.moveLayer(SITE_LAYER_ID);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Could not mount site markers';
        console.error(message);
        setStatus(`Map error: ${message}`);
      }
      syncSiteIcons(map, sitesRef.current);
      syncPathVisibility(map, selectedRef.current);
      if (selectedRef.current) {
        if (selectedRef.current === 'PATH') focusPath(map, pathBounds);
        else {
          map.setFeatureState({ source: SOURCE_ID, id: selectedRef.current }, { selected: true });
          focusDistrict(map, districtsRef.current, selectedRef.current);
        }
      }
      if (!map.getLayer(SITE_LAYER_ID)) {
        console.error('Site marker layer missing after style load');
      }
      setStatus('Street map ready. Select a shaded district for details.');
      updateBoundaryShade();
      finalizeViewportLabels();
    };

    const clearDistrictHover = (key: string) => {
      map.setFeatureState({ source: SOURCE_ID, id: key }, { hovered: false });
      map.setFeatureState({ source: LABEL_SOURCE_ID, id: key }, { hovered: false });
    };
    const refreshDistrictHtmlLabelStates = () => {
      syncDistrictHtmlLabelStates(
        districtHtmlMarkersRef.current,
        hoveredRef.current,
        selectedRef.current,
      );
    };
    const onMouseMove = (event: MapMouseEvent) => {
      const siteHit = map.getLayer(SITE_LAYER_ID)
        ? map.queryRenderedFeatures(event.point, { layers: [SITE_LAYER_ID] })[0]
        : undefined;
      const siteKey = typeof siteHit?.properties?.key === 'string' ? siteHit.properties.key : null;
      if (siteKey) {
        if (hoveredRef.current && hoveredRef.current !== 'PATH') clearDistrictHover(hoveredRef.current);
        hoveredRef.current = null;
        syncHoverBorders(map, districtsRef.current, null);
        refreshDistrictHtmlLabelStates();
        setSiteTooltip({
          key: siteKey,
          hub: Boolean(siteHit?.properties?.hub),
          left: event.point.x,
          top: event.point.y,
        });
        map.getCanvas().style.cursor = 'pointer';
        return;
      }
      setSiteTooltip(null);
      const feature = map.queryRenderedFeatures(event.point, { layers: [PATH_INTERACTION_LAYER_ID, FILL_LAYER_ID] })[0];
      const key = districtKey(feature);
      if (key === hoveredRef.current) return;
      if (hoveredRef.current && hoveredRef.current !== 'PATH') clearDistrictHover(hoveredRef.current);
      hoveredRef.current = key;
      if (key && key !== 'PATH') {
        map.setFeatureState({ source: SOURCE_ID, id: key }, { hovered: true });
        map.setFeatureState({ source: LABEL_SOURCE_ID, id: key }, { hovered: true });
        syncHoverBorders(map, districtsRef.current, key);
      } else {
        syncHoverBorders(map, districtsRef.current, null);
      }
      refreshDistrictHtmlLabelStates();
      map.getCanvas().style.cursor = key ? 'pointer' : '';
    };
    const onClick = (event: MapMouseEvent) => {
      const siteHit = map.getLayer(SITE_LAYER_ID)
        ? map.queryRenderedFeatures(event.point, { layers: [SITE_LAYER_ID] })[0]
        : undefined;
      const siteKey = typeof siteHit?.properties?.key === 'string' ? siteHit.properties.key : null;
      if (siteKey) {
        setSiteTooltip(null);
        onSiteSelectRef.current?.(siteKey);
        return;
      }
      const key = districtKey(map.queryRenderedFeatures(event.point, { layers: [PATH_INTERACTION_LAYER_ID, FILL_LAYER_ID] })[0]);
      if (key) onSelectRef.current(key);
    };
    const onError = (event: MapLibreErrorEvent) => {
      if (event.error) setStatus(`Map error: ${event.error.message}`);
    };

    // `load` waits for basemap tiles. `style.load` is enough to add districts, so a stalled tile cannot leave the status on "Loading street map…".
    map.on('style.load', onLoad);
    map.on('load', onLoad);
    if (map.isStyleLoaded()) onLoad();
    const onMouseLeave = () => {
      setSiteTooltip(null);
      if (hoveredRef.current && hoveredRef.current !== 'PATH') clearDistrictHover(hoveredRef.current);
      hoveredRef.current = null;
      syncHoverBorders(map, districtsRef.current, null);
      refreshDistrictHtmlLabelStates();
      map.getCanvas().style.cursor = '';
    };
    map.on('mousemove', onMouseMove);
    map.on('mouseout', onMouseLeave);
    map.on('click', onClick);
    map.on('error', onError);
    map.on('move', updateBoundaryShade);
    map.on('move', queueViewportLabels);
    map.on('moveend', finalizeViewportLabels);
    map.on('zoom', updateBoundaryShade);
    map.on('resize', updateBoundaryShade);
    return () => {
      if (boundaryFrame !== null) window.cancelAnimationFrame(boundaryFrame);
      if (labelTimer !== null) window.clearTimeout(labelTimer);
      for (const marker of streetLabelMarkersRef.current) marker.remove();
      streetLabelMarkersRef.current = [];
      for (const marker of districtHtmlMarkersRef.current) marker.remove();
      districtHtmlMarkersRef.current = [];
      jokeMarker.remove();
      onMapReadyRef.current?.(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(districts);
    syncDistrictBorders(map, districts, selectedRef.current);
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
    syncSiteIcons(map, sites);
  }, [sites]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(SITE_LAYER_ID)) return;
    map.setFilter(SITE_LAYER_ID, siteFilter(selectedKey, toggledSiteKeys));
  }, [selectedKey, toggledSiteKeys]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    updateViewportLabels(map, districtsRef.current, labels);
    for (const marker of districtHtmlMarkersRef.current) marker.remove();
    districtHtmlMarkersRef.current = mountDistrictHtmlMarkers(
      map,
      labels,
      hoveredRef.current,
      selectedRef.current,
    );
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
    (map.getSource(BASEMAP_MASK_SOURCE_ID) as GeoJSONSource | undefined)?.setData(basemapMasks);
    (map.getSource(BASEMAP_MASK_LABEL_SOURCE_ID) as GeoJSONSource | undefined)?.setData(basemapMaskLabels);
  }, [basemapMaskLabels, basemapMasks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncBasemapImages(map, basemapMaskImages);
  }, [basemapMaskImages]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    return applyWhenStyleReady(map, FILL_LAYER_ID, () => {
      for (const layer of [FILL_LAYER_ID, ...DISTRICT_GLOW_LAYER_IDS, LINE_LAYER_ID, HOVER_BORDER_LAYER_ID]) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.districts));
      }
      for (const layer of [REGION_FILL_LAYER_ID, REGION_GLOW_LAYER_ID, REGION_LINE_LAYER_ID, REGION_LABEL_LAYER_ID]) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.regions));
      }
      syncDistrictHtmlLabelVisibility(
        districtHtmlMarkersRef.current,
        map.getZoom(),
        layerVisibility.districts,
      );
      syncPathVisibility(map, selectedRef.current);
      if (!layerVisibility.districts && hoveredRef.current) {
        if (hoveredRef.current !== 'PATH') {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hovered: false });
          map.setFeatureState({ source: LABEL_SOURCE_ID, id: hoveredRef.current }, { hovered: false });
        }
        hoveredRef.current = null;
        syncHoverBorders(map, districtsRef.current, null);
        syncDistrictHtmlLabelStates(districtHtmlMarkersRef.current, null, selectedRef.current);
        map.getCanvas().style.cursor = '';
      }
    });
  }, [layerVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    return applyWhenStyleReady(map, REGION_FILL_LAYER_ID, () => {
      const filter = regionFilter(regionVisibility);
      map.setFilter(REGION_FILL_LAYER_ID, filter);
      if (map.getLayer(REGION_GLOW_LAYER_ID)) map.setFilter(REGION_GLOW_LAYER_ID, filter);
      map.setFilter(REGION_LINE_LAYER_ID, filter);
      map.setFilter(REGION_LABEL_LAYER_ID, ['all', ['==', ['get', 'kind'], 'region'], filter] as FilterSpecification);
    });
  }, [regionVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(SOURCE_ID)) return;
    for (const feature of districts.features) {
      const paint = overlayPaintForDistrict(feature.properties, overlay);
      map.setFeatureState({ source: SOURCE_ID, id: feature.properties.key }, {
        overlayOpacity: paint.opacity,
        overlayColor: paint.color,
      });
      map.setFeatureState({ source: LABEL_SOURCE_ID, id: feature.properties.key }, {
        aspectAdvantage: paint.aspect,
      });
    }
  }, [districts, overlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const homesteadPulseKey = overlay.kind === 'homestead'
      ? districts.features.find((feature) => feature.properties[overlay.trait] === 6)?.properties.key ?? null
      : null;
    const pulseKey = (selectedKey && selectedKey !== 'PATH')
      ? selectedKey
      : homesteadPulseKey;
    const pulseYellow = Boolean(pulseKey && pulseKey === homesteadPulseKey && selectedKey !== pulseKey);
    const active = layerVisibility.districts && pulseKey !== null;
    if (!active) {
      pulseOriginRef.current = null;
      return undefined;
    }
    if (pulseKey === homesteadPulseKey && selectedKey !== pulseKey) {
      syncDistrictBorders(map, districts, pulseKey);
    }
    let frame = 0;
    let stopped = false;
    const tick = (now: number) => {
      if (stopped || !map.getLayer(LINE_LAYER_ID)) return;
      if (pulseOriginRef.current === null) pulseOriginRef.current = now;
      const paint = districtPulseFrame(districtPulseAmount(now - pulseOriginRef.current));
      map.setPaintProperty(FILL_LAYER_ID, 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'selected'], false], paint.fillOpacity,
        ['>', ['coalesce', ['feature-state', 'overlayOpacity'], 0], 0],
        ['coalesce', ['feature-state', 'overlayOpacity'], 0],
        ['boolean', ['feature-state', 'hovered'], false], 0.04,
        0,
      ]);
      map.setPaintProperty(LINE_LAYER_ID, 'line-width', paint.lineWidth);
      map.setPaintProperty(LINE_LAYER_ID, 'line-color', pulseYellow ? '#FFDD00' : paint.strokeColor);
      for (const layerId of DISTRICT_GLOW_LAYER_IDS) {
        map.setPaintProperty(layerId, 'line-blur', paint.glowBlur);
        map.setPaintProperty(layerId, 'line-width', paint.glowWidth);
        map.setPaintProperty(layerId, 'line-color', pulseYellow ? '#FFDD00' : DISTRICT_GLOW_COLOR);
      }
      frame = window.requestAnimationFrame(tick);
    };
    const stopReady = applyWhenStyleReady(map, LINE_LAYER_ID, () => {
      frame = window.requestAnimationFrame(tick);
    });
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stopReady();
    };
  }, [districts, layerVisibility.districts, overlay, selectedKey]);

  useEffect(() => {
    const map = mapRef.current;
    const previousKey = selectedRef.current;
    selectedRef.current = selectedKey;
    if (!map?.getSource(BORDER_SOURCE_ID)) return;
    if (previousKey && previousKey !== 'PATH') map.setFeatureState({ source: SOURCE_ID, id: previousKey }, { selected: false });
    const homesteadPulseKey = overlay.kind === 'homestead'
      ? districtsRef.current.features.find((feature) => feature.properties[overlay.trait] === 6)?.properties.key ?? null
      : null;
    // Homestead trait-6 pulse must survive clearing selection (pin 29).
    const borderKey = (selectedKey && selectedKey !== 'PATH')
      ? selectedKey
      : homesteadPulseKey;
    syncDistrictBorders(map, districtsRef.current, borderKey);
    syncPathVisibility(map, selectedKey);
    syncDistrictHtmlLabelStates(districtHtmlMarkersRef.current, hoveredRef.current, selectedKey);
    map.setPaintProperty(PATH_ROUTE_LAYER_ID, 'line-width', selectedKey === 'PATH'
      ? ['interpolate', ['linear'], ['zoom'], 11.5, 2.4, 16, 5]
      : ['interpolate', ['linear'], ['zoom'], 11.5, 1.2, 16, 3.2]);
    if (!selectedKey) return;
    if (selectedKey === 'PATH') {
      focusPath(map, pathBounds);
      return;
    }
    map.setFeatureState({ source: SOURCE_ID, id: selectedKey }, { selected: true });
    if (skipNextDistrictFocusRef?.current) {
      skipNextDistrictFocusRef.current = false;
      return;
    }
    focusDistrict(map, districtsRef.current, selectedKey);
  }, [overlay, pathBounds, selectedKey, skipNextDistrictFocusRef]);

  return (
    <section className="map-surface" data-note-surface="map" aria-label="Interactive map of Toronto Rising districts">
      <div ref={containerRef} className="map-surface__canvas" />
      <div
        ref={boundaryShadeRef}
        className={`chronicle-boundary-shade${distantView ? ' chronicle-boundary-shade--distant' : ''}`}
        aria-hidden="true"
      >
        <div className="chronicle-boundary-shade__veil" />
      </div>
      {selectedKey === 'PATH' ? (
        <div className="map-surface__path-legend" aria-hidden="true" data-gsap="path-legend">
          <span className="map-surface__path-legend-line" />
          <span className="map-surface__path-legend-label">P.A.T.H.</span>
        </div>
      ) : null}
      {siteTooltip ? (
        <div
          className="site-card-tooltip"
          style={{
            left: siteTooltip.left,
            top: siteTooltip.top,
          } as CSSProperties}
          aria-hidden="true"
        >
          <img
            src={siteTooltip.hub ? siteHubCardUrl(siteTooltip.key) : siteCardUrl(siteTooltip.key)}
            alt=""
          />
        </div>
      ) : null}
      <p className="map-surface__status" role="status">{status}</p>
    </section>
  );
}
