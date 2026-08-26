"use strict";

/**
 * Local config for TTS Cloud / CustomUIAssets tooling.
 *
 * Search order for config file:
 *   1. TTS_ASSETS_CONFIG env (absolute path)
 *   2. ./tts-assets.config.json (cwd)
 *   3. ./.tools/tts-cloud/tts-assets.config.json (repo layout)
 *   4. ~/.tts-assets/config.json
 *
 * If none exists, interactive setup walks the author through Saves folder + default save slot.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const CONFIG_BASENAME = "tts-assets.config.json";

/**
 * @typedef {{
 *   savesDir: string,
 *   defaultSaveName: string,
 *   cloudRoot?: string,
 *   backupBeforeWrite?: boolean,
 *   backupDir?: string | null,
 * }} TtsAssetsConfig
 */

/**
 * @returns {string[]}
 */
function candidateSavesDirs() {
  return [
    process.env.TTS_SAVES_DIR,
    path.join(os.homedir(), "Documents", "My Games", "Tabletop Simulator", "Saves"),
    path.join(os.homedir(), "OneDrive", "Documents", "My Games", "Tabletop Simulator", "Saves"),
    "D:/Owner/Documents/My Games/Tabletop Simulator/Saves",
    "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves",
  ].filter((p) => typeof p === "string" && String(p).trim().length > 0);
}

/**
 * @returns {string[]}
 */
function configSearchPaths() {
  const paths = [];
  if (process.env.TTS_ASSETS_CONFIG && String(process.env.TTS_ASSETS_CONFIG).trim() !== "") {
    paths.push(path.resolve(process.env.TTS_ASSETS_CONFIG));
  }
  paths.push(path.resolve(process.cwd(), CONFIG_BASENAME));
  paths.push(path.resolve(process.cwd(), ".tools", "tts-cloud", CONFIG_BASENAME));
  paths.push(path.join(os.homedir(), ".tts-assets", "config.json"));
  return paths;
}

/**
 * @returns {{ path: string, config: TtsAssetsConfig } | null}
 */
function findExistingConfig() {
  for (const candidate of configSearchPaths()) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const cfg = normalizeConfig(/** @type {Record<string, unknown>} */ (raw));
      return { path: candidate, config: cfg };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      throw new Error(`Invalid config JSON at ${candidate}: ${msg}`);
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {TtsAssetsConfig}
 */
function normalizeConfig(raw) {
  const savesDir = typeof raw.savesDir === "string" ? raw.savesDir.trim() : "";
  if (savesDir === "") {
    throw new Error('Config missing required string "savesDir".');
  }
  let defaultSaveName =
    typeof raw.defaultSaveName === "string" && raw.defaultSaveName.trim() !== ""
      ? raw.defaultSaveName.trim()
      : "1";
  defaultSaveName = defaultSaveName.replace(/^TS_Save_/i, "").replace(/\.json$/i, "");

  /** @type {TtsAssetsConfig} */
  const cfg = {
    savesDir: path.resolve(savesDir),
    defaultSaveName,
    backupBeforeWrite: raw.backupBeforeWrite !== false,
  };
  if (typeof raw.cloudRoot === "string" && raw.cloudRoot.trim() !== "") {
    cfg.cloudRoot = raw.cloudRoot.trim();
  }
  if (typeof raw.backupDir === "string" && raw.backupDir.trim() !== "") {
    cfg.backupDir = path.resolve(raw.backupDir.trim());
  } else {
    cfg.backupDir = null;
  }
  return cfg;
}

/**
 * @param {string} question
 * @param {string} [defaultValue]
 * @returns {Promise<string>}
 */
function promptLine(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  const suffix =
    defaultValue != null && String(defaultValue) !== ""
      ? ` [${defaultValue}]`
      : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      const a = String(answer || "").trim();
      if (a === "" && defaultValue != null) {
        resolve(String(defaultValue));
        return;
      }
      resolve(a);
    });
  });
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
function looksLikeSavesDir(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return false;
  }
  try {
    const names = fs.readdirSync(dir);
    return names.some((n) => /^TS_Save_\d+\.json$/i.test(n));
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<TtsAssetsConfig & { configPath: string }>}
 */
async function runInteractiveSetup() {
  console.error("");
  console.error("[tts-assets] No config found. Let's set one up.");
  console.error("[tts-assets] Config stores your TTS Saves folder + default save slot.");
  console.error("");

  const existing = candidateSavesDirs().filter(looksLikeSavesDir);
  let savesDir = "";

  if (existing.length > 0) {
    console.error("[tts-assets] Found likely Saves folders:");
    existing.forEach((d, i) => {
      console.error(`  [${i + 1}] ${d}`);
    });
    console.error(`  [0] Enter a path manually`);
    const choice = await promptLine("Choose a number", "1");
    const n = Number(choice);
    if (Number.isFinite(n) && n >= 1 && n <= existing.length) {
      savesDir = existing[n - 1];
    }
  }

  while (savesDir === "" || !looksLikeSavesDir(savesDir)) {
    if (savesDir !== "") {
      console.error(`[tts-assets] Not a valid Saves folder (need TS_Save_*.json inside): ${savesDir}`);
    }
    savesDir = await promptLine(
      "Path to Tabletop Simulator Saves folder",
      existing[0] || path.join(os.homedir(), "Documents", "My Games", "Tabletop Simulator", "Saves"),
    );
  }

  const defaultSaveName = await promptLine(
    "Default save slot number (e.g. 230 for TS_Save_230.json)",
    "230",
  );
  const cloudRoot = await promptLine(
    "TTS Cloud Manager root folder name (optional, blank to skip)",
    "",
  );

  const preferredPath = path.resolve(process.cwd(), CONFIG_BASENAME);
  const configPath = await promptLine("Where to write config", preferredPath);

  /** @type {TtsAssetsConfig} */
  const config = {
    savesDir: path.resolve(savesDir),
    defaultSaveName: String(defaultSaveName).replace(/^TS_Save_/i, "").replace(/\.json$/i, ""),
    backupBeforeWrite: true,
    backupDir: null,
  };
  if (cloudRoot.trim() !== "") {
    config.cloudRoot = cloudRoot.trim();
  }

  writeConfigFile(configPath, config);
  console.error(`[tts-assets] Wrote ${configPath}`);
  console.error("[tts-assets] Backups before save writes: ON (tts-assets-backups/ next to the save).");
  console.error("");
  return { ...config, configPath };
}

/**
 * @param {string} configPath
 * @param {TtsAssetsConfig} config
 */
function writeConfigFile(configPath, config) {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  const body = {
    savesDir: config.savesDir,
    defaultSaveName: config.defaultSaveName,
    backupBeforeWrite: config.backupBeforeWrite !== false,
    backupDir: config.backupDir ?? null,
  };
  if (config.cloudRoot) {
    body.cloudRoot = config.cloudRoot;
  }
  fs.writeFileSync(configPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

/**
 * Load config or run interactive setup.
 * @param {{ interactive?: boolean, forceSetup?: boolean }} [opts]
 * @returns {Promise<{ config: TtsAssetsConfig, configPath: string | null, created: boolean }>}
 */
async function loadOrSetupConfig(opts = {}) {
  const interactive = opts.interactive !== false;
  const forceSetup = opts.forceSetup === true;

  if (!forceSetup) {
    const hit = findExistingConfig();
    if (hit) {
      return { config: hit.config, configPath: hit.path, created: false };
    }
  }

  if (!interactive || !process.stdin.isTTY) {
    throw new Error(
      `No ${CONFIG_BASENAME} found. Run with a TTY to configure, or create one from tts-assets.config.example.json.`,
    );
  }

  const created = await runInteractiveSetup();
  return {
    config: {
      savesDir: created.savesDir,
      defaultSaveName: created.defaultSaveName,
      cloudRoot: created.cloudRoot,
      backupBeforeWrite: created.backupBeforeWrite,
      backupDir: created.backupDir,
    },
    configPath: created.configPath,
    created: true,
  };
}

/**
 * @param {string} savePath
 * @param {TtsAssetsConfig | null | undefined} config
 * @returns {string} backup file path
 */
function backupSaveFile(savePath, config) {
  const abs = path.resolve(savePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Cannot backup missing save: ${abs}`);
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace(/Z$/, "");
  const base = path.basename(abs, path.extname(abs));
  const backupName = `${base}.${stamp}.json`;

  let backupDir =
    config && typeof config.backupDir === "string" && config.backupDir.trim() !== ""
      ? path.resolve(config.backupDir)
      : path.join(path.dirname(abs), "tts-assets-backups");

  fs.mkdirSync(backupDir, { recursive: true });
  const dest = path.join(backupDir, backupName);
  fs.copyFileSync(abs, dest);
  return dest;
}

/**
 * @param {string} savePath
 * @param {TtsAssetsConfig | null | undefined} config
 * @param {{ skipBackup?: boolean }} [opts]
 * @returns {string | null} backup path, or null if skipped
 */
function backupSaveBeforeWrite(savePath, config, opts = {}) {
  if (opts.skipBackup === true) {
    return null;
  }
  if (config && config.backupBeforeWrite === false) {
    return null;
  }
  const dest = backupSaveFile(savePath, config);
  console.error(`[tts-assets] Backup: ${dest}`);
  return dest;
}

module.exports = {
  CONFIG_BASENAME,
  candidateSavesDirs,
  configSearchPaths,
  findExistingConfig,
  normalizeConfig,
  loadOrSetupConfig,
  runInteractiveSetup,
  writeConfigFile,
  backupSaveFile,
  backupSaveBeforeWrite,
  looksLikeSavesDir,
};
