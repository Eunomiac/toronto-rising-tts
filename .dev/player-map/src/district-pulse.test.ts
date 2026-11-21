import { describe, expect, it } from 'vitest';
import { districtPulseAmount, districtPulseFrame, mixHex } from './district-pulse';

describe('district pulse', () => {
  it('rests, peaks one second later, and returns at two seconds', () => {
    expect(districtPulseAmount(0)).toBeCloseTo(0);
    expect(districtPulseAmount(500)).toBeCloseTo(0.5);
    expect(districtPulseAmount(1000)).toBeCloseTo(1);
    expect(districtPulseAmount(1500)).toBeCloseTo(0.5);
    expect(districtPulseAmount(2000)).toBeCloseTo(0);
  });

  it('moves fill, glow, and stroke across the authored range', () => {
    const rest = districtPulseFrame(0);
    const peak = districtPulseFrame(1);
    expect(rest.fillOpacity).toBeCloseTo(0.06);
    expect(peak.fillOpacity).toBeCloseTo(0.12);
    expect(rest.lineWidth).toBeCloseTo(2);
    expect(peak.lineWidth).toBeCloseTo(3);
    expect(rest.glowWidth).toBeCloseTo(9);
    expect(peak.glowWidth).toBeCloseTo(16);
    expect(rest.glowBlur).toBeCloseTo(6);
    expect(peak.glowBlur).toBeCloseTo(14);
    expect(rest.strokeColor).toBe('#ff6b72');
    expect(peak.strokeColor).toBe('#ffffff');
  });

  it('blends the district red toward white', () => {
    expect(mixHex('#ff0000', '#ffffff', 0)).toBe('#ff0000');
    expect(mixHex('#ff0000', '#ffffff', 0.5)).toBe('#ff8080');
    expect(mixHex('#ff0000', '#ffffff', 1)).toBe('#ffffff');
  });
});