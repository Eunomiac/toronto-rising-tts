#!/usr/bin/env node
/**
 * Lua API gate: counts pcall() and raw Wait.* usage in game-facing Lua; fails the build when
 * any metric increases since the last logged baseline (unless you edit the log / bump baselines).
 *
 * Scanned roots: core/, global/, lib/, objects/, ui/ — recursive *.ttslua only.
 *
 * Metrics:
 *   pcall           — /\bpcall\s*\(/g in all scanned files
 *   waitTime        — /\bWait\.time\s*\(/g and /\bW\.time\s*\(/g outside lib/util.ttslua
 *   waitCondition   — /\bWait\.condition\s*\(/g outside lib/util.ttslua
 *
 * Log: .dev/build-logs/pcall-gate.txt
 * Format (current): ISO8601\tpcall=N\twaitTime=N\twaitCondition=N
 * Legacy (2-field): ISO8601\tpcallOnly — wait baselines treated as missing (first run writes all three).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname, "..", "..");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "pcall-gate.txt");
const SCAN_ROOTS = ["core", "global", "lib", "objects", "ui"];
const UTIL_ALLOWLIST = join(REPO_ROOT, "lib", "util.ttslua");

const PCALL_CALL_RE = /\bpcall\s*\(/g;
const WAIT_TIME_RE = /\bWait\.time\s*\(/g;
const W_TIME_RE = /\bW\.time\s*\(/g;
const WAIT_CONDITION_RE = /\bWait\.condition\s*\(/g;

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
 * @param {string} src
 * @param {RegExp} re
 * @returns {number}
 */
function countMatches(src, re) {
  const m = src.match(re);
  return m ? m.length : 0;
}

/**
 * @param {string} filePath
 * @param {boolean} isUtilAllowlist
 * @returns {{ pcall: number, waitTime: number, waitCondition: number }}
 */
function countInFile(filePath, isUtilAllowlist) {
  const src = readFileSync(filePath, "utf8");
  const pcall = countMatches(src, PCALL_CALL_RE);
  if (isUtilAllowlist) {
    return { pcall, waitTime: 0, waitCondition: 0 };
  }
  const waitTime = countMatches(src, WAIT_TIME_RE) + countMatches(src, W_TIME_RE);
  const waitCondition = countMatches(src, WAIT_CONDITION_RE);
  return { pcall, waitTime, waitCondition };
}

/**
 * @returns {{ pcall: number, waitTime: number, waitCondition: number }}
 */
function collectTotals() {
  const totals = { pcall: 0, waitTime: 0, waitCondition: 0 };
  for (const root of SCAN_ROOTS) {
    const abs = join(REPO_ROOT, root);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      continue;
    }
    walkTtslua(abs, (fp) => {
      const isUtil = fp === UTIL_ALLOWLIST;
      const c = countInFile(fp, isUtil);
      totals.pcall += c.pcall;
      totals.waitTime += c.waitTime;
      totals.waitCondition += c.waitCondition;
    });
  }
  return totals;
}

/**
 * @param {string} raw
 * @returns {{ pcall: number, waitTime: number | null, waitCondition: number | null } | null}
 */
function parseBaselineLine(raw) {
  const line = raw.trim();
  if (line === "" || line.startsWith("#")) {
    return null;
  }
  const parts = line.split("\t");
  if (parts.length >= 4) {
    const pcall = Number.parseInt(parts[1].replace(/^pcall=/, ""), 10);
    const waitTime = Number.parseInt(parts[2].replace(/^waitTime=/, ""), 10);
    const waitCondition = Number.parseInt(parts[3].replace(/^waitCondition=/, ""), 10);
    if (Number.isFinite(pcall) && Number.isFinite(waitTime) && Number.isFinite(waitCondition)) {
      return { pcall, waitTime, waitCondition };
    }
  }
  if (parts.length === 2) {
    const pcall = Number.parseInt(String(parts[1]).trim(), 10);
    if (Number.isFinite(pcall)) {
      return { pcall, waitTime: null, waitCondition: null };
    }
  }
  const last = parts[parts.length - 1];
  const legacyPcall = Number.parseInt(String(last).trim(), 10);
  if (Number.isFinite(legacyPcall)) {
    return { pcall: legacyPcall, waitTime: null, waitCondition: null };
  }
  return null;
}

/**
 * @returns {{ pcall: number, waitTime: number | null, waitCondition: number | null } | null}
 */
function readLastBaseline() {
  if (!existsSync(LOG_FILE)) {
    return null;
  }
  const text = readFileSync(LOG_FILE, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const v = parseBaselineLine(lines[i]);
    if (v !== null) {
      return v;
    }
  }
  return null;
}

/**
 * @param {{ pcall: number, waitTime: number, waitCondition: number }} current
 * @param {{ pcall: number, waitTime: number | null, waitCondition: number | null }} previous
 * @returns {string[]}
 */
function findRegressions(current, previous) {
  const failures = [];
  if (current.pcall > previous.pcall) {
    failures.push(`pcall call-sites=${current.pcall} exceeds baseline=${previous.pcall}`);
  }
  if (previous.waitTime !== null && current.waitTime > previous.waitTime) {
    failures.push(`Wait.time/W.time call-sites=${current.waitTime} exceeds baseline=${previous.waitTime}`);
  }
  if (previous.waitCondition !== null && current.waitCondition > previous.waitCondition) {
    failures.push(
      `Wait.condition call-sites=${current.waitCondition} exceeds baseline=${previous.waitCondition}`
    );
  }
  return failures;
}

function formatLogLine(iso, totals) {
  return `${iso}\tpcall=${totals.pcall}\twaitTime=${totals.waitTime}\twaitCondition=${totals.waitCondition}\n`;
}

function main() {
  const current = collectTotals();
  const iso = new Date().toISOString();

  mkdirSync(LOG_DIR, { recursive: true });

  const previous = readLastBaseline();

  if (previous === null) {
    const header = [
      "# Lua API gate log — one line per successful check:",
      "# <ISO8601>\\tpcall=N\\twaitTime=N\\twaitCondition=N",
      "# waitTime/waitCondition exclude lib/util.ttslua (single authority for raw Wait.*).",
      "# To allow a higher count, set the LAST line before building.",
      "",
    ].join("\n");
    appendFileSync(LOG_FILE, header, "utf8");
    appendFileSync(LOG_FILE, formatLogLine(iso, current), "utf8");
    process.stdout.write(
      `[pcall-gate] First run: pcall=${current.pcall} waitTime=${current.waitTime} waitCondition=${current.waitCondition} → ${relative(REPO_ROOT, LOG_FILE)}\n`
    );
    return;
  }

  const effectivePrevious = {
    pcall: previous.pcall,
    waitTime: previous.waitTime !== null ? previous.waitTime : current.waitTime,
    waitCondition: previous.waitCondition !== null ? previous.waitCondition : current.waitCondition,
  };

  const failures = findRegressions(current, effectivePrevious);

  if (failures.length > 0) {
    process.stderr.write(
      [
        "[pcall-gate] FAILED:",
        ...failures.map((f) => `  - ${f}`),
        `Scanned trees: ${SCAN_ROOTS.join(", ")} (recursive *.ttslua); Wait.* allowed only in lib/util.ttslua`,
        `To approve increases, edit the LAST data line in:`,
        `  ${LOG_FILE}`,
        `…so each metric is ≥ current (pcall=${current.pcall}, waitTime=${current.waitTime}, waitCondition=${current.waitCondition}), then re-run.`,
        "",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  appendFileSync(LOG_FILE, formatLogLine(iso, current), "utf8");
  process.stdout.write(
    `[pcall-gate] OK: pcall=${current.pcall} waitTime=${current.waitTime} waitCondition=${current.waitCondition} (baseline pcall=${effectivePrevious.pcall} waitTime=${effectivePrevious.waitTime} waitCondition=${effectivePrevious.waitCondition}) → ${relative(REPO_ROOT, LOG_FILE)}\n`
  );
}

main();
