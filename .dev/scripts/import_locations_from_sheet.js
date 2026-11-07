"use strict";

/**
 * EXPORT_LOCATIONS_DISTRICTS + EXPORT_LOCATIONS_SITES → lib/locations_catalog.ttslua (C.Districts / C.Sites).
 *
 * Run from repo root: node .dev/scripts/import_locations_from_sheet.js
 * Prefer: npm run locations:import (also regenerates the Scenes location modals, dashboard catalogs and Global XmlUI)
 * Replay a validated snapshot with TR_EXPORT_SNAPSHOT=<path>.
 */

const fs = require("fs");
const path = require("path");
const { writeAtomic } = require("./lib/google_sheet_fetch.js");
const { readLuaTable } = require("./lib/lua_table_reader.js");
const { renderLocationsCatalogLua } = require("./lib/locations_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "locations_catalog.ttslua");
function loadCatalogs() {
  const lib = (file) => path.join(root, "lib", file);
  const tracks = readLuaTable(lib("soundscape_catalog.ttslua"), "Catalog.TRACKS");
  const playlists = readLuaTable(lib("soundscape_catalog.ttslua"), "Catalog.PLAYLISTS");
  const defs = readLuaTable(lib("condition_defs.ttslua"), "CD.Defs");
  const { getSoundscapeLabelMap } = require("./lib/locations_soundscape_map.js");
  return {
    skyboxKeys: new Set(Object.keys(readLuaTable(lib("skyboxes_catalog.ttslua"), "SkyboxesCatalog.Skyboxes"))),
    musicKeys: new Set(Object.keys(playlists.backgroundMusic)),
    trackKeys: new Set(Object.values(tracks).filter((t) => t.type === "location").map((t) => t.key)),
    conditionIds: new Set(
      Object.entries(defs)
        .filter(([, d]) => d.canApplyManually === true)
        .map(([k, d]) => (typeof d.id === "string" ? d.id : k)),
    ),
    labelMap: getSoundscapeLabelMap(),
  };
}

async function main() {
  const { loadSnapshot } = require("./lib/sheet_exports.js");
  const { locations } = require("./lib/export_locations.js");
  const { districts, sites, warnings } = locations(await loadSnapshot(), loadCatalogs());
  for (const warning of warnings) console.warn(`[locations:import] ${warning}`);

  writeAtomic(outPath, renderLocationsCatalogLua({ districts, sites }));
  console.log(`[locations:import] Wrote ${path.relative(root, outPath)} (${districts.length} districts, ${sites.length} sites)`);
}

main().catch((err) => {
  console.error(`[locations:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
