import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
// Both src/server and dist/server have the same depth below the app directory.
const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts");
type Character = { name: string; fullName: string; isPC: boolean; catalog: boolean; filename: string; canonicalKey?: string };
const exportsModule = require(path.join(scripts, "lib/sheet_exports.js")) as {
  loadSnapshot: () => Promise<unknown>;
  dataOf: (snapshot: unknown, name: string) => Record<string, string>[];
  uniqueCharacters: (snapshot: unknown) => Record<string, Character>;
  genericFigures: (snapshot: unknown) => { key: string; filename: string }[];
};
const importer = require(path.join(scripts, "import_character_exports.js")) as {
  writeCharacterExports: (snapshot: unknown, options: { lua: boolean }) => unknown;
};
let snapshot: unknown;
let characters: Record<string, Character> = {};
let filenames = new Map<string, string>();
export const refreshSheetExports = async (): Promise<void> => {
  snapshot = await exportsModule.loadSnapshot();
  importer.writeCharacterExports(snapshot, { lua: false });
  characters = exportsModule.uniqueCharacters(snapshot);
  filenames = new Map([...Object.entries(characters).map(([key, row]) => [key, row.filename] as const), ...exportsModule.genericFigures(snapshot).map(row => [row.key, row.filename] as const)]);
  console.log("[exports] Dashboard uses one validated snapshot of all named ranges.");
};
export const exportRecords = (name: string): Record<string, string>[] => exportsModule.dataOf(snapshot, name);
export const characterDefinitions = (): Record<string, Character> => characters;
export const figureFilename = (key: string): string | undefined => filenames.get(key);
