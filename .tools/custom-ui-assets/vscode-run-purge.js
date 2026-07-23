#!/usr/bin/env node
"use strict";

/**
 * VS Code / Cursor task adapter for purge-by-pattern.
 *
 * argv: <pattern> <saveName> <dry-run|write> <global|objects> <guidsOrDash>
 */

const { spawnSync } = require("child_process");
const path = require("path");

function main() {
  const [pattern, saveName, writeMode, targetMode, guidsRaw] = process.argv.slice(2);
  if (!pattern || !saveName || !writeMode || !targetMode) {
    console.error(
      "Usage: node vscode-run-purge.js <pattern> <saveName> <dry-run|write> <global|objects> <guids|->",
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

  const target = String(targetMode).trim().toLowerCase();
  if (target === "objects" || target === "object" || target === "guids") {
    const guids = String(guidsRaw || "").trim();
    if (guids === "" || guids === "-" || guids === "_") {
      console.error(
        "[vscode-run-purge] Object mode requires a comma-separated GUID list (not blank / '-').",
      );
      process.exit(2);
    }
    args.push("--guids", guids);
  } else if (target !== "global" && target !== "save" && target !== "-") {
    console.error(`[vscode-run-purge] Unknown target mode: ${targetMode} (use global or objects)`);
    process.exit(2);
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
