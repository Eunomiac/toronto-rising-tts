#!/usr/bin/env node
"use strict";

// After Cloud upload + merge: patch/create npc_figurine objects in the save JSON using hosted
// Steam URLs from CustomUIAssets (replaces in-TTS spawn/apply steps). Stage spotlight tokens are
// spawned at runtime by `core/stage_tokens.ttslua` from the same hosted URLs — not saved objects.
//
// Usage:
//   node .tools/custom-ui-assets/apply-npc-hosted-world-from-upload.js --saveName 230
//   node .tools/custom-ui-assets/apply-npc-hosted-world-from-upload.js --save .dev/TS_Save_230.json --dry-run

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../tts-save/resolve-save-path");
const {
  extractCharacterKeysFromNpcsData,
  extractCharacterMetaFromNpcsData,
  parsePreloadAreaFromNpcsData,
  computePreloadSlotWorldPosition,
  figurineYawDegreesForArea,
  buildNpcFigurineObjectState,
  hostedNpcGroupUrlsForCharacter,
  loadHostedNpcGroupAssetMap,
  indexExistingNpcObjects,
  patchFigurineObject,
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
  const figurineYawDeg = figurineYawDegreesForArea(preloadArea);

  const saveRoot = JSON.parse(fs.readFileSync(savePath, "utf8"));
  if (!Array.isArray(saveRoot.ObjectStates)) {
    throw new Error("Save missing ObjectStates array.");
  }

  const assetMap = loadHostedNpcGroupAssetMap(
    saveRoot,
    args.assetsOut || ".dev/custom-ui-assets/npc-group-generated-assets.json",
  );

  /** @type {Map<string, Record<string, unknown>>} */
  const figurinesByKey = new Map();
  indexExistingNpcObjects(saveRoot.ObjectStates, figurinesByKey);

  /** @type {string[]} */
  const figurinesPatched = [];
  /** @type {string[]} */
  const figurinesCreated = [];
  /** @type {string[]} */
  const skippedNoHostedQuartet = [];

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
      continue;
    }
    const created = buildNpcFigurineObjectState(
      characterKey,
      meta,
      preloadArea,
      slotIndex,
      hosted.figurineFront,
      hosted.figurineBack,
      generateTtsGuid(),
    );
    saveRoot.ObjectStates.push(created);
    figurinesByKey.set(characterKey, created);
    figurinesCreated.push(characterKey);
  }

  const reportPath = path.resolve(
    args.reportOut || ".dev/custom-ui-assets/npc-hosted-world-apply-report.json",
  );
  const report = {
    generatedAt: new Date().toISOString(),
    savePath,
    figurinesPatched,
    figurinesCreated,
    skippedNoHostedQuartet,
    hostedAssetCount: [...assetMap.values()].filter(isHostedSteamUrl).length,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Save: ${savePath}`);
  console.log(`Registry keys: ${sortedRegistryKeys.length}`);
  console.log(`Figurines patched: ${figurinesPatched.length}`);
  console.log(`Figurines created: ${figurinesCreated.length}`);
  console.log(`Skipped (no hosted quartet in save): ${skippedNoHostedQuartet.length}`);
  console.log(`Report: ${reportPath}`);

  const changed = figurinesPatched.length + figurinesCreated.length;

  if (dryRun) {
    console.log("Dry run — save not written.");
    return;
  }

  if (changed === 0) {
    console.log("No figurine world objects to update.");
    return;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot)}\n`, "utf8");
  console.log(`Save updated: ${savePath}`);
  console.log(">>> Reload save in TTS (Save & Play).");
}

main();
