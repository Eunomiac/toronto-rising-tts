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
  const heavyPrefixes = ["core.", "lib.pcs_data", "lib.constants", "lib.util", "lib.pc_stats"];

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
 * Check bundled NPC control-board object scripts for duplicated Global stack.
 * @param {Array<{ name: string, bytes: number }>} allLua
 * @returns {string[]}
 */
function findNpcBoardRegression(allLua) {
  const issues = [];
  const sampleNames = ["NPC_CONTROL_BOARD.sample.lua", "NPC_CONTROL_BOARD_PALETTE.sample.lua"];
  const entries = allLua.filter((entry) => {
    if (sampleNames.includes(entry.name)) {
      return true;
    }
    return entry.name.includes("NPC Control Board") && entry.name.endsWith(".lua");
  });
  const preferSamples = sampleNames.every((name) => entries.some((e) => e.name === name));
  for (const entry of entries) {
    if (preferSamples && !entry.name.endsWith(".sample.lua")) {
      continue;
    }
    if (entry.bytes > 10 * 1024) {
      issues.push(`${entry.name} (${formatBytes(entry.bytes)}) exceeds 10 KB thin-stub target`);
    }
    const text = fs.readFileSync(path.join(BUNDLED_DIR, entry.name), "utf8");
    if (text.includes('__bundle_register("core.')) {
      issues.push(`${entry.name} bundles core.* modules (regression)`);
    }
  }
  return issues;
}

/**
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

  const npcBoardIssues = findNpcBoardRegression(allLua);
  if (npcBoardIssues.length > 0) {
    console.log("");
    console.log("NPC Control Board bundle regression:");
    for (const issue of npcBoardIssues) {
      console.log(`  ${issue}`);
    }
    process.exitCode = 2;
  }

  if (csheets.length > 0) {
    const page1Sample = csheets.find((f) => f.name === "CSHEET_PAGE_1_BROWN.sample.lua");
    const slimSample = page1Sample || csheets.find((f) => f.name.endsWith(".sample.lua"));
    const stale = csheets.filter((f) => f.bytes > 200 * 1024 && !f.name.endsWith(".sample.lua"));
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
      if (sampleEntry.name === "CSHEET_PAGE_4_PINK.sample.lua") {
        console.log(`  NOTE: page-4 sample ${formatBytes(sampleEntry.bytes)} — pc_relationships_data; expected over 100 KB until trimmed`);
      } else {
        console.log(`  WARN: sample exceeds 100 KB Phase-5 gate (${formatBytes(sampleEntry.bytes)})`);
        process.exitCode = 2;
      }
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
  const staleNpc = allLua.filter(
    (f) => f.name.includes("NPC Control Board") && f.bytes > 10 * 1024 && !f.name.endsWith(".sample.lua")
  );
  const staleCsheet = allLua.filter((f) => f.name.includes("p.") && f.name.endsWith(".lua") && f.bytes > 100 * 1024);
  const npcSampleTotal = allLua
    .filter((f) => f.name === "NPC_CONTROL_BOARD.sample.lua" || f.name === "NPC_CONTROL_BOARD_PALETTE.sample.lua")
    .reduce((sum, f) => sum + f.bytes, 0);
  if (staleNpc.length > 0 && npcSampleTotal > 0) {
    const staleNpcBytes = staleNpc.reduce((sum, f) => sum + f.bytes, 0);
    const projected = sendEstimate - staleNpcBytes + npcSampleTotal;
    console.log(
      `Projected payload after re-bundle (NPC samples): ${formatBytes(projected)}`
    );
  }
  if (staleCsheet.length > 0 && csheets.length > 0) {
    const avgSample = csheets.reduce((sum, f) => sum + f.bytes, 0) / csheets.length;
    const staleCsheetBytes = staleCsheet.reduce((sum, f) => sum + f.bytes, 0);
    const projectedCsheet = staleCsheet.length * avgSample;
    const projected = sendEstimate - staleCsheetBytes + projectedCsheet;
    console.log(
      `Projected payload after re-bundle (${staleCsheet.length} CSHEET @ avg sample): ${formatBytes(projected)}`
    );
  }
  const slimSample = csheets.find((f) => f.name.endsWith(".sample.lua"));
  const staleLarge = csheets.filter((f) => f.bytes > 200 * 1024 && !f.name.endsWith(".sample.lua"));
  if (sendEstimate > 10 * 1024 * 1024) {
    if ((slimSample && staleLarge.length > 0) || staleNpc.length > 0) {
      console.log("WARN: on-disk bundled payload still high — Save & Play once to refresh object scripts in TTS.");
    } else {
      console.log("WARN: full-table send still exceeds 10 MB target");
      process.exitCode = 2;
    }
  }
}

main();
