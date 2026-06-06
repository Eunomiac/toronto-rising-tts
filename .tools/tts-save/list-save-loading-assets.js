#!/usr/bin/env node
"use strict";

// Build a CSV inventory aligned with TTS's in-game "Loading (N/M)" asset count.
// Model (Toronto Rising / TS_Save_230): global CustomUIAssets + every ObjectStates node
// except HandTrigger, Block*, and Custom_Assetbundle / CustomAssetbundle objects.
// Asset bundles load separately in-engine but are excluded from this progress total.
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
 * @param {string} url
 * @returns {string}
 */
function urlHostKind(url) {
  if (/steamusercontent/i.test(url)) {
    return "steam_ugc";
  }
  if (/tabletopsimulator/i.test(url)) {
    return "tts_cdn";
  }
  if (/^file:/i.test(url)) {
    return "file_local";
  }
  if (typeof url === "string" && url.length > 0) {
    return "other_host";
  }
  return "";
}

/**
 * Heuristic category from Custom UI asset Name.
 * @param {string} name
 * @returns {string}
 */
function categorizeUiAssetName(name) {
  if (/^siteCard_/i.test(name)) {
    return "siteCard";
  }
  if (/^token(?:Front|Back)_/i.test(name)) {
    return "npcToken";
  }
  if (/^(bloodSurge|mending|baneSeverity|discBonus|discReroll)\d/i.test(name)) {
    return "bloodPotencyDecal";
  }
  if (/^toggle(?:District|Overlay)?_/i.test(name) || /^hud-toggle-/i.test(name)) {
    return "hudToggle";
  }
  if (/^map(?:Overlay|Base)?_/i.test(name) || /^overlay(?:Divider)?_/i.test(name)) {
    return "mapOverlay";
  }
  if (/^district(?:Card|Divider)_/i.test(name)) {
    return "district";
  }
  if (/^dieFace_/i.test(name)) {
    return "dieFace";
  }
  if (/^refPanel_/i.test(name)) {
    return "referencePanel";
  }
  if (/^border-|^hud-border-/i.test(name)) {
    return "border";
  }
  if (/^pin_/i.test(name)) {
    return "pin";
  }
  if (/^nameLabel_/i.test(name)) {
    return "nameLabel";
  }
  if (/^bg_/i.test(name)) {
    return "background";
  }
  if (/^button/i.test(name)) {
    return "button";
  }
  return "other";
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
 * Parse `lib/guids.ttslua` → map lowercase GUID → G.GUIDS path(s).
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
 * @returns {boolean}
 */
function isExcludedFromLoadingBar(obj) {
  const name = typeof obj.Name === "string" ? obj.Name : "";
  if (name === "HandTrigger") {
    return true;
  }
  if (/^Block/i.test(name)) {
    return true;
  }
  if (obj.CustomAssetbundle !== undefined && obj.CustomAssetbundle !== null) {
    return true;
  }
  if (name === "Custom_Assetbundle") {
    return true;
  }
  return false;
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
  if (obj.CustomImage !== undefined) {
    return "customImage";
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
 * @returns {{ primaryUrl: string; secondaryUrl: string; urlNotes: string }}
 */
function extractObjectUrls(obj) {
  /** @type {string[]} */
  const notes = [];

  if (typeof obj.ImageURL === "string" && obj.ImageURL.length > 0) {
    return { primaryUrl: obj.ImageURL, secondaryUrl: "", urlNotes: "ImageURL" };
  }
  if (typeof obj.ImageUrl === "string" && obj.ImageUrl.length > 0) {
    return { primaryUrl: obj.ImageUrl, secondaryUrl: "", urlNotes: "ImageUrl" };
  }

  if (obj.CustomImage && typeof obj.CustomImage === "object") {
    const img = /** @type {Record<string, unknown>} */ (obj.CustomImage);
    const primary = typeof img.ImageURL === "string"
      ? img.ImageURL
      : typeof img.ImageUrl === "string"
        ? img.ImageUrl
        : "";
    return { primaryUrl: primary, secondaryUrl: "", urlNotes: "CustomImage" };
  }

  if (obj.CustomDeck && typeof obj.CustomDeck === "object") {
    const deck = /** @type {Record<string, unknown>} */ (obj.CustomDeck);
    const deckKeys = Object.keys(deck).sort();
    if (deckKeys.length === 0) {
      return { primaryUrl: "", secondaryUrl: "", urlNotes: "CustomDeck(empty)" };
    }
    const firstKey = deckKeys[0];
    const face = deck[firstKey];
    if (!face || typeof face !== "object") {
      return { primaryUrl: "", secondaryUrl: "", urlNotes: "CustomDeck" };
    }
    const faceRec = /** @type {Record<string, unknown>} */ (face);
    const faceUrl = typeof faceRec.FaceURL === "string" ? faceRec.FaceURL : "";
    const backUrl = typeof faceRec.BackURL === "string" ? faceRec.BackURL : "";
    notes.push(`deckId=${firstKey}`);
    if (typeof faceRec.NumWidth === "number" && typeof faceRec.NumHeight === "number") {
      notes.push(`sheet=${faceRec.NumWidth}x${faceRec.NumHeight}`);
    }
    return {
      primaryUrl: faceUrl,
      secondaryUrl: backUrl,
      urlNotes: notes.length > 0 ? `CustomDeck;${notes.join(";")}` : "CustomDeck",
    };
  }

  if (Array.isArray(obj.AttachedDecals) && obj.AttachedDecals.length > 0) {
    const decal = obj.AttachedDecals[0];
    if (decal && typeof decal === "object") {
      const d = /** @type {Record<string, unknown>} */ (decal);
      if (typeof d.URL === "string" && d.URL.length > 0) {
        return { primaryUrl: d.URL, secondaryUrl: "", urlNotes: "AttachedDecals[0]" };
      }
    }
  }

  return { primaryUrl: "", secondaryUrl: "", urlNotes: "" };
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
 * @param {Record<string, unknown>} saveRoot
 * @param {Map<string, string[]>} gGuidsRegistry
 * @param {boolean} includeExtras
 * @returns {{
 *   loadingRows: Record<string, unknown>[];
 *   extraRows: Record<string, unknown>[];
 *   summary: Record<string, unknown>;
 * }}
 */
function buildLoadingInventory(saveRoot, gGuidsRegistry, includeExtras) {
  const customUiField = Array.isArray(saveRoot.CustomUIAssets)
    ? "CustomUIAssets"
    : Array.isArray(saveRoot.CustomAssets)
      ? "CustomAssets"
      : "CustomUIAssets";
  const customUiRaw = Array.isArray(saveRoot.CustomUIAssets)
    ? saveRoot.CustomUIAssets
    : Array.isArray(saveRoot.CustomAssets)
      ? saveRoot.CustomAssets
      : [];

  /** @type {Record<string, unknown>[]} */
  const loadingRows = [];
  /** @type {Record<string, unknown>[]} */
  const extraRows = [];

  for (let i = 0; i < customUiRaw.length; i += 1) {
    const row = customUiRaw[i];
    if (!row || typeof row !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (row);
    const name = typeof rec.Name === "string" ? rec.Name : `<index_${i}>`;
    const url = typeof rec.URL === "string" ? rec.URL : "";
    const typeVal = rec.Type === undefined || rec.Type === null ? "" : String(rec.Type);

    loadingRows.push({
      inLoadingBar: "yes",
      bucket: "custom_ui_global",
      assetKind: "ui_image",
      customAssetName: name,
      customAssetIndex: i,
      customAssetType: typeVal,
      objectGuid: "",
      objectName: "",
      objectNickname: "",
      gGuidsKey: "",
      gGuidsKeys: "",
      primaryUrl: url,
      secondaryUrl: "",
      urlHost: url ? urlHostKind(url) : "",
      saveJsonPath: customUiField,
      depth: "",
      isRootObject: "",
      category: categorizeUiAssetName(name),
      tags: "",
      gmNotes: "",
      notes: `Global ${customUiField} registry entry`,
    });
  }

  /** @type {Record<string, number>} */
  const excludedCounts = {
    handTrigger: 0,
    block: 0,
    assetBundle: 0,
  };

  /**
   * @param {unknown} node
   * @param {string} pathLabel
   * @param {number} depth
   */
  function walkObjects(node, pathLabel, depth) {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        walkObjects(node[i], `${pathLabel}[${i}]`, depth);
      }
      return;
    }

    const obj = /** @type {Record<string, unknown>} */ (node);
    const name = typeof obj.Name === "string" ? obj.Name : "";
    const nickname = typeof obj.Nickname === "string" ? obj.Nickname : "";
    const guid = typeof obj.GUID === "string" ? obj.GUID.toLowerCase() : "";
    const gGuids = resolveGGuidsKeys(guid, gGuidsRegistry);
    const category = categorizeObject(obj);
    const tags = Array.isArray(obj.Tags)
      ? obj.Tags.filter((t) => typeof t === "string").join("|")
      : "";

    if (isExcludedFromLoadingBar(obj)) {
      if (name === "HandTrigger") {
        excludedCounts.handTrigger += 1;
      } else if (/^Block/i.test(name)) {
        excludedCounts.block += 1;
      } else {
        excludedCounts.assetBundle += 1;
      }

      if (includeExtras && (obj.CustomAssetbundle || name === "Custom_Assetbundle")) {
        const ab = obj.CustomAssetbundle && typeof obj.CustomAssetbundle === "object"
          ? /** @type {Record<string, unknown>} */ (obj.CustomAssetbundle)
          : {};
        const primaryUrl = typeof ab.AssetbundleURL === "string" ? ab.AssetbundleURL : "";
        const secondaryUrl = typeof ab.AssetbundleSecondaryURL === "string"
          ? ab.AssetbundleSecondaryURL
          : "";
        extraRows.push({
          inLoadingBar: "no",
          bucket: "asset_bundle_excluded",
          assetKind: "mesh_assetbundle",
          customAssetName: nickname || name,
          customAssetIndex: "",
          customAssetType: typeof ab.AssetbundleType === "number" ? String(ab.AssetbundleType) : "",
          objectGuid: guid,
          objectName: name,
          objectNickname: nickname,
          gGuidsKey: gGuids.primary,
          gGuidsKeys: gGuids.keys.join("|"),
          primaryUrl,
          secondaryUrl,
          urlHost: primaryUrl ? urlHostKind(primaryUrl) : "",
          saveJsonPath: pathLabel,
          depth,
          isRootObject: depth === 0 ? "yes" : "no",
          category,
          tags,
          gmNotes: gmNotesForCsv(extractGmNotes(obj.GMNotes)),
          notes: "Custom_Assetbundle loads in-engine but is excluded from Loading (N/M) progress in this mod",
        });
      }
    } else {
      const urls = extractObjectUrls(obj);
      const nestedUiCount = Array.isArray(obj.CustomUIAssets) ? obj.CustomUIAssets.length : 0;
      /** @type {string[]} */
      const noteParts = [];
      if (urls.urlNotes) {
        noteParts.push(urls.urlNotes);
      }
      if (nestedUiCount > 0) {
        noteParts.push(`nestedCustomUIAssets=${nestedUiCount} (deduped against global registry at runtime)`);
      }

      loadingRows.push({
        inLoadingBar: "yes",
        bucket: "object_state",
        assetKind: category,
        customAssetName: nickname || name,
        customAssetIndex: "",
        customAssetType: "",
        objectGuid: guid,
        objectName: name,
        objectNickname: nickname,
        gGuidsKey: gGuids.primary,
        gGuidsKeys: gGuids.keys.join("|"),
        primaryUrl: urls.primaryUrl,
        secondaryUrl: urls.secondaryUrl,
        urlHost: urls.primaryUrl ? urlHostKind(urls.primaryUrl) : "",
        saveJsonPath: pathLabel,
        depth,
        isRootObject: depth === 0 ? "yes" : "no",
        category,
        tags,
        gmNotes: gmNotesForCsv(extractGmNotes(obj.GMNotes)),
        notes: noteParts.join("; "),
      });
    }

    const children = obj.ContainedObjects;
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i += 1) {
        walkObjects(children[i], `${pathLabel}.ContainedObjects[${i}]`, depth + 1);
      }
    }
  }

  walkObjects(saveRoot.ObjectStates, "ObjectStates", 0);

  if (includeExtras) {
    if (typeof saveRoot.SkyURL === "string" && saveRoot.SkyURL.length > 0) {
      extraRows.push({
        inLoadingBar: "unknown",
        bucket: "environment",
        assetKind: "sky",
        customAssetName: typeof saveRoot.Sky === "string" ? saveRoot.Sky : "Sky",
        customAssetIndex: "",
        customAssetType: "",
        objectGuid: "",
        objectName: "",
        objectNickname: "",
        gGuidsKey: "",
        gGuidsKeys: "",
        primaryUrl: saveRoot.SkyURL,
        secondaryUrl: "",
        urlHost: urlHostKind(saveRoot.SkyURL),
        saveJsonPath: "SkyURL",
        depth: "",
        isRootObject: "",
        category: "environment",
        tags: "",
        gmNotes: "",
        notes: "Table skybox URL at save root",
      });
    }

    if (Array.isArray(saveRoot.DecalPallet)) {
      for (let i = 0; i < saveRoot.DecalPallet.length; i += 1) {
        const entry = saveRoot.DecalPallet[i];
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const rec = /** @type {Record<string, unknown>} */ (entry);
        const decalName = typeof rec.Name === "string" ? rec.Name : `<decal_${i}>`;
        const decalUrl = typeof rec.ImageURL === "string"
          ? rec.ImageURL
          : typeof rec.URL === "string"
            ? rec.URL
            : "";
        extraRows.push({
          inLoadingBar: "unknown",
          bucket: "decal_pallet",
          assetKind: "decal_library",
          customAssetName: decalName,
          customAssetIndex: i,
          customAssetType: "",
          objectGuid: "",
          objectName: "",
          objectNickname: "",
          gGuidsKey: "",
          gGuidsKeys: "",
          primaryUrl: decalUrl,
          secondaryUrl: "",
          urlHost: decalUrl ? urlHostKind(decalUrl) : "",
          saveJsonPath: `DecalPallet[${i}]`,
          depth: "",
          isRootObject: "",
          category: categorizeUiAssetName(decalName),
          tags: "",
          gmNotes: "",
          notes: "Decal library entry (may overlap CustomUIAssets names/URLs)",
        });
      }
    }
  }

  for (let i = 0; i < loadingRows.length; i += 1) {
    loadingRows[i].loadingIndex = i + 1;
  }

  const objectLoadingCount = loadingRows.length - customUiRaw.length;
  const summary = {
    formula: `${customUiField}.length + ObjectStates nodes (recursive) excluding HandTrigger, Block*, Custom_Assetbundle`,
    customUiGlobalCount: customUiRaw.length,
    objectStateLoadingCount: objectLoadingCount,
    loadingBarTotal: loadingRows.length,
    excludedFromLoadingBar: excludedCounts,
    extraRowCount: extraRows.length,
    saveName: typeof saveRoot.SaveName === "string" ? saveRoot.SaveName : "",
    versionNumber: typeof saveRoot.VersionNumber === "string" ? saveRoot.VersionNumber : "",
    note: "TTS reports engine-side Loading (N/M). This save-file model usually matches within a few rows; small drift is normal across TTS versions.",
  };

  return { loadingRows, extraRows, summary };
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

/** @type {readonly string[]} */
const CSV_COLUMNS = [
  "loadingIndex",
  "inLoadingBar",
  "bucket",
  "assetKind",
  "customAssetName",
  "customAssetIndex",
  "customAssetType",
  "objectGuid",
  "objectName",
  "objectNickname",
  "gGuidsKey",
  "gGuidsKeys",
  "primaryUrl",
  "secondaryUrl",
  "urlHost",
  "saveJsonPath",
  "depth",
  "isRootObject",
  "category",
  "tags",
  "gmNotes",
  "notes",
];

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {string}
 */
function rowsToCsv(rows) {
  const lines = [toCsvRow([...CSV_COLUMNS])];
  for (const row of rows) {
    lines.push(toCsvRow(CSV_COLUMNS.map((col) => row[col] ?? "")));
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {ReturnType<typeof buildLoadingInventory>["summary"]} summary
 * @param {number} targetCount
 * @returns {string}
 */
function formatMarkdownSummary(summary, targetCount) {
  const delta = summary.loadingBarTotal - targetCount;
  const deltaLine = delta === 0
    ? "Matches expected loading total."
    : delta > 0
      ? `${delta} more row(s) than expected — save may differ slightly from in-game snapshot, or TTS dedupes 1–2 entries at runtime.`
      : `${Math.abs(delta)} fewer row(s) than expected — check save path / version.`;

  return [
    "# TTS save loading asset inventory",
    "",
    "## Summary",
    "",
    `- Save: **${summary.saveName || "(unknown)"}** (${summary.versionNumber || "?"})`,
    `- Formula: \`${summary.formula}\``,
    `- Global Custom UI: **${summary.customUiGlobalCount}**`,
    `- ObjectStates (in loading bar model): **${summary.objectStateLoadingCount}**`,
    `- **Total loading rows: ${summary.loadingBarTotal}** (expected ~${targetCount}; ${deltaLine})`,
    "",
    "### Excluded from loading bar model",
    "",
    "| Kind | Count |",
    "| --- | ---: |",
    `| HandTrigger | ${summary.excludedFromLoadingBar.handTrigger} |`,
    `| Block* | ${summary.excludedFromLoadingBar.block} |`,
    `| Custom_Assetbundle | ${summary.excludedFromLoadingBar.assetBundle} |`,
    "",
    summary.extraRowCount > 0
      ? `- Supplemental rows (asset bundles, sky, decal pallet): **${summary.extraRowCount}** in \`*-extras.csv\``
      : "",
    "",
    summary.note,
    "",
  ].filter((line) => line.length > 0).join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args.repoRoot || process.cwd());
  const includeExtras = args.noExtras !== "1";
  const targetCount = args.target ? Number.parseInt(args.target, 10) : 1020;
  const gGuidsRegistry = loadGGuidsRegistry(repoRoot);

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
  const { loadingRows, extraRows, summary } = buildLoadingInventory(
    saveRoot,
    gGuidsRegistry,
    includeExtras,
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultOutDir = path.join(repoRoot, ".dev", "build-logs");
  const baseName = args.outBasename || `save-loading-assets-${stamp}`;
  const csvOut = args.csvOut
    ? path.resolve(args.csvOut)
    : path.join(defaultOutDir, `${baseName}.csv`);
  const extrasCsvOut = args.extrasCsvOut
    ? path.resolve(args.extrasCsvOut)
    : path.join(defaultOutDir, `${baseName}-extras.csv`);
  const jsonOut = args.jsonOut
    ? path.resolve(args.jsonOut)
    : path.join(defaultOutDir, `${baseName}.json`);
  const mdOut = args.mdOut
    ? path.resolve(args.mdOut)
    : path.join(defaultOutDir, `${baseName}.md`);

  writeText(csvOut, rowsToCsv(loadingRows));
  if (includeExtras && extraRows.length > 0) {
    writeText(extrasCsvOut, rowsToCsv(extraRows));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    savePath,
    repoRoot,
    targetLoadingCount: targetCount,
    ...summary,
    loadingRows,
    extraRows: includeExtras ? extraRows : [],
  };
  writeText(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);
  writeText(mdOut, formatMarkdownSummary(summary, targetCount));

  console.log(`Save: ${savePath}`);
  console.log("");
  console.log(`Loading bar model: ${summary.loadingBarTotal} rows (${summary.customUiGlobalCount} UI + ${summary.objectStateLoadingCount} objects)`);
  console.log(`Expected (in-game): ~${targetCount}`);
  if (summary.loadingBarTotal !== targetCount) {
    console.log(`Delta: ${summary.loadingBarTotal - targetCount} (see ${mdOut})`);
  }
  console.log(`Excluded: ${summary.excludedFromLoadingBar.assetBundle} asset bundles, ${summary.excludedFromLoadingBar.block} blocks, ${summary.excludedFromLoadingBar.handTrigger} hand triggers`);
  if (includeExtras && extraRows.length > 0) {
    console.log(`Extras CSV: ${extraRows.length} supplemental rows (bundles, sky, decals)`);
  }
  console.log("");
  console.log(`CSV:  ${csvOut}`);
  if (includeExtras && extraRows.length > 0) {
    console.log(`Extras: ${extrasCsvOut}`);
  }
  console.log(`JSON: ${jsonOut}`);
  console.log(`MD:   ${mdOut}`);
}

main();
