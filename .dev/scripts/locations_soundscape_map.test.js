"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { parseSoundscapeLabelMap } = require("./lib/locations_soundscape_map.js");
const { resolveLocationTrack } = require("./lib/locations_track_aliases.js");

const SAMPLE_CSV = [
  "Dropdown Lookups,,,,,,,",
  "Soundscape,,Count,Music Themes,,,,",
  "(NONE),silent,,,,,",
  "(TOTALSILENCE),,,,,,,",
  "Autoshop,autoShop,2,,,,",
  "ComputerLab,computer,2,,,,",
  "Warrens,warrens,8,,,,",
].join("\n");

test("parseSoundscapeLabelMap reads (data) label→key pairs and skips blank keys", () => {
  const map = parseSoundscapeLabelMap(SAMPLE_CSV);
  assert.equal(map.get("(NONE)"), "silent");
  assert.equal(map.get("Autoshop"), "autoShop");
  assert.equal(map.get("ComputerLab"), "computer");
  assert.equal(map.get("Warrens"), "warrens");
  assert.equal(map.has("(TOTALSILENCE)"), false);
});

test("resolveLocationTrack accepts catalog keys, labels, and camelCased labels", () => {
  const map = parseSoundscapeLabelMap(SAMPLE_CSV);
  const keys = new Set(["silent", "autoShop", "computer", "warrens"]);
  const warnings = [];
  assert.equal(resolveLocationTrack("computer", keys, warnings, "A", map), "computer");
  assert.equal(resolveLocationTrack("ComputerLab", keys, warnings, "B", map), "computer");
  assert.equal(resolveLocationTrack("computerLab", keys, warnings, "C", map), "computer");
  assert.equal(resolveLocationTrack("autoshop", keys, warnings, "D", map), "autoShop");
  assert.equal(warnings.length, 3);
  assert.throws(() => resolveLocationTrack("nope", keys, warnings, "E", map), /unknown location audio nope/);
});
