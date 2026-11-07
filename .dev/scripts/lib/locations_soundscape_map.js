"use strict";

/**
 * Districts & Sites `(data)` Soundscape label → catalog key map.
 * Authoring column N stores labels (ComputerLab, Autoshop); runtime keys live in column B.
 */

const { SHEET_IDS, fetchTabCsv } = require("./google_sheet_fetch.js");
const { parseCsv } = require("./skyboxes_sheet_csv.js");

const USER_AGENT = "toronto-rising-tts-locations-soundscape-map";

/** @type {Map<string, string> | undefined} */
let cached;

/**
 * @param {string} csvText
 * @returns {Map<string, string>}
 */
function parseSoundscapeLabelMap(csvText) {
  const rows = parseCsv(csvText);
  /** @type {Map<string, string>} */
  const map = new Map();
  // Row 0: section titles; row 1: "Soundscape" / blank key header; data from row 2.
  for (let i = 2; i < rows.length; i++) {
    const label = String(rows[i][0] ?? "").trim();
    const key = String(rows[i][1] ?? "").trim();
    if (!label || !key) continue;
    map.set(label, key);
  }
  return map;
}

/**
 * @returns {Map<string, string>}
 */
function getSoundscapeLabelMap() {
  return cached ?? new Map();
}

/**
 * @param {Map<string, string>} map
 */
function setSoundscapeLabelMapForTests(map) {
  cached = map;
}

function clearSoundscapeLabelMapCache() {
  cached = undefined;
}

/**
 * Fetch and cache the live `(data)` soundscape map. Safe to call repeatedly.
 * @returns {Promise<Map<string, string>>}
 */
async function loadSoundscapeLabelMap() {
  if (cached) return cached;
  if (process.env.TR_SOUNDSCAPE_LABEL_MAP_CSV) {
    const fs = require("node:fs");
    cached = parseSoundscapeLabelMap(fs.readFileSync(process.env.TR_SOUNDSCAPE_LABEL_MAP_CSV, "utf8"));
    return cached;
  }
  const csv = await fetchTabCsv(SHEET_IDS.districtsAndSites, "(data)", USER_AGENT);
  cached = parseSoundscapeLabelMap(csv);
  return cached;
}

module.exports = {
  parseSoundscapeLabelMap,
  getSoundscapeLabelMap,
  setSoundscapeLabelMapForTests,
  clearSoundscapeLabelMapCache,
  loadSoundscapeLabelMap,
};
