import { describe, expect, it } from "vitest";
import { computeAutoCrop } from "./autoCrop";

const W = 160;
const H = 400;

/** RGBA buffer with an opaque centred span of `widthAt(y)` pixels on each row. */
const silhouette = (widthAt: (y: number) => number, centre = W / 2): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    const half = widthAt(y) / 2;
    for (let x = Math.max(0, Math.round(centre - half)); x < Math.min(W, Math.round(centre + half)); x += 1) {
      data[(y * W + x) * 4 + 3] = 255;
    }
  }
  return data;
};

/** Head rows 10–58 (oval, 44 px wide), neck 58–68 (18 px), shoulders from 68 (100 px), feet at 395. */
const person = (y: number): number => {
  if (y < 10 || y > 395) {
    return 0;
  }
  if (y < 58) {
    const t = (y - 34) / 24;
    return Math.round(44 * Math.sqrt(Math.max(0, 1 - t * t)));
  }
  if (y < 68) {
    return 18;
  }
  return 100;
};

describe("computeAutoCrop", () => {
  it("is confident on a clear head, neck, and shoulders and keeps the chin in frame", () => {
    const { crop, confidence } = computeAutoCrop(silhouette(person), W, H);
    expect(confidence).toBe("confident");
    expect(crop.cx).toBeCloseTo(0.5, 2);
    const bottom = crop.cy + crop.size / 2;
    expect(bottom * H).toBeGreaterThan(62);
    expect((crop.cy - crop.size / 2) * H).toBeLessThan(34);
  });

  it("centres on the head when the figure stands off-centre", () => {
    const { crop } = computeAutoCrop(silhouette(person, 60), W, H);
    expect(crop.cx * W).toBeCloseTo(60, 0);
  });

  it("calls a neckless block a guess", () => {
    const { confidence } = computeAutoCrop(silhouette((y) => (y >= 10 && y <= 395 ? 60 : 0)), W, H);
    expect(confidence).toBe("guessed");
  });

  it("returns a fallback for an empty image", () => {
    const { confidence, reason } = computeAutoCrop(new Uint8ClampedArray(W * H * 4), W, H);
    expect(confidence).toBe("guessed");
    expect(reason).toBe("no figure found");
  });
});
