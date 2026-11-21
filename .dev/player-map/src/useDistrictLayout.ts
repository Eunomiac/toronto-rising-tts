import { useEffect, useState } from 'react';
import {
  DISTRICT_LAYOUT_BREAKPOINT,
  type DistrictLayoutMode,
  readStoredLayoutMode,
  resolveImageChrome,
  storeLayoutMode,
} from './layoutMode';

/** Author/debug layout mode + whether image chrome should show. */
export function useDistrictLayout(allowForce: boolean) {
  const [mode, setModeState] = useState<DistrictLayoutMode>(() => (
    allowForce ? readStoredLayoutMode() : 'auto'
  ));
  const [matchesDesktop, setMatchesDesktop] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(DISTRICT_LAYOUT_BREAKPOINT).matches : false
  ));

  useEffect(() => {
    const media = window.matchMedia(DISTRICT_LAYOUT_BREAKPOINT);
    const onChange = () => setMatchesDesktop(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setMode = (next: DistrictLayoutMode) => {
    if (!allowForce && next !== 'auto') return;
    setModeState(next);
    if (allowForce) storeLayoutMode(next);
  };

  return {
    mode: allowForce ? mode : 'auto' as DistrictLayoutMode,
    setMode,
    useImageChrome: resolveImageChrome(allowForce ? mode : 'auto', matchesDesktop),
  };
}
