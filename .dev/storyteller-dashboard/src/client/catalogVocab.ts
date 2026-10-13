import {
  backgroundMoods,
  bloodPotency,
  featuredTracks,
  lightModes,
  locationTracks,
  npcSeats,
  playerColors,
  rollTypeRules,
  structuralRollOptions,
  weatherCodes
} from "../../data/scene-catalogs.json";

/**
 * Lists TTS already exports in `data/scene-catalogs.json` (written by `.dev/scripts/generate_dashboard_scene_catalogs.js`
 * from the Lua catalogs), bundled so plain modules can read them without waiting for `/api/scene-catalogs`.
 * Where TypeScript needs a literal union, the union stays here and the catalog is checked against it when the
 * dashboard loads: a catalog that drifted stops the dashboard with the reason instead of being trusted.
 */

const drift = (what: string, detail: string): Error =>
  new Error(`data/scene-catalogs.json ${what} no longer matches the dashboard (${detail}). Update src/client/catalogVocab.ts.`);

/** The catalog list, in catalog order, after checking it holds exactly the union's members. */
const exactly = <T extends string>(what: string, catalog: readonly string[], union: readonly T[]): readonly T[] => {
  const missing = union.filter((key) => !catalog.includes(key));
  const extra = catalog.filter((key) => !(union as readonly string[]).includes(key));
  if (missing.length > 0 || extra.length > 0) {
    throw drift(what, `missing ${missing.join(", ") || "none"}; unexpected ${extra.join(", ") || "none"}`);
  }
  return catalog as readonly T[];
};

/** The union's members, after checking every one is in the catalog list. */
const within = <T extends string>(what: string, catalog: readonly string[], union: readonly T[]): readonly T[] => {
  const missing = union.filter((key) => !catalog.includes(key));
  if (missing.length > 0) {
    throw drift(what, `missing ${missing.join(", ")}`);
  }
  return union;
};

/** `cityChatter` → "City Chatter". */
const titleCase = (key: string): string => {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const SEAT_COLOR_UNION = ["Brown", "Orange", "Red", "Pink", "Purple"] as const;

export type SeatColor = (typeof SEAT_COLOR_UNION)[number];

/** PC seat colours (`C.PlayerColors`), in seat order. */
export const SEAT_COLORS: readonly SeatColor[] = exactly("playerColors", playerColors, SEAT_COLOR_UNION);

export const isSeatColor = (value: unknown): value is SeatColor =>
  typeof value === "string" && (SEAT_COLORS as readonly string[]).includes(value);

/** NPC seat keys (`C.NPCSeats`). */
export const NPC_SEATS: readonly string[] = npcSeats;

/** The Storyteller lighting presets the dashboard offers; each must be a `C.LightModes` key. */
export type LightingPreset = "AdminDark" | "AdminStandard" | "AdminBright";

export const LIGHTING_PRESETS: readonly LightingPreset[] = within("lightModes", lightModes, ["AdminDark", "AdminStandard", "AdminBright"]);

/** `AdminDark` → "Dark". */
export const lightingLabel = (preset: LightingPreset): string => preset.slice("Admin".length);

export type MusicMood = "main" | "combat" | "intrigue";

/** Background playlists the `musicMood` command plays (`Catalog.PLAYLISTS.backgroundMusic`). */
export const MUSIC_MOODS: readonly MusicMood[] = within("backgroundMoods", backgroundMoods, ["main", "combat", "intrigue"]);

/** Every other background playlist is a site's own music (`locationMusic`). */
export const LOCATION_MUSIC: readonly string[] = backgroundMoods.filter((key) => !(MUSIC_MOODS as readonly string[]).includes(key));

/** Display names where the playlist key is an abbreviation; the rest are title-cased keys. */
const PLAYLIST_NAMES: Readonly<Record<string, string>> = { gioEstate: "Giovanni Estate", gioCatacombs: "Giovanni Catacombs" };

export const playlistLabel = (key: string): string => PLAYLIST_NAMES[key] ?? titleCase(key);

export type TrackOption = { readonly key: string; readonly label: string };

/** Location ambience loops (`Catalog.TRACKS` type `location`); the silent loop is sent as `none`. */
export const AMBIENT_TRACKS: readonly TrackOption[] = locationTracks.map((key) =>
  key === "silent" ? { key: "none", label: "Silent" } : { key, label: titleCase(key) }
);

const FEATURED_NAMES: Readonly<Record<string, string>> = {
  TR_Full: "TR Theme (full)",
  TR_Intro: "TR Theme (intro)",
  TR_Loop: "TR Loop",
  STB_HouseOfTheRisingSun: "House of the Rising Sun"
};

/** Featured tracks (`Catalog.TRACKS` type `featureMusic`), in catalog order. */
export const FEATURED_TRACKS: readonly TrackOption[] = featuredTracks.map((key) => ({ key, label: FEATURED_NAMES[key] ?? titleCase(key) }));

/** Structural roll rules the options pop-up toggles (`CD.STRUCTURAL_NEGATING`). */
export const STRUCTURAL_OPTIONS: readonly TrackOption[] = structuralRollOptions;

/** `C.WEATHER` as an hourly calendar code decodes (`ChronicleWeather.parseCode`). */
export type WeatherCodes = {
  readonly warmThreshold: number;
  readonly base: Readonly<Record<string, { readonly rain: string; readonly thunder: boolean }>>;
  readonly temperatureDelta: Readonly<Record<string, number>>;
  readonly wind: Readonly<Record<string, { readonly warm: string; readonly cold: string }>>;
};

export const WEATHER_CODES: WeatherCodes = weatherCodes;

/** One `BPC.BloodPotency` row (`lib/blood_potency_constants.ttslua`). */
export type BloodPotencyRow = {
  readonly level: number;
  readonly bloodSurge: number;
  readonly mending: number;
  readonly discBonus: number;
  readonly discReroll: number;
  readonly baneSeverity: number;
};

/** Blood Potency 0–10, indexed by level. */
export const BLOOD_POTENCY: readonly BloodPotencyRow[] = bloodPotency;

/** The Blood Potency row for a rating (clamped to 0–10). */
export const bloodPotencyRow = (rating: number | undefined): BloodPotencyRow => {
  const row = BLOOD_POTENCY[Math.max(0, Math.min(BLOOD_POTENCY.length - 1, Math.floor(rating ?? 0)))];
  if (!row) {
    throw drift("bloodPotency", "no rows");
  }
  return row;
};

/** Roll types that allow Blood Surge (`C.RollTypesBloodSurge`) and that take no Hunger dice (`C.RollTypesWithoutHunger`). */
export const ROLL_TYPE_RULES: { readonly bloodSurge: readonly string[]; readonly withoutHunger: readonly string[] } = rollTypeRules;
