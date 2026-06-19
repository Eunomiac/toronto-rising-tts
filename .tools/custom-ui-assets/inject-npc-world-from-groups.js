#!/usr/bin/env node
"use strict";

// Patch or create workshop npc_figurine objects and npc_control_token CustomImage URLs
// with local file:/// paths from assets/images/NPCs (4-file groups, D.characters only).
//
// Usage:
//   node .tools/custom-ui-assets/inject-npc-world-from-groups.js --saveName 230
//   node .tools/custom-ui-assets/inject-npc-world-from-groups.js --save .dev/TS_Save_230.json --dry-run

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../tts-save/resolve-save-path");
const {
  DEFAULT_NPC_GROUP_IMAGE_DIR,
  absoluteOsPathToFileUrl,
  extractCharacterKeysFromNpcsData,
  extractCharacterMetaFromNpcsData,
  parsePreloadAreaFromNpcsData,
  computePreloadSlotWorldPosition,
  buildNpcFigurineObjectState,
  generateTtsGuid,
  characterKeyFromGmNotesPrefix,
  objectHasTag,
  scanNpcGroupsInDirectory,
  GM_FIGURINE_PREFIX,
  GM_TOKEN_PREFIX,
  NPC_FIGURINE_TAG,
  NPC_CONTROL_TOKEN_TAG,
  figurineYawDegreesForArea,
  NPC_PRELOAD_FIGURE_SCALE,
} = require("./lib/npc-asset-helpers");

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
 * @param {unknown} node
 * @param {Map<string, Record<string, unknown>>} figurinesByKey
 * @param {Map<string, Record<string, unknown>>} tokensByKey
 */
function indexExistingNpcObjects(node, figurinesByKey, tokensByKey) {
  if (node === null || node === undefined) {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      indexExistingNpcObjects(node[i], figurinesByKey, tokensByKey);
    }
    return;
  }
  if (typeof node !== "object") {
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  const figKey = characterKeyFromGmNotesPrefix(obj, GM_FIGURINE_PREFIX);
  if (figKey !== null && (objectHasTag(obj, NPC_FIGURINE_TAG) || obj.Name === "Figurine_Custom")) {
    figurinesByKey.set(figKey, obj);
  }
  const tokenKey = characterKeyFromGmNotesPrefix(obj, GM_TOKEN_PREFIX);
  if (tokenKey !== null && objectHasTag(obj, NPC_CONTROL_TOKEN_TAG)) {
    tokensByKey.set(tokenKey, obj);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "LuaScript") {
      continue;
    }
    indexExistingNpcObjects(value, figurinesByKey, tokensByKey);
  }
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} frontUrl
 * @param {string} backUrl
 * @param {number} imageScalar
 * @param {{ x: number; y: number; z: number }} pos
 * @param {number} yawDeg
 */
function patchFigurineObject(obj, frontUrl, backUrl, imageScalar, pos, yawDeg) {
  let customImage = obj.CustomImage;
  if (!customImage || typeof customImage !== "object" || Array.isArray(customImage)) {
    customImage = {};
    obj.CustomImage = customImage;
  }
  const img = /** @type {Record<string, unknown>} */ (customImage);
  img.ImageURL = frontUrl;
  img.ImageSecondaryURL = backUrl;
  img.ImageScalar = imageScalar;
  img.WidthScale = 0;

  let transform = obj.Transform;
  if (!transform || typeof transform !== "object" || Array.isArray(transform)) {
    transform = {};
    obj.Transform = transform;
  }
  const t = /** @type {Record<string, unknown>} */ (transform);
  t.posX = pos.x;
  t.posY = pos.y;
  t.posZ = pos.z;
  t.rotY = yawDeg;
  t.scaleX = NPC_PRELOAD_FIGURE_SCALE;
  t.scaleY = NPC_PRELOAD_FIGURE_SCALE;
  t.scaleZ = NPC_PRELOAD_FIGURE_SCALE;
  obj.Locked = true;
  obj.Tooltip = false;
  if (!Array.isArray(obj.Tags)) {
    obj.Tags = [NPC_FIGURINE_TAG];
  } else if (!obj.Tags.includes(NPC_FIGURINE_TAG)) {
    obj.Tags.push(NPC_FIGURINE_TAG);
  }
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} frontUrl
 * @param {string} backUrl
 */
function patchTokenObject(obj, frontUrl, backUrl) {
  let customImage = obj.CustomImage;
  if (!customImage || typeof customImage !== "object" || Array.isArray(customImage)) {
    customImage = {};
    obj.CustomImage = customImage;
  }
  const img = /** @type {Record<string, unknown>} */ (customImage);
  img.ImageURL = frontUrl;
  img.ImageSecondaryURL = backUrl;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === "1" || args.dryRun === "1";
  const inputDir = (args.dir || args.input || DEFAULT_NPC_GROUP_IMAGE_DIR).trim();
  const npcsDataPath = path.resolve(args.npcsData || "lib/npcs_data.ttslua");
  const dirPath = path.isAbsolute(inputDir) ? path.normalize(inputDir) : path.resolve(inputDir);

  const savePath = (args.save || "").trim()
    ? path.resolve(args.save.trim())
    : resolveSavePath((args.saveName || "230").trim(), args.savesDir).savePath;

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file not found: ${savePath}`);
  }
  if (!fs.existsSync(npcsDataPath)) {
    throw new Error(`NPC data file not found: ${npcsDataPath}`);
  }
  if (!fs.existsSync(dirPath)) {
    throw new Error(`NPC image directory not found: ${dirPath}`);
  }

  const npcsText = fs.readFileSync(npcsDataPath, "utf8");
  const knownKeys = extractCharacterKeysFromNpcsData(npcsText);
  const metaByKey = extractCharacterMetaFromNpcsData(npcsText);
  const preloadArea = parsePreloadAreaFromNpcsData(npcsText);
  const sortedRegistryKeys = [...knownKeys].sort((a, b) => a.localeCompare(b, "en"));

  const { groups, errors } = scanNpcGroupsInDirectory(dirPath);
  if (errors.length > 0) {
    const cap = 20;
    const shown = errors.slice(0, cap);
    const extra = errors.length > cap ? `\n... and ${errors.length - cap} more` : "";
    throw new Error(`NPC group scan failed:\n${shown.join("\n")}${extra}`);
  }

  /** @type {Map<string, import("./lib/npc-asset-helpers").NpcAssetGroup>} */
  const groupByKey = new Map(groups.map((g) => [g.characterKey, g]));

  /** @type {string[]} */
  const skippedUnregisteredKeys = [];
  for (const group of groups) {
    if (!knownKeys.has(group.characterKey)) {
      skippedUnregisteredKeys.push(group.characterKey);
    }
  }

  const saveRoot = JSON.parse(fs.readFileSync(savePath, "utf8"));
  if (!Array.isArray(saveRoot.ObjectStates)) {
    throw new Error("Save missing ObjectStates array.");
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const figurinesByKey = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const tokensByKey = new Map();
  indexExistingNpcObjects(saveRoot.ObjectStates, figurinesByKey, tokensByKey);

  const yawDeg = figurineYawDegreesForArea(preloadArea);

  /** @type {string[]} */
  const figurinesPatched = [];
  /** @type {string[]} */
  const figurinesCreated = [];
  /** @type {string[]} */
  const tokensPatched = [];
  /** @type {string[]} */
  const tokensMissing = [];
  /** @type {string[]} */
  const registryMissingDiskGroup = [];
  /** @type {string[]} */
  const registryMissingFigurineAfter = [];

  for (const characterKey of sortedRegistryKeys) {
    const group = groupByKey.get(characterKey);
    if (!group) {
      registryMissingDiskGroup.push(characterKey);
      continue;
    }

    const meta = metaByKey.get(characterKey) || { fullName: characterKey, scale: 8 };
    const slotIndex = sortedRegistryKeys.indexOf(characterKey) + 1;
    const pos = computePreloadSlotWorldPosition(preloadArea, slotIndex);
    const frontUrl = absoluteOsPathToFileUrl(group.figurineFrontPath);
    const backUrl = absoluteOsPathToFileUrl(group.figurineBackPath);
    const tokenFrontUrl = absoluteOsPathToFileUrl(group.tokenFrontPath);
    const tokenBackUrl = absoluteOsPathToFileUrl(group.tokenBackPath);

    const existingFig = figurinesByKey.get(characterKey);
    if (existingFig) {
      patchFigurineObject(existingFig, frontUrl, backUrl, meta.scale, pos, yawDeg);
      figurinesPatched.push(characterKey);
    } else {
      const guid = generateTtsGuid();
      const created = buildNpcFigurineObjectState(
        characterKey,
        meta,
        preloadArea,
        slotIndex,
        frontUrl,
        backUrl,
        guid,
      );
      saveRoot.ObjectStates.push(created);
      figurinesByKey.set(characterKey, created);
      figurinesCreated.push(characterKey);
    }

    const existingToken = tokensByKey.get(characterKey);
    if (existingToken) {
      patchTokenObject(existingToken, tokenFrontUrl, tokenBackUrl);
      tokensPatched.push(characterKey);
    } else {
      tokensMissing.push(characterKey);
    }
  }

  for (const characterKey of sortedRegistryKeys) {
    if (!groupByKey.has(characterKey)) {
      continue;
    }
    if (!figurinesByKey.has(characterKey)) {
      registryMissingFigurineAfter.push(characterKey);
    }
  }

  console.log(`Save: ${savePath}`);
  console.log(`Registry keys: ${sortedRegistryKeys.length}`);
  console.log(`Disk groups (complete): ${groups.length}`);
  console.log(`Figurines patched: ${figurinesPatched.length}`);
  console.log(`Figurines created: ${figurinesCreated.length}`);
  console.log(`Tokens patched: ${tokensPatched.length}`);
  console.log(`Tokens missing in save (run DEBUG.spawnNpcControlBoardTokens): ${tokensMissing.length}`);

  if (skippedUnregisteredKeys.length > 0) {
    console.log("");
    console.log(`Skipped unregistered disk groups (${skippedUnregisteredKeys.length}):`);
    for (const key of skippedUnregisteredKeys.sort((a, b) => a.localeCompare(b, "en"))) {
      console.log(`  - ${key}`);
    }
  }
  if (registryMissingDiskGroup.length > 0) {
    console.log("");
    console.log(`Registry keys missing complete disk group (${registryMissingDiskGroup.length}):`);
    for (const key of registryMissingDiskGroup) {
      console.log(`  - ${key}`);
    }
  }
  if (tokensMissing.length > 0) {
    console.log("");
    console.log("Registry keys with figurine inject but no npc_control_token in save:");
    for (const key of tokensMissing) {
      console.log(`  - ${key}`);
    }
  }

  const reportPath = path.resolve(
    args.reportOut || ".dev/custom-ui-assets/npc-inject-report.json",
  );
  const report = {
    generatedAt: new Date().toISOString(),
    savePath,
    inputDirectory: dirPath,
    figurinesPatched,
    figurinesCreated,
    tokensPatched,
    tokensMissing,
    skippedUnregisteredKeys: skippedUnregisteredKeys.sort((a, b) => a.localeCompare(b, "en")),
    registryMissingDiskGroup,
    registryMissingFigurineAfter,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Report written: ${reportPath}`);

  if (dryRun) {
    console.log("Dry run — save not written.");
    return;
  }

  if (figurinesPatched.length + figurinesCreated.length + tokensPatched.length === 0) {
    console.log("No changes to write.");
    return;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot)}\n`, "utf8");
  console.log(`Save updated: ${savePath}`);
  console.log(">>> Reload save in TTS, then Cloud Manager → Upload All Loaded Files → save again.");
}

main();
