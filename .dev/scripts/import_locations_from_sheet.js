"use strict";

/**
 * Districts & Sites workbook (DISTRICTS + SITES tabs) → lib/locations_catalog.ttslua (C.Districts / C.Sites).
 *
 * Run from repo root: node .dev/scripts/import_locations_from_sheet.js
 * Prefer: npm run locations:import (also regenerates the Scenes location modals, dashboard catalogs and Global XmlUI)
 * Offline: --sites-csv <file> --districts-csv <file> (whole-tab CSV exports)
 */

const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./lib/skyboxes_sheet_csv.js");
const { SHEET_IDS, fetchTabCsv, writeAtomic } = require("./lib/google_sheet_fetch.js");
const { readLuaTable } = require("./lib/lua_table_reader.js");
const { parseDistrictRows, parseSiteRows, renderLocationsCatalogLua } = require("./lib/locations_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "locations_catalog.ttslua");
const USER_AGENT = "toronto-rising-tts-locations-import/1.0";

/** @param {string[]} argv @returns {{ sitesCsv: string|null, districtsCsv: string|null }} */
function parseArgs(argv) {
  const opts = { sitesCsv: null, districtsCsv: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--sites-csv" && argv[i + 1]) opts.sitesCsv = argv[++i];
    else if (argv[i] === "--districts-csv" && argv[i + 1]) opts.districtsCsv = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return opts;
}

/** @param {string|null} file @param {string} tab @returns {Promise<string>} */
async function loadTab(file, tab) {
  if (file !== null) return fs.readFileSync(file, "utf8");
  console.log(`[locations:import] Fetching Districts & Sites › ${tab} …`);
  return fetchTabCsv(SHEET_IDS.districtsAndSites, tab, USER_AGENT);
}

function loadCatalogs() {
  const lib = (file) => path.join(root, "lib", file);
  const tracks = readLuaTable(lib("soundscape_catalog.ttslua"), "Catalog.TRACKS");
  const playlists = readLuaTable(lib("soundscape_catalog.ttslua"), "Catalog.PLAYLISTS");
  const defs = readLuaTable(lib("condition_defs.ttslua"), "CD.Defs");
  return {
    skyboxKeys: new Set(Object.keys(readLuaTable(lib("skyboxes_catalog.ttslua"), "SkyboxesCatalog.Skyboxes"))),
    musicKeys: new Set(Object.keys(playlists.backgroundMusic)),
    trackKeys: new Set(Object.values(tracks).filter((t) => t.type === "location").map((t) => t.key)),
    conditionIds: new Set(
      Object.entries(defs)
        .filter(([, d]) => d.canApplyManually === true)
        .map(([k, d]) => (typeof d.id === "string" ? d.id : k)),
    ),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const catalogs = loadCatalogs();
  const districtRows = parseCsv(await loadTab(opts.districtsCsv, "DISTRICTS"));
  const siteRows = parseCsv(await loadTab(opts.sitesCsv, "SITES"));

  const { districts, warnings: districtWarnings } = parseDistrictRows(districtRows, catalogs);
  const { sites, warnings: siteWarnings } = parseSiteRows(siteRows, {
    ...catalogs,
    districtKeys: new Set(districts.map((d) => d.key)),
  });
  for (const w of [...districtWarnings, ...siteWarnings]) {
    console.warn(`[locations:import] WARN ${w}`);
  }

  writeAtomic(outPath, renderLocationsCatalogLua({ districts, sites }));
  console.log(`[locations:import] Wrote ${path.relative(root, outPath)} (${districts.length} districts, ${sites.length} sites)`);
}

main().catch((err) => {
  console.error(`[locations:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
