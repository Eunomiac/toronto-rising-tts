"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { root, rowsOf, dataOf, csvOf, uniqueCharacters, genericFigures, compulsions } = require("./sheet_exports.js");
const { readLuaTable } = require("./lua_table_reader.js");
const { loadWeatherValidationSets, parseWeatherSheetRows } = require("./weather_sheet_csv.js");
const { parseSkyboxCatalogRows, parseMemoriamSkyboxRows } = require("./skyboxes_sheet_csv.js");
const { locations } = require("./export_locations.js");

// Complete domain preflight, shared by FULL, manual importers and Dashboard.
// This runs before any derived file is replaced, including the snapshot cache.
function validateExportData(snapshot) {
  const lib = file => path.join(root, "lib", file);
  const { parseStatRecord, blank } = require("../../storyteller-dashboard/scripts/npc-stats/sheet.ts");
  let namedStats = 0;
  for (const row of dataOf(snapshot, "CHARACTERS_UNIQUE")) {
    if (row.Type === "PC" || !["Difficulty", "Health", "Willpower", "Phy", "Soc", "Men", "Pow", "Exceptional Pools", "Attacks", "Powers"].some(h => !blank(row[h]))) continue;
    parseStatRecord({ ...row, Tags: row["Stat Tags"] || row.Tags }, row["API Key"], true);
    namedStats++;
  }
  const profilePairs = new Set(), legacyBlocks = new Map();
  for (const row of dataOf(snapshot, "CHARACTERS_GENERIC")) {
    const block = parseStatRecord(row, row["Stat Key"], false);
    profilePairs.add(`${row["Stat Profile"]}/${row.Tier}`);
    const legacy = row["Source Group"] === "Memoriam" ? row["API Key"].replace(/_\d{2}$/, "") : row.Label;
    const key = `${legacy}/${row.Tier}`, text = JSON.stringify(block);
    if (legacyBlocks.has(key) && legacyBlocks.get(key) !== text) throw new Error(`${key}: conflicting stats for an existing dashboard stat key`);
    legacyBlocks.set(key, text);
  }
  const weather = parseWeatherSheetRows(rowsOf(snapshot, "WEATHER"), loadWeatherValidationSets(fs.readFileSync(lib("constants.ttslua"), "utf8")));
  const monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  weather.forEach((month, i) => { if (month.days.length !== monthDays[i]) throw new Error(`EXPORT_WEATHER month ${i + 1}: expected ${monthDays[i]} days`); });
  const { parseCards } = require("../import_complications_from_sheet.js");
  const cards = parseCards(rowsOf(snapshot, "COMPLICATIONS"));
  if (cards.length !== rowsOf(snapshot, "COMPLICATIONS").length - 1) throw new Error("EXPORT_COMPLICATIONS includes an incomplete card");
  const skyboxes = parseSkyboxCatalogRows(csvOf(snapshot, "SKYBOXES"));
  const memoriam = parseMemoriamSkyboxRows(csvOf(snapshot, "MEMORIAM"));
  const tracks = readLuaTable(lib("soundscape_catalog.ttslua"), "Catalog.TRACKS");
  const playlists = readLuaTable(lib("soundscape_catalog.ttslua"), "Catalog.PLAYLISTS");
  const defs = readLuaTable(lib("condition_defs.ttslua"), "CD.Defs");
  const result = locations(snapshot, {
    trackKeys: new Set(Object.values(tracks).filter(t => t.type === "location").map(t => t.key)),
    musicKeys: new Set(Object.keys(playlists.backgroundMusic)),
    conditionIds: new Set(Object.entries(defs).filter(([, d]) => d.canApplyManually === true).map(([k, d]) => typeof d.id === "string" ? d.id : k)),
  });
  snapshot.warnings = [...new Set([...snapshot.warnings, ...result.warnings])];
  return { unique: Object.keys(uniqueCharacters(snapshot)).length, genericFigures: genericFigures(snapshot).length, namedStats, profileTiers: profilePairs.size, weatherHours: weather.reduce((n, m) => n + m.days.length * 24, 0), districts: result.districts.length, sites: result.sites.length, skyboxes: skyboxes.length, memoriam: Object.keys(memoriam).length, complications: cards.length, compulsions: Object.keys(compulsions(snapshot)).length };
}
module.exports = { validateExportData };
