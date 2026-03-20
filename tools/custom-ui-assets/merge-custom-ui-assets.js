#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @typedef {{
 *  name: string;
 *  sourcePath: string;
 *  fileUrl: string;
 * }} ManifestAsset
 */

/**
 * @typedef {{
 *  generatedAt: string;
 *  inputDirectory: string;
 *  count: number;
 *  assets: ManifestAsset[];
 * }} UploadManifest
 */

/**
 * Parse CLI args of shape: --key value
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
 * Read and parse a JSON file.
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  const fileText = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileText);
}

/**
 * Ensure parent directory exists for write target.
 * @param {string} outputPath
 */
function ensureParentDir(outputPath) {
  const parentDir = path.dirname(outputPath);
  fs.mkdirSync(parentDir, { recursive: true });
}

/**
 * Check if URL looks like a hosted Steam content URL.
 * @param {unknown} value
 * @returns {value is string}
 */
function isHostedSteamUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^https?:\/\/(?:cloud-\d+\.steamusercontent\.com|steamusercontent-a\.akamaihd\.net)\/ugc\//i.test(value);
}

/**
 * Extract possible custom image URL from an object-like node.
 * @param {Record<string, unknown>} node
 * @returns {string | null}
 */
function extractHostedUrlFromNode(node) {
  const candidatePaths = [
    ["CustomImage", "ImageURL"],
    ["CustomImage", "ImageUrl"],
    ["CustomImage", "Image"],
    ["CustomObject", "image"],
    ["CustomObject", "ImageURL"],
    ["CustomData", "CustomImage", "ImageURL"],
    ["CustomData", "CustomObject", "image"],
  ];

  for (const pathParts of candidatePaths) {
    let current = node;
    let validPath = true;

    for (const part of pathParts) {
      const value = current[part];
      if (value === undefined || value === null || typeof value !== "object" && part !== pathParts[pathParts.length - 1]) {
        validPath = false;
        break;
      }
      if (part === pathParts[pathParts.length - 1]) {
        if (isHostedSteamUrl(value)) {
          return value;
        }
      } else {
        current = /** @type {Record<string, unknown>} */ (value);
      }
    }

    if (!validPath) {
      continue;
    }
  }

  return null;
}

/**
 * Recursively walk the save JSON to locate object nodes by name.
 * @param {unknown} node
 * @param {(obj: Record<string, unknown>) => void} onObject
 */
function walk(node, onObject) {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, onObject);
    }
    return;
  }

  if (node === null || typeof node !== "object") {
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  onObject(obj);

  for (const value of Object.values(obj)) {
    walk(value, onObject);
  }
}

/**
 * Get mutable Custom UI assets array on root save object.
 * @param {Record<string, unknown>} saveRoot
 * @returns {{ key: "CustomUIAssets" | "CustomAssets", assets: Record<string, unknown>[] }}
 */
function getOrCreateCustomAssets(saveRoot) {
  if (Array.isArray(saveRoot.CustomUIAssets)) {
    return { key: "CustomUIAssets", assets: /** @type {Record<string, unknown>[]} */ (saveRoot.CustomUIAssets) };
  }
  if (Array.isArray(saveRoot.CustomAssets)) {
    return { key: "CustomAssets", assets: /** @type {Record<string, unknown>[]} */ (saveRoot.CustomAssets) };
  }

  saveRoot.CustomUIAssets = [];
  return { key: "CustomUIAssets", assets: /** @type {Record<string, unknown>[]} */ (saveRoot.CustomUIAssets) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const savePathArg = args.save;
  const manifestPathArg = args.manifest;
  const outputSaveArg = args.outputSave || savePathArg;
  const assetsOutArg = args.assetsOut || "";

  if (!savePathArg) {
    throw new Error("Required argument missing: --save <save.json>");
  }
  if (!manifestPathArg) {
    throw new Error("Required argument missing: --manifest <manifest.json>");
  }

  const savePath = path.resolve(savePathArg);
  const manifestPath = path.resolve(manifestPathArg);
  const outputSavePath = path.resolve(outputSaveArg);
  const assetsOutPath = assetsOutArg ? path.resolve(assetsOutArg) : "";

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file does not exist: ${manifestPath}`);
  }

  const manifest = /** @type {UploadManifest} */ (readJson(manifestPath));
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error(`Manifest has no assets: ${manifestPath}`);
  }

  const manifestNameSet = new Set(manifest.assets.map((asset) => asset.name));
  if (manifestNameSet.size !== manifest.assets.length) {
    throw new Error("Manifest contains duplicate asset names.");
  }

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }

  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  /** @type {Map<string, string>} */
  const extractedUrls = new Map();

  walk(saveRoot, (obj) => {
    const rawName = obj.Nickname ?? obj.Name;
    if (typeof rawName !== "string") {
      return;
    }
    if (!manifestNameSet.has(rawName)) {
      return;
    }
    const maybeUrl = extractHostedUrlFromNode(obj);
    if (!maybeUrl) {
      return;
    }
    extractedUrls.set(rawName, maybeUrl);
  });

  const missingNames = manifest.assets
    .map((asset) => asset.name)
    .filter((name) => !extractedUrls.has(name));

  const customAssetsInfo = getOrCreateCustomAssets(saveRoot);
  const existingAssets = customAssetsInfo.assets;
  const existingByName = new Map();

  for (let i = 0; i < existingAssets.length; i += 1) {
    const entry = existingAssets[i];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    if (typeof entry.Name !== "string") {
      continue;
    }
    existingByName.set(entry.Name, i);
  }

  let updatedCount = 0;
  let addedCount = 0;
  const generatedCustomUiAssets = [];

  for (const asset of manifest.assets) {
    const hostedUrl = extractedUrls.get(asset.name);
    if (!hostedUrl) {
      continue;
    }

    const normalizedEntry = {
      Type: 0,
      Name: asset.name,
      URL: hostedUrl,
    };

    generatedCustomUiAssets.push(normalizedEntry);

    if (existingByName.has(asset.name)) {
      const index = /** @type {number} */ (existingByName.get(asset.name));
      existingAssets[index] = normalizedEntry;
      updatedCount += 1;
    } else {
      existingAssets.push(normalizedEntry);
      addedCount += 1;
    }
  }

  ensureParentDir(outputSavePath);
  fs.writeFileSync(outputSavePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");

  if (assetsOutPath) {
    ensureParentDir(assetsOutPath);
    fs.writeFileSync(assetsOutPath, `${JSON.stringify(generatedCustomUiAssets, null, 2)}\n`, "utf8");
  }

  console.log(`Save updated: ${outputSavePath}`);
  console.log(`Custom assets field used: ${customAssetsInfo.key}`);
  console.log(`Hosted URLs extracted: ${extractedUrls.size}/${manifest.assets.length}`);
  console.log(`Merged entries -> updated: ${updatedCount}, added: ${addedCount}`);
  if (assetsOutPath) {
    console.log(`Generated asset array written: ${assetsOutPath}`);
  }
  if (missingNames.length > 0) {
    console.log(`Missing hosted URLs for ${missingNames.length} names:`);
    for (const name of missingNames) {
      console.log(`- ${name}`);
    }
    process.exitCode = 2;
  }
}

main();
