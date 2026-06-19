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

const NPC_FIGURINE_TAG = "npc_figurine";
const NPC_CONTROL_TOKEN_TAG = "npc_control_token";
const GM_FIGURINE_PREFIX = "npcInstance:";
const GM_TOKEN_PREFIX = "npcToken:";
const NPC_PRELOAD_FIGURE_SCALE = 0.12;
const AREA_NPC_FIGURINE_YAW_OFFSET_DEG = 180;

/**
 * @typedef {{ fullName: string; scale: number }} NpcCharacterMeta
 */

/**
 * @param {string} fullText
 * @returns {Map<string, NpcCharacterMeta>}
 */
function extractCharacterMetaFromNpcsData(fullText) {
  const inner = extractCharactersTableInner(fullText);

  /** @type {{ key: string; start: number }[]} */
  const headers = [];
  const headerRe = /^  ([A-Za-z0-9_]+) = \{\r?\n/gm;
  let m = headerRe.exec(inner);
  while (m !== null) {
    headers.push({ key: m[1], start: m.index });
    m = headerRe.exec(inner);
  }

  /** @type {Map<string, NpcCharacterMeta>} */
  const meta = new Map();
  for (let i = 0; i < headers.length; i += 1) {
    const { key, start } = headers[i];
    const end = i + 1 < headers.length ? headers[i + 1].start : inner.length;
    const block = inner.slice(start, end);
    const fnMatch = /fullName\s*=\s*"([^"]+)"/.exec(block);
    const scaleMatch = /figurine\s*=\s*\{[\s\S]*?scale\s*=\s*(\d+)/.exec(block);
    const scaleRaw = scaleMatch ? Number(scaleMatch[1]) : 8;
    let scale = Number.isFinite(scaleRaw) ? scaleRaw : 8;
    if (scale < 1) {
      scale = 1;
    }
    if (scale > 500) {
      scale = 500;
    }
    meta.set(key, {
      fullName: fnMatch ? fnMatch[1] : key,
      scale,
    });
  }
  return meta;
}

/**
 * @typedef {{ rotation: number; distance: number; groundLevel: number; spreadBlend: number; positions: { x: number; z: number }[] }} PreloadAreaConfig
 */

/**
 * @param {string} fullText
 * @returns {PreloadAreaConfig}
 */
function parsePreloadAreaFromNpcsData(fullText) {
  const preloadMatch = /preload\s*=\s*\{([\s\S]*?)\n  \},/.exec(fullText);
  if (!preloadMatch) {
    throw new Error('Could not find D.areas.preload block in npcs_data.');
  }
  const block = preloadMatch[1];
  const num = (re, fallback) => {
    const match = re.exec(block);
    return match ? Number(match[1]) : fallback;
  };
  const rotation = num(/rotation\s*=\s*(-?\d+(?:\.\d+)?)/, 0);
  const distance = num(/distance\s*=\s*(-?\d+(?:\.\d+)?)/, 0);
  const groundLevel = num(/groundLevel\s*=\s*(-?\d+(?:\.\d+)?)/, -200);
  const spreadBlend = num(/spreadBlend\s*=\s*(-?\d+(?:\.\d+)?)/, 0);

  /** @type {{ x: number; z: number }[]} */
  const positions = [];
  const posRe = /\{\s*x\s*=\s*(-?\d+(?:\.\d+)?),\s*z\s*=\s*(-?\d+(?:\.\d+)?)\s*\}/g;
  let pm = posRe.exec(block);
  while (pm !== null) {
    positions.push({ x: Number(pm[1]), z: Number(pm[2]) });
    pm = posRe.exec(block);
  }
  if (positions.length === 0) {
    throw new Error("preload.positions empty in npcs_data.");
  }
  return { rotation, distance, groundLevel, spreadBlend, positions };
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} rad
 * @returns {{ x: number; z: number }}
 */
function rotateXZ(x, z, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - z * s, z: x * s + z * c };
}

/**
 * Preload slot world position (matches `NPCS.computeSlotWorldPosition` when ref distance is 0).
 * @param {PreloadAreaConfig} area
 * @param {number} slotIndex 1-based
 * @returns {{ x: number; y: number; z: number }}
 */
function computePreloadSlotWorldPosition(area, slotIndex) {
  const slot = area.positions[slotIndex - 1];
  if (!slot) {
    throw new Error(`preload slot ${slotIndex} out of range (${area.positions.length} positions).`);
  }
  const rad = (area.rotation * Math.PI) / 180;
  const rotated = rotateXZ(slot.x, slot.z, rad);
  const cx = Math.sin(rad) * area.distance;
  const cz = Math.cos(rad) * area.distance;
  return { x: cx + rotated.x, y: area.groundLevel, z: cz + rotated.z };
}

/**
 * @param {PreloadAreaConfig} area
 * @returns {number}
 */
function figurineYawDegreesForArea(area) {
  const rad = (area.rotation * Math.PI) / 180;
  const pivotX = Math.sin(rad) * area.distance;
  const pivotZ = Math.cos(rad) * area.distance;
  if (Math.abs(pivotX) < 1e-9 && Math.abs(pivotZ) < 1e-9) {
    return AREA_NPC_FIGURINE_YAW_OFFSET_DEG;
  }
  return (Math.atan2(-pivotX, -pivotZ) * 180) / Math.PI + AREA_NPC_FIGURINE_YAW_OFFSET_DEG;
}

/**
 * @param {string} characterKey
 * @param {NpcCharacterMeta} meta
 * @param {PreloadAreaConfig} preloadArea
 * @param {number} slotIndex
 * @param {string} frontUrl
 * @param {string} backUrl
 * @param {string} guid
 * @returns {Record<string, unknown>}
 */
function buildNpcFigurineObjectState(characterKey, meta, preloadArea, slotIndex, frontUrl, backUrl, guid) {
  const pos = computePreloadSlotWorldPosition(preloadArea, slotIndex);
  const yawDeg = figurineYawDegreesForArea(preloadArea);
  const us = NPC_PRELOAD_FIGURE_SCALE;
  return {
    GUID: guid,
    Name: "Figurine_Custom",
    Transform: {
      posX: pos.x,
      posY: pos.y,
      posZ: pos.z,
      rotX: 0,
      rotY: yawDeg,
      rotZ: 0,
      scaleX: us,
      scaleY: us,
      scaleZ: us,
    },
    Nickname: meta.fullName,
    Description: "",
    GMNotes: `${GM_FIGURINE_PREFIX}${characterKey}`,
    AltLookAngle: { x: 0, y: 0, z: 0 },
    ColorDiffuse: { r: 1, g: 1, b: 1 },
    LayoutGroupSortIndex: 0,
    Value: 0,
    Locked: true,
    Grid: false,
    Snap: false,
    IgnoreFoW: false,
    MeasureMovement: false,
    DragSelectable: true,
    Autoraise: true,
    Sticky: false,
    Tooltip: false,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    CustomImage: {
      ImageURL: frontUrl,
      ImageSecondaryURL: backUrl,
      ImageScalar: meta.scale,
      WidthScale: 0,
    },
    CustomFigurine: {
      UseMinimalCollider: true,
    },
    LuaScript: "",
    LuaScriptState: "",
    XmlUI: "",
    Tags: [NPC_FIGURINE_TAG],
  };
}

/**
 * @returns {string}
 */
function generateTtsGuid() {
  const bytes = require("crypto").randomBytes(3);
  return bytes.toString("hex");
}

/**
 * @param {unknown} node
 * @param {string} prefix
 * @returns {string|null}
 */
function characterKeyFromGmNotesPrefix(node, prefix) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return null;
  }
  const obj = /** @type {Record<string, unknown>} */ (node);
  const notes = obj.GMNotes;
  if (typeof notes !== "string" || !notes.startsWith(prefix)) {
    return null;
  }
  const key = notes.slice(prefix.length);
  return /^[A-Za-z0-9_]+$/.test(key) ? key : null;
}

/**
 * @param {unknown} node
 * @returns {boolean}
 */
function objectHasTag(node, tag) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return false;
  }
  const tags = /** @type {Record<string, unknown>} */ (node).Tags;
  return Array.isArray(tags) && tags.includes(tag);
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
  extractCharacterMetaFromNpcsData,
  parsePreloadAreaFromNpcsData,
  computePreloadSlotWorldPosition,
  figurineYawDegreesForArea,
  buildNpcFigurineObjectState,
  generateTtsGuid,
  characterKeyFromGmNotesPrefix,
  objectHasTag,
  NPC_FIGURINE_TAG,
  NPC_CONTROL_TOKEN_TAG,
  GM_FIGURINE_PREFIX,
  GM_TOKEN_PREFIX,
  NPC_PRELOAD_FIGURE_SCALE,
};
