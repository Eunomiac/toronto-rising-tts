import { describe, expect, it } from "vitest";
import { paintDamageTrack, paintHumanityTrack, resolveDotSlot } from "./paint.js";

describe("resolveDotSlot", () => {
  it("paints yellow for base fills", () => {
    expect(resolveDotSlot("wits", 3, 0, 0, 2)).toEqual({ active: true, image: "dot_yellow" });
    expect(resolveDotSlot("wits", 3, 0, 0, 4).active).toBe(false);
  });

  it("paints white for temporary increases", () => {
    expect(resolveDotSlot("finance", 2, 1, 0, 3)).toEqual({ active: true, image: "dot_white" });
  });

  it("paints grey for temporary decreases", () => {
    expect(resolveDotSlot("occult", 3, -1, 0, 3)).toEqual({ active: true, image: "dot_grey" });
  });

  it("greys disabled dots from the right of the filled line", () => {
    expect(resolveDotSlot("wits", 3, 0, 1, 3)).toEqual({ active: true, image: "dot_grey" });
    expect(resolveDotSlot("wits", 3, 0, 1, 2)).toEqual({ active: true, image: "dot_yellow" });
  });

  it("uses red for blood potency", () => {
    expect(resolveDotSlot("bloodPotency", 2, 0, 0, 1)).toEqual({ active: true, image: "dot_red" });
  });
});

describe("paintDamageTrack", () => {
  it("fills aggravated then superficial from the left and keeps empty boxes", () => {
    const boxes = paintDamageTrack({
      base: 5, temp: 0, disabled: 0, superficial: 2, aggravated: 1, stains: 0
    }, 5);
    expect(boxes[0]).toMatchObject({ layer: "aggravated", image: "box_red_x" });
    expect(boxes[1]).toMatchObject({ layer: "superficial", image: "box_grey_slash" });
    expect(boxes[2]).toMatchObject({ layer: "superficial" });
    expect(boxes[3]).toMatchObject({ layer: "undamaged", image: "box_white" });
    expect(boxes[5]).toEqual({ active: false });
    expect(boxes).toHaveLength(10);
  });
});

describe("paintHumanityTrack", () => {
  it("applies stains from the right and impairs on collision", () => {
    const boxes = paintHumanityTrack({
      base: 7, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 2
    }, 7);
    expect(boxes[6]).toMatchObject({ layer: "filled" });
    expect(boxes[8]).toMatchObject({ layer: "stain", image: "box_purple" });
    expect(boxes[9]).toMatchObject({ layer: "stain" });
  });
});
