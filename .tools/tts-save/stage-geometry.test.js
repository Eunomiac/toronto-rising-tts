"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertStageBlock, stageWorldFromBlock } = require("./stage-geometry.js");
const block = () => ({ Name: "BlockSquare", Nickname: "STAGE_BOARD", Transform: {
  posX: 0, posY: -200, posZ: 62.0977, rotY: 0, scaleX: 1600, scaleY: 1, scaleZ: 577.809692,
} });
test("replacement block preserves the calibrated stage footprint and center", () => {
  assert.deepEqual(stageWorldFromBlock(block()), { centerX: 0, centerZ: 62.0977, halfWidthX: 800, halfDepthZ: 288.904846 });
});
test("stage footprint follows rotation and rescaling", () => {
  const b = block(); b.Transform.rotY = 90;
  const world = stageWorldFromBlock(b);
  assert.ok(Math.abs(world.halfWidthX - 288.904846) < 1e-9);
  assert.ok(Math.abs(world.halfDepthZ - 800) < 1e-9);
});
test("obsolete image tiles and invalid block geometry fail before building", () => {
  assert.throws(() => assertStageBlock({ ...block(), Name: "Custom_Tile" }), /obsolete image tile/);
  assert.throws(() => assertStageBlock({ ...block(), CustomImage: {} }), /obsolete image tile/);
  const b = block(); b.Transform.scaleX = 0;
  assert.throws(() => assertStageBlock(b), /invalid scaleX/);
});
