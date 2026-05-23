#!/usr/bin/env node
"use strict";

// Merge save DecalPallet BP variant URLs into CSHEET_PAGE_1/2 CustomUIAssets so setDecals can swap URLs per object.
// Agent guidance: .dev/PC Data & Tracking/Character Sheet Modifications.md

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
const BP_VARIANT_KEYS = new Set([
  "baneSeverity0", "baneSeverity2", "baneSeverity3", "baneSeverity4", "baneSeverity5", "baneSeverity6",
  "bloodSurge1", "bloodSurge2", "bloodSurge3", "bloodSurge4", "bloodSurge5", "bloodSurge6",
  "discBonus0", "discBonus1", "discBonus2", "discBonus3", "discBonus4", "discBonus5",
  "discReroll0", "discReroll1", "discReroll2", "discReroll3", "discReroll4", "discReroll5",
  "mending1", "mending2", "mending3", "mending4", "mending5",
]);

const SLOT_PREFIX = /^(bloodSurge|mending|discBonus|discReroll|baneSeverity)\d+$/;

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {Map<string, string>}
 */
function bpUrlsFromDecalPallet(saveRoot) {
  /** @type {Map<string, string>} */
  const out = new Map();
  const pallet = saveRoot.DecalPallet;
  if (!Array.isArray(pallet)) {
    return out;
  }
  for (const entry of pallet) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (entry);
    const name = typeof rec.Name === "string" ? rec.Name : null;
    const url = typeof rec.ImageURL === "string" ? rec.ImageURL : null;
    if (name && url && BP_VARIANT_KEYS.has(name)) {
      out.set(name, url);
    }
  }
  return out;
}

/**
 * @param {unknown} assets
 * @param {Map<string, string>} bpUrls
 * @returns {number}
 */
function mergeIntoCustomUIAssets(assets, bpUrls) {
  if (!Array.isArray(assets)) {
    return 0;
  }
  /** @type {Map<string, number>} */
  const indexByName = new Map();
  for (let i = 0; i < assets.length; i += 1) {
    const entry = assets[i];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const name = /** @type {Record<string, unknown>} */ (entry).Name;
    if (typeof name === "string") {
      indexByName.set(name, i);
    }
  }
  let added = 0;
  for (const [name, url] of bpUrls.entries()) {
    const existingIdx = indexByName.get(name);
    if (existingIdx !== undefined) {
      const row = /** @type {Record<string, unknown>} */ (assets[existingIdx]);
      row.Type = 0;
      row.Name = name;
      row.URL = url;
      continue;
    }
    assets.push({ Type: 0, Name: name, URL: url });
    indexByName.set(name, assets.length - 1);
    added += 1;
  }
  return added;
}

/**
 * Rename AttachedDecal CustomDecal.Name variant keys → static slot keys on CSHEET pages 1/2.
 * @param {Record<string, unknown>} obj
 * @returns {number}
 */
function renameAttachedDecalSlotNames(obj) {
  let n = 0;
  const nickname = typeof obj.Nickname === "string" ? obj.Nickname : "";
  if (!/^CSHEET_PAGE_[12]_/.test(nickname)) {
    return n;
  }
  const decals = obj.AttachedDecals;
  if (!Array.isArray(decals)) {
    return n;
  }
  for (const decal of decals) {
    if (!decal || typeof decal !== "object") {
      continue;
    }
    const cd = /** @type {Record<string, unknown>} */ (decal).CustomDecal;
    if (!cd || typeof cd !== "object") {
      continue;
    }
    const custom = /** @type {Record<string, unknown>} */ (cd);
    const name = typeof custom.Name === "string" ? custom.Name : null;
    if (!name) {
      continue;
    }
    const m = name.match(SLOT_PREFIX);
    if (m) {
      custom.Name = m[1];
      n += 1;
    }
  }
  return n;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const savePath = path.resolve(args.save || ".dev/TS_Save_230.json");
  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const saveRootRaw = JSON.parse(fs.readFileSync(savePath, "utf8"));
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root must be an object.");
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const bpUrls = bpUrlsFromDecalPallet(saveRoot);
  if (bpUrls.size === 0) {
    throw new Error("DecalPallet has no BP variant entries — upload decals and save in TTS first.");
  }

  const objects = saveRoot.ObjectStates;
  if (!Array.isArray(objects)) {
    throw new Error("Save missing ObjectStates array.");
  }

  let objectsTouched = 0;
  let assetsAdded = 0;
  let decalsRenamed = 0;
  for (const obj of objects) {
    if (!obj || typeof obj !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (obj);
    const nickname = typeof rec.Nickname === "string" ? rec.Nickname : "";
    if (!/^CSHEET_PAGE_[12]_/.test(nickname)) {
      continue;
    }
    decalsRenamed += renameAttachedDecalSlotNames(rec);
    if (!Array.isArray(rec.CustomUIAssets)) {
      rec.CustomUIAssets = [];
    }
    const added = mergeIntoCustomUIAssets(rec.CustomUIAssets, bpUrls);
    if (added > 0) {
      assetsAdded += added;
    }
    objectsTouched += 1;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");

  console.log(`Save: ${savePath}`);
  console.log(`DecalPallet BP URLs: ${bpUrls.size}`);
  console.log(`CSHEET page 1/2 objects updated: ${objectsTouched}`);
  console.log(`CustomUIAssets entries added: ${assetsAdded}`);
  console.log(`AttachedDecal slot renames: ${decalsRenamed}`);
}

main();
