#!/usr/bin/env node
"use strict";

// Report character keys uploaded in an NPC group manifest that are missing from D.characters.
// Prints figurine front/back hosted URLs for copy-paste into npcs_data.

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../tts-save/resolve-save-path");
const {
  deriveNpcGroupAssetNames,
  ensureParentDir,
  extractCharacterKeysFromNpcsData,
  isHostedSteamUrl,
  readCustomUiAssetMap,
} = require("./lib/npc-asset-helpers");

const DEFAULT_REPORT_OUT = ".dev/custom-ui-assets/npc-registry-gap-report.txt";

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = "1";
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

/**
 * @param {string} manifestPath
 * @returns {string[]}
 */
function readCharacterKeysFromManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (Array.isArray(manifest.pendingCharacterKeys) && manifest.pendingCharacterKeys.length > 0) {
    return manifest.pendingCharacterKeys.map((k) => String(k));
  }
  if (Array.isArray(manifest.assets)) {
    /** @type {Set<string>} */
    const keys = new Set();
    for (const asset of manifest.assets) {
      if (asset && typeof asset === "object" && typeof asset.characterKey === "string") {
        keys.add(asset.characterKey);
      }
    }
    return [...keys].sort((a, b) => a.localeCompare(b, "en"));
  }
  return [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest || ".dev/custom-ui-assets/npc-group-manifest.json");
  const npcsDataPath = path.resolve(args.npcsData || "lib/npcs_data.ttslua");
  const reportOut = path.resolve(args.out || DEFAULT_REPORT_OUT);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  if (!fs.existsSync(npcsDataPath)) {
    throw new Error(`NPC data file not found: ${npcsDataPath}`);
  }

  const uploadedKeys = readCharacterKeysFromManifest(manifestPath);
  if (uploadedKeys.length === 0) {
    console.log("No character keys in manifest (empty or already-hosted batch); nothing to report.");
    return;
  }

  const npcsText = fs.readFileSync(npcsDataPath, "utf8");
  const knownKeys = extractCharacterKeysFromNpcsData(npcsText);
  const missingKeys = uploadedKeys.filter((key) => !knownKeys.has(key));

  if (missingKeys.length === 0) {
    console.log("All uploaded character keys exist in D.characters.");
    return;
  }

  const saveArg = (args.save || "").trim();
  const saveNameArg = (args.saveName || "").trim();
  let assetMap = new Map();
  if (saveArg || saveNameArg) {
    const savePath = saveArg
      ? path.resolve(saveArg)
      : resolveSavePath(saveNameArg, args.savesDir).savePath;
    if (!fs.existsSync(savePath)) {
      throw new Error(`Save file not found: ${savePath}`);
    }
    const saveRoot = JSON.parse(fs.readFileSync(savePath, "utf8"));
    assetMap = readCustomUiAssetMap(saveRoot);
  } else {
    const assetsOut = path.resolve(
      args.assetsOut || ".dev/custom-ui-assets/npc-group-generated-assets.json",
    );
    if (fs.existsSync(assetsOut)) {
      const rows = JSON.parse(fs.readFileSync(assetsOut, "utf8"));
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && typeof row === "object" && typeof row.Name === "string" && typeof row.URL === "string") {
            assetMap.set(row.Name, row.URL);
          }
        }
      }
    }
  }

  /** @type {string[]} */
  const lines = [
    "# NPC registry gap report",
    `# Generated: ${new Date().toISOString()}`,
    `# Keys uploaded in manifest but missing from D.characters (${missingKeys.length})`,
    "",
  ];

  for (const key of missingKeys) {
    const names = deriveNpcGroupAssetNames(key);
    const frontUrl = assetMap.get(names.figurineFront) || "(not found in save/generated assets)";
    const backUrl = assetMap.get(names.figurineBack) || "(not found in save/generated assets)";
    lines.push(`${key}:`);
    lines.push(`  front: ${frontUrl}`);
    lines.push(`  back: ${backUrl}`);
    if (!isHostedSteamUrl(frontUrl) || !isHostedSteamUrl(backUrl)) {
      lines.push("  NOTE: figurine URLs may be missing — run merge after Cloud upload");
    }
    lines.push("");
  }

  const reportText = `${lines.join("\n")}\n`;
  ensureParentDir(reportOut);
  fs.writeFileSync(reportOut, reportText, "utf8");

  console.log(reportText);
  console.log(`Report written: ${reportOut}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
