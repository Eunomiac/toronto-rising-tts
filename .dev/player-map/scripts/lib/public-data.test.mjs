import assert from 'node:assert/strict';
import test from 'node:test';
import { joinDistrictFacts, projectDistrictRows, validatePublicDataPolicy } from './public-data.mjs';

const policy = {
  schemaVersion: 1,
  districtFields: ['Key', 'Name', 'Hunting Difficulty', 'Resonance Plus', 'Resonance Minus'],
  sheetOnlyDistricts: [{ key: 'PATH', geometryKind: 'network', reason: 'test' }],
  siteFields: [],
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

test('an allowlist change cannot silently publish sites', () => {
  assert.throws(() => validatePublicDataPolicy({ ...policy, publicSiteKeys: ['SecretHaven'] }), /reviewed non-empty field policy/);
});
