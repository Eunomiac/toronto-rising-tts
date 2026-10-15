"use strict";

/**
 * Cloud writes with the same result the TTS Cloud Manager produces:
 * upload (FileWrite + FileShare + index entry), index-only move, delete.
 * Every index change goes through cloud_index.editIndex (snapshot + verify + restore).
 */

const crypto = require("crypto");

const {
  editIndex,
  makeIndexEntry,
  normalizeCloudPath,
  readIndex,
  rowsFromIndex,
  toIndexFolder,
  ugcUrl,
} = require("./cloud_index.js");
const { assertTtsClosed } = require("./cloud_config.js");

const UPLOAD_BATCH = 50;
/** FileShare round trips dominate upload time; Steam serves several at once. */
const SHARE_CONCURRENCY = 4;

/**
 * @param {Buffer} bytes
 */
function sha1Hex(bytes) {
  return crypto.createHash("sha1").update(bytes).digest("hex").toUpperCase();
}

/**
 * Upload files into Cloud folders. A file whose key (<SHA1>_<Name>) is already indexed
 * is not re-uploaded; if it sits in another folder it is moved instead.
 *
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {{ indexSnapshotDir: string | null }} cfg
 * @param {{ bytes: Buffer, folder: string, name: string }[]} items folder = Cloud path
 * @param {{ label: string, log?: (msg: string) => void }} opts
 * @returns {Promise<{ key: string, url: string, folder: string, name: string, uploaded: boolean }[]>}
 */
async function uploadFiles(session, cfg, items, opts) {
  assertTtsClosed("uploading to Steam Cloud");
  const log = opts.log || (() => {});
  const existing = new Map(rowsFromIndex(readIndex(session).doc).map((r) => [r.key, r]));
  const results = [];
  /** @type {{ key: string, entry: Record<string, any> }[]} */
  let pendingAdds = [];
  /** @type {{ key: string, folder: string }[]} */
  const moves = [];

  const flush = () => {
    if (pendingAdds.length === 0) return;
    const batch = pendingAdds;
    pendingAdds = [];
    editIndex(session, cfg, opts.label, (doc, touched) => {
      for (const { key, entry } of batch) {
        doc[key] = entry;
        touched.add(key);
      }
    });
  };

  /** @type {{ index: number, item: { bytes: Buffer, name: string }, folder: string, sha1: string, key: string }[]} */
  const queue = [];
  const queued = new Map();
  items.forEach((item, index) => {
    const folder = normalizeCloudPath(item.folder);
    const sha1 = sha1Hex(item.bytes);
    const key = `${sha1}_${item.name}`;
    const hit = existing.get(key);
    if (hit) {
      if (hit.folder !== folder) moves.push({ key, folder });
      results[index] = { key, url: hit.url, folder, name: item.name, uploaded: false };
    } else if (queued.has(key)) {
      queued.get(key).push(index);
    } else {
      queued.set(key, []);
      queue.push({ index, item, folder, sha1, key });
    }
  });

  let done = 0;
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < queue.length) {
      const { index, item, folder, sha1, key } = queue[next];
      next += 1;
      try {
        session.writeFile(key, item.bytes);
        const handle = await session.shareFile(key);
        const url = ugcUrl(handle, sha1);
        const entry = makeIndexEntry({ url, folder, name: item.name, size: item.bytes.length });
        pendingAdds.push({ key, entry });
        results[index] = { key, url, folder, name: item.name, uploaded: true };
        for (const dup of queued.get(key)) results[dup] = { key, url, folder, name: item.name, uploaded: false };
        done += 1;
        log(`uploaded ${done}/${queue.length}: ${folder}/${item.name}`);
        if (pendingAdds.length >= UPLOAD_BATCH) flush();
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  };
  const settled = await Promise.allSettled(Array.from({ length: Math.min(SHARE_CONCURRENCY, queue.length) }, worker));
  flush();
  const rejected = settled.find((s) => s.status === "rejected");
  if (rejected) throw rejected.reason;
  if (moves.length > 0) moveFiles(session, cfg, moves, { label: `${opts.label}-move` });
  return results;
}

/**
 * Index-only folder moves; the file and its URL stay the same.
 *
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {{ indexSnapshotDir: string | null }} cfg
 * @param {{ key: string, folder: string }[]} moves
 * @param {{ label: string }} opts
 */
function moveFiles(session, cfg, moves, opts) {
  if (moves.length === 0) return;
  editIndex(session, cfg, opts.label, (doc, touched) => {
    for (const { key, folder } of moves) {
      if (!doc[key]) throw new Error(`Cannot move ${key}: not in the Cloud index.`);
      doc[key].Folder = toIndexFolder(folder);
      touched.add(key);
    }
  });
}

/**
 * Remove index entries, then the remote files.
 *
 * @param {ReturnType<import("./steam_session.js").openSteamSession>} session
 * @param {{ indexSnapshotDir: string | null }} cfg
 * @param {string[]} keys
 * @param {{ label: string }} opts
 */
function deleteFiles(session, cfg, keys, opts) {
  if (keys.length === 0) return;
  editIndex(session, cfg, opts.label, (doc, touched) => {
    for (const key of keys) {
      if (doc[key]) {
        delete doc[key];
        touched.add(key);
      }
    }
  });
  for (const key of keys) {
    if (session.fileExists(key)) session.deleteFile(key);
  }
}

module.exports = {
  sha1Hex,
  uploadFiles,
  moveFiles,
  deleteFiles,
};
