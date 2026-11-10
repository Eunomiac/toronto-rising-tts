import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import area from '@turf/area';
import buffer from '@turf/buffer';
import polygonClipping from 'polygon-clipping';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'public/generated/districts.geojson');
const outputPath = path.join(root, 'data/diagnostics/normalization.json');
const checkOnly = process.argv.includes('--check');
const expansionMetres = 2.35;

const districts = JSON.parse(await fs.readFile(inputPath, 'utf8'));

function asMultiPolygonCoordinates(geometry) {
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  throw new Error(`Unsupported normalization geometry: ${geometry.type}`);
}

function bounds(coordinates) {
  return coordinates.flat(2).reduce((result, [longitude, latitude]) => [
    Math.min(result[0], longitude),
    Math.min(result[1], latitude),
    Math.max(result[2], longitude),
    Math.max(result[3], latitude),
  ], [Infinity, Infinity, -Infinity, -Infinity]);
}

function intersects(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function featureArea(coordinates) {
  return area({ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates } });
}

const winners = [];
const features = [];
// Illustrator writes the bottom object first; reverse it so earlier winners
// match the visible Layers panel from top to bottom.
for (const sourceFeature of [...districts.features].reverse()) {
  const expandedFeature = buffer(sourceFeature, expansionMetres, { units: 'meters', steps: 3 });
  if (!expandedFeature) throw new Error(`Could not expand ${sourceFeature.properties.key}`);
  const expanded = asMultiPolygonCoordinates(expandedFeature.geometry);
  let normalized = expanded;
  let normalizedBounds = bounds(normalized);
  const clippedBy = [];
  for (const winner of winners) {
    if (!intersects(normalizedBounds, winner.bounds)) continue;
    const difference = polygonClipping.difference(normalized, winner.coordinates);
    if (!difference || difference.length === 0) throw new Error(`${sourceFeature.properties.key} was completely removed by winner ${winner.key}`);
    const before = featureArea(normalized);
    normalized = difference;
    const removed = before - featureArea(normalized);
    if (removed > 0.01) clippedBy.push({ key: winner.key, squareMetres: removed });
    normalizedBounds = bounds(normalized);
  }
  const sourceSquareMetres = featureArea(asMultiPolygonCoordinates(sourceFeature.geometry));
  const expandedSquareMetres = featureArea(expanded);
  const normalizedSquareMetres = featureArea(normalized);
  features.push({
    key: sourceFeature.properties.key,
    sourceSquareMetres: Number(sourceSquareMetres.toFixed(2)),
    expansionAddedSquareMetres: Number((expandedSquareMetres - sourceSquareMetres).toFixed(2)),
    overlapRemovedSquareMetres: Number((expandedSquareMetres - normalizedSquareMetres).toFixed(2)),
    clippedBy: clippedBy.map((item) => ({ key: item.key, squareMetres: Number(item.squareMetres.toFixed(2)) })),
  });
  winners.push({ key: sourceFeature.properties.key, coordinates: normalized, bounds: normalizedBounds });
}

const diagnostics = {
  schemaVersion: 1,
  status: 'prototype-only-not-runtime-geometry',
  operation: 'expand-each-district-then-cut-lower-features-against-earlier-winners',
  expansionMetres,
  approximateSourcePixels: 1,
  winnerOrder: features.map(({ key }) => key),
  summary: {
    districtCount: features.length,
    districtsWithOverlapCuts: features.filter(({ overlapRemovedSquareMetres }) => overlapRemovedSquareMetres > 0.01).length,
    totalExpansionAddedSquareMetres: Number(features.reduce((sum, item) => sum + item.expansionAddedSquareMetres, 0).toFixed(2)),
    totalOverlapRemovedSquareMetres: Number(features.reduce((sum, item) => sum + item.overlapRemovedSquareMetres, 0).toFixed(2)),
  },
  features,
};

if (checkOnly) {
  const existing = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  if (JSON.stringify(existing) !== JSON.stringify(diagnostics)) throw new Error('Normalization diagnostics are stale; run npm run data:build');
  console.log(`Normalization prototype is current: ${diagnostics.summary.districtsWithOverlapCuts} districts would be clipped after a ~1 px expansion.`);
} else {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(diagnostics, null, 2)}\n`, 'utf8');
  console.log(`Normalization prototype: ${diagnostics.summary.districtsWithOverlapCuts} districts would be clipped after a ~1 px expansion. Runtime GeoJSON remains unchanged pending Phase 2 review.`);
}
