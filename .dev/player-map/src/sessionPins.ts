import { DISTRICT_LABEL_MIN_ZOOM } from './district-html-labels';
import type { PublicSiteCollection } from './types';

export type PublicPlayerPin = {
  charKey: 'fomorach' | 'rashid' | 'lordLucien' | 'aishe' | 'blackCaesar';
  siteKey: string;
  visible: boolean;
};

export type PublicPlayerPinsSnapshot = {
  schemaVersion: 1;
  sessionCode: string;
  updatedAt: string;
  live: boolean;
  pins: PublicPlayerPin[];
};

export const PLAYER_PIN_ART: Record<PublicPlayerPin['charKey'], string> = {
  fomorach: '/assets/images/playerPins/playerPin_fomorach.webp',
  rashid: '/assets/images/playerPins/playerPin_rashid.webp',
  lordLucien: '/assets/images/playerPins/playerPin_lordLucien.webp',
  aishe: '/assets/images/playerPins/playerPin_aishe.webp',
  blackCaesar: '/assets/images/playerPins/playerPin_blackCaesar.webp',
};

/** Match district/site HTML label hide zoom. */
export const PLAYER_PIN_MIN_ZOOM = DISTRICT_LABEL_MIN_ZOOM;

export const TORONTO_HOME: [number, number] = [-79.3832, 43.6532];
export const PLAYER_MAP_HOME_ZOOM = 12.5;

export function sessionCodeFromUrl(search: string): string | null {
  const value = new URLSearchParams(search).get('session');
  if (!value || !/^[A-Za-z0-9_-]{6,64}$/.test(value)) return null;
  return value;
}

export async function fetchSessionPins(
  sessionCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicPlayerPinsSnapshot | null> {
  const response = await fetchImpl(`/api/session/${encodeURIComponent(sessionCode)}/pins`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load session pins (${response.status})`);
  return response.json() as Promise<PublicPlayerPinsSnapshot>;
}

function siteCoordinates(sites: PublicSiteCollection, siteKey: string): [number, number] | null {
  const feature = sites.features.find((item) => item.properties.key === siteKey);
  if (!feature || feature.geometry.type !== 'Point') return null;
  const [lng, lat] = feature.geometry.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return [lng, lat];
}

/**
 * Site key with the most visible pins. Ties pick randomly among tied keys
 * (inject `random` for tests).
 */
export function majorityPinSiteKey(
  pins: readonly PublicPlayerPin[],
  random: () => number = Math.random,
): string | null {
  const counts = new Map<string, number>();
  for (const pin of pins) {
    if (!pin.visible) continue;
    counts.set(pin.siteKey, (counts.get(pin.siteKey) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let bestCount = 0;
  const tied: string[] = [];
  for (const [siteKey, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      tied.length = 0;
      tied.push(siteKey);
    } else if (count === bestCount) {
      tied.push(siteKey);
    }
  }
  if (tied.length === 0) return null;
  if (tied.length === 1) return tied[0] ?? null;
  const index = Math.floor(random() * tied.length);
  return tied[index] ?? tied[0] ?? null;
}

/** Camera center for densest live pins, or null when none are visible. */
export function resolvePlayerPinHomeCenter(
  snapshot: PublicPlayerPinsSnapshot | null | undefined,
  sites: PublicSiteCollection,
  random: () => number = Math.random,
): [number, number] | null {
  if (!snapshot?.live) return null;
  const siteKey = majorityPinSiteKey(snapshot.pins, random);
  if (!siteKey) return null;
  return siteCoordinates(sites, siteKey);
}
