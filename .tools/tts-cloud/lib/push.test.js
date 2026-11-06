"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { PROTECTED_CLOUD_FOLDER } = require("./cloud_config.js");
const { saveLedger } = require("./assets_tree.js");
const { makeIndexEntry, serializeIndex } = require("./cloud_index.js");
const { sha1Hex } = require("./cloud_ops.js");
const { planPush, refreshProtectedCloudFiles, safeProtectedRelPath } = require("./push.js");

test("plans index-only cleanup only for case aliases sharing one stored file and one URL", (t) => {
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-cloud-case-alias-"));
  t.after(() => fs.rmSync(assetsDir, { recursive: true, force: true }));
  const bytes = Buffer.from("art with a case-only rename");
  const sha1 = sha1Hex(bytes);
  const cloudRoot = "Test Cloud";
  const canonical = { key: `${sha1}_npc_tremere.webp`, name: "npc_tremere.webp" };
  const alias = { key: `${sha1}_npc_Tremere.webp`, name: "npc_Tremere.webp" };
  const url = `https://steamusercontent-a.akamaihd.net/ugc/42/${sha1}/`;
  const makeEntry = (row, link) => makeIndexEntry({ name: row.name, url: link, folder: cloudRoot, size: bytes.length });
  fs.writeFileSync(path.join(assetsDir, canonical.name), bytes);
  saveLedger(assetsDir, { cloudRoot, files: { [alias.name]: { key: alias.key, url, size: bytes.length } } });
  const stored = (row) => ({ name: row.key, size: bytes.length });
  const planFor = (remote, aliasUrl = url, canonicalAccessible = true) => {
    const index = serializeIndex({ [canonical.key]: makeEntry(canonical, url), [alias.key]: makeEntry(alias, aliasUrl) });
    const session = {
      readFile: () => index,
      listFiles: () => remote,
      fileExists: (key) => key === alias.key || canonicalAccessible,
    };
    return planPush({ assetsDir, cloudRoot }, session);
  };

  const plan = planFor([stored(alias)]);
  assert.deepEqual(plan.caseAliases.map(({ alias, canonical }) => [alias.key, canonical.key]), [[alias.key, canonical.key]]);
  assert.equal(plan.inSync[0].row.url, url);
  assert.deepEqual(plan.uploads, []);
  assert.deepEqual(plan.deleteCandidates, []);

  for (const other of [
    planFor([stored(alias), stored(canonical)]),
    planFor([stored(alias)], url.replace("/42/", "/43/")),
    planFor([stored(alias)], url, false),
  ]) {
    assert.deepEqual(other.caseAliases, []);
    assert.equal(other.deleteCandidates[0].row.key, alias.key);
  }
});

test("plans superseded Cloud versions even after the ledger moved to the current file", t => {
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-cloud-version-"));
  t.after(() => fs.rmSync(assetsDir, { recursive: true, force: true }));
  const currentBytes = Buffer.from("current art"), oldBytes = Buffer.from("old art");
  const currentHash = sha1Hex(currentBytes), oldHash = sha1Hex(oldBytes);
  const cloudRoot = "Test Cloud";
  const currentKey = `${currentHash}_card.webp`, oldKey = `${oldHash}_card.webp`;
  const currentUrl = `https://steamusercontent-a.akamaihd.net/ugc/2/${currentHash}/`;
  const oldUrl = `https://steamusercontent-a.akamaihd.net/ugc/1/${oldHash}/`;
  fs.writeFileSync(path.join(assetsDir, "card.webp"), currentBytes);
  saveLedger(assetsDir, { cloudRoot, files: { "card.webp": { key: currentKey, url: currentUrl, size: currentBytes.length } } });
  const index = serializeIndex({
    [currentKey]: makeIndexEntry({ name: "card.webp", url: currentUrl, folder: cloudRoot, size: currentBytes.length }),
    [oldKey]: makeIndexEntry({ name: "card.webp", url: oldUrl, folder: cloudRoot, size: oldBytes.length }),
  });
  const session = { readFile: () => index };
  const plan = planPush({ assetsDir, cloudRoot }, session);
  assert.deepEqual(plan.inSync.map(x => x.row.key), [currentKey]);
  assert.deepEqual(plan.deleteCandidates.map(x => x.row.key), [oldKey]);
  assert.deepEqual(plan.cloudOnly, []);
});

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
