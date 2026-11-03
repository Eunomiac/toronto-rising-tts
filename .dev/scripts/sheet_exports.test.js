"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseExport, contract, exportUrl, validateSnapshot, genericFigures, uniqueCharacters, compulsions } = require("./lib/sheet_exports.js");
const spec = name => contract.exports.find(s => s.name === `EXPORT_${name}`);
const table = (name, rows) => [spec(name).headers, ...rows.map(row => spec(name).headers.map(h => row[h] || ""))];
function fixture() {
  const tables = Object.fromEntries(contract.exports.map(s => [s.name, [s.headers, s.headers.map(() => "value")]]));
  tables.EXPORT_CHARACTERS_UNIQUE = table("CHARACTERS_UNIQUE", [
    { "API Key": "base", Type: "Named NPC", Name: "Base", "Catalog?": "FALSE", Filename: "npc_original.webp", "Legacy API Keys": "oldBase" },
    { "API Key": "historical", Type: "Named NPC", Name: "Variant", "Catalog?": "FALSE", Filename: "npc_historical.webp", "Variant Of": "base" },
  ]);
  tables.EXPORT_CHARACTERS_GENERIC = table("CHARACTERS_GENERIC", ["Weak", "Average"].map(Tier => ({ "API Key": "extra_01", Tier, Kind: "Mortal", Label: "Extra", "Stat Profile": "extras", "Stat Key": `extras${Tier}`, "Figurine Filename": "npc_extra_01.webp", "Catalog?": "TRUE" })));
  tables.EXPORT_LOCATIONS_DISTRICTS = table("LOCATIONS_DISTRICTS", [{ Key: "district" }]);
  tables.EXPORT_LOCATIONS_SITES = table("LOCATIONS_SITES", [{ Key: "site", District: "district", "Is Outdoors": "FALSE", "Top Fog": "FALSE", "Unique?": "TRUE", "Is Silent?": "TRUE", "Weather Ducking": "0" }]);
  tables.EXPORT_MEMORIAM = table("MEMORIAM", [{ Key: "period" }]);
  tables.EXPORT_SKYBOXES = table("SKYBOXES", [{ Key: "skybox" }]);
  tables.EXPORT_COMPULSIONS = table("COMPULSIONS", [4, 2, 1, 3].map(Card => Object.fromEntries(spec("COMPULSIONS").headers.map(h => [h, h === "Compulsion Key" ? "hunger" : h === "Card" ? String(Card) : h === "Clan" ? "" : "Text"]))));
  return { version: 1, tables };
}
test("named CSV URL includes the export tab gid", () => {
  const url = new URL(exportUrl("EXPORT_WEATHER"));
  assert.equal(url.searchParams.get("gid"), String(contract.sheetId));
  assert.equal(url.searchParams.get("range"), "EXPORT_WEATHER");
  assert.equal(url.searchParams.get("format"), "csv");
});
test("CSV preserves zero, Unicode minus, X, ~, booleans and quoted multiline text", () => {
  const headers = ["zero", "minus", "x", "unset", "flag", "text"];
  assert.deepEqual(parseExport('zero,minus,x,unset,flag,text\n0,−2,X,~,FALSE,"A, B\nC"', { name: "sample", headers })[1], ["0", "−2", "X", "~", "FALSE", "A, B\nC"]);
  assert.throws(() => parseExport("<html>login</html>", { name: "sample", headers }), /HTML/);
  assert.throws(() => parseExport("zero\n#REF!", { name: "sample", headers: ["zero"] }), /formula error/);
});
test("one figure groups supplied tiers; variant may target a non-Catalog character", () => {
  const snapshot = validateSnapshot(fixture());
  assert.equal(genericFigures(snapshot).length, 1);
  assert.deepEqual(genericFigures(snapshot)[0].tiers, ["weak", "average"]);
  const characters = uniqueCharacters(snapshot);
  assert.equal(characters.oldBase.filename, "npc_original.webp");
  assert.equal(characters.oldBase.canonicalKey, "base");
  assert.equal(characters.historical.variantOfUnique, "base");
});
test("duplicate figure tiers, conflicting metadata, alias collisions and variant cycles fail", () => {
  const snapshot = fixture();
  snapshot.tables.EXPORT_CHARACTERS_GENERIC.push(snapshot.tables.EXPORT_CHARACTERS_GENERIC[1]);
  assert.throws(() => validateSnapshot(snapshot), /duplicate extra_01\/Weak/);
  const cycle = fixture(), headers = cycle.tables.EXPORT_CHARACTERS_UNIQUE[0];
  cycle.tables.EXPORT_CHARACTERS_UNIQUE[1][headers.indexOf("Variant Of")] = "historical";
  assert.throws(() => validateSnapshot(cycle), /cycle/);
  const alias = fixture();
  alias.tables.EXPORT_CHARACTERS_UNIQUE[1][headers.indexOf("Legacy API Keys")] = "historical";
  assert.throws(() => validateSnapshot(alias), /duplicate identity/);
});
test("Compulsion numbers control variant identity, with one shared Influence", () => {
  const snapshot = fixture();
  assert.deepEqual(compulsions(snapshot).hunger.variants.map(v => v.card), [1, 2, 3, 4]);
  snapshot.tables.EXPORT_COMPULSIONS[1][3] = "1";
  assert.throws(() => compulsions(snapshot), /duplicate card/);
});
