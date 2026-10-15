"use strict";

/**
 * Steam Remote Storage session for Tabletop Simulator's Cloud (app 286160), driven
 * through koffi + the steam_api64.dll shipped inside steamworks.js. No steamworks.js
 * callback pump runs, so FileShare call results stay readable via ISteamUtils.
 *
 * Steam syncs written files to the Cloud when this process shuts the API down, so
 * always call session.close() before exiting.
 */

const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const { TTS_APP_ID } = require("./cloud_config.js");

const TOOLS_DIR = path.resolve(__dirname, "..");
const localRequire = createRequire(path.join(TOOLS_DIR, "package.json"));
const DLL_PATH = path.join(TOOLS_DIR, "node_modules", "steamworks.js", "dist", "win64", "steam_api64.dll");

/** RemoteStorageFileShareResult_t: EResult(4) pad(4) UGCHandle_t(8) char[260]; pack 8 → 280. */
const FILE_SHARE_RESULT_SIZE = 280;
const FILE_SHARE_RESULT_CALLBACK = 1307;
const SHARE_TIMEOUT_MS = 120000;

/**
 * @param {string} name
 */
function requireLocal(name) {
  try {
    return localRequire(name);
  } catch (err) {
    throw new Error(`Cannot require ${name}. Run: cd "${TOOLS_DIR}" && npm install\n${err.message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let openSession = null;

/**
 * @returns {{
 *   personaName: string,
 *   listFiles: () => { name: string, size: number }[],
 *   fileExists: (name: string) => boolean,
 *   readFile: (name: string) => Buffer,
 *   writeFile: (name: string, bytes: Buffer) => void,
 *   shareFile: (name: string) => Promise<string>,
 *   deleteFile: (name: string) => void,
 *   quota: () => { totalBytes: number, availableBytes: number },
 *   close: () => void,
 * }}
 */
function openSteamSession() {
  if (openSession) return openSession;
  if (!fs.existsSync(DLL_PATH)) {
    throw new Error(`steam_api64.dll not found at ${DLL_PATH}. Run: cd "${TOOLS_DIR}" && npm install`);
  }
  const koffi = requireLocal("koffi");
  const lib = koffi.load(DLL_PATH);

  const InitFlat = lib.func("int SteamAPI_InitFlat(_Out_ uint8_t *pOutErrMsg)");
  const Shutdown = lib.func("void SteamAPI_Shutdown()");
  const RunCallbacks = lib.func("void SteamAPI_RunCallbacks()");
  const RemoteStorage = lib.func("void *SteamAPI_SteamRemoteStorage_v016()");
  const Utils = lib.func("void *SteamAPI_SteamUtils_v010()");
  const Friends = lib.func("void *SteamAPI_SteamFriends_v017()");
  const GetPersonaName = lib.func("const char *SteamAPI_ISteamFriends_GetPersonaName(void *self)");
  const GetFileCount = lib.func("int32 SteamAPI_ISteamRemoteStorage_GetFileCount(void *self)");
  const GetFileNameAndSize = lib.func(
    "const char *SteamAPI_ISteamRemoteStorage_GetFileNameAndSize(void *self, int iFile, _Out_ int32 *pnFileSizeInBytes)",
  );
  const FileExists = lib.func("bool SteamAPI_ISteamRemoteStorage_FileExists(void *self, const char *pchFile)");
  const GetFileSize = lib.func("int32 SteamAPI_ISteamRemoteStorage_GetFileSize(void *self, const char *pchFile)");
  const FileRead = lib.func(
    "int32 SteamAPI_ISteamRemoteStorage_FileRead(void *self, const char *pchFile, _Out_ uint8_t *pvData, int32 cubDataToRead)",
  );
  const FileWrite = lib.func(
    "bool SteamAPI_ISteamRemoteStorage_FileWrite(void *self, const char *pchFile, const uint8_t *pvData, int32 cubData)",
  );
  const FileShare = lib.func("uint64 SteamAPI_ISteamRemoteStorage_FileShare(void *self, const char *pchFile)");
  const FileDelete = lib.func("bool SteamAPI_ISteamRemoteStorage_FileDelete(void *self, const char *pchFile)");
  const GetQuota = lib.func(
    "bool SteamAPI_ISteamRemoteStorage_GetQuota(void *self, _Out_ uint64 *pnTotalBytes, _Out_ uint64 *puAvailableBytes)",
  );
  const IsAPICallCompleted = lib.func(
    "bool SteamAPI_ISteamUtils_IsAPICallCompleted(void *self, uint64 hSteamAPICall, _Out_ bool *pbFailed)",
  );
  const GetAPICallResult = lib.func(
    "bool SteamAPI_ISteamUtils_GetAPICallResult(void *self, uint64 hSteamAPICall, _Out_ uint8_t *pCallback, int cubCallback, int iCallbackExpected, _Out_ bool *pbFailed)",
  );

  const appIdPath = path.join(process.cwd(), "steam_appid.txt");
  const wroteAppId = !fs.existsSync(appIdPath);
  if (wroteAppId) fs.writeFileSync(appIdPath, String(TTS_APP_ID), "utf8");
  try {
    const errBuf = Buffer.alloc(1024);
    const result = InitFlat(errBuf);
    if (result !== 0) {
      const msg = errBuf.toString("utf8").replace(/\0.*$/s, "");
      throw new Error(`SteamAPI_InitFlat failed (${result}): ${msg}. Is Steam running and logged in?`);
    }
  } finally {
    if (wroteAppId) fs.unlinkSync(appIdPath);
  }

  const remote = RemoteStorage();
  const utils = Utils();
  if (!remote || !utils) throw new Error("Steam RemoteStorage / Utils interface unavailable.");
  let closed = false;

  openSession = {
    personaName: GetPersonaName(Friends()),

    listFiles() {
      const count = GetFileCount(remote);
      const out = [];
      for (let i = 0; i < count; i += 1) {
        const size = [0];
        const name = GetFileNameAndSize(remote, i, size);
        out.push({ name, size: size[0] });
      }
      return out;
    },

    fileExists(name) {
      return FileExists(remote, name);
    },

    readFile(name) {
      if (!FileExists(remote, name)) throw new Error(`${name} does not exist in Steam Remote Storage.`);
      const size = GetFileSize(remote, name);
      if (size <= 0) throw new Error(`GetFileSize(${name}) returned ${size}.`);
      const buf = Buffer.alloc(size);
      const read = FileRead(remote, name, buf, size);
      if (read !== size) throw new Error(`FileRead(${name}) read ${read} of ${size} bytes.`);
      return buf;
    },

    writeFile(name, bytes) {
      if (!FileWrite(remote, name, bytes, bytes.length)) {
        throw new Error(`FileWrite(${name}, ${bytes.length} bytes) failed (quota or Steam error).`);
      }
    },

    /** Shares a written file; resolves to its UGC handle (decimal string). */
    async shareFile(name) {
      const call = FileShare(remote, name);
      if (!call) throw new Error(`FileShare(${name}) returned an invalid call handle.`);
      const started = Date.now();
      const failed = [false];
      while (!IsAPICallCompleted(utils, call, failed)) {
        if (Date.now() - started > SHARE_TIMEOUT_MS) throw new Error(`FileShare(${name}) timed out.`);
        RunCallbacks();
        await sleep(100);
      }
      const buf = Buffer.alloc(FILE_SHARE_RESULT_SIZE);
      const resultFailed = [false];
      const ok = GetAPICallResult(utils, call, buf, buf.length, FILE_SHARE_RESULT_CALLBACK, resultFailed);
      if (!ok || resultFailed[0]) throw new Error(`FileShare(${name}) call result unavailable.`);
      const eResult = buf.readInt32LE(0);
      if (eResult !== 1) throw new Error(`FileShare(${name}) failed with EResult ${eResult}.`);
      const handle = buf.readBigUInt64LE(8);
      if (handle === 0n) throw new Error(`FileShare(${name}) returned an empty handle.`);
      return handle.toString();
    },

    deleteFile(name) {
      if (!FileDelete(remote, name)) throw new Error(`FileDelete(${name}) failed.`);
    },

    quota() {
      const total = [0];
      const available = [0];
      if (!GetQuota(remote, total, available)) throw new Error("GetQuota failed.");
      return { totalBytes: Number(total[0]), availableBytes: Number(available[0]) };
    },

    close() {
      if (closed) return;
      closed = true;
      openSession = null;
      Shutdown();
    },
  };
  return openSession;
}

module.exports = {
  TOOLS_DIR,
  requireLocal,
  openSteamSession,
};
