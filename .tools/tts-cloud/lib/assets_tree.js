"use strict";

/**
 * Local assets/ folder (source of truth) ↔ Cloud root mapping.
 *
 *   assets/<folder>/<name>  ↔  "<cloudRoot>/<folder>/<name>"
 *
 * Ledger (assets/.cloud-ledger.json): the last synced state, relPath → { key, url, size }.
 * A Cloud file whose key is in the ledger came from assets/; deleting the local file
 * deletes the Cloud copy on the next push. Cloud files never in the ledger are strays.
 *
 * Not mirrored by push:
 *   Save Only/  pulled read-only from Cloud (art authored in the save)
 *   images/     legacy repo art still being migrated into the mirrored layout
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { REPO_ROOT, SAVE_ONLY_FOLDER } = require("./cloud_config.js");
const { normalizeCloudPath } = require("./cloud_index.js");

const LEDGER_FILE = ".cloud-ledger.json";
const HASH_CACHE = path.join(REPO_ROOT, ".cache", "assets-hash.json");
const PUSH_EXCLUDED_TOP = new Set([SAVE_ONLY_FOLDER.toLowerCase(), "images"]);

/**
 * @typedef {{ relPath: string, folder: string, name: string, absPath: string, size: number, sha1: string, key: string }} LocalFile
 * folder = path under assets/ ("" at the top), posix separators
 */

/**
 * @param {string} relPath posix
 */
function splitRel(relPath) {
  const i = relPath.lastIndexOf("/");
  return i < 0 ? { folder: "", name: relPath } : { folder: relPath.slice(0, i), name: relPath.slice(i + 1) };
}

/**
 * @param {string} cloudRoot
 * @param {string} folder
 */
function cloudFolderFor(cloudRoot, folder) {
  return folder === "" ? normalizeCloudPath(cloudRoot) : `${normalizeCloudPath(cloudRoot)}/${folder}`;
}

/**
 * Folder under assets/ for a Cloud folder, or null when outside the root.
 * @param {string} cloudRoot
 * @param {string} cloudFolder
 */
function localFolderFor(cloudRoot, cloudFolder) {
  const root = normalizeCloudPath(cloudRoot).toLowerCase();
  const f = normalizeCloudPath(cloudFolder);
  if (f.toLowerCase() === root) return "";
  if (f.toLowerCase().startsWith(`${root}/`)) return f.slice(root.length + 1);
  return null;
}

/**
 * @param {string} folder
 */
function isPushExcluded(folder) {
  const top = folder.split("/")[0].toLowerCase();
  return PUSH_EXCLUDED_TOP.has(top);
}

function loadHashCache() {
  try {
    return JSON.parse(fs.readFileSync(HASH_CACHE, "utf8"));
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, any>} cache
 */
function saveHashCache(cache) {
  fs.mkdirSync(path.dirname(HASH_CACHE), { recursive: true });
  fs.writeFileSync(HASH_CACHE, JSON.stringify(cache), "utf8");
}

/**
 * Every file under assets/ (except the ledger), hashed with an mtime/size cache.
 * @param {string} assetsDir
 * @returns {LocalFile[]}
 */
function scanAssets(assetsDir) {
  if (!fs.existsSync(assetsDir)) return [];
  const cache = loadHashCache();
  const nextCache = {};
  /** @type {LocalFile[]} */
  const out = [];
  const walk = (dir, rel) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === "" ? ent.name : `${rel}/${ent.name}`;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs, childRel);
        continue;
      }
      if (!ent.isFile() || childRel === LEDGER_FILE) continue;
      const st = fs.statSync(abs);
      const hit = cache[childRel];
      let sha1;
      if (hit && hit.size === st.size && hit.mtimeMs === st.mtimeMs) {
        sha1 = hit.sha1;
      } else {
        sha1 = crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex").toUpperCase();
      }
      nextCache[childRel] = { size: st.size, mtimeMs: st.mtimeMs, sha1 };
      const { folder, name } = splitRel(childRel);
      out.push({ relPath: childRel, folder, name, absPath: abs, size: st.size, sha1, key: `${sha1}_${name}` });
    }
  };
  walk(assetsDir, "");
  saveHashCache(nextCache);
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/**
 * @param {string} assetsDir
 * @returns {{ cloudRoot: string | null, files: Record<string, { key: string, url: string, size: number }> }}
 */
function loadLedger(assetsDir) {
  const file = path.join(assetsDir, LEDGER_FILE);
  if (!fs.existsSync(file)) return { cloudRoot: null, files: {} };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * @param {string} assetsDir
 * @param {{ cloudRoot: string | null, files: Record<string, { key: string, url: string, size: number }> }} ledger
 */
function saveLedger(assetsDir, ledger) {
  fs.mkdirSync(assetsDir, { recursive: true });
  const sorted = {};
  for (const k of Object.keys(ledger.files).sort()) sorted[k] = ledger.files[k];
  fs.writeFileSync(
    path.join(assetsDir, LEDGER_FILE),
    `${JSON.stringify({ cloudRoot: ledger.cloudRoot, files: sorted }, null, 2)}\n`,
    "utf8",
  );
}

module.exports = {
  LEDGER_FILE,
  splitRel,
  cloudFolderFor,
  localFolderFor,
  isPushExcluded,
  scanAssets,
  loadLedger,
  saveLedger,
};
