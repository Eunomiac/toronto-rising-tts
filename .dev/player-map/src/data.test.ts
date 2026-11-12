import { afterEach, describe, expect, it } from 'vitest';
import {
  layerVisibilityFromUrl,
  selectedDistrictFromUrl,
  updateDistrictInUrl,
  updateLayersInUrl,
} from './data';

describe('shareable map URL helpers', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads and writes the selected district without losing other URL state', () => {
    expect(selectedDistrictFromUrl('?district=Rosedale')).toBe('Rosedale');
    expect(selectedDistrictFromUrl('')).toBeNull();

    window.history.replaceState(null, '', '/?calibrate=1&layers=regions');
    expect(updateDistrictInUrl('Annex')).toBe('/?calibrate=1&layers=regions&district=Annex');
    expect(updateDistrictInUrl(null)).toBe('/?calibrate=1&layers=regions');
  });

  it('reads and writes shareable layer visibility without losing other URL state', () => {
    expect(layerVisibilityFromUrl('')).toEqual({ districts: true, regions: false, sites: false, path: false });
    expect(layerVisibilityFromUrl('?layers=regions,sites,path')).toEqual({ districts: false, regions: true, sites: true, path: true });

    window.history.replaceState(null, '', '/?district=Rosedale&calibrate=1');
    expect(updateLayersInUrl({ districts: true, regions: true, sites: false, path: false }))
      .toBe('/?district=Rosedale&calibrate=1&layers=districts%2Cregions');

    window.history.replaceState(null, '', '/?district=Rosedale&layers=regions');
    expect(updateLayersInUrl({ districts: true, regions: false, sites: false, path: false }))
      .toBe('/?district=Rosedale');
  });
});
