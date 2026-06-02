#!/usr/bin/env node
/**
 * Export CONTROL_BOARD polar snap family positions as a Lua table (world X/Z on STAGE fallback).
 *
 * Usage:
 *   node .dev/scripts/export_control_board_snap_families.mjs
 *   node .dev/scripts/export_control_board_snap_families.mjs --interpolated
 *   node .dev/scripts/export_control_board_snap_families.mjs --out .dev/plans/control-board-snap-families.lua
 *   node .dev/scripts/export_control_board_snap_families.mjs --csv --out .dev/plans/control-board-snap-families.csv
 *
 * `--csv` writes Google Sheets–friendly columns: area, slot, x, z (area = family role).
 * `--interpolated` ignores per-ring snapGroups.maxU/maxV and uses innerRingMaxU/V → outerRingMaxU/V
 * (the original ring layout). Default config matches lib/npc_gameboard_data.ttslua shipped defaults.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** @typedef {{ origin: { u: number, v: number }, rings: number, innerRingMaxU?: number, innerRingMaxV?: number, outerRingMaxU?: number, outerRingMaxV?: number, snapGroups: Array<Record<string, number>> }} SnapConfig */

/** Matches lib/npc_gameboard_data.ttslua D.CONTROL_BOARD_SNAP (update when defaults change). */
const DEFAULT_CONFIG = {
  origin: { u: 0.5, v: 0.3 },
  rings: 4,
  innerRingMaxU: 0.6,
  innerRingMaxV: 0.4,
  outerRingMaxU: 0.9,
  outerRingMaxV: 0.9,
  snapGroups: [
    { num: 1, angleDelta: 0, rays: 16, radialStagger: 5, maxU: 0.6, maxV: 0.4 },
    { num: 5, angleDelta: 3, rays: 12, radialStagger: 5, maxU: 0.7, maxV: 0.5 },
    { num: 5, angleDelta: 3, rays: 16, radialStagger: 5, maxU: 0.8, maxV: 0.6 },
    { num: 5, angleDelta: 2, rays: 20, radialStagger: 5, maxU: 0.9, maxV: 0.7 },
  ],
};

/** Matches lib/npc_gameboard_data.ttslua D.DEFAULT_STAGE_WORLD (offline world X/Z projection). */
const DEFAULT_STAGE_WORLD = {
  centerX: 0,
  centerZ: 120,
  halfWidthX: 220,
  halfDepthZ: 200,
};

/** @type {Record<number, string>} */
const FAMILY_ROLE_BY_K = {
  [-2]: "farLeft",
  [-1]: "nearLeft",
  0: "center",
  1: "nearRight",
  2: "farRight",
};

/**
 * @param {number} familyK
 * @returns {string}
 */
function familyRoleLabel(familyK) {
  return FAMILY_ROLE_BY_K[familyK] ?? `k${familyK}`;
}

/**
 * @param {SnapConfig} cfg
 * @param {number} ringIndex 1-based
 * @param {number} rings
 * @param {boolean} useInterpolated
 * @returns {{ maxU: number, maxV: number }}
 */
function ringMaxUv(cfg, ringIndex, rings, useInterpolated) {
  const group = cfg.snapGroups[ringIndex - 1];
  if (!useInterpolated && group?.maxU != null && group?.maxV != null) {
    return { maxU: group.maxU, maxV: group.maxV };
  }
  const innerU = cfg.innerRingMaxU;
  const innerV = cfg.innerRingMaxV;
  const outerU = cfg.outerRingMaxU;
  const outerV = cfg.outerRingMaxV;
  if (innerU == null || innerV == null || outerU == null || outerV == null) {
    throw new Error(
      `Ring ${ringIndex} needs snapGroups.maxU/maxV or top-level inner/outer ring max`,
    );
  }
  const t = rings > 1 ? (ringIndex - 1) / (rings - 1) : 0;
  return {
    maxU: innerU + t * (outerU - innerU),
    maxV: innerV + t * (outerV - innerV),
  };
}

/**
 * @param {SnapConfig} cfg
 * @param {number} angleDeg
 * @param {number} maxU
 * @param {number} maxV
 * @returns {{ u: number, v: number }}
 */
function uvOnEllipse(cfg, angleDeg, maxU, maxV) {
  const theta = (angleDeg * Math.PI) / 180;
  return {
    u: cfg.origin.u + Math.cos(theta) * (maxU - cfg.origin.u),
    v: cfg.origin.v + Math.sin(theta) * (maxV - cfg.origin.v),
  };
}

/**
 * @param {number} u
 * @param {number} v
 * @returns {{ x: number, z: number }}
 */
function stageWorldFromUv(u, v) {
  const ext = DEFAULT_STAGE_WORLD;
  return {
    x: ext.centerX + (u - 0.5) * 2 * ext.halfWidthX,
    z: ext.centerZ + (v - 0.5) * 2 * ext.halfDepthZ,
  };
}

/**
 * STAGE-world radial stagger (mirrors applyRadialStaggerUv fallback path in npc_gameboard.ttslua).
 * @param {SnapConfig} cfg
 * @param {number} familyK
 * @param {number} radialStagger
 * @param {number} u
 * @param {number} v
 * @returns {{ u: number, v: number }}
 */
function applyRadialStaggerUv(cfg, familyK, radialStagger, u, v) {
  if (familyK === 0 || radialStagger === 0) {
    return { u, v };
  }
  const ou = cfg.origin.u;
  const ov = cfg.origin.v;
  const ext = DEFAULT_STAGE_WORLD;
  const x0 = ext.centerX + (ou - 0.5) * 2 * ext.halfWidthX;
  const z0 = ext.centerZ + (ov - 0.5) * 2 * ext.halfDepthZ;
  const x1 = ext.centerX + (u - 0.5) * 2 * ext.halfWidthX;
  const z1 = ext.centerZ + (v - 0.5) * 2 * ext.halfDepthZ;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const worldDist = Math.sqrt(dx * dx + dz * dz);
  if (worldDist < 1e-6) {
    return { u, v };
  }
  const scale = (worldDist + Math.abs(familyK) * radialStagger) / worldDist;
  return { u: ou + (u - ou) * scale, v: ov + (v - ov) * scale };
}

/**
 * @param {number} u
 * @param {number} v
 * @returns {boolean}
 */
function snapUvOnBoard(u, v) {
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

/**
 * @param {SnapConfig} cfg
 * @param {boolean} useInterpolated
 * @returns {Record<string, Array<{ x: number, z: number, u: number, v: number, ringIndex: number, rayIndex: number, familyK: number }>>}
 */
function exportSnapFamiliesByRole(cfg, useInterpolated) {
  /** @type {Record<string, Array<{ x: number, z: number, u: number, v: number, ringIndex: number, rayIndex: number, familyK: number }>>} */
  const byRole = {};
  for (let ringIndex = 1; ringIndex <= cfg.rings; ringIndex += 1) {
    const group = cfg.snapGroups[ringIndex - 1];
    const num = group.num;
    const rays = group.rays;
    const radialStagger = group.radialStagger ?? 0;
    const half = Math.floor(num / 2);
    const { maxU, maxV } = ringMaxUv(cfg, ringIndex, cfg.rings, useInterpolated);
    for (let rayIndex = 0; rayIndex < rays; rayIndex += 1) {
      const anchorDeg = (rayIndex / rays) * 360;
      for (let k = -half; k <= half; k += 1) {
        const angleDeg = anchorDeg + k * group.angleDelta;
        let { u, v } = uvOnEllipse(cfg, angleDeg, maxU, maxV);
        ({ u, v } = applyRadialStaggerUv(cfg, k, radialStagger, u, v));
        if (!snapUvOnBoard(u, v)) {
          continue;
        }
        const { x, z } = stageWorldFromUv(u, v);
        const role = familyRoleLabel(k);
        if (!byRole[role]) {
          byRole[role] = [];
        }
        byRole[role].push({ x, z, u, v, ringIndex, rayIndex, familyK: k });
      }
    }
  }
  return byRole;
}

/**
 * @param {Record<string, Array<{ x: number, z: number }>>} byRole
 * @returns {string}
 */
function formatSnapFamiliesLua(byRole) {
  const roleNames = Object.keys(byRole).sort();
  const lines = ["return {"];
  for (const roleName of roleNames) {
    lines.push(`  ${roleName} = {`);
    const points = byRole[roleName] ?? [];
    for (let i = 0; i < points.length; i += 1) {
      const pt = points[i];
      lines.push(`    [${i + 1}] = { x = ${pt.x.toFixed(6)}, z = ${pt.z.toFixed(6)} },`);
    }
    lines.push("  },");
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * @param {Record<string, Array<{ x: number, z: number }>>} byRole
 * @returns {string}
 */
function formatSnapFamiliesCsv(byRole) {
  const roleNames = Object.keys(byRole).sort();
  const lines = ["area,slot,x,z"];
  for (const roleName of roleNames) {
    const points = byRole[roleName] ?? [];
    for (let i = 0; i < points.length; i += 1) {
      const pt = points[i];
      lines.push(
        `${roleName},${i + 1},${pt.x.toFixed(6)},${pt.z.toFixed(6)}`,
      );
    }
  }
  return lines.join("\n");
}

const args = process.argv.slice(2);
const useInterpolated = args.includes("--interpolated");
const outIndex = args.indexOf("--out");
const outPath =
  outIndex >= 0 && args[outIndex + 1]
    ? resolve(args[outIndex + 1])
    : null;
const useCsv =
  args.includes("--csv") || (outPath != null && outPath.toLowerCase().endsWith(".csv"));

const byRole = exportSnapFamiliesByRole(DEFAULT_CONFIG, useInterpolated);
const text = useCsv ? formatSnapFamiliesCsv(byRole) : formatSnapFamiliesLua(byRole);

if (outPath) {
  writeFileSync(outPath, `${text}\n`, "utf8");
  const total = Object.values(byRole).reduce((sum, pts) => sum + pts.length, 0);
  console.log(
    `Wrote ${outPath} (${total} snaps, ${useInterpolated ? "interpolated" : "per-ring"} rings, ${useCsv ? "csv" : "lua"})`,
  );
} else {
  console.log(text);
}
