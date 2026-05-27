#!/usr/bin/env node
"use strict";

// Invoked by VS Code task "Custom UI Assets: Build Manifest from Image Files".
// Agent guidance: .dev/custom-ui-assets/README.md

const path = require("path");
const { spawnSync } = require("child_process");
const readline = require("readline");

/**
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
 * @param {string} title
 */
function logSection(title) {
  console.log("");
  console.log("=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

/**
 * @param {string} scriptRel
 * @param {string[]} scriptArgs
 * @returns {number}
 */
function runNode(scriptRel, scriptArgs) {
  const scriptPath = path.resolve(scriptRel);
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
 * @param {string} question
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
function promptLine(question, defaultValue) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const hint = defaultValue ? ` [${defaultValue}]` : "";
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      const t = (answer || "").trim();
      const def = (defaultValue || "").trim();
      resolve(t !== "" ? t : def);
    });
  });
}

async function main() {
  const argvArgs = parseArgs(process.argv.slice(2));
  const mode = (argvArgs.mode || "").trim().toLowerCase();
  if (mode !== "folder" && mode !== "sites" && mode !== "npc-tokens") {
    console.error(
      'Missing or invalid --mode. Expected "--mode folder", "--mode sites", or "--mode npc-tokens" (from the Run Task picker).',
    );
    process.exit(1);
  }

  logSection("Custom UI — Build manifest");
  if (mode === "sites") {
    console.log("Mode: Site cards from C.Sites (lib/constants.ttslua)");
    console.log("Uses each row's `image` + `localImage`. Folder path from the task prompt is ignored.");
  } else if (mode === "npc-tokens") {
    console.log("Mode: NPC gameboard tokens (tokenFront_<key>.webp + tokenBack_<key>.webp pairs)");
  } else {
    console.log("Mode: Image folder (PNG convert + WEBP manifest scan)");
  }

  if (mode === "npc-tokens") {
    const folderModeDefault = "assets/images/new_images";
    let inputDir = (argvArgs.dir || "").trim();
    if (inputDir === "") {
      inputDir = (argvArgs.input || "").trim();
      if (inputDir.replace(/\\/g, "/") === folderModeDefault) {
        inputDir = "";
      }
    }
    if (inputDir === "") {
      if (process.stdin.isTTY) {
        logSection("Step 1 — NPC token image folder");
        console.log("Folder must contain paired tokenFront_<characterKey>.webp and tokenBack_<characterKey>.webp files.");
        inputDir = await promptLine("Relative path to NPC token WEBP folder", "assets/images/NPC Tokens");
      } else {
        inputDir = "assets/images/NPC Tokens";
        console.log(`Using default NPC token folder: ${inputDir}`);
      }
    }

    logSection("Step 2 — Validate pairs and write NPC token manifest + Lua module");
    const buildExit = runNode(".tools/custom-ui-assets/build-upload-manifest-from-npc-tokens.js", [
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
  } else if (mode === "sites") {
    logSection("Step 1 — Validate local files and write manifest + Lua module");
    console.log("Script: .tools/custom-ui-assets/build-upload-manifest-from-sites-constants.js");
    console.log("Inputs:  lib/constants.ttslua  (C.Sites)");
    console.log("Outputs:");
    console.log("  .dev/custom-ui-assets/manifest.json");
    console.log("  .dev/custom-ui-assets/manifest.lua");
    console.log("  lib/custom_ui_upload_manifest.ttslua");
    console.log("");
    console.log("For batched manifests or --skipMissing, run npm scripts or that script directly (see README).");

    const exit = runNode(".tools/custom-ui-assets/build-upload-manifest-from-sites-constants.js", [
      "--constants",
      "lib/constants.ttslua",
      "--out",
      ".dev/custom-ui-assets/manifest.json",
      "--luaOut",
      ".dev/custom-ui-assets/manifest.lua",
      "--moduleOut",
      "lib/custom_ui_upload_manifest.ttslua",
    ]);
    if (exit !== 0) {
      process.exit(exit);
    }
  } else {
    let inputDir = (argvArgs.input || "").trim();
    if (inputDir === "") {
      if (process.stdin.isTTY) {
        logSection("Step 1 — Image folder path");
        console.log("Relative to the workspace root (WEBP scanned; PNGs converted when present).");
        inputDir = await promptLine("Relative path to image folder", "assets\\images\\new_images");
      } else {
        inputDir = "assets\\images\\new_images";
        console.log(`No --input and non-interactive stdin; using default folder: ${inputDir}`);
      }
    }

    logSection("Step 2 — Convert PNG to WEBP (safe to re-run)");
    console.log("Script: .tools/custom-ui-assets/convert-png-to-webp.js");
    const convertExit = runNode(".tools/custom-ui-assets/convert-png-to-webp.js", ["--input", inputDir]);
    if (convertExit !== 0) {
      console.warn("WARN: PNG→WEBP step exited non-zero; continuing if WEBP files exist for the manifest scan.");
    }

    logSection("Step 3 — Scan folder and write manifest + Lua module");
    console.log("Script: .tools/custom-ui-assets/build-upload-manifest.js");
    console.log(`Input folder: ${inputDir}`);
    const buildExit = runNode(".tools/custom-ui-assets/build-upload-manifest.js", [
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
  }

  logSection("Next — Tabletop Simulator");
  console.log("1) Save & Play so Global loads the generated manifest module.");
  if (mode === "npc-tokens") {
    console.log("2) In the TTS console:");
    console.log("     lua DEBUG.spawnNpcTokenUploadBatch({ columns = 12, gap = 2, startY = 3 })");
  } else {
    console.log("2) In the TTS console, spawn upload tokens:");
    console.log("     lua DEBUG.spawnCustomUiUploadBatch()");
    console.log("   Large batches (optional grid):");
    console.log(
      "     lua DEBUG.spawnCustomUiUploadBatchFromManifest(customUiUploadManifest, { columns = 12, gap = 2, startY = 3 })",
    );
  }
  console.log("3) Cloud Manager → Upload All Loaded Files.");
  console.log("4) Save the game in TTS.");

  logSection("Next — Merge hosted URLs (VS Code task)");
  console.log('Run task:  "Custom UI Assets: Merge Hosted URLs into Save CustomUIAssets"');
  if (mode === "npc-tokens") {
    console.log("Use manifest path: .dev/custom-ui-assets/npc-token-manifest.json (npm merge with --manifest).");
    console.log("Then: npm run custom-ui-assets:extract-npc-token-urls");
  }
  console.log("Enter the same save name / id as the save you just wrote.");
  console.log("");

  logSection("Cleanup — TTS console");
  console.log("After merge (and another save if you want it persisted):");
  console.log("     lua DEBUG.clearCustomUiUploadTokens()");
  console.log("");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
