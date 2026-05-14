#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md; .dev/custom-ui-assets/ (manifest sources).

const path = require("path");
const { spawnSync } = require("child_process");
const readline = require("readline");

/**
 * Parse CLI args: `--key value` or boolean `--flag` (value "1").
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

  const mode = (args.mode || "directory").trim().toLowerCase();
  const saveName = args.saveName;
  if (!saveName) {
    throw new Error("Required argument missing: --saveName <save number/name>");
  }

  const buildDirScript = path.resolve(".tools/custom-ui-assets/build-upload-manifest.js");
  const buildSitesScript = path.resolve(".tools/custom-ui-assets/build-upload-manifest-from-sites-constants.js");
  const convertScript = path.resolve(".tools/custom-ui-assets/convert-png-to-webp.js");
  const mergeByNameScript = path.resolve(".tools/custom-ui-assets/merge-custom-ui-assets-from-save-name.js");

  if (mode === "directory") {
    const inputDir = args.input;
    if (!inputDir) {
      throw new Error('Required argument missing: --input <relative image folder> (or use --mode sites-from-constants)');
    }

    console.log("=== Mode: directory (PNG -> WEBP, scan folder) ===");
    console.log("");
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
    const buildExit = runNodeScript(buildDirScript, [
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
  } else if (mode === "sites-from-constants") {
    const constantsPath = args.constants || "lib/constants.ttslua";
    const skipMissing = args.skipMissing === "1" || args.skipMissing === "true";

    console.log("=== Mode: sites-from-constants (C.Sites image + localImage) ===");
    console.log("");
    console.log("=== Step 1/3: Skipped (no folder PNG conversion) ===");
    console.log("");
    console.log("=== Step 2/3: Build manifest from lib/constants.ttslua C.Sites ===");
    const siteArgs = [
      "--constants",
      constantsPath,
      "--out",
      ".dev/custom-ui-assets/manifest.json",
      "--luaOut",
      ".dev/custom-ui-assets/manifest.lua",
      "--moduleOut",
      "lib/custom_ui_upload_manifest.ttslua",
    ];
    if (skipMissing) {
      siteArgs.push("--skipMissing");
    }
    if (args.batch === "1" || args.batch === "true") {
      siteArgs.push("--batch");
    }
    if (args.batchMax !== undefined && String(args.batchMax).length > 0) {
      siteArgs.push("--batchMax", String(args.batchMax));
    }
    if (args.batchStart !== undefined && String(args.batchStart).trim() !== "") {
      siteArgs.push("--batchStart", String(args.batchStart).trim());
    }
    const buildExit = runNodeScript(buildSitesScript, siteArgs);
    if (buildExit !== 0) {
      process.exit(buildExit);
    }
  } else {
    throw new Error(`Unknown --mode "${mode}" (use "directory" or "sites-from-constants")`);
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
