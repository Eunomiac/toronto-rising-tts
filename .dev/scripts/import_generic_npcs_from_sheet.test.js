"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseGenericNpcRows,
  renderGenericNpcCatalogJson,
  renderGenericNpcsCatalogLua,
} = require("./lib/generic_npcs_sheet_csv.js");

const SAMPLE = [
  "filename,label,key,tags",
  "civilianChildBoy_01.webp,Child — Boy,civilianChildBoy_01,civilian child youth boy",
  "dogAngry_02.webp,Dog — Angry,dogAngry_02,animal dog canine aggressive",
  "crimePolice_03.webp,Police Officer — Woman,crimePolice_03,police security law enforcement civilian woman",
].join("\n");

test("parseGenericNpcRows reads filename,label,key,tags in sheet order", () => {
  const rows = parseGenericNpcRows(SAMPLE);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].filename, "civilianChildBoy_01.webp");
  assert.equal(rows[0].label, "Child — Boy");
  assert.equal(rows[0].key, "civilianChildBoy_01");
  assert.equal(rows[2].key, "crimePolice_03");
});

test("parseGenericNpcRows rejects duplicate keys", () => {
  assert.throws(
    () =>
      parseGenericNpcRows(
        "filename,label,key,tags\na.webp,A,dupKey,one\nb.webp,B,dupKey,two\n",
      ),
    /duplicate key/,
  );
});

test("parseGenericNpcRows rejects path-like filenames", () => {
  assert.throws(
    () => parseGenericNpcRows("filename,label,key,tags\nfoo/bar.webp,A,aKey,tag\n"),
    /basename/,
  );
});

test("renderGenericNpcCatalogJson is stable JSON", () => {
  const text = renderGenericNpcCatalogJson({
    npcs: parseGenericNpcRows(SAMPLE),
    meta: { sheetId: "sheet", rangeName: "GENERICNPCCSV", tabName: "Generics Export" },
  });
  const parsed = JSON.parse(text);
  assert.equal(parsed.npcs.length, 3);
  assert.equal(parsed.rangeName, "GENERICNPCCSV");
  assert.equal(parsed.tabName, "Generics Export");
});

test("renderGenericNpcsCatalogLua emits ByKey labels", () => {
  const lua = renderGenericNpcsCatalogLua({
    npcs: parseGenericNpcRows(SAMPLE),
    meta: { sheetId: "sheet", rangeName: "GENERICNPCCSV", tabName: "Generics Export" },
  });
  assert.match(lua, /GenericNpcsCatalog\.ByKey = \{/);
  assert.match(lua, /civilianChildBoy_01 = \{/);
  assert.match(lua, /label = "Child — Boy"/);
  assert.match(lua, /return GenericNpcsCatalog/);
});
