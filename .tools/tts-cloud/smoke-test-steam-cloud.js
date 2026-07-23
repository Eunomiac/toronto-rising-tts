#!/usr/bin/env node
"use strict";

/**
 * Quick connectivity + Sites folder check (delegates to export-folder-csv).
 * Prefer: npm run tts-cloud:export -- Sites
 */

const { spawnSync } = require("child_process");
const path = require("path");

const exportScript = path.join(__dirname, "export-folder-csv.js");
const result = spawnSync(process.execPath, [exportScript, "Sites", ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: path.resolve(__dirname, "..", ".."),
});

process.exit(typeof result.status === "number" ? result.status : 1);
