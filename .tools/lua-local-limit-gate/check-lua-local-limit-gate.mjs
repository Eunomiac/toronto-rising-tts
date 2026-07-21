#!/usr/bin/env node
/**
 * Fails the build when any allowlisted Lua chunk exceeds the soft top-level local budget.
 *
 * Lua 5.1 hard limit is 200 locals+upvalues per function/chunk. This gate scans
 * column-0 `local` / `local function` bindings (chunk-level) and fails above MAX.
 *
 * Scoped to core/npc_gameboard*.ttslua (TOR-423).
 *
 * Usage: node .tools/lua-local-limit-gate/check-lua-local-limit-gate.mjs [--quiet]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CORE_DIR = join(REPO_ROOT, "core");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "lua-local-limit-gate.txt");

/** Soft budget under Lua 5.1's hard 200. */
const MAX_CHUNK_LOCALS = 180;

const FILE_PREFIX = "npc_gameboard";
const FILE_SUFFIX = ".ttslua";

const quiet = process.argv.includes("--quiet");

/**
 * Count column-0 local bindings in a Lua chunk.
 * `local a, b = ...` counts as two. `local function foo` counts as one.
 * @param {string} src
 * @returns {{ count: number, names: string[] }}
 */
function countChunkLocals(src) {
  const names = [];
  const lines = src.split(/\r?\n/);
  for (const line of lines) {
    let m = line.match(/^local\s+function\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (m) {
      names.push(m[1]);
      continue;
    }
    m = line.match(/^local\s+([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)/);
    if (m) {
      for (const part of m[1].split(/\s*,\s*/)) {
        const name = part.trim();
        if (name) names.push(name);
      }
    }
  }
  return { count: names.length, names };
}

function listTargetFiles() {
  const entries = readdirSync(CORE_DIR);
  return entries
    .filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(FILE_SUFFIX))
    .sort()
    .map((name) => join(CORE_DIR, name));
}

function main() {
  const files = listTargetFiles();
  if (files.length === 0) {
    console.error(`[lua-local-limit-gate] no files matching core/${FILE_PREFIX}*${FILE_SUFFIX}`);
    process.exit(1);
  }

  const rows = [];
  let failed = false;
  for (const filePath of files) {
    const src = readFileSync(filePath, "utf8");
    const { count } = countChunkLocals(src);
    const rel = filePath.slice(REPO_ROOT.length + 1).replace(/\\/g, "/");
    const ok = count <= MAX_CHUNK_LOCALS;
    if (!ok) failed = true;
    rows.push({ rel, count, ok });
    if (!quiet) {
      const mark = ok ? "OK" : "FAIL";
      console.log(`[lua-local-limit-gate] ${mark} ${rel}: ${count} / ${MAX_CHUNK_LOCALS}`);
    }
  }

  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  const logLine =
    stamp +
    "\t" +
    rows.map((r) => `${r.rel}=${r.count}${r.ok ? "" : "!"}`).join("\t") +
    "\n";
  writeFileSync(LOG_FILE, logLine, { flag: "a" });

  if (failed) {
    console.error(
      `[lua-local-limit-gate] one or more files exceed ${MAX_CHUNK_LOCALS} chunk-level locals (Lua 5.1 hard limit is 200).`
    );
    process.exit(1);
  }

  if (!quiet) {
    console.log(`[lua-local-limit-gate] all ${rows.length} file(s) within budget`);
  }
}

main();
