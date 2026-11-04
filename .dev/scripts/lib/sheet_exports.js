"use strict";

// A build reads all nine header-first ranges once. Never use gviz here: its
// majority-column typing discards mixed numbers, booleans, X, and ~.
const fs = require("node:fs");
const path = require("node:path");
const { parseCsv, escapeLuaString } = require("./skyboxes_sheet_csv.js");
const contract = require("../../Chronicle Data/Spreadsheet Export Contract.json");
const { writeAtomic: replaceAtomic } = require("./google_sheet_fetch.js");
function writeAtomic(file, contents) { fs.mkdirSync(path.dirname(file), { recursive: true }); replaceAtomic(file, contents); }
const root = path.resolve(__dirname, "../../..");
const defaultSnapshotPath = path.join(root, ".dev/storyteller-dashboard/data/sheet-exports.json");
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const list = (text) => String(text || "").split(",").map(s => s.trim()).filter(Boolean);
const memoriamPeriods = row => list(row["Memoriam Periods"]).filter(period => period !== "~");
const portraitOwners = row => list(row["Has Portrait"]).filter(owner => owner !== "~");
const playerKeys = new Set(["lordLucien", "rashid", "aishe", "fomorach", "blackCaesar"]);
const bool = (text, label, blank = false) => {
  if (text === "" && blank) return false;
  if (!/^(TRUE|FALSE)$/i.test(text)) throw new Error(`${label}: expected TRUE or FALSE, got ${JSON.stringify(text)}`);
  return text.toUpperCase() === "TRUE";
};
const rowsOf = (snapshot, name) => snapshot.tables[`EXPORT_${name}`];
const records = (rows) => rows.slice(1).map(row => Object.fromEntries(rows[0].map((key, i) => [key, row[i] || ""])));
const dataOf = (snapshot, name) => records(rowsOf(snapshot, name));
const namedRows = snapshot => dataOf(snapshot, "CHARACTERS_NAMED").filter(row =>
  bool(row["Is PC"], row["API Key"]) || bool(row["In Catalog"], row["API Key"]) || memoriamPeriods(row).length > 0);
const csvOf = (snapshot, name) => rowsOf(snapshot, name).map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");

function parseExport(csv, spec) {
  if (/^\s*(?:<!doctype|<html|\)\]\}')/i.test(csv)) throw new Error(`${spec.name}: received HTML/login instead of CSV`);
  const rows = parseCsv(csv).filter(row => row.some(cell => cell.trim() !== ""));
  if (JSON.stringify(rows[0]) !== JSON.stringify(spec.headers)) throw new Error(`${spec.name}: headers differ from Spreadsheet Export Contract.json`);
  if (rows.length < 2) throw new Error(`${spec.name}: no data rows`);
  for (const [i, row] of rows.entries()) {
    if (row.length !== spec.headers.length) throw new Error(`${spec.name}: row ${i + 1} has ${row.length} fields, expected ${spec.headers.length}`);
    for (const cell of row) if (/^#(?:REF!|N\/A|VALUE!|ERROR!|DIV\/0!|NAME\?|NUM!|SPILL!)/.test(cell.trim())) throw new Error(`${spec.name}: formula error at row ${i + 1}: ${cell}`);
  }
  return rows;
}

function validateSnapshot(snapshot) {
  if (snapshot.version !== 1 || !snapshot.tables) throw new Error("Unsupported spreadsheet snapshot");
  const expected = new Set(contract.exports.map(spec => spec.name));
  for (const name of Object.keys(snapshot.tables)) {
    if (!expected.has(name)) throw new Error(`Unexpected export table ${name}`);
  }
  // Revalidate saved snapshots as strictly as downloads; never trust an old cache.
  for (const spec of contract.exports) {
    const rows = snapshot.tables[spec.name];
    if (!Array.isArray(rows)) throw new Error(`Snapshot missing ${spec.name}`);
    parseExport(rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), spec);
  }
  const named = dataOf(snapshot, "CHARACTERS_NAMED");
  const generic = dataOf(snapshot, "CHARACTERS_GENERIC");
  const all = new Map();
  const addKey = (key, label, value) => {
    if (!identifier.test(key)) throw new Error(`${label}: invalid identifier ${key}`);
    if (all.has(key)) throw new Error(`${label}: duplicate identity ${key}`);
    all.set(key, value);
  };
  for (const row of named) {
    const key = row["API Key"];
    addKey(key, "Named characters", row);
    const isPC = bool(row["Is PC"], key);
    if (isPC && !playerKeys.has(key)) throw new Error(`${key}: unexpected PC key`);
    if (row.Type !== "Named NPC" || !row.Name) throw new Error(`${key}: invalid Type or missing Name`);
    bool(row["In Catalog"], key);
    if (bool(row["Has Figurine"], key) && row["Figurine Filename"] !== `npc_${key}.webp`) {
      throw new Error(`${key}: expected figurine filename npc_${key}.webp`);
    }
  }
  for (const row of named) {
    const key = row["API Key"], parentKey = row["Variant Of"];
    const parent = parentKey ? all.get(parentKey) : null;
    if (parentKey && (!parent || parent["Variant Of"] || !key.startsWith(parentKey + "_") || key.length === parentKey.length + 1 || bool(row["Is PC"], key))) {
      throw new Error(`${key}: variant must be an NPC named ${parentKey}_<distinction> with a non-variant parent`);
    }
    const owners = portraitOwners(row);
    if (owners.some(owner => !playerKeys.has(owner)) || new Set(owners).size !== owners.length) {
      throw new Error(`${key}: invalid or duplicate portrait recipient`);
    }
    if (owners.length && row["Portrait Filename"] !== `npcPortrait_${key}.webp` &&
        !(parent && portraitOwners(parent).length && row["Portrait Filename"] === parent["Portrait Filename"])) {
      throw new Error(`${key}: expected own or inherited portrait filename`);
    }
  }
  const figures = new Map(), pairs = new Set();
  const figureFields = ["Label", "In Catalog", "Years Active", "Locations Active", "Memoriam Periods", "Tags", "Has Figurine", "Figurine Filename"];
  for (const row of generic) {
    const key = row["API Key"], pair = `${key}/${row.Tier}`;
    if (pairs.has(pair)) throw new Error(`Generic characters: duplicate ${pair}`);
    pairs.add(pair);
    bool(row["In Catalog"], pair);
    const tiers = row.Kind === "Vampire" ? ["Average", "Gifted", "Deadly", "Superhuman"] : ["Weak", "Average", "Gifted", "Deadly"];
    if (!tiers.includes(row.Tier) || !row.Label) throw new Error(`${pair}: missing label or unsupported tier`);
    if (!/_\d{2}$/.test(key) || !bool(row["Has Figurine"], pair) || row["Figurine Filename"] !== `npc_${key}.webp`) {
      throw new Error(`${pair}: expected two-digit figure key and figurine filename npc_${key}.webp`);
    }
    const first = figures.get(key);
    if (first && figureFields.some(f => first[f] !== row[f])) throw new Error(`${pair}: inconsistent figure metadata across tiers`);
    if (!first) { addKey(key, "Generic characters", row); figures.set(key, row); }
  }
  for (const name of ["LOCATIONS_DISTRICTS", "LOCATIONS_SITES", "MEMORIAM", "SKYBOXES"]) {
    const seen = new Set();
    for (const row of dataOf(snapshot, name)) {
      if (!identifier.test(row.Key) || seen.has(row.Key)) throw new Error(`${name}: invalid or duplicate Key ${row.Key}`);
      seen.add(row.Key);
    }
  }
  for (const row of dataOf(snapshot, "SKYBOXES")) if (row.Filename !== `skybox_${row.Key}.jpg`) throw new Error(`${row.Key}: Filename must match the keyed cloud job (skybox_${row.Key}.jpg)`);
  const districts = new Set(dataOf(snapshot, "LOCATIONS_DISTRICTS").map(r => r.Key));
  const skyboxes = new Set(dataOf(snapshot, "SKYBOXES").map(r => r.Key));
  for (const row of dataOf(snapshot, "LOCATIONS_SITES")) {
    if (row.District && !districts.has(row.District)) throw new Error(`${row.Key}: unknown District ${row.District}`);
    if (row["Skybox Key"] && !skyboxes.has(row["Skybox Key"])) throw new Error(`${row.Key}: unknown Skybox Key`);
    for (const field of ["Is Outdoors", "Top Fog", "Unique?", "Is Silent?"]) bool(row[field], `${row.Key}/${field}`);
    if (row["Weather Ducking"] === "" || !(Number(row["Weather Ducking"]) >= 0 && Number(row["Weather Ducking"]) <= 1)) throw new Error(`${row.Key}: invalid Weather Ducking`);
  }
  // Applicability can include a source period which has not been approved for export.
  // Retain these assignments and report them; never invent a playable period.
  const periods = new Set(dataOf(snapshot, "MEMORIAM").map(r => r.Key));
  snapshot.warnings = [...new Set([...namedRows(snapshot), ...generic].flatMap(row => memoriamPeriods(row).filter(p => !periods.has(p)).map(p => `${row["API Key"]}: Memoriam period ${p} is not approved/exported; assignment retained`)))];
  compulsions(snapshot);
  return snapshot;
}

function exportUrl(name) {
  return `https://docs.google.com/spreadsheets/d/${contract.spreadsheetId}/export?format=csv&gid=${contract.sheetId}&range=${encodeURIComponent(name)}`;
}
async function fetchSnapshot() {
  const entries = await Promise.all(contract.exports.map(async spec => {
    let csv;
    if (process.env.TR_EXPORT_CSV_DIR) csv = fs.readFileSync(path.join(process.env.TR_EXPORT_CSV_DIR, `${spec.name}.csv`), "utf8");
    else {
      const response = await fetch(exportUrl(spec.name), { cache: "no-store", signal: AbortSignal.timeout(60000), redirect: "follow" });
      if (!response.ok) throw new Error(`${spec.name}: HTTP ${response.status}`);
      csv = await response.text();
    }
    return [spec.name, parseExport(csv, spec)];
  }));
  const snapshot = validateSnapshot({ version: 1, fetchedAt: new Date().toISOString(), spreadsheetId: contract.spreadsheetId, tables: Object.fromEntries(entries) });
  require("./validate_export_data.js").validateExportData(snapshot);
  return snapshot;
}
let pending;
function loadSnapshot() {
  return pending ||= (process.env.TR_EXPORT_SNAPSHOT
    ? Promise.resolve().then(() => validateSnapshot(JSON.parse(fs.readFileSync(process.env.TR_EXPORT_SNAPSHOT, "utf8"))))
    : fetchSnapshot()).then(snapshot => { require("./validate_export_data.js").validateExportData(snapshot); return snapshot; });
}
const q = value => `"${escapeLuaString(String(value))}"`;
function uniqueCharacters(snapshot) {
  const out = {};
  for (const row of namedRows(snapshot)) {
    const key = row["API Key"];
    out[key] = {
      name: key, fullName: row.Name, isPC: bool(row["Is PC"], key), catalog: bool(row["In Catalog"], key),
      werewolf: row.Kind === "Werewolf", filename: bool(row["Has Figurine"], key) ? row["Figurine Filename"] : "",
      portraitAsset: portraitOwners(row).length ? row["Portrait Filename"].replace(/\.webp$/, "") : "",
      variantOfUnique: row["Variant Of"],
    };
  }
  return out;
}
function renderUniqueLua(snapshot) {
  const lines = ["-- Generated by npm run characters:import from EXPORT_CHARACTERS_NAMED. DO NOT EDIT.", "local Characters = {"];
  for (const [key, value] of Object.entries(uniqueCharacters(snapshot)).sort(([a], [b]) => a.localeCompare(b))) lines.push(`  ${key} = { ${Object.entries(value).map(([k, v]) => `${k} = ${typeof v === "boolean" ? v : q(v)}`).join(", ")} },`);
  return lines.concat("}", "return Characters", "").join("\n");
}
function genericFigures(snapshot) {
  const figures = new Map();
  for (const row of dataOf(snapshot, "CHARACTERS_GENERIC")) {
    const key = row["API Key"];
    if (!figures.has(key)) figures.set(key, {
      key, label: row.Label, tags: row.Tags, filename: row["Figurine Filename"], catalog: bool(row["In Catalog"], key),
      location: row["Locations Active"], year: row["Years Active"], periods: memoriamPeriods(row), tiers: [],
    });
    figures.get(key).tiers.push(row.Tier.toLowerCase());
  }
  return [...figures.values()];
}
function renderGenericLua(snapshot) {
  const lines = ["-- Generated by npm run characters:import from EXPORT_CHARACTERS_GENERIC. DO NOT EDIT.", "local Generics = {"];
  for (const row of genericFigures(snapshot).sort((a,b) => a.key.localeCompare(b.key))) lines.push(`  ${row.key} = { label = ${q(row.label)}, filename = ${q(row.filename)}, catalog = ${row.catalog} },`);
  return lines.concat("}", "return Generics", "").join("\n");
}
function memoriamFigures(snapshot) {
  const named = namedRows(snapshot).filter(row => !bool(row["Is PC"], row["API Key"]) && memoriamPeriods(row).length).map(row => ({
    filename: bool(row["Has Figurine"], row["API Key"]) ? row["Figurine Filename"] : "",
    key: row["API Key"], label: row.Name, location: row["Locations Active"], year: row["Years Active"],
    variantOfUnique: row["Variant Of"], isGeneric: false, periods: memoriamPeriods(row), catalog: bool(row["In Catalog"], row["API Key"]),
  }));
  const generic = genericFigures(snapshot).filter(row => row.periods.length).map(row => ({
    filename: row.filename, key: row.key, label: row.label, location: row.location, year: row.year,
    variantOfUnique: "", isGeneric: true, tags: row.tags, periods: row.periods, catalog: row.catalog,
  }));
  return [...named, ...generic];
}
function compulsions(snapshot) {
  const out = {}, clans = new Set();
  for (const row of dataOf(snapshot, "COMPULSIONS")) {
    const key = row["Compulsion Key"], card = Number(row.Card);
    if (!identifier.test(key) || !row.Name || !Number.isInteger(card) || card < 1 || card > 4) throw new Error(`Invalid Compulsion ${key}/${row.Card}`);
    const influence = { title: row["Influence Title"], description: row["Influence Description"] };
    if (!out[key]) {
      if (row.Clan && clans.has(row.Clan)) throw new Error(`Duplicate Compulsion clan ${row.Clan}`);
      if (row.Clan) clans.add(row.Clan);
      out[key] = { ...(row.Clan ? { clan: row.Clan } : {}), influence, variants: [] };
    }
    if ((out[key].clan || "") !== row.Clan || JSON.stringify(out[key].influence) !== JSON.stringify(influence)) throw new Error(`${key}: inconsistent Compulsion shared fields`);
    if (out[key].variants.some(v => v.card === card)) throw new Error(`${key}: duplicate card ${card}`);
    for (const field of ["Influence Title", "Influence Description", "Burden Title", "Burden Flavor", "Burden Description", "Catharsis Title", "Catharsis Description"]) if (!row[field]) throw new Error(`${key}/${card}: missing ${field}`);
    out[key].variants.push({ card, burden: { title: row["Burden Title"], flavor: row["Burden Flavor"], description: row["Burden Description"] }, catharsis: { title: row["Catharsis Title"], description: row["Catharsis Description"] } });
  }
  for (const [key, value] of Object.entries(out)) { if (value.variants.length !== 4) throw new Error(`${key}: needs cards 1–4`); value.variants.sort((a,b) => a.card-b.card); }
  return out;
}
module.exports = { contract, root, defaultSnapshotPath, list, bool, namedRows, portraitOwners, rowsOf, dataOf, csvOf, parseExport, validateSnapshot, fetchSnapshot, loadSnapshot, exportUrl, uniqueCharacters, renderUniqueLua, renderGenericLua, genericFigures, memoriamFigures, compulsions, writeAtomic };
