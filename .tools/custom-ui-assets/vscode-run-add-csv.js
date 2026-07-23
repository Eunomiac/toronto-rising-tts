#!/usr/bin/env node
"use strict";

/**
 * VS Code / Cursor task adapter for add-from-csv.
 * Avoids empty process-task args (which can abort the task or bind the next flag as --guids).
 *
 * argv: <csv> <nameMatch> <nameReplace> <saveName> <guidsOrBlank> <dry-run|write>
 */

const { spawnSync } = require("child_process");
const path = require("path");

function main() {
  const [csv, nameMatch, nameReplace, saveName, guidsRaw, writeMode] = process.argv.slice(2);
  if (!csv || !nameMatch || nameReplace == null || !saveName || !writeMode) {
    console.error(
      "Usage: node vscode-run-add-csv.js <csv> <nameMatch> <nameReplace> <saveName> <guids|-> <dry-run|write>",
    );
    process.exit(2);
  }

  const args = [
    path.join(__dirname, "add-custom-ui-assets-from-csv.js"),
    "--csv",
    csv,
    "--name-match",
    nameMatch,
    "--name-replace",
    nameReplace,
    "--saveName",
    saveName,
  ];

  const guids = String(guidsRaw || "").trim();
  if (guids !== "" && guids !== "-" && guids !== "_") {
    args.push("--guids", guids);
  }

  const mode = String(writeMode).trim().toLowerCase();
  if (mode === "dry-run" || mode === "--dry-run") {
    args.push("--dry-run");
  } else if (mode !== "write" && mode !== "--write" && mode !== "apply") {
    console.error(`[vscode-run-add-csv] Unknown write mode: ${writeMode} (use dry-run or write)`);
    process.exit(2);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status == null ? 1 : result.status);
}

main();
