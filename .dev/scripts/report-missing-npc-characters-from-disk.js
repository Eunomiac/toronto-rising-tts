#!/usr/bin/env node
"use strict";

// Scan assets/images/NPCs for complete 4-file groups and emit Lua stubs for keys
// missing from D.characters in lib/npcs_data.ttslua.
//
// Usage:
//   node .dev/scripts/report-missing-npc-characters-from-disk.js
//   node .dev/scripts/report-missing-npc-characters-from-disk.js --dir assets/images/NPCs --out .dev/custom-ui-assets/npc-missing-characters-stubs.lua

const fs = require("fs");
const path = require("path");
const {
  DEFAULT_NPC_GROUP_IMAGE_DIR,
  extractCharacterKeysFromNpcsData,
  scanNpcGroupsInDirectory,
} = require("../../.tools/custom-ui-assets/lib/npc-asset-helpers");

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
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

/**
 * @param {string} characterKey
 * @returns {string}
 */
function renderCharacterStub(characterKey) {
  return [
    `  ${characterKey} = {`,
    `    name = "${characterKey}",`,
    `    fullName = "",`,
    `    labelColor = "rgba(255, 255, 255, 0.5)",`,
    `    figurine = {`,
    `      scale = 53,`,
    `    },`,
    `    groups = {`,
    `      group = 1`,
    `    },`,
    `    stats = {`,
    `      note = "Stats not set."`,
    `    }`,
    `  },`,
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const imageDir = path.resolve(args.dir || DEFAULT_NPC_GROUP_IMAGE_DIR);
  const npcsDataPath = path.resolve(args.npcsData || "lib/npcs_data.ttslua");
  const outPath = path.resolve(
    args.out || ".dev/custom-ui-assets/npc-missing-characters-stubs.lua",
  );

  if (!fs.existsSync(imageDir)) {
    console.error(`Image directory not found: ${imageDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(npcsDataPath)) {
    console.error(`npcs_data not found: ${npcsDataPath}`);
    process.exit(1);
  }

  const npcsText = fs.readFileSync(npcsDataPath, "utf8");
  const registeredKeys = extractCharacterKeysFromNpcsData(npcsText);

  const { groups, errors, skippedUnregisteredKeys } = scanNpcGroupsInDirectory(imageDir, {
    registeredKeys,
  });
  if (errors.length > 0) {
    console.warn(`Scan warnings (${errors.length}):`);
    for (const err of errors) {
      console.warn(`  - ${err}`);
    }
    console.warn("");
  }

  const missingKeys = skippedUnregisteredKeys;

  const lines = [
    `-- Generated ${new Date().toISOString()}`,
    `-- Source: ${path.relative(process.cwd(), imageDir).replace(/\\/g, "/")}`,
    `-- Registry: ${path.relative(process.cwd(), npcsDataPath).replace(/\\/g, "/")}`,
    `-- Complete registered disk groups: ${groups.length}; unregistered on disk: ${missingKeys.length}; registry size: ${registeredKeys.size}`,
    `-- Paste blocks below into D.characters in lib/npcs_data.ttslua`,
    "",
  ];

  if (missingKeys.length === 0) {
    lines.push("-- (none — every complete disk group is already in D.characters)");
  } else {
    for (const key of missingKeys) {
      lines.push(renderCharacterStub(key));
      lines.push("");
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join("\n").replace(/\n+$/, "")}\n`, "utf8");

  console.log(`Wrote ${missingKeys.length} stub(s) to ${outPath}`);
  if (missingKeys.length > 0) {
    console.log("Missing keys:");
    for (const key of missingKeys) {
      console.log(`  - ${key}`);
    }
  }
}

main();
