"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadStagedMap, packStagedObjects } = require("./stage-hidden-storage.js");

test("the staged list resolves the live bag and both complications decks", () => {
  const map = loadStagedMap();
  assert.equal(map.bagGuid, "1c0050");
  assert.equal(map.staged["11e747"], false);
  assert.equal(map.staged["2d57f2"], false);
  assert.equal(map.staged["f8e50c"], true);
  assert.equal(map.staged["21d213"], true);
  assert.equal(map.staged["c80132"], true);
});

test("packs staged objects into the bag and remembers whether each one was hidden", () => {
  const map = {
    bagGuid: "bagbag",
    staged: { deadad: true, alive1: false },
  };
  const source = [
    { GUID: "bagbag", Name: "Custom_Model_Bag", Transform: { posY: -210 } },
    {
      GUID: "deadad",
      Name: "Custom_Tile",
      Tags: ["HiddenObject"],
      Locked: true,
      DragSelectable: false,
      Transform: { posX: 1, posY: -200, posZ: 2, rotX: 0, rotY: 90, rotZ: 0 },
    },
    {
      GUID: "alive1",
      Name: "DeckCustom",
      Tags: ["deckOfComplications"],
      Locked: false,
      DragSelectable: false,
      Transform: { posX: 4, posY: 8, posZ: 9, rotY: 10 },
    },
    { GUID: "keepme", Name: "Block" },
  ];
  const packed = packStagedObjects(source, map);
  assert.equal(source.length, 4);
  assert.equal(packed.packed, 2);
  assert.deepEqual(packed.objectStates.map((object) => object.GUID), ["bagbag", "keepme"]);
  const bag = packed.objectStates[0];
  assert.deepEqual(bag.ContainedObjects.map((object) => object.GUID), ["deadad", "alive1"]);
  assert.equal(packed.stagedObjects.deadad.wasHidden, true);
  assert.equal(packed.stagedObjects.deadad.releaseHidden, true);
  assert.equal(packed.stagedObjects.deadad.position.y, -200);
  assert.equal(packed.stagedObjects.alive1.wasHidden, false);
  assert.equal(packed.stagedObjects.alive1.releaseHidden, false);
  assert.equal(packed.stagedObjects.alive1.locked, false);
  assert.equal(packed.stagedObjects.alive1.interactable, false);
});

test("leaves a save alone when none of the staged objects are in it", () => {
  const source = [{ GUID: "zzzzzz" }];
  const packed = packStagedObjects(source, { bagGuid: "bagbag", staged: { deadad: true } });
  assert.equal(packed.packed, 0);
  assert.equal(packed.objectStates, source);
});

test("refuses to pack when the bag itself is missing", () => {
  assert.throws(
    () => packStagedObjects([{ GUID: "deadad", Transform: { posY: -200 }, Tags: ["HiddenObject"] }], {
      bagGuid: "bagbag",
      staged: { deadad: true },
    }),
    /bagbag/,
  );
});
