import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

type ImportResult = {
  readonly npcCount: number;
  readonly outPath: string;
};

type ImportModule = {
  importMemoriamNpcs: (options?: {
    sheetId?: string;
    rangeName?: string;
    tabName?: string;
    outPath?: string;
    quiet?: boolean;
  }) => Promise<ImportResult>;
};

/**
 * Refresh `.dev/storyteller-dashboard/data/memoriam-npcs.json` from the consolidated character exports.
 * Called on Storyteller Dashboard server startup (the full build also runs the same import).
 */
export const refreshMemoriamNpcCatalogOnStartup = async (catalogPath: string): Promise<void> => {
  const importScriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "scripts",
    "import_memoriam_npcs_from_sheet.js"
  );
  const { importMemoriamNpcs } = require(importScriptPath) as ImportModule;

  const result = await importMemoriamNpcs({ outPath: catalogPath });
  console.log(`[exports] Catalog refreshed (${result.npcCount} NPCs).`);
};
