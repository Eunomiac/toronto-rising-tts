import type { Map } from 'maplibre-gl';

export interface DebugNotesSlotProps {
  readonly map: Map | null;
  readonly selectedDistrict: string | null;
}

/** Production replacement: Vite aliases the development implementation away completely. */
export function DebugNotesSlot(_props: DebugNotesSlotProps) {
  return null;
}
