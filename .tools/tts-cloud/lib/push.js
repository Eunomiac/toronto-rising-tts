"use strict";

/**
 * assets/ → Steam Cloud push (shared by npm run cloud:push and cloud-asset-sync).
 *
 * planPush: compare local files, ledger, and Cloud index (no writes).
 * applyPush: uploads + index-only moves; updates the ledger.
 * applyDeletes: delete Cloud copies of files removed locally, after outputs have
 *   dropped their references. Kept (with a warning) while a non-Toronto Rising save,
 *   the current save, or repo code still uses them.
 */

const fs = require("fs");

const {
  cloudFolderFor,
  isPushExcluded,
  loadLedger,
  localFolderFor,
  saveLedger,
  scanAssets,
} = require("./assets_tree.js");
const { readIndex, rowsFromIndex, ugcMatchKey } = require("./cloud_index.js");
const { uploadFiles, moveFiles, deleteFiles } = require("./cloud_ops.js");
const { isTtsRunning, SAVE_ONLY_FOLDER } = require("./cloud_config.js");
const { buildInUseIndex } = require("./in_use.js");

/**
 * @param {ReturnType<import("./cloud_config.js").loadCloudConfig>} cfg
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 */
function planPush(cfg, session) {
  const rows = rowsFromIndex(readIndex(session).doc);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const ledger = loadLedger(cfg.assetsDir);
  const local = scanAssets(cfg.assetsDir).filter((f) => !isPushExcluded(f.folder));
  const localRel = new Set(local.map((f) => f.relPath));

  /** @type {Map<string, import("./assets_tree.js").LocalFile>} */
  const firstByKey = new Map();
  const localDuplicates = [];
  for (const f of local) {
    const prev = firstByKey.get(f.key);
    if (prev) localDuplicates.push({ file: f.relPath, sameAs: prev.relPath });
    else firstByKey.set(f.key, f);
  }

  const inSync = [];
  const uploads = [];
  const moves = [];
  for (const f of firstByKey.values()) {
    const cloudFolder = cloudFolderFor(cfg.cloudRoot, f.folder);
    const row = byKey.get(f.key);
    if (!row) uploads.push(f);
    else if (row.folder !== cloudFolder) moves.push({ file: f, row, folder: cloudFolder });
    else inSync.push({ file: f, row });
  }

  const liveKeys = new Set(firstByKey.keys());
  const deleteCandidates = [];
  const staleLedgerPaths = [];
  const candidateKeys = new Set();
  for (const [rel, entry] of Object.entries(ledger.files)) {
    if (liveKeys.has(entry.key)) {
      if (!localRel.has(rel)) staleLedgerPaths.push(rel);
      continue;
    }
    const row = byKey.get(entry.key);
    if (!row || candidateKeys.has(row.key)) continue;
    candidateKeys.add(row.key);
    deleteCandidates.push({ relPath: rel, row, reason: localRel.has(rel) ? "replaced locally" : "deleted locally" });
  }

  const ledgerKeys = new Set(Object.values(ledger.files).map((e) => e.key));
  const cloudOnly = rows.filter((r) => {
    const folder = localFolderFor(cfg.cloudRoot, r.folder);
    if (folder === null || isPushExcluded(folder) || folder.split("/")[0] === SAVE_ONLY_FOLDER) return false;
    return !liveKeys.has(r.key) && !ledgerKeys.has(r.key);
  });

  return { rows, ledger, local, inSync, uploads, moves, deleteCandidates, staleLedgerPaths, cloudOnly, localDuplicates };
}

/**
 * @param {ReturnType<import("./cloud_config.js").loadCloudConfig>} cfg
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {ReturnType<typeof planPush>} plan
 * @param {{ log: (msg: string) => void, label: string }} opts
 * @returns {Promise<{ skipped: boolean }>}
 */
async function applyPush(cfg, session, plan, opts) {
  const files = { ...plan.ledger.files };
  for (const rel of plan.staleLedgerPaths) delete files[rel];
  for (const { file, row } of plan.inSync) files[file.relPath] = { key: row.key, url: row.url, size: row.size };
  const writes = plan.uploads.length + plan.moves.length;
  if (writes > 0 && isTtsRunning()) {
    opts.log(
      `SKIP push: Tabletop Simulator is open. ${plan.uploads.length} file(s) waiting to upload, ${plan.moves.length} to move. Close TTS and run npm run cloud:push.`,
    );
    saveLedger(cfg.assetsDir, { cloudRoot: cfg.cloudRoot, files });
    return { skipped: true };
  }
  if (plan.moves.length > 0) {
    moveFiles(session, cfg, plan.moves.map((m) => ({ key: m.row.key, folder: m.folder })), { label: `${opts.label}-move` });
    for (const m of plan.moves) {
      files[m.file.relPath] = { key: m.row.key, url: m.row.url, size: m.row.size };
      opts.log(`moved ${m.row.folder}/${m.row.name} → ${m.folder}`);
    }
  }
  if (plan.uploads.length > 0) {
    const items = plan.uploads.map((f) => ({
      bytes: fs.readFileSync(f.absPath),
      folder: cloudFolderFor(cfg.cloudRoot, f.folder),
      name: f.name,
    }));
    const results = await uploadFiles(session, cfg, items, { label: `${opts.label}-upload`, log: opts.log });
    plan.uploads.forEach((f, i) => {
      files[f.relPath] = { key: results[i].key, url: results[i].url, size: f.size };
    });
  }
  saveLedger(cfg.assetsDir, { cloudRoot: cfg.cloudRoot, files });
  return { skipped: false };
}

/**
 * @param {ReturnType<import("./cloud_config.js").loadCloudConfig>} cfg
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {ReturnType<typeof planPush>} plan
 * @param {{ log: (msg: string) => void, warn: (msg: string) => void, label: string, protectAllSaves?: boolean }} opts
 */
function applyDeletes(cfg, session, plan, opts) {
  if (plan.deleteCandidates.length === 0) return { deleted: [], kept: [] };
  if (isTtsRunning()) {
    opts.log(`SKIP Cloud deletes: Tabletop Simulator is open (${plan.deleteCandidates.length} waiting).`);
    return { deleted: [], kept: [] };
  }
  const inUse = buildInUseIndex(cfg, { protectAllSaves: opts.protectAllSaves });
  const deleted = [];
  const kept = [];
  for (const c of plan.deleteCandidates) {
    const use = inUse.lookup(ugcMatchKey(c.row.url));
    const label = `${c.row.folder}/${c.row.name}`;
    if (use.otherModSaves.length > 0) {
      opts.warn(`KEPT ${label} (${c.reason}): used by a save other than Toronto Rising: ${use.otherModSaves.join(", ")}`);
      kept.push(c);
    } else if (use.protectedBy.length > 0) {
      opts.warn(`KEPT ${label} (${c.reason}): still referenced by ${use.protectedBy.join(", ")}`);
      kept.push(c);
    } else {
      if (use.olderTorontoRisingSaves.length > 0) {
        opts.warn(`${label} is still used by older Toronto Rising save(s): ${use.olderTorontoRisingSaves.join(", ")}`);
      }
      deleted.push(c);
    }
  }
  if (deleted.length > 0) {
    deleteFiles(session, cfg, deleted.map((c) => c.row.key), { label: `${opts.label}-delete` });
    const ledger = loadLedger(cfg.assetsDir);
    const gone = new Set(deleted.map((c) => c.row.key));
    for (const [rel, entry] of Object.entries(ledger.files)) {
      if (gone.has(entry.key)) delete ledger.files[rel];
    }
    saveLedger(cfg.assetsDir, ledger);
    for (const c of deleted) opts.log(`deleted from Cloud: ${c.row.folder}/${c.row.name} (${c.reason})`);
  }
  return { deleted, kept };
}

module.exports = {
  planPush,
  applyPush,
  applyDeletes,
};
