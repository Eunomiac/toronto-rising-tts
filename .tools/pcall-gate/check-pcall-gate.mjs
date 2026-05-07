#!/usr/bin/env node
/**
 * pcall gate: counts pcall() invocations in game-facing Lua and fails the build if the
 * count increased since the last logged value (unless you edit the log / bump the baseline).
 *
 * Scanned roots (relative to repo root): core/, global/, lib/, objects/, ui/ — recursive *.ttslua only.
 * Count rule: non-overlapping matches of /\bpcall\s*\(/g (actual calls; ignores the word in prose).
 *
 * Log: .dev/build-logs/pcall-gate.txt (not *.log so .gitignore *.log does not drop it).
 * Format: one line per run, appended on success: ISO8601<TAB>count
 * Comparison: parse the INTEGER at end of the LAST non-empty, non-comment line as the baseline.
 * To approve a higher budget after intentional pcall adds, edit that last line's number or append
 * a new line with the new ceiling before re-running the build.
 *
 * First run (missing/empty log): writes baseline = current count and exits 0.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname, "..", "..");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "pcall-gate.txt");
const SCAN_ROOTS = ["core", "global", "lib", "objects", "ui"];
const PCALL_CALL_RE = /\bpcall\s*\(/g;

/**
 * @param {string} dir
 * @param {(f: string) => void} onFile
 */
function walkTtslua(dir, onFile) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTtslua(p, onFile);
    } else if (ent.isFile() && ent.name.endsWith(".ttslua")) {
      onFile(p);
    }
  }
}

/**
 * @param {string} filePath
 * @returns {number}
 */
function countPcallsInFile(filePath) {
  const src = readFileSync(filePath, "utf8");
  const m = src.match(PCALL_CALL_RE);
  return m ? m.length : 0;
}

/**
 * @returns {number}
 */
function collectTotalPcallCount() {
  let total = 0;
  for (const root of SCAN_ROOTS) {
    const abs = join(REPO_ROOT, root);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      continue;
    }
    walkTtslua(abs, (fp) => {
      total += countPcallsInFile(fp);
    });
  }
  return total;
}

/**
 * @param {string} raw
 * @returns {number | null}
 */
function parseBaselineFromLine(raw) {
  const line = raw.trim();
  if (line === "" || line.startsWith("#")) {
    return null;
  }
  const parts = line.split("\t");
  const last = parts[parts.length - 1];
  const n = Number.parseInt(String(last).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @returns {number | null} null if no baseline
 */
function readLastBaseline() {
  if (!existsSync(LOG_FILE)) {
    return null;
  }
  const text = readFileSync(LOG_FILE, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const v = parseBaselineFromLine(lines[i]);
    if (v !== null) {
      return v;
    }
  }
  return null;
}

function main() {
  const current = collectTotalPcallCount();
  const iso = new Date().toISOString();

  mkdirSync(LOG_DIR, { recursive: true });

  const previous = readLastBaseline();

  if (previous === null) {
    const header =
      [
        "# pcall gate log — baseline from first run. One line per successful check:",
        "# <ISO8601>\\t<count>",
        "# To allow a higher count, set the LAST line's count (or add a new last line) before building.",
        "",
      ].join("\n");
    appendFileSync(LOG_FILE, header, "utf8");
    appendFileSync(LOG_FILE, `${iso}\t${current}\n`, "utf8");
    process.stdout.write(`[pcall-gate] First run: logged count=${current} → ${relative(REPO_ROOT, LOG_FILE)}\n`);
    return;
  }

  if (current > previous) {
    process.stderr.write(
      [
        `[pcall-gate] FAILED: pcall call-sites=${current} exceeds last logged baseline=${previous}.`,
        `Scanned trees: ${SCAN_ROOTS.join(", ")} (recursive *.ttslua)`,
        `To approve this increase, edit the LAST data line in:`,
        `  ${LOG_FILE}`,
        `…so its trailing count is ≥ ${current}, then re-run.`,
        "",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  appendFileSync(LOG_FILE, `${iso}\t${current}\n`, "utf8");
  process.stdout.write(`[pcall-gate] OK: count=${current} (baseline was ${previous}) → appended to ${relative(REPO_ROOT, LOG_FILE)}\n`);
}

main();
