import type { Position } from 'geojson';
import type {
  DistrictFeatureCollection,
  MapLabelCollection,
  MapLayerId,
  MapLayerVisibility,
  MapDataManifest,
  PublicMapData,
  PublicSiteCollection,
  RegionFeatureCollection,
} from './types';

const GENERATED_ROOT = '/generated';
const DISTRICT_PROPERTY_KEYS = [
  'fillRule', 'huntingDifficulty', 'key', 'kind', 'name', 'resonanceMinus',
  'resonancePlus', 'sourceElement', 'sourceRingCount',
].sort();
const REGION_PROPERTY_KEYS = ['fillRule', 'key', 'kind', 'name', 'sourceElement', 'sourceRingCount'].sort();
const SITE_PROPERTY_KEYS = ['districtKey', 'key', 'name'].sort();
const LABEL_PROPERTY_KEYS = ['key', 'kind', 'name'].sort();
const MAP_LAYER_IDS: MapLayerId[] = ['districts', 'regions', 'sites'];
export const DEFAULT_LAYER_VISIBILITY: MapLayerVisibility = {
  districts: true,
  regions: false,
  sites: false,
};

async function loadJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json() as Promise<unknown>;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    throw new Error(`${label} contains an unexpected or missing public field`);
  }
}

function nonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
}

function finitePosition(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function validateMultiPolygon(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0
    || !value.every((polygon) => Array.isArray(polygon) && polygon.length > 0
      && polygon.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(finitePosition)))) {
    throw new Error(`${label} has invalid MultiPolygon coordinates`);
  }
}

function parseDistricts(value: unknown): DistrictFeatureCollection {
  const collection = record(value, 'District collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid district FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'District feature');
    const properties = record(feature.properties, 'District properties');
    const geometry = record(feature.geometry, 'District geometry');
    exactKeys(properties, DISTRICT_PROPERTY_KEYS, `${String(properties.key)} district`);
    if (feature.type !== 'Feature' || geometry.type !== 'MultiPolygon' || properties.kind !== 'district') throw new Error('Invalid district feature');
    for (const key of ['key', 'name', 'sourceElement', 'fillRule', 'resonancePlus', 'resonanceMinus']) nonEmptyString(properties[key], `District ${key}`);
    if (properties.huntingDifficulty !== null && (!Number.isInteger(properties.huntingDifficulty) || Number(properties.huntingDifficulty) < 1)) {
      throw new Error(`${String(properties.key)} has invalid hunting difficulty`);
    }
    if (!Number.isInteger(properties.sourceRingCount) || Number(properties.sourceRingCount) < 1) throw new Error(`${String(properties.key)} has invalid ring count`);
    validateMultiPolygon(geometry.coordinates, String(properties.key));
  }
  return value as DistrictFeatureCollection;
}

function parseRegions(value: unknown): RegionFeatureCollection {
  const collection = record(value, 'Region collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid region FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'Region feature');
    const properties = record(feature.properties, 'Region properties');
    const geometry = record(feature.geometry, 'Region geometry');
    exactKeys(properties, REGION_PROPERTY_KEYS, `${String(properties.key)} region`);
    if (feature.type !== 'Feature' || geometry.type !== 'MultiPolygon' || properties.kind !== 'region') throw new Error('Invalid region feature');
    validateMultiPolygon(geometry.coordinates, String(properties.key));
  }
  return value as RegionFeatureCollection;
}

function parseSites(value: unknown): PublicSiteCollection {
  const collection = record(value, 'Site collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid site FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'Site feature');
    const properties = record(feature.properties, 'Site properties');
    const geometry = record(feature.geometry, 'Site geometry');
    exactKeys(properties, SITE_PROPERTY_KEYS, `${String(properties.key)} site`);
    if (feature.type !== 'Feature' || geometry.type !== 'Point' || !finitePosition(geometry.coordinates)) throw new Error('Invalid site feature');
  }
  return value as PublicSiteCollection;
}

function parseLabels(value: unknown): MapLabelCollection {
  const collection = record(value, 'Label collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid label FeatureCollection');
  const keys = new Set<string>();
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'Label feature');
    const properties = record(feature.properties, 'Label properties');
    const geometry = record(feature.geometry, 'Label geometry');
    exactKeys(properties, LABEL_PROPERTY_KEYS, `${String(properties.key)} label`);
    nonEmptyString(properties.key, 'Label key');
    nonEmptyString(properties.name, 'Label name');
    if (feature.type !== 'Feature' || geometry.type !== 'Point' || !finitePosition(geometry.coordinates)
      || !['district', 'region'].includes(String(properties.kind)) || keys.has(properties.key)) {
      throw new Error('Invalid or duplicate label feature');
    }
    keys.add(properties.key);
  }
  return value as MapLabelCollection;
}

function parseManifest(value: unknown): MapDataManifest {
  const manifest = record(value, 'Map manifest');
  const counts = record(manifest.counts, 'Manifest counts');
  const sheet = record(manifest.sheet, 'Manifest Sheet provenance');
  if (manifest.schemaVersion !== 4
    || !['districts', 'regions', 'sites', 'labels', 'sheetDistricts', 'sheetSites', 'sheetOnlyDistricts'].every((key) => Number.isInteger(counts[key]))
    || !Array.isArray(sheet.publicDistrictFields)
    || !Array.isArray(sheet.publicSiteFields)
    || !Array.isArray(sheet.sheetOnlyDistricts)) {
    throw new Error('Unsupported or invalid map-data manifest');
  }
  return value as unknown as MapDataManifest;
}

export async function loadPublicMapData(): Promise<PublicMapData> {
  const [districtValue, regionValue, siteValue, labelValue, manifestValue] = await Promise.all([
    loadJson(`${GENERATED_ROOT}/districts.geojson`),
    loadJson(`${GENERATED_ROOT}/regions.geojson`),
    loadJson(`${GENERATED_ROOT}/sites.geojson`),
    loadJson(`${GENERATED_ROOT}/labels.geojson`),
    loadJson(`${GENERATED_ROOT}/map-data-manifest.json`),
  ]);
  const districts = parseDistricts(districtValue);
  const regions = parseRegions(regionValue);
  const sites = parseSites(siteValue);
  const labels = parseLabels(labelValue);
  const manifest = parseManifest(manifestValue);
  if (districts.features.length !== manifest.counts.districts) throw new Error('District manifest count does not match the map data');
  if (regions.features.length !== manifest.counts.regions) throw new Error('Region manifest count does not match the map data');
  if (sites.features.length !== manifest.counts.sites) throw new Error('Site manifest count does not match the map data');
  if (labels.features.length !== manifest.counts.labels) throw new Error('Label manifest count does not match the map data');
  return { districts, regions, sites, labels, manifest };
}

export function featureBounds(coordinates: Position[][][]): [[number, number], [number, number]] {
  const bounds: [[number, number], [number, number]] = [[Infinity, Infinity], [-Infinity, -Infinity]];
  for (const position of coordinates.flat(2)) {
    const longitude = position[0];
    const latitude = position[1];
    if (typeof longitude !== 'number' || typeof latitude !== 'number') continue;
    bounds[0][0] = Math.min(bounds[0][0], longitude);
    bounds[0][1] = Math.min(bounds[0][1], latitude);
    bounds[1][0] = Math.max(bounds[1][0], longitude);
    bounds[1][1] = Math.max(bounds[1][1], latitude);
  }
  return bounds;
}

export function selectedDistrictFromUrl(search: string): string | null {
  return new URLSearchParams(search).get('district');
}

export function updateDistrictInUrl(key: string | null): string {
  const url = new URL(window.location.href);
  if (key) url.searchParams.set('district', key);
  else url.searchParams.delete('district');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function layerVisibilityFromUrl(search: string): MapLayerVisibility {
  const rawLayers = new URLSearchParams(search).get('layers');
  if (rawLayers === null) return { ...DEFAULT_LAYER_VISIBILITY };
  const visible = new Set(rawLayers.split(',').filter((value): value is MapLayerId => MAP_LAYER_IDS.includes(value as MapLayerId)));
  return Object.fromEntries(MAP_LAYER_IDS.map((layer) => [layer, visible.has(layer)])) as unknown as MapLayerVisibility;
}

export function updateLayersInUrl(visibility: MapLayerVisibility): string {
  const url = new URL(window.location.href);
  const isDefault = MAP_LAYER_IDS.every((layer) => visibility[layer] === DEFAULT_LAYER_VISIBILITY[layer]);
  if (isDefault) url.searchParams.delete('layers');
  else url.searchParams.set('layers', MAP_LAYER_IDS.filter((layer) => visibility[layer]).join(','));
  return `${url.pathname}${url.search}${url.hash}`;
}
