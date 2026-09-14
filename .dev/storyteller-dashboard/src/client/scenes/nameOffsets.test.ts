import { describe, expect, it } from "vitest";
import { formatNameOffsetsClipboard, roundOffset } from "./nameOffsets";

describe("nameOffsets", () => {
  it("copies polar and seat offsets as JSON", () => {
    expect(
      JSON.parse(
        formatNameOffsetsClipboard(
          { "12": { ox: 4, oy: -8, align: "center" } },
          { Orange: { ox: 0, oy: 6, align: "left" } }
        )
      )
    ).toEqual({
      polar: { "12": { ox: 4, oy: -8, align: "center" } },
      seats: { Orange: { ox: 0, oy: 6, align: "left" } }
    });
  });

  it("rounds dragged pixels to one decimal", () => {
    expect(roundOffset(4.16)).toBe(4.2);
  });
});
