#!/usr/bin/env node
"use strict";

/**
 * Inject join-minimal Global XmlUI + Arm-equivalent Loading purge into a TTS save (TOR-439).
 *
 * Matches Host "Arm Join XML" cold state for File → Load experiments:
 * - XmlUI → expanded ui/Global.join_minimal.xml
 * - CustomUIAssets → keep-list only (names referenced by join-minimal XmlUI)
 * - ObjectStates → remove preload NPC figurines/lights + soundscape emitters
 * - LuaScriptState.connectionControls: joinXmlArmed, deferSetXml, asset/object backups
 *   so staged restore (1–4) still works after load
 *
 * Does not replace LuaScript or clear unrelated game state.
 *
 * Usage (repo root):
 *   node .tools/tts-save/inject-join-minimal-xml.js --saveName 230
 *   npm run tts-save:inject-join-minimal -- --saveName 230
 *   … --xmlOnly          # XmlUI + armed flags only (no asset/object purge)
 *   … --dryRun
 *
 * Then File → Load that save in TTS (close TTS or switch slot first if the file is locked).
 */

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("./resolve-save-path.js");
const {
  expandXmlFile,
  extractCustomAssetNames,
} = require("../../.dev/scripts/embed_ui_global_xml_docs.js");

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
 * @param {string} savePath
 * @returns {string}
 */
function buildBackupPath(savePath) {
  const dir = path.dirname(savePath);
  const base = path.basename(savePath, ".json");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `${base}.pre-inject-join-minimal.${stamp}.json`);
}

/**
 * SOUNDSCAPE_* GUID strings from lib/guids.ttslua.
 * @param {string} projectRoot
 * @returns {Map<string, string>} lowercase guid → guidKey
 */
function loadSoundscapeGuidMap(projectRoot) {
  const guidsPath = path.join(projectRoot, "lib", "guids.ttslua");
  const text = fs.readFileSync(guidsPath, "utf8");
  /** @type {Map<string, string>} */
  const map = new Map();
  const re = /SOUNDSCAPE_([A-Z0-9_]+)\s*=\s*"([0-9a-fA-F]+)"/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const guidKey = `SOUNDSCAPE_${match[1]}`;
    map.set(match[2].toLowerCase(), guidKey);
  }
  if (map.size === 0) {
    throw new Error(`No SOUNDSCAPE_* GUIDs found in ${guidsPath}`);
  }
  return map;
}

/**
 * Channel key for a SOUNDSCAPE_* guidKey (best-effort from catalog naming).
 * @param {string} guidKey
 * @returns {string}
 */
function channelKeyFromGuidKey(guidKey) {
  const map = {
    SOUNDSCAPE_MUSIC_A: "musicA",
    SOUNDSCAPE_MUSIC_B: "musicB",
    SOUNDSCAPE_FEATURED_A: "featuredA",
    SOUNDSCAPE_FEATURED_B: "featuredB",
    SOUNDSCAPE_LOCATION_A: "locationA",
    SOUNDSCAPE_LOCATION_B: "locationB",
    SOUNDSCAPE_WEATHER_RAIN: "weatherRain",
    SOUNDSCAPE_WEATHER_WIND: "weatherWind",
    SOUNDSCAPE_WEATHER_THUNDER: "weatherThunder",
  };
  return map[guidKey] || guidKey;
}

/**
 * @param {unknown} rawState
 * @returns {Record<string, unknown>}
 */
function ensureStateObject(rawState) {
  if (rawState === null || typeof rawState !== "object" || Array.isArray(rawState)) {
    return {};
  }
  return /** @type {Record<string, unknown>} */ (rawState);
}

/**
 * @param {Record<string, unknown>} state
 * @returns {Record<string, unknown>}
 */
function ensureConnectionControls(state) {
  let controls = state.connectionControls;
  if (controls === null || typeof controls !== "object" || Array.isArray(controls)) {
    controls = {};
    state.connectionControls = controls;
  }
  return /** @type {Record<string, unknown>} */ (controls);
}

/**
 * Preload-pool figurine/light GUIDs from npcs.instances in LuaScriptState.
 * @param {Record<string, unknown>} state
 * @returns {{
 *   removeGuids: Set<string>,
 *   figByGuid: Map<string, string>,
 *   lightByGuid: Map<string, string>,
 * }}
 */
function collectPreloadNpcGuidsFromState(state) {
  /** @type {Set<string>} */
  const removeGuids = new Set();
  /** @type {Map<string, string>} */
  const figByGuid = new Map();
  /** @type {Map<string, string>} */
  const lightByGuid = new Map();

  const npcs = state.npcs;
  if (npcs === null || typeof npcs !== "object" || Array.isArray(npcs)) {
    return { removeGuids, figByGuid, lightByGuid };
  }
  const instances = /** @type {Record<string, unknown>} */ (npcs).instances;
  if (instances === null || typeof instances !== "object" || Array.isArray(instances)) {
    return { removeGuids, figByGuid, lightByGuid };
  }

  for (const [npcName, recRaw] of Object.entries(
    /** @type {Record<string, unknown>} */ (instances)
  )) {
    if (typeof npcName !== "string" || recRaw === null || typeof recRaw !== "object" || Array.isArray(recRaw)) {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (recRaw);
    if (rec.areaKey !== "preload") {
      continue;
    }
    const figGuid = typeof rec.figurineGuid === "string" ? rec.figurineGuid.trim() : "";
    if (figGuid !== "") {
      const key = figGuid.toLowerCase();
      removeGuids.add(key);
      figByGuid.set(key, npcName);
    }
    const lightGuid = typeof rec.lightGuid === "string" ? rec.lightGuid.trim() : "";
    if (lightGuid !== "") {
      const key = lightGuid.toLowerCase();
      removeGuids.add(key);
      lightByGuid.set(key, npcName);
    }
  }
  return { removeGuids, figByGuid, lightByGuid };
}

/**
 * @param {unknown} tags
 * @param {string} tag
 * @returns {boolean}
 */
function objectHasTag(tags, tag) {
  if (!Array.isArray(tags)) {
    return false;
  }
  return tags.some((t) => typeof t === "string" && t === tag);
}

/**
 * Remove matching GUIDs from ObjectStates (+ ContainedObjects). Collect removed nodes.
 * @param {unknown} nodes
 * @param {Set<string>} removeGuids lowercase
 * @param {Record<string, unknown>[]} removedOut
 * @returns {unknown}
 */
function filterObjectStates(nodes, removeGuids, removedOut) {
  if (!Array.isArray(nodes)) {
    return nodes;
  }
  /** @type {Record<string, unknown>[]} */
  const kept = [];
  for (const item of nodes) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      kept.push(/** @type {Record<string, unknown>} */ (item));
      continue;
    }
    const obj = /** @type {Record<string, unknown>} */ (item);
    const guid = typeof obj.GUID === "string" ? obj.GUID.toLowerCase() : "";
    if (guid !== "" && removeGuids.has(guid)) {
      removedOut.push(obj);
      continue;
    }
    if (Array.isArray(obj.ContainedObjects)) {
      obj.ContainedObjects = filterObjectStates(obj.ContainedObjects, removeGuids, removedOut);
    }
    kept.push(obj);
  }
  return kept;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {{
 *   soundscapeByGuid: Map<string, string>,
 *   figByGuid: Map<string, string>,
 *   lightByGuid: Map<string, string>,
 * }} maps
 * @returns {Record<string, unknown>}
 */
function toColdBackupEntry(obj, maps) {
  const guid = typeof obj.GUID === "string" ? obj.GUID : "";
  const guidLower = guid.toLowerCase();
  /** @type {Record<string, unknown>} */
  const entry = {
    guid,
    data: obj,
  };
  if (maps.soundscapeByGuid.has(guidLower)) {
    const guidKey = maps.soundscapeByGuid.get(guidLower) || "";
    entry.kind = "soundscape_emitter";
    entry.guidKey = guidKey;
    entry.channelKey = channelKeyFromGuidKey(guidKey);
    return entry;
  }
  if (maps.figByGuid.has(guidLower) || objectHasTag(obj.Tags, "npc_figurine")) {
    entry.kind = "npc_figurine";
    entry.npcName = maps.figByGuid.get(guidLower) || null;
    return entry;
  }
  if (maps.lightByGuid.has(guidLower) || objectHasTag(obj.Tags, "npc_light")) {
    entry.kind = "npc_light";
    entry.npcName = maps.lightByGuid.get(guidLower) || null;
    return entry;
  }
  entry.kind = "unknown";
  return entry;
}

/**
 * @param {unknown} assets
 * @returns {{ name: string, url: string }[]}
 */
function normalizeCustomAssetsBackup(assets) {
  if (!Array.isArray(assets)) {
    return [];
  }
  /** @type {{ name: string, url: string }[]} */
  const out = [];
  for (const raw of assets) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (raw);
    const name = typeof row.name === "string" ? row.name : typeof row.Name === "string" ? row.Name : "";
    const url = typeof row.url === "string" ? row.url : typeof row.URL === "string" ? row.URL : "";
    if (name !== "" && url !== "") {
      out.push({ name, url });
    }
  }
  return out;
}

/**
 * @param {unknown} assets
 * @param {Set<string>} keepNames
 * @returns {{ kept: Record<string, unknown>[], removedCount: number, missingKeep: string[] }}
 */
function slimCustomUiAssets(assets, keepNames) {
  if (!Array.isArray(assets)) {
    throw new Error("Save missing CustomUIAssets array.");
  }
  /** @type {Map<string, Record<string, unknown>>} */
  const byName = new Map();
  for (const raw of assets) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (raw);
    const name = typeof row.Name === "string" ? row.Name : typeof row.name === "string" ? row.name : "";
    if (name !== "") {
      byName.set(name, row);
    }
  }
  /** @type {Record<string, unknown>[]} */
  const kept = [];
  /** @type {string[]} */
  const missingKeep = [];
  for (const name of [...keepNames].sort()) {
    const row = byName.get(name);
    if (row) {
      kept.push(row);
    } else {
      missingKeep.push(name);
    }
  }
  return {
    kept,
    removedCount: assets.length - kept.length,
    missingKeep,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun === "1" || args.dryRun === "true";
  const skipBackup = args.noBackup === "1" || args.noBackup === "true";
  const xmlOnly = args.xmlOnly === "1" || args.xmlOnly === "true";

  const saveInput = args.saveName || args.save;
  if (!saveInput) {
    throw new Error("Required: --saveName <id> or --save <path-to-save.json>");
  }

  const projectRoot = path.resolve(__dirname, "../..");
  const minimalRoot = path.join(projectRoot, "ui", "Global.join_minimal.xml");
  if (!fs.existsSync(minimalRoot)) {
    throw new Error(`Missing ui/Global.join_minimal.xml at ${minimalRoot}`);
  }

  let savePath;
  if (args.save && !args.saveName) {
    savePath = path.resolve(args.save);
  } else {
    ({ savePath } = resolveSavePath(saveInput, args.savesDir));
  }

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const minimalXml = expandXmlFile(projectRoot, minimalRoot, new Set());
  const keepAssetNames = new Set(extractCustomAssetNames(minimalXml));
  const soundscapeByGuid = loadSoundscapeGuidMap(projectRoot);

  const saveText = fs.readFileSync(savePath, "utf8");
  /** @type {unknown} */
  let saveRootRaw;
  try {
    saveRootRaw = JSON.parse(saveText);
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Save JSON parse failed (${savePath}): ${message}`);
  }
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);

  const previousXmlLen = typeof saveRoot.XmlUI === "string" ? saveRoot.XmlUI.length : 0;
  saveRoot.XmlUI = minimalXml;

  let state = /** @type {Record<string, unknown> | null} */ (null);
  let stateCreated = false;
  const luaStateRaw = saveRoot.LuaScriptState;
  if (typeof luaStateRaw === "string" && luaStateRaw.trim() !== "") {
    try {
      state = ensureStateObject(JSON.parse(luaStateRaw));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`LuaScriptState JSON parse failed: ${message}`);
    }
  } else {
    state = {};
    stateCreated = true;
    console.warn(
      "WARNING: LuaScriptState was empty — creating minimal connectionControls. " +
        "Prefer Arm/File→Save once in TTS first so npcs.instances exist for preload GUID targeting."
    );
  }

  const cc = ensureConnectionControls(state);
  cc.joinXmlArmed = true;
  cc.deferSetXml = true;

  let assetsBefore = 0;
  let assetsAfter = 0;
  let assetsRemoved = 0;
  /** @type {string[]} */
  let missingKeep = [];

  let objectsRemoved = 0;
  let figN = 0;
  let lightN = 0;
  let emitN = 0;
  let unknownN = 0;

  if (!xmlOnly) {
    const rawAssets = saveRoot.CustomUIAssets;
    assetsBefore = Array.isArray(rawAssets) ? rawAssets.length : 0;
    const fullBackup = normalizeCustomAssetsBackup(rawAssets);
    if (fullBackup.length === 0) {
      throw new Error("CustomUIAssets empty or unreadable — cannot slim.");
    }
    cc.joinXmlCustomAssetsBackup = fullBackup;

    const slim = slimCustomUiAssets(rawAssets, keepAssetNames);
    missingKeep = slim.missingKeep;
    if (missingKeep.length > 0) {
      throw new Error(
        `Join-minimal keep-list missing from CustomUIAssets: ${missingKeep.join(", ")}`
      );
    }
    saveRoot.CustomUIAssets = slim.kept;
    assetsAfter = slim.kept.length;
    assetsRemoved = slim.removedCount;

    const preload = collectPreloadNpcGuidsFromState(state);
    /** @type {Set<string>} */
    const removeGuids = new Set(preload.removeGuids);
    for (const guid of soundscapeByGuid.keys()) {
      removeGuids.add(guid);
    }

    /** @type {Record<string, unknown>[]} */
    const removedObjects = [];
    saveRoot.ObjectStates = filterObjectStates(saveRoot.ObjectStates, removeGuids, removedObjects);
    objectsRemoved = removedObjects.length;

    /** @type {Record<string, unknown>[]} */
    const coldEntries = [];
    for (const obj of removedObjects) {
      const entry = toColdBackupEntry(obj, {
        soundscapeByGuid,
        figByGuid: preload.figByGuid,
        lightByGuid: preload.lightByGuid,
      });
      coldEntries.push(entry);
      if (entry.kind === "npc_figurine") figN += 1;
      else if (entry.kind === "npc_light") lightN += 1;
      else if (entry.kind === "soundscape_emitter") emitN += 1;
      else unknownN += 1;
    }

    if (coldEntries.length > 0) {
      cc.joinColdPoolsBackup = { version: 1, entries: coldEntries };
      cc.joinColdPoolsActive = true;
    } else {
      cc.joinColdPoolsBackup = null;
      cc.joinColdPoolsActive = false;
      console.warn(
        "WARNING: No ObjectStates removed. Check npcs.instances areaKey=preload and soundscape GUIDs."
      );
    }
  }

  saveRoot.LuaScriptState = JSON.stringify(state);

  console.log("=== Inject join-minimal + Arm-equivalent Loading purge ===");
  console.log(`Save:     ${savePath}`);
  console.log(`XmlUI:    ${previousXmlLen} → ${minimalXml.length} bytes (minimal)`);
  if (xmlOnly) {
    console.log("Purge:    skipped (--xmlOnly)");
  } else {
    console.log(
      `Assets:   CustomUIAssets ${assetsBefore} → ${assetsAfter} (removed ${assetsRemoved}; keep ${keepAssetNames.size})`
    );
    console.log(
      `Objects:  removed ${objectsRemoved} (figurines=${figN} lights=${lightN} emitters=${emitN} other=${unknownN})`
    );
  }
  console.log(
    `State:    joinXmlArmed=true deferSetXml=true` +
      (xmlOnly
        ? ""
        : ` + asset backup (${Array.isArray(cc.joinXmlCustomAssetsBackup) ? cc.joinXmlCustomAssetsBackup.length : 0})` +
          ` + cold backup (${
            cc.joinColdPoolsBackup &&
            typeof cc.joinColdPoolsBackup === "object" &&
            Array.isArray(/** @type {Record<string, unknown>} */ (cc.joinColdPoolsBackup).entries)
              ? /** @type {unknown[]} */ (
                  /** @type {Record<string, unknown>} */ (cc.joinColdPoolsBackup).entries
                ).length
              : 0
          })`) +
      (stateCreated ? " (new LuaScriptState)" : "")
  );
  console.log("LuaScript: unchanged");

  if (dryRun) {
    console.log("");
    console.log("Dry run only — save file was not modified.");
    return;
  }

  if (!skipBackup) {
    const backupPath = buildBackupPath(savePath);
    fs.copyFileSync(savePath, backupPath);
    console.log(`Backup:   ${backupPath}`);
  }

  // Re-read original was already copied; write mutated root.
  // Note: backup was taken from disk before mutations only if we copy before write —
  // we copied savePath at start of write section AFTER mutating in memory. Fix: backup
  // must use original text.
  // Actually we already mutated saveRoot in memory; copyFileSync copies CURRENT disk file
  // which is still original until writeFileSync. Good — disk is still original.
  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");
  console.log("");
  console.log("Save updated.");
  console.log("NEXT: Close TTS or switch slot, then File → Load this save.");
  console.log("Loading should reflect slim CustomUIAssets + fewer ObjectStates.");
  console.log("Staged restore 1–4 after load uses backups in LuaScriptState.");
  console.log("Do NOT Save & Play / tts-save:inject-global before this load.");
}

main();
