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

const DOMAIN_RATING_KEYS = ["chasse", "lien", "portillon", "haven"];

/**
 * @param {number|object|null|undefined} val
 * @param {number} [defaultMax]
 * @returns {{ base: number, temp: number, max: number, disabled: number }}
 */
function normalizeDomainRatingValue(val, defaultMax = 5) {
  const maxSlots = Math.floor(Number(defaultMax) || 5);
  if (typeof val === "number" && !Number.isNaN(val)) {
    const n = Math.max(0, Math.floor(val));
    return { base: n, temp: 0, max: maxSlots, disabled: 0 };
  }
  if (!val || typeof val !== "object") {
    return { base: 0, temp: 0, max: maxSlots, disabled: 0 };
  }
  const maxV = Math.floor(Number(val.max) || maxSlots);
  const base = Math.max(0, Math.floor(Number(val.base) || 0));
  let temp = Math.max(0, Math.floor(Number(val.temp) || 0));
  let disabled = Math.max(0, Math.floor(Number(val.disabled) || 0));
  temp = Math.min(temp, Math.max(0, maxV - base));
  disabled = Math.min(disabled, base + temp);
  return { base, temp, max: maxV, disabled };
}

/**
 * @param {Record<string, unknown>} data
 */
function normalizeDomainRatings(data) {
  for (const key of DOMAIN_RATING_KEYS) {
    data[key] = normalizeDomainRatingValue(/** @type {unknown} */ (data[key]), 5);
  }
}

function makeBlankEntry() {
  return {
    name: "",
    focus: "",
    base: 0,
    temp: 0,
    disabled: 0,
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
 * Params for ##IF @@HAS_*@@## around trait sections (divider + columns).
 * Always emit all sections so ST can add first entry to empty categories at runtime.
 * @param {Record<string, unknown>|null|undefined} _data
 * @returns {Record<string, string>}
 */
function buildTraitSectionDividerFlags(_data) {
  /** @type {Record<string, string>} */
  const flags = {};
  for (const flag of Object.keys(TRAIT_SECTION_DIVIDER_FLAGS)) {
    flags[flag] = "1";
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
  normalizeDomainRatings(out);
  return out;
}

module.exports = {
  TRAIT_ARRAY_KEYS,
  BLANK_SLOTS_PER_ARRAY,
  TRAIT_SECTION_DIVIDER_FLAGS,
  makeBlankEntry,
  ensureTraitBlankSlots,
  hydrateCoterieData,
  normalizeDomainRatings,
  normalizeDomainRatingValue,
  DOMAIN_RATING_KEYS,
  buildTraitSectionDividerFlags,
  collectRealEntries,
};
