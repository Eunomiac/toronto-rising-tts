/** Fixed HTML district name markers (Impact), above fills and below street/site chrome. */

export const DISTRICT_LABEL_MIN_ZOOM = 13.0001;

export type DistrictLabelState = 'default' | 'hovered' | 'selected';

export interface DistrictHtmlLabelProperties {
  key: string;
  name: string;
}

/**
 * Outer node is the MapLibre Marker root (keeps `maplibregl-marker` classes).
 * Inner node carries Impact styling so hover/select can rewrite classes safely.
 */
export function createDistrictLabelElement(name: string, state: DistrictLabelState = 'default') {
  const root = document.createElement('div');
  root.dataset.districtKey = '';
  const label = document.createElement('div');
  label.className = `district-html-label district-html-label--${state}`;
  label.textContent = name.toUpperCase();
  label.setAttribute('aria-hidden', 'true');
  root.appendChild(label);
  return root;
}

export function setDistrictLabelState(element: HTMLElement, state: DistrictLabelState) {
  const label = element.querySelector('.district-html-label') ?? element;
  label.className = `district-html-label district-html-label--${state}`;
}
