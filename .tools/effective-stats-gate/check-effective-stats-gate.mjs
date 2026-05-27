#!/usr/bin/env node
/**
 * Effective-stats gate: flags raw C.BloodPotency[ lookups outside allowlisted modules.
 * Manual base+temp tracker math is documented in Conditions System Guide §9 allowlist;
 * this gate catches the highest-risk duplicate (direct BP table indexing in game logic).
 *
 * Log: .dev/build-logs/effective-stats-gate.txt
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname, "..", "..");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "effective-stats-gate.txt");
const SCAN_ROOTS = ["core", "global", "lib", "objects", "ui"];

/** Files that may index C.BloodPotency directly. */
const ALLOWLIST = new Set([
  join(REPO_ROOT, "lib", "blood_potency_derived.ttslua"),
  join(REPO_ROOT, "lib", "effective_stats.ttslua"),
  join(REPO_ROOT, "lib", "constants.ttslua"),
  join(REPO_ROOT, "lib", "pc_stats.ttslua"),
  join(REPO_ROOT, "core", "roll_controller.ttslua"),
]);

const BP_INDEX_RE = /\bC\.BloodPotency\s*\[/g;

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

/** @returns {{ file: string, count: number }[]} */
function scanViolations() {
  /** @type {{ file: string, count: number }[]} */
  const violations = [];
  for (const root of SCAN_ROOTS) {
    walkTtslua(join(REPO_ROOT, root), (filePath) => {
      if (ALLOWLIST.has(filePath)) {
        return;
      }
      const src = readFileSync(filePath, "utf8");
      const matches = src.match(BP_INDEX_RE);
      if (matches && matches.length > 0) {
        violations.push({
          file: relative(REPO_ROOT, filePath).replace(/\\/g, "/"),
          count: matches.length,
        });
      }
    });
  }
  return violations;
}

function main() {
  const violations = scanViolations();
  const total = violations.reduce((sum, v) => sum + v.count, 0);
  const line = `${new Date().toISOString()}\tbloodPotencyIndex=${total}\n`;

  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
  appendFileSync(LOG_FILE, line);

  if (violations.length === 0) {
    console.log(`effective-stats-gate: OK (C.BloodPotency[ count=${total})`);
    process.exit(0);
  }

  console.error("effective-stats-gate: C.BloodPotency[ outside allowlist:");
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.count}`);
  }
  console.error("Allowlist: lib/blood_potency_derived, lib/effective_stats, lib/constants, lib/pc_stats, core/roll_controller (fallback path)");
  process.exit(1);
}

main();
