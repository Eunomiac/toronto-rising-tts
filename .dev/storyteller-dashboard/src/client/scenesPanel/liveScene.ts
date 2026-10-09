import type { SceneCatalogs } from "./catalogs";
import type { LightingPreset, RainKey, SoundLane } from "./commands";
import type { ClockDatetime, GenericNpc, SeatRow, SeatsSlice, SceneSlice, SoundscapeSlice, StageNpc } from "../worldState";

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

const windLevel = (wind: string): Level => (/Max$/.test(wind) ? 3 : /Med$/.test(wind) ? 2 : /Low$/.test(wind) ? 1 : 0);

export const precipOf = (rain: string): Precip => (rain === "rainHeavy" ? "heavyRain" : rain === "rainLight" ? "lightRain" : "none");

/** TTS weather layers: rain `none | rainLight | rainHeavy`; wind `none | wind[Winter]Low | Med | Max`. TTS has no snow yet. */
export const weatherAxes = (weather: SceneSlice["weather"]): WeatherAxes =>
  ({ precip: precipOf(weather.rain ?? "none"), wind: windLevel(weather.wind ?? "none"), thunder: weather.thunder });

/** The Storyteller's held weather, or null while the schedule (or the scene's own weather) runs. */
export const weatherOverride = (scene: SceneSlice): WeatherAxes | null => {
  const held = scene.weatherOverride;
  return held ? { precip: precipOf(held.rain), wind: windLevel(held.wind), thunder: held.thunder } : null;
};

/** TTS rain layer for a precipitation choice; snow has no layer yet, so it falls back to the nearest rain. */
export const rainKey = (precip: Precip): RainKey =>
  precip === "heavyRain" || precip === "heavySnow" ? "rainHeavy" : precip === "lightRain" || precip === "lightSnow" ? "rainLight" : "none";

const WIND_TEXT = ["calm", "breeze", "wind", "gale"] as const;

export const weatherText = (axes: WeatherAxes): string =>
  [axes.precip === "heavyRain" ? "heavy rain" : axes.precip === "lightRain" ? "light rain" : "dry", WIND_TEXT[axes.wind], ...(axes.thunder ? ["thunder"] : [])].join(", ");

/** Scene condition ids (TTS sends an empty list as an object). */
export const sceneConditions = (scene: SceneSlice): readonly string[] => (Array.isArray(scene.conditions) ? scene.conditions : []);

/** An unlinked scene whose live location no longer matches its library row. */
export const locationOverridden = (scene: SceneSlice): boolean =>
  !scene.liveLinked &&
  scene.library !== undefined &&
  (scene.library.districtKey !== scene.districtKey || scene.library.siteKey !== scene.siteKey);

export const isScatter = (scene: SceneSlice): boolean => scene.placementMode === "scatter" || scene.tableKey === "Scatter";

export const lightingPreset = (scene: SceneSlice): LightingPreset | undefined =>
  scene.lightingPresetKey === "AdminDark" || scene.lightingPresetKey === "AdminStandard" || scene.lightingPresetKey === "AdminBright"
    ? scene.lightingPresetKey
    : undefined;

/** `C.SKYBOX_GENERIC_KEY`. */
export const GENERIC_SKY = "Generic";

/** The sky override's name, or "Site sky" when the site's own sky shows. */
export const skyLabel = (scene: SceneSlice, catalogs: SceneCatalogs | null): string => {
  const key = scene.skyboxOverride;
  if (!key) {
    return "Site sky";
  }
  return key === GENERIC_SKY ? "Generic sky" : catalogs?.skyboxes.find((sky) => sky.key === key)?.display ?? key;
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

/** A stage token's short name: a named NPC's first name, a generic NPC's whole name, else the key. */
export const stageName = (characterKey: string, catalogs: SceneCatalogs | null, generics: readonly GenericNpc[]): string => {
  const generic = generics.find((entry) => entry.characterKey === characterKey);
  if (generic) {
    return generic.name;
  }
  const full = catalogs?.namedNpcs.find((entry) => entry.characterKey === characterKey)?.fullName ?? characterKey;
  return full.split(" ")[0] ?? full;
};

/** Stage NPCs with a board position; `u`, `v` are fractions of the control board (`lightMode` OFF = unlit). */
export const liveTokens = (stage: readonly StageNpc[], catalogs: SceneCatalogs | null, generics: readonly GenericNpc[] = []): readonly LiveToken[] =>
  stage.flatMap((npc) => {
    if (typeof npc.u !== "number" || typeof npc.v !== "number") {
      return [];
    }
    return [{ characterKey: npc.characterKey, name: stageName(npc.characterKey, catalogs, generics), lit: npc.lightMode !== "OFF", u: npc.u, v: npc.v }];
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

/** PCs who can hunt: every connected PC seat with a character (seated, standing or out of the scene alike). */
export const huntPcs = (seats: SeatsSlice, catalogs: SceneCatalogs | null): readonly { readonly color: string; readonly name: string }[] =>
  seats.seats.flatMap((row) => {
    if (row.kind !== "pc" || !row.charKey || row.absentFromSession === true || !PC_COLORS.includes(row.seat)) {
      return [];
    }
    return [{ color: row.seat, name: catalogs?.pcs.find((pc) => pc.characterKey === row.charKey)?.fullName ?? row.seat }];
  });
