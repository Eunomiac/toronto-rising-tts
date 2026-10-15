#!/usr/bin/env node
"use strict";

/**
 * npm run cloud:backup
 *
 * Copies every Steam Cloud file for TTS plus the Cloud index into
 * "<backupDir>/Cloud Backup":
 *   files/<SHA1>_<Name>       content-addressed pool (kept forever; only new files copied)
 *   <timestamp>/CloudInfo.bson
 *   <timestamp>/files.csv     key, folder, name, url, sha1, size
 *   last-backup.json          read by delete-capable scripts (backup must be < 7 days old)
 */

const fs = require("fs");
const path = require("path");

const { loadCloudConfig } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { INDEX_FILE, parseIndex, rowsFromIndex } = require("./lib/cloud_index.js");

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const cfg = loadCloudConfig();
  if (!cfg.cloudBackupDir) throw new Error('Set "backupDir" in tts-assets.config.json.');
  const session = openSteamSession();
  try {
    console.error(`[cloud:backup] Steam user ${session.personaName}`);
    const poolDir = path.join(cfg.cloudBackupDir, "files");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").replace(/Z$/, "");
    const snapDir = path.join(cfg.cloudBackupDir, stamp);
    fs.mkdirSync(poolDir, { recursive: true });
    fs.mkdirSync(snapDir, { recursive: true });

    const indexBytes = session.readFile(INDEX_FILE);
    fs.writeFileSync(path.join(snapDir, INDEX_FILE), indexBytes);
    const rows = rowsFromIndex(parseIndex(indexBytes));

    const remote = session.listFiles().filter((f) => f.name !== INDEX_FILE);
    let copied = 0;
    let copiedBytes = 0;
    for (const file of remote) {
      const dest = path.join(poolDir, file.name);
      const contentAddressed = /^[0-9A-F]{40}_/i.test(file.name);
      if (contentAddressed && fs.existsSync(dest) && fs.statSync(dest).size === file.size) continue;
      const bytes = session.readFile(file.name);
      fs.writeFileSync(dest, bytes);
      copied += 1;
      copiedBytes += bytes.length;
      if (copied % 250 === 0) console.error(`[cloud:backup]   copied ${copied} file(s) …`);
    }

    const lines = ["key,folder,name,url,sha1,size"];
    for (const r of rows) {
      lines.push([r.key, r.folder, r.name, r.url, r.sha1, r.size].map(csvCell).join(","));
    }
    fs.writeFileSync(path.join(snapDir, "files.csv"), `${lines.join("\n")}\n`, "utf8");
    fs.writeFileSync(
      path.join(cfg.cloudBackupDir, "last-backup.json"),
      `${JSON.stringify({ date: new Date().toISOString(), snapshot: stamp, remoteFiles: remote.length, indexEntries: rows.length }, null, 2)}\n`,
      "utf8",
    );
    console.error(
      `[cloud:backup] PASS: ${remote.length} remote file(s), ${rows.length} index entr(y/ies); copied ${copied} new file(s) (${(copiedBytes / 1048576).toFixed(1)} MB) into ${poolDir}`,
    );
    console.error(`[cloud:backup] Index + CSV: ${snapDir}`);
  } finally {
    session.close();
  }
}

try {
  main();
  process.exit(0);
} catch (err) {
  console.error(`[cloud:backup] FAIL: ${err.message}`);
  process.exit(1);
}
