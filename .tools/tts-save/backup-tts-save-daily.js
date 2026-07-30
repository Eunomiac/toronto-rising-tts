"use strict";

/**
 * Throttled daily snapshot of the live TTS save (soft-fail for build).
 *
 * Uses tts-assets.config.json (savesDir + defaultSaveName). Copies at most once
 * per 24h into backupDir (or <savesDir>/tts-assets-backups/).
 *
 * Same-day name collision: rename existing → *_YYYY_MM_DD_a.json, write new as
 * *_YYYY_MM_DD_b.json. If _a or _b already exists → hard fail (exit 1).
 *
 * Soft-fail (exit 0): missing config, missing save, I/O errors (except hard collision).
 * Skip: SKIP_SAVE_BACKUP=1 or --skip. Force: --force (ignore 24h stamp).
 */

const fs = require("fs");
const path = require("path");
const {
  findExistingConfig,
} = require("../custom-ui-assets/lib/tts-assets-config.js");
const {
  resolveExistingSave,
} = require("../custom-ui-assets/lib/custom-ui-assets-save.js");

const STAMP_BASENAME = ".last-daily-backup";
const DAY_MS = 24 * 60 * 60 * 1000;
const LOG_PREFIX = "[tts-save:backup-daily]";

/**
 * @param {string[]} argv
 * @returns {{ force: boolean, skip: boolean }}
 */
function parseArgs(argv) {
  return {
    force: argv.includes("--force"),
    skip: argv.includes("--skip") || process.env.SKIP_SAVE_BACKUP === "1",
  };
}

/**
 * @param {Date} d
 * @returns {string} YYYY_MM_DD
 */
function formatDateStamp(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}_${m}_${day}`;
}

/**
 * @param {import("../custom-ui-assets/lib/tts-assets-config.js").TtsAssetsConfig} config
 * @param {string} saveFile
 * @returns {string}
 */
function resolveBackupDir(config, saveFile) {
  if (config && typeof config.backupDir === "string" && config.backupDir.trim() !== "") {
    return path.resolve(config.backupDir);
  }
  return path.join(path.dirname(saveFile), "tts-assets-backups");
}

/**
 * @param {string} stampPath
 * @returns {number}
 */
function readStamp(stampPath) {
  if (!fs.existsSync(stampPath)) {
    fs.writeFileSync(stampPath, "0\n", "utf8");
    return 0;
  }
  const raw = fs.readFileSync(stampPath, "utf8").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
}

/**
 * @param {string} stampPath
 * @param {number} unixSeconds
 */
function writeStamp(stampPath, unixSeconds) {
  fs.writeFileSync(stampPath, `${Math.floor(unixSeconds)}\n`, "utf8");
}

/**
 * If _a or _b already exists for this date → hard fail (further same-day collision).
 * If only the base dated file exists → rename base→_a, write new as _b.
 * Otherwise → write the base dated name.
 *
 * @param {string} backupDir
 * @param {string} baseNameWithoutExt e.g. TS_Save_230_2026_07_30
 * @returns {{ destPath: string, renamedFrom: string | null }}
 */
function resolveDestination(backupDir, baseNameWithoutExt) {
  const basePath = path.join(backupDir, `${baseNameWithoutExt}.json`);
  const aPath = path.join(backupDir, `${baseNameWithoutExt}_a.json`);
  const bPath = path.join(backupDir, `${baseNameWithoutExt}_b.json`);

  if (fs.existsSync(aPath) || fs.existsSync(bPath)) {
    const err = new Error(
      `${LOG_PREFIX} Same-day backup collision: ${path.basename(aPath)} and/or ` +
        `${path.basename(bPath)} already present under ${backupDir}. ` +
        `Resolve manually before rebuilding.`,
    );
    err.code = "DAILY_BACKUP_HARD_COLLISION";
    throw err;
  }

  if (!fs.existsSync(basePath)) {
    return { destPath: basePath, renamedFrom: null };
  }

  fs.renameSync(basePath, aPath);
  console.error(`${LOG_PREFIX} Renamed existing snapshot → ${aPath}`);
  return { destPath: bPath, renamedFrom: aPath };
}

/**
 * Soft-fail path: log and exit 0.
 * @param {string} message
 * @param {unknown} [err]
 */
function softFail(message, err) {
  const detail = err && err.message ? `: ${err.message}` : "";
  console.error(`${LOG_PREFIX} ${message}${detail} — continuing build.`);
  process.exit(0);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.skip) {
    console.error(`${LOG_PREFIX} Skipped (SKIP_SAVE_BACKUP or --skip).`);
    process.exit(0);
  }

  let existing;
  try {
    existing = findExistingConfig();
  } catch (err) {
    softFail("Invalid tts-assets config", err);
    return;
  }

  if (!existing) {
    softFail("No tts-assets.config.json found (run npm run tts-assets:configure)");
    return;
  }

  const { config } = existing;
  let saveFile;
  try {
    saveFile = resolveExistingSave(config.defaultSaveName, undefined, config);
  } catch (err) {
    softFail("Could not resolve live save", err);
    return;
  }

  let backupDir;
  try {
    backupDir = resolveBackupDir(config, saveFile);
    fs.mkdirSync(backupDir, { recursive: true });
  } catch (err) {
    softFail(`Could not create backup dir ${backupDir || "(unknown)"}`, err);
    return;
  }

  const stampPath = path.join(backupDir, STAMP_BASENAME);
  const nowSec = Math.floor(Date.now() / 1000);
  let lastSec;
  try {
    lastSec = readStamp(stampPath);
  } catch (err) {
    softFail("Could not read/create stamp file", err);
    return;
  }

  if (!opts.force && lastSec > 0 && nowSec - lastSec < DAY_MS / 1000) {
    const hoursLeft = ((DAY_MS / 1000 - (nowSec - lastSec)) / 3600).toFixed(1);
    console.error(
      `${LOG_PREFIX} Throttled (${hoursLeft}h until next). Last backup stamp=${lastSec}.`,
    );
    process.exit(0);
  }

  const dateStamp = formatDateStamp(new Date());
  const id = String(config.defaultSaveName).replace(/^TS_Save_/i, "").replace(/\.json$/i, "");
  const baseName = `TS_Save_${id}_${dateStamp}`;

  let destPath;
  try {
    const resolved = resolveDestination(backupDir, baseName);
    destPath = resolved.destPath;
  } catch (err) {
    if (err && err.code === "DAILY_BACKUP_HARD_COLLISION") {
      console.error(err.message);
      process.exit(1);
    }
    softFail("Destination collision handling failed", err);
    return;
  }

  try {
    fs.copyFileSync(saveFile, destPath);
    writeStamp(stampPath, nowSec);
  } catch (err) {
    softFail(`Copy failed (${saveFile} → ${destPath})`, err);
    return;
  }

  console.error(`${LOG_PREFIX} Copied ${saveFile} → ${destPath}`);
  process.exit(0);
}

main();
