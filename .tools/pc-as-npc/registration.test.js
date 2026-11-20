"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { DEFAULT_GUIDS } = require("../tts-save/inject-csheet-npc-sheets.js");

const root = path.join(__dirname, "../..");

test("G.GUIDS.CSHEET_NPC_* match inject defaults", () => {
  const guids = fs.readFileSync(path.join(root, "lib/guids.ttslua"), "utf8");
  for (const [color, guid] of Object.entries(DEFAULT_GUIDS)) {
    const re = new RegExp(`CSHEET_NPC_${color}\\s*=\\s*"${guid}"`);
    assert.match(guids, re, `CSHEET_NPC_${color}`);
  }
});

test("constants register CSHEET_NPC in LockedObjects, TableSourceObjects, ObjectPositions", () => {
  const constants = fs.readFileSync(path.join(root, "lib/constants.ttslua"), "utf8");
  assert.match(constants, /G\.GUIDS\.CSHEET_NPC_BROWN/);
  assert.match(constants, /"CSHEET_NPC"/);
  assert.match(constants, /CSHEET_NPC\s*=\s*\{/);
  assert.match(constants, /ClickableSeatControls\[G\.GUIDS\["CSHEET_NPC_/);
});

test("ui_csheet_npc bans core.* and lib.constants requires", () => {
  const lua = fs.readFileSync(path.join(root, "ui/ui_csheet_npc.ttslua"), "utf8");
  assert.doesNotMatch(lua, /require\s*\(\s*["']core\./);
  assert.doesNotMatch(lua, /require\s*\(\s*["']lib\.constants["']/);
  assert.doesNotMatch(lua, /require\s*\(\s*["']dashboard\./);
});

test("export contract includes Roleplay Notes on named and generic", () => {
  const contract = JSON.parse(
    fs.readFileSync(path.join(root, ".dev/Chronicle Data/Spreadsheet Export Contract.json"), "utf8")
  );
  const named = contract.exports.find((e) => e.name === "EXPORT_CHARACTERS_NAMED");
  const generic = contract.exports.find((e) => e.name === "EXPORT_CHARACTERS_GENERIC");
  assert.ok(named.headers.includes("Roleplay Notes"));
  assert.ok(generic.headers.includes("Roleplay Notes"));
});

test(".tts stubs exist for all five NPC sheets", () => {
  const objects = path.join(root, ".tts/objects");
  for (const [color, guid] of Object.entries(DEFAULT_GUIDS)) {
    const nick = `NPC Sheet - ${color.charAt(0)}${color.slice(1).toLowerCase()}`;
    const stem = `${nick}.${guid}`;
    assert.ok(fs.existsSync(path.join(objects, `${stem}.data.json`)), stem);
    assert.ok(fs.existsSync(path.join(objects, `${stem}.lua`)), `${stem}.lua`);
    assert.ok(fs.existsSync(path.join(objects, `${stem}.xml`)), `${stem}.xml`);
  }
});
