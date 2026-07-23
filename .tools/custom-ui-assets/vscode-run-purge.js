#!/usr/bin/env node
"use strict";

/**
 * VS Code / Cursor task adapter for purge-by-pattern.
 * Avoids empty process-task args (which can abort the task or bind the next flag as --guids).
 *
 * argv: <pattern> <saveName> <guidsOrBlank> <dry-run|write>
 */

const { spawnSync } = require("child_process");
const path = require("path");

function main() {
  const [pattern, saveName, guidsRaw, writeMode] = process.argv.slice(2);
  if (!pattern || !saveName || !writeMode) {
    console.error(
      "Usage: node vscode-run-purge.js <pattern> <saveName> <guids|-> <dry-run|write>",
    );
    process.exit(2);
  }

  const args = [
    path.join(__dirname, "purge-custom-ui-assets-by-pattern.js"),
    "--pattern",
    pattern,
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
    console.error(`[vscode-run-purge] Unknown write mode: ${writeMode} (use dry-run or write)`);
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
