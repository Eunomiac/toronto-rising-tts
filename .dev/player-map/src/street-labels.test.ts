import { describe, expect, it } from 'vitest';
import {
  midpointAlong,
  streetEntryKey,
  streetLabelCollection,
} from './street-labels';

describe('streetLabelCollection', () => {
  it('emits one point per entryKey even when display names match', () => {
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

    expect(collection.features).toHaveLength(2);
    expect(collection.features.map((feature) => feature.properties.entryKey).sort()).toEqual([
      'St. Clair Avenue East',
      'St. Clair Avenue West',
    ]);
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
});
