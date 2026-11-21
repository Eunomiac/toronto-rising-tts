import { describe, expect, it } from 'vitest';
import { resolveImageChrome } from './layoutMode';

describe('resolveImageChrome', () => {
  it('forces image or panel regardless of viewport', () => {
    expect(resolveImageChrome('image', false)).toBe(true);
    expect(resolveImageChrome('panel', true)).toBe(false);
  });

  it('uses the desktop media query in auto mode', () => {
    expect(resolveImageChrome('auto', true)).toBe(true);
    expect(resolveImageChrome('auto', false)).toBe(false);
  });
});
