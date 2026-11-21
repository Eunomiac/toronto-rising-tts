/** Fixed HTML district name markers (Impact), above fills and below street/site chrome. */

export const DISTRICT_LABEL_MIN_ZOOM = 13.0001;

export interface DistrictHtmlLabelProperties {
  key: string;
  name: string;
}

export function createDistrictLabelElement(name: string, state: 'default' | 'hovered' | 'selected' = 'default') {
  const element = document.createElement('div');
  element.className = `district-html-label district-html-label--${state}`;
  element.textContent = name.toUpperCase();
  element.setAttribute('aria-hidden', 'true');
  element.dataset.districtKey = '';
  return element;
}

export function setDistrictLabelState(element: HTMLElement, state: 'default' | 'hovered' | 'selected') {
  element.className = `district-html-label district-html-label--${state}`;
}
