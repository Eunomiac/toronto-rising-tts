"use strict";

/**
 * Shared survey + delete gate for the manual clean-up scripts (cloud:audit, cloud:consolidate,
 * cloud:dedupe, cloud:strays).
 *
 * Areas of the Cloud index:
 *   mirror    under cloudRoot and tracked in the ledger (a file in assets/)
 *   rootOnly  under cloudRoot, not in the ledger (Cloud-only: TTS pop-up uploads, older duplicates)
 *   saveOnly  under "<cloudRoot>/Save Only" (art authored in the save)
 *   legacy    under a LEGACY_ROOTS folder ("Toronto Rising")
 *   top       Cloud top level (no folder) — mixed origin; only touched when the current save uses it
 *   other     any other folder (other mods) — never touched
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { LEGACY_ROOTS, SAVE_ONLY_FOLDER, REPO_ROOT, assertTtsClosed } = require("./cloud_config.js");
const { readIndex, rowsFromIndex, ugcMatchKey } = require("./cloud_index.js");
const { loadLedger, localFolderFor } = require("./assets_tree.js");
const { buildInUseIndex, classifySaveUses } = require("./in_use.js");

const BACKUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MANIFEST_PATH = path.join(REPO_ROOT, "lib", "json", "cloud-assets.json");

/**
 * @param {ReturnType<import("./cloud_config.js").loadCloudConfig>} cfg
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {{ protectAllSaves?: boolean }} [opts]
 */
function survey(cfg, session, opts = {}) {
  const rows = rowsFromIndex(readIndex(session).doc);
  const ledger = loadLedger(cfg.assetsDir);
  const ledgerKeys = new Set(Object.values(ledger.files).map((e) => e.key));
  const inUse = buildInUseIndex(cfg, opts);
  const saveKinds = classifySaveUses(JSON.parse(fs.readFileSync(cfg.saveFile, "utf8")));

  /** @type {Map<string, string>} match key → job id */
  const claimedBy = new Map();
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    for (const [jobId, job] of Object.entries(manifest.jobs || {})) {
      for (const r of job.rows || []) claimedBy.set(ugcMatchKey(r.url), jobId);
    }
  }

  const legacy = LEGACY_ROOTS.map((l) => l.toLowerCase());
  /**
   * @param {{ key: string, folder: string }} row
   */
  const areaOf = (row) => {
    const local = localFolderFor(cfg.cloudRoot, row.folder);
    if (local !== null) {
      if (local.split("/")[0] === SAVE_ONLY_FOLDER) return "saveOnly";
      return ledgerKeys.has(row.key) ? "mirror" : "rootOnly";
    }
    const f = row.folder.toLowerCase();
    if (legacy.some((l) => f === l || f.startsWith(`${l}/`))) return "legacy";
    return f === "" ? "top" : "other";
  };

  const remote = new Set(session.listFiles().map((f) => f.name));
  const enriched = rows.map((row) => {
    const match = ugcMatchKey(row.url);
    const use = inUse.lookup(match);
    return {
      ...row,
      match,
      area: areaOf(row),
      job: claimedBy.get(match) || null,
      saveKind: (match && saveKinds.get(match)) || null,
      use,
      inUse: use.protectedBy.length > 0,
      remoteMissing: !remote.has(row.key),
    };
  });
  const indexed = new Set(rows.map((r) => r.key));
  const unindexedRemote = [...remote].filter((n) => !indexed.has(n) && n !== "CloudInfo.bson");
  return { rows: enriched, ledger, inUse, saveKinds, unindexedRemote };
}

/**
 * @param {ReturnType<typeof survey>["rows"][number]} r
 */
function describe(r) {
  const where = r.folder === "" ? r.name : `${r.folder}/${r.name}`;
  const why = r.inUse ? ` [in use: ${r.use.protectedBy.slice(0, 2).join("; ")}${r.use.protectedBy.length > 2 ? "; …" : ""}]` : "";
  return `${where}${why}`;
}

/**
 * Deletes need: TTS closed, a backup under 7 days old, and either typing DELETE
 * in an interactive terminal or passing `--yes` (for an author-requested cleanup run).
 * @param {ReturnType<import("./cloud_config.js").loadCloudConfig>} cfg
 * @param {string[]} lines what will be deleted
 * @returns {Promise<boolean>}
 */
async function confirmDeletes(cfg, lines) {
  assertTtsClosed("deleting from Steam Cloud");
  const marker = cfg.cloudBackupDir ? path.join(cfg.cloudBackupDir, "last-backup.json") : null;
  if (!marker || !fs.existsSync(marker)) throw new Error("No Cloud backup found. Run npm run cloud:backup first.");
  const last = JSON.parse(fs.readFileSync(marker, "utf8"));
  const age = Date.now() - new Date(last.date).getTime();
  if (!(age < BACKUP_MAX_AGE_MS)) {
    throw new Error(`The last Cloud backup is ${Math.floor(age / 86400000)} days old. Run npm run cloud:backup first.`);
  }
  for (const l of lines) console.log(`  delete ${l}`);
  if (process.argv.includes("--yes")) {
    console.log(`--yes: deleting ${lines.length} file(s) without typing DELETE.`);
    return true;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Deleting needs an interactive terminal (to type DELETE), or pass --yes.");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(`Type DELETE to remove these ${lines.length} file(s) from Steam Cloud: `, resolve));
  rl.close();
  return String(answer).trim() === "DELETE";
}

module.exports = {
  survey,
  describe,
  confirmDeletes,
};
