import { describe, expect, it } from "vitest";
import { parseScenesReply } from "./bridge";
import { coalesceCommands, mergedStageChanges, type ScenesCommand } from "./commands";

describe("coalesceCommands", () => {
  it("keeps only the last volume per lane and the last real-time setting, in place", () => {
    const batch: ScenesCommand[] = [
      { op: "laneVolume", lane: "music", volume: 0.2 },
      { op: "featuredPlay", key: "TR_Loop" },
      { op: "laneVolume", lane: "rain", volume: 0.5 },
      { op: "realTime", running: true, speed: 1 },
      { op: "laneVolume", lane: "music", volume: 0.4 },
      { op: "realTime", running: true, speed: 5 }
    ];
    expect(coalesceCommands(batch)).toEqual([
      { op: "featuredPlay", key: "TR_Loop" },
      { op: "laneVolume", lane: "rain", volume: 0.5 },
      { op: "laneVolume", lane: "music", volume: 0.4 },
      { op: "realTime", running: true, speed: 5 }
    ]);
  });

  it("never drops one-shot commands", () => {
    const batch: ScenesCommand[] = [{ op: "spotlightRotate", delta: 1 }, { op: "spotlightRotate", delta: 1 }];
    expect(coalesceCommands(batch)).toHaveLength(2);
  });

  it("merges stage edits into one write, split at Clear and Reset", () => {
    const batch: ScenesCommand[] = [
      { op: "stage", changes: { a: { u: 0.1, v: 0.1 } } },
      { op: "lighting", presetKey: "AdminDark" },
      { op: "stage", changes: { a: { u: 0.2, v: 0.2 }, b: { remove: true } } },
      { op: "stage", clear: true },
      { op: "stage", changes: { c: { u: 0.3, v: 0.3, lightMode: "STANDARD" } } }
    ];
    expect(coalesceCommands(batch)).toEqual([
      { op: "lighting", presetKey: "AdminDark" },
      { op: "stage", changes: { a: { u: 0.2, v: 0.2 }, b: { remove: true } } },
      { op: "stage", clear: true },
      { op: "stage", changes: { c: { u: 0.3, v: 0.3, lightMode: "STANDARD" } } }
    ]);
  });
});

describe("mergedStageChanges", () => {
  it("folds queued stage edits, later ones winning", () => {
    expect(mergedStageChanges([
      { op: "stage", changes: { a: { u: 0.1, v: 0.1 } } },
      { op: "topFog", on: true },
      { op: "stage", changes: { a: { remove: true } } }
    ])).toEqual({ a: { remove: true } });
  });
});

describe("parseScenesReply", () => {
  it("reads the JSON reply", () => {
    expect(parseScenesReply({ returnValue: '{"ok":true}' })).toEqual({ ok: true });
    expect(parseScenesReply({ returnValue: '{"ok":false,"error":"Nope","failedIndex":1}' })).toEqual({ ok: false, error: "Nope" });
    expect(parseScenesReply({ returnValue: '{"ok":false,"loading":true,"error":"Loading"}' })).toEqual({ ok: false, error: "Loading", loading: true });
  });

  it("explains a missing Global entry and a timeout in plain words", () => {
    expect(parseScenesReply({ error: "attempt to call a nil value" }).error).toMatch(/Save & Play/);
    expect(parseScenesReply({ timedOut: true }).error).toMatch(/did not answer/);
  });
});
