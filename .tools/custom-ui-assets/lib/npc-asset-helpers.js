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
 * @param {{ registeredKeys?: Set<string> | null }} [options]
 * @returns {{ groups: NpcAssetGroup[]; errors: string[]; skippedUnregisteredKeys: string[] }}
 */
function scanNpcGroupsInDirectory(dirPath, options = {}) {
  const registeredKeys = options.registeredKeys ?? null;
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
  /** @type {string[]} */
  const skippedUnregisteredKeys = [];
  for (const [characterKey, row] of byKey.entries()) {
    const isRegistered = registeredKeys === null || registeredKeys.has(characterKey);
    const isComplete =
      row.figurineFront && row.figurineBack && row.tokenFront && row.tokenBack;

    if (!row.figurineFront) {
      if (isRegistered) {
        errors.push(`Character "${characterKey}": missing ${characterKey}.webp`);
      }
    }
    if (!row.figurineBack) {
      if (isRegistered) {
        errors.push(`Character "${characterKey}": missing ${characterKey}Back.webp`);
      }
    }
    if (!row.tokenFront) {
      if (isRegistered) {
        errors.push(`Character "${characterKey}": missing tokenFront_${characterKey}.webp`);
      }
    }
    if (!row.tokenBack) {
      if (isRegistered) {
        errors.push(`Character "${characterKey}": missing tokenBack_${characterKey}.webp`);
      }
    }
    if (isComplete) {
      if (isRegistered) {
        groups.push({
          characterKey,
          figurineFrontPath: row.figurineFront,
          figurineBackPath: row.figurineBack,
          tokenFrontPath: row.tokenFront,
          tokenBackPath: row.tokenBack,
        });
      } else if (registeredKeys !== null) {
        skippedUnregisteredKeys.push(characterKey);
      }
    }
  }

  groups.sort((a, b) => a.characterKey.localeCompare(b.characterKey, "en"));
  skippedUnregisteredKeys.sort((a, b) => a.localeCompare(b, "en"));
  return { groups, errors, skippedUnregisteredKeys };
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

const CONTROL_BOARD_PALETTE_GUID = "ee686e";
const PALETTE_SURFACE_LOCAL_Y = 0.18;
const PALETTE_GROUP_BLACKLIST = new Set(["princesCourt"]);
const NPC_CONTROL_TOKEN_TILE_TYPE = 2;
const NPC_CONTROL_TOKEN_TILE_THICKNESS = 0.1;
const NPC_CONTROL_TOKEN_DEFAULT_SCALE = 0.38;

const DEFAULT_PALETTE_SNAP_CFG = {
  columns: 20,
  rows: 40,
  uMargin: 0.02,
  vMargin: 0.02,
  parkingEdgePadding: 0.06,
  parkingVMin: null,
  parkingVMax: null,
  snapYawOffsetDeg: 180,
};

/**
 * @param {unknown} node
 * @param {Map<string, Record<string, unknown>>} figurinesByKey
 * @param {Map<string, Record<string, unknown>>} tokensByKey
 */
function indexExistingNpcObjects(node, figurinesByKey, tokensByKey) {
  if (node === null || node === undefined) {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      indexExistingNpcObjects(node[i], figurinesByKey, tokensByKey);
    }
    return;
  }
  if (typeof node !== "object") {
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  const figKey = characterKeyFromGmNotesPrefix(obj, GM_FIGURINE_PREFIX);
  if (figKey !== null && (objectHasTag(obj, NPC_FIGURINE_TAG) || obj.Name === "Figurine_Custom")) {
    figurinesByKey.set(figKey, obj);
  }
  const tokenKey = characterKeyFromGmNotesPrefix(obj, GM_TOKEN_PREFIX);
  if (tokenKey !== null && objectHasTag(obj, NPC_CONTROL_TOKEN_TAG)) {
    tokensByKey.set(tokenKey, obj);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "LuaScript") {
      continue;
    }
    indexExistingNpcObjects(value, figurinesByKey, tokensByKey);
  }
}

/**
 * @param {unknown[]} objectStates
 * @param {string} guid
 * @returns {Record<string, unknown>|null}
 */
function findSaveObjectByGuid(objectStates, guid) {
  /** @type {Record<string, unknown>|null} */
  let found = null;
  const walk = (nodes) => {
    if (found !== null || !Array.isArray(nodes)) {
      return;
    }
    for (const node of nodes) {
      if (!node || typeof node !== "object") {
        continue;
      }
      const obj = /** @type {Record<string, unknown>} */ (node);
      if (obj.GUID === guid) {
        found = obj;
        return;
      }
      if (Array.isArray(obj.ContainedObjects)) {
        walk(obj.ContainedObjects);
      }
    }
  };
  walk(objectStates);
  return found;
}

/**
 * @param {Map<string, string>} assetMap
 * @param {string} characterKey
 * @returns {{ figurineFront: string; figurineBack: string; tokenFront: string; tokenBack: string }|null}
 */
function hostedNpcGroupUrlsForCharacter(assetMap, characterKey) {
  const names = deriveNpcGroupAssetNames(characterKey);
  const figurineFront = assetMap.get(names.figurineFront);
  const figurineBack = assetMap.get(names.figurineBack);
  const tokenFront = assetMap.get(names.tokenFront);
  const tokenBack = assetMap.get(names.tokenBack);
  if (
    !isHostedSteamUrl(figurineFront)
    || !isHostedSteamUrl(figurineBack)
    || !isHostedSteamUrl(tokenFront)
    || !isHostedSteamUrl(tokenBack)
  ) {
    return null;
  }
  return { figurineFront, figurineBack, tokenFront, tokenBack };
}

/**
 * Merge hosted NPC group asset rows from merge output JSON into a name→URL map.
 * @param {Map<string, string>} map
 * @param {string} generatedAssetsPath
 */
function mergeNpcGroupRowsFromGeneratedFile(map, generatedAssetsPath) {
  if (!generatedAssetsPath || !fs.existsSync(generatedAssetsPath)) {
    return;
  }
  const raw = JSON.parse(fs.readFileSync(generatedAssetsPath, "utf8"));
  if (!Array.isArray(raw)) {
    return;
  }
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const name = entry.Name;
    const url = entry.URL;
    if (typeof name === "string" && isHostedSteamUrl(url)) {
      map.set(name, url);
    }
  }
}

/**
 * Build name→URL map from save CustomUIAssets plus optional merge output file.
 * @param {unknown} saveRoot
 * @param {string|undefined} generatedAssetsPath
 * @returns {Map<string, string>}
 */
function loadHostedNpcGroupAssetMap(saveRoot, generatedAssetsPath) {
  const map = readCustomUiAssetMap(saveRoot);
  mergeNpcGroupRowsFromGeneratedFile(map, generatedAssetsPath || "");
  return map;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} frontUrl
 * @param {string} backUrl
 * @param {number} imageScalar
 * @param {{ x: number; y: number; z: number }} pos
 * @param {number} yawDeg
 */
function patchFigurineObject(obj, frontUrl, backUrl, imageScalar, pos, yawDeg) {
  let customImage = obj.CustomImage;
  if (!customImage || typeof customImage !== "object" || Array.isArray(customImage)) {
    customImage = {};
    obj.CustomImage = customImage;
  }
  const img = /** @type {Record<string, unknown>} */ (customImage);
  img.ImageURL = frontUrl;
  img.ImageSecondaryURL = backUrl;
  img.ImageScalar = imageScalar;
  img.WidthScale = 0;

  let transform = obj.Transform;
  if (!transform || typeof transform !== "object" || Array.isArray(transform)) {
    transform = {};
    obj.Transform = transform;
  }
  const t = /** @type {Record<string, unknown>} */ (transform);
  t.posX = pos.x;
  t.posY = pos.y;
  t.posZ = pos.z;
  t.rotY = yawDeg;
  t.scaleX = NPC_PRELOAD_FIGURE_SCALE;
  t.scaleY = NPC_PRELOAD_FIGURE_SCALE;
  t.scaleZ = NPC_PRELOAD_FIGURE_SCALE;
  obj.Locked = true;
  obj.Tooltip = false;
  if (!Array.isArray(obj.Tags)) {
    obj.Tags = [NPC_FIGURINE_TAG];
  } else if (!obj.Tags.includes(NPC_FIGURINE_TAG)) {
    obj.Tags.push(NPC_FIGURINE_TAG);
  }
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} frontUrl
 * @param {string} backUrl
 */
function patchTokenObject(obj, frontUrl, backUrl) {
  let customImage = obj.CustomImage;
  if (!customImage || typeof customImage !== "object" || Array.isArray(customImage)) {
    customImage = {};
    obj.CustomImage = customImage;
  }
  const img = /** @type {Record<string, unknown>} */ (customImage);
  img.ImageURL = frontUrl;
  img.ImageSecondaryURL = backUrl;
  img.ImageScalar = 1;
  img.WidthScale = 0;
  img.CustomTile = {
    Type: NPC_CONTROL_TOKEN_TILE_TYPE,
    Thickness: NPC_CONTROL_TOKEN_TILE_THICKNESS,
    Stackable: false,
    Stretch: true,
  };
}

/**
 * @param {{ x: number; y: number; z: number }} worldPos
 * @param {number} yawDeg
 * @param {number} rotZDeg
 * @param {string} characterKey
 * @param {string} frontUrl
 * @param {string} backUrl
 * @param {string} guid
 * @param {number|undefined} scale
 * @returns {Record<string, unknown>}
 */
function buildNpcControlTokenObjectState(
  worldPos,
  yawDeg,
  rotZDeg,
  characterKey,
  frontUrl,
  backUrl,
  guid,
  scale,
) {
  let s = Number(scale);
  if (!Number.isFinite(s) || s <= 0) {
    s = NPC_CONTROL_TOKEN_DEFAULT_SCALE;
  }
  return {
    GUID: guid,
    Name: "Custom_Tile",
    Transform: {
      posX: worldPos.x,
      posY: worldPos.y,
      posZ: worldPos.z,
      rotX: 0,
      rotY: yawDeg,
      rotZ: rotZDeg,
      scaleX: s,
      scaleY: 1,
      scaleZ: s,
    },
    Nickname: characterKey,
    Description: "",
    GMNotes: `${GM_TOKEN_PREFIX}${characterKey}`,
    AltLookAngle: { x: 0, y: 0, z: 0 },
    ColorDiffuse: { r: 1, g: 1, b: 1 },
    LayoutGroupSortIndex: 0,
    Value: 0,
    Locked: false,
    Grid: false,
    Snap: false,
    IgnoreFoW: false,
    MeasureMovement: false,
    DragSelectable: true,
    Autoraise: true,
    Sticky: false,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    CustomImage: {
      ImageURL: frontUrl,
      ImageSecondaryURL: backUrl,
      ImageScalar: 1,
      WidthScale: 0,
      CustomTile: {
        Type: NPC_CONTROL_TOKEN_TILE_TYPE,
        Thickness: NPC_CONTROL_TOKEN_TILE_THICKNESS,
        Stackable: false,
        Stretch: true,
      },
    },
    LuaScript: "",
    LuaScriptState: "",
    XmlUI: "",
    Tags: [NPC_CONTROL_TOKEN_TAG],
  };
}

/**
 * @param {number} minVal
 * @param {number} maxVal
 * @returns {[number, number]}
 */
function clampParkingBand(minVal, maxVal) {
  let lo = Number(minVal) || 0;
  let hi = Number(maxVal) || 1;
  if (hi < lo) {
    const mid = (lo + hi) * 0.5;
    return [mid - 0.01, mid + 0.01];
  }
  return [lo, hi];
}

/**
 * @param {typeof DEFAULT_PALETTE_SNAP_CFG} cfg
 * @returns {{ columns: number; rows: number; parkingUMin: number; parkingUMax: number; parkingVMin: number; parkingVMax: number; snapYawOffsetDeg: number }}
 */
function paletteSnapConfig(cfg = DEFAULT_PALETTE_SNAP_CFG) {
  let columns = Math.floor(Number(cfg.columns) || 20);
  let rows = Math.floor(Number(cfg.rows) || 40);
  if (columns < 1) {
    columns = 20;
  }
  if (rows < 1) {
    rows = 40;
  }
  const uMargin = Number(cfg.uMargin) || 0.02;
  const vMargin = Number(cfg.vMargin) || 0.02;
  let edge = Number(cfg.parkingEdgePadding);
  if (!Number.isFinite(edge)) {
    edge = 0.06;
  }
  if (edge < 0) {
    edge = 0;
  }
  let uMin = uMargin + edge;
  let uMax = 1 - uMargin - edge;
  let vMin = cfg.parkingVMin === null || cfg.parkingVMin === undefined ? vMargin + edge : Math.max(Number(cfg.parkingVMin), vMargin + edge);
  let vMax = cfg.parkingVMax === null || cfg.parkingVMax === undefined ? 1 - vMargin - edge : Math.min(Number(cfg.parkingVMax), 1 - vMargin - edge);
  [uMin, uMax] = clampParkingBand(uMin, uMax);
  [vMin, vMax] = clampParkingBand(vMin, vMax);
  return {
    columns,
    rows,
    parkingUMin: uMin,
    parkingUMax: uMax,
    parkingVMin: vMin,
    parkingVMax: vMax,
    snapYawOffsetDeg: Number(cfg.snapYawOffsetDeg) || 180,
  };
}

/**
 * @param {string} fullText
 * @returns {Map<string, Record<string, number>>}
 */
function extractCharacterGroupsFromNpcsData(fullText) {
  const inner = extractCharactersTableInner(fullText);
  /** @type {{ key: string; start: number }[]} */
  const headers = [];
  const headerRe = /^  ([A-Za-z0-9_]+) = \{\r?\n/gm;
  let m = headerRe.exec(inner);
  while (m !== null) {
    headers.push({ key: m[1], start: m.index });
    m = headerRe.exec(inner);
  }
  /** @type {Map<string, Record<string, number>>} */
  const out = new Map();
  for (let i = 0; i < headers.length; i += 1) {
    const { key, start } = headers[i];
    const end = i + 1 < headers.length ? headers[i + 1].start : inner.length;
    const block = inner.slice(start, end);
    const groupsMatch = /groups\s*=\s*\{([\s\S]*?)\n\s*\}/.exec(block);
    /** @type {Record<string, number>} */
    const groups = {};
    if (groupsMatch) {
      const pairRe = /([A-Za-z0-9_]+)\s*=\s*(\d+)/g;
      let gm = pairRe.exec(groupsMatch[1]);
      while (gm !== null) {
        groups[gm[1]] = Number(gm[2]);
        gm = pairRe.exec(groupsMatch[1]);
      }
    }
    out.set(key, groups);
  }
  return out;
}

/**
 * @param {Record<string, number>} groups
 * @returns {string|null}
 */
function resolvePaletteGroupId(groups) {
  const survivors = [];
  for (const [groupId] of Object.entries(groups)) {
    if (!PALETTE_GROUP_BLACKLIST.has(groupId)) {
      survivors.push(groupId);
    }
  }
  if (survivors.length === 0) {
    return null;
  }
  survivors.sort((a, b) => a.localeCompare(b, "en"));
  return survivors[0];
}

/**
 * @param {string} fullText
 * @returns {Map<string, number>}
 */
function buildTokenSnapAssignmentsFromNpcsData(fullText) {
  const groupsByKey = extractCharacterGroupsFromNpcsData(fullText);
  const characterKeys = [...groupsByKey.keys()].sort((a, b) => a.localeCompare(b, "en"));
  const cfg = paletteSnapConfig();
  const columns = cfg.columns;
  /** @type {Map<string, { characterKey: string; slotIndex: number }[]>} */
  const byGroup = new Map();
  /** @type {string[]} */
  const ungrouped = [];

  for (const characterKey of characterKeys) {
    const groups = groupsByKey.get(characterKey) || {};
    const groupId = resolvePaletteGroupId(groups);
    if (groupId !== null) {
      const slotIndex = Number(groups[groupId]) || 0;
      const list = byGroup.get(groupId) || [];
      list.push({ characterKey, slotIndex });
      byGroup.set(groupId, list);
    } else {
      ungrouped.push(characterKey);
    }
  }

  const groupIds = [...byGroup.keys()].sort((a, b) => a.localeCompare(b, "en"));
  ungrouped.sort((a, b) => a.localeCompare(b, "en"));

  /** @type {Map<string, number>} */
  const assignments = new Map();
  let row = 0;
  let col = 0;

  const advanceGap = () => {
    if (col >= columns) {
      row += 1;
      col = 0;
    }
    col += 1;
    if (col >= columns) {
      row += 1;
      col = 0;
    }
  };

  const placeGroup = (members) => {
    members.sort((a, b) => {
      if (a.slotIndex === b.slotIndex) {
        return a.characterKey.localeCompare(b.characterKey, "en");
      }
      return a.slotIndex - b.slotIndex;
    });
    const count = members.length;
    if (count < 1) {
      return;
    }
    if (count > columns) {
      for (const member of members) {
        if (col >= columns) {
          row += 1;
          col = 0;
        }
        assignments.set(member.characterKey, row * columns + col);
        col += 1;
      }
      return;
    }
    if (col > 0 && col + count > columns) {
      row += 1;
      col = 0;
    }
    for (const member of members) {
      assignments.set(member.characterKey, row * columns + col);
      col += 1;
    }
  };

  for (let gi = 0; gi < groupIds.length; gi += 1) {
    if (gi > 0) {
      advanceGap();
    } else if (col !== 0) {
      col = 0;
    }
    placeGroup(byGroup.get(groupIds[gi]) || []);
  }

  if (ungrouped.length > 0) {
    if (assignments.size > 0) {
      advanceGap();
    }
    const members = ungrouped.map((characterKey, index) => ({
      characterKey,
      slotIndex: index + 1,
    }));
    placeGroup(members);
  }

  return assignments;
}

/**
 * @param {Map<string, number>} assignments
 * @param {number} columns
 * @returns {number}
 */
function parkingUsedRowCount(assignments, columns) {
  let maxRow = 0;
  for (const snapIndex of assignments.values()) {
    const row = Math.floor(snapIndex / columns);
    if (row > maxRow) {
      maxRow = row;
    }
  }
  return Math.max(1, maxRow + 1);
}

/**
 * @param {number} col
 * @param {number} row
 * @param {number} usedRowCount
 * @param {ReturnType<typeof paletteSnapConfig>} cfg
 * @returns {[number, number]}
 */
function paletteUvForGridCell(col, row, usedRowCount, cfg) {
  const columns = cfg.columns;
  let u = cfg.parkingUMin;
  if (columns > 1) {
    u = cfg.parkingUMin + (col / (columns - 1)) * (cfg.parkingUMax - cfg.parkingUMin);
  }
  const count = Math.max(1, usedRowCount);
  let v;
  if (count <= 1) {
    v = (cfg.parkingVMin + cfg.parkingVMax) * 0.5;
  } else {
    v = cfg.parkingVMax - (row / (count - 1)) * (cfg.parkingVMax - cfg.parkingVMin);
  }
  return [u, v];
}

/**
 * @param {number} deg
 * @returns {number}
 */
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * @param {{ x: number; y: number; z: number }} local
 * @param {number} rotX
 * @param {number} rotY
 * @param {number} rotZ
 * @returns {{ x: number; y: number; z: number }}
 */
function rotateLocalByEuler(local, rotX, rotY, rotZ) {
  const cx = Math.cos(degToRad(rotX));
  const sx = Math.sin(degToRad(rotX));
  const cy = Math.cos(degToRad(rotY));
  const sy = Math.sin(degToRad(rotY));
  const cz = Math.cos(degToRad(rotZ));
  const sz = Math.sin(degToRad(rotZ));

  let { x, y, z } = local;
  let x1 = x * cy + z * sy;
  let z1 = -x * sy + z * cy;
  x = x1;
  z = z1;
  const y2 = y * cx - z * sx;
  const z2 = y * sx + z * cx;
  y = y2;
  z = z2;
  x1 = x * cz - y * sz;
  const y1 = x * sz + y * cz;
  return { x: x1, y: y1, z };
}

/**
 * @param {Record<string, number>} transform
 * @param {{ x: number; y: number; z: number }} local
 * @returns {{ x: number; y: number; z: number }}
 */
function boardLocalToWorld(transform, local) {
  const sx = Number(transform.scaleX) || 1;
  const sy = Number(transform.scaleY) || 1;
  const sz = Number(transform.scaleZ) || 1;
  const scaled = { x: local.x * sx, y: local.y * sy, z: local.z * sz };
  const rotated = rotateLocalByEuler(
    scaled,
    Number(transform.rotX) || 0,
    Number(transform.rotY) || 0,
    Number(transform.rotZ) || 0,
  );
  return {
    x: (Number(transform.posX) || 0) + rotated.x,
    y: (Number(transform.posY) || 0) + rotated.y,
    z: (Number(transform.posZ) || 0) + rotated.z,
  };
}

/**
 * @param {Record<string, unknown>} paletteObj
 * @param {number} snapIndex
 * @param {Map<string, number>} assignments
 * @returns {{ worldPos: { x: number; y: number; z: number }; yawDeg: number; rotZDeg: number }|null}
 */
function paletteParkingPoseForCharacter(paletteObj, snapIndex, assignments) {
  const transform = paletteObj.Transform;
  if (!transform || typeof transform !== "object" || Array.isArray(transform)) {
    return null;
  }
  const t = /** @type {Record<string, number>} */ (transform);
  const cfg = paletteSnapConfig();
  const columns = cfg.columns;
  const col = snapIndex % columns;
  const row = Math.floor(snapIndex / columns);
  if (row >= cfg.rows) {
    return null;
  }
  const usedRows = parkingUsedRowCount(assignments, columns);
  const [u, v] = paletteUvForGridCell(col, row, usedRows, cfg);
  const halfX = 0.5;
  const halfZ = 0.5;
  const local = {
    x: (u - 0.5) * 2 * halfX,
    y: PALETTE_SURFACE_LOCAL_Y,
    z: (v - 0.5) * 2 * halfZ,
  };
  const boardYaw = Number(t.rotY) || 0;
  const yawDeg = boardYaw + cfg.snapYawOffsetDeg;
  return {
    worldPos: boardLocalToWorld(t, local),
    yawDeg,
    rotZDeg: 180,
  };
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
  CONTROL_BOARD_PALETTE_GUID,
  indexExistingNpcObjects,
  findSaveObjectByGuid,
  hostedNpcGroupUrlsForCharacter,
  loadHostedNpcGroupAssetMap,
  mergeNpcGroupRowsFromGeneratedFile,
  patchFigurineObject,
  patchTokenObject,
  buildNpcControlTokenObjectState,
  buildTokenSnapAssignmentsFromNpcsData,
  paletteParkingPoseForCharacter,
};
