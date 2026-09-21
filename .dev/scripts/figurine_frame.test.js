"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { worldFromLocal, localFromWorld, round4 } = require("./figurine_frame_math.js");

test("Red reference pose round-trips world-unit XZ (yaw 180)", () => {
  const fig = {
    position: { x: 0.5035, y: -55.8166, z: -72.7348 },
    rotation: { x: 0, y: 180, z: 0 },
  };
  const local = { x: 6.6235, z: -20.7349 };
  const world = worldFromLocal(fig, local);
  assert.equal(round4(world.x), -6.12);
  const back = localFromWorld(fig, world);
  assert.equal(round4(back.x), 6.6235);
  assert.equal(round4(back.z), -20.7349);
});

test("hand zone at world x=0 is figurine-from-hand 0.5035 / 3.8752", () => {
  const fig = {
    position: { x: 0.5035, y: -55.8166, z: -72.7348 },
    rotation: { x: 0, y: 180, z: 0 },
  };
  const local = localFromWorld(fig, { x: 0, y: 3.22, z: -76.61 });
  assert.equal(round4(local.x), 0.5035);
  assert.equal(round4(local.z), 3.8752);
});

test("odd/even sheet dumps convert to world ±6.12, not ±7.24", () => {
  const fig = {
    position: { x: 0.5035, y: -55.8166, z: -72.7348 },
    rotation: { x: 0, y: 180, z: 0 },
  };
  const page1 = localFromWorld(fig, { x: -6.12, y: 3.19, z: -51.9999 });
  const page2 = localFromWorld(fig, { x: 6.12, y: 3.19, z: -52.0012 });
  const w1 = worldFromLocal(fig, page1);
  const w2 = worldFromLocal(fig, page2);
  assert.equal(round4(w1.x), -6.12);
  assert.equal(round4(w2.x), 6.12);
  assert.ok(Math.abs(page1.x - 7.2419) > 0.5);
});
