#!/usr/bin/env node
"use strict";

// Agent guidance: dev/TTS_BUNDLING_SETUP.md; dev/custom-ui-assets/.

const path = require("path");
const { spawnSync } = require("child_process");

/**
 * Parse CLI args of shape: --key value
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}"`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

/**
 * Normalize user-entered save identifier into TS save JSON filename.
 * Accepts examples: "123", "TS_Save_123", "TS_Save_123.json"
 * @param {string} raw
 * @returns {string}
 */
function toSaveFileName(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Save name input is empty.");
  }

  let name = trimmed;
  if (!/^TS_Save_/i.test(name)) {
    name = `TS_Save_${name}`;
  }
  if (!/\.json$/i.test(name)) {
    name = `${name}.json`;
  }
  return name;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const saveInput = args.saveName;
  if (!saveInput) {
    throw new Error("Required argument missing: --saveName <save id or filename>");
  }

  const savesDir = "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves";
  const saveFileName = toSaveFileName(saveInput);
  const savePath = path.join(savesDir, saveFileName);

  const manifestPath = path.resolve(args.manifest || "dev/custom-ui-assets/manifest.json");
  const assetsOutPath = path.resolve(args.assetsOut || "dev/custom-ui-assets/generated-assets.json");

  const mergeScriptPath = path.resolve("tools/custom-ui-assets/merge-custom-ui-assets.js");
  const childArgs = [
    mergeScriptPath,
    "--save",
    savePath,
    "--manifest",
    manifestPath,
    "--assetsOut",
    assetsOutPath,
  ];

  const result = spawnSync(process.execPath, childArgs, {
    stdio: "inherit",
    cwd: path.resolve("."),
  });

  console.log("");
  console.log("NEXT (TTS):");
  console.log("1) In TTS console, run: lua DEBUG.clearCustomUiUploadTokens()");
  console.log("2) Save again if you want the cleanup persisted.");

  if (typeof result.status === "number") {
    process.exit(result.status);
  }
  process.exit(1);
}

main();
