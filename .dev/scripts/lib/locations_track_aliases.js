"use strict";

/**
 * Sheet location-track keys the soundscape catalog spells differently.
 * Each alias prints a warning until the sheet row uses the catalog key.
 *
 * Keep in sync with AssetBundle effect names in lib/soundscape_catalog.ttslua.
 */
const TRACK_ALIASES = {
  warrensSafe: "warrens",
  computerLab: "computer",
  autoshop: "autoShop",
};

/**
 * @param {string} locationTrack
 * @param {Set<string>} trackKeys
 * @param {string[]} warnings
 * @param {string} label
 * @returns {string}
 */
function resolveLocationTrack(locationTrack, trackKeys, warnings, label) {
  if (trackKeys.has(locationTrack)) {
    return locationTrack;
  }
  const alias = TRACK_ALIASES[locationTrack];
  if (alias === undefined || !trackKeys.has(alias)) {
    throw new Error(`${label}: unknown location audio ${locationTrack}`);
  }
  warnings.push(`${label}: location track "${locationTrack}" aliased to "${alias}" (update the sheet)`);
  return alias;
}

module.exports = { TRACK_ALIASES, resolveLocationTrack };
