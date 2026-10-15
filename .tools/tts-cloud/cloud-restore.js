#!/usr/bin/env node
"use strict";

/**
 * Restore from cloud:backup output (TTS must be closed).
 *
 *   npm run cloud:restore-index -- "<path to CloudInfo.*.bson snapshot or backup CloudInfo.bson>"
 *       Writes that index back verbatim (the current index is snapshotted first).
 *
 *   npm run cloud:restore-files -- --backup <timestamp folder> (--key <key> … | --folder <Cloud path>)
 *       Re-uploads files from the backup pool into their original folder and name.
 *       A re-uploaded file gets a NEW URL; run the Full build afterwards so job
 *       outputs pick it up. Save-only links to the old URL must be re-pointed by hand.
 */

const fs = require("fs");
const path = require("path");

const { loadCloudConfig, assertTtsClosed } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { INDEX_FILE, parseIndex, writeSnapshot, normalizeCloudPath } = require("./lib/cloud_index.js");
const { uploadFiles } = require("./lib/cloud_ops.js");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function restoreIndex(cfg, file) {
  const bytes = fs.readFileSync(path.resolve(file));
  parseIndex(bytes);
  assertTtsClosed("restoring the Cloud index");
  const session = openSteamSession();
  try {
    const current = session.readFile(INDEX_FILE);
    const snap = writeSnapshot(cfg.indexSnapshotDir, current, "before-restore");
    session.writeFile(INDEX_FILE, bytes);
    if (!session.readFile(INDEX_FILE).equals(bytes)) throw new Error("Read-back after restore does not match.");
    console.error(`[cloud:restore-index] PASS: restored ${file} (previous index saved to ${snap})`);
  } finally {
    session.close();
  }
}

async function restoreFiles(cfg, backup, keys, folder) {
  const snapDir = path.isAbsolute(backup) ? backup : path.join(cfg.cloudBackupDir, backup);
  const rows = parseCsv(fs.readFileSync(path.join(snapDir, "files.csv"), "utf8"));
  const wantFolder = folder ? normalizeCloudPath(folder).toLowerCase() : null;
  const picked = rows.filter(
    (r) => keys.includes(r.key) || (wantFolder !== null && r.folder.toLowerCase() === wantFolder),
  );
  if (picked.length === 0) throw new Error("No backup rows matched --key / --folder.");
  const poolDir = path.join(cfg.cloudBackupDir, "files");
  const items = picked.map((r) => ({
    bytes: fs.readFileSync(path.join(poolDir, r.key)),
    folder: r.folder,
    name: r.name,
  }));
  const session = openSteamSession();
  try {
    const results = await uploadFiles(session, cfg, items, {
      label: "restore-files",
      log: (m) => console.error(`[cloud:restore-files]   ${m}`),
    });
    for (const r of results) console.error(`[cloud:restore-files]   ${r.folder}/${r.name} → ${r.url}`);
    console.error(`[cloud:restore-files] PASS: ${results.length} file(s). Run the Full build so references update.`);
  } finally {
    session.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const cfg = loadCloudConfig();
  if (argv[0] === "--index") {
    if (!argv[1]) throw new Error("Usage: cloud:restore-index -- <snapshot file>");
    restoreIndex(cfg, argv[1]);
    return;
  }
  let backup = null;
  let folder = null;
  const keys = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--backup") backup = argv[++i];
    else if (argv[i] === "--key") keys.push(argv[++i]);
    else if (argv[i] === "--folder") folder = argv[++i];
    else throw new Error(`Unexpected argument: ${argv[i]}`);
  }
  if (!backup || (keys.length === 0 && !folder)) {
    throw new Error("Usage: cloud:restore-files -- --backup <timestamp> (--key <key> … | --folder <Cloud path>)");
  }
  await restoreFiles(cfg, backup, keys, folder);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[cloud:restore] FAIL: ${err.message}`);
    process.exit(1);
  });
