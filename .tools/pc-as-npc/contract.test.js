"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldStampMapPinOnSceneApply,
  midSceneAssignMapPinAction,
  selectiveKeepRoleList,
  selectiveHideRoleList,
  doubleBookRemovals,
  selectiveHide,
} = require("./contract.js");

test("map pin stamp skipped while isPlayingNPC", () => {
  assert.equal(shouldStampMapPinOnSceneApply({ isPlayingNPC: true, isPresent: true }), false);
  assert.equal(shouldStampMapPinOnSceneApply({ isPlayingNPC: false, isPresent: true }), true);
  assert.equal(shouldStampMapPinOnSceneApply({ isPlayingNPC: false, isPresent: false }), false);
});

test("mid-scene assign stamps current site", () => {
  const action = midSceneAssignMapPinAction({
    siteKey: "site_a",
    districtKey: "d1",
    clock: { year: 2024 },
  });
  assert.deepEqual(action, {
    action: "stampCurrent",
    siteKey: "site_a",
    districtKey: "d1",
    activeAt: { year: 2024 },
  });
  assert.throws(() => midSceneAssignMapPinAction({ siteKey: "" }), /siteKey/);
});

test("selective hide lists freeze keep/hide/show roles", () => {
  assert.ok(selectiveKeepRoleList().includes("HAND"));
  assert.ok(selectiveHideRoleList().includes("CSHEET_PAGE"));
  assert.ok(selectiveHide.showWhileAssigned.includes("CSHEET_NPC"));
  assert.ok(!selectiveKeepRoleList().includes("SEAT_FIGURE"));
});

test("double-book removals only hit the assigned key", () => {
  assert.deepEqual(
    doubleBookRemovals({
      stageKeys: ["drake", "other"],
      homelandSeatKeys: ["drake", "aishe"],
      assignKey: "drake",
    }),
    { removeFromStage: ["drake"], clearHomelandSeats: ["drake"] }
  );
});
