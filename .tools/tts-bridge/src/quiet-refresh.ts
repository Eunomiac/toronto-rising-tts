/**
 * Quiet per-object refresh: merge disk Lua/XML into live getJSON(), bundle via @tts-tools/savefile,
 * then destruct + spawnObjectJSON in Global context (same idea as Seb's TTS Editor updateObject).
 */
import { bundleObject } from "@tts-tools/savefile";
import type { TTSObject } from "@tts-tools/savefile";
import fs from "node:fs/promises";
import path from "node:path";
import type { TtsExternalEditorBridge } from "./bridge.js";
import { findObjectDiskPathsForGuid, parseExtraSyncDirs } from "./guid-resolve.js";
import type { ExecuteResult } from "./types.js";

const emptyFetch: ExecuteResult = { prints: [], customMessages: [], timedOut: false };

/** Options for {@link quietRefreshObject}. */
export interface QuietRefreshOptions {
  /** Object GUID (not Global `-1`). */
  guid: string;
  /** Repository / workspace root used to resolve relative paths and XML/Lua includes. */
  repoRoot: string;
  /** Path to object Lua entry (stub or script), relative to repoRoot or absolute. Omit both this and `xmlPath` to search disk (workspace + `TTS_OBJECT_SYNC_DIRS`). */
  luaEntryPath?: string;
  /** Path to object UI XML, relative to repoRoot or absolute. Omit both for auto-discovery. */
  xmlPath?: string;
  /** Optional path to LuaScriptState text; if omitted, live state from getJSON is kept. */
  luaStatePath?: string;
  maxWaitMs?: number;
  idleTimeoutMs?: number;
}

/** Result of a full quiet-refresh attempt. */
export interface QuietRefreshResult {
  fetch: ExecuteResult;
  spawn?: ExecuteResult;
  error?: string;
  bundledJsonChars?: number;
}

/**
 * Escapes `]]` sequences so a JSON string can be embedded in a Lua `[[...]]` long bracket string.
 * Matches Sebaestschjin/tts-tools ttsAdapter.updateObject.
 */
export function escapeJsonForLuaLongBracket(json: string): string {
  return json.replace(/\]\]/g, ']] .. "]]" .. [[');
}

/**
 * Resolves a path under repo root when relative; leaves absolute paths unchanged.
 */
export function resolveRepoPath(repoRoot: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath);
  }
  return path.normalize(path.join(repoRoot, filePath));
}

/**
 * Lua run in Global (`-1`) that returns getJSON() for the object, or `nil` if missing/destroyed.
 */
export function buildFetchObjectJsonScript(guid: string): string {
  return [
    `local g = "${guid}"`,
    "local o = getObjectFromGUID(g)",
    "if o == nil then return nil end",
    "if o.isDestroyed ~= nil and o.isDestroyed() then return nil end",
    "return o.getJSON()",
  ].join("\n");
}

/**
 * Lua run in Global: destruct object if present, then spawnObjectJSON with bundled JSON string.
 */
export function buildSpawnObjectScript(guid: string, jsonPayloadForLongBracket: string): string {
  const body = escapeJsonForLuaLongBracket(jsonPayloadForLongBracket);
  return [
    `local _g = "${guid}"`,
    `local _j = [[${body}]]`,
    "local obj = getObjectFromGUID(_g)",
    "if obj ~= nil and obj.destruct ~= nil then obj.destruct() end",
    "spawnObjectJSON({ json = _j })",
    "return true",
  ].join("\n");
}

const GUID_SAFE = /^[0-9a-zA-Z_-]+$/;

function validateGuidForQuietRefresh(guid: string): string | undefined {
  if (guid === "-1") {
    return "Global (-1) is not supported; use Save & Play for Global.";
  }
  if (guid.length === 0 || !GUID_SAFE.test(guid)) {
    return `Invalid or unsafe GUID for Lua embedding: ${guid}`;
  }
  return undefined;
}

function parseGetJsonReturn(returnValue: unknown): TTSObject {
  if (returnValue === null || returnValue === undefined) {
    throw new Error("Object not found or destroyed (getJSON returned nil).");
  }
  if (typeof returnValue !== "string") {
    throw new Error(`Expected getJSON to return a string; got ${typeof returnValue}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(returnValue);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse getJSON string: ${msg}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("getJSON JSON root must be an object.");
  }
  return parsed as TTSObject;
}

/**
 * Fetches live object JSON from TTS, merges unbundled Lua/XML (and optional state) from disk,
 * runs savefile bundleObject, then destruct + spawnObjectJSON.
 */
export async function quietRefreshObject(
  bridge: TtsExternalEditorBridge,
  options: QuietRefreshOptions
): Promise<QuietRefreshResult> {
  const invalid = validateGuidForQuietRefresh(options.guid);
  if (invalid !== undefined) {
    return {
      fetch: emptyFetch,
      error: `validate: ${invalid}`,
    };
  }

  const luaTrim = options.luaEntryPath?.trim() ?? "";
  const xmlTrim = options.xmlPath?.trim() ?? "";
  const hasLua = luaTrim.length > 0;
  const hasXml = xmlTrim.length > 0;
  if (hasLua !== hasXml) {
    return {
      fetch: emptyFetch,
      error: "Either provide both luaEntryPath and xmlPath, or omit both for auto-discovery.",
    };
  }

  let luaEntryPath = luaTrim;
  let xmlPath = xmlTrim;
  if (!hasLua) {
    const extras = parseExtraSyncDirs(process.env["TTS_OBJECT_SYNC_DIRS"], options.repoRoot);
    const disk = await findObjectDiskPathsForGuid(options.repoRoot, options.guid, extras);
    if ("error" in disk) {
      return { fetch: emptyFetch, error: `discover: ${disk.error}` };
    }
    luaEntryPath = disk.luaEntryPath;
    xmlPath = disk.xmlPath;
  }

  const luaAbs = resolveRepoPath(options.repoRoot, luaEntryPath);
  const xmlAbs = resolveRepoPath(options.repoRoot, xmlPath);

  let luaText: string;
  let xmlText: string;
  try {
    luaText = await fs.readFile(luaAbs, "utf8");
    xmlText = await fs.readFile(xmlAbs, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      fetch: { prints: [], customMessages: [], timedOut: false },
      error: `read_files: ${msg}`,
    };
  }

  const fetchScript = buildFetchObjectJsonScript(options.guid);
  const fetch = await bridge.executeWithOutput({
    script: fetchScript,
    guid: "-1",
    maxWaitMs: options.maxWaitMs,
    idleTimeoutMs: options.idleTimeoutMs,
  });

  if (fetch.error) {
    return { fetch, error: `fetch: Lua error — ${fetch.error.errorMessagePrefix}` };
  }
  if (fetch.timedOut) {
    return { fetch, error: "fetch: timed out waiting for getJSON return." };
  }

  let live: TTSObject;
  try {
    live = parseGetJsonReturn(fetch.returnValue);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { fetch, error: `parse: ${msg}` };
  }

  const merged: TTSObject = { ...live, LuaScript: luaText, XmlUI: xmlText };

  if (options.luaStatePath !== undefined && options.luaStatePath.length > 0) {
    const stateAbs = resolveRepoPath(options.repoRoot, options.luaStatePath);
    try {
      merged.LuaScriptState = await fs.readFile(stateAbs, "utf8");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { fetch, error: `read_files (state): ${msg}` };
    }
  }

  let bundled: TTSObject;
  try {
    bundled = bundleObject(merged, { includePath: options.repoRoot }) as TTSObject;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { fetch, error: `bundle: ${msg}` };
  }

  const jsonPayload = JSON.stringify(bundled);
  const spawnScript = buildSpawnObjectScript(options.guid, jsonPayload);

  const spawn = await bridge.executeWithOutput({
    script: spawnScript,
    guid: "-1",
    maxWaitMs: options.maxWaitMs,
    idleTimeoutMs: options.idleTimeoutMs,
  });

  if (spawn.error) {
    return {
      fetch,
      spawn,
      error: `spawn: Lua error — ${spawn.error.errorMessagePrefix}`,
      bundledJsonChars: jsonPayload.length,
    };
  }
  if (spawn.timedOut) {
    return {
      fetch,
      spawn,
      error: "spawn: timed out before TTS reported completion.",
      bundledJsonChars: jsonPayload.length,
    };
  }

  return { fetch, spawn, bundledJsonChars: jsonPayload.length };
}
