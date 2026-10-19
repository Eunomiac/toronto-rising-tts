import { existsSync } from "node:fs";
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
 * Refresh `.dev/storyteller-dashboard/data/memoriam-npcs.json` from the Memoriam NPC Export sheet.
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

  try {
    const result = await importMemoriamNpcs({ outPath: catalogPath });
    console.log(`[memoriam-npcs] Catalog refreshed on startup (${result.npcCount} NPCs).`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (existsSync(catalogPath)) {
      console.error(`[memoriam-npcs] Sheet refresh failed; using existing catalog. ${message}`);
      return;
    }
    throw new Error(`Could not refresh Memoriam NPC catalog and no existing file at ${catalogPath}: ${message}`);
  }
};
