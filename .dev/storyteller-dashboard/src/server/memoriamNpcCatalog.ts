import { readFile } from "node:fs/promises";

export type MemoriamNpc = {
  readonly filename: string;
  readonly key: string;
  readonly label: string;
  readonly location: string;
  readonly year: string;
  readonly variantOfUnique: string;
  readonly isGeneric: boolean;
  readonly tags: string;
  readonly periods: readonly string[];
};

export type MemoriamNpcCatalog = {
  readonly generatedBy: string;
  readonly sheetId: string;
  readonly rangeName: string;
  readonly tabName: string;
  readonly npcs: readonly MemoriamNpc[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseNpc = (value: unknown, index: number): MemoriamNpc => {
  if (!isRecord(value)) {
    throw new Error(`memoriam-npcs.json npc[${index}] is not an object.`);
  }
  const filename = value.filename;
  const key = value.key;
  const label = value.label;
  const location = value.location;
  const year = value.year;
  const variantOfUnique = value.variantOfUnique;
  const isGeneric = value.isGeneric;
  const tags = value.tags;
  const periods = value.periods;
  if (
    typeof filename !== "string" ||
    typeof key !== "string" ||
    typeof label !== "string" ||
    typeof location !== "string" ||
    typeof year !== "string" ||
    typeof variantOfUnique !== "string" ||
    typeof isGeneric !== "boolean" ||
    typeof tags !== "string" ||
    !Array.isArray(periods) ||
    periods.some((period) => typeof period !== "string")
  ) {
    throw new Error(`memoriam-npcs.json npc[${index}] is missing filename/key/label/location/year/variantOfUnique/isGeneric/tags/periods.`);
  }
  return { filename, key, label, location, year, variantOfUnique, isGeneric, tags, periods };
};

export const parseMemoriamNpcCatalog = (payload: unknown): MemoriamNpcCatalog => {
  if (!isRecord(payload) || !Array.isArray(payload.npcs)) {
    throw new Error("memoriam-npcs.json must contain an npcs array.");
  }
  return {
    generatedBy: typeof payload.generatedBy === "string" ? payload.generatedBy : "",
    sheetId: typeof payload.sheetId === "string" ? payload.sheetId : "",
    rangeName: typeof payload.rangeName === "string" ? payload.rangeName : "",
    tabName: typeof payload.tabName === "string" ? payload.tabName : "",
    npcs: payload.npcs.map(parseNpc)
  };
};

export const loadMemoriamNpcCatalog = async (catalogPath: string): Promise<MemoriamNpcCatalog> => {
  const text = await readFile(catalogPath, "utf8");
  return parseMemoriamNpcCatalog(JSON.parse(text) as unknown);
};
