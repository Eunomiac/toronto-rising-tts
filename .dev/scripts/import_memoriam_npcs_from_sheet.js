"use strict";
const { loadSnapshot, memoriamFigures, contract, writeAtomic } = require("./lib/sheet_exports.js");
const { renderMemoriamNpcCatalogJson, renderMemoriamNpcCatalogLua } = require("./lib/memoriam_npcs_sheet_csv.js");
const path = require("node:path");
async function importMemoriamNpcs(options = {}) {
  const snapshot = options.snapshot || await loadSnapshot();
  const npcs = memoriamFigures(snapshot);
  const outPath = options.outPath || path.resolve(__dirname, "../storyteller-dashboard/data/memoriam-npcs.json");
  const luaPath = options.luaPath || path.resolve(__dirname, "../../lib/memoriam_npc_catalog.ttslua");
  writeAtomic(outPath, renderMemoriamNpcCatalogJson({ npcs, meta: { sheetId: contract.spreadsheetId, rangeName: "EXPORT_CHARACTERS_NAMED + EXPORT_CHARACTERS_GENERIC", tabName: contract.sheetTitle } }));
  writeAtomic(luaPath, renderMemoriamNpcCatalogLua(npcs));
  return { npcCount: npcs.length, outPath, luaPath };
}
module.exports = { importMemoriamNpcs };
if (require.main === module) importMemoriamNpcs().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
