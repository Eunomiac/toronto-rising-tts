import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isEmptyMemoriamOverride,
  memoriamOverrideAgainstSheet,
  parseMemoriamLocations,
  parseMemoriamPeriods,
  parseMemoriamYears,
  type MemoriamFieldOverride,
  type MemoriamYear
} from "../shared/memoriamNpc.js";

/**
 * Dashboard edits of a Memoriam NPC's location, year, and periods (`data/memoriam-npc-fields.json`).
 * The sheet import rewrites `memoriam-npcs.json` and never touches this file.
 */

export class MemoriamFieldError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type MemoriamFieldFile = { readonly fields: Readonly<Record<string, MemoriamFieldOverride>> };

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const requireMemoriamFieldKey = (key: string | null): string => {
  if (key === null || !KEY_PATTERN.test(key)) {
    throw new MemoriamFieldError("Expected ?key=<memoriamNpcKey>.", 400);
  }
  return key;
};

const stringList = (value: unknown, label: string): string[] | string => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return `${label} must be a list of text values.`;
  }
  return value;
};

/** The three lists from the token window, or an error message. */
export const parseMemoriamFieldBody = (
  value: unknown,
  knownPeriods: ReadonlySet<string>
): { readonly locations: readonly string[]; readonly years: readonly MemoriamYear[]; readonly periods: readonly string[] } | string => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "Expected locations, years, and periods.";
  }
  const raw = value as Record<string, unknown>;
  const locations = stringList(raw.locations, "Location");
  const years = stringList(raw.years, "Year");
  const periods = stringList(raw.periods, "Periods");
  if (typeof locations === "string") {
    return locations;
  }
  if (typeof years === "string") {
    return years;
  }
  if (typeof periods === "string") {
    return periods;
  }
  const parsedLocations = parseMemoriamLocations(locations.join(", "));
  const parsedYears = parseMemoriamYears(years.join(", "));
  const parsedPeriods = parseMemoriamPeriods(periods.join(", "), knownPeriods);
  if (typeof parsedLocations === "string") {
    return parsedLocations;
  }
  if (typeof parsedYears === "string") {
    return parsedYears;
  }
  if (typeof parsedPeriods === "string") {
    return parsedPeriods;
  }
  return { locations: parsedLocations, years: parsedYears, periods: parsedPeriods };
};

const isOverride = (value: unknown): value is MemoriamFieldOverride => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  const list = (entry: unknown): boolean => entry === undefined || (Array.isArray(entry) && entry.every((item) => typeof item === "string"));
  return list(raw.locations) && list(raw.years) && list(raw.periods);
};

export const createMemoriamFieldStore = (filePath: string) => {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<MemoriamFieldFile> => {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { fields: {} };
      }
      throw error;
    }
    const parsed: unknown = JSON.parse(text);
    const raw = typeof parsed === "object" && parsed !== null ? (parsed as { fields?: unknown }).fields : undefined;
    const fields: Record<string, MemoriamFieldOverride> = {};
    if (typeof raw === "object" && raw !== null) {
      for (const [key, value] of Object.entries(raw)) {
        if (KEY_PATTERN.test(key) && isOverride(value) && !isEmptyMemoriamOverride(value)) {
          fields[key] = value;
        }
      }
    }
    return { fields };
  };

  const write = async (fields: Record<string, MemoriamFieldOverride>): Promise<MemoriamFieldFile> => {
    const sorted: Record<string, MemoriamFieldOverride> = {};
    for (const key of Object.keys(fields).sort()) {
      const override = fields[key];
      if (override && !isEmptyMemoriamOverride(override)) {
        sorted[key] = override;
      }
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify({ fields: sorted }, null, 2)}\n`, "utf8");
    await rename(tmp, filePath);
    return { fields: sorted };
  };

  return {
    list: (): Promise<MemoriamFieldFile> => serial(read),

    /**
     * Stores only the lists that differ from the sheet. Matching the sheet removes that list,
     * and matching all three removes the NPC's entry.
     */
    put: (
      key: string,
      desired: { readonly locations: readonly string[]; readonly years: readonly MemoriamYear[]; readonly periods: readonly string[] },
      sheet: { readonly locations: readonly string[]; readonly years: readonly string[]; readonly periods: readonly string[] }
    ): Promise<MemoriamFieldFile> => serial(async () => {
      const fields = { ...(await read()).fields };
      const override = memoriamOverrideAgainstSheet(desired, sheet);
      if (isEmptyMemoriamOverride(override)) {
        delete fields[key];
      } else {
        fields[key] = override;
      }
      return write(fields);
    })
  };
};

export type MemoriamFieldStore = ReturnType<typeof createMemoriamFieldStore>;
