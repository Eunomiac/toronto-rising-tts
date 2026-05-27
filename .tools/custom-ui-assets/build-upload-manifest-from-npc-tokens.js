#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/custom-ui-assets/README.md (NPC gameboard token images).
// Scans a folder for tokenFront_<characterKey>.webp + tokenBack_<characterKey>.webp pairs.
// Emits two Custom UI asset rows per character (asset names match file stems).

const fs = require("fs");
const path = require("path");
const readline = require("readline");

/** Default character count per batch when `--batch` is set (2 assets per character). */
const HARDCODED_NPC_TOKEN_BATCH_CHAR_MAX = 20;

/** Canonical repo folder for `tokenFront_<key>.webp` / `tokenBack_<key>.webp` (override with `--dir`). */
const DEFAULT_NPC_TOKEN_IMAGE_DIR = "assets/images/NPC Tokens";

const FRONT_RE = /^tokenFront_([A-Za-z0-9_]+)\.webp$/i;
const BACK_RE = /^tokenBack_([A-Za-z0-9_]+)\.webp$/i;

/**
 * Parse CLI args: `--key value` or boolean `--flag` (value "1").
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

/**
 * @param {string} question
 * @returns {Promise<string>}
 */
function promptLine(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || "").trim());
    });
  });
}

/**
 * @param {string} stem
 * @returns {boolean}
 */
function isValidAssetName(stem) {
  return /^[A-Za-z0-9._-]+$/.test(stem);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeForLuaString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * @param {string} outputPath
 */
function ensureParentDir(outputPath) {
  const parentDir = path.dirname(outputPath);
  fs.mkdirSync(parentDir, { recursive: true });
}

/**
 * Build a `file:///` URL for TTS (forward slashes, no percent-encoding).
 * @param {string} absoluteFilePath
 * @returns {string}
 */
function absoluteOsPathToFileUrl(absoluteFilePath) {
  const normalized = absoluteFilePath.replace(/\\/g, "/");
  return `file:///${normalized}`;
}

/**
 * Slice inner text of the last top-level `D.characters = { ... }` table (skips doc examples in `--[[` blocks).
 * @param {string} fullText
 * @returns {string}
 */
function extractCharactersTableInner(fullText) {
  const re = /^D\.characters\s*=\s*\{/gm;
  let lastBraceIdx = -1;
  let m = re.exec(fullText);
  while (m !== null) {
    const openBrace = fullText.indexOf("{", m.index);
    if (openBrace !== -1) {
      lastBraceIdx = openBrace;
    }
    m = re.exec(fullText);
  }

  if (lastBraceIdx === -1) {
    throw new Error('Could not find "D.characters = {" in npcs data file.');
  }

  let depth = 0;
  let i = lastBraceIdx;
  for (; i < fullText.length; i += 1) {
    const c = fullText[i];
    if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return fullText.slice(lastBraceIdx + 1, i);
      }
    }
  }

  throw new Error("Unclosed D.characters table (brace mismatch).");
}

/**
 * @param {string} fullText
 * @returns {Set<string>}
 */
function extractCharacterKeysFromNpcsData(fullText) {
  const inner = extractCharactersTableInner(fullText);

  /** @type {Set<string>} */
  const keys = new Set();
  const headerRe = /^  ([A-Za-z0-9_]+) = \{\r?\n/gm;
  let m = headerRe.exec(inner);
  while (m !== null) {
    keys.add(m[1]);
    m = headerRe.exec(inner);
  }
  return keys;
}

/**
 * @typedef {{ characterKey: string; frontPath: string; backPath: string }} NpcTokenPair
 */

/**
 * @param {string} dirPath
 * @returns {{ pairs: NpcTokenPair[]; warnings: string[]; errors: string[] }}
 */
function scanTokenPairsInDirectory(dirPath) {
  /** @type {Map<string, { front?: string; back?: string }>} */
  const byKey = new Map();
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const errors = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) {
      continue;
    }
    const name = ent.name;
    let frontMatch = FRONT_RE.exec(name);
    if (frontMatch) {
      const key = frontMatch[1];
      const row = byKey.get(key) || {};
      row.front = path.join(dirPath, name);
      byKey.set(key, row);
      continue;
    }
    let backMatch = BACK_RE.exec(name);
    if (backMatch) {
      const key = backMatch[1];
      const row = byKey.get(key) || {};
      row.back = path.join(dirPath, name);
      byKey.set(key, row);
      continue;
    }
    if (/\.webp$/i.test(name) && (name.startsWith("tokenFront_") || name.startsWith("tokenBack_"))) {
      warnings.push(`Skipped malformed token filename (expected tokenFront_<key>.webp / tokenBack_<key>.webp): ${name}`);
    }
  }

  /** @type {NpcTokenPair[]} */
  const pairs = [];
  for (const [characterKey, row] of byKey.entries()) {
    if (!row.front) {
      errors.push(`Character "${characterKey}": missing tokenFront_${characterKey}.webp`);
      continue;
    }
    if (!row.back) {
      errors.push(`Character "${characterKey}": missing tokenBack_${characterKey}.webp`);
      continue;
    }
    pairs.push({
      characterKey,
      frontPath: row.front,
      backPath: row.back,
    });
  }

  return { pairs, warnings, errors };
}

/**
 * @param {{ characterKey: string }[]} sortedPairs
 * @param {string} startKey
 * @returns {number}
 */
function findBatchStartIndex(sortedPairs, startKey) {
  if (!startKey) {
    return 0;
  }
  const idx = sortedPairs.findIndex((row) => row.characterKey.localeCompare(startKey, "en") >= 0);
  if (idx === -1) {
    return sortedPairs.length;
  }
  return idx;
}

/**
 * @param {{name:string,fileUrl:string,sourcePath:string,characterKey:string,side:"front"|"back"}[]} assets
 * @returns {string}
 */
function buildLuaModule(assets) {
  const manifestAssetLines = assets.map(
    (asset) =>
      `    { name = "${escapeForLuaString(asset.name)}", fileUrl = "${escapeForLuaString(asset.fileUrl)}", characterKey = "${escapeForLuaString(asset.characterKey)}", side = "${asset.side}" },`,
  );

  return [
    "-- Auto-generated by .tools/custom-ui-assets/build-upload-manifest-from-npc-tokens.js",
    "-- Required by DEBUG.loadCustomUiUploadManifest(\"lib.npc_token_upload_manifest\")",
    "local M = {",
    '  source = "npc-tokens",',
    "  assets = {",
    ...manifestAssetLines,
    "  }",
    "}",
    "",
    "return M",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = (args.dir || args.input || DEFAULT_NPC_TOKEN_IMAGE_DIR).trim();

  const npcsDataPath = path.resolve(args.npcsData || "lib/npcs_data.ttslua");
  const outputPath = path.resolve(args.out || ".dev/custom-ui-assets/npc-token-manifest.json");
  const moduleOut = path.resolve(args.moduleOut || "lib/npc_token_upload_manifest.ttslua");
  const skipUnknownKeys = args.skipUnknownKeys === "1" || args.skipUnknownKeys === "true";
  const requireNpcsData = args.requireNpcsData === "1" || args.requireNpcsData === "true";

  const dirPath = path.isAbsolute(inputDir) ? path.normalize(inputDir) : path.resolve(inputDir);
  console.log(`NPC token image directory: ${dirPath}`);
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(
      `Token image directory not found: ${dirPath}\n` +
        `Create it and add tokenFront_<characterKey>.webp + tokenBack_<characterKey>.webp (default: ${DEFAULT_NPC_TOKEN_IMAGE_DIR}).`,
    );
  }

  const { pairs, warnings, errors } = scanTokenPairsInDirectory(dirPath);
  for (const w of warnings) {
    console.warn(`WARN: ${w}`);
  }

  if (pairs.length === 0 && errors.length === 0) {
    throw new Error(`No tokenFront_*.webp / tokenBack_*.webp pairs found in: ${dirPath}`);
  }

  /** @type {Set<string> | null} */
  let knownCharacterKeys = null;
  if (fs.existsSync(npcsDataPath)) {
    const npcsText = fs.readFileSync(npcsDataPath, "utf8");
    knownCharacterKeys = extractCharacterKeysFromNpcsData(npcsText);
  } else if (requireNpcsData) {
    throw new Error(`NPC data file not found (required): ${npcsDataPath}`);
  }

  /** @type {NpcTokenPair[]} */
  const validatedPairs = [];
  for (const pair of pairs) {
    if (knownCharacterKeys !== null && !knownCharacterKeys.has(pair.characterKey)) {
      const msg = `Character key "${pair.characterKey}" not found in D.characters (${path.basename(npcsDataPath)})`;
      if (skipUnknownKeys) {
        warnings.push(`${msg}, skipped`);
        continue;
      }
      errors.push(msg);
      continue;
    }
    validatedPairs.push(pair);
  }

  if (errors.length > 0) {
    const cap = 25;
    const shown = errors.slice(0, cap);
    const extra = errors.length > cap ? `\n... and ${errors.length - cap} more` : "";
    throw new Error(`NPC token manifest validation failed:\n${shown.join("\n")}${extra}`);
  }

  if (validatedPairs.length === 0) {
    throw new Error("No token pairs left after validation; fix filenames or drop --skipUnknownKeys to see errors.");
  }

  validatedPairs.sort((a, b) => a.characterKey.localeCompare(b.characterKey, "en"));

  const batched = args.batch === "1" || args.batch === "true";
  let batchCharMax = parseInt(String(args.batchMax || "0"), 10);
  if (Number.isNaN(batchCharMax) || batchCharMax < 0) {
    batchCharMax = 0;
  }
  if (batched && batchCharMax === 0) {
    batchCharMax = HARDCODED_NPC_TOKEN_BATCH_CHAR_MAX;
  }

  let batchStartArg = (args.batchStart || "").trim();
  /** @type {NpcTokenPair[]} */
  let slicePairs = validatedPairs;

  if (batchCharMax > 0 && validatedPairs.length > batchCharMax) {
    if (!batchStartArg && process.stdin.isTTY) {
      batchStartArg = await promptLine(
        `Validated ${validatedPairs.length} NPC token pairs. This manifest includes at most ${batchCharMax} characters (alphabetical keys).\nEnter characterKey to start (empty = first): `,
      );
    }
    if (!batchStartArg && !process.stdin.isTTY) {
      throw new Error(
        `Refusing to write a partial manifest: ${validatedPairs.length} characters exceed --batchMax ${batchCharMax}. ` +
          `Pass --batchStart <characterKey>, set --batchMax 0 for all pairs, or run interactively.`,
      );
    }
    const startIdx = findBatchStartIndex(validatedPairs, batchStartArg);
    slicePairs = validatedPairs.slice(startIdx, startIdx + batchCharMax);
    if (slicePairs.length === 0) {
      throw new Error(
        `No characters in this batch window (--batchStart "${batchStartArg}" → index ${startIdx}). Check spelling.`,
      );
    }
    const nextIdx = startIdx + slicePairs.length;
    if (nextIdx < validatedPairs.length) {
      console.log("");
      console.log(`Next batch: re-run with --batchStart ${validatedPairs[nextIdx].characterKey}`);
    } else {
      console.log("");
      console.log("This batch reaches the last character key; no further --batchStart needed.");
    }
  }

  /** @type {{name:string,fileUrl:string,sourcePath:string,characterKey:string,side:"front"|"back"}[]} */
  const assets = [];
  for (const pair of slicePairs) {
    const frontName = `tokenFront_${pair.characterKey}`;
    const backName = `tokenBack_${pair.characterKey}`;
    if (!isValidAssetName(frontName) || !isValidAssetName(backName)) {
      throw new Error(`Invalid derived asset name for character "${pair.characterKey}"`);
    }

    const frontUrl = absoluteOsPathToFileUrl(pair.frontPath);
    const backUrl = absoluteOsPathToFileUrl(pair.backPath);
    assets.push({
      name: frontName,
      fileUrl: frontUrl,
      sourcePath: pair.frontPath,
      characterKey: pair.characterKey,
      side: "front",
    });
    assets.push({
      name: backName,
      fileUrl: backUrl,
      sourcePath: pair.backPath,
      characterKey: pair.characterKey,
      side: "back",
    });
  }

  const outputManifest = {
    generatedAt: new Date().toISOString(),
    source: "npc-tokens",
    inputDirectory: dirPath,
    count: assets.length,
    characterCount: slicePairs.length,
    totalCharacterPairsValidated: validatedPairs.length,
    npcTokenBatch:
      batchCharMax > 0
        ? {
            batchCharMax,
            batchStartFilter: batchStartArg || null,
            firstCharacterKey: slicePairs[0].characterKey,
            lastCharacterKey: slicePairs[slicePairs.length - 1].characterKey,
          }
        : undefined,
    assets,
  };

  ensureParentDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(outputManifest, null, 2)}\n`, "utf8");
  ensureParentDir(moduleOut);
  fs.writeFileSync(moduleOut, buildLuaModule(assets), "utf8");

  console.log(`Manifest written: ${outputPath}`);
  console.log(`Lua module written: ${moduleOut}`);
  console.log(
    `NPC token assets in this manifest: ${assets.length} files (${slicePairs.length} characters × front+back)`,
  );
  if (knownCharacterKeys !== null) {
    console.log(`Validated against ${knownCharacterKeys.size} D.characters keys in ${path.basename(npcsDataPath)}`);
  } else {
    console.warn(`WARN: ${path.basename(npcsDataPath)} not found — filenames only, no D.characters cross-check`);
  }
  console.log("");
  console.log("NEXT (TTS):");
  console.log("1) Save & Play");
  console.log("2) lua DEBUG.spawnNpcTokenUploadBatch({ columns = 12, gap = 2, startY = 3 })");
  console.log("   (or lua DEBUG.spawnCustomUiUploadBatch(opts, \"lib.npc_token_upload_manifest\"))");
  console.log("3) Cloud Manager → Upload All Loaded Files → Save game");
  console.log("4) Merge + extract paired URLs:");
  console.log(
    "   npm run custom-ui-assets:merge -- --save <path> --manifest .dev/custom-ui-assets/npc-token-manifest.json",
  );
  console.log("   npm run custom-ui-assets:extract-npc-token-urls");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
