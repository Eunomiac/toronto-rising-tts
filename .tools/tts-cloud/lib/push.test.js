"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { PROTECTED_CLOUD_FOLDER } = require("./cloud_config.js");
const { refreshProtectedCloudFiles, safeProtectedRelPath } = require("./push.js");

test("safeProtectedRelPath rejects paths that can escape the mirror", () => {
  assert.equal(safeProtectedRelPath("NPC Art/old.webp"), "NPC Art/old.webp");
  assert.throws(() => safeProtectedRelPath("../old.webp"), /Unsafe/);
  assert.throws(() => safeProtectedRelPath("NPC Art//old.webp"), /Unsafe/);
  assert.throws(() => safeProtectedRelPath("C:/old.webp"), /Unsafe/);
});

test("refreshProtectedCloudFiles mirrors protected files, describes their use, and prunes resolved copies", () => {
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-protected-cloud-"));
  const bytes = Buffer.from("protected art");
  const key = "ABCDEF_old.webp";
  const session = {
    fileExists: (name) => name === key,
    readFile: (name) => {
      assert.equal(name, key);
      return bytes;
    },
  };
  const entry = {
    candidate: {
      relPath: "NPC Art/old.webp",
      reason: "deleted locally",
      row: {
        folder: "Vampire the Masquerade 5E/NPC Art",
        name: "old.webp",
        key,
        size: bytes.length,
        url: "https://example.test/ugc/1/ABCDEF/",
      },
    },
    use: {
      protectedBy: ["current save (TS_Save_230.json)"],
      otherModSaves: [],
      olderTorontoRisingSaves: [],
    },
  };

  try {
    const first = refreshProtectedCloudFiles({ assetsDir }, session, [entry]);
    assert.deepEqual(
      { count: first.count, written: first.written, unchanged: first.unchanged, removed: first.removed },
      { count: 1, written: 1, unchanged: 0, removed: 0 },
    );
    const mirrorRoot = path.join(assetsDir, PROTECTED_CLOUD_FOLDER);
    assert.deepEqual(fs.readFileSync(path.join(mirrorRoot, "NPC Art", "old.webp")), bytes);
    const index = JSON.parse(fs.readFileSync(path.join(mirrorRoot, "index.json"), "utf8"));
    assert.equal(index.files[0].path, "NPC Art/old.webp");
    assert.deepEqual(index.files[0].protectedBy, ["current save (TS_Save_230.json)"]);

    const second = refreshProtectedCloudFiles({ assetsDir }, session, [entry]);
    assert.deepEqual(
      { count: second.count, written: second.written, unchanged: second.unchanged, removed: second.removed },
      { count: 1, written: 0, unchanged: 1, removed: 0 },
    );

    const final = refreshProtectedCloudFiles({ assetsDir }, session, []);
    assert.equal(final.removed, 1);
    assert.equal(fs.existsSync(path.join(mirrorRoot, "NPC Art", "old.webp")), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(mirrorRoot, "index.json"), "utf8")).files, []);
  } finally {
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }
});
