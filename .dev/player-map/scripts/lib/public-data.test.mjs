import assert from 'node:assert/strict';
import test from 'node:test';
import { joinDistrictFacts, projectDistrictRows, projectPublicSites, validatePublicDataPolicy } from './public-data.mjs';

const policy = {
  schemaVersion: 1,
  districtFields: ['Key', 'Name', 'Hunting Difficulty', 'Resonance Plus', 'Resonance Minus'],
  sheetOnlyDistricts: [{ key: 'PATH', geometryKind: 'network', reason: 'test' }],
  siteFields: ['Key', 'Name', 'Subtitle', 'District', 'Map Icon', 'X', 'Y'],
  publicSiteKeys: [],
};

const row = {
  Key: 'Rosedale',
  Name: 'Rosedale',
  'Hunting Difficulty': '6',
  'Resonance Plus': 'phlegmatic +',
  'Resonance Minus': 'melancholic -',
  'Domain Control: Full': 'must never project',
};

test('district projection emits only the reviewed player-safe facts', () => {
  const projected = projectDistrictRows([row, { ...row, Key: 'PATH', Name: 'P.A.T.H.', 'Hunting Difficulty': '4' }], policy);
  assert.deepEqual(projected[0], {
    key: 'Rosedale',
    name: 'Rosedale',
    huntingDifficulty: 6,
    resonancePlus: 'phlegmatic',
    resonanceMinus: 'melancholic',
  });
  assert.equal(JSON.stringify(projected).includes('must never project'), false);
});

test('geometry coverage requires every Sheet district or a reviewed exception', () => {
  const facts = projectDistrictRows([row, { ...row, Key: 'PATH', Name: 'P.A.T.H.', 'Hunting Difficulty': '4' }], policy);
  const result = joinDistrictFacts({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'Rosedale',
      geometry: { type: 'MultiPolygon', coordinates: [] },
      properties: { key: 'Rosedale', name: 'old', kind: 'district', sourceElement: 'path', fillRule: 'nonzero', sourceRingCount: 1 },
    }],
  }, facts, policy);
  assert.equal(result.features[0].properties.huntingDifficulty, 6);
  assert.equal(result.features[0].properties.name, 'Rosedale');
});

test('mapped sites keep only their public name, icon, district, and hub grouping', () => {
  const rows = [
    { Key: 'inside', Name: 'The Library', Subtitle: 'Casa Loma', District: 'Wychwood', 'Map Icon': 'hub_castle', X: '10', Y: '20', 'Aspect Content': 'secret' },
    { Key: 'stables', Name: 'The Stables', Subtitle: 'Casa Loma', District: 'Wychwood', 'Map Icon': 'hub_castle', X: '10', Y: '20', 'Aspect Content': 'also secret' },
    { Key: 'cafe', Name: 'The Cafe', Subtitle: '', District: 'Yorkville', 'Map Icon': 'cafe', X: '4', Y: '8' },
    { Key: 'hidden', Name: 'Unmapped', Subtitle: '', District: 'Yorkville', 'Map Icon': '', X: '', Y: '' },
  ];
  const sites = projectPublicSites(rows, ['hub_castle', 'cafe'], ([x, y]) => [x, y]);
  assert.deepEqual(sites.features.map((feature) => feature.properties), [
    { key: 'cafe', name: 'The Cafe', districtKey: 'Yorkville', icon: 'cafe', hub: false },
    { key: 'CasaLoma', name: 'Casa Loma', districtKey: 'Wychwood', icon: 'hub_castle', hub: true },
  ]);
  assert.deepEqual(sites.features[1].geometry.coordinates, [10, 20]);
  assert.equal(JSON.stringify(sites).includes('secret'), false);
});

test('a hub with two map positions is rejected', () => {
  assert.throws(() => projectPublicSites([
    { Key: 'a', Name: 'A', Subtitle: 'Casa Loma', District: 'Wychwood', 'Map Icon': 'hub_castle', X: '1', Y: '2' },
    { Key: 'b', Name: 'B', Subtitle: 'Casa Loma', District: 'Wychwood', 'Map Icon': 'hub_castle', X: '3', Y: '4' },
  ], ['hub_castle'], ([x, y]) => [x, y]), /conflicting map icons or coordinates/);
});
