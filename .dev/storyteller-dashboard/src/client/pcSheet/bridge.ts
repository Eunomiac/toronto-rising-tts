import { executeLua, luaLongString } from "../ttsBridge.js";
import { fixtureSnapshot } from "./fixture.js";
import type { ApplyCommand, SeatColor, SeatSnapshot, SheetSnapshot } from "./types.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asBool = (value: unknown): boolean => value === true;

const asRating = (value: unknown) => ({
  base: isRecord(value) ? asNumber(value.base) : 0,
  temp: isRecord(value) ? asNumber(value.temp) : 0,
  disabled: isRecord(value) ? asNumber(value.disabled) : 0
});

const asTracker = (value: unknown) => ({
  ...asRating(value),
  superficial: isRecord(value) ? asNumber(value.superficial) : 0,
  aggravated: isRecord(value) ? asNumber(value.aggravated) : 0,
  stains: isRecord(value) ? asNumber(value.stains) : 0
});

const parseSeat = (value: unknown): SeatSnapshot | null => {
  if (!isRecord(value) || typeof value.color !== "string") {
    return null;
  }
  const color = value.color as SeatColor;
  const attributes: SeatSnapshot["attributes"] = {};
  const skills: SeatSnapshot["skills"] = {};
  if (isRecord(value.attributes)) {
    for (const [key, row] of Object.entries(value.attributes)) {
      attributes[key] = asRating(row);
    }
  }
  if (isRecord(value.skills)) {
    for (const [key, row] of Object.entries(value.skills)) {
      skills[key] = asRating(row);
    }
  }
  const specialties = Array.isArray(value.specialties)
    ? value.specialties.flatMap((row) => {
      if (!isRecord(row)) {
        return [];
      }
      return [{
        skill: asString(row.skill),
        type: asString(row.type, "standard"),
        name: asString(row.name),
        decade: typeof row.decade === "number" ? row.decade : undefined
      }];
    })
    : [];
  const resolved: Record<string, number> = {};
  if (isRecord(value.resolvedStatChanges)) {
    for (const [key, delta] of Object.entries(value.resolvedStatChanges)) {
      if (typeof delta === "number" && delta !== 0) {
        resolved[key] = delta;
      }
    }
  }
  const badges: Record<string, number> = {};
  if (isRecord(value.badges)) {
    for (const [key, delta] of Object.entries(value.badges)) {
      if (typeof delta === "number" && delta !== 0) {
        badges[key] = delta;
      }
    }
  }
  return {
    color,
    playerId: asString(value.playerId) || undefined,
    charKey: asString(value.charKey),
    charName: asString(value.charName),
    playerName: asString(value.playerName),
    desire: asString(value.desire),
    absentFromSession: asBool(value.absentFromSession),
    deferAutoSeat: asBool(value.deferAutoSeat),
    deferConnect: asBool(value.deferConnect),
    attributes,
    skills,
    specialties,
    health: asTracker(value.health),
    willpower: asTracker(value.willpower),
    humanity: asTracker(value.humanity),
    bloodPotency: asRating(value.bloodPotency),
    xp: asNumber(value.xp),
    hunger: asNumber(value.hunger),
    hungerMax: asNumber(value.hungerMax, 5),
    resolvedStatChanges: resolved,
    badges,
    bloodSurge: asNumber(value.bloodSurge),
    mending: asNumber(value.mending),
    healthMax: asNumber(value.healthMax, asTracker(value.health).base),
    willpowerMax: asNumber(value.willpowerMax, asTracker(value.willpower).base),
    humanityMax: asNumber(value.humanityMax, asTracker(value.humanity).base),
    torpor: asBool(value.torpor),
    hudFrenzy: asBool(value.hudFrenzy),
    hudBlindfold: asBool(value.hudBlindfold)
  };
};

const parseSnapshotJson = (raw: string): SheetSnapshot => {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("Sheet snapshot was not an object.");
  }
  if (parsed.ok === false) {
    return { ok: false, error: asString(parsed.error, "Apply failed"), seats: [] };
  }
  const seats = Array.isArray(parsed.seats)
    ? parsed.seats.map(parseSeat).filter((seat): seat is SeatSnapshot => seat !== null)
    : [];
  return { ok: true, seats };
};

const extractJson = (result: { returnValue?: unknown; prints: readonly string[]; error?: string }): string => {
  if (typeof result.returnValue === "string" && result.returnValue.trim().startsWith("{")) {
    return result.returnValue;
  }
  if (isRecord(result.returnValue) && result.returnValue.ok !== undefined) {
    return JSON.stringify(result.returnValue);
  }
  const printed = [...result.prints].reverse().find((line) => line.trim().startsWith("{"));
  if (printed) {
    return printed;
  }
  if (result.error) {
    throw new Error(result.error);
  }
  throw new Error("TTS did not return a sheet snapshot. Save & Play so the live PCs bridge is loaded.");
};

export const fetchSheetSnapshot = async (): Promise<SheetSnapshot> => {
  const result = await executeLua("return GlobalDashboardPcSheetSnapshot()");
  if (result.timedOut) {
    throw new Error("TTS did not answer. Keep External Editor on and the TTS Tools extension off.");
  }
  return parseSnapshotJson(extractJson(result));
};

export const applySheetCommand = async (command: ApplyCommand): Promise<SheetSnapshot> => {
  const script = `return GlobalDashboardPcSheetApply(${luaLongString(JSON.stringify(command))})`;
  const result = await executeLua(script);
  if (result.timedOut) {
    throw new Error("TTS did not answer. Keep External Editor on and the TTS Tools extension off.");
  }
  return parseSnapshotJson(extractJson(result));
};

export const snapshotOrFixture = async (): Promise<{ snapshot: SheetSnapshot; live: boolean; message: string }> => {
  try {
    const snapshot = await fetchSheetSnapshot();
    if (!snapshot.ok) {
      return { snapshot: fixtureSnapshot(), live: false, message: snapshot.error ?? "Snapshot failed." };
    }
    return { snapshot, live: true, message: "Live from Tabletop Simulator." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not read live sheet state.";
    return { snapshot: fixtureSnapshot(), live: false, message };
  }
};
