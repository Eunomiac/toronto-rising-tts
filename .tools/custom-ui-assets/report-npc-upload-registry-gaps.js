#!/usr/bin/env node
"use strict";

// Report NPC asset registry gaps after manifest / inject:
// - disk groups skipped (not in D.characters)
// - registry keys missing complete disk groups
// - optional: tokens missing from save (from inject report)

const fs = require("fs");
const path = require("path");
const {
  DEFAULT_NPC_GROUP_IMAGE_DIR,
  ensureParentDir,
  extractCharacterKeysFromNpcsData,
  scanNpcGroupsInDirectory,
} = require("./lib/npc-asset-helpers");

const DEFAULT_REPORT_OUT = ".dev/custom-ui-assets/npc-registry-gap-report.txt";
const DEFAULT_MANIFEST = ".dev/custom-ui-assets/npc-group-manifest.json";
const DEFAULT_INJECT_REPORT = ".dev/custom-ui-assets/npc-inject-report.json";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest || DEFAULT_MANIFEST);
  const npcsDataPath = path.resolve(args.npcsData || "lib/npcs_data.ttslua");
  const reportOut = path.resolve(args.out || DEFAULT_REPORT_OUT);
  const injectReportPath = path.resolve(args.injectReport || DEFAULT_INJECT_REPORT);
  const inputDir = path.resolve(args.dir || args.input || DEFAULT_NPC_GROUP_IMAGE_DIR);

  if (!fs.existsSync(npcsDataPath)) {
    throw new Error(`NPC data file not found: ${npcsDataPath}`);
  }

  const npcsText = fs.readFileSync(npcsDataPath, "utf8");
  const knownKeys = extractCharacterKeysFromNpcsData(npcsText);
  const sortedRegistryKeys = [...knownKeys].sort((a, b) => a.localeCompare(b, "en"));

  /** @type {string[]} */
  let skippedUnregisteredKeys = [];
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (Array.isArray(manifest.skippedUnregisteredKeys)) {
      skippedUnregisteredKeys = manifest.skippedUnregisteredKeys.map((k) => String(k));
    }
  }

  /** @type {string[]} */
  let registryMissingDiskGroup = [];
  /** @type {string[]} */
  let tokensMissing = [];
  if (fs.existsSync(injectReportPath)) {
    const injectReport = JSON.parse(fs.readFileSync(injectReportPath, "utf8"));
    if (Array.isArray(injectReport.registryMissingDiskGroup)) {
      registryMissingDiskGroup = injectReport.registryMissingDiskGroup.map((k) => String(k));
    }
    if (Array.isArray(injectReport.tokensMissing)) {
      tokensMissing = injectReport.tokensMissing.map((k) => String(k));
    }
    if (
      skippedUnregisteredKeys.length === 0
      && Array.isArray(injectReport.skippedUnregisteredKeys)
    ) {
      skippedUnregisteredKeys = injectReport.skippedUnregisteredKeys.map((k) => String(k));
    }
  }

  if (fs.existsSync(inputDir)) {
    const scanResult = scanNpcGroupsInDirectory(inputDir, { registeredKeys: knownKeys });
    if (scanResult.errors.length === 0) {
      const diskKeys = new Set(scanResult.groups.map((g) => g.characterKey));
      if (registryMissingDiskGroup.length === 0) {
        registryMissingDiskGroup = sortedRegistryKeys.filter((key) => !diskKeys.has(key));
      }
      if (skippedUnregisteredKeys.length === 0) {
        skippedUnregisteredKeys = scanResult.skippedUnregisteredKeys;
      }
    }
  }

  /** @type {string[]} */
  const lines = [
    "# NPC registry gap report",
    `# Generated: ${new Date().toISOString()}`,
    "",
    "## Disk groups skipped (not in D.characters)",
    skippedUnregisteredKeys.length > 0
      ? skippedUnregisteredKeys.map((k) => `- ${k}`).join("\n")
      : "(none)",
    "",
    "## D.characters keys missing complete 4-file disk group",
    registryMissingDiskGroup.length > 0
      ? registryMissingDiskGroup.map((k) => `- ${k}`).join("\n")
      : "(none)",
    "",
    "## Registry keys with no npc_control_token in save (inject)",
    tokensMissing.length > 0
      ? tokensMissing.map((k) => `- ${k} (run npm run custom-ui-assets:apply-npc-hosted-world after upload)`).join("\n")
      : "(none — or inject report not found)",
    "",
  ];

  const reportText = `${lines.join("\n")}\n`;
  ensureParentDir(reportOut);
  fs.writeFileSync(reportOut, reportText, "utf8");

  console.log(reportText);
  console.log(`Report written: ${reportOut}`);

  const hasGaps =
    skippedUnregisteredKeys.length > 0
    || registryMissingDiskGroup.length > 0
    || tokensMissing.length > 0;
  if (hasGaps) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
