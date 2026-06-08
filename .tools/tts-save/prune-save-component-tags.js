#!/usr/bin/env node
"use strict";

// Remove unused entries from save JSON `ComponentTags.labels` (tag registry picker).
// Keeps labels whose `displayed` name appears on at least one object `Tags` array,
// plus optional extras from --keepFile (one tag per line, # comments).
// Does not change object Tags — registry only. Writes timestamped backup before save.
// Agent guidance: .dev/TTS_BUNDLING_SETUP.md; pair with list-save-object-tags.js

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
 * @param {string} savePath
 * @returns {string}
 */
function buildBackupPath(savePath) {
  const dir = path.dirname(savePath);
  const base = path.basename(savePath, path.extname(savePath));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `${base}.pre-prune-component-tags.${stamp}.json`);
}

/**
 * @param {string} filePath
 * @returns {Set<string>}
 */
function readKeepTagSet(filePath) {
  /** @type {Set<string>} */
  const names = new Set();
  if (!fs.existsSync(filePath)) {
    return names;
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    names.add(trimmed);
  }
  return names;
}

/**
 * Walk ObjectStates tree; collect each tag on object `Tags` arrays.
 * @param {unknown} node
 * @param {Set<string>} usedTags
 */
function walkObjectTags(node, usedTags) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      walkObjectTags(item, usedTags);
    }
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  if (Array.isArray(obj.Tags)) {
    for (const tag of obj.Tags) {
      if (typeof tag === "string" && tag.length > 0) {
        usedTags.add(tag);
      }
    }
  }

  if (Array.isArray(obj.ContainedObjects)) {
    for (const child of obj.ContainedObjects) {
      walkObjectTags(child, usedTags);
    }
  }
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {Set<string>}
 */
function collectUsedObjectTags(saveRoot) {
  /** @type {Set<string>} */
  const usedTags = new Set();
  walkObjectTags(saveRoot.ObjectStates, usedTags);
  return usedTags;
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @param {Set<string>} retainLabels union of used-on-object tags + --keepFile
 * @returns {{
 *   beforeCount: number;
 *   afterCount: number;
 *   removed: string[];
 *   kept: string[];
 *   usedOnObjects: string[];
 *   keptViaKeepFile: string[];
 *   usedNotInRegistryBefore: string[];
 * }}
 */
function planComponentTagsPrune(saveRoot, retainLabels) {
  const componentTags = saveRoot.ComponentTags;
  if (!componentTags || typeof componentTags !== "object" || Array.isArray(componentTags)) {
    throw new Error("Save has no ComponentTags object.");
  }

  const rec = /** @type {Record<string, unknown>} */ (componentTags);
  const rawLabels = rec.labels;
  if (!Array.isArray(rawLabels)) {
    throw new Error("ComponentTags.labels is missing or not an array.");
  }

  const usedOnObjectSet = collectUsedObjectTags(saveRoot);
  const usedOnObjects = [...usedOnObjectSet].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );

  /** @type {Set<string>} */
  const registryBefore = new Set();
  for (const entry of rawLabels) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const displayed = /** @type {Record<string, unknown>} */ (entry).displayed;
    if (typeof displayed === "string" && displayed.length > 0) {
      registryBefore.add(displayed);
    }
  }

  const usedNotInRegistryBefore = usedOnObjects.filter((tag) => !registryBefore.has(tag));

  /** @type {string[]} */
  const removed = [];
  /** @type {string[]} */
  const kept = [];
  /** @type {string[]} */
  const keptViaKeepFile = [];
  /** @type {unknown[]} */
  const nextLabels = [];

  for (const entry of rawLabels) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (entry);
    const displayed = typeof row.displayed === "string" ? row.displayed : "";
    if (displayed.length === 0) {
      continue;
    }

    if (retainLabels.has(displayed)) {
      nextLabels.push(entry);
      kept.push(displayed);
      if (!usedOnObjectSet.has(displayed)) {
        keptViaKeepFile.push(displayed);
      }
    } else {
      removed.push(displayed);
    }
  }

  return {
    beforeCount: rawLabels.length,
    afterCount: nextLabels.length,
    removed: removed.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    kept: kept.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    usedOnObjects,
    keptViaKeepFile: keptViaKeepFile.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    usedNotInRegistryBefore,
    nextLabels,
  };
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @param {unknown[]} nextLabels
 */
function applyComponentTagsLabels(saveRoot, nextLabels) {
  const componentTags = saveRoot.ComponentTags;
  if (!componentTags || typeof componentTags !== "object" || Array.isArray(componentTags)) {
    throw new Error("Save has no ComponentTags object.");
  }
  /** @type {Record<string, unknown>} */ (componentTags).labels = nextLabels;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun === "1";
  const noBackup = args.noBackup === "1";

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

  const keepFilePath = args.keepFile
    ? path.resolve(args.keepFile)
    : null;
  const keepFileTags = keepFilePath ? readKeepTagSet(keepFilePath) : new Set();

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }

  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const usedOnObjectSet = collectUsedObjectTags(saveRoot);

  /** @type {Set<string>} */
  const retainLabels = new Set(usedOnObjectSet);
  for (const tag of keepFileTags) {
    retainLabels.add(tag);
  }

  const plan = planComponentTagsPrune(saveRoot, retainLabels);

  console.log(`Save: ${savePath}`);
  console.log(`Mode: ${dryRun ? "dry-run (no write)" : "apply"}`);
  console.log("");
  console.log(`ComponentTags.labels before: ${plan.beforeCount}`);
  console.log(`ComponentTags.labels after:  ${plan.afterCount}`);
  console.log(`Removed (unused registry):   ${plan.removed.length}`);
  console.log(`Kept (on objects):           ${plan.usedOnObjects.length}`);
  if (plan.keptViaKeepFile.length > 0) {
    console.log(`Kept (--keepFile only):      ${plan.keptViaKeepFile.length}`);
  }
  if (plan.usedNotInRegistryBefore.length > 0) {
    console.log("");
    console.log(
      `Warning: ${plan.usedNotInRegistryBefore.length} tag(s) on objects were not in registry before prune:`,
    );
    for (const tag of plan.usedNotInRegistryBefore) {
      console.log(`  - ${tag}`);
    }
    console.log("(Object Tags unchanged; add these in TTS if you need them in the picker.)");
  }

  if (plan.removed.length > 0) {
    console.log("");
    console.log("Sample removed (first 20):");
    for (const tag of plan.removed.slice(0, 20)) {
      console.log(`  - ${tag}`);
    }
    if (plan.removed.length > 20) {
      console.log(`  … and ${plan.removed.length - 20} more`);
    }
  }

  if (dryRun) {
    console.log("");
    console.log("Dry-run complete — re-run without --dryRun to write.");
    return;
  }

  if (plan.removed.length === 0) {
    console.log("");
    console.log("Nothing to remove.");
    return;
  }

  if (!noBackup) {
    const backupPath = buildBackupPath(savePath);
    fs.copyFileSync(savePath, backupPath);
    console.log("");
    console.log(`Backup: ${backupPath}`);
  }

  applyComponentTagsLabels(saveRoot, plan.nextLabels);
  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");
  console.log(`Updated: ${savePath}`);
}

main();
