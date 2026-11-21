import { describe, expect, it } from 'vitest';
import { districtLabelLngLat, offsetLngLatByRefPixels } from './district-html-labels';

describe('offsetLngLatByRefPixels', () => {
  it('returns the same point when the pixel offset is zero', () => {
    expect(offsetLngLatByRefPixels(-79.4, 43.65, 0, 0)).toEqual([-79.4, 43.65]);
  });

  it('moves north when the design offset is negative Y', () => {
    const [lng, lat] = offsetLngLatByRefPixels(-79.4, 43.65, 0, -100);
    expect(lng).toBeCloseTo(-79.4, 6);
    expect(lat).toBeGreaterThan(43.65);
  });

  it('moves east when the design offset is positive X', () => {
    const [lng, lat] = offsetLngLatByRefPixels(-79.4, 43.65, 300, 0);
    expect(lng).toBeGreaterThan(-79.4);
    expect(lat).toBeCloseTo(43.65, 5);
  });
});

describe('districtLabelLngLat', () => {
  it('applies Waterfront’s authored pixel nudge as a geographic delta', () => {
    const base: [number, number] = [-79.38, 43.64];
    const [lng, lat] = districtLabelLngLat('Waterfront', base);
    expect(lng).toBeCloseTo(base[0], 6);
    expect(lat).toBeGreaterThan(base[1]);
  });

  it('leaves districts without a nudge at their catalog coordinates', () => {
    const base: [number, number] = [-79.3973926, 43.6717204];
    expect(districtLabelLngLat('Yorkville', base)).toEqual(base);
  });
});
