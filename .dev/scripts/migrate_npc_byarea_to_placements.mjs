#!/usr/bin/env node
/**
 * Migrate legacy `sessionScene.npcWorld.byArea` → `placements` in TTS save LuaScriptState
 * and optional standalone gameState JSON files.
 *
 * Geometry matches `lib/npc_placements_convert.ttslua` / `NPCS.computeSlotWorldPosition`.
 * Keep `STAGE_AREAS` in sync with `lib/npcs_data.ttslua` D.areas staging rings.
 *
 * Usage:
 *   node .dev/scripts/migrate_npc_byarea_to_placements.mjs
 *   node .dev/scripts/migrate_npc_byarea_to_placements.mjs --save .dev/TS_Save_230.json
 *   node .dev/scripts/migrate_npc_byarea_to_placements.mjs --game-state path/to/gameState.json
 *   node .dev/scripts/migrate_npc_byarea_to_placements.mjs --dry-run
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REF_AREA_KEY = "centerForward";
const PRELOAD_AREA_KEY = "preload";
const AREA_FIGURINE_YAW_OFFSET_DEG = 180;
const STAGE_FIGURINE_YAW_OFFSET_DEG = 180;
const STAGE_BOARD_YAW_DEG = 0;

/** @type {Record<string, { rotation: number, distance: number, groundLevel: number, spreadBlend?: number, autoLight?: boolean, positions: Array<{ x: number, z: number }> }>} */
const STAGE_AREAS = {
  centerForward: {
    rotation: 0,
    distance: 30,
    groundLevel: -40,
    spreadBlend: 0,
    autoLight: true,
    positions: [
      { x: 0, z: 0 },
      { x: 25, z: 5 },
      { x: -25, z: 5 },
      { x: 50, z: 10 },
      { x: -50, z: 10 },
      { x: 75, z: 15 },
      { x: -75, z: 15 },
    ],
  },
  nearLeft: {
    rotation: -35,
    distance: 175,
    groundLevel: -15,
    spreadBlend: 0,
    autoLight: false,
    positions: [
      { x: 0, z: 0 },
      { x: 25, z: 5 },
      { x: -25, z: 5 },
      { x: 50, z: 10 },
      { x: -50, z: 10 },
      { x: 75, z: 15 },
      { x: -75, z: 15 },
    ],
  },
  nearRight: {
    rotation: 35,
    distance: 175,
    groundLevel: -15,
    spreadBlend: 0,
    autoLight: false,
    positions: [
      { x: 0, z: 0 },
      { x: 25, z: 5 },
      { x: -25, z: 5 },
      { x: 50, z: 10 },
      { x: -50, z: 10 },
      { x: 75, z: 15 },
      { x: -75, z: 15 },
    ],
  },
  farRight: {
    rotation: 35,
    distance: 250,
    groundLevel: 20,
    spreadBlend: 0,
    autoLight: false,
    positions: [
      { x: 0, z: 0 },
      { x: 25, z: 5 },
      { x: -25, z: 5 },
      { x: 50, z: 10 },
      { x: -50, z: 10 },
      { x: 75, z: 15 },
      { x: -75, z: 15 },
    ],
  },
  farLeft: {
    rotation: -35,
    distance: 250,
    groundLevel: 20,
    spreadBlend: 0,
    autoLight: false,
    positions: [
      { x: 0, z: 0 },
      { x: 25, z: 5 },
      { x: -25, z: 5 },
      { x: 50, z: 10 },
      { x: -50, z: 10 },
      { x: 75, z: 15 },
      { x: -75, z: 15 },
    ],
  },
};

const DEFAULT_STAGE_WORLD = {
  centerX: 0,
  centerZ: 120,
  halfWidthX: 220,
  halfDepthZ: 200,
};

/**
 * @param {number} x
 * @param {number} z
 * @param {number} rad
 * @returns {[number, number]}
 */
function rotateXZ(x, z, rad) {
  const cr = Math.cos(rad);
  const sr = Math.sin(rad);
  return [x * cr - z * sr, x * sr + z * cr];
}

/**
 * @param {string} areaKey
 * @param {number} slotIndex
 * @returns {{ x: number, z: number, groundLevel: number } | null}
 */
function areaSlotWorldXZ(areaKey, slotIndex) {
  const area = STAGE_AREAS[areaKey];
  if (!area) {
    return null;
  }
  const refA = STAGE_AREAS[REF_AREA_KEY];
  const refDist = refA?.distance ?? null;
  let slot = refA?.positions[slotIndex - 1];
  if (!slot) {
    slot = area.positions[slotIndex - 1];
  }
  if (!slot) {
    return null;
  }
  const groundLevel = area.groundLevel;
  if (refDist == null || refDist < 1e-6) {
    const rad = (area.rotation * Math.PI) / 180;
    const [rx, rz] = rotateXZ(slot.x, slot.z, rad);
    const cx = Math.sin(rad) * area.distance;
    const cz = Math.cos(rad) * area.distance;
    return { x: cx + rx, z: cz + rz, groundLevel };
  }
  const radNeg = (-area.rotation * Math.PI) / 180;
  const [rxO, rzO] = rotateXZ(0, refDist, radNeg);
  const [rxD, rzD] = rotateXZ(slot.x, slot.z, radNeg);
  let sCenter = area.distance / refDist;
  if (!Number.isFinite(sCenter) || sCenter < 0) {
    sCenter = 1;
  }
  let blend = area.spreadBlend ?? 0;
  if (!Number.isFinite(blend)) {
    blend = 0;
  }
  blend = Math.max(0, Math.min(1, blend));
  const sSpread = 1 + (sCenter - 1) * blend;
  return {
    x: rxO * sCenter + rxD * sSpread,
    z: rzO * sCenter + rzD * sSpread,
    groundLevel,
  };
}

/**
 * @param {string} areaKey
 * @returns {number | null}
 */
function areaSlotWorldYawDeg(areaKey) {
  const area = STAGE_AREAS[areaKey];
  if (!area) {
    return null;
  }
  const rad = (area.rotation * Math.PI) / 180;
  const pivotX = Math.sin(rad) * area.distance;
  const pivotZ = Math.cos(rad) * area.distance;
  return (Math.atan2(-pivotX, -pivotZ) * 180) / Math.PI + AREA_FIGURINE_YAW_OFFSET_DEG;
}

/**
 * @param {number} worldYaw
 * @returns {number}
 */
function placementYawFromWorldYaw(worldYaw) {
  let rel = worldYaw - STAGE_BOARD_YAW_DEG - STAGE_FIGURINE_YAW_OFFSET_DEG;
  rel = rel % 360;
  if (rel < 0) {
    rel += 360;
  }
  return rel;
}

/**
 * @param {number} x
 * @param {number} z
 * @returns {[number, number]}
 */
function uvFromWorld(x, z) {
  const ext = DEFAULT_STAGE_WORLD;
  let u = 0.5 + (x - ext.centerX) / (2 * ext.halfWidthX);
  let v = 0.5 + (z - ext.centerZ) / (2 * ext.halfDepthZ);
  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));
  return [u, v];
}

/**
 * @param {unknown} area
 * @param {{ npcLightMode?: string } | null} row
 * @returns {"OFF" | "STANDARD" | "SPOTLIGHT"}
 */
function resolveNpcLightMode(area, row) {
  const lm = row?.npcLightMode;
  if (lm === "OFF" || lm === "STANDARD" || lm === "SPOTLIGHT") {
    return lm;
  }
  if (area && area.autoLight === true) {
    return "STANDARD";
  }
  return "OFF";
}

/**
 * @param {string} areaKey
 * @param {number} slotIndex
 * @param {{ npcLightMode?: string } | null} row
 * @returns {{ u: number, v: number, yaw: number, npcLightMode: string, groundLevel: number } | null}
 */
function placementRowFromAreaSlot(areaKey, slotIndex, row) {
  if (!areaKey || areaKey === PRELOAD_AREA_KEY || !STAGE_AREAS[areaKey]) {
    return null;
  }
  const world = areaSlotWorldXZ(areaKey, slotIndex);
  if (!world) {
    return null;
  }
  const [u, v] = uvFromWorld(world.x, world.z);
  const worldYaw = areaSlotWorldYawDeg(areaKey);
  if (worldYaw == null) {
    return null;
  }
  const area = STAGE_AREAS[areaKey];
  return {
    u: Math.round(u * 10000) / 10000,
    v: Math.round(v * 10000) / 10000,
    yaw: Math.round(placementYawFromWorldYaw(worldYaw) * 10) / 10,
    npcLightMode: resolveNpcLightMode(area, row),
    groundLevel: world.groundLevel,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} byArea
 * @returns {boolean}
 */
function byAreaHasEntries(byArea) {
  if (!byArea || typeof byArea !== "object") {
    return false;
  }
  for (const [areaKey, slots] of Object.entries(byArea)) {
    if (areaKey === PRELOAD_AREA_KEY || !STAGE_AREAS[areaKey] || typeof slots !== "object" || slots === null) {
      continue;
    }
    for (const [sk, row] of Object.entries(slots)) {
      if (Number(sk) > 0 && row && typeof row === "object" && typeof row.characterKey === "string" && row.characterKey !== "") {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {Record<string, unknown>} npcWorld
 * @returns {number}
 */
function mergeByAreaIntoPlacements(npcWorld) {
  const byArea = npcWorld.byArea;
  if (!byAreaHasEntries(byArea)) {
    npcWorld.byArea = {};
    return 0;
  }
  if (!npcWorld.placements || typeof npcWorld.placements !== "object") {
    npcWorld.placements = {};
  }
  /** @type {Record<string, { u: number, v: number, yaw: number, npcLightMode: string, groundLevel?: number }>} */
  const placements = /** @type {Record<string, unknown>} */ (npcWorld.placements);
  let migrated = 0;
  const areaKeys = Object.keys(byArea).sort();
  for (const areaKey of areaKeys) {
    if (!STAGE_AREAS[areaKey]) {
      continue;
    }
    const slots = byArea[areaKey];
    if (!slots || typeof slots !== "object") {
      continue;
    }
    const slotNums = Object.keys(slots)
      .map((sk) => Number(sk))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    for (const si of slotNums) {
      const row = slots[String(si)] ?? slots[si];
      if (!row || typeof row !== "object" || typeof row.characterKey !== "string" || row.characterKey === "") {
        continue;
      }
      const ck = row.characterKey;
      if (placements[ck] != null) {
        continue;
      }
      const placementRow = placementRowFromAreaSlot(areaKey, si, row);
      if (placementRow) {
        placements[ck] = placementRow;
        migrated += 1;
        console.log(`  + ${ck} ← ${areaKey}[${si}] u=${placementRow.u} v=${placementRow.v} yaw=${placementRow.yaw}`);
      } else {
        console.warn(`  ! skip ${ck} (${areaKey} slot ${si}: no u,v)`);
      }
    }
  }
  npcWorld.byArea = {};
  return migrated;
}

/**
 * @param {Record<string, unknown>} sessionScene
 * @param {string} label
 * @returns {number}
 */
function migrateSessionScene(sessionScene, label) {
  if (!sessionScene.npcWorld || typeof sessionScene.npcWorld !== "object") {
    return 0;
  }
  const nw = /** @type {Record<string, unknown>} */ (sessionScene.npcWorld);
  if (!byAreaHasEntries(nw.byArea)) {
    return 0;
  }
  console.log(`[migrate] ${label}`);
  return mergeByAreaIntoPlacements(nw);
}

/**
 * @param {Record<string, unknown>} gameState
 * @returns {number}
 */
function migrateGameState(gameState) {
  let total = 0;
  total += migrateSessionScene(
    /** @type {Record<string, unknown>} */ (gameState.sessionScene ?? {}),
    "sessionScene",
  );
  const lib = gameState.sceneLibrary;
  if (lib && typeof lib === "object" && lib.scenes && typeof lib.scenes === "object") {
    for (const [sceneKey, entry] of Object.entries(lib.scenes)) {
      if (entry && typeof entry === "object" && entry.sessionScene && typeof entry.sessionScene === "object") {
        total += migrateSessionScene(entry.sessionScene, `sceneLibrary.scenes.${sceneKey}`);
      }
    }
  }
  return total;
}

/**
 * @param {unknown} obj
 * @param {(o: Record<string, unknown>) => void} fn
 */
function walkObjectStates(obj, fn) {
  if (!obj || typeof obj !== "object") {
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      walkObjectStates(item, fn);
    }
    return;
  }
  const rec = /** @type {Record<string, unknown>} */ (obj);
  fn(rec);
  if (Array.isArray(rec.ContainedObjects)) {
    walkObjectStates(rec.ContainedObjects, fn);
  }
  if (Array.isArray(rec.ObjectStates)) {
    walkObjectStates(rec.ObjectStates, fn);
  }
}

/**
 * @param {string} savePath
 * @param {boolean} dryRun
 * @returns {number}
 */
function migrateSaveFile(savePath, dryRun) {
  const raw = JSON.parse(readFileSync(savePath, "utf8"));
  let total = 0;
  let patched = 0;
  walkObjectStates(raw, (obj) => {
    const stateStr = obj.LuaScriptState;
    if (typeof stateStr !== "string" || stateStr.length < 20) {
      return;
    }
    let gs;
    try {
      gs = JSON.parse(stateStr);
    } catch {
      return;
    }
    if (!gs || typeof gs !== "object") {
      return;
    }
    const before = total;
    total += migrateGameState(gs);
    if (total > before) {
      patched += 1;
      const name = typeof obj.Name === "string" ? obj.Name : typeof obj.Nickname === "string" ? obj.Nickname : "?";
      console.log(`[migrate] patched LuaScriptState on object "${name}"`);
      if (!dryRun) {
        obj.LuaScriptState = JSON.stringify(gs);
      }
    }
  });
  if (!dryRun && patched > 0) {
    writeFileSync(savePath, JSON.stringify(raw, null, 2), "utf8");
    console.log(`[migrate] wrote ${savePath}`);
  }
  return total;
}

function parseArgs(argv) {
  let savePath = resolve(".dev/TS_Save_230.json");
  let gameStatePath = null;
  let dryRun = false;
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--save" && argv[i + 1]) {
      savePath = resolve(argv[i + 1]);
      i += 1;
    } else if (a === "--game-state" && argv[i + 1]) {
      gameStatePath = resolve(argv[i + 1]);
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/migrate_npc_byarea_to_placements.mjs [--save path] [--game-state path] [--dry-run]`);
      process.exit(0);
    }
  }
  return { savePath, gameStatePath, dryRun };
}

const { savePath, gameStatePath, dryRun } = parseArgs(process.argv);
let total = 0;

if (gameStatePath) {
  const gs = JSON.parse(readFileSync(gameStatePath, "utf8"));
  total += migrateGameState(gs);
  if (!dryRun && total > 0) {
    writeFileSync(gameStatePath, JSON.stringify(gs, null, 2), "utf8");
    console.log(`[migrate] wrote ${gameStatePath}`);
  }
} else {
  total += migrateSaveFile(savePath, dryRun);
}

console.log(`[migrate] ${dryRun ? "would migrate" : "migrated"} ${total} character placement(s)${dryRun ? " (dry-run, no write)" : ""}`);
if (total === 0) {
  console.log("[migrate] no byArea entries found");
}
