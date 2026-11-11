import type { Map } from 'maplibre-gl';
import type { DebugNoteAnchor, DebugNoteContext } from './types';

export const VIEWPORT_SURFACE = 'viewport';
export const MAP_SURFACE = 'map';

export type ScreenPoint = { readonly x: number; readonly y: number };

export function interfaceAnchor(surface: string, rect: DOMRect, clientX: number, clientY: number): DebugNoteAnchor {
  const x = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
  const y = rect.height === 0 ? 0 : (clientY - rect.top) / rect.height;
  return { kind: 'interface', surface, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

export function pointForAnchor(anchor: DebugNoteAnchor, map: Map | null): ScreenPoint | null {
  if (anchor.kind === 'map') {
    if (!map) return null;
    const point = map.project([anchor.longitude, anchor.latitude]);
    const rect = map.getContainer().getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }
  if (anchor.surface === VIEWPORT_SURFACE) {
    return { x: window.innerWidth * anchor.x, y: window.innerHeight * anchor.y };
  }
  const element = document.querySelector<HTMLElement>(`[data-note-surface="${anchor.surface}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width * anchor.x, y: rect.top + rect.height * anchor.y };
}

export function contextSnapshot(map: Map | null, selectedDistrict: string | null): DebugNoteContext {
  const center = map?.getCenter();
  return {
    url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    selectedDistrict,
    ...(map && center ? { map: { center: [center.lng, center.lat], zoom: map.getZoom() } } : {}),
  };
}
