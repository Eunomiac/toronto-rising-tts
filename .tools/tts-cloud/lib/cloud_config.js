"use strict";

/**
 * Shared settings for Steam Cloud tooling, read from tts-assets.config.json.
 *
 *   cloudRoot   Cloud Manager folder that assets/ mirrors (required)
 *   assetsDir   local source-of-truth folder (default: <repo>/assets)
 *   backupDir   save backups; Cloud backups live in "<backupDir>/Cloud Backup" and
 *               index snapshots in "<backupDir>/Cloud Index"
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { findExistingConfig } = require("../../custom-ui-assets/lib/tts-assets-config.js");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const TTS_APP_ID = 286160;
const SAVE_ONLY_FOLDER = "Save Only";
const LEGACY_ROOTS = ["Toronto Rising"];

/**
 * @returns {{
 *   configPath: string,
 *   cloudRoot: string,
 *   assetsDir: string,
 *   savesDir: string,
 *   defaultSaveName: string,
 *   saveFile: string,
 *   backupDir: string | null,
 *   cloudBackupDir: string | null,
 *   indexSnapshotDir: string | null,
 * }}
 */
function loadCloudConfig() {
  const hit = findExistingConfig();
  if (!hit) {
    throw new Error("No tts-assets.config.json found. Run npm run tts-assets:configure.");
  }
  const raw = JSON.parse(fs.readFileSync(hit.path, "utf8"));
  const cfg = hit.config;
  const cloudRoot = typeof cfg.cloudRoot === "string" ? cfg.cloudRoot.trim() : "";
  if (cloudRoot === "") {
    throw new Error(`"cloudRoot" is missing from ${hit.path}.`);
  }
  const assetsDir =
    typeof raw.assetsDir === "string" && raw.assetsDir.trim() !== ""
      ? path.resolve(raw.assetsDir.trim())
      : path.join(REPO_ROOT, "assets");
  const backupDir = cfg.backupDir || null;
  return {
    configPath: hit.path,
    cloudRoot,
    assetsDir,
    savesDir: cfg.savesDir,
    defaultSaveName: cfg.defaultSaveName,
    saveFile: path.join(cfg.savesDir, `TS_Save_${cfg.defaultSaveName}.json`),
    backupDir,
    cloudBackupDir: backupDir ? path.join(backupDir, "Cloud Backup") : null,
    indexSnapshotDir: backupDir ? path.join(backupDir, "Cloud Index") : null,
  };
}

/**
 * @returns {boolean}
 */
function isTtsRunning() {
  const out = execFileSync(
    "tasklist",
    ["/FI", "IMAGENAME eq Tabletop Simulator.exe", "/FO", "CSV", "/NH"],
    { encoding: "utf8" },
  );
  return /Tabletop Simulator\.exe/i.test(out);
}

function assertTtsClosed(action) {
  if (isTtsRunning()) {
    throw new Error(
      `Tabletop Simulator is open. Close it before ${action}: TTS keeps its own copy of the Cloud index and would overwrite these changes.`,
    );
  }
}

module.exports = {
  REPO_ROOT,
  TTS_APP_ID,
  SAVE_ONLY_FOLDER,
  LEGACY_ROOTS,
  loadCloudConfig,
  isTtsRunning,
  assertTtsClosed,
};
