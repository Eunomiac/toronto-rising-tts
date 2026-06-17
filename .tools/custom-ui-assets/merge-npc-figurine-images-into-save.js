#!/usr/bin/env node
"use strict";

// Scan a TTS save for objects tagged `npc_figurine`, read each figurine's front
// CustomImage URL, resolve the NPC key via Nickname → D.characters.fullName in
// lib/npcs_data.ttslua, and merge into the save root CustomUIAssets (Name = key).
//
// Usage:
//   node .tools/custom-ui-assets/merge-npc-figurine-images-into-save.js --save .dev/TS_Save_230.json
//   node .tools/custom-ui-assets/merge-npc-figurine-images-into-save.js --saveName 230
//   node .tools/custom-ui-assets/merge-npc-figurine-images-into-save.js --saveName 230 --dry-run

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../tts-save/resolve-save-path");

const NPC_FIGURINE_TAG = "npc_figurine";
const DEFAULT_NPCS_DATA = "lib/npcs_data.ttslua";
const DEFAULT_ASSETS_OUT = ".dev/custom-ui-assets/npc-figurine-generated-assets.json";

/**
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
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {string} outputPath
 */
function ensureParentDir(outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

/**
 * Slice inner text of the last top-level `D.characters = { ... }` table.
 * @param {string} fullText
 * @returns {string}
 */
function extractCharactersTableInner(fullText) {
  const re = /^D\.characters\s*=\s*\{/gm;
  let lastBraceIdx = -1;
  let m = re.exec(fullText);
  while (m !== null) {
    const openBrace = fullText.indexOf("{", m.index);
    if (openBrace !== -1) {
      lastBraceIdx = openBrace;
    }
    m = re.exec(fullText);
  }

  if (lastBraceIdx === -1) {
    throw new Error('Could not find "D.characters = {" in npcs data file.');
  }

  let depth = 0;
  let i = lastBraceIdx;
  for (; i < fullText.length; i += 1) {
    const c = fullText[i];
    if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return fullText.slice(lastBraceIdx + 1, i);
      }
    }
  }

  throw new Error("Unclosed D.characters table (brace mismatch).");
}

/**
 * @param {string} fullText
 * @returns {Map<string, string>} fullName → characterKey
 */
function buildFullNameToKeyMap(fullText) {
  const inner = extractCharactersTableInner(fullText);

  /** @type {{ key: string; start: number }[]} */
  const headers = [];
  const headerRe = /^  ([A-Za-z0-9_]+) = \{/gm;
  let m = headerRe.exec(inner);
  while (m !== null) {
    headers.push({ key: m[1], start: m.index });
    m = headerRe.exec(inner);
  }

  /** @type {Map<string, string>} */
  const byFullName = new Map();
  for (let i = 0; i < headers.length; i += 1) {
    const { key, start } = headers[i];
    const end = i + 1 < headers.length ? headers[i + 1].start : inner.length;
    const block = inner.slice(start, end);
    const fnMatch = /fullName\s*=\s*"([^"]+)"/.exec(block);
    if (!fnMatch) {
      continue;
    }
    const fullName = fnMatch[1];
    if (byFullName.has(fullName) && byFullName.get(fullName) !== key) {
      console.warn(
        `WARN: duplicate fullName "${fullName}" (${byFullName.get(fullName)} vs ${key}); keeping ${key}`,
      );
    }
    byFullName.set(fullName, key);
  }

  return byFullName;
}

/**
 * @param {unknown} obj
 * @returns {boolean}
 */
function objectHasNpcFigurineTag(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  const tags = /** @type {Record<string, unknown>} */ (obj).Tags;
  if (!Array.isArray(tags)) {
    return false;
  }
  return tags.some((tag) => tag === NPC_FIGURINE_TAG);
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string|null}
 */
function extractFigurineFrontImageUrl(obj) {
  const customImage = obj.CustomImage;
  if (!customImage || typeof customImage !== "object" || Array.isArray(customImage)) {
    return null;
  }
  const img = /** @type {Record<string, unknown>} */ (customImage);
  if (typeof img.ImageURL === "string" && img.ImageURL.trim() !== "") {
    return img.ImageURL.trim();
  }
  if (typeof img.ImageUrl === "string" && img.ImageUrl.trim() !== "") {
    return img.ImageUrl.trim();
  }
  return null;
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {{ key: "CustomUIAssets" | "CustomAssets", assets: Record<string, unknown>[] }}
 */
function getOrCreateCustomAssets(saveRoot) {
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

  saveRoot.CustomUIAssets = [];
  return {
    key: "CustomUIAssets",
    assets: /** @type {Record<string, unknown>[]} */ (saveRoot.CustomUIAssets),
  };
}

/**
 * @param {unknown} node
 * @param {Map<string, string>} fullNameToKey
 * @param {{
 *   scanned: number;
 *   matched: number;
 *   skippedNoUrl: string[];
 *   skippedNoNickname: string[];
 *   unmatchedNickname: string[];
 *   duplicateKeys: string[];
 *   byKey: Map<string, { url: string; guid: string; nickname: string }>;
 * }} acc
 */
function walkObjectStates(node, fullNameToKey, acc) {
  if (node === null || node === undefined) {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      walkObjectStates(node[i], fullNameToKey, acc);
    }
    return;
  }
  if (typeof node !== "object") {
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  if (objectHasNpcFigurineTag(obj)) {
    acc.scanned += 1;
    const guid = typeof obj.GUID === "string" ? obj.GUID : "?";
    const nicknameRaw = obj.Nickname;
    const nickname = typeof nicknameRaw === "string" ? nicknameRaw.trim() : "";

    if (nickname === "") {
      acc.skippedNoNickname.push(guid);
    } else {
      const characterKey = fullNameToKey.get(nickname);
      if (!characterKey) {
        acc.unmatchedNickname.push(`${guid} (${nickname})`);
      } else {
        const frontUrl = extractFigurineFrontImageUrl(obj);
        if (!frontUrl) {
          acc.skippedNoUrl.push(`${characterKey} :: ${guid}`);
        } else {
          acc.matched += 1;
          if (acc.byKey.has(characterKey)) {
            const prev = acc.byKey.get(characterKey);
            acc.duplicateKeys.push(`${characterKey} (${prev.guid} + ${guid})`);
          }
          acc.byKey.set(characterKey, { url: frontUrl, guid, nickname });
        }
      }
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "LuaScript") {
      continue;
    }
    walkObjectStates(value, fullNameToKey, acc);
  }
}

/**
 * @param {Record<string, unknown>[]} assets
 * @param {Map<string, { url: string; guid: string; nickname: string }>} byKey
 * @returns {{ added: number; updated: number; entries: Record<string, unknown>[] }}
 */
function mergeIntoCustomAssets(assets, byKey) {
  /** @type {Map<string, number>} */
  const indexByName = new Map();
  for (let i = 0; i < assets.length; i += 1) {
    const entry = assets[i];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const name = entry.Name;
    if (typeof name === "string") {
      indexByName.set(name, i);
    }
  }

  let added = 0;
  let updated = 0;
  /** @type {Record<string, unknown>[]} */
  const generated = [];

  for (const [characterKey, row] of byKey.entries()) {
    const normalizedEntry = {
      Type: 0,
      Name: characterKey,
      URL: row.url,
    };
    generated.push(normalizedEntry);

    if (indexByName.has(characterKey)) {
      const index = /** @type {number} */ (indexByName.get(characterKey));
      assets[index] = normalizedEntry;
      updated += 1;
    } else {
      assets.push(normalizedEntry);
      indexByName.set(characterKey, assets.length - 1);
      added += 1;
    }
  }

  return { added, updated, entries: generated };
}

function resolveSavePathFromArgs(args) {
  if (args.save && args.save.trim() !== "") {
    return path.resolve(args.save.trim());
  }
  if (args.saveName && args.saveName.trim() !== "") {
    return resolveSavePath(args.saveName.trim(), args.savesDir).savePath;
  }
  return path.resolve(".dev/TS_Save_230.json");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === "1" || args.dryRun === "1";
  const savePath = resolveSavePathFromArgs(args);
  const npcsDataPath = path.resolve(args.npcsData || DEFAULT_NPCS_DATA);
  const assetsOutPath = path.resolve(args.assetsOut || DEFAULT_ASSETS_OUT);

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }
  if (!fs.existsSync(npcsDataPath)) {
    throw new Error(`NPC data file does not exist: ${npcsDataPath}`);
  }

  const npcsText = fs.readFileSync(npcsDataPath, "utf8");
  const fullNameToKey = buildFullNameToKeyMap(npcsText);
  if (fullNameToKey.size === 0) {
    throw new Error(`No fullName entries parsed from ${npcsDataPath}`);
  }

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);

  const acc = {
    scanned: 0,
    matched: 0,
    skippedNoUrl: /** @type {string[]} */ ([]),
    skippedNoNickname: /** @type {string[]} */ ([]),
    unmatchedNickname: /** @type {string[]} */ ([]),
    duplicateKeys: /** @type {string[]} */ ([]),
    byKey: /** @type {Map<string, { url: string; guid: string; nickname: string }>} */ (new Map()),
  };

  walkObjectStates(saveRoot.ObjectStates, fullNameToKey, acc);

  console.log(`Save: ${savePath}`);
  console.log(`NPC data: ${npcsDataPath} (${fullNameToKey.size} fullName → key mappings)`);
  console.log(`npc_figurine objects scanned: ${acc.scanned}`);
  console.log(`Matched with front image URL: ${acc.byKey.size}`);

  if (acc.skippedNoNickname.length > 0) {
    console.log(`Missing Nickname: ${acc.skippedNoNickname.length}`);
    for (const guid of acc.skippedNoNickname.slice(0, 10)) {
      console.log(`  - ${guid}`);
    }
  }
  if (acc.unmatchedNickname.length > 0) {
    console.log(`Nickname not in D.characters.fullName: ${acc.unmatchedNickname.length}`);
    for (const line of acc.unmatchedNickname.slice(0, 15)) {
      console.log(`  - ${line}`);
    }
    if (acc.unmatchedNickname.length > 15) {
      console.log(`  ... and ${acc.unmatchedNickname.length - 15} more`);
    }
  }
  if (acc.skippedNoUrl.length > 0) {
    console.log(`Matched key but no CustomImage front URL: ${acc.skippedNoUrl.length}`);
    for (const line of acc.skippedNoUrl.slice(0, 10)) {
      console.log(`  - ${line}`);
    }
  }
  if (acc.duplicateKeys.length > 0) {
    console.log(`Duplicate character keys (last figurine wins): ${acc.duplicateKeys.length}`);
    for (const line of acc.duplicateKeys.slice(0, 10)) {
      console.log(`  - ${line}`);
    }
  }

  if (acc.byKey.size === 0) {
    if (acc.unmatchedNickname.length > 0 || acc.skippedNoUrl.length > 0) {
      process.exitCode = 2;
    }
    return;
  }

  const customAssetsInfo = getOrCreateCustomAssets(saveRoot);
  const mergeResult = mergeIntoCustomAssets(customAssetsInfo.assets, acc.byKey);

  console.log(`Custom assets field: ${customAssetsInfo.key}`);
  console.log(`Merged → added: ${mergeResult.added}, updated: ${mergeResult.updated}`);

  if (dryRun) {
    console.log("");
    console.log("Dry run — save file not written. Re-run without --dry-run to apply.");
    return;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");
  ensureParentDir(assetsOutPath);
  fs.writeFileSync(assetsOutPath, `${JSON.stringify(mergeResult.entries, null, 2)}\n`, "utf8");

  console.log("");
  console.log(`Save updated: ${savePath}`);
  console.log(`Generated asset list: ${assetsOutPath}`);
  console.log("");
  console.log(">>> Reload this save in TTS (File → Load) so CustomUIAssets refresh.");

  if (acc.unmatchedNickname.length > 0) {
    process.exitCode = 2;
  }
}

main();
