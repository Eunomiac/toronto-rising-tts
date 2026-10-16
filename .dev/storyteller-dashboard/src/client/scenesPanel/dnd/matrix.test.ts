import { describe, expect, it } from "vitest";
import { allMatrixPairs, edgesWithBins, matrixCell, panelBinsFor } from "./matrix";
import { DRAG_KINDS, DROP_KINDS } from "./types";

describe("dnd matrix", () => {
  it("defines a cell for every drag × drop pair", () => {
    const pairs = allMatrixPairs();
    expect(pairs).toHaveLength(DRAG_KINDS.length * DROP_KINDS.length);
    for (const { cell } of pairs) {
      expect(cell.kind).toMatch(/^(noop|impossible|action|conditional|panel|hover)$/);
    }
  });

  it("opens character primary bins on panel A", () => {
    const bins = panelBinsFor("npcStaged", "A");
    expect(bins.map((bin) => bin.action)).toContain("initiateStandard");
    expect(bins.map((bin) => bin.action)).toContain("initiateContested");
  });

  it("keeps secret postroll broadcasts secret-safe on stage", () => {
    const cell = matrixCell("npcRollPostrollSecret", "stage");
    expect(cell.kind).toBe("action");
    if (cell.kind === "action") {
      expect(cell.secretSafe).toBe(true);
      expect(cell.action).toBe("broadcastRollSecret");
    }
  });

  it("lists edges with bins for a seated PC", () => {
    expect(edgesWithBins("pcSeated")).toEqual(["A", "B", "C"]);
  });

  it("treats active scene onto itself as impossible", () => {
    expect(matrixCell("sceneActive", "sceneActive").kind).toBe("impossible");
  });

  it("uses hover difficulty when a preroll meets an NPC token", () => {
    const cell = matrixCell("pcRollPreroll", "npcStaged");
    expect(cell.kind).toBe("hover");
    if (cell.kind === "hover") {
      expect(cell.bins.length).toBeGreaterThanOrEqual(2);
    }
  });
});
