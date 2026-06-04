#!/usr/bin/env node
"use strict";

// Inventory physical/world entities in a TTS save JSON (ObjectStates tree, decals, tabs).
// TTS "Loading N entities" is roughly CustomUIAssets + every ObjectStates node (recursive).
// Agent guidance: .dev/TTS_BUNDLING_SETUP.md; pair with extract-categorize-save-assets.js

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
 * Extract the `G.GUIDS = { ... }` block from lib/guids.ttslua.
 * @param {string} text
 * @returns {string|null}
 */
function extractGGuidsBlock(text) {
  const startMatch = text.match(/G\.GUIDS\s*=\s*\{/);
  if (!startMatch || startMatch.index === undefined) {
    return null;
  }
  const startIdx = startMatch.index + startMatch[0].length - 1;
  let depth = 0;
  for (let i = startIdx; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

/**
 * Parse `lib/guids.ttslua` → map lowercase GUID → G.GUIDS path(s), e.g. `TABLES.TABLE_A`.
 * @param {string} repoRoot
 * @returns {Map<string, string[]>}
 */
function loadGGuidsRegistry(repoRoot) {
  /** @type {Map<string, string[]>} */
  const byGuid = new Map();
  const guidsPath = path.join(repoRoot, "lib", "guids.ttslua");
  if (!fs.existsSync(guidsPath)) {
    return byGuid;
  }

  const text = fs.readFileSync(guidsPath, "utf8");
  const block = extractGGuidsBlock(text);
  if (!block) {
    return byGuid;
  }

  const assignRe = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*["']([a-f0-9]{6})["']/i;
  const openTableRe = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*\{\s*$/;
  const closeTableRe = /^\s*\},?\s*$/;

  /** @type {string|null} */
  let nestedGroup = null;
  const lines = block.split(/\r?\n/u);
  for (const line of lines) {
    const openTable = line.match(openTableRe);
    if (openTable) {
      nestedGroup = openTable[1];
      continue;
    }
    if (nestedGroup !== null && closeTableRe.test(line)) {
      nestedGroup = null;
      continue;
    }
    const assign = line.match(assignRe);
    if (!assign) {
      continue;
    }
    const key = assign[1];
    const guid = assign[2].toLowerCase();
    const pathKey = nestedGroup !== null ? `${nestedGroup}.${key}` : key;
    const existing = byGuid.get(guid);
    if (!existing) {
      byGuid.set(guid, [pathKey]);
      continue;
    }
    if (!existing.includes(pathKey)) {
      existing.push(pathKey);
    }
  }

  return byGuid;
}

/**
 * @param {Map<string, string[]>} gGuidsRegistry
 * @returns {Set<string>}
 */
function soundscapeGuidsFromRegistry(gGuidsRegistry) {
  /** @type {Set<string>} */
  const guids = new Set();
  for (const [guid, paths] of gGuidsRegistry.entries()) {
    if (paths.some((p) => p.startsWith("SOUNDSCAPE_"))) {
      guids.add(guid);
    }
  }
  return guids;
}

/**
 * @param {string} guid
 * @param {Map<string, string[]>} gGuidsRegistry
 * @returns {{ keys: string[]; primary: string; inRegistry: boolean }}
 */
function resolveGGuidsKeys(guid, gGuidsRegistry) {
  if (!guid) {
    return { keys: [], primary: "", inRegistry: false };
  }
  const keys = gGuidsRegistry.get(guid.toLowerCase()) || [];
  return {
    keys,
    primary: keys[0] || "",
    inRegistry: keys.length > 0,
  };
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string}
 */
function categorizeObject(obj) {
  const name = typeof obj.Name === "string" ? obj.Name : "";
  const nickname = typeof obj.Nickname === "string" ? obj.Nickname : "";
  const combined = `${name} ${nickname}`;

  if (/^CSHEET_PAGE_/i.test(name) || /^CSHEET_/i.test(name)) {
    return "characterSheet";
  }
  if (/^DICEBAG_/i.test(name) || /dicebag/i.test(combined)) {
    return "diceBag";
  }
  if (name === "Custom_Dice" || /^die_/i.test(nickname)) {
    return "dice";
  }
  if (name === "Custom_Model_Infinite_Bag") {
    return "infiniteBag";
  }
  if (name === "Card" || obj.CustomDeck !== undefined) {
    return "cardOrDeck";
  }
  if (name === "DeckCustom") {
    return "deck";
  }
  if (/^Figurine_/i.test(name) || /figurine/i.test(combined)) {
    return "figurine";
  }
  if (name === "Custom_Tile" || /^tile_/i.test(nickname)) {
    return "tile";
  }
  if (name === "Custom_Assetbundle" || obj.CustomAssetbundle !== undefined) {
    return "assetBundle";
  }
  if (name === "HandTrigger") {
    return "handTrigger";
  }
  if (/^Block/i.test(name)) {
    return "block";
  }
  if (name === "Custom_Board" || /CONTROL_BOARD/i.test(name)) {
    return "board";
  }
  if (name === "Custom_Token" || /npc.*token/i.test(combined)) {
    return "token";
  }
  if (/^SEAT_|^TABLE_|^COMPONENT_/i.test(name)) {
    return "seatLayout";
  }
  if (/zone/i.test(name) || /trigger/i.test(name)) {
    return "zoneOrTrigger";
  }
  return "other";
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string|null}
 */
function extractAssetBundleUrl(obj) {
  if (!obj.CustomAssetbundle || typeof obj.CustomAssetbundle !== "object") {
    return null;
  }
  const ab = /** @type {Record<string, unknown>} */ (obj.CustomAssetbundle);
  return typeof ab.AssetbundleURL === "string" ? ab.AssetbundleURL : null;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function extractGmNotes(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value;
}

/**
 * Flatten GM notes for CSV (Sheets-friendly single line).
 * @param {string} text
 * @returns {string}
 */
function gmNotesForCsv(text) {
  if (text.length === 0) {
    return "";
  }
  return text.replace(/\r\n/g, "\n").replace(/\s*\n+\s*/g, " | ").trim();
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string|null}
 */
function extractCustomImageUrl(obj) {
  if (!obj.CustomImage || typeof obj.CustomImage !== "object") {
    return null;
  }
  const img = /** @type {Record<string, unknown>} */ (obj.CustomImage);
  if (typeof img.ImageURL === "string") {
    return img.ImageURL;
  }
  if (typeof img.ImageUrl === "string") {
    return img.ImageUrl;
  }
  return null;
}

/**
 * @param {unknown} node
 * @param {string} pathLabel
 * @param {number} depth
 * @param {boolean} isRoot
 * @param {Set<string>} soundscapeGuids
 * @param {Map<string, string[]>} gGuidsRegistry
 * @param {{ entities: Record<string, unknown>[]; maxDepth: number }} acc
 */
function walkObjectStates(node, pathLabel, depth, isRoot, soundscapeGuids, gGuidsRegistry, acc) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      walkObjectStates(node[i], `${pathLabel}[${i}]`, depth, isRoot, soundscapeGuids, gGuidsRegistry, acc);
    }
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  if (depth > acc.maxDepth) {
    acc.maxDepth = depth;
  }

  const guid = typeof obj.GUID === "string" ? obj.GUID.toLowerCase() : "";
  const name = typeof obj.Name === "string" ? obj.Name : "";
  const category = categorizeObject(obj);
  const tags = Array.isArray(obj.Tags)
    ? obj.Tags.filter((t) => typeof t === "string")
    : [];
  const gGuids = resolveGGuidsKeys(guid, gGuidsRegistry);

  acc.entities.push({
    kind: "object",
    path: pathLabel,
    depth,
    isRootObjectState: isRoot && depth === 0,
    guid,
    gGuidsKey: gGuids.primary,
    gGuidsKeys: gGuids.keys,
    inGGuidsRegistry: gGuids.inRegistry,
    name,
    nickname: typeof obj.Nickname === "string" ? obj.Nickname : "",
    category,
    locked: obj.Locked === true,
    tags,
    containedChildCount: Array.isArray(obj.ContainedObjects) ? obj.ContainedObjects.length : 0,
    hasCustomDeck: obj.CustomDeck !== undefined,
    assetBundleUrl: extractAssetBundleUrl(obj),
    customImageUrl: extractCustomImageUrl(obj),
    isSoundscapeEmitter: guid.length > 0 && soundscapeGuids.has(guid),
    gmNotes: extractGmNotes(obj.GMNotes),
  });

  const children = obj.ContainedObjects;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      walkObjectStates(
        children[i],
        `${pathLabel}.ContainedObjects[${i}]`,
        depth + 1,
        false,
        soundscapeGuids,
        gGuidsRegistry,
        acc,
      );
    }
  }
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @param {Set<string>} soundscapeGuids
 * @param {Map<string, string[]>} gGuidsRegistry
 */
function buildReport(saveRoot, soundscapeGuids, gGuidsRegistry) {
  /** @type {Record<string, unknown>[]} */
  const entities = [];

  const walkAcc = { entities, maxDepth: 0 };
  walkObjectStates(saveRoot.ObjectStates, "ObjectStates", 0, true, soundscapeGuids, gGuidsRegistry, walkAcc);

  const objectEntities = walkAcc.entities;
  const rootObjectCount = Array.isArray(saveRoot.ObjectStates) ? saveRoot.ObjectStates.length : 0;

  /** @type {Map<string, number>} */
  const byCategory = new Map();
  for (const row of objectEntities) {
    const cat = String(row.category);
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  }

  const customUiCount = Array.isArray(saveRoot.CustomUIAssets)
    ? saveRoot.CustomUIAssets.length
    : Array.isArray(saveRoot.CustomAssets)
      ? saveRoot.CustomAssets.length
      : 0;
  const customUiField = Array.isArray(saveRoot.CustomUIAssets)
    ? "CustomUIAssets"
    : Array.isArray(saveRoot.CustomAssets)
      ? "CustomAssets"
      : null;

  const decalPallet = Array.isArray(saveRoot.DecalPallet) ? saveRoot.DecalPallet.length : 0;

  /** @type {Record<string, unknown>[]} */
  const decalEntries = [];
  if (Array.isArray(saveRoot.DecalPallet)) {
    for (let i = 0; i < saveRoot.DecalPallet.length; i += 1) {
      const entry = saveRoot.DecalPallet[i];
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const rec = /** @type {Record<string, unknown>} */ (entry);
      decalEntries.push({
        kind: "decal_pallet",
        path: `DecalPallet[${i}]`,
        name: typeof rec.Name === "string" ? rec.Name : "",
        url: typeof rec.ImageURL === "string"
          ? rec.ImageURL
          : typeof rec.URL === "string"
            ? rec.URL
            : "",
      });
    }
  }

  const tabStateKeys = saveRoot.TabStates && typeof saveRoot.TabStates === "object"
    ? Object.keys(/** @type {Record<string, unknown>} */ (saveRoot.TabStates))
    : [];

  const loadingEstimate = {
    note: "TTS loading progress is engine-side; this is the usual save-file breakdown for Toronto Rising.",
    customUiAssets: customUiCount,
    objectStatesTotal: objectEntities.length,
    objectStatesRootOnly: rootObjectCount,
    containedNested: objectEntities.length - rootObjectCount,
    decalPallet: decalPallet,
    estimatedTotal: customUiCount + objectEntities.length,
  };

  const soundscapeEmitters = objectEntities.filter((e) => e.isSoundscapeEmitter === true);
  const inGGuidsRegistryCount = objectEntities.filter((e) => e.inGGuidsRegistry === true).length;

  return {
    loadingEstimate,
    customUiField,
    gGuidsRegistrySize: gGuidsRegistry.size,
    objectStates: {
      rootCount: rootObjectCount,
      totalCount: objectEntities.length,
      maxNestingDepth: walkAcc.maxDepth,
      byCategory: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count })),
      soundscapeEmitterCount: soundscapeEmitters.length,
      inGGuidsRegistryCount,
      lockedCount: objectEntities.filter((e) => e.locked === true).length,
    },
    entities: objectEntities,
    decalPallet: decalEntries,
    tabStateKeys,
    otherTopLevel: {
      cameraStates: Array.isArray(saveRoot.CameraStates) ? saveRoot.CameraStates.length : 0,
      hands: saveRoot.Hands && typeof saveRoot.Hands === "object" ? Object.keys(saveRoot.Hands).length : 0,
      componentTags: saveRoot.ComponentTags && typeof saveRoot.ComponentTags === "object"
        ? Object.keys(/** @type {Record<string, unknown>} */ (saveRoot.ComponentTags)).length
        : 0,
    },
  };
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
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
function formatMarkdownSummary(report) {
  const le = report.loadingEstimate;
  const lines = [
    "# TTS save world entities",
    "",
    "## Loading estimate",
    "",
    "The in-game **Loading** bar counts work the engine does at spawn time. For this mod it aligns with:",
    "",
    "| Bucket | Count | Where in save JSON |",
    "| --- | ---: | --- |",
    `| Custom UI images | ${le.customUiAssets} | \`${report.customUiField || "CustomUIAssets"}\` (not 3D objects) |`,
    `| Table objects (total) | ${le.objectStatesTotal} | \`ObjectStates\` + nested \`ContainedObjects\` |`,
    `| — root objects only | ${le.objectStatesRootOnly} | top-level \`ObjectStates[]\` |`,
    `| — nested (bags/decks) | ${le.containedNested} | \`ContainedObjects\` children |`,
    `| Decal library | ${le.decalPallet} | \`DecalPallet\` |`,
    `| **Estimated total** | **${le.estimatedTotal}** | UI assets + all object nodes |`,
    "",
    "Snap points installed by scripts (control board, palette) are **not** in the save JSON until written back — they do not inflate this count.",
    "",
    "### Objects by category",
    "",
    "| Category | Count |",
    "| --- | ---: |",
  ];

  for (const row of report.objectStates.byCategory) {
    lines.push(`| ${row.category} | ${row.count} |`);
  }

  lines.push(
    "",
    `- Locked objects: ${report.objectStates.lockedCount}`,
    `- Matched \`lib/guids.ttslua\` \`G.GUIDS\`: ${report.objectStates.inGGuidsRegistryCount} / ${report.objectStates.totalCount} (${report.gGuidsRegistrySize} registry entries)`,
    `- Soundscape emitters (GUID in \`lib/guids.ttslua\`): ${report.objectStates.soundscapeEmitterCount}`,
    `- Tab metadata keys: ${report.tabStateKeys.length}`,
    "",
  );

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args.repoRoot || process.cwd());

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
  const gGuidsRegistry = loadGGuidsRegistry(repoRoot);
  const soundscapeGuids = soundscapeGuidsFromRegistry(gGuidsRegistry);
  const report = buildReport(saveRoot, soundscapeGuids, gGuidsRegistry);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultOutDir = path.join(repoRoot, ".dev", "build-logs");
  const baseName = args.outBasename || `save-entities-${stamp}`;
  const jsonOut = args.jsonOut
    ? path.resolve(args.jsonOut)
    : path.join(defaultOutDir, `${baseName}.json`);
  const csvOut = args.csvOut
    ? path.resolve(args.csvOut)
    : path.join(defaultOutDir, `${baseName}.csv`);
  const mdOut = args.mdOut
    ? path.resolve(args.mdOut)
    : path.join(defaultOutDir, `${baseName}.md`);

  const payload = {
    generatedAt: new Date().toISOString(),
    savePath,
    ...report,
  };

  writeText(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);

  const csvHeader = [
    "category",
    "name",
    "nickname",
    "guid",
    "gGuidsKey",
    "gGuidsKeys",
    "depth",
    "isRoot",
    "locked",
    "containedChildCount",
    "isSoundscapeEmitter",
    "hasCustomDeck",
    "assetBundleUrl",
    "customImageUrl",
    "gmNotes",
    "tags",
    "path",
  ];
  const csvLines = [toCsvRow(csvHeader)];
  for (const row of report.entities) {
    csvLines.push(toCsvRow([
      row.category,
      row.name,
      row.nickname,
      row.guid,
      row.gGuidsKey || "",
      (/** @type {string[]} */ (row.gGuidsKeys)).join("|"),
      row.depth,
      row.isRootObjectState ? "yes" : "no",
      row.locked ? "yes" : "no",
      row.containedChildCount,
      row.isSoundscapeEmitter ? "yes" : "no",
      row.hasCustomDeck ? "yes" : "no",
      row.assetBundleUrl || "",
      row.customImageUrl || "",
      gmNotesForCsv(String(row.gmNotes || "")),
      (/** @type {string[]} */ (row.tags)).join("|"),
      row.path,
    ]));
  }
  writeText(csvOut, `${csvLines.join("\n")}\n`);
  writeText(mdOut, formatMarkdownSummary(report));

  const le = report.loadingEstimate;
  console.log(`Save: ${savePath}`);
  console.log("");
  console.log("Loading estimate (save-file buckets):");
  console.log(`  Custom UI assets (${report.customUiField}): ${le.customUiAssets}`);
  console.log(`  ObjectStates (recursive):            ${le.objectStatesTotal} (${le.objectStatesRootOnly} root + ${le.containedNested} nested)`);
  console.log(`  DecalPallet:                         ${le.decalPallet}`);
  console.log(`  Estimated total (UI + objects):      ${le.estimatedTotal}`);
  console.log("");
  console.log("Objects by category:");
  for (const row of report.objectStates.byCategory) {
    console.log(`  ${row.category}: ${row.count}`);
  }
  console.log(
    `G.GUIDS matches: ${report.objectStates.inGGuidsRegistryCount}/${report.objectStates.totalCount}`
    + ` (${report.gGuidsRegistrySize} keys in lib/guids.ttslua)`,
  );
  console.log("");
  console.log(`JSON: ${jsonOut}`);
  console.log(`CSV:  ${csvOut}`);
  console.log(`MD:   ${mdOut}`);
}

main();
