/**
 * Locate object Lua / XML on disk from TTS-style filenames: *.guid.lua / *.guid.xml (or .ttslua).
 */
import fs from "node:fs/promises";
import path from "node:path";

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cursor",
]);

/** Parse semicolon-separated extra roots from TTS_OBJECT_SYNC_DIRS (optional). */
export function parseExtraSyncDirs(envValue: string | undefined, repoRoot: string): string[] {
  if (envValue === undefined || envValue.trim() === "") {
    return [];
  }
  const parts = envValue.split(";");
  const out: string[] = [];
  for (const raw of parts) {
    const s = raw.trim();
    if (s === "") {
      continue;
    }
    out.push(path.isAbsolute(s) ? path.normalize(s) : path.normalize(path.join(repoRoot, s)));
  }
  return out;
}

async function walkFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: { isDirectory(): boolean; name: string | Buffer }[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const name = typeof e.name === "string" ? e.name : e.name.toString("utf8");
    const full = path.join(dir, name);
    if (e.isDirectory()) {
      if (SKIP_DIR_NAMES.has(name)) {
        continue;
      }
      out.push(...(await walkFilesRecursive(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

function basenameLower(p: string): string {
  return path.basename(p).toLowerCase();
}

function endsWithGuidSuffix(basename: string, guidLower: string, ext: string): boolean {
  const suffix = `.${guidLower}.${ext.toLowerCase()}`;
  return basename.toLowerCase().endsWith(suffix);
}

function collectMatches(files: readonly string[], guidLower: string, ext: string): string[] {
  return files.filter((f) => endsWithGuidSuffix(basenameLower(f), guidLower, ext));
}

export interface GuidDiskPaths {
  luaEntryPath: string;
  xmlPath: string;
}

export type GuidDiskResolveResult = GuidDiskPaths | { error: string };

/**
 * Search repo root then extra roots (e.g. TTS Temp sync) for exactly one `*.guid.lua` (or `.ttslua`)
 * and one `*.guid.xml`.
 */
export async function findObjectDiskPathsForGuid(
  repoRoot: string,
  guid: string,
  extraSearchRoots: readonly string[] = []
): Promise<GuidDiskResolveResult> {
  const g = guid.trim();
  if (g === "") {
    return { error: "GUID is empty." };
  }
  const guidLower = g.toLowerCase();

  const roots = [path.normalize(repoRoot), ...extraSearchRoots.map((r) => path.normalize(r))];
  const uniqueRoots = [...new Set(roots)];

  const allLua: string[] = [];
  const allXml: string[] = [];

  for (const root of uniqueRoots) {
    const files = await walkFilesRecursive(root);
    const luaHits = [
      ...collectMatches(files, guidLower, "lua"),
      ...collectMatches(files, guidLower, "ttslua"),
    ];
    const xmlHits = collectMatches(files, guidLower, "xml");
    allLua.push(...luaHits);
    allXml.push(...xmlHits);
  }

  if (allLua.length === 0) {
    return {
      error: `No *.${g}.lua or *.${g}.ttslua under workspace or TTS_OBJECT_SYNC_DIRS. Sync scripts or set TTS_OBJECT_SYNC_DIRS.`,
    };
  }
  if (allLua.length > 1) {
    return {
      error: `Multiple Lua matches for ${g}: ${allLua.slice(0, 5).join("; ")}${allLua.length > 5 ? "…" : ""}`,
    };
  }
  if (allXml.length === 0) {
    return { error: `No *.${g}.xml found (Lua: ${allLua[0] ?? ""}).` };
  }
  if (allXml.length > 1) {
    return {
      error: `Multiple XML matches for ${g}: ${allXml.slice(0, 5).join("; ")}${allXml.length > 5 ? "…" : ""}`,
    };
  }

  const luaOnly = allLua[0];
  const xmlOnly = allXml[0];
  if (luaOnly === undefined || xmlOnly === undefined) {
    return { error: "Internal: could not resolve paths after validation." };
  }
  return { luaEntryPath: luaOnly, xmlPath: xmlOnly };
}
