"use strict";

function assertStageBlock(stage) {
  if (!stage || stage.Name !== "BlockSquare" || stage.Nickname !== "STAGE_BOARD" || stage.CustomImage) {
    throw new Error("STAGE_BOARD must be a built-in BlockSquare named STAGE_BOARD, with no CustomImage. Replace the obsolete image tile before building.");
  }
  for (const field of ["scaleX", "scaleY", "scaleZ"]) {
    if (!Number.isFinite(stage.Transform?.[field]) || stage.Transform[field] <= 0) throw new Error(`STAGE_BOARD has an invalid ${field}.`);
  }
  return stage;
}

// BlockSquare uses a unit-cube footprint. Scale is full width/depth, not the
// half-extents used by the old image tile's calibrated stagger conversion.
function stageWorldFromBlock(stage) {
  assertStageBlock(stage);
  const t = stage.Transform;
  const yaw = t.rotY * Math.PI / 180;
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  return {
    centerX: t.posX, centerZ: t.posZ,
    halfWidthX: (c * t.scaleX + s * t.scaleZ) / 2,
    halfDepthZ: (s * t.scaleX + c * t.scaleZ) / 2,
  };
}

module.exports = { assertStageBlock, stageWorldFromBlock };
