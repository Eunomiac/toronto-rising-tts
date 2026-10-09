import type { SceneCatalogs } from "../scenes/types";
import type { SoundLane } from "./commands";
import type { ClockDatetime, SeatRow, SeatsSlice, SceneSlice, SoundscapeSlice, StageNpc } from "../worldState";

/**
 * Pure adapters from the live world slices (`worldState.ts`) to what the Scenes tab panels draw.
 * Field meanings: `.dev/Storyteller Dashboard Docs/Listening to TTS.md`.
 */

export const toDate = (dt: ClockDatetime): Date => new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute);

export const fromDate = (date: Date): ClockDatetime =>
  ({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() });

export type Precip = "none" | "lightRain" | "heavyRain" | "lightSnow" | "heavySnow";
export type Level = 0 | 1 | 2 | 3;
export type WeatherAxes = { readonly precip: Precip; readonly wind: Level; readonly thunder: boolean };

/** TTS weather layers: rain `none | rainLight | rainHeavy`; wind `none | wind[Winter]Low | Med | Max`. TTS has no snow yet. */
export const weatherAxes = (weather: SceneSlice["weather"]): WeatherAxes => {
  const rain = weather.rain ?? "none";
  const wind = weather.wind ?? "none";
  const precip: Precip = rain === "rainHeavy" ? "heavyRain" : rain === "rainLight" ? "lightRain" : "none";
  const level: Level = /Max$/.test(wind) ? 3 : /Med$/.test(wind) ? 2 : /Low$/.test(wind) ? 1 : 0;
  return { precip, wind: level, thunder: weather.thunder };
};

export type SoundView = {
  readonly playlist: string;
  readonly musicPlaying: boolean;
  readonly featuredKey: string | undefined;
  readonly featuredPlaying: boolean;
  readonly ambient: string | undefined;
  /** Lane volumes as 0–100 slider values. */
  readonly levels: Readonly<Record<SoundLane, number>>;
  readonly playing: Readonly<Record<SoundLane, boolean>>;
};

export const MOOD_LABEL: Readonly<Record<string, string>> = { main: "Main", combat: "Combat", intrigue: "Intrigue" };

/** Site background playlists in `lib/soundscape_catalog.ttslua` (`PLAYLISTS.backgroundMusic`, not a mood). */
export const LOCATION_MUSIC_LABEL: Readonly<Record<string, string>> = {
  casaLoma: "Casa Loma",
  gioEstate: "Giovanni Estate",
  gioCatacombs: "Giovanni Catacombs"
};

const musicLabel = (sound: SoundscapeSlice): string => {
  if (!sound.musicEnabled) {
    return "Silent";
  }
  if (sound.musicMode === "locationMusic" && sound.locationMusic) {
    return LOCATION_MUSIC_LABEL[sound.locationMusic] ?? sound.locationMusic;
  }
  return MOOD_LABEL[sound.musicMood ?? ""] ?? sound.musicMood ?? "Main";
};

export const soundView = (sound: SoundscapeSlice): SoundView => {
  const lane = (id: string) => sound.lanes.find((entry) => entry.id === id);
  const level = (id: string): number => Math.round((lane(id)?.volume ?? 0) * 100);
  const playing = (id: string): boolean => lane(id)?.active === true;
  return {
    playlist: musicLabel(sound),
    musicPlaying: playing("music"),
    featuredKey: sound.featuredKey,
    featuredPlaying: sound.featuredActive,
    ambient: sound.location === "none" ? undefined : sound.location,
    levels: { music: level("music"), location: level("location"), featured: level("featured"), rain: level("rain"), wind: level("wind"), thunder: level("thunder") },
    playing: { music: playing("music"), location: playing("location"), featured: playing("featured"), rain: playing("rain"), wind: playing("wind"), thunder: playing("thunder") }
  };
};

export type SeatColor = "Brown" | "Orange" | "Red" | "Pink" | "Purple";

export type LiveSeat = {
  readonly slot: number;
  /** TTS seat key (player colour or NPC seat) for presence commands; absent on an unoccupied chair. */
  readonly seatKey?: string;
  readonly name?: string;
  readonly characterKey?: string;
  readonly kind: "pc" | "npc" | "empty" | "nochair";
  readonly state?: "absent" | "disconnected";
  readonly playedBy?: string;
  readonly color?: SeatColor;
};

/** Control board seat row, left to right: chairs numbered from the centre outward. */
export const SEAT_ORDER = [9, 7, 5, 3, 1, 2, 4, 6, 8] as const;

const PC_COLORS: readonly string[] = ["Brown", "Orange", "Red", "Pink", "Purple"];

/**
 * One cell per chair position. A chair beyond the table's capacity is `nochair`; an unoccupied chair is
 * `empty`. Narrative absence (`isPresent == false`) and a disconnected PC (`absentFromSession`) stay distinct.
 */
export const liveSeats = (seats: SeatsSlice, tableKey: string | undefined, catalogs: SceneCatalogs | null): readonly LiveSeat[] => {
  const capacity = catalogs?.tables.find((table) => table.key === tableKey)?.slotCapacity ?? 9;
  const nameOf = (key: string | undefined): string | undefined =>
    key ? [...(catalogs?.pcs ?? []), ...(catalogs?.namedNpcs ?? [])].find((entry) => entry.characterKey === key)?.fullName ?? key : undefined;
  const occupant = (slot: number): SeatRow | undefined =>
    seats.seats.find((row) => row.tableSlot === slot && (row.kind === "pc" ? row.absentFromSession !== true : row.slotEmpty !== true));
  return SEAT_ORDER.map((slot): LiveSeat => {
    const row = occupant(slot);
    if (!row) {
      return { slot, kind: slot > capacity ? "nochair" : "empty" };
    }
    const state = row.isPresent ? undefined : "absent";
    if (row.kind === "npc") {
      return { slot, seatKey: row.seat, kind: "npc", characterKey: row.characterKey, name: nameOf(row.characterKey), ...(state ? { state } : {}) };
    }
    const color = PC_COLORS.includes(row.seat) ? (row.seat as SeatColor) : undefined;
    const pcName = nameOf(row.charKey);
    const playing = row.playingNpcKey;
    return {
      slot,
      seatKey: row.seat,
      kind: "pc",
      characterKey: playing ?? row.charKey,
      name: playing ? nameOf(playing) : pcName,
      ...(playing && pcName ? { playedBy: pcName } : {}),
      ...(color ? { color } : {}),
      ...(state ? { state } : {})
    };
  });
};

export type LiveToken = { readonly characterKey: string; readonly name: string; readonly lit: boolean; readonly u: number; readonly v: number };

/** Stage NPCs with a board position; `u`, `v` are fractions of the control board (`lightMode` OFF = unlit). */
export const liveTokens = (stage: readonly StageNpc[], catalogs: SceneCatalogs | null): readonly LiveToken[] =>
  stage.flatMap((npc) => {
    if (typeof npc.u !== "number" || typeof npc.v !== "number") {
      return [];
    }
    const full = catalogs?.namedNpcs.find((entry) => entry.characterKey === npc.characterKey)?.fullName ?? npc.characterKey;
    return [{ characterKey: npc.characterKey, name: full.split(" ")[0] ?? full, lit: npc.lightMode !== "OFF", u: npc.u, v: npc.v }];
  });


export type SpotlightView = { readonly order: readonly { readonly color: SeatColor; readonly characterKey: string }[]; readonly front: number };

/** Spotlight carousel order as TTS shuffled it; `spotlightFrontIndex` is 1-based in Lua. */
export const spotlightView = (seats: SeatsSlice): SpotlightView => ({
  order: seats.spotlightOrder.flatMap((color) => {
    const row = seats.seats.find((entry) => entry.seat === color);
    return row?.charKey && PC_COLORS.includes(color) ? [{ color: color as SeatColor, characterKey: row.charKey }] : [];
  }),
  front: Math.max(0, (seats.spotlightFrontIndex ?? 1) - 1)
});
