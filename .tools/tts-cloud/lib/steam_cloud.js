"use strict";

/**
 * Shared Steam Remote Storage helpers for Tabletop Simulator Cloud Manager data.
 *
 * steamworks.js inits Steam; koffi + the bundled steam_api64.dll binary-reads
 * CloudInfo.bson (steamworks.js only exposes UTF-8 string reads).
 */

const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");
const config = require("../config.js");

const TOOLS_DIR = path.resolve(__dirname, "..");
const localRequire = createRequire(path.join(TOOLS_DIR, "package.json"));

/**
 * @param {string} name
 * @returns {unknown}
 */
function requireLocal(name) {
  try {
    return localRequire(name);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(
      `Cannot require ${name}. Run: cd "${TOOLS_DIR}" && npm install\n${msg}`,
    );
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeCloudPath(value) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

/**
 * Join CLOUD_ROOT + subfolder into a Cloud Manager path.
 * @param {string} subfolder
 * @param {string} [root]
 * @returns {string}
 */
function joinCloudFolder(subfolder, root = config.CLOUD_ROOT) {
  const r = normalizeCloudPath(root);
  const s = normalizeCloudPath(subfolder);
  if (r === "") {
    throw new Error("CLOUD_ROOT is empty — set it in .tools/tts-cloud/config.js");
  }
  if (s === "") {
    throw new Error("Subfolder is required (e.g. Sites)");
  }
  // Allow callers to pass an already-rooted path.
  if (s.toLowerCase().startsWith(`${r.toLowerCase()}/`) || s.toLowerCase() === r.toLowerCase()) {
    return s;
  }
  return `${r}/${s}`;
}

/**
 * @param {unknown} parsed
 * @returns {{ key: string, Name: string, URL: string, Folder: string, Size: number }[]}
 */
function cloudInfoToRows(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("CloudInfo.bson root is not an object/dictionary.");
  }

  /** @type {{ key: string, Name: string, URL: string, Folder: string, Size: number }[]} */
  const rows = [];
  for (const [key, value] of Object.entries(/** @type {Record<string, unknown>} */ (parsed))) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (value);
    rows.push({
      key,
      Name: asString(rec.Name ?? rec.name),
      URL: asString(rec.URL ?? rec.Url ?? rec.url),
      Folder: normalizeCloudPath(asString(rec.Folder ?? rec.folder)),
      Size: typeof rec.Size === "number" ? rec.Size : Number(rec.Size ?? rec.size) || 0,
    });
  }
  return rows;
}

/**
 * Binary FileRead via koffi against steamworks.js's bundled steam_api64.dll.
 * Call only after steamworks.js init().
 *
 * @param {string} fileName
 * @returns {Buffer}
 */
function readRemoteFileBytes(fileName) {
  const koffi = requireLocal("koffi");
  const dllPath = path.join(
    TOOLS_DIR,
    "node_modules",
    "steamworks.js",
    "dist",
    "win64",
    "steam_api64.dll",
  );
  if (!fs.existsSync(dllPath)) {
    throw new Error(`steam_api64.dll not found at ${dllPath}`);
  }

  const lib = koffi.load(dllPath);
  const SteamRemoteStorage = lib.func("void *SteamAPI_SteamRemoteStorage_v016()");
  const GetFileSize = lib.func(
    "int32 SteamAPI_ISteamRemoteStorage_GetFileSize(void *self, const char *pchFile)",
  );
  const FileExists = lib.func(
    "bool SteamAPI_ISteamRemoteStorage_FileExists(void *self, const char *pchFile)",
  );
  const FileRead = lib.func(
    "int32 SteamAPI_ISteamRemoteStorage_FileRead(void *self, const char *pchFile, void *pvData, int32 cubDataToRead)",
  );

  const remote = SteamRemoteStorage();
  if (!remote) {
    throw new Error("SteamAPI_SteamRemoteStorage_v016 returned null");
  }
  if (!FileExists(remote, fileName)) {
    throw new Error(`${fileName} does not exist in RemoteStorage`);
  }
  const size = GetFileSize(remote, fileName);
  if (size <= 0) {
    throw new Error(`GetFileSize(${fileName}) returned ${size}`);
  }
  const buf = Buffer.alloc(size);
  const read = FileRead(remote, fileName, buf, size);
  if (read !== size) {
    throw new Error(`FileRead(${fileName}) read ${read} of ${size} bytes`);
  }
  return buf;
}

/**
 * Init Steam for TTS, read CloudInfo.bson, return all indexed cloud items.
 * Always call `session.close()` when finished (exits process-friendly).
 *
 * @returns {{
 *   personaName: string,
 *   remoteFileCount: number,
 *   rows: { key: string, Name: string, URL: string, Folder: string, Size: number }[],
 *   close: () => void,
 * }}
 */
function openCloudInfo() {
  const steamworks = requireLocal("steamworks.js");
  const { BSON } = requireLocal("bson");

  const appIdPath = path.join(process.cwd(), "steam_appid.txt");
  const wroteAppId = !fs.existsSync(appIdPath);
  if (wroteAppId) {
    fs.writeFileSync(appIdPath, String(config.TTS_APP_ID), "utf8");
  }

  let client;
  try {
    client = steamworks.init(config.TTS_APP_ID);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(
      `SteamAPI.Init failed. Is Steam running and logged in?\n${msg}`,
    );
  } finally {
    if (wroteAppId) {
      try {
        fs.unlinkSync(appIdPath);
      } catch (_) {
        /* ignore */
      }
    }
  }

  const personaName =
    client.localplayer && typeof client.localplayer.getName === "function"
      ? client.localplayer.getName()
      : "(unknown)";
  const remoteFileCount = client.cloud.listFiles().length;

  if (!client.cloud.fileExists("CloudInfo.bson")) {
    throw new Error("CloudInfo.bson not present in RemoteStorage.");
  }

  const bsonBytes = readRemoteFileBytes("CloudInfo.bson");
  let parsed;
  try {
    parsed = BSON.deserialize(bsonBytes);
  } catch (err) {
    const dumpPath = path.join(TOOLS_DIR, "CloudInfo.bson.dump");
    fs.writeFileSync(dumpPath, bsonBytes);
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`BSON.deserialize(CloudInfo.bson) failed. Dumped to ${dumpPath}\n${msg}`);
  }

  const rows = cloudInfoToRows(parsed);

  return {
    personaName,
    remoteFileCount,
    rows,
    close() {
      // Steamworks keeps Node's event loop alive; callers should process.exit after use.
    },
  };
}

/**
 * @param {{ Folder: string }[]} rows
 * @param {string} cloudFolder full path e.g. Vampire the Masquerade 5E/Sites
 * @returns {{ Folder: string, Name: string, URL: string, Size: number, key: string }[]}
 */
function filterByFolder(rows, cloudFolder) {
  const target = normalizeCloudPath(cloudFolder).toLowerCase();
  return rows
    .filter((r) => r.Folder.toLowerCase() === target)
    .sort((a, b) => a.Name.localeCompare(b.Name));
}

/**
 * CSV with columns Name,URL (Name = full cloud filename including extension).
 * @param {{ Name: string, URL: string }[]} rows
 * @returns {string}
 */
function toNameUrlCsv(rows) {
  function escapeCsv(value) {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const lines = ["Name,URL"];
  for (const row of rows) {
    lines.push(`${escapeCsv(row.Name)},${escapeCsv(row.URL)}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * List distinct Folder values (optionally under CLOUD_ROOT).
 * @param {{ Folder: string }[]} rows
 * @param {string} [root]
 * @returns {string[]}
 */
function listFolders(rows, root = config.CLOUD_ROOT) {
  const r = normalizeCloudPath(root).toLowerCase();
  const set = new Set();
  for (const row of rows) {
    const f = normalizeCloudPath(row.Folder);
    if (f === "") continue;
    if (r !== "" && !f.toLowerCase().startsWith(r) && f.toLowerCase() !== r) {
      continue;
    }
    set.add(f);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

module.exports = {
  TOOLS_DIR,
  config,
  requireLocal,
  normalizeCloudPath,
  joinCloudFolder,
  openCloudInfo,
  filterByFolder,
  toNameUrlCsv,
  listFolders,
};
