#!/usr/bin/env node
"use strict";

/**
 * Read-only report on Steam Cloud: files and size per area and folder, how many are in use or
 * owned by a job, index/remote mismatches, and save links that point outside your Cloud.
 *
 * Usage: npm run cloud:audit [-- --protect-all-saves]
 */

const { loadCloudConfig } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { survey } = require("./lib/cleanup.js");

const FILE_LIMIT = 10000;
const AREA_LABELS = {
  mirror: "Mirrored in assets/",
  rootOnly: "Under the root, not in assets/",
  saveOnly: "Save Only",
  legacy: "Legacy Toronto Rising folder",
  top: "Cloud top level (no folder)",
  other: "Other folders (other mods)",
};

function mb(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function main() {
  const cfg = loadCloudConfig();
  const session = openSteamSession();
  try {
    const s = survey(cfg, session, { protectAllSaves: process.argv.includes("--protect-all-saves") });
    console.log(`Steam Cloud audit (root "${cfg.cloudRoot}", save ${cfg.saveFile})\n`);

    console.log("Area                              Files      Size   In use  Job-owned");
    for (const [area, label] of Object.entries(AREA_LABELS)) {
      const rows = s.rows.filter((r) => r.area === area);
      const size = rows.reduce((a, r) => a + r.size, 0);
      console.log(
        `${label.padEnd(32)} ${String(rows.length).padStart(6)} ${mb(size).padStart(10)} ${String(rows.filter((r) => r.inUse).length).padStart(8)} ${String(rows.filter((r) => r.job).length).padStart(10)}`,
      );
    }

    console.log("\nFolders under the root and the legacy folder:");
    const byFolder = new Map();
    for (const r of s.rows.filter((x) => x.area !== "other" && x.area !== "top")) {
      const key = r.folder.split("/").slice(0, 3).join("/");
      const cur = byFolder.get(key) || { files: 0, size: 0, inUse: 0, job: 0 };
      cur.files += 1;
      cur.size += r.size;
      if (r.inUse) cur.inUse += 1;
      if (r.job) cur.job += 1;
      byFolder.set(key, cur);
    }
    for (const [folder, c] of [...byFolder].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${folder}: ${c.files} files, ${mb(c.size)}, ${c.inUse} in use, ${c.job} job-owned`);
    }

    const missing = s.rows.filter((r) => r.remoteMissing);
    console.log(`\nIndex entries whose file is gone from Steam: ${missing.length}`);
    for (const r of missing.slice(0, 20)) console.log(`  ${r.folder}/${r.name}`);
    console.log(`Steam files not in the index (invisible in Cloud Manager): ${s.unindexedRemote.length}`);
    for (const n of s.unindexedRemote.slice(0, 20)) console.log(`  ${n}`);

    const current = s.inUse.saves.find((x) => x.isCurrent);
    if (current) {
      const known = new Set(s.rows.map((r) => r.match));
      const outside = [...current.keys].filter((k) => !known.has(k));
      console.log(`Links in the current save that are not in your Cloud (other uploaders, or deleted): ${outside.length}`);
    } else {
      console.log("Current save not found in savesDir.");
    }
    console.log(`\nTotal: ${s.rows.length} indexed files (soft limit ${FILE_LIMIT}).`);
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
