import { executeLua, luaLongString } from "../ttsBridge.js";
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
    clan: asString(value.clan),
    bloodline: asString(value.bloodline),
    titles: Array.isArray(value.titles)
      ? value.titles.filter((row): row is string => typeof row === "string" && row !== "")
      : [],
    generation: asString(value.generation),
    birthPlace: asString(value.birthPlace),
    birthYear: asNumber(value.birthYear),
    embracePlace: asString(value.embracePlace),
    embraceYear: asNumber(value.embraceYear),
    convictions: Array.isArray(value.convictions)
      ? value.convictions.filter((row): row is string => typeof row === "string" && row !== "")
      : [],
    desire: asString(value.desire),
    ambition: asString(value.ambition),
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

export const extractSnapshotJson = (result: { returnValue?: unknown; prints: readonly string[]; error?: string }): string => {
  if (typeof result.returnValue === "string" && result.returnValue.trim().startsWith("{")) {
    return result.returnValue;
  }
  if (isRecord(result.returnValue) && result.returnValue.ok !== undefined) {
    return JSON.stringify(result.returnValue);
  }
  const printed = [...result.prints].reverse().find((line) => {
    const trimmed = line.trim();
    const start = trimmed.indexOf("{");
    if (start < 0) {
      return false;
    }
    const body = trimmed.slice(start);
    return body.startsWith("{") && (body.includes('"ok"') || body.includes('"seats"'));
  });
  if (printed) {
    const start = printed.indexOf("{");
    return start >= 0 ? printed.slice(start) : printed;
  }
  if (result.error) {
    throw new Error(result.error);
  }
  throw new Error("TTS did not return a sheet snapshot. Save & Play so the live PCs bridge is loaded.");
};

const SNAPSHOT_SCRIPT = [
  "local json = GlobalDashboardPcSheetSnapshot()",
  "print(json)",
  "return json"
].join("\n");

export const fetchSheetSnapshot = async (): Promise<SheetSnapshot> => {
  const result = await executeLua(SNAPSHOT_SCRIPT);
  if (result.timedOut) {
    throw new Error("TTS did not answer. Keep External Editor on and the TTS Tools extension off.");
  }
  return parseSnapshotJson(extractSnapshotJson(result));
};

export const applySheetCommands = async (commands: readonly ApplyCommand[]): Promise<SheetSnapshot> => {
  if (commands.length === 0) {
    throw new Error("No sheet commands to apply.");
  }
  const payload = commands.length === 1 ? commands[0] : commands;
  const script = [
    `local json = GlobalDashboardPcSheetApply(${luaLongString(JSON.stringify(payload))})`,
    "print(json)",
    "return json"
  ].join("\n");
  const result = await executeLua(script);
  if (result.timedOut) {
    throw new Error("TTS did not answer. Keep External Editor on and the TTS Tools extension off.");
  }
  return parseSnapshotJson(extractSnapshotJson(result));
};

export const applySheetCommand = async (command: ApplyCommand): Promise<SheetSnapshot> =>
  applySheetCommands([command]);

export const fetchLiveSnapshot = async (): Promise<{ snapshot: SheetSnapshot; live: boolean; message: string }> => {
  try {
    const snapshot = await fetchSheetSnapshot();
    if (!snapshot.ok) {
      return {
        snapshot: { ok: false, error: snapshot.error, seats: [] },
        live: false,
        message: snapshot.error ?? "Tabletop Simulator returned an empty sheet snapshot."
      };
    }
    return { snapshot, live: true, message: "Live from Tabletop Simulator." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not read live sheet state.";
    return { snapshot: { ok: false, error: message, seats: [] }, live: false, message };
  }
};
