import { useEffect, useState } from "react";

/**
 * Lab-only reads of the author's chronicle Google Sheets (see `.dev/Chronicle Data/Google Sheets.md`). The
 * sheets are link-viewable and Google allows this origin, so the browser fetches one tab at a time as CSV.
 * Nothing here is written to disk or committed.
 */

const SHEETS = {
  torontoRising: "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs",
  api: "1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4"
} as const;

type Rows = readonly (readonly string[])[];

const parseCsv = (text: string): Rows => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

const tabCache = new Map<string, Promise<Rows>>();

const fetchTab = (sheet: keyof typeof SHEETS, tab: string): Promise<Rows> => {
  const key = `${sheet}/${tab}`;
  const cached = tabCache.get(key);
  if (cached) {
    return cached;
  }
  const url = `https://docs.google.com/spreadsheets/d/${SHEETS[sheet]}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(tab)}`;
  const pending = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Sheet tab "${tab}" failed to load (${response.status}).`);
    }
    return parseCsv(await response.text());
  });
  tabCache.set(key, pending);
  pending.catch(() => tabCache.delete(key));
  return pending;
};

/** Rows of a header-first tab as objects keyed by the header cells. */
const asRecords = (rows: Rows): readonly Readonly<Record<string, string>>[] => {
  const [header, ...body] = rows;
  if (!header) {
    return [];
  }
  return body.map((row) => Object.fromEntries(header.map((name, index) => [name.trim(), (row[index] ?? "").trim()])));
};

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
  const [districtRows, uniqueRows, genericRows] = await Promise.all([
    fetchTab("api", "Districts.csv"),
    fetchTab("api", "Sites_Unique.csv"),
    fetchTab("api", "Sites_Generic.csv")
  ]);
  const districts = asRecords(districtRows)
    .filter((row) => row.key)
    .map((row): SheetDistrict => ({
      key: row.key ?? "",
      name: titleCase(row.NAME ?? ""),
      resonances: resonances(row["Resonance Plus"], row["Resonance Minus"]),
      aspects: [1, 2, 3].map((n) => ({ title: row[`Aspect Title ${n}`] ?? "", text: row[`Aspect Content ${n}`] ?? "" }))
    }));
  const site = (unique: boolean) => (row: Readonly<Record<string, string>>): SheetSite => ({
    key: row.Key ?? "",
    title: row.Title ?? "",
    subtitle: row.Subtitle ?? "",
    unique,
    resonances: resonances(row["Resonance Plus"], row["Resonance Minus"]),
    aspect: { title: row["Aspect Title"] ?? "", text: row["Aspect Content"] ?? "" }
  });
  const sites = [
    ...asRecords(uniqueRows).filter((row) => row.Key).map(site(true)),
    ...asRecords(genericRows).filter((row) => row.Key).map(site(false))
  ];
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
  const rows = await fetchTab("torontoRising", "WEATHER");
  const avgTemp = new Map<number, number>();
  const codes = new Map<string, readonly string[]>();
  for (const row of rows) {
    const month = Number(row[19]);
    const day = Number(row[21]);
    const list = row[22] ?? "";
    if (!Number.isInteger(month) || month < 1 || !Number.isInteger(day) || day < 1 || !list.includes('"')) {
      continue;
    }
    avgTemp.set(month, Number(row[20]));
    codes.set(`${month}-${day}`, [...list.matchAll(/"([^"]{5})"/g)].map((match) => match[1] ?? ""));
  }
  if (codes.size === 0) {
    throw new Error("WEATHER tab: no day codes found (columns T–W moved?).");
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
