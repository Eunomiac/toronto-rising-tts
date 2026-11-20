"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  planInject,
  applyInject,
  DEFAULT_GUIDS,
  HIDE_Y,
  NPC_XML,
  NPC_LUA,
} = require("./inject-csheet-npc-sheets.js");

function fakePage1(color, guid, x = 10) {
  const tag = `${color.charAt(0)}${color.slice(1).toLowerCase()}Object`;
  return {
    GUID: guid,
    Name: "Custom_Tile",
    GMNotes: `CSHEET_PAGE_1_${color}`,
    Nickname: `PC - p.1`,
    Transform: {
      posX: x,
      posY: 3.2,
      posZ: -20,
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
    XmlUI: '<Include src="ui/player/csheets/page1.xml" />',
    CustomUIAssets: [{ Name: "keep_me", URL: "http://example" }],
  };
}

function minimalSave() {
  return {
    ObjectStates: [
      fakePage1("BROWN", "21d213", 1),
      fakePage1("ORANGE", "553538", 2),
      fakePage1("RED", "f10182", 3),
      fakePage1("PINK", "c4abec", 4),
      fakePage1("PURPLE", "0bdb4a", 5),
      { GUID: "aaaaaa", GMNotes: "NOISE", Nickname: "noise" },
    ],
  };
}

test("planInject creates five parked NPC sheets", () => {
  const save = minimalSave();
  const plan = planInject(save, { knownGuids: { CSHEET_PAGE_1_BROWN: "21d213" } });
  assert.equal(plan.clones.length, 5);
  assert.equal(plan.mappings.length, 5);
  for (const clone of plan.clones) {
    assert.equal(clone.Transform.posY, HIDE_Y);
    assert.ok(clone.Tags.includes("HiddenObject"));
    assert.match(clone.GMNotes, /^CSHEET_NPC_/);
    assert.equal(clone.XmlUI, NPC_XML);
    assert.equal(clone.LuaScript, NPC_LUA);
    assert.deepEqual(clone.CustomUIAssets, []);
    assert.equal(clone.Interactable, false);
  }
  const brown = plan.clones.find((c) => c.GMNotes === "CSHEET_NPC_BROWN");
  assert.equal(brown.GUID, DEFAULT_GUIDS.BROWN);
  assert.equal(brown.Transform.posX, 1);
  assert.ok(brown.Tags.includes("BrownObject"));
});

test("applyInject appends without mutating PAGE_1", () => {
  const save = minimalSave();
  const before = JSON.stringify(save.ObjectStates[0]);
  const plan = planInject(save);
  applyInject(save, plan);
  assert.equal(save.ObjectStates.length, 6 + 5);
  assert.equal(JSON.stringify(save.ObjectStates[0]), before);
  assert.ok(save.ObjectStates.some((o) => o.GMNotes === "CSHEET_NPC_RED"));
});

test("idempotent second plan throws", () => {
  const save = minimalSave();
  const plan = planInject(save);
  applyInject(save, plan);
  assert.throws(() => planInject(save), /already present/);
});

test("missing PAGE_1 fails loudly", () => {
  const save = minimalSave();
  save.ObjectStates = save.ObjectStates.filter((o) => o.GMNotes !== "CSHEET_PAGE_1_PINK");
  assert.throws(() => planInject(save), /Missing source.*PINK/);
});

test("GUID collision fails", () => {
  const save = minimalSave();
  save.ObjectStates.push({ GUID: DEFAULT_GUIDS.BROWN, GMNotes: "OTHER" });
  assert.throws(() => planInject(save), /GUID collision/);
});
