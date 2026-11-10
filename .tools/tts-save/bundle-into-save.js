#!/usr/bin/env node
"use strict";

/**
 * Bundle `.tts/objects` stubs into the main save and the session-start save.
 * Used at the end of FULL after session-start assetbundle pruning.
 *
 * Agent guidance: .dev/TTS_BUNDLING_SETUP.md (Bundle Into Save).
 */

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("./resolve-save-path.js");

const REPO_ROOT = path.resolve(__dirname, "../..");
const SAVEFILE_DIST = path.resolve(REPO_ROOT, "../tts-tools/packages/savefile/dist");

function loadBundleIntoSave() {
  const entry = path.join(SAVEFILE_DIST, "index.js");
  if (!fs.existsSync(entry)) {
    throw new Error(
      `tts-tools savefile build not found at ${entry}. From the tts-tools repo run: npm run build --prefix packages/savefile`
    );
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(entry);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "no-backup") {
      args.noBackup = true;
      continue;
    }
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
  const mainSaveName = args.saveName || "230";
  const sessionSaveName = args.sessionSaveName || "9001";
  const objectsDir = path.resolve(REPO_ROOT, args.objects || ".tts/objects");
  const includeDir = path.resolve(REPO_ROOT, args.include || ".");

  const mainResolved = resolveSavePath(mainSaveName, args.savesDir);
  const sessionResolved = resolveSavePath(sessionSaveName, args.savesDir || mainResolved.savesDir);

  if (!fs.existsSync(objectsDir)) {
    throw new Error(
      `Objects directory missing: ${objectsDir}. Run Get Objects in TTS Tools (or ensure stubs exist) before Bundle Into Save.`
    );
  }
  if (!fs.existsSync(mainResolved.savePath)) {
    throw new Error(`Main save not found: ${mainResolved.savePath}`);
  }

  const { bundleIntoSaveFiles } = loadBundleIntoSave();
  const targets = [
    {
      path: mainResolved.savePath,
      preserveGlobal: false,
      backup: !args.noBackup,
    },
  ];
  if (fs.existsSync(sessionResolved.savePath)) {
    targets.push({
      path: sessionResolved.savePath,
      preserveGlobal: true,
      backup: !args.noBackup,
    });
  } else {
    console.warn(
      `[tts-save:bundle-into-save] Session-start save not found (${sessionResolved.savePath}); updating main save only.`
    );
  }

  console.log(`Objects: ${objectsDir}`);
  console.log(`Include: ${includeDir}`);
  for (const target of targets) {
    console.log(`Target:  ${target.path}${target.preserveGlobal ? " (preserve Global)" : ""}`);
  }

  const result = bundleIntoSaveFiles({
    objectsDir,
    includePaths: [includeDir],
    targets,
  });

  console.log(`Bundled scripts for ${result.scriptsBundled} GUID(s)`);
  for (const file of result.files) {
    console.log(
      `  ${path.basename(file.path)}: updated ${file.stats.updated}` +
        (file.stats.skippedGlobal ? ", Global preserved" : "") +
        (file.stats.missingInSave.length ? `, ${file.stats.missingInSave.length} stub GUID(s) not in save` : "")
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
