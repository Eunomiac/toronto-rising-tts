import { describe, expect, it } from "vitest";
import { applyDebugFillToDraft, captureDebugFillBackup, restoreDebugFillBackup } from "./debugFill";
import { createDefaultDraft } from "./payload";
import type { ControlBoardSnaps, PolarSnap, SceneCatalogs, SeatSnap } from "./types";

const polar = (row: Pick<PolarSnap, "snapIndex" | "familyId">): PolarSnap => ({
  snapKind: "polar",
  ringIndex: 1,
  rayIndex: 0,
  familyK: 0,
  isAnchor: true,
  u: 0.5,
  v: 0.5,
  defaultLightMode: "STANDARD",
  ...row
});

const seat = (row: Pick<SeatSnap, "snapIndex" | "seatKey" | "tableSlot">): SeatSnap => ({
  snapKind: "seat",
  kind: "npc",
  u: 0.5,
  v: 0.12,
  ...row
});

const snaps: ControlBoardSnaps = {
  generatedBy: "test",
  polar: [polar({ snapIndex: 1, familyId: "1:0" }), polar({ snapIndex: 2, familyId: "1:1" })],
  seats: [seat({ snapIndex: 3, seatKey: "NPC1", tableSlot: 8 }), seat({ snapIndex: 4, seatKey: "Red", tableSlot: 3 })],
  scatter: { areaOrder: [], areas: {} }
};

const catalogs = {
  generatedBy: "test",
  playerColors: ["Red"],
  npcSeats: ["NPC1"],
  pcs: [],
  namedNpcs: [{ characterKey: "rashid", fullName: "Rashid Abdulrahman", isPC: false, groups: [], pickerGroups: [] }],
  districts: [],
  sites: [],
  tables: [{ key: "Table A", slotCapacity: 9 }],
  lightModes: ["IndoorDim"],
  skyboxes: [],
  locationTracks: [],
  backgroundMoods: [],
  weatherConditions: [],
  conditions: [],
  pickerGroupLabels: {}
} as unknown as SceneCatalogs;

describe("applyDebugFillToDraft", () => {
  it("puts Rashid on every polar snap and seat", () => {
    const draft = createDefaultDraft(catalogs, snaps);
    draft.standard.polar = [{ characterKey: "lexie", snapIndex: 1, npcLightMode: "OFF" }];
    const backup = captureDebugFillBackup(draft);
    applyDebugFillToDraft(draft, snaps);
    expect(draft.standard.polar).toHaveLength(2);
    expect(draft.standard.polar.every((token) => token.characterKey === "rashid")).toBe(true);
    expect(draft.standard.seatSlots.NPC1?.characterKey).toBe("rashid");
    expect(draft.standard.seatSlots.Red?.characterKey).toBe("rashid");
    restoreDebugFillBackup(draft, backup);
    expect(draft.standard.polar).toEqual([{ characterKey: "lexie", snapIndex: 1, npcLightMode: "OFF" }]);
  });
});
