"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildSupersededRetargets, retargetSaveUrls } = require("./retarget-save-urls.js");

const OLD_FRONT = "https://steamusercontent-a.akamaihd.net/ugc/11/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/";
const OLD_BACK = "http://steamusercontent.com/ugc/12/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const NEW_FRONT = "https://steamusercontent-a.akamaihd.net/ugc/21/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC/";
const NEW_BACK = "https://steamusercontent-a.akamaihd.net/ugc/22/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD/";
const KEEP = "https://steamusercontent-a.akamaihd.net/ugc/99/EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE/";

test("buildSupersededRetargets keeps same-filename replacements that already have a new link", () => {
  const ledger = {
    "Objects/Discipline Cards - Front.webp": { url: NEW_FRONT },
    "Objects/Discipline Cards - Back.webp": { url: OLD_BACK },
    "Objects/gone.webp": { url: KEEP },
  };
  const retargets = buildSupersededRetargets([
    { relPath: "Objects/Discipline Cards - Front.webp", reason: "replaced locally", row: { url: OLD_FRONT } },
    { relPath: "Objects/Discipline Cards - Front.webp", reason: "superseded Cloud version", row: { url: OLD_FRONT } },
    { relPath: "Objects/Discipline Cards - Back.webp", reason: "superseded Cloud version", row: { url: OLD_BACK } },
    { relPath: "Objects/gone.webp", reason: "deleted locally", row: { url: KEEP } },
  ], ledger);
  assert.deepEqual(retargets, [
    { relPath: "Objects/Discipline Cards - Front.webp", oldKey: "11/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", newUrl: NEW_FRONT },
  ]);
});

test("buildSupersededRetargets refuses two current links for one old Cloud file", () => {
  assert.throws(
    () => buildSupersededRetargets([
      { relPath: "a.webp", reason: "replaced locally", row: { url: OLD_FRONT } },
      { relPath: "b.webp", reason: "superseded Cloud version", row: { url: OLD_FRONT } },
    ], { "a.webp": { url: NEW_FRONT }, "b.webp": { url: NEW_BACK } }),
    /two different links/,
  );
});

test("retargetSaveUrls rewrites card faces, tile images, and script text", () => {
  const save = {
    LuaScript: `local front = "${OLD_FRONT}"\nlocal keep = "${KEEP}"`,
    ObjectStates: [
      {
        Nickname: "Storage",
        ContainedObjects: [{ CustomDeck: { 97: { FaceURL: OLD_FRONT, BackURL: OLD_BACK } } }],
      },
      { Nickname: "Robin", CustomImage: { ImageURL: OLD_FRONT, ImageSecondaryURL: KEEP } },
    ],
  };
  const files = retargetSaveUrls(save, [
    { relPath: "Objects/Discipline Cards - Front.webp", oldKey: "11/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", newUrl: NEW_FRONT },
    { relPath: "Objects/Discipline Cards - Back.webp", oldKey: "12/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", newUrl: NEW_BACK },
  ]);
  assert.deepEqual(files, [
    { relPath: "Objects/Discipline Cards - Front.webp", count: 3 },
    { relPath: "Objects/Discipline Cards - Back.webp", count: 1 },
  ]);
  assert.equal(save.ObjectStates[0].ContainedObjects[0].CustomDeck[97].FaceURL, NEW_FRONT);
  assert.equal(save.ObjectStates[0].ContainedObjects[0].CustomDeck[97].BackURL, NEW_BACK);
  assert.equal(save.ObjectStates[1].CustomImage.ImageURL, NEW_FRONT);
  assert.equal(save.ObjectStates[1].CustomImage.ImageSecondaryURL, KEEP);
  assert.match(save.LuaScript, new RegExp(NEW_FRONT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(save.LuaScript, /EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE/);
  assert.equal(save.LuaScript.includes("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"), false);
});
