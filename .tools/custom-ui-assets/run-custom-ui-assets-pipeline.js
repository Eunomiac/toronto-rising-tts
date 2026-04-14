#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md; .dev/custom-ui-assets/ (manifest sources).

const path = require("path");
const { spawnSync } = require("child_process");
const readline = require("readline");

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
 * Run a node script and inherit stdio.
 * @param {string} scriptPath
 * @param {string[]} scriptArgs
 * @returns {number}
 */
function runNodeScript(scriptPath, scriptArgs) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    stdio: "inherit",
    cwd: path.resolve("."),
  });
  if (typeof result.status === "number") {
    return result.status;
  }
  return 1;
}

/**
 * Wait for Enter key in terminal.
 * @param {string} prompt
 * @returns {Promise<void>}
 */
function waitForEnter(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const inputDir = args.input;
  const saveName = args.saveName;
  if (!inputDir) {
    throw new Error("Required argument missing: --input <relative image folder>");
  }
  if (!saveName) {
    throw new Error("Required argument missing: --saveName <save number/name>");
  }

  const buildScript = path.resolve(".tools/custom-ui-assets/build-upload-manifest.js");
  const convertScript = path.resolve(".tools/custom-ui-assets/convert-png-to-webp.js");
  const mergeByNameScript = path.resolve(".tools/custom-ui-assets/merge-custom-ui-assets-from-save-name.js");

  console.log("=== Step 1/3: Convert PNG files to WEBP ===");
  const convertExit = runNodeScript(convertScript, [
    "--input",
    inputDir,
  ]);
  if (convertExit !== 0) {
    process.exit(convertExit);
  }

  console.log("");
  console.log("=== Step 2/3: Build manifest files (WEBP only) ===");
  const buildExit = runNodeScript(buildScript, [
    "--input",
    inputDir,
    "--extensions",
    "webp",
    "--out",
    ".dev/custom-ui-assets/manifest.json",
    "--luaOut",
    ".dev/custom-ui-assets/manifest.lua",
    "--moduleOut",
    "lib/custom_ui_upload_manifest.ttslua",
  ]);
  if (buildExit !== 0) {
    process.exit(buildExit);
  }

  console.log("");
  console.log("=== Manual TTS Steps Required ===");
  console.log("1) In TTS, run Save & Play.");
  console.log("2) In TTS console, run: lua DEBUG.spawnCustomUiUploadBatch()");
  console.log("3) Open Cloud Manager and click Upload All Loaded Files.");
  console.log("4) Save the game.");
  console.log("");
  await waitForEnter("Press Enter after you finish the manual TTS steps...");

  console.log("");
  console.log("=== Step 3/3: Merge hosted URLs into save CustomUIAssets ===");
  const mergeExit = runNodeScript(mergeByNameScript, [
    "--saveName",
    saveName,
    "--manifest",
    ".dev/custom-ui-assets/manifest.json",
    "--assetsOut",
    ".dev/custom-ui-assets/generated-assets.json",
  ]);
  if (mergeExit !== 0) {
    process.exit(mergeExit);
  }

  console.log("");
  console.log("Pipeline complete.");
  console.log("Next (in TTS): lua DEBUG.clearCustomUiUploadTokens()");
}

main().catch((error) => {
  console.error(String(error && error.message ? error.message : error));
  process.exit(1);
});
