#!/usr/bin/env node
"use strict";

/**
 * VS Code / Cursor task adapter for add-from-csv.
 *
 * argv: <csv> <nameMatch> <nameReplace> <saveName> <dry-run|write> <global|objects> <guidsOrDash>
 *
 * Write mode is prompted before GUID fields so a cleared GUID prompt cannot
 * cancel the task before dry-run/write is chosen.
 */

const { spawnSync } = require("child_process");
const path = require("path");

function main() {
  const [csv, nameMatch, nameReplace, saveName, writeMode, targetMode, guidsRaw] =
    process.argv.slice(2);
  if (!csv || !nameMatch || nameReplace == null || !saveName || !writeMode || !targetMode) {
    console.error(
      "Usage: node vscode-run-add-csv.js <csv> <nameMatch> <nameReplace> <saveName> <dry-run|write> <global|objects> <guids|->",
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

  const target = String(targetMode).trim().toLowerCase();
  if (target === "objects" || target === "object" || target === "guids") {
    const guids = String(guidsRaw || "").trim();
    if (guids === "" || guids === "-" || guids === "_") {
      console.error(
        "[vscode-run-add-csv] Object mode requires a comma-separated GUID list (not blank / '-').",
      );
      process.exit(2);
    }
    args.push("--guids", guids);
  } else if (target !== "global" && target !== "save" && target !== "-") {
    console.error(`[vscode-run-add-csv] Unknown target mode: ${targetMode} (use global or objects)`);
    process.exit(2);
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
