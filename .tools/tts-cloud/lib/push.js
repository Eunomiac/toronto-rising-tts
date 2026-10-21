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
const path = require("path");

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
const { isTtsRunning, PROTECTED_CLOUD_FOLDER, SAVE_ONLY_FOLDER } = require("./cloud_config.js");
const { buildInUseIndex } = require("./in_use.js");

const PROTECTED_INDEX = "index.json";

/**
 * @param {string} relPath
 */
function safeProtectedRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (normalized === "" || path.isAbsolute(normalized) || parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Unsafe protected Cloud relative path: ${JSON.stringify(relPath)}.`);
  }
  return parts.join("/");
}

/**
 * Keep inspection copies of Cloud files that deletion protection retained.
 * Only files recorded by the previous generated index are pruned.
 *
 * @param {{ assetsDir: string }} cfg
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {{ candidate: any, use: { protectedBy: string[], otherModSaves: string[], olderTorontoRisingSaves: string[] } }[]} entries
 */
function refreshProtectedCloudFiles(cfg, session, entries) {
  const root = path.resolve(cfg.assetsDir, PROTECTED_CLOUD_FOLDER);
  const indexPath = path.join(root, PROTECTED_INDEX);
  let previous = { files: [] };
  try {
    previous = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    previous = { files: [] };
  }

  const records = [];
  const wanted = new Set();
  let written = 0;
  let unchanged = 0;
  for (const { candidate, use } of entries) {
    const rel = safeProtectedRelPath(candidate.relPath);
    const key = rel.toLowerCase();
    if (wanted.has(key)) throw new Error(`Duplicate protected Cloud mirror path: ${rel}.`);
    wanted.add(key);
    if (!session.fileExists(candidate.row.key)) {
      throw new Error(`Protected Cloud file is indexed but missing from Steam: ${candidate.row.key}.`);
    }
    const bytes = session.readFile(candidate.row.key);
    const abs = path.resolve(root, ...rel.split("/"));
    if (!abs.startsWith(`${root}${path.sep}`)) throw new Error(`Protected Cloud mirror escaped its root: ${rel}.`);
    let same = false;
    try {
      same = fs.readFileSync(abs).equals(bytes);
    } catch {
      same = false;
    }
    if (same) {
      unchanged += 1;
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, bytes);
      written += 1;
    }
    records.push({
      path: rel,
      cloudPath: `${candidate.row.folder}/${candidate.row.name}`,
      url: candidate.row.url,
      key: candidate.row.key,
      size: candidate.row.size,
      reason: candidate.reason,
      protectedBy: [...use.protectedBy],
      otherModSaves: [...use.otherModSaves],
      olderTorontoRisingSaves: [...use.olderTorontoRisingSaves],
    });
  }
  records.sort((a, b) => a.path.localeCompare(b.path));

  let removed = 0;
  for (const old of Array.isArray(previous.files) ? previous.files : []) {
    let rel;
    try {
      rel = safeProtectedRelPath(old.path);
    } catch {
      continue;
    }
    if (wanted.has(rel.toLowerCase())) continue;
    const abs = path.resolve(root, ...rel.split("/"));
    if (abs.startsWith(`${root}${path.sep}`) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      fs.unlinkSync(abs);
      removed += 1;
    }
  }

  const removeEmptyDirs = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) removeEmptyDirs(path.join(dir, ent.name));
    }
    if (dir !== root && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  };
  fs.mkdirSync(root, { recursive: true });
  removeEmptyDirs(root);
  const indexText = `${JSON.stringify({
    purpose: "Read-only inspection copies of retired Cloud files that the current build cannot delete because something still references them.",
    files: records,
  }, null, 2)}\n`;
  let oldIndex = "";
  try {
    oldIndex = fs.readFileSync(indexPath, "utf8");
  } catch {
    oldIndex = "";
  }
  if (oldIndex !== indexText) fs.writeFileSync(indexPath, indexText, "utf8");
  return { count: records.length, written, unchanged, removed, indexPath };
}

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
  // Persist reconciliation before any new Steam writes. Uploads are indexed in
  // batches, so a quota or API failure can leave successfully uploaded files in
  // Cloud even though this function never reaches its final ledger write. A
  // retry can already see those files through plan.inSync; recording them here
  // keeps cleanup/audit tools from misclassifying them as Cloud-only strays.
  saveLedger(cfg.assetsDir, { cloudRoot: cfg.cloudRoot, files });
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
    const needed = plan.uploads.reduce((sum, f) => sum + f.size, 0);
    const { availableBytes } = session.quota();
    if (needed > availableBytes) {
      throw new Error(`Upload needs ${Math.ceil(needed / 1048576)} MB but Steam Cloud has ${Math.floor(availableBytes / 1048576)} MB free.`);
    }
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
  const inUse = buildInUseIndex(cfg, { protectAllSaves: opts.protectAllSaves });
  const deleted = [];
  const kept = [];
  const protectedEntries = [];
  /** @type {Map<string, number>} */
  const olderSaveUse = new Map();
  for (const c of plan.deleteCandidates) {
    const use = inUse.lookup(ugcMatchKey(c.row.url));
    const label = `${c.row.folder}/${c.row.name}`;
    if (use.otherModSaves.length > 0) {
      opts.warn(`KEPT ${label} (${c.reason}): used by a save other than Toronto Rising: ${use.otherModSaves.join(", ")}`);
      kept.push(c);
      protectedEntries.push({ candidate: c, use });
    } else if (use.protectedBy.length > 0) {
      opts.warn(`KEPT ${label} (${c.reason}): still referenced by ${use.protectedBy.join(", ")}`);
      kept.push(c);
      protectedEntries.push({ candidate: c, use });
    } else {
      for (const s of use.olderTorontoRisingSaves) olderSaveUse.set(s, (olderSaveUse.get(s) || 0) + 1);
      deleted.push(c);
    }
  }
  const protectedMirror = refreshProtectedCloudFiles(cfg, session, protectedEntries);
  opts.log(
    `Protected Cloud Files: ${protectedMirror.count} mirrored (${protectedMirror.written} updated, ${protectedMirror.unchanged} unchanged, ${protectedMirror.removed} removed) → assets/${PROTECTED_CLOUD_FOLDER}/${PROTECTED_INDEX}`,
  );
  if (isTtsRunning()) {
    opts.log(`SKIP Cloud deletes: Tabletop Simulator is open (${plan.deleteCandidates.length} waiting).`);
    return { deleted: [], kept };
  }
  if (olderSaveUse.size > 0) {
    const list = [...olderSaveUse].map(([s, n]) => `${s} (${n})`).join(", ");
    opts.warn(`Deleting files still used by older Toronto Rising saves (they will show missing art there): ${list}`);
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

/**
 * Read-only copy of Cloud "<cloudRoot>/Save Only/**" in assets/Save Only/.
 * @param {ReturnType<import("./cloud_config.js").loadCloudConfig>} cfg
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {ReturnType<typeof rowsFromIndex>} rows
 * @param {{ dryRun?: boolean }} [opts]
 */
function refreshSaveOnly(cfg, session, rows, opts = {}) {
  const prefix = `${SAVE_ONLY_FOLDER}/`.toLowerCase();
  const local = new Map(
    scanAssets(cfg.assetsDir)
      .filter((f) => f.relPath.toLowerCase().startsWith(prefix))
      .map((f) => [f.relPath.toLowerCase(), f]),
  );
  const wanted = new Set();
  let written = 0;
  let removed = 0;
  for (const row of rows) {
    const folder = localFolderFor(cfg.cloudRoot, row.folder);
    if (folder === null || folder.split("/")[0] !== SAVE_ONLY_FOLDER) continue;
    const rel = `${folder}/${row.name}`;
    const relKey = rel.toLowerCase();
    if (wanted.has(relKey)) continue;
    wanted.add(relKey);
    const have = local.get(relKey);
    if (have && have.key === row.key) continue;
    if (!session.fileExists(row.key)) continue;
    written += 1;
    if (!opts.dryRun) {
      const abs = path.join(cfg.assetsDir, ...rel.split("/"));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, session.readFile(row.key));
    }
  }
  for (const [relKey, f] of local) {
    if (wanted.has(relKey)) continue;
    removed += 1;
    if (!opts.dryRun) fs.unlinkSync(f.absPath);
  }
  return { written, removed };
}

module.exports = {
  refreshProtectedCloudFiles,
  safeProtectedRelPath,
  refreshSaveOnly,
  planPush,
  applyPush,
  applyDeletes,
};
