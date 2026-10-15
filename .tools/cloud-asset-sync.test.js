"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { distinguishingLiteral, derivePurgePatterns, validateConfig, renderLuaModule, parseCli } = require("./cloud-asset-sync.js");

test("distinguishingLiteral accepts prefixes and suffixes outside capture groups", () => {
  assert.equal(distinguishingLiteral("^token_(.*)\\.webp$"), "token_");
  assert.equal(distinguishingLiteral("^(.*)_panel\\.jpg$"), "_panel");
  assert.equal(distinguishingLiteral("^memoriamPanel_([A-Za-z][A-Za-z0-9]*[0-9]+_[a-dA-D])\\.[^.]+$"), "memoriamPanel_");
  assert.equal(distinguishingLiteral("^scatter(.*)\\.webp$"), "scatter");
});

test("distinguishingLiteral rejects patterns that match every file of a type", () => {
  assert.equal(distinguishingLiteral("^(.*)\\.webp$"), "");
  assert.equal(distinguishingLiteral("^(.*)\\.[^.]+$"), "");
  assert.equal(distinguishingLiteral("^([^.]+)\\.[^.]+$"), "");
  assert.equal(distinguishingLiteral("^(navigate.*)\\.[^.]+$"), "");
  assert.equal(distinguishingLiteral("^[a-z]+\\.webp$"), "");
  assert.equal(distinguishingLiteral("^x?(.*)\\.webp$"), "");
});

test("derivePurgePatterns narrows on the replace literal", () => {
  assert.deepEqual(derivePurgePatterns("siteCard_$1"), ["^siteCard_(.*)$"]);
  assert.equal(derivePurgePatterns("$1"), null);
});

test("validateConfig refuses save-row jobs that cannot purge", () => {
  const base = { id: "a", folder: "X", output: "GlobalCustomUIAssets", filenameToNameSearchPattern: "^x_(.*)\\.webp$" };
  assert.throws(() => validateConfig({ jobs: [{ ...base, filenameToNameReplacePattern: "$1" }] }), /no purge family/);
  assert.throws(() => validateConfig({ jobs: [{ ...base, filenameToNameReplacePattern: "x_$1", purgePatterns: [] }] }), /not allowed/);
  assert.equal(validateConfig({ jobs: [{ ...base, filenameToNameReplacePattern: "x_$1" }] })[0].literal, "x_");
});

test("validateConfig resolves target groups and module paths", () => {
  const jobs = validateConfig({
    targetGroups: { pages: ["aaaaaa", "bbbbbb"] },
    jobs: [
      { id: "o", folder: "P", output: "ObjectCustomUIAssets", targets: "pages", filenameToNameSearchPattern: "^box_(.*)\\.webp$", filenameToNameReplacePattern: "box_$1" },
      { id: "l", folder: "M", output: "LuaModule", module: "lib/cloud_test.ttslua", filenameToNameSearchPattern: "^m_(.*)\\.jpg$", filenameToNameReplacePattern: "$1" },
      {
        id: "i",
        folder: "S",
        output: "ObjectImage",
        field: "CustomImage.ImageURL",
        objects: { back: "pages", one: "cccccc", two: ["dddddd", "eeeeee"] },
        filenameToNameSearchPattern: "^fig_(.*)\\.png$",
        filenameToNameReplacePattern: "$1",
      },
      { id: "mix", folder: "Q", output: "ObjectCustomUIAssets", targets: ["pages", "ffffff"], ownsAllRows: true, filenameToNameSearchPattern: "^dot_(.*)\\.webp$", filenameToNameReplacePattern: "dot_$1" },
    ],
  });
  assert.deepEqual(jobs[0].targets, ["aaaaaa", "bbbbbb"]);
  assert.deepEqual(jobs[2].objects, { back: ["aaaaaa", "bbbbbb"], one: ["cccccc"], two: ["dddddd", "eeeeee"] });
  assert.deepEqual(jobs[3].targets, ["aaaaaa", "bbbbbb", "ffffff"]);
  assert.throws(
    () =>
      validateConfig({
        jobs: [{ id: "bad", folder: "M", output: "LuaModule", module: "lib/other.ttslua", filenameToNameSearchPattern: "^m_(.*)\\.jpg$", filenameToNameReplacePattern: "$1" }],
      }),
    /lib\/cloud_/,
  );
});

test("renderLuaModule returns a sorted table keyed by name", () => {
  const lua = renderLuaModule({ id: "j", folder: "F" }, [
    { name: "b_1", filename: "m_b_1.jpg", url: "https://x/2/" },
    { name: "a_1", filename: "m_a_1.jpg", url: "https://x/1/" },
  ]);
  assert.match(lua, /^-- AUTO-GENERATED/);
  assert.ok(lua.indexOf("a_1 =") < lua.indexOf("b_1 ="));
  assert.match(lua, /return \{/);
});

test("parseCli accepts job lists and push flags", () => {
  const cli = parseCli(["--job", "a,b", "--dry-run", "--no-push"]);
  assert.deepEqual(cli.jobFilter, ["a", "b"]);
  assert.equal(cli.dryRun, true);
  assert.equal(cli.noPush, true);
});
