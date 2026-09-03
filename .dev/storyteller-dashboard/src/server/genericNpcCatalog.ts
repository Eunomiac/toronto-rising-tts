import { readFile } from "node:fs/promises";
import path from "node:path";

export type GenericNpc = {
  readonly filename: string;
  readonly label: string;
  readonly key: string;
  readonly tags: string;
};

export type GenericNpcCatalog = {
  readonly generatedBy: string;
  readonly sheetId: string;
  readonly rangeName: string;
  readonly tabName: string;
  readonly npcs: readonly GenericNpc[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseNpc = (value: unknown, index: number): GenericNpc => {
  if (!isRecord(value)) {
    throw new Error(`generic-npcs.json npc[${index}] is not an object.`);
  }
  const filename = value.filename;
  const label = value.label;
  const key = value.key;
  const tags = value.tags;
  if (typeof filename !== "string" || typeof label !== "string" || typeof key !== "string" || typeof tags !== "string") {
    throw new Error(`generic-npcs.json npc[${index}] is missing filename/label/key/tags.`);
  }
  return { filename, label, key, tags };
};

export const parseGenericNpcCatalog = (payload: unknown): GenericNpcCatalog => {
  if (!isRecord(payload) || !Array.isArray(payload.npcs)) {
    throw new Error("generic-npcs.json must contain an npcs array.");
  }
  return {
    generatedBy: typeof payload.generatedBy === "string" ? payload.generatedBy : "",
    sheetId: typeof payload.sheetId === "string" ? payload.sheetId : "",
    rangeName: typeof payload.rangeName === "string" ? payload.rangeName : "",
    tabName: typeof payload.tabName === "string" ? payload.tabName : "",
    npcs: payload.npcs.map(parseNpc)
  };
};

export const loadGenericNpcCatalog = async (catalogPath: string): Promise<GenericNpcCatalog> => {
  const text = await readFile(catalogPath, "utf8");
  return parseGenericNpcCatalog(JSON.parse(text) as unknown);
};

export const resolveGenericNpcImagePath = (imageDir: string, filename: string): string | null => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.webp$/.test(filename)) {
    return null;
  }
  const imageRoot = path.resolve(imageDir);
  const resolved = path.resolve(imageRoot, filename);
  const relative = path.relative(imageRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
};
