/** Fixed HTML district name markers (Impact), above fills and below street/site chrome. */

/** Shared with site labels/icons and player pins — hide below this zoom together. */
export const DISTRICT_LABEL_MIN_ZOOM = 12.5;

/** Design offsets were authored as CSS pixels at this zoom; convert once to lng/lat. */
export const DISTRICT_LABEL_OFFSET_REF_ZOOM = 13;

export type DistrictLabelState = 'default' | 'hovered' | 'selected';

export type DistrictLabelOffset = {
  readonly x?: number;
  readonly y?: number;
  readonly rotateDeg?: number;
};

/** Screen-pixel nudges / rotations from the design notes, keyed by district feature key. */
export const DISTRICT_LABEL_OFFSETS: Readonly<Record<string, DistrictLabelOffset>> = {
  Waterfront: { x: 0, y: -100 },
  LakeOntario: { x: 300, y: -100 },
  LittlePortugal: { x: -200, y: 0 },
  CentreIsland: { x: 0, y: 50 },
  YongeStreet: { rotateDeg: 72 },
  DonRavine: { x: -25, y: 0, rotateDeg: 70 },
};

export interface DistrictHtmlLabelProperties {
  key: string;
  name: string;
}

/**
 * Convert design-time CSS pixel offsets into a fixed geographic delta so labels
 * stay locked to the map while zooming (unlike CSS `transform: translate`).
 */
export function offsetLngLatByRefPixels(
  lng: number,
  lat: number,
  dxPx: number,
  dyPx: number,
  refZoom: number = DISTRICT_LABEL_OFFSET_REF_ZOOM,
): [number, number] {
  if (dxPx === 0 && dyPx === 0) return [lng, lat];
  const earthCircumference = 2 * Math.PI * 6378137;
  const metersPerPixel = (Math.cos((lat * Math.PI) / 180) * earthCircumference) / (512 * 2 ** refZoom);
  const eastMeters = dxPx * metersPerPixel;
  const northMeters = -dyPx * metersPerPixel;
  const dLng = eastMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const dLat = northMeters / 110540;
  return [lng + dLng, lat + dLat];
}

export function districtLabelLngLat(
  key: string,
  coordinates: [number, number],
): [number, number] {
  const offset = DISTRICT_LABEL_OFFSETS[key];
  if (!offset) return coordinates;
  return offsetLngLatByRefPixels(
    coordinates[0],
    coordinates[1],
    offset.x ?? 0,
    offset.y ?? 0,
  );
}

/**
 * Outer node is the MapLibre Marker root (keeps `maplibregl-marker` classes).
 * Inner node carries Impact styling so hover/select can rewrite classes safely.
 * Rotation (only) may use CSS transform on the inner node — never translate.
 */
export function createDistrictLabelElement(
  name: string,
  state: DistrictLabelState = 'default',
  districtKey = '',
) {
  const root = document.createElement('div');
  root.dataset.districtKey = districtKey;
  const label = document.createElement('div');
  label.className = `district-html-label district-html-label--${state}`;
  if (districtKey) label.dataset.districtKey = districtKey;
  const rotateDeg = DISTRICT_LABEL_OFFSETS[districtKey]?.rotateDeg;
  if (rotateDeg) label.style.transform = `rotateZ(${rotateDeg}deg)`;
  label.textContent = name.toUpperCase();
  label.setAttribute('aria-hidden', 'true');
  root.appendChild(label);
  return root;
}

export function setDistrictLabelState(element: HTMLElement, state: DistrictLabelState) {
  const label = element.querySelector('.district-html-label') ?? element;
  const districtKey = element.dataset.districtKey
    ?? (label instanceof HTMLElement ? label.dataset.districtKey : undefined)
    ?? '';
  label.className = `district-html-label district-html-label--${state}`;
  if (label instanceof HTMLElement) {
    if (districtKey) label.dataset.districtKey = districtKey;
    const rotateDeg = DISTRICT_LABEL_OFFSETS[districtKey]?.rotateDeg;
    if (rotateDeg) label.style.transform = `rotateZ(${rotateDeg}deg)`;
    else label.style.transform = '';
  }
}
