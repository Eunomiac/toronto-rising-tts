"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { REVIEW_WIDTH, selectPendingReviewRows, buildReviewRow } = require("./review-sheet-rows.js");

const steam = (hash) => `https://steamusercontent-a.akamaihd.net/ugc/99/${hash}/`;
const HASH_A = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const HASH_B = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

function inventoryRow(url, bytes, file) {
  const row = Array(22).fill("");
  row[0] = url;
  row[1] = "steamusercontent-a.akamaihd.net";
  row[8] = bytes;
  row[10] = "csheetPage1Resonance";
  row[12] = file;
  row[14] = url.match(/([A-F0-9]{40})/)?.[1] ?? "";
  return row;
}

const csv = [
  "URL,Known bytes,Manual decision,Manual notes",
  `${steam(HASH_A)},10,Keep,already reviewed`,
  `${steam(HASH_B).toLowerCase()},20,,blank decision still counts`,
].join("\n");

test("pending review rows skip decided and blank-decision URLs and keep larger files first", () => {
  const fresh = inventoryRow(steam("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"), 5, "assets/CSheets/Page1/Resonance/resonance_new.webp");
  const bigger = inventoryRow(steam("DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"), 50, "assets/HUD/Session Splash Overlays/overlay_sessionTitle_2.webp");
  const pending = selectPendingReviewRows([
    inventoryRow(steam(HASH_A), 10, "assets/already.webp"),
    inventoryRow(steam(HASH_B), 20, "assets/blank.webp"),
    fresh,
    bigger,
  ], csv, ["https://example.test/inherited"]);
  assert.deepEqual(pending.map((row) => row[12]), [bigger[12], fresh[12]]);
});

test("a new review row occupies Integrated assets AA:BI and leaves the decision blank", () => {
  const source = inventoryRow(steam(HASH_A), 127058, "assets/CSheets/Page1/Resonance/bg_condition_dyscrasia.webp");
  const row = buildReviewRow(source);
  assert.equal(row.length, REVIEW_WIDTH);
  assert.equal(row[0], source[0]);
  assert.equal(row[8], "127058");
  assert.equal(row[12], source[12]);
  assert.equal(row[22], "bg_condition_dyscrasia.webp");
  assert.equal(row[23], "Image");
  assert.equal(row[26], "assets\\CSheets\\Page1\\Resonance\\bg_condition_dyscrasia.webp");
  assert.equal(row[28], row[26]);
  assert.equal(row[29], "");
  assert.equal(row[32], "Current");
  assert.equal(row[33], "Needs a decision.");
});
