"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { filterProtectedDecals, protectedKeys } = require("./remove-protected-decal-pallet.js");

const OLD = "https://steamusercontent-a.akamaihd.net/ugc/111/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/";
const SAME_FILE_OTHER_HOST = "https://steamusercontent.com/ugc/111/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/";
const KEEP = "https://steamusercontent-a.akamaihd.net/ugc/222/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB/";

test("filterProtectedDecals removes only protected UGC identities", () => {
  const keys = protectedKeys({ files: [{ path: "old.png", url: OLD }] });
  const save = {
    DecalPallet: [
      { Name: "old", ImageURL: SAME_FILE_OTHER_HOST },
      { Name: "keep", ImageURL: KEEP },
    ],
  };
  const result = filterProtectedDecals(save, keys);
  assert.deepEqual(result.removed, [{ index: 0, name: "old", url: SAME_FILE_OTHER_HOST }]);
  assert.deepEqual(result.kept, [{ Name: "keep", ImageURL: KEEP }]);
  assert.equal(save.DecalPallet.length, 2, "preview helper must not mutate the input save");
});
