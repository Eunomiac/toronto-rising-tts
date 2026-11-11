import { describe, expect, it } from 'vitest';
import type { DistrictFeatureCollection, MapLabelCollection } from './types';
import { labelsForViewport } from './viewport-labels';

const districts: DistrictFeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {
      key: 'Test', name: 'Test', kind: 'district', sourceElement: 'polygon',
      fillRule: 'nonzero', sourceRingCount: 1, huntingDifficulty: 2,
      resonancePlus: 'sanguine', resonanceMinus: 'melancholic',
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates: [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]],
    },
  }],
};

const labels: MapLabelCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { key: 'Test', name: 'Test', kind: 'district' }, geometry: { type: 'Point', coordinates: [5, 5] } },
    { type: 'Feature', properties: { key: 'Region', name: 'Region', kind: 'region' }, geometry: { type: 'Point', coordinates: [2, 2] } },
  ],
};

describe('viewport-aware labels', () => {
  it('moves one district label into the visible fragment and leaves region anchors stable', () => {
    const result = labelsForViewport(districts, labels, [8, 3, 9, 4]);
    const districtPoint = result.features[0]!.geometry.coordinates;

    expect(districtPoint[0]).toBeGreaterThanOrEqual(8);
    expect(districtPoint[0]).toBeLessThanOrEqual(9);
    expect(districtPoint[1]).toBeGreaterThanOrEqual(3);
    expect(districtPoint[1]).toBeLessThanOrEqual(4);
    expect(result.features[1]).toEqual(labels.features[1]);
    expect(result.features).toHaveLength(2);
  });

  it('keeps the generated fallback when a district is outside the viewport', () => {
    expect(labelsForViewport(districts, labels, [20, 20, 21, 21]).features[0])
      .toEqual(labels.features[0]);
  });
});
