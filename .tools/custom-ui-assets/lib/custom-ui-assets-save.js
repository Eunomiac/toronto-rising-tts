"use strict";

/**
 * Shared helpers for CustomUIAssets edit scripts (global or per-object).
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { resolveSavePath } = require("../../tts-save/resolve-save-path");
const {
  findExistingConfig,
  loadOrSetupConfig,
  backupSaveBeforeWrite,
} = require("./tts-assets-config.js");

const CANDIDATE_SAVES_DIRS = [
  process.env.TTS_SAVES_DIR,
  "D:/Owner/Documents/My Games/Tabletop Simulator/Saves",
  "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves",
  path.join(process.env.USERPROFILE || "", "Documents", "My Games", "Tabletop Simulator", "Saves"),
].filter((p) => typeof p === "string" && p.trim().length > 0);

/**
 * @typedef {{
 *   mode: "global" | "objects";
 *   label: string;
 *   guid: string | null;
 *   nickname: string;
 *   assets: Record<string, unknown>[];
 *   object: Record<string, unknown> | null;
 * }} AssetTarget
 */

/**
 * @param {string} saveName
 * @param {string | undefined} savePathArg
 * @param {{ savesDir?: string } | null | undefined} [config]
 * @returns {string}
 */
function resolveExistingSave(saveName, savePathArg, config) {
  if (savePathArg && String(savePathArg).trim() !== "") {
    const abs = path.resolve(savePathArg);
    if (!fs.existsSync(abs)) {
      throw new Error(`Save file not found: ${abs}`);
    }
    return abs;
  }

  const id = String(saveName || (config && config.defaultSaveName) || "230")
    .replace(/^TS_Save_/i, "")
    .replace(/\.json$/i, "");

  const dirs = [];
  if (config && typeof config.savesDir === "string" && config.savesDir.trim() !== "") {
    dirs.push(config.savesDir);
  }
  for (const d of CANDIDATE_SAVES_DIRS) {
    if (!dirs.includes(d)) dirs.push(d);
  }

  for (const dir of dirs) {
    const candidate = path.join(dir, `TS_Save_${id}.json`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const fallback = resolveSavePath(id, config && config.savesDir).savePath;
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  throw new Error(
    `Could not find TS_Save_${id}.json. Pass --save <path>, set TTS_SAVES_DIR, or run npm run tts-assets:configure.`,
  );
}

/**
 * Load/create config, then resolve the save path.
 * @param {{
 *   saveName?: string,
 *   savePath?: string | null,
 *   forceConfigure?: boolean,
 *   interactive?: boolean,
 * }} [opts]
 * @returns {Promise<{ saveFile: string, config: import("./tts-assets-config.js").TtsAssetsConfig | null, configPath: string | null }>}
 */
async function resolveSaveWithConfig(opts = {}) {
  const explicitSave =
    opts.savePath && String(opts.savePath).trim() !== ""
      ? path.resolve(String(opts.savePath).trim())
      : null;

  let config = null;
  let configPath = null;

  const existing = findExistingConfig();
  if (existing && opts.forceConfigure !== true) {
    config = existing.config;
    configPath = existing.path;
  } else if (explicitSave) {
    // Explicit --save: do not force interactive setup.
    config = existing ? existing.config : null;
    configPath = existing ? existing.path : null;
  } else {
    const loaded = await loadOrSetupConfig({
      interactive: opts.interactive !== false,
      forceSetup: opts.forceConfigure === true,
    });
    config = loaded.config;
    configPath = loaded.configPath;
  }

  const saveName =
    (opts.saveName && String(opts.saveName).trim() !== ""
      ? opts.saveName
      : null) ||
    (config && config.defaultSaveName) ||
    "230";

  const saveFile = resolveExistingSave(saveName, explicitSave || undefined, config);
  return { saveFile, config, configPath };
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {Record<string, unknown>[]}
 */
function getGlobalCustomUiAssets(saveRoot) {
  if (!Array.isArray(saveRoot.CustomUIAssets)) {
    throw new Error("Save missing CustomUIAssets array (global custom UI assets).");
  }
  return /** @type {Record<string, unknown>[]} */ (saveRoot.CustomUIAssets);
}

/**
 * Ensure object has a CustomUIAssets array (create empty if missing).
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>[]}
 */
function ensureObjectCustomUiAssets(obj) {
  if (!Array.isArray(obj.CustomUIAssets)) {
    obj.CustomUIAssets = [];
  }
  return /** @type {Record<string, unknown>[]} */ (obj.CustomUIAssets);
}

/**
 * Parse comma-delimited GUID list. Dedupes case-insensitively, preserves first casing.
 * @param {string | null | undefined} raw
 * @returns {string[]} empty when omitted / blank
 */
function parseGuidsList(raw) {
  if (raw == null || String(raw).trim() === "") {
    return [];
  }
  const parts = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  /** @type {string[]} */
  const out = [];
  /** @type {Set<string>} */
  const seen = new Set();
  for (const g of parts) {
    const key = g.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  if (out.length < 1) {
    throw new Error("--guids was provided but contained no GUID values.");
  }
  return out;
}

/**
 * Walk ObjectStates + ContainedObjects (and States bag variants) collecting GUID → object.
 * @param {Record<string, unknown>} saveRoot
 * @returns {Map<string, { obj: Record<string, unknown>, path: string }>}
 */
function indexObjectsByGuid(saveRoot) {
  /** @type {Map<string, { obj: Record<string, unknown>, path: string }>} */
  const index = new Map();

  /**
   * @param {unknown} node
   * @param {string} pathLabel
   */
  function visit(node, pathLabel) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return;
    }
    const obj = /** @type {Record<string, unknown>} */ (node);
    const guid = typeof obj.GUID === "string" ? obj.GUID.trim() : "";
    if (guid !== "") {
      const key = guid.toLowerCase();
      if (!index.has(key)) {
        index.set(key, { obj, path: pathLabel });
      }
    }

    if (Array.isArray(obj.ContainedObjects)) {
      for (let i = 0; i < obj.ContainedObjects.length; i += 1) {
        visit(obj.ContainedObjects[i], `${pathLabel}/ContainedObjects[${i}]`);
      }
    }

    // Bag/infinite bag States map (GUID → object snapshot).
    if (obj.States && typeof obj.States === "object" && !Array.isArray(obj.States)) {
      const states = /** @type {Record<string, unknown>} */ (obj.States);
      for (const stateKey of Object.keys(states)) {
        visit(states[stateKey], `${pathLabel}/States[${stateKey}]`);
      }
    }
  }

  const objectStates = saveRoot.ObjectStates;
  if (!Array.isArray(objectStates)) {
    throw new Error("Save missing ObjectStates array (required for --guids object mode).");
  }
  for (let i = 0; i < objectStates.length; i += 1) {
    visit(objectStates[i], `ObjectStates[${i}]`);
  }
  return index;
}

/**
 * Resolve mutation targets. Global mode when guids empty; object mode otherwise.
 * Object mode never touches saveRoot.CustomUIAssets. Missing GUID → throw before mutate.
 * @param {Record<string, unknown>} saveRoot
 * @param {string[]} guids
 * @returns {AssetTarget[]}
 */
function resolveAssetTargets(saveRoot, guids) {
  if (!Array.isArray(guids) || guids.length === 0) {
    return [
      {
        mode: "global",
        label: "global",
        guid: null,
        nickname: "",
        assets: getGlobalCustomUiAssets(saveRoot),
        object: null,
      },
    ];
  }

  const index = indexObjectsByGuid(saveRoot);
  /** @type {string[]} */
  const missing = [];
  /** @type {AssetTarget[]} */
  const targets = [];

  for (const guid of guids) {
    const hit = index.get(guid.toLowerCase());
    if (!hit) {
      missing.push(guid);
      continue;
    }
    const nickname = typeof hit.obj.Nickname === "string" ? hit.obj.Nickname : "";
    const assets = ensureObjectCustomUiAssets(hit.obj);
    targets.push({
      mode: "objects",
      label: nickname !== "" ? `${guid} (${nickname})` : guid,
      guid,
      nickname,
      assets,
      object: hit.obj,
    });
  }

  if (missing.length > 0) {
    throw new Error(
      `Object GUID(s) not found in save (ObjectStates / ContainedObjects / States): ${missing.join(", ")}`,
    );
  }
  return targets;
}

/**
 * @param {string} filePath
 * @param {string} contents
 */
function writeAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, filePath);
}

/**
 * @param {string} patternSource e.g. ^(.*?)\\.webp$ or /^(.*?)\\.webp$/i
 * @returns {RegExp}
 */
function parseUserRegExp(patternSource) {
  const raw = String(patternSource ?? "").trim();
  if (raw === "") {
    throw new Error("Regexp pattern is empty.");
  }
  const slashForm = raw.match(/^\/(.+)\/([gimsuy]*)$/s);
  if (slashForm) {
    return new RegExp(slashForm[1], slashForm[2]);
  }
  return new RegExp(raw);
}

/**
 * Minimal RFC4180-ish CSV parse.
 * @param {string} text
 * @returns {string[][]}
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const s = String(text || "").replace(/^\uFEFF/, "");

  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * @param {string} csvText
 * @returns {{ Name: string, URL: string }[]}
 */
function parseNameUrlCsv(csvText) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }
  const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  let nameIdx = headers.indexOf("name");
  let urlIdx = headers.indexOf("url");
  if (nameIdx < 0) nameIdx = 0;
  if (urlIdx < 0) urlIdx = 1;
  if (nameIdx === urlIdx) {
    throw new Error('Could not resolve distinct "Name" and "URL" columns.');
  }

  /** @type {{ Name: string, URL: string }[]} */
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const name = String(rows[r][nameIdx] ?? "").trim();
    const url = String(rows[r][urlIdx] ?? "").trim();
    if (name === "" && url === "") continue;
    if (name === "") throw new Error(`Row ${r + 1}: missing Name.`);
    if (url === "") throw new Error(`Row ${r + 1} (${name}): missing URL.`);
    out.push({ Name: name, URL: url });
  }
  if (out.length < 1) {
    throw new Error("CSV produced zero data rows.");
  }
  return out;
}

/**
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function confirmYesNo(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      const a = String(answer || "").trim().toLowerCase();
      resolve(a === "y" || a === "yes");
    });
  });
}

/**
 * Require an explicit Y confirmation after a change summary before writing the save.
 * `--yes` skips this (automation only).
 * @param {boolean} skipConfirm
 * @param {string} summaryQuestion
 */
async function requireWriteConfirmation(skipConfirm, summaryQuestion) {
  if (skipConfirm) {
    return;
  }
  const ok = await confirmYesNo(summaryQuestion);
  if (!ok) {
    const err = new Error("Aborted by user (write not confirmed).");
    /** @type {Error & { code?: string }} */ (err).code = "USER_ABORT";
    throw err;
  }
}

module.exports = {
  CANDIDATE_SAVES_DIRS,
  resolveExistingSave,
  resolveSaveWithConfig,
  getGlobalCustomUiAssets,
  ensureObjectCustomUiAssets,
  parseGuidsList,
  indexObjectsByGuid,
  resolveAssetTargets,
  writeAtomic,
  parseUserRegExp,
  parseCsv,
  parseNameUrlCsv,
  confirmYesNo,
  requireWriteConfirmation,
  backupSaveBeforeWrite,
  findExistingConfig,
  loadOrSetupConfig,
};
