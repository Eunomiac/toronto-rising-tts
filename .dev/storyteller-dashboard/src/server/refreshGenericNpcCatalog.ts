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
  importGenericNpcs: (options?: {
    sheetId?: string;
    rangeName?: string;
    tabName?: string;
    outPath?: string;
    quiet?: boolean;
  }) => Promise<ImportResult>;
};

/**
 * Refresh `.dev/storyteller-dashboard/data/generic-npcs.json` from the public Generics Export sheet.
 * Called on Storyteller Dashboard server startup (not during npm build).
 */
export const refreshGenericNpcCatalogOnStartup = async (catalogPath: string): Promise<void> => {
  const importScriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "scripts",
    "import_generic_npcs_from_sheet.js"
  );
  const { importGenericNpcs } = require(importScriptPath) as ImportModule;

  try {
    const result = await importGenericNpcs({ outPath: catalogPath });
    console.log(`[generic-npcs] Catalog refreshed on startup (${result.npcCount} NPCs).`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (existsSync(catalogPath)) {
      console.error(`[generic-npcs] Sheet refresh failed; using existing catalog. ${message}`);
      return;
    }
    throw new Error(`Could not refresh generic NPC catalog and no existing file at ${catalogPath}: ${message}`);
  }
};
