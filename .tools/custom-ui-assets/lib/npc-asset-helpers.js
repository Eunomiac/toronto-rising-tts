#!/usr/bin/env node
"use strict";

// Shared helpers for NPC unified asset upload (figurine + control-board token groups).

const fs = require("fs");
const path = require("path");

const TOKEN_FRONT_RE = /^tokenFront_([A-Za-z0-9_]+)\.webp$/i;
const TOKEN_BACK_RE = /^tokenBack_([A-Za-z0-9_]+)\.webp$/i;
const FIGURINE_BACK_RE = /^([A-Za-z0-9_]+)Back\.webp$/i;
const FIGURINE_FRONT_RE = /^([A-Za-z0-9_]+)\.webp$/i;

/** Default batch size when `--batch` is set (characters per manifest, 4 assets each). */
const HARDCODED_NPC_GROUP_BATCH_CHAR_MAX = 15;

/** Canonical unified NPC image folder (override with `--dir`). */
const DEFAULT_NPC_GROUP_IMAGE_DIR = "assets/images/NPCs";

/**
 * Check if URL looks like a hosted Steam content URL.
 * @param {unknown} value
 * @returns {value is string}
 */
function isHostedSteamUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^https?:\/\/(?:cloud-\d+\.steamusercontent\.com|steamusercontent-a\.akamaihd\.net)\/ugc\//i.test(value);
}

/**
 * @param {string} outputPath
 */
function ensureParentDir(outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
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
 * @param {string} value
 * @returns {string}
 */
function escapeForLuaString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * @param {string} stem
 * @returns {boolean}
 */
function isValidAssetName(stem) {
  return /^[A-Za-z0-9._-]+$/.test(stem);
}

/**
 * Slice inner text of the last top-level `D.characters = { ... }` table.
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
 * @param {unknown} saveRoot
 * @returns {Map<string, string>}
 */
function readCustomUiAssetMap(saveRoot) {
  /** @type {Map<string, string>} */
  const map = new Map();
  if (!saveRoot || typeof saveRoot !== "object") {
    return map;
  }

  const root = /** @type {Record<string, unknown>} */ (saveRoot);
  /** @type {unknown[] | undefined} */
  let assets = Array.isArray(root.CustomUIAssets) ? root.CustomUIAssets : undefined;
  if (!assets && Array.isArray(root.CustomAssets)) {
    assets = root.CustomAssets;
  }
  if (!assets) {
    return map;
  }

  for (const entry of assets) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (entry);
    const name = row.Name;
    const url = row.URL;
    if (typeof name === "string" && name.length > 0 && typeof url === "string" && url.length > 0) {
      map.set(name, url);
    }
  }
  return map;
}

/**
 * @param {string} characterKey
 * @returns {{ figurineFront: string; figurineBack: string; tokenFront: string; tokenBack: string }}
 */
function deriveNpcGroupAssetNames(characterKey) {
  return {
    figurineFront: characterKey,
    figurineBack: `${characterKey}Back`,
    tokenFront: `tokenFront_${characterKey}`,
    tokenBack: `tokenBack_${characterKey}`,
  };
}

/**
 * @param {Map<string, string>} assetMap
 * @param {string} characterKey
 * @returns {boolean}
 */
function isNpcGroupFullyHosted(assetMap, characterKey) {
  const names = deriveNpcGroupAssetNames(characterKey);
  for (const name of Object.values(names)) {
    const url = assetMap.get(name);
    if (!isHostedSteamUrl(url)) {
      return false;
    }
  }
  return true;
}

/**
 * @typedef {{
 *   characterKey: string;
 *   figurineFrontPath: string;
 *   figurineBackPath: string;
 *   tokenFrontPath: string;
 *   tokenBackPath: string;
 * }} NpcAssetGroup
 */

/**
 * @param {string} dirPath
 * @returns {{ groups: NpcAssetGroup[]; errors: string[] }}
 */
function scanNpcGroupsInDirectory(dirPath) {
  /** @type {Map<string, Partial<Record<"figurineFront"|"figurineBack"|"tokenFront"|"tokenBack", string>>>} */
  const byKey = new Map();
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const unclassified = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) {
      continue;
    }
    const name = ent.name;
    if (!/\.webp$/i.test(name)) {
      continue;
    }

    const fullPath = path.join(dirPath, name);
    let matched = false;

    const tokenFrontMatch = TOKEN_FRONT_RE.exec(name);
    if (tokenFrontMatch) {
      const key = tokenFrontMatch[1];
      const row = byKey.get(key) || {};
      row.tokenFront = fullPath;
      byKey.set(key, row);
      matched = true;
      continue;
    }

    const tokenBackMatch = TOKEN_BACK_RE.exec(name);
    if (tokenBackMatch) {
      const key = tokenBackMatch[1];
      const row = byKey.get(key) || {};
      row.tokenBack = fullPath;
      byKey.set(key, row);
      matched = true;
      continue;
    }

    const figurineBackMatch = FIGURINE_BACK_RE.exec(name);
    if (figurineBackMatch) {
      const key = figurineBackMatch[1];
      const row = byKey.get(key) || {};
      row.figurineBack = fullPath;
      byKey.set(key, row);
      matched = true;
      continue;
    }

    const figurineFrontMatch = FIGURINE_FRONT_RE.exec(name);
    if (figurineFrontMatch) {
      const key = figurineFrontMatch[1];
      const row = byKey.get(key) || {};
      row.figurineFront = fullPath;
      byKey.set(key, row);
      matched = true;
      continue;
    }

    if (!matched) {
      unclassified.push(name);
    }
  }

  if (unclassified.length > 0) {
    errors.push(`Unclassified WEBP files (expected 4-file group naming): ${unclassified.join(", ")}`);
  }

  /** @type {NpcAssetGroup[]} */
  const groups = [];
  for (const [characterKey, row] of byKey.entries()) {
    if (!row.figurineFront) {
      errors.push(`Character "${characterKey}": missing ${characterKey}.webp`);
    }
    if (!row.figurineBack) {
      errors.push(`Character "${characterKey}": missing ${characterKey}Back.webp`);
    }
    if (!row.tokenFront) {
      errors.push(`Character "${characterKey}": missing tokenFront_${characterKey}.webp`);
    }
    if (!row.tokenBack) {
      errors.push(`Character "${characterKey}": missing tokenBack_${characterKey}.webp`);
    }
    if (row.figurineFront && row.figurineBack && row.tokenFront && row.tokenBack) {
      groups.push({
        characterKey,
        figurineFrontPath: row.figurineFront,
        figurineBackPath: row.figurineBack,
        tokenFrontPath: row.tokenFront,
        tokenBackPath: row.tokenBack,
      });
    }
  }

  groups.sort((a, b) => a.characterKey.localeCompare(b.characterKey, "en"));
  return { groups, errors };
}

/**
 * @param {{ characterKey: string }[]} sortedGroups
 * @param {string} startKey
 * @returns {number}
 */
function findBatchStartIndex(sortedGroups, startKey) {
  if (!startKey) {
    return 0;
  }
  const idx = sortedGroups.findIndex((row) => row.characterKey.localeCompare(startKey, "en") >= 0);
  if (idx === -1) {
    return sortedGroups.length;
  }
  return idx;
}

/**
 * @param {NpcAssetGroup} group
 * @returns {{ name: string; fileUrl: string; sourcePath: string; characterKey: string; kind: string }[]}
 */
function groupToManifestAssets(group) {
  const names = deriveNpcGroupAssetNames(group.characterKey);
  const rows = [
    { kind: "figurineFront", name: names.figurineFront, sourcePath: group.figurineFrontPath },
    { kind: "figurineBack", name: names.figurineBack, sourcePath: group.figurineBackPath },
    { kind: "tokenFront", name: names.tokenFront, sourcePath: group.tokenFrontPath },
    { kind: "tokenBack", name: names.tokenBack, sourcePath: group.tokenBackPath },
  ];

  return rows.map((row) => {
    if (!isValidAssetName(row.name)) {
      throw new Error(`Invalid derived asset name "${row.name}" for character "${group.characterKey}"`);
    }
    return {
      name: row.name,
      fileUrl: absoluteOsPathToFileUrl(row.sourcePath),
      sourcePath: row.sourcePath,
      characterKey: group.characterKey,
      kind: row.kind,
    };
  });
}

module.exports = {
  TOKEN_FRONT_RE,
  TOKEN_BACK_RE,
  FIGURINE_BACK_RE,
  FIGURINE_FRONT_RE,
  HARDCODED_NPC_GROUP_BATCH_CHAR_MAX,
  DEFAULT_NPC_GROUP_IMAGE_DIR,
  isHostedSteamUrl,
  ensureParentDir,
  absoluteOsPathToFileUrl,
  escapeForLuaString,
  isValidAssetName,
  extractCharactersTableInner,
  extractCharacterKeysFromNpcsData,
  readCustomUiAssetMap,
  deriveNpcGroupAssetNames,
  isNpcGroupFullyHosted,
  scanNpcGroupsInDirectory,
  findBatchStartIndex,
  groupToManifestAssets,
};
