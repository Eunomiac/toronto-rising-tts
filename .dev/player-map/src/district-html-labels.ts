/** Fixed HTML district name markers (Impact), above fills and below street/site chrome. */

/** Shared with site labels/icons and player pins — hide below this zoom together. */
export const DISTRICT_LABEL_MIN_ZOOM = 12.5;

export type DistrictLabelState = 'default' | 'hovered' | 'selected';

export interface DistrictHtmlLabelProperties {
  key: string;
  name: string;
}

/**
 * Outer node is the MapLibre Marker root (keeps `maplibregl-marker` classes).
 * Inner node carries Impact styling so hover/select can rewrite classes safely.
 * Per-district screen-space nudges live on the inner node via `data-district-key` CSS.
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
  if (label instanceof HTMLElement && districtKey) {
    label.dataset.districtKey = districtKey;
  }
}
