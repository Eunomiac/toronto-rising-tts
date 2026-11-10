import { describe, expect, it } from 'vitest';
import { featureBounds, selectedDistrictFromUrl } from './data';

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
});
