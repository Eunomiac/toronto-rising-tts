import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { planFigurineAssets, type UiAssetPlan, type UiAssetRow } from "./model.ts";

/** The shared TTS save helpers in `.tools/custom-ui-assets/lib` (CommonJS). */
type SaveTools = {
  readonly findExistingConfig: () => { readonly config: unknown; readonly path: string } | null;
  readonly resolveExistingSave: (saveName: string | undefined, savePath: string | undefined, config: unknown) => string;
  readonly backupSaveBeforeWrite: (savePath: string, config: unknown) => string | null;
  readonly writeAtomic: (file: string, contents: string) => void;
};

const isUiAssetRow = (value: unknown): value is UiAssetRow =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { Name?: unknown }).Name === "string" &&
  typeof (value as { URL?: unknown }).URL === "string";

/**
 * Brings the save's roll-banner figurine rows (global `CustomUIAssets` named after each character key) in line with
 * the repo art. The save named by `tts-assets.config.json` is backed up and rewritten only when a row changes.
 */
export const syncSaveFigurineAssets = async (
  repoRoot: string,
  wanted: ReadonlyMap<string, string>,
  characterKeys: ReadonlySet<string>,
  artBaseUrl: string
): Promise<{ readonly saveFile: string; readonly plan: UiAssetPlan }> => {
  const tools = createRequire(import.meta.url)(path.join(repoRoot, ".tools", "custom-ui-assets", "lib", "custom-ui-assets-save.js")) as SaveTools;
  const found = tools.findExistingConfig();
  if (found === null) {
    throw new Error("tts-assets.config.json not found, so the TTS save cannot be updated. Run npm run tts-assets:configure.");
  }
  const saveFile = tools.resolveExistingSave(undefined, undefined, found.config);
  const save = JSON.parse(await readFile(saveFile, "utf8")) as Record<string, unknown>;
  const rows = save.CustomUIAssets;
  if (!Array.isArray(rows) || !rows.every(isUiAssetRow)) {
    throw new Error(`${saveFile} has no CustomUIAssets list of { Name, URL } rows.`);
  }
  const plan = planFigurineAssets(rows, wanted, characterKeys, artBaseUrl);
  if (plan.added.length + plan.updated.length + plan.removed.length > 0) {
    tools.backupSaveBeforeWrite(saveFile, found.config);
    save.CustomUIAssets = plan.rows;
    tools.writeAtomic(saveFile, `${JSON.stringify(save, null, 2)}\n`);
  }
  return { saveFile, plan };
};
