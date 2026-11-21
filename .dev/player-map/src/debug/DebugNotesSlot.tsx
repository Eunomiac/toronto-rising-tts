import type { Map } from 'maplibre-gl';
import type { DistrictLayoutMode } from '../layoutMode';
import type { DistrictFeatureCollection } from '../types';

export interface DebugNotesSlotProps {
  readonly map: Map | null;
  readonly districts: DistrictFeatureCollection | null;
  readonly selectedDistrict: string | null;
  readonly layoutMode?: DistrictLayoutMode;
  readonly onLayoutModeChange?: (mode: DistrictLayoutMode) => void;
}

/** Production replacement: Vite aliases the development implementation away completely. */
export function DebugNotesSlot(_props: DebugNotesSlotProps) {
  return null;
}
