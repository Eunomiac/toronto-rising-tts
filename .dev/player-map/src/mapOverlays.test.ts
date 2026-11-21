import { describe, expect, it } from 'vitest';
import { homesteadFillOpacity, huntingFillOpacity } from './mapOverlays';

describe('overlay opacity curves', () => {
  it('makes harder hunts more transparent', () => {
    expect(huntingFillOpacity(null)).toBe(0);
    expect(huntingFillOpacity(2)).toBeGreaterThan(huntingFillOpacity(6)!);
    expect(huntingFillOpacity(6)).toBeLessThan(1);
  });

  it('brightens homestead overlays as the trait rises', () => {
    expect(homesteadFillOpacity(0)).toBe(0);
    expect(homesteadFillOpacity(6)).toBeGreaterThan(homesteadFillOpacity(1));
    expect(homesteadFillOpacity(6)).toBeLessThan(1);
  });
});
