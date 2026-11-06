"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { inventory, toCsv } = require("./export-join-assets.js");
const { parseCsv } = require("../../.dev/scripts/lib/skyboxes_sheet_csv.js");
const url = "https://steamusercontent-a.akamaihd.net/ugc/123/" + "A".repeat(40) + "/";

test("inventory joins Cloud host aliases, distinguishes changed uploads, and verifies mirror paths", () => {
  const manifest = { jobs: { figures: { rows: [{ url, path: "NPC/a.webp", size: 42 }] } } };
  const ledger = { files: { "NPC/missing.webp": { url, size: 42 } } };
  const rows = inventory({ CustomUIAssets: [{ Name: "portrait", URL: url.replace("steamusercontent-a.akamaihd.net", "steamusercontent.com") }],
    SkyURL: url.replace("/123/", "/456/") }, manifest, ledger, file => file === "NPC/a.webp");
  assert.equal(rows.length, 2);
  assert.equal(rows[0][8], 42);
  assert.equal(rows[0][10], "figures");
  assert.equal(rows[0][12], "assets/NPC/a.webp");
  assert.equal(rows[0][15], "portrait");
  assert.equal(rows[1][11], "Unmatched");
});

test("inventory counts nested object UI and alternate states without scanning embedded scripts", () => {
  const save = { LuaScript: url, LuaScriptState: url, XmlUI: url, ObjectStates: [{ GUID: "aaaaaa", Name: "Bag",
    ContainedObjects: [{ GUID: "bbbbbb", Nickname: "Child", CustomUIAssets: [{ Name: "icon", URL: url }] }],
    States: { 2: { GUID: "cccccc", Name: "Custom_Tile", CustomImage: { ImageURL: url } } } }] };
  const [row] = inventory(save, { jobs: {} }, { files: {} }, () => false);
  assert.equal(row[3], 2);
  assert.equal(row[5], 1);
  assert.equal(row[6], 1);
  assert.equal(row[7], 1);
  assert.equal(row[16], "Child | Custom_Tile");
  assert.equal(row[17], "bbbbbb | cccccc");
  assert.match(row[18], /ContainedObjects\[0\]\.CustomUIAssets\[0\]\.URL/);
});

test("conflicting byte counts stay explicit and CSV preserves punctuation and newlines", () => {
  const [row] = inventory({ SkyURL: url }, { jobs: { sky: { rows: [{ url, path: "sky.webp", size: 12 }] } } },
    { files: { "sky.webp": { url, size: 13 } } }, () => true);
  assert.equal(row[8], "");
  assert.equal(row[9], "12 | 13");
  const values = [["a, b", 'quote "', "line\nnext"]];
  assert.deepEqual(parseCsv(toCsv(values)), values);
});
