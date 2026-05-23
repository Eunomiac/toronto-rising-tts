#!/usr/bin/env node
"use strict";

// Merge object-scoped CustomUIAssets from a JSON manifest into a TTS save file.
// Agent guidance: .dev/custom-ui-assets/; lib/json/PC_Relationship_Images.json

const fs = require("fs");
const path = require("path");

/**
 * @typedef {{
 *  objectRef: string;
 *  imgKey: string;
 *  imgURL: string;
 * }} ObjectUiAssetEntry
 */

/**
 * @typedef {{
 *  added: number;
 *  updated: number;
 *  details: string[];
 * }} MergeResult
 */

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

/**
 * Normalize hosted URL for stable comparison.
 * @param {unknown} value
 * @returns {string}
 */
function normalizeUrl(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\/+$/, "");
}

/**
 * Read and validate the object CustomUIAssets manifest.
 * @param {string} manifestPath
 * @returns {ObjectUiAssetEntry[]}
 */
function readManifest(manifestPath) {
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error(`Manifest must be a JSON array: ${manifestPath}`);
  }

  /** @type {ObjectUiAssetEntry[]} */
  const entries = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      throw new Error(`Manifest row ${i} must be an object.`);
    }
    const rec = /** @type {Record<string, unknown>} */ (row);
    const objectRef = rec.objectRef;
    const imgKey = rec.imgKey;
    const imgURL = rec.imgURL;
    if (typeof objectRef !== "string" || objectRef.trim() === "") {
      throw new Error(`Manifest row ${i} missing string "objectRef".`);
    }
    if (typeof imgKey !== "string" || imgKey.trim() === "") {
      throw new Error(`Manifest row ${i} missing string "imgKey".`);
    }
    if (typeof imgURL !== "string" || normalizeUrl(imgURL) === "") {
      throw new Error(`Manifest row ${i} missing string "imgURL".`);
    }
    entries.push({
      objectRef: objectRef.trim(),
      imgKey: imgKey.trim(),
      imgURL: imgURL.trim(),
    });
  }
  return entries;
}

/**
 * Group manifest rows by object nickname.
 * @param {ObjectUiAssetEntry[]} entries
 * @returns {Map<string, ObjectUiAssetEntry[]>}
 */
function groupByObjectRef(entries) {
  /** @type {Map<string, ObjectUiAssetEntry[]>} */
  const grouped = new Map();
  for (const entry of entries) {
    const list = grouped.get(entry.objectRef);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(entry.objectRef, [entry]);
    }
  }
  return grouped;
}

/**
 * Build nickname -> object map from save ObjectStates.
 * @param {Record<string, unknown>} saveRoot
 * @returns {Map<string, Record<string, unknown>>}
 */
function indexObjectsByNickname(saveRoot) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byNickname = new Map();
  const objects = saveRoot.ObjectStates;
  if (!Array.isArray(objects)) {
    throw new Error("Save missing ObjectStates array.");
  }
  for (const obj of objects) {
    if (!obj || typeof obj !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (obj);
    const nickname = typeof rec.Nickname === "string" ? rec.Nickname : "";
    if (nickname !== "") {
      byNickname.set(nickname, rec);
    }
  }
  return byNickname;
}

/**
 * Merge expected assets into one object's CustomUIAssets array.
 * @param {Record<string, unknown>} obj
 * @param {ObjectUiAssetEntry[]} expectedAssets
 * @param {string} objectRef
 * @returns {MergeResult}
 */
function mergeIntoObjectCustomUIAssets(obj, expectedAssets, objectRef) {
  /** @type {MergeResult} */
  const result = { added: 0, updated: 0, details: [] };

  if (!Array.isArray(obj.CustomUIAssets)) {
    obj.CustomUIAssets = [];
  }
  const assets = /** @type {Record<string, unknown>[]} */ (obj.CustomUIAssets);

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

  for (const expected of expectedAssets) {
    const normalizedEntry = {
      Type: 0,
      Name: expected.imgKey,
      URL: expected.imgURL,
    };
    const existingIdx = indexByName.get(expected.imgKey);
    if (existingIdx === undefined) {
      assets.push(normalizedEntry);
      indexByName.set(expected.imgKey, assets.length - 1);
      result.added += 1;
      result.details.push(`+ ${objectRef} :: ${expected.imgKey}`);
      continue;
    }

    const existing = /** @type {Record<string, unknown>} */ (assets[existingIdx]);
    const existingUrl = normalizeUrl(existing.URL);
    const expectedUrl = normalizeUrl(expected.imgURL);
    if (existingUrl === expectedUrl) {
      continue;
    }

    existing.Type = 0;
    existing.Name = expected.imgKey;
    existing.URL = expected.imgURL;
    result.updated += 1;
    result.details.push(`~ ${objectRef} :: ${expected.imgKey}`);
  }

  return result;
}

/**
 * Print a high-visibility reload alert when the save file was modified.
 * @param {string} savePath
 * @param {{ added: number; updated: number; details: string[]; missingObjects: string[] }} summary
 */
function printReloadAlert(savePath, summary) {
  const border = "================================================================================";
  console.log("");
  console.log(border);
  console.log("  SAVE FILE UPDATED — RELOAD REQUIRED IN TABLETOP SIMULATOR");
  console.log(border);
  console.log("");
  console.log(`  Patched object CustomUIAssets in:`);
  console.log(`  ${savePath}`);
  console.log("");
  console.log(`  Added: ${summary.added}   Updated: ${summary.updated}`);
  if (summary.details.length > 0) {
    console.log("");
    console.log("  Changes:");
    for (const line of summary.details) {
      console.log(`    ${line}`);
    }
  }
  if (summary.missingObjects.length > 0) {
    console.log("");
    console.log("  WARNING — objects not found in save (skipped):");
    for (const name of summary.missingObjects) {
      console.log(`    - ${name}`);
    }
  }
  console.log("");
  console.log("  >>> Reload this save in TTS (File → Load, or restart with the save)");
  console.log("  >>> so object CustomUIAssets changes take effect in-game.");
  console.log("");
  console.log(border);
  console.log("");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const savePath = path.resolve(args.save || ".dev/TS_Save_230.json");
  const manifestPath = path.resolve(args.manifest || "lib/json/PC_Relationship_Images.json");

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file does not exist: ${manifestPath}`);
  }

  const manifest = readManifest(manifestPath);
  if (manifest.length === 0) {
    return;
  }

  const grouped = groupByObjectRef(manifest);
  const saveRootRaw = JSON.parse(fs.readFileSync(savePath, "utf8"));
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root must be an object.");
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const objectsByNickname = indexObjectsByNickname(saveRoot);

  let totalAdded = 0;
  let totalUpdated = 0;
  /** @type {string[]} */
  const allDetails = [];
  /** @type {string[]} */
  const missingObjects = [];

  for (const [objectRef, expectedAssets] of grouped.entries()) {
    const obj = objectsByNickname.get(objectRef);
    if (!obj) {
      missingObjects.push(objectRef);
      continue;
    }
    const mergeResult = mergeIntoObjectCustomUIAssets(obj, expectedAssets, objectRef);
    totalAdded += mergeResult.added;
    totalUpdated += mergeResult.updated;
    allDetails.push(...mergeResult.details);
  }

  if (totalAdded === 0 && totalUpdated === 0) {
    return;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");
  printReloadAlert(savePath, {
    added: totalAdded,
    updated: totalUpdated,
    details: allDetails,
    missingObjects,
  });
}

main();
