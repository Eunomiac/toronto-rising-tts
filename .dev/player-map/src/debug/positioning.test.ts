import { describe, expect, it } from 'vitest';
import { interfaceAnchor, pointForAnchor } from './positioning';

describe('debug note positioning', () => {
  it('stores interface coordinates as normalized positions inside a stable surface', () => {
    const rect = new DOMRect(100, 200, 400, 300);
    expect(interfaceAnchor('district-panel', rect, 300, 275)).toEqual({
      kind: 'interface',
      surface: 'district-panel',
      x: 0.5,
      y: 0.25,
    });
  });

  it('repositions viewport anchors after a viewport size change', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    expect(pointForAnchor({ kind: 'interface', surface: 'viewport', x: 0.25, y: 0.75 }, null)).toEqual({ x: 250, y: 600 });
  });
});
