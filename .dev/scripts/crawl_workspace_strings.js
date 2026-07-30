"use strict";

/**
 * Workspace string crawl — hardcode SEARCH_NEEDLES, get a concise hit report.
 *
 * Usage (repo root):
 *   node .dev/scripts/crawl_workspace_strings.js
 *   node .dev/scripts/crawl_workspace_strings.js --json
 *
 * Edit SEARCH_NEEDLES below for each audit. Each entry is either a plain substring
 * or `{ re: /regex/, label: "name" }`.
 */

const fs = require("fs");
const path = require("path");

/**
 * Edit this list per audit.
 * Prefer regex with word boundaries when a plain substring would false-match
 * (e.g. `U.delay` vs `CU.delay`).
 *
 * @type {(string | { re: RegExp, label: string })[]}
 */
const SEARCH_NEEDLES = [
  { re: /\bU\.RunSequence\b/, label: "U.RunSequence" },
  { re: /\bU\.RunSequenceWithOptions\b/, label: "U.RunSequenceWithOptions" },
  { re: /\bU\.waitUntil\b/, label: "U.waitUntil" },
  { re: /\bU\.delay\s*\(/, label: "U.delay(" },
  { re: /\bU\.stopDelay\b/, label: "U.stopDelay" },
  { re: /\bU\.waitForCondition\b/, label: "U.waitForCondition" },
  { re: /\bU\.sequence\s*\(/, label: "U.sequence(" },
  { re: /\bU\.waitRestingSequence\b/, label: "U.waitRestingSequence" },
  { re: /\bU\.runAfterObjectPhysicsSettled\b/, label: "U.runAfterObjectPhysicsSettled" },
  { re: /\bCheckCoroutine\b/, label: "CheckCoroutine" },
];

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".external-agent-config",
  ".tts",
  "dist",
  "coverage",
  "tts-assets-backups",
]);

const SKIP_PATH_SUBSTR = [
  `${path.sep}.dev${path.sep}build-logs${path.sep}`,
  `${path.sep}.dev${path.sep}tts-api${path.sep}`,
  `${path.sep}lib${path.sep}ui_global_xml_docs.ttslua`,
  `${path.sep}lib${path.sep}e2e_playbook_`,
  // Self-hits in this crawler's needle list
  `${path.sep}.dev${path.sep}scripts${path.sep}crawl_workspace_strings.js`,
];

const TEXT_EXT = new Set([
  ".ttslua",
  ".lua",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".md",
  ".mdc",
  ".json",
  ".xml",
  ".yml",
  ".yaml",
]);

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_HITS_PER_NEEDLE = 40;

/**
 * @param {string | { re: RegExp, label: string }} needle
 * @returns {{ label: string, testLine: (line: string) => boolean }}
 */
function normalizeNeedle(needle) {
  if (typeof needle === "string") {
    return {
      label: needle,
      testLine: (line) => line.includes(needle),
    };
  }
  return {
    label: needle.label,
    testLine: (line) => needle.re.test(line),
  };
}

/**
 * @param {string} dir
 * @param {(abs: string) => void} onFile
 */
function walk(dir, onFile) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === "." || ent.name === "..") continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      walk(abs, onFile);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    if (SKIP_PATH_SUBSTR.some((s) => abs.includes(s))) continue;
    onFile(abs);
  }
}

/**
 * @param {string} text
 * @param {(line: string) => boolean} testLine
 * @returns {{ line: number, preview: string }[]}
 */
function findHits(text, testLine) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    // Reset lastIndex for global regexes if any
    if (!testLine(lines[i])) continue;
    out.push({
      line: i + 1,
      preview: lines[i].trim().slice(0, 140),
    });
    if (out.length >= MAX_HITS_PER_NEEDLE) break;
  }
  return out;
}

function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const asJson = process.argv.includes("--json");
  const needles = SEARCH_NEEDLES.map(normalizeNeedle);

  /** @type {Record<string, { file: string, line: number, preview: string }[]>} */
  const byNeedle = {};
  for (const n of needles) {
    byNeedle[n.label] = [];
  }

  walk(repoRoot, (abs) => {
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      return;
    }
    if (st.size > MAX_FILE_BYTES) return;

    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      return;
    }

    const rel = path.relative(repoRoot, abs).replace(/\\/g, "/");
    for (const n of needles) {
      // Cheap prefilter for string needles; regex always scans lines
      const hits = findHits(text, n.testLine);
      if (hits.length === 0) continue;
      for (const h of hits) {
        byNeedle[n.label].push({ file: rel, line: h.line, preview: h.preview });
      }
    }
  });

  if (asJson) {
    console.log(
      JSON.stringify(
        { searchNeedles: needles.map((n) => n.label), results: byNeedle },
        null,
        2,
      ),
    );
    return;
  }

  console.log("Workspace string crawl");
  console.log(`Root: ${repoRoot}`);
  console.log(`Needles: ${needles.length}`);
  console.log("");

  let total = 0;
  for (const n of needles) {
    const hits = byNeedle[n.label];
    total += hits.length;
    console.log(`=== ${n.label}  (${hits.length}${hits.length >= MAX_HITS_PER_NEEDLE ? "+" : ""}) ===`);
    if (hits.length === 0) {
      console.log("  (none)");
      console.log("");
      continue;
    }
    for (const h of hits) {
      console.log(`  ${h.file}:${h.line}`);
      console.log(`    ${h.preview}`);
    }
    console.log("");
  }
  console.log(`Total hits listed: ${total}`);
}

main();
