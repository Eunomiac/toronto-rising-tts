import { describe, expect, it } from 'vitest';
import {
  bearingAtMidpoint,
  isEastStreetEntryKey,
  midpointAlong,
  streetEntryKey,
  streetLabelCollection,
} from './street-labels';

describe('streetLabelCollection', () => {
  it('drops East duplicate labels and keeps West-only entryKeys', () => {
    const collection = streetLabelCollection({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { category: 'orientation', displayName: 'ST. CLAIR', entryKey: 'St. Clair Avenue West' },
          geometry: {
            type: 'LineString',
            coordinates: [[-79.42, 43.68], [-79.40, 43.68], [-79.38, 43.68]],
          },
        },
        {
          type: 'Feature',
          properties: { category: 'orientation', displayName: 'ST. CLAIR', entryKey: 'St. Clair Avenue East' },
          geometry: {
            type: 'LineString',
            coordinates: [[-79.37, 43.68], [-79.35, 43.68], [-79.33, 43.68]],
          },
        },
      ],
    }, [[-79.44, 43.63], [-79.34, 43.70]]);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]?.properties.entryKey).toBe('St. Clair Avenue West');
    // East-west street → HTML baseline already horizontal → rotation ≈ 0.
    expect(collection.features[0]?.properties.bearing).toBeCloseTo(0, 0);
    expect(collection.features.every((feature) => feature.geometry.type === 'Point')).toBe(true);
  });

  it('places the label near the midpoint of the stitched geometry', () => {
    const mid = midpointAlong([[0, 0], [2, 0], [4, 0]]);
    expect(mid?.[0]).toBeCloseTo(2, 5);
    expect(mid?.[1]).toBeCloseTo(0, 5);
  });

  it('prefers entryKey over displayName when deriving the group key', () => {
    expect(streetEntryKey({ entryKey: 'a', displayName: 'b' })).toBe('a');
    expect(streetEntryKey({ matchName: 'm', displayName: 'b' })).toBe('m');
  });

  it('detects East street entry keys and tilts north-south streets near ±90°', () => {
    expect(isEastStreetEntryKey('Bloor Street East')).toBe(true);
    expect(isEastStreetEntryKey('Bloor Street West')).toBe(false);
    expect(bearingAtMidpoint([[-79.4, 43.65], [-79.4, 43.67]])).toBeCloseTo(-90, 0);
    expect(bearingAtMidpoint([[-79.42, 43.68], [-79.38, 43.68]])).toBeCloseTo(0, 0);
  });
});
