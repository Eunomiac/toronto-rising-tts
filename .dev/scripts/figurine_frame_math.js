"use strict";

/** Keep in lockstep with lib/figurine_frame.ttslua (yaw-only world-unit XZ). */

function component(tbl, key, index, fallback) {
  if (tbl == null) {
    return fallback;
  }
  const named = Number(tbl[key]);
  if (Number.isFinite(named)) {
    return named;
  }
  const indexed = Number(tbl[index]);
  if (Number.isFinite(indexed)) {
    return indexed;
  }
  return fallback;
}

function yawRad(figFrame) {
  return (component(figFrame && figFrame.rotation, "y", 2, 0) * Math.PI) / 180;
}

function worldFromLocal(figFrame, localXZ) {
  const lx = component(localXZ, "x", 1, 0);
  const lz = component(localXZ, "z", 3, 0);
  const pos = figFrame && figFrame.position;
  const yaw = yawRad(figFrame);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: component(pos, "x", 1, 0) + lx * c + lz * s,
    y: component(pos, "y", 2, 0),
    z: component(pos, "z", 3, 0) - lx * s + lz * c,
  };
}

function localFromWorld(figFrame, worldPos) {
  const pos = figFrame && figFrame.position;
  const dx = component(worldPos, "x", 1, 0) - component(pos, "x", 1, 0);
  const dz = component(worldPos, "z", 3, 0) - component(pos, "z", 3, 0);
  const yaw = yawRad(figFrame);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: dx * c - dz * s,
    z: dx * s + dz * c,
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

module.exports = {
  worldFromLocal,
  localFromWorld,
  round4,
};
