"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  planInject,
  applyInject,
  doubleWideTransform,
  DEFAULT_GUIDS,
  HIDE_Y,
  NPC_XML,
  NPC_LUA,
} = require("./inject-csheet-npc-sheets.js");

function fakePage(page, color, guid, x, z = -20) {
  const tag = `${color.charAt(0)}${color.slice(1).toLowerCase()}Object`;
  return {
    GUID: guid,
    Name: "Custom_Tile",
    GMNotes: `CSHEET_PAGE_${page}_${color}`,
    Nickname: `PC - p.${page}`,
    Transform: {
      posX: x,
      posY: 3.2,
      posZ: z,
      rotX: 19.44,
      rotY: 36,
      rotZ: 0,
      scaleX: 8,
      scaleY: 1,
      scaleZ: 8,
    },
    Tags: ["AlignmentDone", tag],
    Locked: true,
    LuaScript: 'require("ui.ui_csheet")\n',
    XmlUI: `<Include src="ui/player/csheets/page${page}.xml" />`,
    CustomUIAssets: [{ Name: "keep_me", URL: "http://example" }],
  };
}

function minimalSave() {
  return {
    ObjectStates: [
      fakePage(1, "BROWN", "21d213", 1, -10),
      fakePage(2, "BROWN", "c80132", 11, -10),
      fakePage(1, "ORANGE", "553538", 2, -20),
      fakePage(2, "ORANGE", "e2c921", 12, -20),
      fakePage(1, "RED", "f10182", -6.15, -90),
      fakePage(2, "RED", "8a59a9", 6.15, -90),
      fakePage(1, "PINK", "c4abec", 4, -30),
      fakePage(2, "PINK", "c0f4b5", 14, -30),
      fakePage(1, "PURPLE", "0bdb4a", 5, -40),
      fakePage(2, "PURPLE", "7ac353", 15, -40),
      { GUID: "aaaaaa", GMNotes: "NOISE", Nickname: "noise" },
    ],
  };
}

test("doubleWideTransform centers between pages and keeps PAGE_1 scaleX", () => {
  const t = doubleWideTransform(
    { Transform: { posX: -6.15, posY: 3.2, posZ: -90, scaleX: 8, scaleY: 1, scaleZ: 8, rotY: 180 } },
    { Transform: { posX: 6.15, posY: 3.2, posZ: -90.001, scaleX: 8, scaleY: 1, scaleZ: 8, rotY: 180 } }
  );
  assert.equal(t.posX, 0);
  assert.equal(t.posY, HIDE_Y);
  assert.ok(Math.abs(t.posZ - (-90.0005)) < 1e-6);
  assert.equal(t.scaleX, 8);
  assert.equal(t.scaleZ, 8);
  assert.equal(t.rotY, 180);
});

test("planInject creates five double-wide parked NPC sheets", () => {
  const save = minimalSave();
  const plan = planInject(save);
  assert.equal(plan.clones.length, 5);
  assert.equal(plan.removeGuids.length, 0);
  for (const clone of plan.clones) {
    assert.equal(clone.Transform.posY, HIDE_Y);
    assert.equal(clone.Transform.scaleX, 8);
    assert.ok(clone.Tags.includes("HiddenObject"));
    assert.match(clone.GMNotes, /^CSHEET_NPC_/);
    assert.equal(clone.XmlUI, NPC_XML);
    assert.equal(clone.LuaScript, NPC_LUA);
    assert.deepEqual(clone.CustomUIAssets, []);
    assert.equal(clone.Interactable, false);
    assert.ok(Array.isArray(clone.InvisibleTo) && clone.InvisibleTo.includes("Black"));
    assert.ok(clone.InvisibleTo.includes("Brown"));
  }
  const brown = plan.clones.find((c) => c.GMNotes === "CSHEET_NPC_BROWN");
  assert.equal(brown.GUID, DEFAULT_GUIDS.BROWN);
  assert.equal(brown.Transform.posX, 6);
  assert.equal(brown.Transform.posZ, -10);
  assert.ok(brown.Tags.includes("BrownObject"));
});

test("applyInject appends without mutating PAGE_1", () => {
  const save = minimalSave();
  const before = JSON.stringify(save.ObjectStates[0]);
  const plan = planInject(save);
  applyInject(save, plan);
  assert.equal(save.ObjectStates.length, 11 + 5);
  assert.equal(JSON.stringify(save.ObjectStates[0]), before);
  assert.ok(save.ObjectStates.some((o) => o.GMNotes === "CSHEET_NPC_RED"));
});

test("idempotent second plan throws; replace removes prior", () => {
  const save = minimalSave();
  const plan = planInject(save);
  applyInject(save, plan);
  assert.throws(() => planInject(save), /already present/);
  const replanned = planInject(save, { replace: true });
  assert.equal(replanned.removeGuids.length, 5);
  applyInject(save, replanned);
  assert.equal(save.ObjectStates.filter((o) => /^CSHEET_NPC_/.test(o.GMNotes || "")).length, 5);
});

test("missing PAGE_1 or PAGE_2 fails loudly", () => {
  const save = minimalSave();
  save.ObjectStates = save.ObjectStates.filter((o) => o.GMNotes !== "CSHEET_PAGE_1_PINK");
  assert.throws(() => planInject(save), /Missing source.*PAGE_1_PINK/);
  const save2 = minimalSave();
  save2.ObjectStates = save2.ObjectStates.filter((o) => o.GMNotes !== "CSHEET_PAGE_2_RED");
  assert.throws(() => planInject(save2), /Missing source.*PAGE_2_RED/);
});

test("GUID collision fails", () => {
  const save = minimalSave();
  save.ObjectStates.push({ GUID: DEFAULT_GUIDS.BROWN, GMNotes: "OTHER" });
  assert.throws(() => planInject(save), /GUID collision/);
});
