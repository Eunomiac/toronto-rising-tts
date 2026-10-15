"use strict";

/**
 * Tabletop Simulator's Cloud Manager index (CloudInfo.bson in Steam Remote Storage).
 *
 * Layout (probed 2026-10-15): one entry per file keyed "<SHA1 of contents>_<Name>",
 * fields URL, Folder (backslash-separated, "" at the root), Name, Size (Int32),
 * Date ("MM/DD/YYYY HH:mm:ss"). Remote file name == entry key.
 * URL = https://steamusercontent-a.akamaihd.net/ugc/<handle>/<SHA1>/
 *
 * Every write goes through editIndex: snapshot → write → re-read → verify every
 * untouched entry is byte-identical → otherwise restore the snapshot and throw.
 */

const fs = require("fs");
const path = require("path");

const { requireLocal } = require("./steam_session.js");
const { assertTtsClosed } = require("./cloud_config.js");

const INDEX_FILE = "CloudInfo.bson";
const SNAPSHOT_KEEP = 30;
const URL_PREFIX = "https://steamusercontent-a.akamaihd.net/ugc/";

function bson() {
  return requireLocal("bson");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function str(value) {
  return value == null ? "" : String(value);
}

/**
 * Cloud path ("A/B") from any separator style.
 * @param {string} folder
 */
function normalizeCloudPath(folder) {
  return str(folder)
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

/**
 * @param {string} cloudPath
 */
function toIndexFolder(cloudPath) {
  return normalizeCloudPath(cloudPath).replace(/\//g, "\\");
}

/**
 * @param {Date} d
 */
function formatIndexDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * @param {string} handle
 * @param {string} sha1
 */
function ugcUrl(handle, sha1) {
  return `${URL_PREFIX}${handle}/${sha1.toUpperCase()}/`;
}

/**
 * "ugc/<handle>/<SHA1>" match key, so old and new Steam hostnames compare equal.
 * @param {string} url
 * @returns {string | null}
 */
function ugcMatchKey(url) {
  const m = /ugc\/(\d+)\/([0-9A-Fa-f]{40})/.exec(str(url));
  return m ? `${m[1]}/${m[2].toUpperCase()}` : null;
}

/**
 * @param {Buffer} bytes
 */
function parseIndex(bytes) {
  return bson().BSON.deserialize(bytes, { promoteValues: false });
}

/**
 * @param {Record<string, any>} doc
 */
function serializeIndex(doc) {
  return Buffer.from(bson().BSON.serialize(doc));
}

/**
 * @typedef {{ key: string, sha1: string, name: string, url: string, folder: string, size: number, date: string }} CloudRow
 */

/**
 * @param {Record<string, any>} doc
 * @returns {CloudRow[]}
 */
function rowsFromIndex(doc) {
  /** @type {CloudRow[]} */
  const rows = [];
  for (const [key, entry] of Object.entries(doc)) {
    if (!entry || typeof entry !== "object") continue;
    rows.push({
      key,
      sha1: key.slice(0, 40).toUpperCase(),
      name: str(entry.Name),
      url: str(entry.URL),
      folder: normalizeCloudPath(str(entry.Folder)),
      size: entry.Size == null ? 0 : Number(entry.Size.valueOf()),
      date: str(entry.Date),
    });
  }
  return rows;
}

/**
 * @param {{ url: string, folder: string, name: string, size: number, date?: Date }} row
 */
function makeIndexEntry(row) {
  const { Int32 } = bson();
  return {
    URL: row.url,
    Folder: toIndexFolder(row.folder),
    Name: row.name,
    Size: new Int32(row.size),
    Date: formatIndexDate(row.date || new Date()),
  };
}

/**
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 */
function readIndex(session) {
  const bytes = session.readFile(INDEX_FILE);
  return { bytes, doc: parseIndex(bytes) };
}

/**
 * @param {string} dir
 * @param {Buffer} bytes
 * @param {string} label
 */
function writeSnapshot(dir, bytes, label) {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").replace(/Z$/, "");
  const safeLabel = label.replace(/[^A-Za-z0-9_-]+/g, "-");
  const file = path.join(dir, `CloudInfo.${stamp}.${safeLabel}.bson`);
  fs.writeFileSync(file, bytes);
  const snapshots = fs
    .readdirSync(dir)
    .filter((n) => /^CloudInfo\..+\.bson$/.test(n))
    .sort();
  for (const old of snapshots.slice(0, Math.max(0, snapshots.length - SNAPSHOT_KEEP))) {
    fs.unlinkSync(path.join(dir, old));
  }
  return file;
}

/**
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 */
function sameEntry(a, b) {
  return serializeIndex({ v: a }).equals(serializeIndex({ v: b }));
}

/**
 * Snapshot, mutate, write, verify; restore the snapshot on any unexpected change.
 *
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {{ indexSnapshotDir: string | null }} cfg
 * @param {string} label
 * @param {(doc: Record<string, any>, touched: Set<string>) => void} mutate
 *   must add every key it adds, removes, or edits to `touched`
 * @returns {{ snapshotPath: string, doc: Record<string, any> }}
 */
function editIndex(session, cfg, label, mutate) {
  assertTtsClosed("changing the Cloud index");
  if (!cfg.indexSnapshotDir) {
    throw new Error('Set "backupDir" in tts-assets.config.json; index snapshots are required before any Cloud write.');
  }
  const before = readIndex(session);
  const snapshotPath = writeSnapshot(cfg.indexSnapshotDir, before.bytes, label);
  const doc = parseIndex(before.bytes);
  /** @type {Set<string>} */
  const touched = new Set();
  mutate(doc, touched);
  const out = serializeIndex(doc);
  session.writeFile(INDEX_FILE, out);

  const problems = [];
  const after = readIndex(session);
  if (!after.bytes.equals(out)) problems.push("index bytes read back differ from bytes written");
  for (const key of Object.keys(before.doc)) {
    if (touched.has(key)) continue;
    if (!(key in after.doc)) problems.push(`untouched entry vanished: ${key}`);
    else if (!sameEntry(before.doc[key], after.doc[key])) problems.push(`untouched entry changed: ${key}`);
    if (problems.length > 5) break;
  }
  for (const key of Object.keys(after.doc)) {
    if (!(key in before.doc) && !touched.has(key)) problems.push(`unexpected new entry: ${key}`);
  }
  if (problems.length > 0) {
    session.writeFile(INDEX_FILE, before.bytes);
    const restored = session.readFile(INDEX_FILE);
    const restoredOk = restored.equals(before.bytes);
    throw new Error(
      `Cloud index verification failed (${problems.join("; ")}). ` +
        (restoredOk
          ? `The previous index was restored from ${snapshotPath}.`
          : `RESTORE ALSO FAILED — run npm run cloud:restore-index -- "${snapshotPath}" with TTS closed.`),
    );
  }
  return { snapshotPath, doc: after.doc };
}

module.exports = {
  INDEX_FILE,
  normalizeCloudPath,
  toIndexFolder,
  formatIndexDate,
  ugcUrl,
  ugcMatchKey,
  parseIndex,
  serializeIndex,
  rowsFromIndex,
  makeIndexEntry,
  readIndex,
  writeSnapshot,
  editIndex,
};
