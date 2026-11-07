"use strict";
const { dataOf, bool } = require("./sheet_exports.js");
const { resolveLocationTrack } = require("./locations_track_aliases.js");
const { getSoundscapeLabelMap } = require("./locations_soundscape_map.js");

// Export cells contain values, never snippets of Lua. Catalog membership is
// checked before rendering; conditions which lack a runtime implementation are
// reported explicitly, as in the original location importer.
function locations(snapshot, catalogs) {
  const warnings = [];
  const labelMap = catalogs.labelMap instanceof Map ? catalogs.labelMap : getSoundscapeLabelMap();
  const conditions = (row) => (row.Conditions || "").split(/[|,\s]+/).filter(Boolean).filter(id => {
    if (catalogs.conditionIds.has(id)) return true;
    warnings.push(`${row.Key}: condition ${id} has no manual runtime implementation; omitted`);
    return false;
  });
  const districts = dataOf(snapshot, "LOCATIONS_DISTRICTS").map(row => ({ key: row.Key, name: row.Name.charAt(0).toUpperCase() + row.Name.slice(1), conditions: conditions(row) }));
  const sites = dataOf(snapshot, "LOCATIONS_SITES").map(row => {
    const music = row["Sound - Music"];
    const locationTrack = resolveLocationTrack(row["Sound - Location"], catalogs.trackKeys, warnings, row.Key, labelMap);
    if (music && music !== "none" && !catalogs.musicKeys.has(music)) throw new Error(`${row.Key}: unknown music ${music}`);
    const offsetXY = row["Map Offset XY"] || null;
    if (offsetXY && !/^-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?$/.test(offsetXY)) throw new Error(`${row.Key}: invalid map offset ${offsetXY}`);
    return { key: row.Key, name: row.Name, skybox: row["Skybox Key"] || null, districtKey: row.District || null, backgroundMusic: music || null, locationTrack, isIndoors: !bool(row["Is Outdoors"], row.Key), weatherDucking: Number(row["Weather Ducking"]), isTopFogActive: bool(row["Top Fog"], row.Key), isSilent: bool(row["Is Silent?"], row.Key), offsetXY, conditions: conditions(row) };
  });
  const order = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  return { districts: districts.sort(order), sites: sites.sort(order), warnings };
}
module.exports = { locations };
