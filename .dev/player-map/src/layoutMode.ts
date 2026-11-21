export type DistrictLayoutMode = 'auto' | 'image' | 'panel';

export const DISTRICT_LAYOUT_STORAGE_KEY = 'toronto-rising-player-map-district-layout';
export const DISTRICT_LAYOUT_BREAKPOINT = '(min-width: 52rem)';

export function readStoredLayoutMode(): DistrictLayoutMode {
  try {
    const value = window.localStorage.getItem(DISTRICT_LAYOUT_STORAGE_KEY);
    if (value === 'auto' || value === 'image' || value === 'panel') return value;
  } catch {
    // ignore
  }
  return 'auto';
}

export function storeLayoutMode(mode: DistrictLayoutMode) {
  try {
    window.localStorage.setItem(DISTRICT_LAYOUT_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

/** Resolve Auto against the provisional desktop break (52rem). Forced modes ignore viewport. */
export function resolveImageChrome(mode: DistrictLayoutMode, matchesDesktop: boolean) {
  if (mode === 'image') return true;
  if (mode === 'panel') return false;
  return matchesDesktop;
}
