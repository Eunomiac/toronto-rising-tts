#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md; .dev/custom-ui-assets/ (manifest sources).

const path = require("path");
const fs = require("fs");
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
  const buildNpcTokensScript = path.resolve(".tools/custom-ui-assets/build-upload-manifest-from-npc-tokens.js");
  const buildNpcGroupsScript = path.resolve(".tools/custom-ui-assets/build-upload-manifest-from-npc-groups.js");
  const extractNpcTokensScript = path.resolve(".tools/custom-ui-assets/extract-npc-token-hosted-urls.js");
  const reportNpcGapsScript = path.resolve(".tools/custom-ui-assets/report-npc-upload-registry-gaps.js");
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
  } else if (mode === "npc-tokens") {
    const inputDir = (args.input || args.dir || "assets/images/NPC Tokens").trim();

    console.log("=== Mode: npc-tokens (paired tokenFront_* + tokenBack_* WEBPs) ===");
    console.log("");
    console.log("=== Step 1/3: Build NPC token manifest ===");
    const buildExit = runNodeScript(buildNpcTokensScript, [
      "--dir",
      inputDir,
      "--out",
      ".dev/custom-ui-assets/npc-token-manifest.json",
      "--moduleOut",
      "lib/npc_token_upload_manifest.ttslua",
    ]);
    if (buildExit !== 0) {
      process.exit(buildExit);
    }
  } else if (mode === "npc-groups") {
    const inputDir = (args.input || args.dir || "assets/images/NPCs").trim();

    console.log("=== Mode: npc-groups (figurine + token 4-file sets) ===");
    console.log("");
    console.log("=== Step 1/4: Build NPC group manifest (skip already-hosted in save) ===");
    const groupBuildArgs = [
      "--dir",
      inputDir,
      "--saveName",
      saveName,
      "--out",
      ".dev/custom-ui-assets/npc-group-manifest.json",
      "--moduleOut",
      "lib/npc_group_upload_manifest.ttslua",
    ];
    if (args.batch === "1" || args.batch === "true") {
      groupBuildArgs.push("--batch");
    }
    if (args.batchMax !== undefined && String(args.batchMax).length > 0) {
      groupBuildArgs.push("--batchMax", String(args.batchMax));
    }
    if (args.batchStart !== undefined && String(args.batchStart).trim() !== "") {
      groupBuildArgs.push("--batchStart", String(args.batchStart).trim());
    }
    if (args.warnUnknownKeys === "1" || args.warnUnknownKeys === "true") {
      groupBuildArgs.push("--warnUnknownKeys");
    }
    const buildExit = runNodeScript(buildNpcGroupsScript, groupBuildArgs);
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
    throw new Error(
      `Unknown --mode "${mode}" (use "directory", "sites-from-constants", "npc-tokens", or "npc-groups")`,
    );
  }

  const manifestPath =
    mode === "npc-tokens"
      ? ".dev/custom-ui-assets/npc-token-manifest.json"
      : mode === "npc-groups"
        ? ".dev/custom-ui-assets/npc-group-manifest.json"
        : ".dev/custom-ui-assets/manifest.json";

  const assetsOutPath =
    mode === "npc-groups"
      ? ".dev/custom-ui-assets/npc-group-generated-assets.json"
      : ".dev/custom-ui-assets/generated-assets.json";

  let pendingCharacterCount = -1;
  if (mode === "npc-groups") {
    const manifestAbs = path.resolve(manifestPath);
    if (fs.existsSync(manifestAbs)) {
      const manifestData = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));
      pendingCharacterCount =
        typeof manifestData.characterCount === "number" ? manifestData.characterCount : -1;
    }
  }

  const skipManualTts = mode === "npc-groups" && pendingCharacterCount === 0;

  if (!skipManualTts) {
    console.log("");
    console.log("=== Manual TTS Steps Required ===");
    console.log("1) In TTS, run Save & Play.");
    if (mode === "npc-tokens") {
      console.log("2) In TTS console, run: lua DEBUG.spawnNpcTokenUploadBatch({ columns = 12, gap = 2, startY = 3 })");
    } else if (mode === "npc-groups") {
      console.log(
        "2) In TTS console, run: lua DEBUG.spawnNpcGroupUploadBatch({ columns = 12, gap = 2, startY = 3 })",
      );
    } else {
      console.log("2) In TTS console, run: lua DEBUG.spawnCustomUiUploadBatch()");
    }
    console.log("3) Open Cloud Manager and click Upload All Loaded Files.");
    console.log("4) Save the game.");
    console.log("");
    await waitForEnter("Press Enter after you finish the manual TTS steps...");
  } else {
    console.log("");
    console.log("=== Manual TTS Steps Skipped (no pending NPC groups in manifest) ===");
  }

  if (!skipManualTts) {
    console.log("");
    console.log("=== Merge hosted URLs into save CustomUIAssets ===");
    const mergeExit = runNodeScript(mergeByNameScript, [
      "--saveName",
      saveName,
      "--manifest",
      manifestPath,
      "--assetsOut",
      assetsOutPath,
    ]);
    if (mergeExit !== 0) {
      process.exit(mergeExit);
    }
  }

  if (mode === "npc-tokens" || (mode === "npc-groups" && !skipManualTts)) {
    console.log("");
    console.log("=== Extract paired NPC token URLs ===");
    const extractExit = runNodeScript(extractNpcTokensScript, []);
    if (extractExit !== 0) {
      process.exit(extractExit);
    }
  }

  if (mode === "npc-groups") {
    console.log("");
    console.log("=== Registry gap report (uploaded keys missing from D.characters) ===");
    const reportExit = runNodeScript(reportNpcGapsScript, [
      "--saveName",
      saveName,
      "--manifest",
      manifestPath,
      "--assetsOut",
      assetsOutPath,
    ]);
    if (reportExit !== 0) {
      process.exit(reportExit);
    }
  }

  console.log("");
  console.log("Pipeline complete.");
  if (!skipManualTts) {
    console.log("Next (in TTS): lua DEBUG.clearCustomUiUploadTokens()");
  }
  if (mode === "npc-tokens" || mode === "npc-groups") {
    console.log("Hosted token pairs: lib/npc_token_hosted_urls.ttslua");
  }
}

main().catch((error) => {
  console.error(String(error && error.message ? error.message : error));
  process.exit(1);
});
