import { describe, expect, it } from 'vitest';
import {
  majorityPinSiteKey,
  resolvePlayerPinHomeCenter,
  type PublicPlayerPin,
  type PublicPlayerPinsSnapshot,
} from './sessionPins';
import type { PublicSiteCollection } from './types';

const pins = (
  entries: Array<{ siteKey: string; visible?: boolean }>,
): PublicPlayerPin[] => entries.map((entry, index) => ({
  charKey: (['fomorach', 'rashid', 'lordLucien', 'aishe', 'blackCaesar'] as const)[index % 5]!,
  siteKey: entry.siteKey,
  visible: entry.visible !== false,
}));

describe('majorityPinSiteKey', () => {
  it('returns the site with the most visible pins', () => {
    expect(majorityPinSiteKey(pins([
      { siteKey: 'ArtGallery' },
      { siteKey: 'BierMarkt' },
      { siteKey: 'ArtGallery' },
      { siteKey: 'BierMarkt', visible: false },
    ]))).toBe('ArtGallery');
  });

  it('returns null when no visible pins exist', () => {
    expect(majorityPinSiteKey(pins([
      { siteKey: 'ArtGallery', visible: false },
    ]))).toBeNull();
  });

  it('breaks ties with the injected random picker', () => {
    const tied = pins([
      { siteKey: 'ArtGallery' },
      { siteKey: 'BierMarkt' },
    ]);
    expect(majorityPinSiteKey(tied, () => 0)).toBe('ArtGallery');
    expect(majorityPinSiteKey(tied, () => 0.99)).toBe('BierMarkt');
  });
});

describe('resolvePlayerPinHomeCenter', () => {
  const sites: PublicSiteCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'ArtGallery',
        properties: {
          key: 'ArtGallery',
          name: 'Art Gallery of Ontario',
          districtKey: 'WestQueenWest',
          icon: 'artGallery',
          hub: false,
        },
        geometry: { type: 'Point', coordinates: [-79.39, 43.65] },
      },
    ],
  };

  it('returns coordinates for the majority live site', () => {
    const snapshot: PublicPlayerPinsSnapshot = {
      schemaVersion: 1,
      sessionCode: 'tts-tr',
      updatedAt: '2026-11-21T00:00:00.000Z',
      live: true,
      pins: pins([{ siteKey: 'ArtGallery' }, { siteKey: 'ArtGallery' }]),
    };
    expect(resolvePlayerPinHomeCenter(snapshot, sites)).toEqual([-79.39, 43.65]);
  });

  it('returns null when the snapshot is not live', () => {
    const snapshot: PublicPlayerPinsSnapshot = {
      schemaVersion: 1,
      sessionCode: 'tts-tr',
      updatedAt: '2026-11-21T00:00:00.000Z',
      live: false,
      pins: pins([{ siteKey: 'ArtGallery' }]),
    };
    expect(resolvePlayerPinHomeCenter(snapshot, sites)).toBeNull();
  });
});
