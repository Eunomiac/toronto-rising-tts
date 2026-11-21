import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrientationStreets } from './orientation-streets.mjs';

const config = {
  streets: [
    { category: 'primary', displayName: 'Yonge Street', matchNames: ['Yonge Street'] },
    { category: 'orientation', displayName: 'Spadina', matchNames: ['Spadina Avenue', 'Spadina Road'] },
  ],
};

test('keeps named ways and labels them with the catalog display name', () => {
  const collection = buildOrientationStreets(config, {
    elements: [
      { type: 'way', id: 10, tags: { name: 'Yonge Street' }, geometry: [{ lon: -79.4, lat: 43.65 }, { lon: -79.4, lat: 43.66 }] },
      { type: 'way', id: 11, tags: { name: 'Spadina Road' }, geometry: [{ lon: -79.41, lat: 43.65 }, { lon: -79.41, lat: 43.66 }] },
      { type: 'way', id: 12, tags: { name: 'Bay Street' }, geometry: [{ lon: -79.38, lat: 43.65 }, { lon: -79.38, lat: 43.66 }] },
    ],
  });
  assert.deepEqual(collection.features.map((feature) => feature.properties.displayName), ['Yonge Street', 'Spadina']);
  assert.equal(collection.features[0].properties.entryKey, 'Yonge Street');
  assert.equal(collection.features[1].properties.entryKey, 'Spadina Avenue');
  assert.equal(collection.features[1].properties.matchName, 'Spadina Road');
  assert.equal(collection.features[1].properties.category, 'orientation');
});

test('fails when a catalog street has no geometry', () => {
  assert.throws(
    () => buildOrientationStreets(config, { elements: [] }),
    /missing Yonge Street, Spadina/,
  );
});
