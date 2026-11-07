#!/usr/bin/env node
/**
 * GUID role-key gate: every `G.GUIDS.<KEY>` / `G.GUIDS.TABLES.<KEY>` reference in
 * lib/ + core/ must resolve to an assigned entry in lib/guids.ttslua.
 *
 * Catches deleted GUID registry rows that still appear as map keys or list entries
 * before Save & Play (those otherwise become Lua "table index is nil" and abort Global).
 *
 * Log: .dev/build-logs/guid-refs-gate.txt
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const GUIDS_FILE = join(REPO_ROOT, "lib", "guids.ttslua");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "guid-refs-gate.txt");

const SCAN_DIRS = [join(REPO_ROOT, "lib"), join(REPO_ROOT, "core"), join(REPO_ROOT, "dashboard")];
const SCAN_EXT = new Set([".ttslua", ".lua"]);

/**
 * @param {boolean} ok
 * @param {string} detail
 */
function writeLog(ok, detail) {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(LOG_FILE, `${new Date().toISOString()}\t${ok ? "OK" : "FAIL"}\t${detail}\n`, "utf8");
}

/**
 * @param {string} dir
 * @param {string[]} out
 */
function collectFiles(dir, out) {
  if (!existsSync(dir)) {
    return;
  }
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot) : "";
    if (SCAN_EXT.has(ext)) {
      out.push(full);
    }
  }
}

/**
 * Top-level G.GUIDS keys and G.GUIDS.TABLES.* keys from guids.ttslua.
 * @param {string} text
 */
function loadAssignedKeys(text) {
  const top = new Set();
  const tables = new Set();
  const guidBlock = text.match(/G\.GUIDS\s*=\s*\{([\s\S]*)\n\}/);
  if (!guidBlock) {
    throw new Error("could not find G.GUIDS = { ... } in lib/guids.ttslua");
  }
  const body = guidBlock[1];
  for (const m of body.matchAll(/^\s{4}([A-Z][A-Z0-9_]*)\s*=/gm)) {
    top.add(m[1]);
  }
  const tablesBlock = body.match(/TABLES\s*=\s*\{([\s\S]*?)\n\s{4}\}/);
  if (tablesBlock) {
    for (const m of tablesBlock[1].matchAll(/^\s{6}([A-Z][A-Z0-9_]*)\s*=/gm)) {
      tables.add(m[1]);
    }
  }
  return { top, tables };
}

/**
 * @param {string} filePath
 * @param {string} text
 * @param {{ top: Set<string>, tables: Set<string> }} assigned
 * @returns {{ file: string, ref: string, line: number }[]}
 */
function findMissingRefs(filePath, text, assigned) {
  const rel = relative(REPO_ROOT, filePath).replace(/\\/g, "/");
  /** @type {{ file: string, ref: string, line: number }[]} */
  const missing = [];
  // Skip the registry definition itself and helper docs that mention G.GUIDS.FOO in prose
  if (rel === "lib/guids.ttslua") {
    return missing;
  }

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // G.GUIDS.TABLES.FOO — ignore prose prefixes ending in `_` (e.g. G.GUIDS.SOUNDSCAPE_*)
    for (const m of line.matchAll(/G\.GUIDS\.TABLES\.([A-Z][A-Z0-9_]*)/g)) {
      if (m[1].endsWith("_")) {
        continue;
      }
      if (!assigned.tables.has(m[1])) {
        missing.push({ file: rel, ref: `G.GUIDS.TABLES.${m[1]}`, line: i + 1 });
      }
    }
    // G.GUIDS.FOO (not TABLES)
    for (const m of line.matchAll(/G\.GUIDS\.([A-Z][A-Z0-9_]*)/g)) {
      if (m[1] === "TABLES" || m[1].endsWith("_")) {
        continue;
      }
      if (!assigned.top.has(m[1])) {
        missing.push({ file: rel, ref: `G.GUIDS.${m[1]}`, line: i + 1 });
      }
    }
    // Role-name keys inside G.mapGuidKeys({ FOO = ... }) / G.requireGuid("FOO")
    for (const m of line.matchAll(/G\.requireGuid\(\s*"([A-Z][A-Z0-9_]*)"\s*\)/g)) {
      if (!assigned.top.has(m[1])) {
        missing.push({ file: rel, ref: `G.requireGuid("${m[1]}")`, line: i + 1 });
      }
    }
    for (const m of line.matchAll(/G\.requireGuidString\(\s*"([A-Z][A-Z0-9_]*)"/g)) {
      if (!assigned.top.has(m[1])) {
        missing.push({ file: rel, ref: `G.requireGuidString("${m[1]}")`, line: i + 1 });
      }
    }
  }

  // Role keys in G.mapGuidKeys({ ... }) blocks: KEY = at 2-space indent inside mapGuidKeys calls
  // Heuristic: after `G.mapGuidKeys({` until matching `}, "Label")` / `})`
  let mapStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/G\.mapGuidKeys\s*\(\s*\{/.test(lines[i])) {
      mapStart = i;
      continue;
    }
    if (mapStart < 0) {
      continue;
    }
    if (/^\s*\}\s*,/.test(lines[i]) || /^\s*\}\s*\)/.test(lines[i])) {
      for (let j = mapStart + 1; j < i; j++) {
        const km = lines[j].match(/^\s{2}([A-Z][A-Z0-9_]*)\s*=/);
        if (km && !assigned.top.has(km[1])) {
          missing.push({ file: rel, ref: `G.mapGuidKeys key ${km[1]}`, line: j + 1 });
        }
      }
      mapStart = -1;
    }
  }

  return missing;
}

function main() {
  const quiet = process.argv.includes("--quiet");

  if (!existsSync(GUIDS_FILE)) {
    console.error(`[guid-refs-gate] missing ${relative(REPO_ROOT, GUIDS_FILE)}`);
    process.exitCode = 1;
    return;
  }

  let assigned;
  try {
    assigned = loadAssignedKeys(readFileSync(GUIDS_FILE, "utf8"));
  } catch (e) {
    console.error(`[guid-refs-gate] ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
    return;
  }

  /** @type {string[]} */
  const files = [];
  for (const dir of SCAN_DIRS) {
    collectFiles(dir, files);
  }

  /** @type {{ file: string, ref: string, line: number }[]} */
  const missing = [];
  for (const file of files) {
    missing.push(...findMissingRefs(file, readFileSync(file, "utf8"), assigned));
  }

  // Deduplicate identical ref+file+line
  const seen = new Set();
  const unique = missing.filter((row) => {
    const key = `${row.file}:${row.line}:${row.ref}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  if (unique.length > 0) {
    const detail = `${unique.length} missing GUID role ref(s)`;
    writeLog(false, detail);
    console.error(`[guid-refs-gate] FAIL — ${detail}`);
    console.error(
      "Deleted or renamed G.GUIDS entries are still referenced. Restore the GUID or remove the call site."
    );
    for (const row of unique.slice(0, 50)) {
      console.error(`  ${row.file}:${row.line}  ${row.ref}`);
    }
    if (unique.length > 50) {
      console.error(`  … and ${unique.length - 50} more`);
    }
    process.exitCode = 1;
    return;
  }

  const msg = `ok (${files.length} files, ${assigned.top.size} GUID keys, ${assigned.tables.size} TABLES keys)`;
  writeLog(true, msg);
  if (!quiet) {
    console.log(`[guid-refs-gate] ${msg}`);
  }
}

main();
