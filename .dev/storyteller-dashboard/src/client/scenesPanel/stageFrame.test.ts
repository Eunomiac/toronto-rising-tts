import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseControlBoardSnaps } from "./catalogs";
import { boardToStage, stagePacks, stageToBoard } from "./stageFrame";

const snapsPath = join(dirname(fileURLToPath(import.meta.url)), "../../../data/control-board-snaps.json");
const snaps = parseControlBoardSnaps(JSON.parse(readFileSync(snapsPath, "utf8")));

describe("stage frame", () => {
  it("puts every board snap inside the drawing, above the seat row", () => {
    for (const snap of snaps.polar) {
      const point = boardToStage(snap.u, snap.v);
      expect(point.u).toBeGreaterThanOrEqual(0.06);
      expect(point.u).toBeLessThanOrEqual(0.94);
      expect(point.v).toBeGreaterThanOrEqual(0.06);
      expect(point.v).toBeLessThanOrEqual(0.75);
    }
  });

  it("keeps the board's centre line in the middle and round-trips", () => {
    expect(boardToStage(0.5, 0.45).u).toBeCloseTo(0.5, 3);
    const back = stageToBoard(...(Object.values(boardToStage(0.31, 0.62)) as [number, number]));
    expect(back.u).toBeCloseTo(0.31, 6);
    expect(back.v).toBeCloseTo(0.62, 6);
  });

  it("builds the ten named packs from the catalog", () => {
    const packs = stagePacks(snaps);
    expect(packs.map((pack) => pack.label).sort()).toEqual([
      "CENTER", "Center Left", "Center Right", "Far Center-Left", "Far Center-Right", "Far Left", "Far Right", "Mid Center",
      "Mid Left", "Mid Right"
    ]);
    const farLeft = packs.find((pack) => pack.label === "Far Left");
    expect(farLeft?.far).toBe(true);
    expect(farLeft?.slots).toHaveLength(6);
    const center = packs.find((pack) => pack.label === "CENTER");
    expect(center?.far).toBe(false);
    expect(center?.slots).toHaveLength(5);
  });
});
