"use strict";

/**
 * Pure helpers: Districts & Sites workbook (DISTRICTS + SITES tabs) → `lib/locations_catalog.ttslua`.
 *
 * Both tabs put section titles in row 1 and column headers in row 2. Columns are found by header
 * text inside a named section, so inserting columns in the sheet does not break the import.
 * Site values come from the SITES "Parsing for TTS Output" section (one Lua fragment per cell).
 */

const { escapeLuaString, LUA_IDENT_RE } = require("./skyboxes_sheet_csv.js");

/**
 * Sheet location-track keys the soundscape catalog spells differently. The sheet's hidden `(data)`
 * tab maps raw track names to these keys; each alias prints a warning until the sheet is fixed.
 */
const TRACK_ALIASES = {
  autoShop: "autoshop",
  computer: "computerLab",
  warrensSafe: "warrens",
  bar: "diveBar",
};

/**
 * Sheet background-music playlists the soundscape catalog does not have. `null` drops the site
 * music (catalog default mood plays). Each prints a warning until a playlist exists.
 */
const MUSIC_GAPS = {
  nosWarrens: null,
};

/** @param {unknown} value @returns {string} */
const cell = (value) => String(value == null ? "" : value).trim();

/** @param {string} header @returns {string} */
const normalizeHeader = (header) => cell(header).toLowerCase().replace(/\s+/g, "");

/**
 * @param {string[][]} rows
 * @param {{ header: string, headerRow?: number, section?: string }} spec
 * @returns {number}
 */
function findColumn(rows, { header, headerRow = 1, section }) {
  let from = 0;
  let to = Infinity;
  if (section !== undefined) {
    const markers = rows[0] || [];
    from = markers.findIndex((c) => cell(c) === section);
    if (from < 0) {
      throw new Error(`No "${section}" section title in row 1.`);
    }
    const next = markers.findIndex((c, i) => i > from && cell(c) !== "");
    to = next < 0 ? Infinity : next;
  }
  const want = normalizeHeader(header);
  const hits = (rows[headerRow] || [])
    .map((c, i) => (i >= from && i < to && normalizeHeader(c) === want ? i : -1))
    .filter((i) => i >= 0);
  const where = section === undefined ? "" : ` in section "${section}"`;
  if (hits.length !== 1) {
    throw new Error(`Expected one "${header}" header in row ${headerRow + 1}${where}, found ${hits.length}.`);
  }
  return hits[0];
}

/** @param {string} raw @returns {string} accent-free key */
const asciiKey = (raw) => raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * @param {string} raw cell text
 * @param {string} label
 * @param {string[]} warnings
 * @returns {string}
 */
function parseKey(raw, label, warnings) {
  const key = asciiKey(raw);
  if (key !== raw) {
    warnings.push(`${label}: key "${raw}" has accents; using "${key}".`);
  }
  if (!LUA_IDENT_RE.test(key)) {
    throw new Error(`${label}: key "${raw}" is not a valid Lua identifier.`);
  }
  return key;
}

/**
 * @param {string} raw `a|b` or `a, b`
 * @param {string} label
 * @param {Set<string>} conditionIds conditions that can apply from a location
 * @param {string[]} warnings
 * @returns {string[]}
 */
function parseConditions(raw, label, conditionIds, warnings) {
  const ids = raw.split(/[|,\s]+/).filter(Boolean);
  const known = ids.filter((id) => conditionIds.has(id));
  const unknown = ids.filter((id) => !conditionIds.has(id));
  if (unknown.length > 0) {
    warnings.push(`${label}: skipped condition(s) not implemented as manual conditions: ${unknown.join(", ")}.`);
  }
  return known;
}

/** "the Annex" → "The Annex" (the sheet lowercases a leading article). */
const titleCase = (name) => name.charAt(0).toUpperCase() + name.slice(1);

/**
 * @param {string[][]} rows DISTRICTS tab
 * @param {{ conditionIds: Set<string> }} catalogs
 * @returns {{ districts: { key: string, name: string, conditions: string[] }[], warnings: string[] }}
 */
function parseDistrictRows(rows, { conditionIds }) {
  const section = "Export Range for Toronto Rising API .csv Files";
  const keyCol = findColumn(rows, { header: "key", section });
  const nameCol = findColumn(rows, { header: "NAME", section });
  const conditionCol = findColumn(rows, { header: "Condition", headerRow: 0 });
  /** @type {string[]} */
  const warnings = [];
  const districts = [];
  const seen = new Set();
  for (const row of rows.slice(2)) {
    const rawKey = cell(row[keyCol]);
    if (rawKey === "") continue;
    const label = `DISTRICTS ${rawKey}`;
    const key = parseKey(rawKey, label, warnings);
    if (seen.has(key)) throw new Error(`${label}: duplicate key.`);
    seen.add(key);
    const name = titleCase(cell(row[nameCol]));
    if (name === "") throw new Error(`${label}: missing NAME.`);
    districts.push({ key, name, conditions: parseConditions(cell(row[conditionCol]), label, conditionIds, warnings) });
  }
  if (districts.length === 0) throw new Error("DISTRICTS tab: no district rows.");
  districts.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { districts, warnings };
}

/**
 * One SITES "Parsing for TTS Output" cell → captured value, `null` when blank.
 * @param {string} raw
 * @param {RegExp} re
 * @param {string} label
 * @param {boolean} required
 * @returns {string|null}
 */
function fragment(raw, re, label, required) {
  const text = cell(raw);
  if (text === "") {
    if (required) throw new Error(`${label}: missing value.`);
    return null;
  }
  const m = re.exec(text);
  if (!m) throw new Error(`${label}: unexpected cell ${JSON.stringify(text)}.`);
  return m[1];
}

/**
 * @typedef {{
 *   key: string, name: string, skybox: string|null, districtKey: string|null,
 *   backgroundMusic: string|null, locationTrack: string, isIndoors: boolean,
 *   weatherDucking: number, isTopFogActive: boolean, offsetXY: string|null, conditions: string[],
 * }} SheetSite
 */

/**
 * @param {string[][]} rows SITES tab
 * @param {{ districtKeys: Set<string>, skyboxKeys: Set<string>, musicKeys: Set<string>, trackKeys: Set<string>, conditionIds: Set<string> }} catalogs
 * @returns {{ sites: SheetSite[], warnings: string[] }}
 */
function parseSiteRows(rows, catalogs) {
  const tts = "Parsing for TTS Output";
  const col = {
    key: findColumn(rows, { header: "Key", section: "Data Processing for CSV Export" }),
    condition: findColumn(rows, { header: "Condition", section: "Conditions" }),
    name: findColumn(rows, { header: "name", section: tts }),
    skybox: findColumn(rows, { header: "Skybox", section: tts }),
    district: findColumn(rows, { header: "district", section: tts }),
    music: findColumn(rows, { header: "soundscape music", section: tts }),
    location: findColumn(rows, { header: "soundscape location", section: tts }),
    isIndoors: findColumn(rows, { header: "is indoors", section: tts }),
    ducking: findColumn(rows, { header: "Weather Ducking", section: tts }),
    topFog: findColumn(rows, { header: "Top Fog", section: tts }),
    offsetXY: findColumn(rows, { header: "map location", section: tts }),
  };
  /** @type {string[]} */
  const warnings = [];
  const trackAliasUse = new Map();
  const musicGapUse = new Map();
  /** @type {SheetSite[]} */
  const sites = [];
  const seen = new Set();
  for (const row of rows.slice(2)) {
    const rawKey = cell(row[col.key]);
    if (rawKey === "") continue;
    const label = `SITES ${rawKey}`;
    const key = parseKey(rawKey, label, warnings);
    if (seen.has(key)) throw new Error(`${label}: duplicate key.`);
    seen.add(key);
    const f = (name, re, required) => fragment(row[col[name]], re, `${label} ${name}`, required);

    const name = f("name", /^name = "(.+)",$/, true);
    const skybox = f("skybox", /^skybox = "([^"]+)",$/, false);
    if (skybox !== null && !catalogs.skyboxKeys.has(skybox)) {
      throw new Error(`${label}: skybox "${skybox}" is not in lib/skyboxes_catalog.ttslua (run npm run skyboxes:import?).`);
    }
    const districtKey = f("district", /^district = C\.Districts\.(\w+),$/, false);
    if (districtKey !== null && !catalogs.districtKeys.has(districtKey)) {
      throw new Error(`${label}: district "${districtKey}" is not a DISTRICTS key.`);
    }

    let backgroundMusic = f("music", /^backgroundMusic = \{\s*playlist = "([^"]+)"\s*\},?$/, false);
    if (backgroundMusic !== null && backgroundMusic !== "none" && !catalogs.musicKeys.has(backgroundMusic)) {
      if (!Object.prototype.hasOwnProperty.call(MUSIC_GAPS, backgroundMusic)) {
        throw new Error(`${label}: background music "${backgroundMusic}" is not a Catalog.PLAYLISTS.backgroundMusic key.`);
      }
      musicGapUse.set(backgroundMusic, [...(musicGapUse.get(backgroundMusic) || []), key]);
      backgroundMusic = MUSIC_GAPS[backgroundMusic];
    }

    let locationTrack = f("location", /^location = \{\s*playlist = "location", track = "([^"]+)"\s*\}/, true);
    if (!catalogs.trackKeys.has(locationTrack)) {
      const alias = TRACK_ALIASES[locationTrack];
      if (alias === undefined || !catalogs.trackKeys.has(alias)) {
        throw new Error(`${label}: location track "${locationTrack}" is not a location track in lib/soundscape_catalog.ttslua.`);
      }
      trackAliasUse.set(locationTrack, [...(trackAliasUse.get(locationTrack) || []), key]);
      locationTrack = alias;
    }

    const isIndoors = f("isIndoors", /^isIndoors = (true|false),$/, true) === "true";
    const weatherDucking = Number(f("ducking", /^weatherDucking = ([\d.]+),$/, true));
    if (!(weatherDucking >= 0 && weatherDucking <= 1)) {
      throw new Error(`${label}: weatherDucking must be between 0 and 1.`);
    }
    const isTopFogActive = f("topFog", /^(?:topFog|isTopFogActive) = (true|false),$/, true) === "true";
    const offsetRaw = f("offsetXY", /^offsetXY = "([^"]+)",?$/, false);
    const offsetXY = offsetRaw === null ? null : offsetRaw.replace(/\u2212/g, "-");
    if (offsetXY !== null && !/^-?\d+(\.\d+)? -?\d+(\.\d+)?$/.test(offsetXY)) {
      throw new Error(`${label}: offsetXY "${offsetXY}" is not "<x> <y>".`);
    }
    const conditions = parseConditions(cell(row[col.condition]), label, catalogs.conditionIds, warnings);

    sites.push({ key, name, skybox, districtKey, backgroundMusic, locationTrack, isIndoors, weatherDucking, isTopFogActive, offsetXY, conditions });
  }
  for (const [from, keys] of trackAliasUse) {
    warnings.push(`SITES: location track "${from}" is not in the catalog; using "${TRACK_ALIASES[from]}" for ${keys.join(", ")}. Fix the sheet's (data) track mapping.`);
  }
  for (const [from, keys] of musicGapUse) {
    warnings.push(`SITES: background music "${from}" has no playlist; using the default mood for ${keys.join(", ")}.`);
  }
  if (sites.length === 0) throw new Error("SITES tab: no site rows.");
  sites.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { sites, warnings };
}

/** @param {string} s */
const q = (s) => `"${escapeLuaString(s)}"`;

/** @param {string[]} ids */
const conditionList = (ids) => `{ ${ids.map(q).join(", ")} }`;

/**
 * @param {{ districts: ReturnType<typeof parseDistrictRows>["districts"], sites: SheetSite[] }} data
 * @returns {string}
 */
function renderLocationsCatalogLua({ districts, sites }) {
  const out = [
    "--[[",
    "    Toronto Rising — districts and sites (C.Districts / C.Sites).",
    "    AUTO-GENERATED from the Districts & Sites of Toronto Rising Google Sheet (DISTRICTS + SITES tabs) — DO NOT EDIT BY HAND.",
    "    Regenerate: npm run locations:import",
    "    Field reference: `-- #region Sites` in lib/constants.ttslua.",
    "]]",
    "",
    "local LocationsCatalog = {}",
    "",
    "local Districts = {",
  ];
  for (const d of districts) {
    out.push(`  ${d.key} = {`, `    name = ${q(d.name)},`);
    if (d.conditions.length > 0) out.push(`    conditions = ${conditionList(d.conditions)},`);
    out.push("  },");
  }
  out.push("}", "", "LocationsCatalog.Districts = Districts", "", "LocationsCatalog.Sites = {");
  for (const s of sites) {
    out.push(`  ${s.key} = {`, `    name = ${q(s.name)},`);
    if (s.skybox !== null) out.push(`    skybox = ${q(s.skybox)},`);
    if (s.districtKey !== null) out.push(`    district = Districts.${s.districtKey},`);
    out.push("    soundscape = {");
    if (s.backgroundMusic !== null) out.push(`      backgroundMusic = { playlist = ${q(s.backgroundMusic)} },`);
    out.push(`      location = { playlist = "location", track = ${q(s.locationTrack)} },`, "    },");
    out.push(`    isIndoors = ${s.isIndoors},`, `    weatherDucking = ${s.weatherDucking},`, `    isTopFogActive = ${s.isTopFogActive},`);
    if (s.offsetXY !== null) out.push(`    offsetXY = ${q(s.offsetXY)},`);
    if (s.conditions.length > 0) out.push(`    conditions = ${conditionList(s.conditions)},`);
    out.push("  },");
  }
  out.push("}", "", "return LocationsCatalog", "");
  return out.join("\n");
}

module.exports = {
  TRACK_ALIASES,
  MUSIC_GAPS,
  findColumn,
  parseDistrictRows,
  parseSiteRows,
  renderLocationsCatalogLua,
};
