#!/usr/bin/env node
"use strict";

// After Cloud upload + merge: patch/create npc_figurine + npc_control_token objects in the
// save JSON using hosted Steam URLs from CustomUIAssets (replaces in-TTS spawn/apply steps).
//
// Usage:
//   node .tools/custom-ui-assets/apply-npc-hosted-world-from-upload.js --saveName 230
//   node .tools/custom-ui-assets/apply-npc-hosted-world-from-upload.js --save .dev/TS_Save_230.json --dry-run

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../tts-save/resolve-save-path");
const {
  CONTROL_BOARD_PALETTE_GUID,
  extractCharacterKeysFromNpcsData,
  extractCharacterMetaFromNpcsData,
  parsePreloadAreaFromNpcsData,
  computePreloadSlotWorldPosition,
  figurineYawDegreesForArea,
  readCustomUiAssetMap,
  buildNpcFigurineObjectState,
  buildNpcControlTokenObjectState,
  buildTokenSnapAssignmentsFromNpcsData,
  paletteParkingPoseForCharacter,
  hostedNpcGroupUrlsForCharacter,
  loadHostedNpcGroupAssetMap,
  indexExistingNpcObjects,
  findSaveObjectByGuid,
  patchFigurineObject,
  patchTokenObject,
  generateTtsGuid,
  isHostedSteamUrl,
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === "1" || args.dryRun === "1";
  const npcsDataPath = path.resolve(args.npcsData || "lib/npcs_data.ttslua");
  const savePath = (args.save || "").trim()
    ? path.resolve(args.save.trim())
    : resolveSavePath((args.saveName || "230").trim(), args.savesDir).savePath;

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file not found: ${savePath}`);
  }
  if (!fs.existsSync(npcsDataPath)) {
    throw new Error(`NPC data file not found: ${npcsDataPath}`);
  }

  const npcsText = fs.readFileSync(npcsDataPath, "utf8");
  const knownKeys = extractCharacterKeysFromNpcsData(npcsText);
  const metaByKey = extractCharacterMetaFromNpcsData(npcsText);
  const preloadArea = parsePreloadAreaFromNpcsData(npcsText);
  const sortedRegistryKeys = [...knownKeys].sort((a, b) => a.localeCompare(b, "en"));
  const snapAssignments = buildTokenSnapAssignmentsFromNpcsData(npcsText);
  const figurineYawDeg = figurineYawDegreesForArea(preloadArea);

  const saveRoot = JSON.parse(fs.readFileSync(savePath, "utf8"));
  if (!Array.isArray(saveRoot.ObjectStates)) {
    throw new Error("Save missing ObjectStates array.");
  }

  const assetMap = loadHostedNpcGroupAssetMap(
    saveRoot,
    args.assetsOut || ".dev/custom-ui-assets/npc-group-generated-assets.json",
  );
  const paletteObj = findSaveObjectByGuid(saveRoot.ObjectStates, CONTROL_BOARD_PALETTE_GUID);
  if (paletteObj === null) {
    throw new Error(
      `CONTROL_BOARD_PALETTE (GUID ${CONTROL_BOARD_PALETTE_GUID}) not found in save — cannot place new control tokens.`,
    );
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const figurinesByKey = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const tokensByKey = new Map();
  indexExistingNpcObjects(saveRoot.ObjectStates, figurinesByKey, tokensByKey);

  /** @type {string[]} */
  const figurinesPatched = [];
  /** @type {string[]} */
  const figurinesCreated = [];
  /** @type {string[]} */
  const tokensPatched = [];
  /** @type {string[]} */
  const tokensCreated = [];
  /** @type {string[]} */
  const skippedNoHostedQuartet = [];
  /** @type {string[]} */
  const skippedNoPaletteSnap = [];

  for (const characterKey of sortedRegistryKeys) {
    const hosted = hostedNpcGroupUrlsForCharacter(assetMap, characterKey);
    if (hosted === null) {
      skippedNoHostedQuartet.push(characterKey);
      continue;
    }

    const meta = metaByKey.get(characterKey) || { fullName: characterKey, scale: 53 };
    const slotIndex = sortedRegistryKeys.indexOf(characterKey) + 1;
    const preloadPos = computePreloadSlotWorldPosition(preloadArea, slotIndex);

    const existingFig = figurinesByKey.get(characterKey);
    if (existingFig) {
      patchFigurineObject(
        existingFig,
        hosted.figurineFront,
        hosted.figurineBack,
        meta.scale,
        preloadPos,
        figurineYawDeg,
      );
      figurinesPatched.push(characterKey);
    } else {
      const guid = generateTtsGuid();
      const created = buildNpcFigurineObjectState(
        characterKey,
        meta,
        preloadArea,
        slotIndex,
        hosted.figurineFront,
        hosted.figurineBack,
        guid,
      );
      saveRoot.ObjectStates.push(created);
      figurinesByKey.set(characterKey, created);
      figurinesCreated.push(characterKey);
    }

    const existingToken = tokensByKey.get(characterKey);
    if (existingToken) {
      patchTokenObject(existingToken, hosted.tokenFront, hosted.tokenBack);
      tokensPatched.push(characterKey);
      continue;
    }

    const snapIndex = snapAssignments.get(characterKey);
    if (snapIndex === undefined) {
      skippedNoPaletteSnap.push(characterKey);
      continue;
    }
    const pose = paletteParkingPoseForCharacter(paletteObj, snapIndex, snapAssignments);
    if (pose === null) {
      skippedNoPaletteSnap.push(characterKey);
      continue;
    }

    const tokenGuid = generateTtsGuid();
    const tokenObj = buildNpcControlTokenObjectState(
      pose.worldPos,
      pose.yawDeg,
      pose.rotZDeg,
      characterKey,
      hosted.tokenFront,
      hosted.tokenBack,
      tokenGuid,
    );
    saveRoot.ObjectStates.push(tokenObj);
    tokensByKey.set(characterKey, tokenObj);
    tokensCreated.push(characterKey);
  }

  const reportPath = path.resolve(
    args.reportOut || ".dev/custom-ui-assets/npc-hosted-world-apply-report.json",
  );
  const report = {
    generatedAt: new Date().toISOString(),
    savePath,
    figurinesPatched,
    figurinesCreated,
    tokensPatched,
    tokensCreated,
    skippedNoHostedQuartet,
    skippedNoPaletteSnap,
    hostedAssetCount: [...assetMap.values()].filter(isHostedSteamUrl).length,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Save: ${savePath}`);
  console.log(`Registry keys: ${sortedRegistryKeys.length}`);
  console.log(`Figurines patched: ${figurinesPatched.length}`);
  console.log(`Figurines created: ${figurinesCreated.length}`);
  console.log(`Tokens patched: ${tokensPatched.length}`);
  console.log(`Tokens created: ${tokensCreated.length}`);
  console.log(`Skipped (no hosted quartet in save): ${skippedNoHostedQuartet.length}`);
  if (skippedNoPaletteSnap.length > 0) {
    console.log(`Skipped token create (no palette snap): ${skippedNoPaletteSnap.length}`);
    for (const key of skippedNoPaletteSnap) {
      console.log(`  - ${key}`);
    }
  }
  console.log(`Report: ${reportPath}`);

  const changed =
    figurinesPatched.length + figurinesCreated.length + tokensPatched.length + tokensCreated.length;

  if (dryRun) {
    console.log("Dry run — save not written.");
    return;
  }

  if (changed === 0) {
    console.log("No figurine/token world objects to update.");
    return;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot)}\n`, "utf8");
  console.log(`Save updated: ${savePath}`);
  console.log(">>> Reload save in TTS (Save & Play). No DEBUG.spawnNpcControlBoardTokens needed.");
}

main();
