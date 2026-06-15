"use strict";

/**
 * Resolve TTS object stub identity from `.tts/objects/{Nickname}.{guid}.*` triplets.
 * Display nicknames are free-form; role keys come from companion `.data.json` → `GMNotes`
 * (e.g. `CSHEET_PAGE_1_PINK`, `DICEBAG_ROUSE_PURPLE`).
 *
 * Used by `fix_tts_object_stubs.js` and `check-tts-object-stub-guids.mjs`.
 */

const fs = require("fs");
const path = require("path");

/** @type {readonly string[]} */
const MANAGED_KEY_PREFIXES = [
  "DICEBAG_",
  "CSHEET_PAGE_",
  "CONTROL_BOARD",
  "SIGNAL_CANDLE_",
  "SOUNDSCAPE_",
  "TAROT_BUTTON_",
];

const STUB_FILE_RE = /^(.+)\.([0-9a-fA-F]{6})\.(lua|ttslua|xml|data\.json)$/i;

/**
 * @param {string} key
 * @returns {boolean}
 */
function isManagedRoleKey(key) {
  if (typeof key !== "string" || key === "") {
    return false;
  }
  for (const prefix of MANAGED_KEY_PREFIXES) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} guidsPath
 * @returns {Map<string, string>} roleKey → guid
 */
function loadGuidMap(guidsPath) {
  const src = fs.readFileSync(guidsPath, "utf8");
  /** @type {Map<string, string>} */
  const map = new Map();
  const lineRe = /^\s*([A-Z0-9_]+)\s*=\s*"([0-9a-fA-F]{6})"/gm;
  let match = lineRe.exec(src);
  while (match !== null) {
    const key = match[1];
    const guid = match[2].toLowerCase();
    if (!guid.includes("@")) {
      map.set(key, guid);
    }
    match = lineRe.exec(src);
  }
  return map;
}

/**
 * @param {string} dataJsonPath
 * @returns {string|null}
 */
function readRoleKeyFromDataJson(dataJsonPath) {
  if (!fs.existsSync(dataJsonPath)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(dataJsonPath, "utf8"));
    const gm = typeof data.GMNotes === "string" ? data.GMNotes.trim() : "";
    if (gm !== "" && isManagedRoleKey(gm)) {
      return gm;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {string} objectsDir
 * @param {string} displayStem
 * @param {string} guid
 * @returns {string|null}
 */
function resolveRoleKeyForStub(objectsDir, displayStem, guid) {
  const dataJsonPath = path.join(objectsDir, `${displayStem}.${guid}.data.json`);
  const fromGm = readRoleKeyFromDataJson(dataJsonPath);
  if (fromGm !== null) {
    return fromGm;
  }
  // Legacy: filename stem was ROLE_COLOR (pre–display-nickname sync).
  if (isManagedRoleKey(displayStem)) {
    return displayStem;
  }
  return null;
}

/**
 * @param {string} objectsDir
 * @returns {Array<{ fileName: string, displayStem: string, guid: string, ext: string }>}
 */
function listStubFiles(objectsDir) {
  /** @type {Array<{ fileName: string, displayStem: string, guid: string, ext: string }>} */
  const out = [];
  for (const name of fs.readdirSync(objectsDir)) {
    const m = STUB_FILE_RE.exec(name);
    if (m === null) {
      continue;
    }
    out.push({
      fileName: name,
      displayStem: m[1],
      guid: m[2].toLowerCase(),
      ext: m[3].toLowerCase(),
    });
  }
  return out;
}

/**
 * @param {string} objectsDir
 * @returns {Map<string, { roleKey: string, displayStem: string, guid: string, luaFileName: string, conflict?: string }>}
 * roleKey → lua stub info (for missing-stub / duplicate checks)
 */
function indexManagedLuaStubsByRoleKey(objectsDir) {
  /** @type {Map<string, { roleKey: string, displayStem: string, guid: string, luaFileName: string, conflict?: string }>} */
  const byRole = new Map();

  for (const stub of listStubFiles(objectsDir)) {
    if (stub.ext !== "lua" && stub.ext !== "ttslua") {
      continue;
    }
    const roleKey = resolveRoleKeyForStub(objectsDir, stub.displayStem, stub.guid);
    if (roleKey === null) {
      continue;
    }
    const prior = byRole.get(roleKey);
    if (prior !== undefined) {
      prior.conflict = prior.conflict ?? prior.luaFileName;
      if (prior.luaFileName !== stub.fileName) {
        prior.conflict = `${prior.conflict}, ${stub.fileName}`;
      }
      continue;
    }
    byRole.set(roleKey, {
      roleKey,
      displayStem: stub.displayStem,
      guid: stub.guid,
      luaFileName: stub.fileName,
    });
  }
  return byRole;
}

/**
 * Group key for sibling-set missing-stub checks.
 * @param {string} key
 * @returns {string|null}
 */
function managedFamilyGroup(key) {
  if (key.startsWith("DICEBAG_")) {
    const parts = key.split("_");
    if (parts.length >= 3) {
      return `DICEBAG::${parts.slice(2).join("_")}`;
    }
  }
  if (key.startsWith("CSHEET_PAGE_")) {
    const m = /^CSHEET_PAGE_(\d+)_(.+)$/.exec(key);
    if (m !== null) {
      return `CSHEET_PAGE_${m[1]}::${m[2]}`;
    }
  }
  return null;
}

module.exports = {
  MANAGED_KEY_PREFIXES,
  STUB_FILE_RE,
  isManagedRoleKey,
  loadGuidMap,
  readRoleKeyFromDataJson,
  resolveRoleKeyForStub,
  listStubFiles,
  indexManagedLuaStubsByRoleKey,
  managedFamilyGroup,
};
