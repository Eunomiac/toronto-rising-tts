import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import pointOnFeature from '@turf/point-on-feature';
import { normalizeDistrictCollection } from './lib/normalize-districts.mjs';
import { buildPathNetwork } from './lib/path-network.mjs';
import { emptyPublicSites, joinDistrictFacts, projectDistrictRows, validatePublicDataPolicy } from './lib/public-data.mjs';
import {
  createVisualCalibrationTransform,
  fitAffineCalibration,
  fitProjectiveCalibration,
  fitRectangularCalibration,
  lngLatToMercator,
  pathToRings,
  polygonPointsToRings,
  ringsToMultiPolygon,
} from './lib/svg-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data/source/toronto-rising-map.svg');
const calibrationPath = path.join(root, 'data/calibration.json');
const namesPath = path.join(root, 'data/feature-names.json');
const priorityPath = path.join(root, 'data/district-priority.json');
const publicDataPolicyPath = path.join(root, 'data/public-data-policy.json');
const pathNetworkConfigPath = path.join(root, 'data/path-network.json');
const pathNetworkSnapshotPath = path.join(root, 'data/source/osm-path-snapshot.json');
const normalizationDiagnosticsPath = path.join(root, 'data/diagnostics/normalization.json');
const outputDirectory = path.join(root, 'public/generated');
const checkOnly = process.argv.includes('--check');
const refreshSheet = process.argv.includes('--refresh-sheet');

const require = createRequire(import.meta.url);
const {
  contract: sheetContract,
  dataOf,
  defaultSnapshotPath,
  loadSnapshot,
} = require('../../scripts/lib/sheet_exports.js');

let sheetSnapshotMode = process.env.TR_EXPORT_SNAPSHOT ? 'shared-snapshot' : 'live-fetch';
if (!process.env.TR_EXPORT_SNAPSHOT && !refreshSheet) {
  try {
    await fs.access(defaultSnapshotPath);
    process.env.TR_EXPORT_SNAPSHOT = defaultSnapshotPath;
    sheetSnapshotMode = 'validated-cache';
  } catch {
    // No validated local cache exists yet. The shared loader will fetch and validate the live exports.
  }
}

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
const svgText = await fs.readFile(sourcePath, 'utf8');
const [calibration, names, districtPriority, publicDataPolicy, pathNetworkConfig, pathNetworkSnapshot, sheetSnapshot] = await Promise.all([
  readJson(calibrationPath),
  readJson(namesPath),
  readJson(priorityPath),
  readJson(publicDataPolicyPath).then(validatePublicDataPolicy),
  readJson(pathNetworkConfigPath),
  readJson(pathNetworkSnapshotPath),
  loadSnapshot(),
]);
const sheetDistrictRows = dataOf(sheetSnapshot, 'LOCATIONS_DISTRICTS');
const sheetSiteRows = dataOf(sheetSnapshot, 'LOCATIONS_SITES');
const publicDistrictFacts = projectDistrictRows(sheetDistrictRows, publicDataPolicy);
const pathFacts = publicDistrictFacts.find((district) => district.key === 'PATH');
const pathNetwork = buildPathNetwork(pathNetworkSnapshot, pathNetworkConfig, pathFacts);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) => ['g', 'path', 'polygon'].includes(name),
});
const document = parser.parse(svgText);
const groups = new Map(document.svg.g.map((group) => [group.id, group]));
const transform = calibration.method.startsWith('rectangular')
  ? fitRectangularCalibration(
    calibration.controlPoints,
    calibration.validationPoints ?? [],
    calibration.adjustments ?? {},
  )
  : calibration.method.startsWith('projective')
    ? fitProjectiveCalibration(calibration.controlPoints, calibration.validationPoints ?? [])
    : fitAffineCalibration(calibration.controlPoints);
const roundCoordinate = (value) => Number(value.toFixed(7));
const project = (point) => transform.project(point).map(roundCoordinate);

function collectionBounds(collections) {
  return collections
    .flatMap((collection) => collection.features)
    .flatMap((feature) => feature.geometry.coordinates.flat(2))
    .reduce((result, [longitude, latitude]) => [
      [Math.min(result[0][0], longitude), Math.min(result[0][1], latitude)],
      [Math.max(result[1][0], longitude), Math.max(result[1][1], latitude)],
    ], [[Infinity, Infinity], [-Infinity, -Infinity]]);
}

function transformCollection(collection, transformLngLat) {
  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map((polygon) => (
          polygon.map((ring) => ring.map((position) => transformLngLat(position).map(roundCoordinate)))
        )),
      },
    })),
  };
}

function validatePolygonCollection(collection, kind) {
  const keys = new Set();
  for (const feature of collection.features) {
    const key = feature.properties?.key;
    if (typeof key !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || keys.has(key)) {
      throw new Error(`${kind}: invalid or duplicate key ${JSON.stringify(key)}`);
    }
    keys.add(key);
    if (feature.type !== 'Feature' || feature.geometry?.type !== 'MultiPolygon' || feature.geometry.coordinates.length === 0) {
      throw new Error(`${key}: invalid ${kind} geometry`);
    }
    for (const polygon of feature.geometry.coordinates) {
      if (!Array.isArray(polygon) || polygon.length === 0) throw new Error(`${key}: empty polygon`);
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error(`${key}: invalid polygon ring`);
        const [firstLongitude, firstLatitude] = ring[0];
        const [lastLongitude, lastLatitude] = ring[ring.length - 1];
        if (firstLongitude !== lastLongitude || firstLatitude !== lastLatitude) throw new Error(`${key}: open polygon ring`);
        for (const [longitude, latitude] of ring) {
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
            || longitude < -79.46 || longitude > -79.32 || latitude < 43.60 || latitude > 43.72) {
            throw new Error(`${key}: coordinate lies outside the reviewed Toronto map bounds`);
          }
        }
      }
    }
  }
}

function buildLabelCollection(collections) {
  const features = collections.flatMap((collection) => collection.features).map((feature) => {
    const point = pointOnFeature(feature);
    const coordinates = point.geometry.coordinates.map(roundCoordinate);
    if (coordinates.length < 2 || !coordinates.every(Number.isFinite)
      || coordinates[0] < -79.46 || coordinates[0] > -79.32
      || coordinates[1] < 43.60 || coordinates[1] > 43.72) {
      throw new Error(`${feature.properties.key}: invalid label point`);
    }
    return {
      type: 'Feature',
      id: feature.properties.key,
      properties: {
        key: feature.properties.key,
        name: feature.properties.name,
        kind: feature.properties.kind,
      },
      geometry: { type: 'Point', coordinates },
    };
  });
  return { type: 'FeatureCollection', features };
}

function buildCollection(groupId, kind, expectedNames) {
  const group = groups.get(groupId);
  if (!group) throw new Error(`Missing SVG group: ${groupId}`);
  const elements = [
    ...(group.path ?? []).map((element) => ({ ...element, element: 'path' })),
    ...(group.polygon ?? []).map((element) => ({ ...element, element: 'polygon' })),
  ];
  const ids = elements.map(({ id }) => id);
  const missing = Object.keys(expectedNames).filter((id) => !ids.includes(id));
  const unexpected = ids.filter((id) => !Object.hasOwn(expectedNames, id));
  if (missing.length || unexpected.length) {
    throw new Error(`${groupId} key mismatch. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`);
  }
  const features = elements.map((element) => {
    const rings = element.element === 'path' ? pathToRings(element.d) : polygonPointsToRings(element.points);
    const coordinates = ringsToMultiPolygon(rings, project);
    if (coordinates.length === 0) throw new Error(`No usable geometry for ${element.id}`);
    return {
      type: 'Feature',
      id: element.id,
      properties: {
        key: element.id,
        name: expectedNames[element.id],
        kind,
        sourceElement: element.element,
        fillRule: element['fill-rule'] ?? 'nonzero',
        sourceRingCount: rings.length,
      },
      geometry: { type: 'MultiPolygon', coordinates },
    };
  });
  return { type: 'FeatureCollection', features };
}

const baseDistricts = buildCollection('DISTRICTS', 'district', names.districts);
const baseRegions = buildCollection('REGIONS', 'region', names.regions);
const baseBounds = collectionBounds([baseDistricts, baseRegions]);
const visualTransform = calibration.visualCalibration
  ? createVisualCalibrationTransform(baseBounds, calibration.visualCalibration)
  : (lngLat) => lngLat;
const unnormalizedDistricts = transformCollection(baseDistricts, visualTransform);
const { collection: normalizedDistricts, diagnostics: normalizationDiagnostics } = normalizeDistrictCollection(
  unnormalizedDistricts,
  districtPriority,
);
const districts = joinDistrictFacts(normalizedDistricts, publicDistrictFacts, publicDataPolicy);
const regions = transformCollection(baseRegions, visualTransform);
const sites = emptyPublicSites(publicDataPolicy);
validatePolygonCollection(districts, 'district');
validatePolygonCollection(regions, 'region');
const labels = buildLabelCollection([districts, regions]);
const bounds = collectionBounds([districts, regions]);
const residualsFor = (points) => points.map((control) => {
  const projected = lngLatToMercator(visualTransform(transform.project(control.source)));
  const target = lngLatToMercator(control.lngLat);
  return {
    name: control.name,
    metres: Math.hypot(projected[0] - target[0], projected[1] - target[1]),
  };
});
const residuals = residualsFor(calibration.controlPoints);
const validationResiduals = residualsFor(calibration.validationPoints ?? []);
const rootMeanSquareError = (items) => items.length === 0
  ? null
  : Math.sqrt(items.reduce((sum, item) => sum + item.metres ** 2, 0) / items.length);
const manifest = {
  schemaVersion: 5,
  source: {
    svg: 'data/source/toronto-rising-map.svg',
    sha256: createHash('sha256').update(svgText).digest('hex'),
    viewBox: calibration.sourceViewBox,
    calibrationMethod: calibration.method,
  },
  counts: {
    districts: districts.features.length,
    regions: regions.features.length,
    sites: sites.features.length,
    labels: labels.features.length,
    pathRoutes: pathNetwork.routes.features.length,
    pathEntrances: pathNetwork.entrances.features.length,
    pathInteractionCorridors: pathNetwork.interaction.features.length,
    pathLabels: pathNetwork.label.features.length,
    sheetDistricts: sheetDistrictRows.length,
    sheetSites: sheetSiteRows.length,
    sheetOnlyDistricts: publicDataPolicy.sheetOnlyDistricts.length,
  },
  bounds,
  sheet: {
    spreadsheetId: sheetContract.spreadsheetId,
    fetchedAt: sheetSnapshot.fetchedAt,
    snapshotMode: sheetSnapshotMode,
    exports: ['EXPORT_LOCATIONS_DISTRICTS', 'EXPORT_LOCATIONS_SITES'],
    sourceSha256: createHash('sha256')
      .update(JSON.stringify({ districts: sheetDistrictRows, sites: sheetSiteRows }))
      .digest('hex'),
    publicDistrictFields: [...publicDataPolicy.districtFields],
    publicSiteFields: [...publicDataPolicy.siteFields],
    sheetOnlyDistricts: publicDataPolicy.sheetOnlyDistricts,
  },
  calibration: {
    revision: calibration.revision,
    adjustments: calibration.adjustments ?? null,
    visualCalibration: calibration.visualCalibration ?? null,
    controlPointCount: calibration.controlPoints.length,
    rootMeanSquareErrorMetres: Number(rootMeanSquareError(residuals).toFixed(2)),
    residuals: residuals.map((item) => ({ ...item, metres: Number(item.metres.toFixed(2)) })),
    validationPointCount: validationResiduals.length,
    validationRootMeanSquareErrorMetres: rootMeanSquareError(validationResiduals) === null
      ? null
      : Number(rootMeanSquareError(validationResiduals).toFixed(2)),
    validationResiduals: validationResiduals.map((item) => ({ ...item, metres: Number(item.metres.toFixed(2)) })),
  },
  normalization: {
    schemaVersion: normalizationDiagnostics.schemaVersion,
    prioritySource: 'data/district-priority.json',
    expansionMetres: normalizationDiagnostics.expansionMetres,
    districtsWithOverlapCuts: normalizationDiagnostics.summary.districtsWithOverlapCuts,
    remainingOverlapSquareMetres: normalizationDiagnostics.summary.remainingOverlapSquareMetres,
  },
  pathNetwork: pathNetwork.provenance,
};

if (manifest.counts.districts !== 32 || manifest.counts.regions !== 3 || manifest.counts.labels !== 35) {
  throw new Error('Unexpected feature counts');
}
if (manifest.counts.pathRoutes === 0 || manifest.counts.pathEntrances === 0
  || manifest.counts.pathInteractionCorridors !== manifest.counts.pathRoutes || manifest.counts.pathLabels !== 1) {
  throw new Error('Unexpected PATH network counts');
}
if (manifest.counts.sheetDistricts !== 36 || manifest.counts.sheetOnlyDistricts !== 4) {
  throw new Error('Unexpected Sheet district coverage');
}
if (manifest.calibration.rootMeanSquareErrorMetres > 150) {
  throw new Error(`Calibration error is too high: ${manifest.calibration.rootMeanSquareErrorMetres} metres RMS`);
}
if (manifest.calibration.validationRootMeanSquareErrorMetres !== null && manifest.calibration.validationRootMeanSquareErrorMetres > 100) {
  throw new Error(`Calibration validation error is too high: ${manifest.calibration.validationRootMeanSquareErrorMetres} metres RMS`);
}

const outputs = [
  ['districts.geojson', districts],
  ['regions.geojson', regions],
  ['sites.geojson', sites],
  ['labels.geojson', labels],
  ['path-district.json', pathNetwork.district],
  ['path-routes.geojson', pathNetwork.routes],
  ['path-entrances.geojson', pathNetwork.entrances],
  ['path-interaction.geojson', pathNetwork.interaction],
  ['path-label.geojson', pathNetwork.label],
  ['map-data-manifest.json', manifest],
];
const calibrationSummary = `${manifest.calibration.rootMeanSquareErrorMetres} m control RMS${manifest.calibration.validationRootMeanSquareErrorMetres === null ? '' : `, ${manifest.calibration.validationRootMeanSquareErrorMetres} m validation RMS`}`;

if (checkOnly) {
  for (const [filename, value] of outputs) {
    const existing = JSON.parse(await fs.readFile(path.join(outputDirectory, filename), 'utf8'));
    const expected = structuredClone(value);
    if (JSON.stringify(existing) !== JSON.stringify(expected)) throw new Error(`${filename} is stale; run npm run data:build`);
  }
  const existingDiagnostics = JSON.parse(await fs.readFile(normalizationDiagnosticsPath, 'utf8'));
  if (JSON.stringify(existingDiagnostics) !== JSON.stringify(normalizationDiagnostics)) {
    throw new Error('Normalization diagnostics are stale; run npm run data:build');
  }
  console.log(`Map data is current: ${manifest.counts.districts} districts, ${manifest.counts.regions} regions, ${calibrationSummary}.`);
} else {
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(path.dirname(normalizationDiagnosticsPath), { recursive: true });
  await Promise.all(outputs.map(([filename, value]) =>
    fs.writeFile(path.join(outputDirectory, filename), `${JSON.stringify(value)}\n`, 'utf8')));
  await fs.writeFile(normalizationDiagnosticsPath, `${JSON.stringify(normalizationDiagnostics, null, 2)}\n`, 'utf8');
  console.log(`Generated ${manifest.counts.districts} districts and ${manifest.counts.regions} regions. Calibration: ${calibrationSummary}.`);
  console.log(`Normalized district boundaries: ${normalizationDiagnostics.summary.districtsWithOverlapCuts} districts clipped; ${normalizationDiagnostics.summary.remainingOverlapSquareMetres} m² overlap remains.`);
}
