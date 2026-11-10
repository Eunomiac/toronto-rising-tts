import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import {
  fitAffineCalibration,
  fitProjectiveCalibration,
  pathToRings,
  polygonPointsToRings,
  ringsToMultiPolygon,
} from './lib/svg-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data/source/toronto-rising-map.svg');
const calibrationPath = path.join(root, 'data/calibration.json');
const namesPath = path.join(root, 'data/feature-names.json');
const outputDirectory = path.join(root, 'public/generated');
const checkOnly = process.argv.includes('--check');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
const svgText = await fs.readFile(sourcePath, 'utf8');
const [calibration, names] = await Promise.all([readJson(calibrationPath), readJson(namesPath)]);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) => ['g', 'path', 'polygon'].includes(name),
});
const document = parser.parse(svgText);
const groups = new Map(document.svg.g.map((group) => [group.id, group]));
const transform = calibration.method.startsWith('projective')
  ? fitProjectiveCalibration(calibration.controlPoints, calibration.validationPoints ?? [])
  : fitAffineCalibration(calibration.controlPoints);
const roundCoordinate = (value) => Number(value.toFixed(7));
const project = (point) => transform.project(point).map(roundCoordinate);

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

const districts = buildCollection('DISTRICTS', 'district', names.districts);
const regions = buildCollection('REGIONS', 'region', names.regions);
const allCoordinates = [...districts.features, ...regions.features]
  .flatMap((feature) => feature.geometry.coordinates.flat(2));
const bounds = allCoordinates.reduce((result, [longitude, latitude]) => [
  [Math.min(result[0][0], longitude), Math.min(result[0][1], latitude)],
  [Math.max(result[1][0], longitude), Math.max(result[1][1], latitude)],
], [[Infinity, Infinity], [-Infinity, -Infinity]]);
const manifest = {
  schemaVersion: 1,
  source: {
    svg: 'data/source/toronto-rising-map.svg',
    sha256: createHash('sha256').update(svgText).digest('hex'),
    viewBox: calibration.sourceViewBox,
    calibrationMethod: calibration.method,
  },
  counts: {
    districts: districts.features.length,
    regions: regions.features.length,
  },
  bounds,
  calibration: {
    controlPointCount: calibration.controlPoints.length,
    rootMeanSquareErrorMetres: Number(transform.rootMeanSquareErrorMetres.toFixed(2)),
    residuals: transform.residuals.map((item) => ({ ...item, metres: Number(item.metres.toFixed(2)) })),
    validationPointCount: transform.validationResiduals?.length ?? 0,
    validationRootMeanSquareErrorMetres: transform.validationRootMeanSquareErrorMetres === null || transform.validationRootMeanSquareErrorMetres === undefined
      ? null
      : Number(transform.validationRootMeanSquareErrorMetres.toFixed(2)),
    validationResiduals: (transform.validationResiduals ?? []).map((item) => ({ ...item, metres: Number(item.metres.toFixed(2)) })),
  },
};

if (manifest.counts.districts !== 32 || manifest.counts.regions !== 3) throw new Error('Unexpected feature counts');
if (manifest.calibration.rootMeanSquareErrorMetres > 150) {
  throw new Error(`Calibration error is too high: ${manifest.calibration.rootMeanSquareErrorMetres} metres RMS`);
}
if (manifest.calibration.validationRootMeanSquareErrorMetres !== null && manifest.calibration.validationRootMeanSquareErrorMetres > 100) {
  throw new Error(`Calibration validation error is too high: ${manifest.calibration.validationRootMeanSquareErrorMetres} metres RMS`);
}

const outputs = [
  ['districts.geojson', districts],
  ['regions.geojson', regions],
  ['map-data-manifest.json', manifest],
];
const calibrationSummary = `${manifest.calibration.rootMeanSquareErrorMetres} m control RMS${manifest.calibration.validationRootMeanSquareErrorMetres === null ? '' : `, ${manifest.calibration.validationRootMeanSquareErrorMetres} m validation RMS`}`;

if (checkOnly) {
  for (const [filename, value] of outputs) {
    const existing = JSON.parse(await fs.readFile(path.join(outputDirectory, filename), 'utf8'));
    const expected = structuredClone(value);
    if (JSON.stringify(existing) !== JSON.stringify(expected)) throw new Error(`${filename} is stale; run npm run data:build`);
  }
  console.log(`Map data is current: ${manifest.counts.districts} districts, ${manifest.counts.regions} regions, ${calibrationSummary}.`);
} else {
  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all(outputs.map(([filename, value]) =>
    fs.writeFile(path.join(outputDirectory, filename), `${JSON.stringify(value)}\n`, 'utf8')));
  console.log(`Generated ${manifest.counts.districts} districts and ${manifest.counts.regions} regions. Calibration: ${calibrationSummary}.`);
}
