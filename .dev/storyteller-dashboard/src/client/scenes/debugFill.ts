import type { ControlBoardSnaps, PolarToken, SceneCatalogs, SceneDraft, SeatSlotRow } from "./types.js";
import { defaultSeatSlots } from "./payload.js";

export const DEBUG_FILL_CHARACTER_KEY = "rashid";

export type DebugFillBackup = {
  polar: PolarToken[];
  seatSlots: Record<string, SeatSlotRow>;
};

const cloneSeatSlots = (seatSlots: Record<string, SeatSlotRow>): Record<string, SeatSlotRow> => {
  const next: Record<string, SeatSlotRow> = {};
  for (const [key, row] of Object.entries(seatSlots)) {
    next[key] = { ...row };
  }
  return next;
};

export const captureDebugFillBackup = (draft: SceneDraft): DebugFillBackup => ({
  polar: draft.standard.polar.map((token) => ({ ...token })),
  seatSlots: cloneSeatSlots(draft.standard.seatSlots)
});

export const applyDebugFillToDraft = (
  draft: SceneDraft,
  snaps: ControlBoardSnaps,
  characterKey = DEBUG_FILL_CHARACTER_KEY
): void => {
  draft.standard.polar = snaps.polar.map((snap) => ({
    characterKey,
    snapIndex: snap.snapIndex,
    npcLightMode: snap.defaultLightMode === "STANDARD" ? "STANDARD" : "OFF"
  }));
  for (const seat of snaps.seats) {
    draft.standard.seatSlots[seat.seatKey] = {
      characterKey,
      isPlayingNPC: false,
      isPresent: true,
      tableSlot: seat.tableSlot,
      slotEmpty: false
    };
  }
};

export const restoreDebugFillBackup = (draft: SceneDraft, backup: DebugFillBackup): void => {
  draft.standard.polar = backup.polar.map((token) => ({ ...token }));
  draft.standard.seatSlots = cloneSeatSlots(backup.seatSlots);
};

export const restoreDefaultPcSeats = (draft: SceneDraft, catalogs: SceneCatalogs, snaps: ControlBoardSnaps): void => {
  const defaults = defaultSeatSlots(catalogs, snaps);
  for (const color of catalogs.playerColors) {
    const row = defaults[color];
    if (row) {
      draft.standard.seatSlots[color] = { ...row };
    }
  }
  for (const npcSeat of catalogs.npcSeats) {
    draft.standard.seatSlots[npcSeat] = {
      characterKey: "",
      isPlayingNPC: false,
      isPresent: false,
      slotEmpty: true
    };
  }
};
