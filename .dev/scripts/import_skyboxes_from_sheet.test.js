"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseCsv,
  parseSkyboxCatalogRows,
  parseGenericSkyboxRows,
  escapeLuaString,
  renderSkyboxesCatalogLua,
} = require("./lib/skyboxes_sheet_csv.js");

test("parseCsv handles quoted commas", () => {
  const rows = parseCsv('Key,Display,URL\nA,"Hi, there",https://x/\n');
  assert.deepEqual(rows[1], ["A", "Hi, there", "https://x/"]);
});

test("parseSkyboxCatalogRows accepts valid rows and preserves order", () => {
  const csv = [
    "Key,Display,isShown,URL",
    "Beta,Beta Label,TRUE,https://b/",
    "Alpha,Alpha Label,FALSE,https://a/",
    "",
  ].join("\n");
  const rows = parseSkyboxCatalogRows(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].key, "Beta");
  assert.equal(rows[0].isShown, true);
  assert.equal(rows[1].key, "Alpha");
  assert.equal(rows[1].isShown, false);
});

test("parseSkyboxCatalogRows rejects bad header", () => {
  assert.throws(() => parseSkyboxCatalogRows("A,B,C\nx,y,z\n"), /expected header/i);
  assert.throws(
    () => parseSkyboxCatalogRows("Key,Display,URL\nA,One,https://a/\n"),
    /expected header/i,
  );
});

test("parseSkyboxCatalogRows rejects invalid isShown", () => {
  const csv = "Key,Display,isShown,URL\nA,One,maybe,https://a/\n";
  assert.throws(() => parseSkyboxCatalogRows(csv), /isShown must be TRUE or FALSE/i);
});

test("parseSkyboxCatalogRows rejects duplicate keys", () => {
  const csv = "Key,Display,isShown,URL\nA,One,TRUE,https://a/\nA,Two,TRUE,https://b/\n";
  assert.throws(() => parseSkyboxCatalogRows(csv), /duplicate key/i);
});

test("parseSkyboxCatalogRows rejects invalid Lua identifier keys", () => {
  const csv = "Key,Display,isShown,URL\nbad-key,Label,TRUE,https://a/\n";
  assert.throws(() => parseSkyboxCatalogRows(csv), /Lua identifier/i);
});

test("parseGenericSkyboxRows requires at least one URL", () => {
  assert.throws(() => parseGenericSkyboxRows("URL\n\n"), /at least one URL/i);
  const urls = parseGenericSkyboxRows("URL\nhttps://a/\nhttps://b/\n");
  assert.deepEqual(urls, ["https://a/", "https://b/"]);
});

test("escapeLuaString escapes backslash and quotes", () => {
  assert.equal(escapeLuaString('say "hi"'), 'say \\"hi\\"');
  assert.equal(escapeLuaString("a\\b"), "a\\\\b");
});

test("renderSkyboxesCatalogLua emits module shape", () => {
  const lua = renderSkyboxesCatalogLua({
    skyboxes: [
      { key: "CLHall", display: 'Hall "A"', isShown: true, url: "https://u/" },
      { key: "HiddenHall", display: "Hidden", isShown: false, url: "https://h/" },
    ],
    generics: ["https://g/"],
    meta: {
      sheetId: "sheet123",
      catalogRange: "SKYBOXCSV",
      genericsRange: "SKYBOXGENERICCSV",
    },
  });
  assert.match(lua, /SkyboxesCatalog\.Skyboxes = \{/);
  assert.match(lua, /CLHall = \{/);
  assert.match(lua, /display = "Hall \\"A\\""/);
  assert.match(lua, /isShown = true,/);
  assert.match(lua, /HiddenHall = \{[\s\S]*isShown = false,/);
  assert.match(lua, /Key,Display,isShown,URL/);
  assert.match(lua, /SkyboxesCatalog\.GenericSkyboxes = \{/);
  assert.match(lua, /return SkyboxesCatalog/);
  assert.match(lua, /sheet123/);
});
