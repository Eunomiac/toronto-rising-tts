import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPathNetwork, validatePathConfig, validatePathSnapshot } from './path-network.mjs';

const config = {
  schemaVersion: 1,
  endpoint: 'https://example.test',
  bounds: { south: 43.64, west: -79.4, north: 43.66, east: -79.36 },
  routeHighways: ['footway'],
  interactionWidthMetres: 10,
  labelPoint: [-79.38, 43.65],
  excludedWayIds: [],
  attribution: 'OSM',
  licenseUrl: 'https://example.test/license',
};
const snapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-11-11T00:00:00Z',
  osmTimestamp: '2026-11-10T00:00:00Z',
  endpoint: config.endpoint,
  query: 'test query',
  elements: [
    { type: 'way', id: 10, tags: { highway: 'footway', level: '-1' }, geometry: [{ lon: -79.39, lat: 43.65 }, { lon: -79.37, lat: 43.65 }] },
    { type: 'node', id: 20, lon: -79.38, lat: 43.65, tags: { railway: 'subway_entrance' } },
  ],
};
const facts = { key: 'PATH', name: 'PATH', huntingDifficulty: 4, resonancePlus: 'sanguine', resonanceMinus: 'phlegmatic' };

test('builds separate player-safe PATH route, entrance, corridor, label, and provenance outputs', () => {
  const result = buildPathNetwork(snapshot, config, facts);
  assert.equal(result.routes.features.length, 1);
  assert.equal(result.entrances.features[0].properties.kind, 'subway-entrance');
  assert.equal(result.interaction.features.length, 1);
  assert.deepEqual(result.district, facts);
  assert.deepEqual(result.provenance.routeElementIds, [10]);
  assert.equal('tags' in result.routes.features[0].properties, false);
});

test('rejects malformed or empty PATH configuration', () => {
  assert.throws(() => validatePathConfig({ ...config, routeHighways: [] }), /Invalid PATH/);
});

test('rejects malformed source geometry before publication', () => {
  const malformed = structuredClone(snapshot);
  malformed.elements[0].geometry[1].lon = null;
  assert.throws(() => validatePathSnapshot(malformed), /Invalid OpenStreetMap PATH snapshot/);
});

test('clips route geometry to the reviewed PATH bounds', () => {
  const crossing = structuredClone(snapshot);
  crossing.elements[0].geometry = [{ lon: -79.41, lat: 43.65 }, { lon: -79.37, lat: 43.65 }];
  const result = buildPathNetwork(crossing, config, facts);
  assert.equal(result.routes.features[0].geometry.coordinates[0][0], config.bounds.west);
  assert.ok(result.routes.features[0].geometry.coordinates.every(([longitude, latitude]) => (
    longitude >= config.bounds.west && longitude <= config.bounds.east
    && latitude >= config.bounds.south && latitude <= config.bounds.north
  )));
});
