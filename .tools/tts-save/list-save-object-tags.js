#!/usr/bin/env node
"use strict";

// Scan a TTS save JSON: list unique object Tags actually assigned on ObjectStates
// (recursive ContainedObjects). Ignores ComponentTags registry and save-level Workshop Tags.
// Optional second CSV: registry labels never assigned to any object (prune candidates).
// Agent guidance: .dev/TTS_BUNDLING_SETUP.md

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("./resolve-save-path");

/**
 * Parse CLI args: `--key value` or boolean `--flag`.
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
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

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {string} outputPath
 * @param {string} text
 */
function writeText(outputPath, text) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text, "utf8");
}

/**
 * @param {string[]} cells
 * @returns {string}
 */
function toCsvRow(cells) {
  return cells.map((cell) => {
    const s = String(cell);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
  }).join(",");
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {Set<string>}
 */
function extractRegistryTagLabels(saveRoot) {
  /** @type {Set<string>} */
  const labels = new Set();
  const componentTags = saveRoot.ComponentTags;
  if (!componentTags || typeof componentTags !== "object" || Array.isArray(componentTags)) {
    return labels;
  }
  const rec = /** @type {Record<string, unknown>} */ (componentTags);
  const rawLabels = rec.labels;
  if (!Array.isArray(rawLabels)) {
    return labels;
  }
  for (const entry of rawLabels) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (entry);
    if (typeof row.displayed === "string" && row.displayed.length > 0) {
      labels.add(row.displayed);
    }
  }
  return labels;
}

/**
 * Walk ObjectStates tree; count each tag on object `Tags` arrays.
 * @param {unknown} node
 * @param {Map<string, number>} tagCounts
 */
function walkObjectTags(node, tagCounts) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      walkObjectTags(item, tagCounts);
    }
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  if (Array.isArray(obj.Tags)) {
    for (const tag of obj.Tags) {
      if (typeof tag !== "string" || tag.length === 0) {
        continue;
      }
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  if (Array.isArray(obj.ContainedObjects)) {
    for (const child of obj.ContainedObjects) {
      walkObjectTags(child, tagCounts);
    }
  }
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {{
 *   usedTags: { tag: string; objectCount: number }[];
 *   registryLabels: Set<string>;
 *   pruneCandidates: string[];
 *   summary: Record<string, unknown>;
 * }}
 */
function buildReport(saveRoot) {
  /** @type {Map<string, number>} */
  const tagCounts = new Map();
  walkObjectTags(saveRoot.ObjectStates, tagCounts);

  const usedTags = [...tagCounts.entries()]
    .map(([tag, objectCount]) => ({ tag, objectCount }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "en", { sensitivity: "base" }));

  const registryLabels = extractRegistryTagLabels(saveRoot);
  const usedSet = new Set(usedTags.map((row) => row.tag));
  const pruneCandidates = [...registryLabels]
    .filter((label) => !usedSet.has(label))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const summary = {
    uniqueTagsOnObjects: usedTags.length,
    totalTagAssignments: usedTags.reduce((sum, row) => sum + row.objectCount, 0),
    registryLabelCount: registryLabels.size,
    registryUnusedOnObjects: pruneCandidates.length,
    registryUsedOnObjects: registryLabels.size - pruneCandidates.length,
    note: "Counts are tag assignments (one object with three tags adds three). Workshop Tags at save root are ignored.",
  };

  return { usedTags, registryLabels, pruneCandidates, summary };
}

/**
 * @param {{ tag: string; objectCount: number }[]} rows
 * @returns {string}
 */
function usedTagsToCsv(rows) {
  const lines = [toCsvRow(["tag", "objectCount"])];
  for (const row of rows) {
    lines.push(toCsvRow([row.tag, row.objectCount]));
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {string[]} tags
 * @returns {string}
 */
function tagListToCsv(tags) {
  const lines = [toCsvRow(["tag"])];
  for (const tag of tags) {
    lines.push(toCsvRow([tag]));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const includePruneCandidates = args.noPruneCandidates !== "1";

  let savePath;
  if (args.save) {
    savePath = path.resolve(args.save);
  } else {
    const saveInput = args.saveName || "230";
    const resolved = resolveSavePath(saveInput, args.savesDir);
    savePath = resolved.savePath;
  }

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }

  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const report = buildReport(saveRoot);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultOutDir = path.join(process.cwd(), ".dev", "build-logs");
  const baseName = args.outBasename || `save-object-tags-${stamp}`;
  const csvOut = args.csvOut
    ? path.resolve(args.csvOut)
    : path.join(defaultOutDir, `${baseName}.csv`);
  const pruneCsvOut = args.pruneCsvOut
    ? path.resolve(args.pruneCsvOut)
    : path.join(defaultOutDir, `${baseName}-registry-unused.csv`);
  const jsonOut = args.jsonOut
    ? path.resolve(args.jsonOut)
    : path.join(defaultOutDir, `${baseName}.json`);

  writeText(csvOut, usedTagsToCsv(report.usedTags));

  if (includePruneCandidates) {
    writeText(pruneCsvOut, tagListToCsv(report.pruneCandidates));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    savePath,
    ...report.summary,
    usedTags: report.usedTags,
    pruneCandidates: includePruneCandidates ? report.pruneCandidates : [],
  };
  writeText(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Save: ${savePath}`);
  console.log("");
  console.log(`Unique tags on objects: ${report.summary.uniqueTagsOnObjects}`);
  console.log(`Total tag assignments:  ${report.summary.totalTagAssignments}`);
  console.log(`Registry labels:        ${report.summary.registryLabelCount}`);
  console.log(`  — used on objects:    ${report.summary.registryUsedOnObjects}`);
  console.log(`  — never on objects:   ${report.summary.registryUnusedOnObjects} (prune candidates)`);
  console.log("");
  console.log(`CSV (used tags): ${csvOut}`);
  if (includePruneCandidates) {
    console.log(`CSV (registry unused): ${pruneCsvOut}`);
  }
  console.log(`JSON: ${jsonOut}`);
}

main();
