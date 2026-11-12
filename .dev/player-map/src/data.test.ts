import { describe, expect, it } from 'vitest';
import {
  featureBounds,
  layerVisibilityFromUrl,
  selectedDistrictFromUrl,
  updateLayersInUrl,
} from './data';

describe('map data helpers', () => {
  it('calculates bounds across multipolygon coordinates', () => {
    expect(featureBounds([[[[-79.4, 43.6], [-79.3, 43.7], [-79.4, 43.6]]]])).toEqual([
      [-79.4, 43.6],
      [-79.3, 43.7],
    ]);
  });

  it('reads a shareable district selection', () => {
    expect(selectedDistrictFromUrl('?district=Rosedale')).toBe('Rosedale');
    expect(selectedDistrictFromUrl('')).toBeNull();
  });

  it('reads and writes shareable layer visibility without losing other URL state', () => {
    expect(layerVisibilityFromUrl('')).toEqual({ districts: true, regions: false, sites: false, path: false, orientation: true });
    expect(layerVisibilityFromUrl('?layers=regions,sites,path')).toEqual({ districts: false, regions: true, sites: true, path: true, orientation: false });

    window.history.replaceState(null, '', '/?district=Rosedale&calibrate=1');
    expect(updateLayersInUrl({ districts: true, regions: true, sites: false, path: false, orientation: true }))
      .toBe('/?district=Rosedale&calibrate=1&layers=districts%2Cregions%2Corientation');

    window.history.replaceState(null, '', '/?district=Rosedale&layers=regions');
    expect(updateLayersInUrl({ districts: true, regions: false, sites: false, path: false, orientation: true }))
      .toBe('/?district=Rosedale');
  });
});
