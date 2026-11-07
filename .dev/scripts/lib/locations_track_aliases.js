"use strict";

/**
 * Resolve EXPORT / authored location-track values to soundscape catalog keys.
 * Prefer a catalog key; otherwise use Districts & Sites `(data)` label→key map
 * (direct label, or camelCased label as emitted by today's broken Sound - Location export).
 */

/**
 * @param {string} label
 * @returns {string}
 */
function lowerFirst(label) {
  if (!label) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * @param {string} locationTrack
 * @param {Set<string>} trackKeys
 * @param {string[]} warnings
 * @param {string} siteLabel
 * @param {Map<string, string>} [labelMap]
 * @returns {string}
 */
function resolveLocationTrack(locationTrack, trackKeys, warnings, siteLabel, labelMap = new Map()) {
  const raw = String(locationTrack ?? "").trim();
  if (trackKeys.has(raw)) {
    return raw;
  }

  /** @type {string | undefined} */
  let mapped;
  if (labelMap.has(raw)) {
    mapped = labelMap.get(raw);
  } else {
    for (const [label, key] of labelMap) {
      if (lowerFirst(label) === raw) {
        mapped = key;
        break;
      }
    }
  }

  if (mapped && trackKeys.has(mapped)) {
    warnings.push(
      `${siteLabel}: location track "${raw}" resolved via (data) map to "${mapped}" (update Sound - Location export to emit catalog keys)`,
    );
    return mapped;
  }

  throw new Error(`${siteLabel}: unknown location audio ${raw}`);
}

module.exports = { resolveLocationTrack, lowerFirst };
