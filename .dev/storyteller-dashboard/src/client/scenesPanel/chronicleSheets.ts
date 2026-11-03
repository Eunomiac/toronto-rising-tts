import { useEffect, useState } from "react";
type ExportRecord = Readonly<Record<string, string>>;
type ChronicleExports = { districts: readonly ExportRecord[]; sites: readonly ExportRecord[]; weather: readonly ExportRecord[] };
let request: Promise<ChronicleExports> | null = null;
const loadExports = (): Promise<ChronicleExports> => request ??= fetch("/api/chronicle-exports").then(async response => {
  if (!response.ok) throw new Error(`Chronicle exports failed to load (${response.status}).`);
  return await response.json() as ChronicleExports;
}).catch(error => { request = null; throw error; });

/* ---------- locations (API sheet exports) ---------- */

export type Resonance = { readonly type: string; readonly up: boolean };
export type Aspect = { readonly title: string; readonly text: string };

export type SheetDistrict = {
  readonly key: string;
  readonly name: string;
  readonly resonances: readonly Resonance[];
  readonly aspects: readonly Aspect[];
};

export type SheetSite = {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  readonly unique: boolean;
  readonly resonances: readonly Resonance[];
  readonly aspect: Aspect;
};

export type ChronicleLocations = {
  readonly districts: readonly SheetDistrict[];
  readonly sites: readonly SheetSite[];
};

/** "phlegmatic +" / "melancholic -" → typed entries; blanks dropped. */
const resonances = (...cells: readonly (string | undefined)[]): readonly Resonance[] =>
  cells.flatMap((cell) => {
    const match = /^(\w+)\s*([+-])$/.exec((cell ?? "").trim());
    return match?.[1] && match[2] ? [{ type: match[1].toLowerCase(), up: match[2] === "+" }] : [];
  });

/** The export lowercases a leading article ("the Annex"); titles read better capitalised. */
const titleCase = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

const loadLocations = async (): Promise<ChronicleLocations> => {
  const data = await loadExports();
  const districts = data.districts.map((row): SheetDistrict => ({
    key: row.Key ?? "", name: titleCase(row.Name ?? ""),
    resonances: resonances(row["Resonance Plus"], row["Resonance Minus"]),
    aspects: [1, 2, 3].map(n => ({ title: row[`Aspect Title ${n}`] ?? "", text: row[`Aspect Content ${n}`] ?? "" }))
  }));
  const sites = data.sites.map((row): SheetSite => ({
    key: row.Key ?? "", title: row.Title ?? "", subtitle: row.Subtitle ?? "", unique: row["Unique?"] === "TRUE",
    resonances: resonances(row["Resonance Plus"], row["Resonance Minus"]),
    aspect: { title: row["Aspect Title"] ?? "", text: row["Aspect Content"] ?? "" }
  }));
  return { districts, sites };
};

/* ---------- weather calendar (Toronto Rising sheet, WEATHER tab) ---------- */

/**
 * Same encoding as `C.WEATHER` in `lib/constants.ttslua`: per month an average temperature, per day 24 hourly
 * five-character codes — base weather (2), temperature delta (1), humidity (1), wind (1).
 */
export type WeatherCalendar = {
  readonly avgTemp: ReadonlyMap<number, number>;
  readonly codes: ReadonlyMap<string, readonly string[]>;
};

const loadWeather = async (): Promise<WeatherCalendar> => {
  const rows = (await loadExports()).weather;
  const avgTemp = new Map<number, number>();
  const codes = new Map<string, readonly string[]>();
  for (const row of rows) {
    const month = Number(row.Month);
    const day = Number(row.Day);
    const list = row.DayCodes ?? "";
    if (!Number.isInteger(month) || month < 1 || !Number.isInteger(day) || day < 1 || !list.includes('"')) {
      continue;
    }
    avgTemp.set(month, Number(row["Average Temperature"]));
    codes.set(`${month}-${day}`, [...list.matchAll(/"([^"]{5})"/g)].map((match) => match[1] ?? ""));
  }
  if (codes.size === 0) {
    throw new Error("EXPORT_WEATHER: no day codes found.");
  }
  return { avgTemp, codes };
};

/* ---------- hooks ---------- */

const useLoad = <T,>(load: () => Promise<T>): { data: T | null; error: string | null } => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    load()
      .then((value) => live && setData(value))
      .catch((reason: unknown) => live && setError(reason instanceof Error ? reason.message : String(reason)));
    return () => {
      live = false;
    };
  }, [load]);
  return { data, error };
};

let locationsOnce: Promise<ChronicleLocations> | null = null;
const locationsLoader = (): Promise<ChronicleLocations> => (locationsOnce ??= loadLocations());

let weatherOnce: Promise<WeatherCalendar> | null = null;
const weatherLoader = (): Promise<WeatherCalendar> => (weatherOnce ??= loadWeather());

export const useChronicleLocations = (): { data: ChronicleLocations | null; error: string | null } => useLoad(locationsLoader);

export const useWeatherCalendar = (): { data: WeatherCalendar | null; error: string | null } => useLoad(weatherLoader);
