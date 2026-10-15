#!/usr/bin/env node
"use strict";

/**
 * Mirror Steam Cloud "<cloudRoot>/**" into assets/ and record the ledger.
 *
 * - Files missing locally are downloaded, unless the ledger says they were deleted
 *   locally (pending push). --restore-deleted downloads those too.
 * - A local file whose content differs from Cloud is left alone (assets/ wins; the
 *   next push uploads it and removes the old Cloud copy).
 * - assets/Save Only/ is a read-only mirror: overwritten from Cloud, extras removed.
 *
 * Usage: npm run cloud:pull [-- --dry-run] [--restore-deleted]
 */

const fs = require("fs");
const path = require("path");

const { loadCloudConfig, SAVE_ONLY_FOLDER } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { indexDateMs, readIndex, rowsFromIndex } = require("./lib/cloud_index.js");
const { localFolderFor, loadLedger, saveLedger, scanAssets } = require("./lib/assets_tree.js");

function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const restoreDeleted = args.has("--restore-deleted");
  const cfg = loadCloudConfig();
  const session = openSteamSession();
  try {
    const rows = rowsFromIndex(readIndex(session).doc);
    const ledger = loadLedger(cfg.assetsDir);
    if (ledger.cloudRoot && ledger.cloudRoot !== cfg.cloudRoot) {
      throw new Error(`assets/ was synced with Cloud root "${ledger.cloudRoot}", but config says "${cfg.cloudRoot}".`);
    }
    const local = new Map(scanAssets(cfg.assetsDir).map((f) => [f.relPath.toLowerCase(), f]));
    const seen = new Map();
    const counts = { downloaded: 0, inSync: 0, localDiffers: 0, keptDeleted: 0, duplicates: 0 };
    const saveOnlyCloud = new Set();
    const notes = [];

    const inRoot = rows
      .map((r) => ({ row: r, folder: localFolderFor(cfg.cloudRoot, r.folder) }))
      .filter((x) => x.folder !== null)
      .sort((a, b) => indexDateMs(b.row.date) - indexDateMs(a.row.date));

    for (const { row, folder } of inRoot) {
      const rel = folder === "" ? row.name : `${folder}/${row.name}`;
      const relKey = rel.toLowerCase();
      const isSaveOnly = folder.split("/")[0] === SAVE_ONLY_FOLDER;
      if (seen.has(relKey)) {
        counts.duplicates += 1;
        notes.push(`DUPLICATE NAME ${rel}: kept the newest Cloud copy locally (npm run cloud:dedupe resolves the older ones)`);
        continue;
      }
      seen.set(relKey, row);
      if (isSaveOnly) saveOnlyCloud.add(relKey);
      const have = local.get(relKey);
      if (have && have.key === row.key) {
        counts.inSync += 1;
        if (!isSaveOnly) ledger.files[rel] = { key: row.key, url: row.url, size: row.size };
        continue;
      }
      if (have && !isSaveOnly) {
        counts.localDiffers += 1;
        notes.push(`LOCAL DIFFERS ${rel}: keeping your local file; the next push uploads it`);
        if (!ledger.files[rel]) ledger.files[rel] = { key: row.key, url: row.url, size: row.size };
        continue;
      }
      if (!have && !isSaveOnly && ledger.files[rel] && !restoreDeleted) {
        counts.keptDeleted += 1;
        notes.push(`DELETED LOCALLY ${rel}: not restored; the next push deletes it from Cloud`);
        continue;
      }
      if (!session.fileExists(row.key)) {
        notes.push(`MISSING ${rel}: listed in the Cloud index but the file is gone from Steam (run npm run cloud:audit)`);
        continue;
      }
      counts.downloaded += 1;
      if (!dryRun) {
        const abs = path.join(cfg.assetsDir, ...rel.split("/"));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, session.readFile(row.key));
        if (!isSaveOnly) ledger.files[rel] = { key: row.key, url: row.url, size: row.size };
      }
      if (counts.downloaded % 200 === 0) console.log(`  downloaded ${counts.downloaded}…`);
    }

    let removedSaveOnly = 0;
    for (const [relKey, f] of local) {
      if (relKey.split("/")[0] !== SAVE_ONLY_FOLDER.toLowerCase() || saveOnlyCloud.has(relKey)) continue;
      removedSaveOnly += 1;
      if (!dryRun) fs.unlinkSync(f.absPath);
    }

    if (!dryRun) saveLedger(cfg.assetsDir, { cloudRoot: cfg.cloudRoot, files: ledger.files });
    for (const n of notes) console.log(n);
    console.log(
      `${dryRun ? "[dry run] " : ""}Pulled "${cfg.cloudRoot}" into ${cfg.assetsDir}: ${counts.downloaded} downloaded, ${counts.inSync} already in sync, ${counts.localDiffers} local edits kept, ${counts.keptDeleted} local deletes kept, ${counts.duplicates} duplicate names skipped, ${removedSaveOnly} stale Save Only files removed.`,
    );
  } finally {
    session.close();
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
