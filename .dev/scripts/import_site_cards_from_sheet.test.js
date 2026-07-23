"use strict";

const assert = require("assert");
const {
  parseSiteCardsCsv,
  mergeSiteCardsIntoCustomUiAssets,
} = require("./lib/site_cards_sheet_csv.js");

function testParseHappyPath() {
  const csv = "Name,URL\nsiteCard_A,https://example.com/a/\nsiteCard_B,https://example.com/b/\n";
  const rows = parseSiteCardsCsv(csv);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows[0], {
    Type: 0,
    Name: "siteCard_A",
    URL: "https://example.com/a/",
  });
}

function testParseDuplicateFails() {
  const csv = "Name,URL\nsiteCard_A,https://example.com/a/\nsiteCard_A,https://example.com/b/\n";
  assert.throws(() => parseSiteCardsCsv(csv), /Duplicate Name/);
}

function testMergeReplacesSiteCardsOnly() {
  const assets = [
    { Type: 0, Name: "pin_X", URL: "https://example.com/pin/" },
    { Type: 0, Name: "siteCard_Old", URL: "https://example.com/old/" },
    { Type: 0, Name: "overlay_Y", URL: "https://example.com/y/" },
  ];
  const imported = [
    { Type: 0, Name: "siteCard_New", URL: "https://example.com/new/" },
  ];
  const { assets: next, removed, added } = mergeSiteCardsIntoCustomUiAssets(assets, imported);
  assert.strictEqual(removed, 1);
  assert.strictEqual(added, 1);
  assert.deepStrictEqual(
    next.map((r) => r.Name),
    ["pin_X", "overlay_Y", "siteCard_New"],
  );
}

testParseHappyPath();
testParseDuplicateFails();
testMergeReplacesSiteCardsOnly();
console.log("site_cards_sheet_csv tests OK");
