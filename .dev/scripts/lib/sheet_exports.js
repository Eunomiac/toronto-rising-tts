"use strict";

// A build reads all nine header-first ranges once. Never use gviz here: its
// majority-column typing discards mixed numbers, booleans, X, and ~.
const fs = require("node:fs");
const path = require("node:path");
const { parseCsv, escapeLuaString } = require("./skyboxes_sheet_csv.js");
const contract = require("../../Chronicle Data/Spreadsheet Export Contract.json");
const { writeAtomic } = require("./google_sheet_fetch.js");
const root = path.resolve(__dirname, "../../..");
const defaultSnapshotPath = path.join(root, ".dev/storyteller-dashboard/data/sheet-exports.json");
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const list = (text) => String(text || "").split(",").map(s => s.trim()).filter(Boolean);
const bool = (text, label, blank = false) => {
  if (text === "" && blank) return false;
  if (!/^(TRUE|FALSE)$/i.test(text)) throw new Error(`${label}: expected TRUE or FALSE, got ${JSON.stringify(text)}`);
  return text.toUpperCase() === "TRUE";
};
const rowsOf = (snapshot, name) => snapshot.tables[`EXPORT_${name}`];
const records = (rows) => rows.slice(1).map(row => Object.fromEntries(rows[0].map((key, i) => [key, row[i] || ""])));
const dataOf = (snapshot, name) => records(rowsOf(snapshot, name));
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
  // Revalidate saved snapshots as strictly as downloads; never trust an old cache.
  for (const spec of contract.exports) {
    const rows = snapshot.tables[spec.name];
    if (!Array.isArray(rows)) throw new Error(`Snapshot missing ${spec.name}`);
    parseExport(rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), spec);
  }
  const unique = dataOf(snapshot, "CHARACTERS_UNIQUE");
  const generic = dataOf(snapshot, "CHARACTERS_GENERIC");
  const all = new Map();
  const addKey = (key, label, value) => {
    if (!identifier.test(key)) throw new Error(`${label}: invalid identifier ${key}`);
    if (all.has(key)) throw new Error(`${label}: duplicate identity ${key}`);
    all.set(key, value);
  };
  for (const row of unique) {
    addKey(row["API Key"], "Unique characters", row);
    if (!["PC", "Named NPC"].includes(row.Type)) throw new Error(`${row["API Key"]}: invalid Type ${row.Type}`);
    bool(row["Catalog?"], row["API Key"], true);
    if (!row.Name || !/^npc_[\w-]+\.webp$/.test(row.Filename)) throw new Error(`${row["API Key"]}: missing Name or invalid figurine filename`);
  }
  for (const row of unique) for (const alias of list(row["Legacy API Keys"])) addKey(alias, "Legacy API Keys", row);
  for (const row of unique) {
    const seen = new Set([row["API Key"]]);
    let next = row["Variant Of"];
    while (next) {
      if (seen.has(next)) throw new Error(`${row["API Key"]}: variant cycle at ${next}`);
      seen.add(next);
      const target = all.get(next);
      if (!target) throw new Error(`${row["API Key"]}: unknown Variant Of ${next}`);
      next = target["Variant Of"];
    }
  }
  const figures = new Map(), profiles = new Map(), pairs = new Set();
  const figureFields = ["Label", "Stat Profile", "Catalog?", "Locations", "Time Periods", "Memoriam Periods", "Tags", "Filename", "Figurine Filename", "Source Group"];
  for (const row of generic) {
    const key = row["API Key"], pair = `${key}/${row.Tier}`;
    if (pairs.has(pair)) throw new Error(`Generic characters: duplicate ${pair}`);
    pairs.add(pair);
    bool(row["Catalog?"], pair, true);
    const tiers = row.Kind === "Vampire" ? ["Average", "Gifted", "Deadly", "Superhuman"] : ["Weak", "Average", "Gifted", "Deadly"];
    if (!tiers.includes(row.Tier) || !row["Stat Profile"] || !row["Stat Key"] || !row.Label) throw new Error(`${pair}: missing profile/stat key/label or unsupported tier`);
    if (!/^npc_[\w-]+\.webp$/.test(row["Figurine Filename"])) throw new Error(`${pair}: invalid Figurine Filename`);
    const first = figures.get(key);
    if (first && figureFields.some(f => first[f] !== row[f])) throw new Error(`${pair}: inconsistent figure metadata across tiers`);
    if (!first) { addKey(key, "Generic characters", row); figures.set(key, row); }
    const profileKey = `${row["Stat Profile"]}/${row.Tier}`;
    const block = Object.fromEntries(Object.entries(row).filter(([field]) => !["API Key", ...figureFields, "Authoring Tab", "Authoring Key"].includes(field)));
    if (profiles.has(profileKey) && JSON.stringify(profiles.get(profileKey)) !== JSON.stringify(block)) throw new Error(`${profileKey}: conflicting shared profile rows`);
    profiles.set(profileKey, block);
  }
  for (const name of ["LOCATIONS_DISTRICTS", "LOCATIONS_SITES", "MEMORIAM", "SKYBOXES"]) {
    const seen = new Set();
    for (const row of dataOf(snapshot, name)) {
      if (!identifier.test(row.Key) || seen.has(row.Key)) throw new Error(`${name}: invalid or duplicate Key ${row.Key}`);
      seen.add(row.Key);
    }
  }
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
  snapshot.warnings = [...new Set([...unique, ...generic].flatMap(row => list(row["Memoriam Periods"]).filter(p => !periods.has(p)).map(p => `${row["API Key"]}: Memoriam period ${p} is not approved/exported; assignment retained`)))];
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
      const response = await fetch(exportUrl(spec.name), { signal: AbortSignal.timeout(60000), redirect: "follow" });
      if (!response.ok) throw new Error(`${spec.name}: HTTP ${response.status}`);
      csv = await response.text();
    }
    return [spec.name, parseExport(csv, spec)];
  }));
  return validateSnapshot({ version: 1, fetchedAt: new Date().toISOString(), spreadsheetId: contract.spreadsheetId, tables: Object.fromEntries(entries) });
}
let pending;
function loadSnapshot() {
  return pending ||= (process.env.TR_EXPORT_SNAPSHOT
    ? Promise.resolve().then(() => validateSnapshot(JSON.parse(fs.readFileSync(process.env.TR_EXPORT_SNAPSHOT, "utf8"))))
    : fetchSnapshot());
}
const q = value => `"${escapeLuaString(String(value))}"`;
function uniqueCharacters(snapshot) {
  const out = {};
  for (const row of dataOf(snapshot, "CHARACTERS_UNIQUE")) {
    const key = row["API Key"];
    const def = { name: key, fullName: row.Name, isPC: row.Type === "PC", catalog: bool(row["Catalog?"], key, true), werewolf: row.Kind === "Werewolf", filename: row.Filename, portraitAsset: row["Portrait Asset"], variantOfUnique: row["Variant Of"] };
    out[key] = def;
    for (const alias of list(row["Legacy API Keys"])) out[alias] = { ...def, name: alias, canonicalKey: key, catalog: false };
  }
  return out;
}
function renderUniqueLua(snapshot) {
  const lines = ["-- Generated by npm run characters:import from EXPORT_CHARACTERS_UNIQUE. DO NOT EDIT.", "local Characters = {"];
  for (const [key, value] of Object.entries(uniqueCharacters(snapshot)).sort(([a], [b]) => a.localeCompare(b))) lines.push(`  ${key} = { ${Object.entries(value).map(([k, v]) => `${k} = ${typeof v === "boolean" ? v : q(v)}`).join(", ")} },`);
  return lines.concat("}", "return Characters", "").join("\n");
}
function genericFigures(snapshot) {
  const figures = new Map();
  for (const row of dataOf(snapshot, "CHARACTERS_GENERIC")) {
    const key = row["API Key"];
    if (!figures.has(key)) figures.set(key, { key, label: row.Label, tags: row.Tags, filename: row["Figurine Filename"], catalog: bool(row["Catalog?"], key, true), statProfile: row["Stat Profile"], location: row.Locations, year: row["Time Periods"], periods: list(row["Memoriam Periods"]), sourceGroup: row["Source Group"], tiers: [] });
    figures.get(key).tiers.push(row.Tier.toLowerCase());
  }
  return [...figures.values()];
}
function memoriamFigures(snapshot) {
  return [...dataOf(snapshot, "CHARACTERS_UNIQUE").filter(r => r["Memoriam Periods"]).map(r => ({ filename: r.Filename, key: r["API Key"], label: r.Name, location: r.Locations, year: r["Time Periods"], variantOfUnique: r["Variant Of"], isGeneric: false, tags: r.Tags, periods: list(r["Memoriam Periods"]), catalog: bool(r["Catalog?"], r["API Key"], true) })), ...genericFigures(snapshot).filter(r => r.periods.length).map(r => ({ ...r, variantOfUnique: "", isGeneric: true }))];
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
module.exports = { contract, root, defaultSnapshotPath, list, bool, rowsOf, dataOf, csvOf, parseExport, validateSnapshot, fetchSnapshot, loadSnapshot, exportUrl, uniqueCharacters, renderUniqueLua, genericFigures, memoriamFigures, compulsions, writeAtomic };
