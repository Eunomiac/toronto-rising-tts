import type { ControlBoardSnaps, PolarSnap, SceneCatalogs, SceneDraft, SeatSlotRow } from "./types.js";

const MAX_SLOT_UNKNOWN_TABLE = 10;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseSceneCatalogs = (value: unknown): SceneCatalogs => {
  if (!isRecord(value) || !Array.isArray(value.playerColors) || !Array.isArray(value.namedNpcs)) {
    throw new Error("scene-catalogs.json is missing required arrays.");
  }
  return value as SceneCatalogs;
};

export const parseControlBoardSnaps = (value: unknown): ControlBoardSnaps => {
  if (!isRecord(value) || !Array.isArray(value.polar) || !Array.isArray(value.seats)) {
    throw new Error("control-board-snaps.json is missing polar/seats arrays.");
  }
  return value as ControlBoardSnaps;
};

export const PC_BY_COLOR: Record<string, string> = {
  Brown: "fomorach",
  Orange: "rashid",
  Red: "lordLucien",
  Pink: "aishe",
  Purple: "blackCaesar"
};

export const characterLabel = (catalogs: SceneCatalogs, characterKey: string): string => {
  const pc = catalogs.pcs.find((row) => row.characterKey === characterKey);
  if (pc) {
    return pc.fullName;
  }
  const npc = catalogs.namedNpcs.find((row) => row.characterKey === characterKey);
  return npc?.fullName ?? characterKey;
};

export const cutoutUrl = (characterKey: string): string =>
  `/catalogued-npc-images/${encodeURIComponent(characterKey)}.webp`;

export const emptyScatterAreas = (snaps: ControlBoardSnaps): SceneDraft["scatter"]["areas"] => {
  const areas: SceneDraft["scatter"]["areas"] = {};
  for (const areaKey of snaps.scatter.areaOrder) {
    areas[areaKey] = { centerCharacters: {}, orbitCharacters: {} };
  }
  return areas;
};

export const defaultSeatSlots = (catalogs: SceneCatalogs, snaps: ControlBoardSnaps): Record<string, SeatSlotRow> => {
  const slots: Record<string, SeatSlotRow> = {};
  for (const color of catalogs.playerColors) {
    const seat = snaps.seats.find((row) => row.seatKey === color);
    const characterKey = PC_BY_COLOR[color];
    if (!characterKey) {
      throw new Error(`No PC character key is mapped for seat ${color}.`);
    }
    const row: SeatSlotRow = {
      characterKey,
      isPlayingNPC: false,
      isPresent: true
    };
    if (seat?.tableSlot !== undefined) {
      row.tableSlot = seat.tableSlot;
    }
    slots[color] = row;
  }
  for (const npcSeat of catalogs.npcSeats) {
    slots[npcSeat] = { characterKey: "", isPlayingNPC: false, isPresent: false, slotEmpty: true };
  }
  return slots;
};

export const createDefaultDraft = (catalogs: SceneCatalogs, snaps: ControlBoardSnaps): SceneDraft => {
  const tableA = catalogs.tables.find((row) => row.key === "Table A");
  const lighting = catalogs.lightModes.includes("IndoorDim")
    ? "IndoorDim"
    : catalogs.lightModes[0];
  if (!lighting) {
    throw new Error("scene-catalogs.json has no C.LightModes keys.");
  }
  return {
    sceneKey: "newScene",
    title: "New Scene",
    placementMode: "standard",
    tableKey: tableA?.key ?? catalogs.tables[0]?.key ?? "Table A",
    lightingPresetKey: lighting,
    isTopFogActive: true,
    districtKey: "",
    siteKey: "",
    skyboxOverride: "",
    clockPresentDay: true,
    conditions: [],
    locationTrack: "",
    backgroundMood: "",
    weatherKey: "none",
    standard: {
      seatSlots: defaultSeatSlots(catalogs, snaps),
      polar: [],
      paletteNpcKeys: []
    },
    scatter: {
      areas: emptyScatterAreas(snaps),
      paletteNpcKeys: []
    }
  };
};

const tableCapacity = (catalogs: SceneCatalogs, tableKey: string): number => {
  const row = catalogs.tables.find((table) => table.key === tableKey);
  if (row) {
    return row.slotCapacity;
  }
  if (tableKey === "Table B") {
    return 9;
  }
  return MAX_SLOT_UNKNOWN_TABLE;
};

export const checkStandardOccupancy = (draft: SceneDraft, catalogs: SceneCatalogs): string | null => {
  const cap = tableCapacity(catalogs, draft.tableKey);
  const used = new Map<number, string>();
  const checkRow = (occupant: string, row: SeatSlotRow | undefined, requireSlot: boolean): string | null => {
    if (!row) {
      return requireSlot ? `sessionScene.seatSlots.${occupant}: missing.` : null;
    }
    if (row.absentFromSession === true) {
      if (row.tableSlot !== undefined) {
        return `sessionScene.seatSlots.${occupant}: absentFromSession cannot be set together with tableSlot.`;
      }
      return null;
    }
    if (!requireSlot) {
      return null;
    }
    const slot = row.tableSlot;
    if (slot === undefined) {
      return `sessionScene.seatSlots.${occupant}.tableSlot: required for in-session occupants.`;
    }
    if (!Number.isInteger(slot) || slot < 1 || slot > cap) {
      return `sessionScene.seatSlots.${occupant}.tableSlot: ${slot} is outside 1..${cap} for this table.`;
    }
    const existing = used.get(slot);
    if (existing) {
      return `sessionScene.seatSlots.${occupant}.tableSlot: ${slot} is already used by ${existing}.`;
    }
    used.set(slot, occupant);
    return null;
  };

  for (const color of catalogs.playerColors) {
    const err = checkRow(color, draft.standard.seatSlots[color], true);
    if (err) {
      return err;
    }
  }
  for (const npcSeat of catalogs.npcSeats) {
    const row = draft.standard.seatSlots[npcSeat];
    const occupied = Boolean(row && row.slotEmpty !== true && row.characterKey.trim().length > 0);
    const err = checkRow(npcSeat, row, occupied);
    if (err) {
      return err;
    }
  }
  return null;
};

const polarByIndex = (snaps: ControlBoardSnaps): Map<number, PolarSnap> => {
  const map = new Map<number, PolarSnap>();
  for (const snap of snaps.polar) {
    map.set(snap.snapIndex, snap);
  }
  return map;
};

export const buildImportPayload = (draft: SceneDraft, catalogs: SceneCatalogs, snaps: ControlBoardSnaps): unknown => {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(draft.sceneKey)) {
    throw new Error("sceneKey: use letters, digits, underscore only; must start with a letter.");
  }
  if (draft.title.trim() === "") {
    throw new Error("title: cannot be empty or whitespace-only.");
  }

  const sessionScene: Record<string, unknown> = {
    lightingPresetKey: draft.lightingPresetKey,
    isTopFogActive: draft.isTopFogActive,
    clock: { isPresentDay: draft.clockPresentDay, useRealTime: false, realTimeSpeed: 1 }
  };
  if (draft.districtKey !== "") {
    sessionScene.districtKey = draft.districtKey;
  }
  if (draft.siteKey !== "") {
    sessionScene.siteKey = draft.siteKey;
    if (draft.districtKey === "") {
      throw new Error("sessionScene.districtKey: required non-empty string when sessionScene.siteKey is set.");
    }
  }
  if (draft.skyboxOverride !== "") {
    sessionScene.skyboxOverride = draft.skyboxOverride;
  }
  if (draft.conditions.length > 0) {
    sessionScene.conditions = [...draft.conditions];
  }

  const weather = catalogs.weatherConditions.find((row) => row.key === draft.weatherKey);
  const narrative: Record<string, unknown> = {};
  if (draft.locationTrack !== "") {
    narrative.location = draft.locationTrack;
  }
  if (draft.backgroundMood !== "") {
    narrative.backgroundMusic = draft.backgroundMood;
  }
  if (weather && weather.key !== "none") {
    narrative.rain = weather.rain;
    narrative.wind = weather.wind;
    narrative.thunderstorm = weather.thunderEnabled;
  }
  if (Object.keys(narrative).length > 0) {
    sessionScene.soundscapeNarrative = narrative;
  }

  if (draft.placementMode === "standard") {
    const occErr = checkStandardOccupancy(draft, catalogs);
    if (occErr) {
      throw new Error(occErr);
    }
    sessionScene.tableKey = draft.tableKey;
    const seatSlots: Record<string, Record<string, unknown>> = {};
    for (const [key, row] of Object.entries(draft.standard.seatSlots)) {
      const out: Record<string, unknown> = {};
      if (row.slotEmpty === true) {
        out.slotEmpty = true;
      } else if (row.characterKey !== "") {
        out.characterKey = row.characterKey;
      }
      if (row.absentFromSession === true) {
        out.absentFromSession = true;
        out.isPresent = false;
      } else {
        if (row.isPlayingNPC) {
          out.isPlayingNPC = true;
          if (row.npcCharacterKey) {
            out.npcCharacterKey = row.npcCharacterKey;
          }
        } else if (catalogs.playerColors.includes(key as typeof catalogs.playerColors[number])) {
          out.isPlayingNPC = false;
        }
        if (row.isPresent !== undefined && row.slotEmpty !== true) {
          out.isPresent = row.isPresent;
        }
        if (row.tableSlot !== undefined) {
          out.tableSlot = row.tableSlot;
        }
      }
      seatSlots[key] = out;
    }
    sessionScene.seatSlots = seatSlots;
    const polarMap = polarByIndex(snaps);
    const placements: Record<string, Record<string, unknown>> = {};
    for (const token of draft.standard.polar) {
      const snap = polarMap.get(token.snapIndex);
      if (!snap) {
        throw new Error(`NPC ${token.characterKey} is on unknown polar snap ${token.snapIndex}.`);
      }
      placements[token.characterKey] = {
        u: snap.u,
        v: snap.v,
        npcLightMode: token.npcLightMode
      };
    }
    if (Object.keys(placements).length > 0) {
      sessionScene.npcWorld = { placements };
    }
  } else {
    const scatterPlacements: Record<string, unknown> = {};
    for (const areaKey of snaps.scatter.areaOrder) {
      const area = draft.scatter.areas[areaKey];
      if (!area) {
        throw new Error(`Scatter area ${areaKey} is missing from the draft.`);
      }
      const centerCharacters: Record<string, Record<string, unknown>> = {};
      for (const [pcKey, row] of Object.entries(area.centerCharacters)) {
        const out: Record<string, unknown> = {
          slot: row.slot,
          isPlayingNPC: row.isPlayingNPC,
          isPresent: row.isPresent
        };
        if (row.isPlayingNPC) {
          if (!row.characterKey) {
            throw new Error(`Scatter ${areaKey} center ${pcKey}: characterKey is required when playing an NPC.`);
          }
          out.characterKey = row.characterKey;
        }
        centerCharacters[pcKey] = out;
      }
      const orbitCharacters: Record<string, Record<string, unknown>> = {};
      for (const [npcKey, row] of Object.entries(area.orbitCharacters)) {
        orbitCharacters[npcKey] = { slot: row.slot, npcLightMode: row.npcLightMode };
      }
      scatterPlacements[areaKey] = { centerCharacters, orbitCharacters };
    }
    sessionScene.scatterPlacements = scatterPlacements;
  }

  return {
    schemaVersion: 2,
    placementMode: draft.placementMode,
    sceneKey: draft.sceneKey,
    title: draft.title.trim(),
    sessionScene
  };
};

export const nearestPolarSnap = (
  snaps: ControlBoardSnaps,
  u: number,
  v: number,
  maxDist = 0.07
): PolarSnap | null => {
  let best: PolarSnap | null = null;
  let bestDist = maxDist;
  for (const snap of snaps.polar) {
    const du = snap.u - u;
    const dv = snap.v - v;
    const dist = Math.sqrt(du * du + dv * dv);
    if (dist < bestDist) {
      best = snap;
      bestDist = dist;
    }
  }
  return best;
};

export const nearestSeatSnap = (
  snaps: ControlBoardSnaps,
  u: number,
  v: number,
  maxDist = 0.07
): ControlBoardSnaps["seats"][number] | null => {
  let best: ControlBoardSnaps["seats"][number] | null = null;
  let bestDist = maxDist;
  for (const snap of snaps.seats) {
    const du = snap.u - u;
    const dv = snap.v - v;
    const dist = Math.sqrt(du * du + dv * dv);
    if (dist < bestDist) {
      best = snap;
      bestDist = dist;
    }
  }
  return best;
};

export const boardUvFromEvent = (stage: HTMLElement, event: { clientX: number; clientY: number }): { u: number; v: number } | null => {
  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const u = (event.clientX - rect.left) / rect.width;
  const v = 1 - (event.clientY - rect.top) / rect.height;
  return { u, v };
};
