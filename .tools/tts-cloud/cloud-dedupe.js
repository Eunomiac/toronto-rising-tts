#!/usr/bin/env node
"use strict";

/**
 * Find duplicate Cloud files in the Toronto Rising area (root, Save Only, legacy folder, top level):
 *   - same name in the same folder (different content)
 *   - same content under another name or folder
 * Keeps, in order: the copy mirrored in assets/, a job-owned copy, a copy in use, the newest.
 * Unused extras can be deleted; extras still in use are only reported (their references must move first).
 *
 * Usage: npm run cloud:dedupe              (report)
 *        npm run cloud:dedupe -- --delete  (delete unused extras; backup + confirmation required)
 */

const { loadCloudConfig } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { indexDateMs } = require("./lib/cloud_index.js");
const { deleteFiles } = require("./lib/cloud_ops.js");
const { survey, describe, confirmDeletes } = require("./lib/cleanup.js");

const AREAS = new Set(["mirror", "rootOnly", "saveOnly", "legacy", "top"]);

/**
 * @param {any} r
 */
function rank(r) {
  return [r.area === "mirror" ? 1 : 0, r.job ? 1 : 0, r.inUse ? 1 : 0, indexDateMs(r.date)];
}

function compareKeep(a, b) {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < ra.length; i += 1) if (ra[i] !== rb[i]) return rb[i] - ra[i];
  return 0;
}

async function main() {
  const doDelete = process.argv.includes("--delete");
  const cfg = loadCloudConfig();
  const session = openSteamSession();
  try {
    const s = survey(cfg, session);
    const rows = s.rows.filter((r) => AREAS.has(r.area) && (r.area !== "top" || r.inUse || r.saveKind));
    const groups = [];
    const grouped = new Set();
    const collect = (keyFn, label) => {
      const by = new Map();
      for (const r of rows) {
        const k = keyFn(r);
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(r);
      }
      for (const list of by.values()) {
        if (list.length < 2) continue;
        list.sort(compareKeep);
        const extras = list.slice(1).filter((r) => !grouped.has(r.key));
        if (extras.length === 0) continue;
        groups.push({ label, keep: list[0], extras });
        for (const r of list) grouped.add(r.key);
      }
    };
    collect((r) => `${r.folder}/${r.name}`.toLowerCase(), "same name, same folder");
    collect((r) => r.sha1, "same content");

    const deletable = [];
    let blocked = 0;
    for (const g of groups) {
      if (g.extras.length === 0) continue;
      console.log(`\n${g.label}: keep ${describe(g.keep)}`);
      for (const r of g.extras) {
        if (r.area === "mirror") {
          console.log(`  also in assets/: ${describe(r)} — delete one of the local copies`);
        } else if (r.inUse) {
          blocked += 1;
          console.log(`  IN USE ${describe(r)} — repoint its references to the kept copy first`);
        } else {
          deletable.push(r);
          console.log(`  unused ${describe(r)}`);
        }
      }
    }
    console.log(`\n${deletable.length} unused duplicate(s) can be deleted; ${blocked} duplicate(s) are still in use.`);
    if (!doDelete || deletable.length === 0) return;
    if (!(await confirmDeletes(cfg, deletable.map(describe)))) {
      console.log("Not deleted.");
      return;
    }
    deleteFiles(session, cfg, deletable.map((r) => r.key), { label: "dedupe" });
    console.log(`Deleted ${deletable.length} file(s).`);
  } finally {
    session.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
