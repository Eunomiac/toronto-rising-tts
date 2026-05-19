#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md (Inject bundled Global into save JSON).

const fs = require("fs");
const path = require("path");

/**
 * Parse CLI args: `--key value` or boolean `--flag` (value "1").
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = "1";
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

/**
 * Read UTF-8 text file; fail if missing or empty.
 * @param {string} filePath
 * @param {string} label
 * @returns {string}
 */
function readRequiredTextFile(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  const text = fs.readFileSync(resolved, "utf8");
  if (text.length === 0) {
    throw new Error(`${label} is empty: ${resolved}`);
  }
  return text;
}

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
 * Build a timestamped backup path beside the target save file.
 * @param {string} savePath
 * @returns {string}
 */
function buildBackupPath(savePath) {
  const dir = path.dirname(savePath);
  const base = path.basename(savePath, ".json");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `${base}.pre-inject-global.${stamp}.json`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const savePathArg = args.save;
  if (!savePathArg) {
    throw new Error("Required argument missing: --save <path-to-save.json>");
  }

  const savePath = path.resolve(savePathArg);
  const outputSavePath = path.resolve(args.outputSave || savePath);
  const luaPath = path.resolve(args.lua || ".tts/bundled/Global.lua");
  const xmlPath = path.resolve(args.xml || ".tts/bundled/Global.xml");
  const dryRun = args.dryRun === "1" || args.dryRun === "true";
  const skipBackup = args.noBackup === "1" || args.noBackup === "true";

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const luaScript = readRequiredTextFile(luaPath, "Bundled Global Lua");
  const xmlUi = readRequiredTextFile(xmlPath, "Bundled Global XML");

  const saveText = fs.readFileSync(savePath, "utf8");
  /** @type {unknown} */
  let saveRootRaw;
  try {
    saveRootRaw = JSON.parse(saveText);
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Save JSON parse failed (${savePath}): ${message}`);
  }

  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }

  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const previousLuaLen =
    typeof saveRoot.LuaScript === "string" ? saveRoot.LuaScript.length : 0;
  const previousXmlLen = typeof saveRoot.XmlUI === "string" ? saveRoot.XmlUI.length : 0;

  saveRoot.LuaScript = luaScript;
  saveRoot.XmlUI = xmlUi;
  saveRoot.LuaScriptState = "";

  const outputJson = `${JSON.stringify(saveRoot, null, 2)}\n`;

  console.log("=== Inject bundled Global into TTS save ===");
  console.log(`Save:        ${savePath}`);
  console.log(`Output:      ${outputSavePath}`);
  console.log(`Global Lua:  ${luaPath} (${formatBytes(luaScript.length)})`);
  console.log(`Global XML:  ${xmlPath} (${formatBytes(xmlUi.length)})`);
  console.log(
    `Previous:    LuaScript ${formatBytes(previousLuaLen)}, XmlUI ${formatBytes(previousXmlLen)}`
  );
  console.log(`New total:   ${formatBytes(outputJson.length)} (formatted save file)`);

  if (dryRun) {
    console.log("");
    console.log("Dry run only — save file was not modified.");
    return;
  }

  if (!skipBackup && savePath === outputSavePath) {
    const backupPath = buildBackupPath(savePath);
    fs.copyFileSync(savePath, backupPath);
    console.log(`Backup:      ${backupPath}`);
  }

  const parentDir = path.dirname(outputSavePath);
  fs.mkdirSync(parentDir, { recursive: true });
  fs.writeFileSync(outputSavePath, outputJson, "utf8");

  console.log("");
  console.log("Save updated successfully.");
  console.log("");
  console.log("NEXT (TTS):");
  console.log("1) Close Tabletop Simulator or load a different save slot first.");
  console.log("2) Load this save from the TTS menu (Scripts are read on load).");
  console.log("3) Verify behavior; save in-game if you want the slot persisted.");
}

main();
