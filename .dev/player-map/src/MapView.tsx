import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  Map,
  NavigationControl,
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
const DISTRICT_GLOW_LAYER_IDS = ['district-selected-glow', 'district-selected-glow-b'] as const;
const LINE_LAYER_ID = 'district-lines';
const BASEMAP_IMAGE_PREFIX = 'basemap-mask-image-';
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
const PRIMARY_STREET_CASING_LAYER_ID = 'primary-street-casing';
const PRIMARY_STREET_LINE_LAYER_ID = 'primary-street-lines';
const PRIMARY_STREET_LABEL_LAYER_ID = 'primary-street-labels';
const ORIENTATION_STREET_CASING_LAYER_ID = 'orientation-street-casing';
const ORIENTATION_STREET_LINE_LAYER_ID = 'orientation-street-lines';
const ORIENTATION_STREET_LABEL_LAYER_ID = 'orientation-street-labels';
const ORIENTATION_STREET_SOURCE_ID = 'orientation-streets';
const ORIENTATION_STREET_LABEL_SOURCE_ID = 'orientation-street-labels';
const FORCED_STREET_NAMES = ORIENTATION_STREETS.flatMap((street) => street.matchNames);
const BASEMAP_MASK_FILL_LAYER_ID = 'basemap-mask-fills';
const BASEMAP_MASK_LINE_LAYER_ID = 'basemap-mask-lines';
const BASEMAP_MASK_LABEL_LAYER_ID = 'basemap-mask-labels';
const PLAY_BOUNDS: [[number, number], [number, number]] = [[-130, 10], [70, 62]];
const INITIAL_BOUNDS: [[number, number], [number, number]] = [[-79.44, 43.63], [-79.34, 43.70]];
const CITY_SHADE_MIN_ZOOM = 10;
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
}

interface StreetBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

const CLIP_INSIDE = 0;
const CLIP_LEFT = 1;
const CLIP_RIGHT = 2;
const CLIP_BOTTOM = 4;
const CLIP_TOP = 8;

function clipCode(x: number, y: number, box: StreetBox) {
  let code = CLIP_INSIDE;
  if (x < box.west) code |= CLIP_LEFT;
  else if (x > box.east) code |= CLIP_RIGHT;
  if (y < box.south) code |= CLIP_BOTTOM;
  else if (y > box.north) code |= CLIP_TOP;
  return code;
}

function clipSegment(start: number[], end: number[], box: StreetBox): [number[], number[]] | null {
  let x0 = start[0] ?? 0;
  let y0 = start[1] ?? 0;
  let x1 = end[0] ?? 0;
  let y1 = end[1] ?? 0;
  let code0 = clipCode(x0, y0, box);
  let code1 = clipCode(x1, y1, box);
  for (let guard = 0; guard < 12; guard += 1) {
    if ((code0 | code1) === 0) return [[x0, y0], [x1, y1]];
    if ((code0 & code1) !== 0) return null;
    const code = code0 !== 0 ? code0 : code1;
    let x = 0;
    let y = 0;
    if ((code & CLIP_TOP) !== 0) {
      x = x0 + (x1 - x0) * (box.north - y0) / (y1 - y0);
      y = box.north;
    } else if ((code & CLIP_BOTTOM) !== 0) {
      x = x0 + (x1 - x0) * (box.south - y0) / (y1 - y0);
      y = box.south;
    } else if ((code & CLIP_RIGHT) !== 0) {
      y = y0 + (y1 - y0) * (box.east - x0) / (x1 - x0);
      x = box.east;
    } else {
      y = y0 + (y1 - y0) * (box.west - x0) / (x1 - x0);
      x = box.west;
    }
    if (code === code0) {
      x0 = x;
      y0 = y;
      code0 = clipCode(x0, y0, box);
    } else {
      x1 = x;
      y1 = y;
      code1 = clipCode(x1, y1, box);
    }
  }
  return null;
}

function clipPolyline(coordinates: number[][], box: StreetBox) {
  const parts: number[][][] = [];
  let current: number[][] = [];
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    if (!start || !end) continue;
    const clipped = clipSegment(start, end, box);
    if (!clipped) {
      if (current.length > 1) parts.push(current);
      current = [];
      continue;
    }
    const [from, to] = clipped;
    if (!from || !to) continue;
    const last = current[current.length - 1];
    const lastX = last?.[0];
    const lastY = last?.[1];
    const fromX = from[0];
    const fromY = from[1];
    if (lastX === undefined || lastY === undefined || fromX === undefined || fromY === undefined
      || Math.hypot(lastX - fromX, lastY - fromY) > 1e-7) {
      if (current.length > 1) parts.push(current);
      current = [from, to];
    } else current.push(to);
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

function lineLength(coordinates: number[][]) {
  let length = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    if (!start || !end || start[0] === undefined || start[1] === undefined || end[0] === undefined || end[1] === undefined) continue;
    length += Math.hypot((end[0] - start[0]) * 82, (end[1] - start[1]) * 111);
  }
  return length;
}

function stitchLongest(parts: number[][][]) {
  const unused = parts.map((part) => part.map((point) => [...point]));
  const near = (a: number[], b: number[]) => Math.hypot(((a[0] ?? 0) - (b[0] ?? 0)) * 82, ((a[1] ?? 0) - (b[1] ?? 0)) * 111) < 0.04;
  const chains: number[][][] = [];
  while (unused.length > 0) {
    const chain = unused.pop();
    if (!chain) break;
    let grew = true;
    while (grew) {
      grew = false;
      for (let index = 0; index < unused.length; index += 1) {
        const part = unused[index];
        const head = chain[0];
        const tail = chain[chain.length - 1];
        const start = part?.[0];
        const end = part?.[part.length - 1];
        if (!part || !head || !tail || !start || !end) continue;
        if (near(tail, start)) chain.push(...part.slice(1));
        else if (near(tail, end)) chain.push(...part.slice().reverse().slice(1));
        else if (near(head, end)) chain.unshift(...part.slice(0, -1));
        else if (near(head, start)) chain.unshift(...part.slice().reverse().slice(1));
        else continue;
        unused.splice(index, 1);
        grew = true;
        break;
      }
    }
    chains.push(chain);
  }
  chains.sort((left, right) => lineLength(right) - lineLength(left));
  return chains[0] ?? [];
}

function streetLabelCollection(
  collection: GeoJSON.FeatureCollection,
  bounds: [[number, number], [number, number]],
): GeoJSON.FeatureCollection {
  const inset = 0.0016;
  const box: StreetBox = {
    west: bounds[0][0] + inset,
    south: bounds[0][1] + inset,
    east: bounds[1][0] - inset,
    north: bounds[1][1] - inset,
  };
  const grouped = new globalThis.Map<string, { category: string; displayName: string; parts: number[][][] }>();
  for (const feature of collection.features) {
    if (feature.geometry.type !== 'LineString') continue;
    const clipped = clipPolyline(feature.geometry.coordinates as number[][], box);
    if (clipped.length === 0) continue;
    const category = String(feature.properties?.category ?? '');
    const displayName = String(feature.properties?.displayName ?? '');
    const key = `${category}\0${displayName}`;
    const group = grouped.get(key) ?? { category, displayName, parts: [] };
    group.parts.push(...clipped);
    grouped.set(key, group);
  }
  return {
    type: 'FeatureCollection',
    features: [...grouped.values()].flatMap((group) => {
      const coordinates = stitchLongest(group.parts);
      if (coordinates.length < 2) return [];
      return [{
        type: 'Feature' as const,
        properties: { category: group.category, displayName: group.displayName },
        geometry: { type: 'LineString' as const, coordinates },
      }];
    }),
  };
}

function addStreetLayers(
  map: Map,
  category: OrientationStreetCategory,
  ids: { casing: string; line: string; label: string },
  style: {
    minzoom: number;
    casingWidth: ExpressionSpecification;
    lineWidth: ExpressionSpecification;
    lineColor: string;
    lineOpacity: number;
    textSize: ExpressionSpecification;
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
  map.addLayer({
    id: ids.label,
    type: 'symbol',
    source: ORIENTATION_STREET_LABEL_SOURCE_ID,
    minzoom: style.minzoom,
    filter,
    layout: {
      visibility: 'visible',
      'symbol-placement': 'line',
      'symbol-spacing': 200,
      'text-field': ['get', 'displayName'],
      'text-font': ['Noto Sans Bold'],
      'text-size': style.textSize,
      'text-letter-spacing': 0.08,
      'text-max-angle': 28,
      'text-padding': 1,
      'text-optional': false,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#14080a',
      'text-halo-width': 2.5,
      'text-opacity': style.lineOpacity,
    },
  });
}

function loadOrientationStreets(map: Map, bounds: [[number, number], [number, number]]) {
  void fetch('/generated/orientation-streets.geojson')
    .then((response) => {
      if (!response.ok) throw new Error('Could not load the orientation streets');
      return response.json() as Promise<GeoJSON.FeatureCollection>;
    })
    .then((data) => {
      if (!map.getLayer(FILL_LAYER_ID) || map.getSource(ORIENTATION_STREET_SOURCE_ID)) return;
      map.addSource(ORIENTATION_STREET_SOURCE_ID, { type: 'geojson', data });
      map.addSource(ORIENTATION_STREET_LABEL_SOURCE_ID, { type: 'geojson', data: streetLabelCollection(data, bounds) });
      addStreetLayers(map, 'primary', {
        casing: PRIMARY_STREET_CASING_LAYER_ID,
        line: PRIMARY_STREET_LINE_LAYER_ID,
        label: PRIMARY_STREET_LABEL_LAYER_ID,
      }, {
        minzoom: 9,
        casingWidth: ['interpolate', ['linear'], ['zoom'], 10.2, 4.2, 15, 8],
        lineWidth: ['interpolate', ['linear'], ['zoom'], 10.2, 1.6, 15, 3.8],
        lineColor: '#f5efeb',
        lineOpacity: 0.96,
        textSize: ['interpolate', ['linear'], ['zoom'], 10.2, 11, 15, 16],
      });
      addStreetLayers(map, 'orientation', {
        casing: ORIENTATION_STREET_CASING_LAYER_ID,
        line: ORIENTATION_STREET_LINE_LAYER_ID,
        label: ORIENTATION_STREET_LABEL_LAYER_ID,
      }, {
        minzoom: 10,
        casingWidth: ['interpolate', ['linear'], ['zoom'], 11.1, 3.2, 15, 6],
        lineWidth: ['interpolate', ['linear'], ['zoom'], 11.1, 1.05, 15, 2.6],
        lineColor: '#d8d0cb',
        lineOpacity: 0.78,
        textSize: ['interpolate', ['linear'], ['zoom'], 11.1, 10, 15, 14],
      });
      if (map.getLayer(LABEL_LAYER_ID)) map.moveLayer(LABEL_LAYER_ID);
      if (map.getLayer(SITE_LAYER_ID)) map.moveLayer(SITE_LAYER_ID);
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
    }).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : `Could not load site icon ${icon}`);
    });
  }
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
  const basemapMasksRef = useRef(basemapMasks);
  const basemapMaskLabelsRef = useRef(basemapMaskLabels);
  const basemapMaskImagesRef = useRef(basemapMaskImages);
  const layerVisibilityRef = useRef(layerVisibility);
  const regionVisibilityRef = useRef(regionVisibility);
  const onSelectRef = useRef(onSelect);
  const onMapReadyRef = useRef(onMapReady);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const toggledSiteKeysRef = useRef(toggledSiteKeys);
  const pulseOriginRef = useRef<number | null>(null);
  const [status, setStatus] = useState('Loading street map…');
  const [distantView, setDistantView] = useState(false);
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
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    let boundaryFrame: number | null = null;
    let labelTimer: number | null = null;
    const updateBoundaryShade = () => {
      if (boundaryFrame !== null) return;
      boundaryFrame = window.requestAnimationFrame(() => {
        boundaryFrame = null;
        if (boundaryShadeRef.current) positionBoundaryShade(map, chronicleBounds, boundaryShadeRef.current);
        setDistantView(map.getZoom() < CITY_SHADE_MIN_ZOOM);
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
            ['boolean', ['feature-state', 'hovered'], false], '#7e2029',
            '#2a0b10',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.06,
            ['boolean', ['feature-state', 'hovered'], false], 0.34,
            0,
          ],
        },
        layout: { visibility: mapVisibility(layerVisibilityRef.current.districts) },
      });
      map.addSource(BORDER_SOURCE_ID, {
        type: 'geojson',
        data: interiorDistrictBorders(districtsRef.current, selectedRef.current),
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
          'fill-opacity': 0.22,
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
          'line-width': 2.2,
          'line-dasharray': [2, 1.5],
          'line-opacity': 0.92,
        },
      });
      map.addLayer({
        id: SITE_LAYER_ID,
        type: 'symbol',
        source: SITE_SOURCE_ID,
        filter: siteFilter(selectedRef.current, toggledSiteKeysRef.current),
        layout: {
          'icon-image': ['concat', 'site-icon-', ['get', 'icon']],
          'icon-anchor': 'bottom',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 12, 0.62, 16, 0.95],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-anchor': 'bottom',
          'text-offset': ['interpolate', ['linear'], ['zoom'], 8, ['literal', [0, -2.6]], 12, ['literal', [0, -3.3]], 16, ['literal', [0, -4.6]]],
          'text-max-width': 12,
          'text-justify': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#f7f4ef',
          'text-halo-color': '#000000',
          'text-halo-width': 1.35,
          'text-halo-blur': 0,
        },
      });
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

      loadOrientationStreets(map, chronicleBounds);

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
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-optional': false,
        },
        paint: {
          'text-color': '#f0d9d5',
          'text-halo-color': '#000000',
          'text-halo-width': 1.4,
          'text-halo-blur': 0,
        },
      });
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
          'text-offset': [0, 1.35],
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
      map.moveLayer(SITE_LAYER_ID);
      syncSiteIcons(map, sitesRef.current);
      syncPathVisibility(map, selectedRef.current);
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

    // `load` waits for basemap tiles. `style.load` is enough to add districts, so a stalled tile cannot leave the status on "Loading street map…".
    map.on('style.load', onLoad);
    map.on('load', onLoad);
    if (map.isStyleLoaded()) onLoad();
    map.on('mousemove', onMouseMove);
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
      for (const layer of [FILL_LAYER_ID, ...DISTRICT_GLOW_LAYER_IDS, LINE_LAYER_ID, LABEL_LAYER_ID]) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.districts));
      }
      for (const layer of [REGION_FILL_LAYER_ID, REGION_LINE_LAYER_ID, REGION_LABEL_LAYER_ID]) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', mapVisibility(layerVisibility.regions));
      }
      syncPathVisibility(map, selectedRef.current);
      if (!layerVisibility.districts && hoveredRef.current) {
        if (hoveredRef.current !== 'PATH') {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hovered: false });
        }
        hoveredRef.current = null;
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
      map.setFilter(REGION_LINE_LAYER_ID, filter);
      map.setFilter(REGION_LABEL_LAYER_ID, ['all', ['==', ['get', 'kind'], 'region'], filter] as FilterSpecification);
    });
  }, [regionVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const active = layerVisibility.districts && selectedKey !== null && selectedKey !== 'PATH';
    if (!active) {
      pulseOriginRef.current = null;
      return undefined;
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
        ['boolean', ['feature-state', 'hovered'], false], 0.34,
        0,
      ]);
      map.setPaintProperty(LINE_LAYER_ID, 'line-width', paint.lineWidth);
      map.setPaintProperty(LINE_LAYER_ID, 'line-color', paint.strokeColor);
      for (const layerId of DISTRICT_GLOW_LAYER_IDS) {
        map.setPaintProperty(layerId, 'line-blur', paint.glowBlur);
        map.setPaintProperty(layerId, 'line-width', paint.glowWidth);
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
  }, [layerVisibility.districts, selectedKey]);

  useEffect(() => {
    const map = mapRef.current;
    const previousKey = selectedRef.current;
    selectedRef.current = selectedKey;
    if (!map?.getSource(BORDER_SOURCE_ID)) return;
    if (previousKey && previousKey !== 'PATH') map.setFeatureState({ source: SOURCE_ID, id: previousKey }, { selected: false });
    syncDistrictBorders(map, districtsRef.current, selectedKey);
    syncPathVisibility(map, selectedKey);
    map.setPaintProperty(PATH_ROUTE_LAYER_ID, 'line-width', selectedKey === 'PATH'
      ? ['interpolate', ['linear'], ['zoom'], 11.5, 2.4, 16, 5]
      : ['interpolate', ['linear'], ['zoom'], 11.5, 1.2, 16, 3.2]);
    if (!selectedKey) return;
    if (selectedKey === 'PATH') focusPath(map, pathBounds);
    else {
      map.setFeatureState({ source: SOURCE_ID, id: selectedKey }, { selected: true });
      focusDistrict(map, districtsRef.current, selectedKey);
    }
  }, [pathBounds, selectedKey]);

  return (
    <section className="map-surface" data-note-surface="map" aria-label="Interactive map of Toronto Rising districts">
      <div ref={containerRef} className="map-surface__canvas" />
      <div
        ref={boundaryShadeRef}
        className={`chronicle-boundary-shade${distantView ? ' chronicle-boundary-shade--distant' : ''}`}
        aria-hidden="true"
      >
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--north" />
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--south" />
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--west" />
        <div className="chronicle-boundary-shade__panel chronicle-boundary-shade__panel--east" />
      </div>
      {selectedKey === 'PATH' ? (
        <div className="map-surface__path-legend" aria-hidden="true" data-gsap="path-legend">
          <span className="map-surface__path-legend-line" />
          <span className="map-surface__path-legend-label">P.A.T.H.</span>
        </div>
      ) : null}
      <p className="map-surface__status" role="status">{status}</p>
    </section>
  );
}
