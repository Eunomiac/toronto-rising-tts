"use strict";
const path = require("node:path");
const { loadSnapshot, root, contract, uniqueCharacters, renderUniqueLua, genericFigures, memoriamFigures, compulsions, writeAtomic } = require("./lib/sheet_exports.js");
const { renderMemoriamNpcCatalogLua } = require("./lib/memoriam_npcs_sheet_csv.js");

function writeCharacterExports(snapshot, { lua = true } = {}) {
  const data = path.join(root, ".dev/storyteller-dashboard/data");
  const catalog = (name, npcs) => JSON.stringify({ generatedBy: "npm run characters:import", sheetId: contract.spreadsheetId, tabName: contract.sheetTitle, rangeName: name, npcs }, null, 2) + "\n";
  // Materialize and validate every payload before replacing any output.
  const figures = genericFigures(snapshot), memoriam = memoriamFigures(snapshot);
  const compulsionText = JSON.stringify(compulsions(snapshot), null, 2) + "\n";
  const outputs = [
    [path.join(data, "unique-characters.json"), JSON.stringify(uniqueCharacters(snapshot), null, 2) + "\n"],
    [path.join(data, "generic-npcs.json"), catalog("EXPORT_CHARACTERS_GENERIC", figures)],
    [path.join(data, "memoriam-npcs.json"), catalog("EXPORT_CHARACTERS_UNIQUE + EXPORT_CHARACTERS_GENERIC", memoriam)],
    [path.join(data, "compulsions.jsonc"), compulsionText],
  ];
  if (lua) outputs.push([path.join(root, "lib/unique_character_catalog.ttslua"), renderUniqueLua(snapshot)], [path.join(root, "lib/memoriam_npc_catalog.ttslua"), renderMemoriamNpcCatalogLua(memoriam)]);
  for (const [file, contents] of outputs) writeAtomic(file, contents);
  return { uniqueCount: Object.keys(uniqueCharacters(snapshot)).length, genericCount: figures.length, memoriamCount: memoriam.length };
}
module.exports = { writeCharacterExports };
if (require.main === module) loadSnapshot().then(snapshot => console.log("characters:import", writeCharacterExports(snapshot))).catch(e => { console.error(e); process.exitCode = 1; });
