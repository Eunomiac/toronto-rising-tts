import type { Position } from 'geojson';
import type {
  DistrictFeatureCollection,
  CityMarkerCollection,
  BasemapMaskCollection,
  BasemapMaskLabelCollection,
  MapLabelCollection,
  MapLayerId,
  MapLayerVisibility,
  MapDataManifest,
  NetworkDistrictFacts,
  PathEntranceCollection,
  PathInteractionCollection,
  PathLabelCollection,
  PathRouteCollection,
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
const PATH_DISTRICT_KEYS = ['huntingDifficulty', 'key', 'name', 'resonanceMinus', 'resonancePlus'].sort();
const PATH_ROUTE_KEYS = ['covered', 'highway', 'indoor', 'key', 'level', 'name', 'osmId', 'tunnel'].sort();
const PATH_ENTRANCE_KEYS = ['key', 'kind', 'name', 'osmId'].sort();
const PATH_INTERACTION_KEYS = ['key', 'osmId'].sort();
const PATH_LABEL_KEYS = ['key', 'kind', 'name'].sort();
const CITY_MARKER_KEYS = ['key', 'name'].sort();
const BASEMAP_MASK_KEYS = ['key', 'name'].sort();
const MAP_LAYER_IDS: MapLayerId[] = ['districts', 'regions', 'path', 'sites'];
export const DEFAULT_LAYER_VISIBILITY: MapLayerVisibility = {
  districts: true,
  regions: false,
  sites: false,
  path: false,
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

function linePositions(value: unknown, type: unknown): unknown[][] {
  if (type === 'LineString' && Array.isArray(value)) return value as unknown[][];
  if (type === 'MultiLineString' && Array.isArray(value)) return value.flat(1) as unknown[][];
  return [];
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

function nullableString(value: unknown, label: string) {
  if (value !== null && typeof value !== 'string') throw new Error(`${label} must be a string or null`);
}

function parsePathDistrict(value: unknown): NetworkDistrictFacts {
  const district = record(value, 'PATH district');
  exactKeys(district, PATH_DISTRICT_KEYS, 'PATH district');
  if (district.key !== 'PATH') throw new Error('Invalid PATH district key');
  for (const key of ['name', 'resonancePlus', 'resonanceMinus']) nonEmptyString(district[key], `PATH ${key}`);
  if (district.huntingDifficulty !== null && !Number.isInteger(district.huntingDifficulty)) throw new Error('Invalid PATH hunting difficulty');
  return value as NetworkDistrictFacts;
}

function parsePathRoutes(value: unknown): PathRouteCollection {
  const collection = record(value, 'PATH route collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length === 0) throw new Error('Invalid PATH route FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'PATH route');
    const properties = record(feature.properties, 'PATH route properties');
    const geometry = record(feature.geometry, 'PATH route geometry');
    exactKeys(properties, PATH_ROUTE_KEYS, 'PATH route');
    if (properties.key !== 'PATH' || !Number.isInteger(properties.osmId) || !['LineString', 'MultiLineString'].includes(String(geometry.type))) throw new Error('Invalid PATH route');
    const positions = linePositions(geometry.coordinates, geometry.type);
    if (positions.length < 2 || !positions.every(finitePosition)) throw new Error('Invalid PATH route coordinates');
    nonEmptyString(properties.highway, 'PATH highway');
    for (const key of ['name', 'level', 'indoor', 'tunnel', 'covered']) nullableString(properties[key], `PATH ${key}`);
  }
  return value as PathRouteCollection;
}

function parsePathEntrances(value: unknown): PathEntranceCollection {
  const collection = record(value, 'PATH entrance collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length === 0) throw new Error('Invalid PATH entrance FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'PATH entrance');
    const properties = record(feature.properties, 'PATH entrance properties');
    const geometry = record(feature.geometry, 'PATH entrance geometry');
    exactKeys(properties, PATH_ENTRANCE_KEYS, 'PATH entrance');
    if (properties.key !== 'PATH' || !Number.isInteger(properties.osmId)
      || !['subway-entrance', 'elevator', 'underground-entrance'].includes(String(properties.kind))
      || geometry.type !== 'Point' || !finitePosition(geometry.coordinates)) throw new Error('Invalid PATH entrance');
    nullableString(properties.name, 'PATH entrance name');
  }
  return value as PathEntranceCollection;
}

function parsePathInteraction(value: unknown): PathInteractionCollection {
  const collection = record(value, 'PATH interaction collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length === 0) throw new Error('Invalid PATH interaction FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'PATH interaction corridor');
    const properties = record(feature.properties, 'PATH interaction properties');
    const geometry = record(feature.geometry, 'PATH interaction geometry');
    exactKeys(properties, PATH_INTERACTION_KEYS, 'PATH interaction corridor');
    if (properties.key !== 'PATH' || !Number.isInteger(properties.osmId)) throw new Error('Invalid PATH interaction corridor');
    if (geometry.type === 'Polygon') validateMultiPolygon([geometry.coordinates], 'PATH interaction corridor');
    else if (geometry.type === 'MultiPolygon') validateMultiPolygon(geometry.coordinates, 'PATH interaction corridor');
    else throw new Error('Invalid PATH interaction geometry');
  }
  return value as PathInteractionCollection;
}

function parsePathLabel(value: unknown): PathLabelCollection {
  const collection = record(value, 'PATH label collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length !== 1) throw new Error('Invalid PATH label FeatureCollection');
  const feature = record(collection.features[0], 'PATH label');
  const properties = record(feature.properties, 'PATH label properties');
  const geometry = record(feature.geometry, 'PATH label geometry');
  exactKeys(properties, PATH_LABEL_KEYS, 'PATH label');
  if (properties.key !== 'PATH' || properties.kind !== 'network-district' || geometry.type !== 'Point' || !finitePosition(geometry.coordinates)) throw new Error('Invalid PATH label');
  return value as PathLabelCollection;
}

function parseCityMarkers(value: unknown): CityMarkerCollection {
  const collection = record(value, 'City marker collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length === 0) throw new Error('Invalid city marker FeatureCollection');
  const keys = new Set<string>();
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'City marker');
    const properties = record(feature.properties, 'City marker properties');
    const geometry = record(feature.geometry, 'City marker geometry');
    exactKeys(properties, CITY_MARKER_KEYS, 'City marker');
    nonEmptyString(properties.key, 'City marker key');
    nonEmptyString(properties.name, 'City marker name');
    if (keys.has(properties.key) || geometry.type !== 'Point' || !finitePosition(geometry.coordinates)) throw new Error('Invalid or duplicate city marker');
    keys.add(properties.key);
  }
  return value as CityMarkerCollection;
}

function parseBasemapMasks(value: unknown): BasemapMaskCollection {
  const collection = record(value, 'Basemap mask collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid basemap mask FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'Basemap mask');
    const properties = record(feature.properties, 'Basemap mask properties');
    const geometry = record(feature.geometry, 'Basemap mask geometry');
    exactKeys(properties, BASEMAP_MASK_KEYS, 'Basemap mask');
    nonEmptyString(properties.key, 'Basemap mask key');
    nonEmptyString(properties.name, 'Basemap mask name');
    if (geometry.type !== 'Polygon') throw new Error('Invalid basemap mask geometry');
    validateMultiPolygon([geometry.coordinates], String(properties.key));
  }
  return value as BasemapMaskCollection;
}

function parseBasemapMaskLabels(value: unknown): BasemapMaskLabelCollection {
  const collection = record(value, 'Basemap mask label collection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid basemap mask label FeatureCollection');
  for (const rawFeature of collection.features) {
    const feature = record(rawFeature, 'Basemap mask label');
    const properties = record(feature.properties, 'Basemap mask label properties');
    const geometry = record(feature.geometry, 'Basemap mask label geometry');
    exactKeys(properties, BASEMAP_MASK_KEYS, 'Basemap mask label');
    if (geometry.type !== 'Point' || !finitePosition(geometry.coordinates)) throw new Error('Invalid basemap mask label');
  }
  return value as BasemapMaskLabelCollection;
}

function parseManifest(value: unknown): MapDataManifest {
  const manifest = record(value, 'Map manifest');
  const counts = record(manifest.counts, 'Manifest counts');
  const sheet = record(manifest.sheet, 'Manifest Sheet provenance');
  const pathNetwork = record(manifest.pathNetwork, 'PATH provenance');
  if (manifest.schemaVersion !== 7
    || !['districts', 'regions', 'sites', 'labels', 'pathRoutes', 'pathEntrances', 'pathInteractionCorridors', 'pathLabels', 'cityMarkers', 'basemapMasks', 'basemapMaskLabels', 'sheetDistricts', 'sheetSites', 'sheetOnlyDistricts'].every((key) => Number.isInteger(counts[key]))
    || !Array.isArray(sheet.publicDistrictFields)
    || !Array.isArray(sheet.publicSiteFields)
    || !Array.isArray(sheet.sheetOnlyDistricts)
    || !Array.isArray(pathNetwork.routeElementIds) || pathNetwork.routeElementIds.length === 0
    || !pathNetwork.routeElementIds.every(Number.isInteger)
    || !Array.isArray(pathNetwork.entranceElementIds) || pathNetwork.entranceElementIds.length === 0
    || !pathNetwork.entranceElementIds.every(Number.isInteger)
    || !Array.isArray(pathNetwork.excludedWayIds)
    || !pathNetwork.excludedWayIds.every(Number.isInteger)) {
    throw new Error('Unsupported or invalid map-data manifest');
  }
  return value as unknown as MapDataManifest;
}

function validatePathProvenance(
  routes: PathRouteCollection,
  entrances: PathEntranceCollection,
  label: PathLabelCollection,
  manifest: MapDataManifest,
) {
  const bounds = manifest.pathNetwork.bounds;
  if (![bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite)
    || bounds.west >= bounds.east || bounds.south >= bounds.north
    || !manifest.pathNetwork.endpoint || !manifest.pathNetwork.querySha256
    || !manifest.pathNetwork.fetchedAt || !manifest.pathNetwork.osmTimestamp
    || !manifest.pathNetwork.attribution || !manifest.pathNetwork.licenseUrl) {
    throw new Error('Invalid PATH provenance');
  }
  const inside = (position: [number, number]) => position[0] >= bounds.west && position[0] <= bounds.east
    && position[1] >= bounds.south && position[1] <= bounds.north;
  const routeIds = new Set(manifest.pathNetwork.routeElementIds);
  const entranceIds = new Set(manifest.pathNetwork.entranceElementIds);
  const labelFeature = label.features[0];
  if (routeIds.size !== routes.features.length || entranceIds.size !== entrances.features.length
    || !routes.features.every((feature) => routeIds.has(feature.properties.osmId)
      && linePositions(feature.geometry.coordinates, feature.geometry.type).every((position) => inside(position as [number, number])))
    || !entrances.features.every((feature) => entranceIds.has(feature.properties.osmId) && inside(feature.geometry.coordinates as [number, number]))
    || !labelFeature || !inside(labelFeature.geometry.coordinates as [number, number])) {
    throw new Error('PATH geometry does not match its reviewed bounds or provenance');
  }
}

export async function loadPublicMapData(): Promise<PublicMapData> {
  const [districtValue, regionValue, siteValue, labelValue, pathDistrictValue, pathRouteValue,
    pathEntranceValue, pathInteractionValue, pathLabelValue, cityMarkerValue, basemapMaskValue,
    basemapMaskLabelValue, manifestValue] = await Promise.all([
    loadJson(`${GENERATED_ROOT}/districts.geojson`),
    loadJson(`${GENERATED_ROOT}/regions.geojson`),
    loadJson(`${GENERATED_ROOT}/sites.geojson`),
    loadJson(`${GENERATED_ROOT}/labels.geojson`),
    loadJson(`${GENERATED_ROOT}/path-district.json`),
    loadJson(`${GENERATED_ROOT}/path-routes.geojson`),
    loadJson(`${GENERATED_ROOT}/path-entrances.geojson`),
    loadJson(`${GENERATED_ROOT}/path-interaction.geojson`),
    loadJson(`${GENERATED_ROOT}/path-label.geojson`),
    loadJson(`${GENERATED_ROOT}/city-markers.geojson`),
    loadJson(`${GENERATED_ROOT}/basemap-masks.geojson`),
    loadJson(`${GENERATED_ROOT}/basemap-mask-labels.geojson`),
    loadJson(`${GENERATED_ROOT}/map-data-manifest.json`),
  ]);
  const districts = parseDistricts(districtValue);
  const regions = parseRegions(regionValue);
  const sites = parseSites(siteValue);
  const labels = parseLabels(labelValue);
  const pathDistrict = parsePathDistrict(pathDistrictValue);
  const pathRoutes = parsePathRoutes(pathRouteValue);
  const pathEntrances = parsePathEntrances(pathEntranceValue);
  const pathInteraction = parsePathInteraction(pathInteractionValue);
  const pathLabel = parsePathLabel(pathLabelValue);
  const cityMarkers = parseCityMarkers(cityMarkerValue);
  const basemapMasks = parseBasemapMasks(basemapMaskValue);
  const basemapMaskLabels = parseBasemapMaskLabels(basemapMaskLabelValue);
  const manifest = parseManifest(manifestValue);
  if (districts.features.length !== manifest.counts.districts) throw new Error('District manifest count does not match the map data');
  if (regions.features.length !== manifest.counts.regions) throw new Error('Region manifest count does not match the map data');
  if (sites.features.length !== manifest.counts.sites) throw new Error('Site manifest count does not match the map data');
  if (labels.features.length !== manifest.counts.labels) throw new Error('Label manifest count does not match the map data');
  if (pathRoutes.features.length !== manifest.counts.pathRoutes
    || pathEntrances.features.length !== manifest.counts.pathEntrances
    || pathInteraction.features.length !== manifest.counts.pathInteractionCorridors
    || pathLabel.features.length !== manifest.counts.pathLabels) throw new Error('PATH manifest counts do not match the map data');
  if (cityMarkers.features.length !== manifest.counts.cityMarkers) throw new Error('City marker manifest count does not match the map data');
  if (basemapMasks.features.length !== manifest.counts.basemapMasks
    || basemapMaskLabels.features.length !== manifest.counts.basemapMaskLabels) throw new Error('Basemap mask manifest counts do not match the map data');
  validatePathProvenance(pathRoutes, pathEntrances, pathLabel, manifest);
  return {
    districts, regions, sites, labels, pathDistrict, pathRoutes, pathEntrances,
    pathInteraction, pathLabel, cityMarkers, basemapMasks, basemapMaskLabels, manifest,
  };
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
