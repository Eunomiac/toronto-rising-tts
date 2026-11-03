"use strict";
const { loadSnapshot, genericFigures, contract, writeAtomic } = require("./lib/sheet_exports.js");
const { renderGenericNpcCatalogJson } = require("./lib/generic_npcs_sheet_csv.js");
const path = require("node:path");
async function importGenericNpcs(options = {}) {
  const snapshot = options.snapshot || await loadSnapshot();
  const npcs = genericFigures(snapshot);
  const outPath = options.outPath || path.resolve(__dirname, "../storyteller-dashboard/data/generic-npcs.json");
  writeAtomic(outPath, renderGenericNpcCatalogJson({ npcs, meta: { sheetId: contract.spreadsheetId, rangeName: "EXPORT_CHARACTERS_GENERIC", tabName: contract.sheetTitle } }));
  return { npcCount: npcs.length, outPath };
}
module.exports = { importGenericNpcs };
if (require.main === module) importGenericNpcs().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
