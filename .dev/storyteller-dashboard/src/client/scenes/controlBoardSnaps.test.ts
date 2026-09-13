import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { polarAreaNameForFamily, parseControlBoardSnaps } from "./payload";

const snapsPath = join(dirname(fileURLToPath(import.meta.url)), "../../../data/control-board-snaps.json");
const csvPath = join(dirname(fileURLToPath(import.meta.url)), "../../../agent/TTS Stage Control Board Snap Coordinates.csv");

describe("control-board polar families", () => {
  const snaps = parseControlBoardSnaps(JSON.parse(readFileSync(snapsPath, "utf8")));
  const byFamily = new Map<string, { n: number; ks: number[] }>();
  for (const snap of snaps.polar) {
    const row = byFamily.get(snap.familyId) ?? { n: 0, ks: [] };
    row.n += 1;
    row.ks.push(snap.familyK);
    byFamily.set(snap.familyId, row);
  }

  it("keeps five snaps on CENTER and both Center Left/Right packs", () => {
    expect(byFamily.get("1:0")?.n).toBe(5);
    expect(byFamily.get("1:1")?.n).toBe(5);
    expect(byFamily.get("1:7")?.n).toBe(5);
  });

  it("keeps five snaps on each Mid pack", () => {
    expect(byFamily.get("2:2")?.n).toBe(5);
    expect(byFamily.get("2:3")?.n).toBe(5);
    expect(byFamily.get("2:4")?.n).toBe(5);
  });

  it("keeps six snaps on each Far pack", () => {
    expect(byFamily.get("3:0")?.n).toBe(6);
    expect(byFamily.get("4:0")?.n).toBe(6);
    expect(byFamily.get("5:0")?.n).toBe(6);
    expect(byFamily.get("6:0")?.n).toBe(6);
  });

  it("records STAGE_BOARD scale from the save used at generate time", () => {
    expect(snaps.stageBoard?.guid).toMatch(/^[0-9a-f]+$/i);
    expect(snaps.stageBoard?.scaleX).toBeGreaterThan(0);
    expect(snaps.stageBoard?.scaleZ).toBeGreaterThan(0);
  });

  it("uses STAGE Transform scale as stagger half-extents (not scale/2)", () => {
    const stage = snaps.stageBoard;
    expect(stage).toBeDefined();
    expect(stage?.halfWidthX).toBeCloseTo(Math.abs(stage?.scaleX ?? 0), 5);
    expect(stage?.halfDepthZ).toBeCloseTo(Math.abs(stage?.scaleZ ?? 0), 5);
  });

  it("matches in-game CONTROL_BOARD snap UVs from the coordinate CSV", () => {
    const byArea = new Map<string, { u: number; v: number }[]>();
    for (const line of readFileSync(csvPath, "utf8").trim().split(/\r?\n/).slice(1)) {
      const [area, , u, v] = line.split(",");
      if (!area || u === undefined || v === undefined) {
        continue;
      }
      const rows = byArea.get(area) ?? [];
      rows.push({ u: Number(u), v: Number(v) });
      byArea.set(area, rows);
    }
    const misses: string[] = [];
    for (const snap of snaps.polar) {
      const area = polarAreaNameForFamily(snaps, snap.familyId);
      const rows = byArea.get(area) ?? [];
      let best = Number.POSITIVE_INFINITY;
      for (const row of rows) {
        const d = Math.hypot(row.u - snap.u, row.v - snap.v);
        if (d < best) {
          best = d;
        }
      }
      if (best > 1e-4) {
        misses.push(`${area} k=${snap.familyK} d=${best.toFixed(6)}`);
      }
    }
    expect(misses).toEqual([]);
  });

  it("leaves each pack's center token as familyK 0", () => {
    for (const familyId of ["1:0", "1:1", "1:7", "2:2", "2:3", "2:4"]) {
      const members = snaps.polar.filter((snap) => snap.familyId === familyId);
      const anchor = members.find((snap) => snap.isAnchor);
      expect(anchor?.familyK).toBe(0);
    }
  });
});
