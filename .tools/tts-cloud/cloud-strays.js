#!/usr/bin/env node
"use strict";

/**
 * Strays: files nothing owns.
 *   Local strays    files in assets/ that match no job (listed per file inside job folders,
 *                   summarized per folder elsewhere)
 *   Cloud-only      files under the root that are not in assets/, and everything in the legacy
 *                   Toronto Rising folder
 * In-use strays are only flagged (run npm run cloud:consolidate, or give them a job).
 *
 * Usage: npm run cloud:strays [-- --verbose]
 *        npm run cloud:strays -- --delete   (unused Cloud-only strays + unused strays in job folders;
 *                                            backup + confirmation required)
 */

const fs = require("fs");
const path = require("path");

const { loadCloudConfig } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { deleteFiles } = require("./lib/cloud_ops.js");
const { isPushExcluded, loadLedger, saveLedger, scanAssets } = require("./lib/assets_tree.js");
const { survey, describe, confirmDeletes } = require("./lib/cleanup.js");
const { stripJsonc, validateConfig } = require("../cloud-asset-sync.js");
const { parseUserRegExp } = require("../custom-ui-assets/lib/custom-ui-assets-save.js");

const JOBS_CONFIG = path.resolve(__dirname, "..", "cloud-asset-sync.jsonc");

async function main() {
  const args = new Set(process.argv.slice(2));
  const cfg = loadCloudConfig();
  const jobs = validateConfig(JSON.parse(stripJsonc(fs.readFileSync(JOBS_CONFIG, "utf8"))));
  const session = openSteamSession();
  try {
    const s = survey(cfg, session);
    const byKey = new Map(s.rows.map((r) => [r.key, r]));
    const ledger = loadLedger(cfg.assetsDir);
    const local = scanAssets(cfg.assetsDir).filter((f) => !isPushExcluded(f.folder));

    const inJobFolder = [];
    const unowned = new Map();
    for (const f of local) {
      const scoped = jobs.filter((j) => f.folder === j.folder || (j.recurIntoSubfolders && f.folder.startsWith(`${j.folder}/`)));
      if (scoped.some((j) => parseUserRegExp(j.searchPattern).test(f.name))) continue;
      const entry = ledger.files[f.relPath];
      const row = entry ? byKey.get(entry.key) : null;
      const item = { file: f, row, inUse: row ? row.inUse : false };
      if (scoped.length > 0) inJobFolder.push(item);
      else {
        const top = f.folder.split("/").slice(0, 2).join("/") || "(assets/ top level)";
        if (!unowned.has(top)) unowned.set(top, []);
        unowned.get(top).push(item);
      }
    }

    console.log("Local strays in job folders (match no job pattern):");
    for (const it of inJobFolder) console.log(`  ${it.inUse ? "IN USE " : "unused "}assets/${it.file.relPath}`);
    if (inJobFolder.length === 0) console.log("  none");

    console.log("\nFolders in assets/ that no job covers:");
    for (const [folder, items] of [...unowned].sort((a, b) => a[0].localeCompare(b[0]))) {
      const used = items.filter((i) => i.inUse).length;
      console.log(`  ${folder}: ${items.length} file(s), ${used} in use`);
      if (args.has("--verbose")) for (const it of items) console.log(`    ${it.inUse ? "IN USE " : "unused "}${it.file.relPath}`);
    }

    const cloudOnly = s.rows.filter((r) => r.area === "rootOnly" || r.area === "legacy");
    console.log("\nCloud-only strays (under the root but not in assets/, or in the legacy folder):");
    for (const r of cloudOnly) console.log(`  ${r.inUse ? "IN USE " : "unused "}${describe(r)}`);
    if (cloudOnly.length === 0) console.log("  none");

    const delCloud = cloudOnly.filter((r) => !r.inUse);
    const delLocal = inJobFolder.filter((i) => !i.inUse && i.row);
    console.log(
      `\n${delCloud.length} unused Cloud-only stray(s) and ${delLocal.length} unused local stray(s) in job folders can be deleted; in-use strays need npm run cloud:consolidate or a job.`,
    );
    if (!args.has("--delete") || delCloud.length + delLocal.length === 0) return;

    const lines = [...delCloud.map(describe), ...delLocal.map((i) => `assets/${i.file.relPath} (and its Cloud copy)`)];
    if (!(await confirmDeletes(cfg, lines))) {
      console.log("Not deleted.");
      return;
    }
    deleteFiles(session, cfg, [...delCloud.map((r) => r.key), ...delLocal.map((i) => i.row.key)], { label: "strays" });
    for (const i of delLocal) {
      fs.unlinkSync(i.file.absPath);
      delete ledger.files[i.file.relPath];
    }
    saveLedger(cfg.assetsDir, ledger);
    console.log(`Deleted ${lines.length} file(s).`);
  } finally {
    session.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
