#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md (Inject bundled Global into save JSON).

const path = require("path");
const { spawnSync } = require("child_process");
const { resolveSavePath } = require("./resolve-save-path.js");

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const saveInput = args.saveName;
  if (!saveInput) {
    throw new Error("Required argument missing: --saveName <save id or filename>");
  }

  const { savesDir, saveFileName, savePath } = resolveSavePath(saveInput, args.savesDir);

  const injectScriptPath = path.resolve(".tools/tts-save/inject-bundled-global.js");
  const childArgs = [injectScriptPath, "--save", savePath];

  if (args.lua) {
    childArgs.push("--lua", path.resolve(args.lua));
  }
  if (args.xml) {
    childArgs.push("--xml", path.resolve(args.xml));
  }
  if (args.outputSave) {
    childArgs.push("--outputSave", path.resolve(args.outputSave));
  }

  console.log(`Saves folder: ${savesDir}`);
  console.log(`Save file:    ${saveFileName}`);
  console.log("");

  const result = spawnSync(process.execPath, childArgs, {
    stdio: "inherit",
    cwd: path.resolve("."),
  });

  if (typeof result.status === "number") {
    process.exit(result.status);
  }
  process.exit(1);
}

main();
