#!/usr/bin/env node
"use strict";

/**
 * VS Code / Cursor task adapter for tts-cloud export.
 * Avoids empty --out / --name-filter args being dropped or mis-bound.
 *
 * argv: <subfolder> <outOrBlank> <nameFilterOrBlank>
 */

const { spawnSync } = require("child_process");
const path = require("path");

function main() {
  const [subfolder, outRaw, filterRaw] = process.argv.slice(2);
  if (!subfolder) {
    console.error("Usage: node vscode-run-export.js <subfolder> <out|-> <nameFilter|->");
    process.exit(2);
  }

  const script = path.resolve(__dirname, "..", "tts-cloud", "export-folder-csv.js");
  const args = [script, subfolder];

  const out = String(outRaw || "").trim();
  if (out !== "" && out !== "-" && out !== "_") {
    args.push("--out", out);
  }

  const filter = String(filterRaw || "").trim();
  if (filter !== "" && filter !== "-" && filter !== "_") {
    args.push("--name-filter", filter);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status == null ? 1 : result.status);
}

main();
