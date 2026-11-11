import assert from 'node:assert/strict';
import test from 'node:test';
import area from '@turf/area';
import polygonClipping from 'polygon-clipping';
import { renderMapDiagnosticsHtml } from './map-diagnostics.mjs';
import { normalizeDistrictCollection } from './normalize-districts.mjs';

function feature(key, coordinates) {
  return {
    type: 'Feature',
    id: key,
    properties: { key },
    geometry: { type: 'MultiPolygon', coordinates: [[coordinates]] },
  };
}

test('reviewed priority cuts every overlap from lower-priority districts', () => {
  const collection = {
    type: 'FeatureCollection',
    features: [
      feature('Winner', [[-79.4, 43.6], [-79.39, 43.6], [-79.39, 43.61], [-79.4, 43.61], [-79.4, 43.6]]),
      feature('Lower', [[-79.395, 43.605], [-79.385, 43.605], [-79.385, 43.615], [-79.395, 43.615], [-79.395, 43.605]]),
    ],
  };
  const result = normalizeDistrictCollection(collection, {
    schemaVersion: 1,
    expansionMetres: 0,
    basis: 'test',
    priority: ['Winner', 'Lower'],
  });
  const winner = result.collection.features.find((item) => item.id === 'Winner');
  const lower = result.collection.features.find((item) => item.id === 'Lower');
  const overlap = polygonClipping.intersection(winner.geometry.coordinates, lower.geometry.coordinates);

  assert.equal(overlap.length, 0);
  assert.equal(result.diagnostics.summary.remainingOverlapSquareMetres, 0);
  assert.ok(result.diagnostics.features.find((item) => item.key === 'Lower').overlapRemovedSquareMetres > 0);
  assert.ok(result.visualDiagnostics.features.some((item) => item.properties.diagnosticType === 'source-boundary'));
  assert.ok(result.visualDiagnostics.features.some((item) => item.properties.diagnosticType === 'normalized-boundary'));
  assert.ok(result.visualDiagnostics.features.some((item) => item.properties.diagnosticType === 'removed-overlap'));
});

test('diagnostic viewer loads generated geometry and offers representative views', () => {
  const html = renderMapDiagnosticsHtml([[-79.44, 43.61], [-79.34, 43.70]]);
  assert.match(html, /map-visual-diagnostics\.geojson/);
  assert.match(html, /Whole city/);
  assert.match(html, /Downtown/);
  assert.match(html, /Islands/);
});

test('canonicalization repairs a self-intersecting ring before it reaches MapLibre', () => {
  const bowTie = feature('BowTie', [
    [-79.4, 43.6], [-79.39, 43.61], [-79.4, 43.61], [-79.39, 43.6], [-79.4, 43.6],
  ]);
  const result = normalizeDistrictCollection({ type: 'FeatureCollection', features: [bowTie] }, {
    schemaVersion: 1,
    expansionMetres: 0,
    basis: 'test',
    priority: ['BowTie'],
  });

  assert.ok(area(result.collection.features[0]) > 0);
  assert.equal(result.diagnostics.summary.remainingOverlapSquareMetres, 0);
});

test('priority manifests must name every district exactly once', () => {
  const collection = {
    type: 'FeatureCollection',
    features: [feature('Only', [[-79.4, 43.6], [-79.39, 43.6], [-79.4, 43.6]])],
  };
  assert.throws(() => normalizeDistrictCollection(collection, {
    schemaVersion: 1,
    expansionMetres: 0,
    basis: 'test',
    priority: [],
  }), /exactly once/);
});
