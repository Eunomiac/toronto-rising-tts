#!/usr/bin/env node
"use strict";

/**
 * Gather art the current save uses but no job owns into "<cloudRoot>/Save Only/<kind>/", where kind
 * is Objects, Decals, Object UI, or Global UI. Moves are index-only: links do not change.
 *
 * Only files outside assets/ are moved (Cloud top level, the legacy Toronto Rising folder, and
 * Cloud-only files under the root); files you keep in assets/ are left to their jobs.
 * The legacy folder keeps its sub-path: Toronto Rising/NPCs/x.png → Save Only/Objects/Toronto Rising/NPCs/x.png.
 *
 * `npm run build:full` runs this with `--apply` after `cloud-asset-sync`.
 *
 * Usage: npm run cloud:consolidate            (preview)
 *        npm run cloud:consolidate -- --apply (TTS closed; skipped with a warning while TTS is open)
 */

const { loadCloudConfig, SAVE_ONLY_FOLDER, isTtsRunning } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { normalizeCloudPath, readIndex, rowsFromIndex } = require("./lib/cloud_index.js");
const { moveFiles } = require("./lib/cloud_ops.js");
const { localFolderFor } = require("./lib/assets_tree.js");
const { refreshSaveOnly } = require("./lib/push.js");
const { survey, describe } = require("./lib/cleanup.js");

function main() {
  const apply = process.argv.includes("--apply");
  const cfg = loadCloudConfig();
  const session = openSteamSession();
  try {
    const s = survey(cfg, session);
    const root = normalizeCloudPath(cfg.cloudRoot);
    const mirrorNames = new Set(s.rows.filter((r) => r.area === "mirror").map((r) => `${r.folder}/${r.name}`.toLowerCase()));

    const moves = [];
    const repoOnly = [];
    for (const r of s.rows) {
      if (!["top", "legacy", "rootOnly"].includes(r.area) || r.job) continue;
      if (r.area === "rootOnly" && mirrorNames.has(`${r.folder}/${r.name}`.toLowerCase())) continue;
      if (!r.saveKind) {
        if (r.use.protectedBy.some((p) => p.startsWith("repo"))) repoOnly.push(r);
        continue;
      }
      const sub = r.area === "legacy" ? r.folder : r.area === "rootOnly" ? localFolderFor(cfg.cloudRoot, r.folder) : "";
      const folder = [root, SAVE_ONLY_FOLDER, r.saveKind, sub].filter((p) => p !== "").join("/");
      if (folder !== r.folder) moves.push({ row: r, folder });
    }

    for (const m of moves) console.log(`move ${describe(m.row)} → ${m.folder}`);
    if (repoOnly.length > 0) {
      console.log(`\n${repoOnly.length} file(s) are used only by repo code and owned by no job (they need a job folder in assets/):`);
      for (const r of repoOnly) console.log(`  ${describe(r)}`);
    }
    console.log(`\n${moves.length} file(s) to move into ${SAVE_ONLY_FOLDER}/<kind>.`);
    if (!apply || moves.length === 0) {
      if (moves.length > 0 && !apply) {
        console.log("Preview only. Run npm run cloud:consolidate -- --apply with TTS closed (or npm run build:full) to move them.");
      }
      return;
    }
    if (isTtsRunning()) {
      console.warn(
        `[cloud:consolidate] SKIP: Tabletop Simulator is open (${moves.length} file(s) waiting). Close TTS and run npm run cloud:consolidate -- --apply, or npm run build:full.`,
      );
      return;
    }
    moveFiles(session, cfg, moves.map((m) => ({ key: m.row.key, folder: m.folder })), { label: "consolidate" });
    const so = refreshSaveOnly(cfg, session, rowsFromIndex(readIndex(session).doc));
    console.log(`Moved ${moves.length} file(s). assets/${SAVE_ONLY_FOLDER}: ${so.written} updated, ${so.removed} removed.`);
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
