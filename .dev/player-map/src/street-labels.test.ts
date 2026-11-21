import { describe, expect, it } from 'vitest';
import {
  bearingAtMidpoint,
  filterOrientationStubArtifacts,
  isEastStreetEntryKey,
  midpointAlong,
  stitchOrientationStreetFeatures,
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

  it('drops short cross-stubs and orphan dashes, keeps short corridor pieces', () => {
    const features = [
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.65], [-79.4, 43.66]] },
      },
      // Short N–S piece touching the long way — keep.
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.66], [-79.4, 43.6603]] },
      },
      // Short E–W cross-stub — drop.
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.655], [-79.3996, 43.655]] },
      },
      // Orphan short N–S dash far from the corridor — drop.
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.41, 43.64], [-79.41, 43.6403]] },
      },
      {
        properties: { entryKey: 'Bloor Street West', displayName: 'BLOOR' },
        geometry: { type: 'LineString', coordinates: [[-79.42, 43.67], [-79.40, 43.67]] },
      },
      // Short E–W piece touching Bloor — keep.
      {
        properties: { entryKey: 'Bloor Street West', displayName: 'BLOOR' },
        geometry: { type: 'LineString', coordinates: [[-79.40, 43.67], [-79.3996, 43.67]] },
      },
      // Short N–S cross-stub on Bloor — drop.
      {
        properties: { entryKey: 'Bloor Street West', displayName: 'BLOOR' },
        geometry: { type: 'LineString', coordinates: [[-79.41, 43.67], [-79.41, 43.6703]] },
      },
    ];
    const kept = filterOrientationStubArtifacts(features);
    expect(kept).toHaveLength(4);
    expect(kept.some((feature) => feature.geometry.coordinates[1]?.[0] === -79.3996
      && feature.properties?.displayName === 'YONGE')).toBe(false);
    expect(kept.some((feature) => feature.geometry.coordinates[0]?.[0] === -79.41
      && feature.properties?.displayName === 'YONGE')).toBe(false);
    expect(kept.some((feature) => feature.geometry.coordinates[1]?.[1] === 43.6703)).toBe(false);
  });

  it('stitches near-touching corridor pieces into fewer continuous lines', () => {
    const features = [
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.65], [-79.4, 43.651]] },
      },
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.651], [-79.4, 43.652]] },
      },
      {
        properties: { entryKey: 'Yonge Street', displayName: 'YONGE' },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.652], [-79.4, 43.653]] },
      },
    ];
    const stitched = stitchOrientationStreetFeatures(features);
    expect(stitched).toHaveLength(1);
    expect(stitched[0]?.geometry.coordinates.length).toBeGreaterThan(2);
  });
});
