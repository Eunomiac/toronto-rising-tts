#!/usr/bin/env node
"use strict";

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
 * Find the save root custom assets array.
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

  console.log(`Save: ${savePath}`);
  if (!customAssetsInfo) {
    console.log("No top-level CustomUIAssets or CustomAssets array found.");
    return;
  }

  const validEntries = customAssetsInfo.assets.filter((asset) => asset && typeof asset === "object");
  /** @type {{ name: string; url: string; type: string; index: number }[]} */
  const rows = [];

  for (let i = 0; i < validEntries.length; i += 1) {
    const entry = /** @type {Record<string, unknown>} */ (validEntries[i]);
    const name = typeof entry.Name === "string" ? entry.Name : "<missing Name>";
    const url = typeof entry.URL === "string" ? entry.URL : "<missing URL>";
    const type = typeof entry.Type === "number" || typeof entry.Type === "string"
      ? String(entry.Type)
      : "<missing Type>";
    rows.push({ name, url, type, index: i });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, "en"));

  console.log(`Custom assets field: ${customAssetsInfo.key}`);
  console.log(`Custom assets count: ${rows.length}`);
  console.log("");
  if (rows.length === 0) {
    console.log("No entries to list.");
    return;
  }

  console.log("Name | Type | URL");
  console.log("--- | --- | ---");
  for (const row of rows) {
    console.log(`${row.name} | ${row.type} | ${row.url}`);
  }
}

main();
