#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const PRUNE_LIST_PATH = path.resolve("dev/custom-ui-assets/prune-custom-ui-assets.txt");

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
 * Normalize user-entered save identifier into TS save JSON filename.
 * Accepts examples: "123", "TS_Save_123", "TS_Save_123.json"
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
 * Read and parse JSON file.
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Read prune names from text file, one name per line.
 * Supports comments via lines beginning with "#".
 * @param {string} filePath
 * @returns {Set<string>}
 */
function readPruneNameSet(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/u);
  const names = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    names.add(trimmed);
  }
  return names;
}

/**
 * Get mutable custom assets array on root save object.
 * @param {Record<string, unknown>} saveRoot
 * @returns {{ key: "CustomUIAssets" | "CustomAssets", assets: Record<string, unknown>[] } | null}
 */
function getCustomAssets(saveRoot) {
  if (Array.isArray(saveRoot.CustomUIAssets)) {
    return {
      key: "CustomUIAssets",
      assets: /** @type {Record<string, unknown>[]} */ (saveRoot.CustomUIAssets),
    };
  }
  if (Array.isArray(saveRoot.CustomAssets)) {
    return {
      key: "CustomAssets",
      assets: /** @type {Record<string, unknown>[]} */ (saveRoot.CustomAssets),
    };
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const saveInput = args.saveName;
  if (!saveInput) {
    throw new Error("Required argument missing: --saveName <save id or filename>");
  }

  if (!fs.existsSync(PRUNE_LIST_PATH)) {
    throw new Error(`Prune list file does not exist: ${PRUNE_LIST_PATH}`);
  }
  const pruneNames = readPruneNameSet(PRUNE_LIST_PATH);
  if (pruneNames.size === 0) {
    throw new Error(`Prune list file has no names: ${PRUNE_LIST_PATH}`);
  }

  const savesDir = "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves";
  const saveFileName = toSaveFileName(saveInput);
  const savePath = path.join(savesDir, saveFileName);
  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const customAssetsInfo = getCustomAssets(saveRoot);
  if (!customAssetsInfo) {
    throw new Error("Save has no top-level CustomUIAssets or CustomAssets array.");
  }

  const beforeCount = customAssetsInfo.assets.length;
  /** @type {string[]} */
  const removedNames = [];
  const kept = customAssetsInfo.assets.filter((entry) => {
    if (!entry || typeof entry !== "object") {
      return true;
    }
    const name = entry.Name;
    if (typeof name !== "string") {
      return true;
    }
    if (!pruneNames.has(name)) {
      return true;
    }
    removedNames.push(name);
    return false;
  });

  if (customAssetsInfo.key === "CustomUIAssets") {
    saveRoot.CustomUIAssets = kept;
  } else {
    saveRoot.CustomAssets = kept;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");

  const afterCount = kept.length;
  console.log(`Save updated: ${savePath}`);
  console.log(`Custom assets field used: ${customAssetsInfo.key}`);
  console.log(`Prune names loaded: ${pruneNames.size} from ${PRUNE_LIST_PATH}`);
  console.log(`Entries before: ${beforeCount}, after: ${afterCount}, removed: ${beforeCount - afterCount}`);
  if (removedNames.length > 0) {
    console.log("Removed asset names:");
    for (const name of removedNames) {
      console.log(`- ${name}`);
    }
  } else {
    console.log("No matching custom assets were found in this save.");
  }
}

main();
