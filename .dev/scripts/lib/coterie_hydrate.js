"use strict";

/**
 * Post-process coterie JSON: append in-session blank trait slots (not in Google Sheet export).
 * Keep in sync with lib/coterie_hydrate.ttslua.
 */

const TRAIT_ARRAY_KEYS = [
  "coterieBackgrounds",
  "coterieMerits",
  "coterieFlaws",
  "domainBackgrounds",
  "domainMerits",
  "domainFlaws",
  "havenBackgrounds",
  "havenMerits",
  "havenFlaws",
];

const BLANK_SLOTS_PER_ARRAY = 3;

function makeBlankEntry() {
  return {
    name: "",
    focus: "",
    base: 0,
    temp: 0,
    max: 5,
    description: [],
    rules: [],
    active: false,
    blank: true,
  };
}

/**
 * @param {unknown[]|null|undefined} arr
 * @returns {object[]}
 */
function collectRealEntries(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter((entry) => entry && typeof entry === "object" && entry.blank !== true);
}

/**
 * @param {unknown[]|null|undefined} arr
 * @returns {object[]}
 */
function collectBlankEntries(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter((entry) => entry && typeof entry === "object" && entry.blank === true);
}

/**
 * @param {unknown[]|null|undefined} arr
 * @returns {object[]}
 */
function ensureTraitBlankSlots(arr) {
  const real = collectRealEntries(arr);
  const blanks = collectBlankEntries(arr);
  while (blanks.length < BLANK_SLOTS_PER_ARRAY) {
    blanks.push(makeBlankEntry());
  }
  while (blanks.length > BLANK_SLOTS_PER_ARRAY) {
    blanks.pop();
  }
  return [...real, ...blanks];
}

/** ##IF @@HAS_*@@## keys → coterieData array keys (build-time reference layer). */
const TRAIT_SECTION_DIVIDER_FLAGS = {
  HAS_COTERIE_MERITS: "coterieMerits",
  HAS_COTERIE_FLAWS: "coterieFlaws",
  HAS_DOMAIN_BACKGROUNDS: "domainBackgrounds",
  HAS_DOMAIN_MERITS: "domainMerits",
  HAS_DOMAIN_FLAWS: "domainFlaws",
  HAS_HAVEN_BACKGROUNDS: "havenBackgrounds",
  HAS_HAVEN_MERITS: "havenMerits",
  HAS_HAVEN_FLAWS: "havenFlaws",
};

/**
 * Params for ##IF @@HAS_*@@## around trait sections (divider + columns; real entries only, not blanks).
 * @param {Record<string, unknown>|null|undefined} data
 * @returns {Record<string, string>}
 */
function buildTraitSectionDividerFlags(data) {
  const src = data && typeof data === "object" ? data : {};
  /** @type {Record<string, string>} */
  const flags = {};
  for (const [flag, arrayKey] of Object.entries(TRAIT_SECTION_DIVIDER_FLAGS)) {
    if (collectRealEntries(/** @type {unknown[]} */ (src[arrayKey])).length > 0) {
      flags[flag] = "1";
    }
  }
  return flags;
}

/**
 * @param {Record<string, unknown>|null|undefined} data
 * @returns {Record<string, unknown>}
 */
function hydrateCoterieData(data) {
  const out = data && typeof data === "object" ? { ...data } : {};
  for (const key of TRAIT_ARRAY_KEYS) {
    out[key] = ensureTraitBlankSlots(/** @type {unknown[]} */ (out[key]));
  }
  return out;
}

module.exports = {
  TRAIT_ARRAY_KEYS,
  BLANK_SLOTS_PER_ARRAY,
  TRAIT_SECTION_DIVIDER_FLAGS,
  makeBlankEntry,
  ensureTraitBlankSlots,
  hydrateCoterieData,
  buildTraitSectionDividerFlags,
  collectRealEntries,
};
