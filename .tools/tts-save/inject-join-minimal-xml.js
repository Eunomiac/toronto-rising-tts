#!/usr/bin/env node
"use strict";

/**
 * Inject expanded join-minimal Global XmlUI into a TTS save for CustomUIAssets load experiments (TOR-439).
 *
 * Unlike tts-save:inject-global, this:
 * - Writes only saveRoot.XmlUI (does not replace LuaScript)
 * - Preserves LuaScriptState (patches joinXmlArmed / deferSetXml into it)
 * - Does not clear game state
 *
 * Usage (repo root):
 *   node .tools/tts-save/inject-join-minimal-xml.js --saveName 230
 *   npm run tts-save:inject-join-minimal -- --saveName 230
 *
 * Then File → Load that save in TTS (close TTS or switch slot first if the file is locked).
 */

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("./resolve-save-path.js");
const {
  expandXmlFile,
} = require("../../.dev/scripts/embed_ui_global_xml_docs.js");

/**
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
 * @param {string} savePath
 * @returns {string}
 */
function buildBackupPath(savePath) {
  const dir = path.dirname(savePath);
  const base = path.basename(savePath, ".json");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `${base}.pre-inject-join-minimal.${stamp}.json`);
}

/**
 * Patch LuaScriptState JSON so joinXmlArmed + deferSetXml survive load.
 * @param {unknown} rawState
 * @returns {{ state: Record<string, unknown>, created: boolean }}
 */
function patchJoinXmlArmedState(rawState) {
  /** @type {Record<string, unknown>} */
  let state;
  let created = false;
  if (rawState === null || typeof rawState !== "object" || Array.isArray(rawState)) {
    state = {};
    created = true;
  } else {
    state = /** @type {Record<string, unknown>} */ (rawState);
  }

  let controls = state.connectionControls;
  if (controls === null || typeof controls !== "object" || Array.isArray(controls)) {
    controls = {};
    state.connectionControls = controls;
  }
  const cc = /** @type {Record<string, unknown>} */ (controls);
  cc.joinXmlArmed = true;
  cc.deferSetXml = true;
  return { state, created };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun === "1" || args.dryRun === "true";
  const skipBackup = args.noBackup === "1" || args.noBackup === "true";

  const saveInput = args.saveName || args.save;
  if (!saveInput) {
    throw new Error("Required: --saveName <id> or --save <path-to-save.json>");
  }

  const projectRoot = path.resolve(__dirname, "../..");
  const minimalRoot = path.join(projectRoot, "ui", "Global.join_minimal.xml");
  if (!fs.existsSync(minimalRoot)) {
    throw new Error(`Missing ui/Global.join_minimal.xml at ${minimalRoot}`);
  }

  let savePath;
  if (args.save && !args.saveName) {
    savePath = path.resolve(args.save);
  } else {
    ({ savePath } = resolveSavePath(saveInput, args.savesDir));
  }

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const minimalXml = expandXmlFile(projectRoot, minimalRoot, new Set());
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

  const previousXmlLen = typeof saveRoot.XmlUI === "string" ? saveRoot.XmlUI.length : 0;
  saveRoot.XmlUI = minimalXml;

  let statePatched = false;
  let stateCreated = false;
  const luaStateRaw = saveRoot.LuaScriptState;
  if (typeof luaStateRaw === "string" && luaStateRaw.trim() !== "") {
    let decoded;
    try {
      decoded = JSON.parse(luaStateRaw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`LuaScriptState JSON parse failed: ${message}`);
    }
    const patched = patchJoinXmlArmedState(decoded);
    stateCreated = patched.created;
    saveRoot.LuaScriptState = JSON.stringify(patched.state);
    statePatched = true;
  } else {
    console.warn(
      "WARNING: LuaScriptState empty — joinXmlArmed cannot be patched into state. " +
        "Arm in TTS then File → Save first, or load will use defaults (joinXmlArmed=false) " +
        "unless you Arm after load. XmlUI is still replaced with minimal."
    );
  }

  console.log("=== Inject join-minimal Global XmlUI into TTS save ===");
  console.log(`Save:     ${savePath}`);
  console.log(`XmlUI:    ${previousXmlLen} → ${minimalXml.length} bytes (minimal)`);
  console.log(
    `State:    ${statePatched ? `patched joinXmlArmed=true deferSetXml=true${stateCreated ? " (new object)" : ""}` : "skipped (empty LuaScriptState)"}`
  );
  console.log("LuaScript: unchanged (does not clear game scripts)");

  if (dryRun) {
    console.log("");
    console.log("Dry run only — save file was not modified.");
    return;
  }

  if (!skipBackup) {
    const backupPath = buildBackupPath(savePath);
    fs.copyFileSync(savePath, backupPath);
    console.log(`Backup:   ${backupPath}`);
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");
  console.log("");
  console.log("Save updated.");
  console.log("NEXT: Close TTS or switch slot, then File → Load this save.");
  console.log("Watch Loading for CustomUIAssets behavior vs minimal XmlUI.");
  console.log("Do NOT Save & Play / tts-save:inject-global before this load (those rewrite full XmlUI).");
}

main();
