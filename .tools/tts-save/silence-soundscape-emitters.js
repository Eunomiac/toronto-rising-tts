"use strict";

/**
 * Parks every soundscape emitter in the live TTS save on the `silent` looping effect.
 *
 * TTS records each AssetBundle's current looping clip (`CustomAssetbundle.LoopingEffectIndex`)
 * on save and restarts it at the bundle's default volume on load, before Lua can mute it.
 * The save stores no emitter volume, so the clip index is the only lever.
 *
 * Emitters: `Custom_Assetbundle` objects whose GMNotes start with `SOUNDSCAPE_`.
 * `silent` is looping effect 0 on every emitter bundle (lib/soundscape_catalog.ttslua `SILENT_EFFECT`).
 *
 * Writes only when an index changes; backs up first per tts-assets.config.json.
 * Soft-fail (exit 0): missing config or save. Hard fail (exit 1): no emitters found, I/O errors.
 * Flags: --dry-run (report only).
 */

const fs = require("fs");
const {
  findExistingConfig,
  resolveExistingSave,
  backupSaveBeforeWrite,
  writeAtomic,
} = require("../custom-ui-assets/lib/custom-ui-assets-save.js");

const LOG_PREFIX = "[tts-save:silence-emitters]";
const SILENT_LOOPING_EFFECT_INDEX = 0;
const EMITTER_GMNOTES_PREFIX = "SOUNDSCAPE_";

/**
 * @param {unknown[]} objects
 * @param {Record<string, unknown>[]} out
 * @returns {Record<string, unknown>[]}
 */
function collectEmitters(objects, out) {
  if (!Array.isArray(objects)) return out;
  for (const obj of objects) {
    if (!obj || typeof obj !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (obj);
    if (
      o.Name === "Custom_Assetbundle" &&
      typeof o.GMNotes === "string" &&
      o.GMNotes.startsWith(EMITTER_GMNOTES_PREFIX) &&
      o.CustomAssetbundle &&
      typeof o.CustomAssetbundle === "object"
    ) {
      out.push(o);
    }
    collectEmitters(/** @type {unknown[]} */ (o.ContainedObjects), out);
  }
  return out;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");

  const existing = findExistingConfig();
  if (!existing) {
    console.error(`${LOG_PREFIX} No tts-assets.config.json found — skipping.`);
    process.exit(0);
  }
  const { config } = existing;

  let saveFile;
  try {
    saveFile = resolveExistingSave(config.defaultSaveName, undefined, config);
  } catch (err) {
    console.error(`${LOG_PREFIX} Could not resolve live save: ${err.message} — skipping.`);
    process.exit(0);
  }

  const saveRoot = JSON.parse(fs.readFileSync(saveFile, "utf8"));
  const emitters = collectEmitters(saveRoot.ObjectStates, []);
  if (emitters.length === 0) {
    console.error(
      `${LOG_PREFIX} No soundscape emitters (Custom_Assetbundle, GMNotes ${EMITTER_GMNOTES_PREFIX}*) in ${saveFile}.`,
    );
    process.exit(1);
  }

  const changed = [];
  for (const obj of emitters) {
    const ab = /** @type {Record<string, unknown>} */ (obj.CustomAssetbundle);
    if (ab.LoopingEffectIndex !== SILENT_LOOPING_EFFECT_INDEX) {
      changed.push(`${obj.GMNotes} (${obj.GUID}) ${ab.LoopingEffectIndex} → ${SILENT_LOOPING_EFFECT_INDEX}`);
      ab.LoopingEffectIndex = SILENT_LOOPING_EFFECT_INDEX;
    }
  }

  if (changed.length === 0) {
    console.error(`${LOG_PREFIX} All ${emitters.length} emitters already on silent.`);
    process.exit(0);
  }

  for (const line of changed) {
    console.error(`${LOG_PREFIX} ${dryRun ? "Would set" : "Set"} ${line}`);
  }
  if (dryRun) {
    process.exit(0);
  }

  backupSaveBeforeWrite(saveFile, config);
  writeAtomic(saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
  console.error(`${LOG_PREFIX} Wrote ${saveFile} (${changed.length} of ${emitters.length} emitters changed).`);
}

main();
