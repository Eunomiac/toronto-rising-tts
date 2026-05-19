#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md (bundle size verification).

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const BUNDLED_DIR = path.join(REPO_ROOT, ".tts/bundled");
const REQUIRE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Format byte count for console output.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Resolve module id to file path (lib.util -> lib/util.ttslua).
 * @param {string} moduleId
 * @returns {string|null}
 */
function resolveModulePath(moduleId) {
  const rel = moduleId.replace(/\./g, "/");
  for (const ext of [".ttslua", ".lua"]) {
    const candidate = path.join(REPO_ROOT, `${rel}${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Walk require graph from entry module; return modules and total source bytes.
 * @param {string} entryModule
 * @returns {{ modules: string[], bytes: number, heavy: string[] }}
 */
function estimateRequireTree(entryModule) {
  const seen = new Set();
  const queue = [entryModule];
  const modules = [];
  let bytes = 0;
  const heavyPrefixes = ["core.", "lib.pcs_data", "lib.constants", "lib.util", "lib.csheet_page3_xml", "lib.pc_stats"];

  while (queue.length > 0) {
    const mod = queue.shift();
    if (seen.has(mod)) {
      continue;
    }
    seen.add(mod);
    modules.push(mod);

    const filePath = resolveModulePath(mod);
    if (!filePath) {
      continue;
    }
    const stat = fs.statSync(filePath);
    bytes += stat.size;

    const text = fs.readFileSync(filePath, "utf8");
    let match;
    REQUIRE_RE.lastIndex = 0;
    while ((match = REQUIRE_RE.exec(text)) !== null) {
      queue.push(match[1]);
    }
  }

  const heavy = modules.filter((mod) => heavyPrefixes.some((prefix) => mod === prefix || mod.startsWith(prefix)));
  return { modules, bytes, heavy };
}

/**
 * List bundled lua files matching a prefix.
 * @param {string} prefix
 * @returns {Array<{ name: string, bytes: number }>}
 */
function listLuaByPrefix(prefix) {
  if (!fs.existsSync(BUNDLED_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BUNDLED_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".lua"))
    .map((name) => {
      const fullPath = path.join(BUNDLED_DIR, name);
      const stat = fs.statSync(fullPath);
      return { name, bytes: stat.size };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * Count __bundle_register entries in a bundled lua file (luabundle output).
 * @param {string} filePath
 * @returns {number}
 */
function countBundleModules(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const matches = text.match(/__bundle_register\(/g);
  return matches ? matches.length : 0;
}

/**
 * Check bundled file for heavy module names (regression guard).
 * @param {string} filePath
 * @returns {string[]}
 */
function findHeavyModules(filePath) {
  const heavy = [
    "core.debug",
    "lib.pcs_data",
    "core.sync",
    "core.main",
    "lib.constants",
    "lib.util",
    "lib.csheet_page3_xml",
    "lib.pc_stats",
  ];
  const text = fs.readFileSync(filePath, "utf8");
  const found = [];
  for (const mod of heavy) {
    const pattern = `__bundle_register("${mod}"`;
    if (text.includes(pattern)) {
      found.push(mod);
    }
  }
  return found;
}

/**
 * Print require-tree estimate for csheet object entry.
 * @returns {number} exit code fragment
 */
function printCsheetEstimate() {
  const entry = "ui.ui_csheet";
  const { modules, bytes, heavy } = estimateRequireTree(entry);
  console.log("=== CSHEET require-tree estimate (source files) ===");
  console.log(`Entry: ${entry}`);
  console.log(`Modules: ${modules.length}, total ${formatBytes(bytes)}`);
  console.log(`Module list: ${modules.join(", ")}`);
  if (heavy.length === 0) {
    console.log("Heavy modules in tree: none (good)");
  } else {
    console.log(`Heavy modules in tree (regression): ${heavy.join(", ")}`);
    return 2;
  }
  if (bytes > 100 * 1024) {
    console.log(`WARN: source tree exceeds 100 KB Phase-5 gate (${formatBytes(bytes)})`);
    return 2;
  }
  console.log(`PASS: source tree under 100 KB target (${formatBytes(bytes)})`);
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  const estimateOnly = args.includes("--estimate");

  if (estimateOnly) {
    const code = printCsheetEstimate();
    if (code !== 0) {
      process.exitCode = code;
    }
    return;
  }

  if (!fs.existsSync(BUNDLED_DIR)) {
    printCsheetEstimate();
    console.log("");
    console.log(`Bundled directory not found: ${BUNDLED_DIR}`);
    console.log("Run Save & Play or: npm run tts-save:bundle-csheet-sample");
    process.exit(1);
  }

  const csheets = listLuaByPrefix("CSHEET");

  if (csheets.length === 0) {
    printCsheetEstimate();
    console.log("");
    console.log("No CSHEET bundles in .tts/bundled/ — run Save & Play or: npm run tts-save:bundle-csheet-sample");
  }

  const allLua = fs
    .readdirSync(BUNDLED_DIR)
    .filter((name) => name.endsWith(".lua"))
    .map((name) => {
      const bytes = fs.statSync(path.join(BUNDLED_DIR, name)).size;
      return { name, bytes };
    });

  const totalLua = allLua.reduce((sum, f) => sum + f.bytes, 0);
  const global = allLua.find((f) => f.name === "Global.lua");
  const dicebags = listLuaByPrefix("DICEBAG");
  const csheetTotal = csheets.reduce((sum, f) => sum + f.bytes, 0);

  console.log("");
  console.log("=== TTS bundled script sizes ===");
  console.log(`Directory: ${BUNDLED_DIR}`);
  console.log(`Lua files: ${allLua.length}, total ${formatBytes(totalLua)}`);
  if (global) {
    console.log(`Global.lua: ${formatBytes(global.bytes)}`);
  }
  console.log(`CSHEET *.lua: ${csheets.length} files, total ${formatBytes(csheetTotal)}`);
  if (csheets.length > 0) {
    const avg = csheetTotal / csheets.length;
    console.log(`CSHEET average: ${formatBytes(avg)}`);
    console.log(`CSHEET largest: ${csheets[0].name} (${formatBytes(csheets[0].bytes)})`);
    console.log(`CSHEET smallest: ${csheets[csheets.length - 1].name} (${formatBytes(csheetTotal > 0 ? csheets[csheets.length - 1].bytes : 0)})`);
  }
  if (dicebags.length > 0) {
    const diceTotal = dicebags.reduce((sum, f) => sum + f.bytes, 0);
    console.log(`DICEBAG *.lua: ${dicebags.length} files, avg ${formatBytes(diceTotal / dicebags.length)}`);
  }

  if (csheets.length > 0) {
    const slimSample = csheets.find((f) => f.name.endsWith(".sample.lua"));
    const stale = csheets.filter((f) => f.bytes > 200 * 1024);
    const sampleEntry = slimSample || csheets[csheets.length - 1];
    const sample = path.join(BUNDLED_DIR, sampleEntry.name);
    const moduleCount = countBundleModules(sample);
    const heavy = findHeavyModules(sample);
    console.log("");
    console.log(`Sample: ${sampleEntry.name} (${formatBytes(sampleEntry.bytes)})`);
    console.log(`  __bundle_register count: ${moduleCount}`);
    if (heavy.length === 0) {
      console.log("  Heavy modules: none (good)");
    } else {
      console.log(`  Heavy modules (regression): ${heavy.join(", ")}`);
      process.exitCode = 2;
    }
    if (sampleEntry.bytes > 100 * 1024) {
      console.log(`  WARN: sample exceeds 100 KB Phase-5 gate (${formatBytes(sampleEntry.bytes)})`);
      process.exitCode = 2;
    }
    if (stale.length > 0 && slimSample) {
      console.log("");
      console.log(`  NOTE: ${stale.length} stale CSHEET bundle(s) still > 200 KB — re-bundle via Save & Play to refresh in TTS.`);
      console.log(`  Slim local reference: ${slimSample.name} (${formatBytes(slimSample.bytes)})`);
    }
  }

  const sendEstimate = totalLua + fs
    .readdirSync(BUNDLED_DIR)
    .filter((name) => name.endsWith(".xml"))
    .reduce((sum, name) => sum + fs.statSync(path.join(BUNDLED_DIR, name)).size, 0);
  console.log("");
  console.log(`Estimated Save & Play lua+xml payload: ${formatBytes(sendEstimate)}`);
  const slimSample = csheets.find((f) => f.name.endsWith(".sample.lua"));
  const staleLarge = csheets.filter((f) => f.bytes > 200 * 1024);
  if (sendEstimate > 10 * 1024 * 1024) {
    if (slimSample && staleLarge.length > 0) {
      console.log("WARN: total payload still high due to stale object bundles — Save & Play once to refresh all CSHEET scripts.");
    } else {
      console.log("WARN: full-table send still exceeds 10 MB target");
      process.exitCode = 2;
    }
  }
}

main();
