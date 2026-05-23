#!/usr/bin/env node
"use strict";

// Scan a TTS save JSON for Blood Potency decal variant keys (bloodSurge2, mending1, …).
// Primary source: save root DecalPallet[] ({ Name, ImageURL, Size }) from Mod → Decals upload.
// Fallback: AttachedDecals[].CustomDecal on objects; CustomUIAssets / CustomAssets (Name + URL).

const fs = require("fs");
const path = require("path");

/**
 * Parse CLI args of shape: --key value
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}"`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

/** @type {Set<string>} */
const BP_VARIANT_KEY_PATTERN = new Set([
  "baneSeverity0", "baneSeverity2", "baneSeverity3", "baneSeverity4", "baneSeverity5", "baneSeverity6",
  "bloodSurge1", "bloodSurge2", "bloodSurge3", "bloodSurge4", "bloodSurge5", "bloodSurge6",
  "discBonus0", "discBonus1", "discBonus2", "discBonus3", "discBonus4", "discBonus5",
  "discReroll0", "discReroll1", "discReroll2", "discReroll3", "discReroll4", "discReroll5",
  "mending1", "mending2", "mending3", "mending4", "mending5",
]);

/**
 * @param {string} name
 * @returns {boolean}
 */
function isBpVariantKey(name) {
  return BP_VARIANT_KEY_PATTERN.has(name);
}

/**
 * Collect Name/URL pairs from DecalPallet (Mod → Decals library).
 * @param {unknown} pallet
 * @param {Map<string, { url: string; sources: Set<string> }>} out
 */
function collectFromDecalPallet(pallet, out) {
  if (!Array.isArray(pallet)) {
    return;
  }
  for (let i = 0; i < pallet.length; i += 1) {
    const entry = pallet[i];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (entry);
    const name = typeof rec.Name === "string" ? rec.Name : null;
    const url = typeof rec.ImageURL === "string"
      ? rec.ImageURL
      : typeof rec.URL === "string"
        ? rec.URL
        : null;
    if (!name || !url || !isBpVariantKey(name)) {
      continue;
    }
    const label = `DecalPallet[${i}]`;
    const existing = out.get(name);
    if (!existing) {
      out.set(name, { url, sources: new Set([label]) });
      continue;
    }
    existing.sources.add(label);
    if (existing.url !== url) {
      console.warn(`WARN: conflicting URL for ${name}: ${existing.url} vs ${url} (${label})`);
    }
  }
}

/**
 * Collect Name/URL pairs from a custom-asset-like array.
 * @param {unknown} assets
 * @param {string} sourceLabel
 * @param {Map<string, { url: string; sources: Set<string> }>} out
 */
function collectFromAssetArray(assets, sourceLabel, out) {
  if (!Array.isArray(assets)) {
    return;
  }
  for (let i = 0; i < assets.length; i += 1) {
    const entry = assets[i];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (entry);
    const name = typeof rec.Name === "string" ? rec.Name : null;
    const url = typeof rec.URL === "string" ? rec.URL : null;
    if (!name || !url || !isBpVariantKey(name)) {
      continue;
    }
    const existing = out.get(name);
    if (!existing) {
      out.set(name, { url, sources: new Set([sourceLabel]) });
      continue;
    }
    existing.sources.add(sourceLabel);
    if (existing.url !== url) {
      console.warn(`WARN: conflicting URL for ${name}: ${existing.url} vs ${url} (${sourceLabel})`);
    }
  }
}

/**
 * Walk object tree for AttachedDecal arrays (Name + URL on decal entries).
 * @param {unknown} node
 * @param {string} pathLabel
 * @param {Map<string, { url: string; sources: Set<string> }>} out
 */
function walkForAttachedDecals(node, pathLabel, out) {
  if (node === null || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      walkForAttachedDecals(node[i], `${pathLabel}[${i}]`, out);
    }
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);

  if (Array.isArray(obj.AttachedDecals)) {
    for (let i = 0; i < obj.AttachedDecals.length; i += 1) {
      const decal = obj.AttachedDecals[i];
      if (!decal || typeof decal !== "object") {
        continue;
      }
      const d = /** @type {Record<string, unknown>} */ (decal);
      const customDecal = d.CustomDecal;
      if (customDecal && typeof customDecal === "object") {
        const cd = /** @type {Record<string, unknown>} */ (customDecal);
        const name = typeof cd.Name === "string" ? cd.Name : null;
        const url = typeof cd.ImageURL === "string"
          ? cd.ImageURL
          : typeof cd.URL === "string"
            ? cd.URL
            : null;
        if (name && url && isBpVariantKey(name)) {
          const label = `${pathLabel}.AttachedDecals[${i}].CustomDecal`;
          const existing = out.get(name);
          if (!existing) {
            out.set(name, { url, sources: new Set([label]) });
          } else {
            existing.sources.add(label);
          }
        }
      }
      const flatName = typeof d.Name === "string" ? d.Name : null;
      const flatUrl = typeof d.URL === "string" ? d.URL : null;
      if (flatName && flatUrl && isBpVariantKey(flatName)) {
        const label = `${pathLabel}.AttachedDecals[${i}]`;
        const existing = out.get(flatName);
        if (!existing) {
          out.set(flatName, { url: flatUrl, sources: new Set([label]) });
        } else {
          existing.sources.add(label);
        }
      }
    }
  }

  for (const key of Object.keys(obj)) {
    walkForAttachedDecals(obj[key], `${pathLabel}.${key}`, out);
  }
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {Map<string, { url: string; sources: Set<string> }>}
 */
function extractBpDecalUrls(saveRoot) {
  /** @type {Map<string, { url: string; sources: Set<string> }>} */
  const found = new Map();

  collectFromDecalPallet(saveRoot.DecalPallet, found);
  collectFromAssetArray(saveRoot.CustomUIAssets, "CustomUIAssets", found);
  collectFromAssetArray(saveRoot.CustomAssets, "CustomAssets", found);
  collectFromAssetArray(saveRoot.CustomDecals, "CustomDecals", found);
  collectFromAssetArray(saveRoot.CustomDecal, "CustomDecal", found);

  walkForAttachedDecals(saveRoot, "saveRoot", found);

  return found;
}

/**
 * @param {Map<string, { url: string; sources: Set<string> }>} found
 */
function printReport(found) {
  const expected = [...BP_VARIANT_KEY_PATTERN].sort();
  const missing = expected.filter((k) => !found.has(k));

  console.log(`Found ${found.size} / ${expected.length} BP decal variant URLs`);
  console.log("");
  console.log("key | url | source(s)");
  console.log("--- | --- | ---");
  for (const key of expected) {
    const row = found.get(key);
    if (!row) {
      console.log(`${key} | <missing> |`);
      continue;
    }
    const sources = [...row.sources].slice(0, 2).join("; ");
    const more = row.sources.size > 2 ? ` (+${row.sources.size - 2} more)` : "";
    console.log(`${key} | ${row.url} | ${sources}${more}`);
  }

  if (missing.length > 0) {
    console.log("");
    console.log(`Missing keys (${missing.length}): ${missing.join(", ")}`);
  }
}

/**
 * Emit Lua table lines for C.BloodPotencyDecalUrls.
 * @param {Map<string, { url: string }>} found
 * @returns {string}
 */
function toLuaTable(found) {
  const lines = ["C.BloodPotencyDecalUrls = {"];
  for (const key of [...BP_VARIANT_KEY_PATTERN].sort()) {
    const row = found.get(key);
    if (!row) {
      lines.push(`  ${key} = "https://REPLACE_ME.toronto-rising/${key}", -- MISSING IN SAVE`);
      continue;
    }
    lines.push(`  ${key} = "${row.url}",`);
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * Normalize user-entered save identifier into TS save JSON filename.
 * @param {string} raw
 * @returns {string}
 */
function toSaveFileName(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Save name input is empty.");
  }
  let name = trimmed;
  if (!/^TS_Save_/i.test(name)) {
    name = `TS_Save_${name}`;
  }
  if (!/\.json$/i.test(name)) {
    name = `${name}.json`;
  }
  return name;
}

/**
 * Resolve save path from --save or --saveName.
 * @param {Record<string, string>} args
 * @returns {string}
 */
function resolveSavePath(args) {
  if (args.save) {
    return path.resolve(args.save);
  }
  const saveInput = args.saveName || "230";
  const savesDir = process.env.TTS_SAVES_DIR
    || "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves";
  const saveFileName = toSaveFileName(saveInput);
  return path.join(savesDir, saveFileName);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const savePath = resolveSavePath(args);
  const luaOut = args.luaOut ? path.resolve(args.luaOut) : null;

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const saveRootRaw = JSON.parse(fs.readFileSync(savePath, "utf8"));
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }

  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const found = extractBpDecalUrls(saveRoot);

  console.log(`Save: ${savePath}`);
  console.log("");
  printReport(found);

  if (luaOut) {
    fs.writeFileSync(luaOut, `${toLuaTable(found)}\n`, "utf8");
    console.log("");
    console.log(`Wrote Lua snippet: ${luaOut}`);
  }
}

main();
