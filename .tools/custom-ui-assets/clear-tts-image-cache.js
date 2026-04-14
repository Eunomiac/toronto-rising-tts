#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md (TTS tooling); .dev/custom-ui-assets/.

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Delete all items inside a directory, preserving the directory.
 * @param {string} targetDir
 */
function clearDirectoryContents(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.log(`Skip (not found): ${targetDir}`);
    return;
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
  console.log(`Cleared: ${targetDir}`);
}

function main() {
  const preferredTtsModsDir = path.join(
    "D:",
    "OneDrive",
    "Documents",
    "My Games",
    "Tabletop Simulator",
    "Mods",
  );
  const fallbackTtsModsDir = path.join(
    os.homedir(),
    "OneDrive",
    "Documents",
    "My Games",
    "Tabletop Simulator",
    "Mods",
  );
  const ttsModsDir = fs.existsSync(preferredTtsModsDir)
    ? preferredTtsModsDir
    : fallbackTtsModsDir;
  const imagesDir = path.join(ttsModsDir, "Images");

  console.log("TTS Image Cache Clear");
  console.log("Make sure Tabletop Simulator is closed before continuing.");
  console.log(`Using Mods directory: ${ttsModsDir}`);
  clearDirectoryContents(imagesDir);
  console.log("Done. Reopen TTS and reload your save.");
}

main();
