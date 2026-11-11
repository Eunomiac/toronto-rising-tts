import { describe, expect, it } from 'vitest';
import { applyVisualCalibration, applyVisualCalibrationToLabels, DEFAULT_VISUAL_CALIBRATION } from './calibration';
import type { MapFeatureCollection, MapLabelCollection } from './types';

const collection: MapFeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {
      key: 'Test',
      name: 'Test',
      kind: 'district',
      sourceElement: 'polygon',
      fillRule: 'nonzero',
      sourceRingCount: 1,
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates: [[[[-80, 43], [-79, 43], [-79, 44], [-80, 44], [-80, 43]]]],
    },
  }],
};

const labels: MapLabelCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { key: 'Test', name: 'Test', kind: 'district' },
    geometry: { type: 'Point', coordinates: [-79, 43] },
  }],
};

describe('visual calibration', () => {
  it('leaves coordinates unchanged at the default settings', () => {
    expect(applyVisualCalibration(collection, [[-80, 43], [-79, 44]], DEFAULT_VISUAL_CALIBRATION))
      .toEqual(collection);
  });

  it('contracts horizontally around the west edge without changing latitude', () => {
    const result = applyVisualCalibration(collection, [[-80, 43], [-79, 44]], {
      ...DEFAULT_VISUAL_CALIBRATION,
      horizontalScale: 0.5,
    });
    const ring = result.features[0]!.geometry.coordinates[0]![0]!;

    expect(ring[0]![0]).toBeCloseTo(-80, 8);
    expect(ring[1]![0]).toBeCloseTo(-79.5, 8);
    expect(ring[1]![1]).toBeCloseTo(43, 8);
  });

  it('applies positioning offsets in map metres', () => {
    const result = applyVisualCalibration(collection, [[-80, 43], [-79, 44]], {
      ...DEFAULT_VISUAL_CALIBRATION,
      offsetEastMetres: 100,
      offsetNorthMetres: 100,
    });
    const point = result.features[0]!.geometry.coordinates[0]![0]![0]!;

    expect(point[0]!).toBeGreaterThan(-80);
    expect(point[1]!).toBeGreaterThan(43);
  });

  it('keeps dedicated label points aligned during live calibration', () => {
    const result = applyVisualCalibrationToLabels(labels, [[-80, 43], [-79, 44]], {
      ...DEFAULT_VISUAL_CALIBRATION,
      horizontalScale: 0.5,
    });

    expect(result.features[0]!.geometry.coordinates[0]).toBeCloseTo(-79.5, 8);
    expect(result.features[0]!.geometry.coordinates[1]).toBeCloseTo(43, 8);
  });
});
