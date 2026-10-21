#!/usr/bin/env node
"use strict";

/**
 * Remove DecalPallet rows whose URLs appear in Protected Cloud Files/index.json.
 * Preview by default; --apply backs up and atomically rewrites the live save.
 *
 * Usage:
 *   node .tools/tts-save/remove-protected-decal-pallet.js
 *   node .tools/tts-save/remove-protected-decal-pallet.js --apply
 */

const fs = require("fs");
const path = require("path");

const {
  backupSaveBeforeWrite,
  findExistingConfig,
  writeAtomic,
} = require("../custom-ui-assets/lib/custom-ui-assets-save.js");
const {
  PROTECTED_CLOUD_FOLDER,
  assertTtsClosed,
  loadCloudConfig,
} = require("../tts-cloud/lib/cloud_config.js");
const { ugcKeysIn } = require("../tts-cloud/lib/in_use.js");

function protectedKeys(index) {
  if (!index || !Array.isArray(index.files)) throw new Error("Protected index has no files array.");
  const keys = new Set();
  for (const file of index.files) {
    for (const key of ugcKeysIn(String(file.url || ""))) keys.add(key);
  }
  return keys;
}

function filterProtectedDecals(saveRoot, keys) {
  if (!Array.isArray(saveRoot.DecalPallet)) throw new Error("Save has no DecalPallet array.");
  const removed = [];
  const kept = [];
  saveRoot.DecalPallet.forEach((entry, index) => {
    const url = entry && typeof entry === "object" ? String(entry.ImageURL || "") : "";
    const matches = [...ugcKeysIn(url)].some((key) => keys.has(key));
    if (matches) {
      removed.push({
        index,
        name: typeof entry.Name === "string" ? entry.Name : "",
        url,
      });
    } else {
      kept.push(entry);
    }
  });
  return { removed, kept };
}

function main() {
  const apply = process.argv.includes("--apply");
  const unknown = process.argv.slice(2).filter((arg) => arg !== "--apply");
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);

  const cfg = loadCloudConfig();
  const configHit = findExistingConfig();
  if (!configHit) throw new Error("No tts-assets.config.json found.");
  const indexFile = path.join(cfg.assetsDir, PROTECTED_CLOUD_FOLDER, "index.json");
  const saveRoot = JSON.parse(fs.readFileSync(cfg.saveFile, "utf8"));
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  const result = filterProtectedDecals(saveRoot, protectedKeys(index));

  console.log(`${apply ? "Removing" : "Would remove"} ${result.removed.length} protected DecalPallet row(s) from ${cfg.saveFile}:`);
  for (const row of result.removed) console.log(`  [${row.index}] ${row.name || "(unnamed)"}: ${row.url}`);
  if (!apply || result.removed.length === 0) return;

  assertTtsClosed("editing the live save");
  saveRoot.DecalPallet = result.kept;
  const backup = backupSaveBeforeWrite(cfg.saveFile, configHit.config);
  writeAtomic(cfg.saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
  console.log(`Backup: ${backup || "disabled by configuration"}`);
  console.log(`Wrote ${cfg.saveFile}; DecalPallet now has ${result.kept.length} row(s).`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

module.exports = { filterProtectedDecals, protectedKeys };
