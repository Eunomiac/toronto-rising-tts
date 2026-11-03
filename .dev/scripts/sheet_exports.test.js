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
  tables.EXPORT_LOCATIONS_DISTRICTS = table("LOCATIONS_DISTRICTS", [{ Key: "district", Name: "District" }]);
  tables.EXPORT_LOCATIONS_SITES = table("LOCATIONS_SITES", [{ Key: "site", Name: "Site", "Sound - Location": "silent", District: "district", "Is Outdoors": "FALSE", "Top Fog": "FALSE", "Unique?": "TRUE", "Is Silent?": "TRUE", "Weather Ducking": "0" }]);
  tables.EXPORT_MEMORIAM = table("MEMORIAM", [{ Key: "period", Characters: "base", "Start Year": "1800", "End Year": "1801", Location: "Toronto", "Panel A Display": "A", "Panel A isOutdoors": "FALSE", "Panel A isDaytime": "FALSE", "Panel B Display": "B", "Panel B isOutdoors": "FALSE", "Panel B isDaytime": "FALSE" }]);
  tables.EXPORT_SKYBOXES = table("SKYBOXES", [{ Key: "skybox", Display: "Skybox", isShown: "TRUE", Filename: "skybox_skybox.jpg" }]);
  tables.EXPORT_COMPULSIONS = table("COMPULSIONS", [4, 2, 1, 3].map(Card => Object.fromEntries(spec("COMPULSIONS").headers.map(h => [h, h === "Compulsion Key" ? "hunger" : h === "Card" ? String(Card) : h === "Clan" ? "" : "Text"]))));
  const fs = require("node:fs");
  const { loadWeatherValidationSets } = require("./lib/weather_sheet_csv.js");
  const keys = loadWeatherValidationSets(fs.readFileSync(require("node:path").join(__dirname, "../../lib/constants.ttslua"), "utf8"));
  const code = [keys.base, keys.temperatureDelta, keys.humidity, keys.wind].map(set => [...set][0]).join("");
  const days = [31,29,31,30,31,30,31,31,30,31,30,31];
  tables.EXPORT_WEATHER = table("WEATHER", days.flatMap((n, month) => Array.from({length:n}, (_, day) => ({ Month: String(month+1), "Average Temperature": "0", Day: String(day+1), DayCodes: Array(24).fill(`"${code}"`).join(",") }))));
  tables.EXPORT_COMPLICATIONS = table("COMPLICATIONS", [{ Index: "1", Name: "Test", Category: "", Rarity: "Common", Value: "0", "DESIGN COMPLETE?": "✔️", Standard: "TRUE", Discipline: "TRUE", Willpower: "FALSE", Launch: "FALSE", Goal: "FALSE" }]);
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

test("complete domain preflight rejects bad hours, audio references and incomplete exported cards", () => {
  const { validateExportData } = require("./lib/validate_export_data.js");
  const snapshot = validateSnapshot(fixture());
  assert.equal(validateExportData(snapshot).weatherHours, 8784);
  const weather = structuredClone(snapshot);
  weather.tables.EXPORT_WEATHER[1][3] = '"bad"';
  assert.throws(() => validateExportData(weather), /24 hourly codes/);
  const audio = structuredClone(snapshot);
  audio.tables.EXPORT_LOCATIONS_SITES[1][spec("LOCATIONS_SITES").headers.indexOf("Sound - Location")] = "unavailableTrack";
  assert.throws(() => validateExportData(audio), /unknown location audio/);
  const cards = structuredClone(snapshot);
  cards.tables.EXPORT_COMPLICATIONS.push(spec("COMPLICATIONS").headers.map(h => h === "Index" ? "2" : h === "Name" ? "Draft" : ""));
  assert.throws(() => validateExportData(cards), /incomplete card/);
});

test("unapproved period assignments remain visible and generic metadata must agree between tiers", () => {
  const snapshot = fixture(), headers = spec("CHARACTERS_UNIQUE").headers;
  snapshot.tables.EXPORT_CHARACTERS_UNIQUE[1][headers.indexOf("Memoriam Periods")] = "unapproved";
  const validated = validateSnapshot(snapshot);
  assert.match(validated.warnings[0], /unapproved.*retained/);
  assert.equal(validated.tables.EXPORT_CHARACTERS_UNIQUE[1][headers.indexOf("Memoriam Periods")], "unapproved");
  const generic = fixture();
  generic.tables.EXPORT_CHARACTERS_GENERIC[2][spec("CHARACTERS_GENERIC").headers.indexOf("Label")] = "Different figure";
  assert.throws(() => validateSnapshot(generic), /inconsistent figure metadata/);
});

test("stats import preserves pending alias edits, kept NPCs and the pending file", () => {
  const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), { spawnSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-export-stats-test-"));
  try {
    const snapshot = fixture(), headers = spec("CHARACTERS_UNIQUE").headers;
    for (const [header, value] of Object.entries({ Kind: "Mortal", Health: "5", Willpower: "4", Difficulty: "2/1" })) snapshot.tables.EXPORT_CHARACTERS_UNIQUE[1][headers.indexOf(header)] = value;
    fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(snapshot));
    const block = { kind: "mortal", health: 9, exceptional: [], attacks: [], powers: [], notes: "<p>Pending edit</p>" };
    const before = { oldBase: { named: block }, "kept:test": { named: block, kept: { name: "Kept", figurineKey: "extra_01", label: "Extra" } } };
    fs.writeFileSync(path.join(dir, "npc-stats.json"), JSON.stringify(before));
    const pending = { oldBase: "2026-11-03T00:00:00Z" };
    fs.writeFileSync(path.join(dir, "npc-stats-pending.json"), JSON.stringify(pending));
    const result = spawnSync(process.execPath, [path.resolve(__dirname, "../storyteller-dashboard/scripts/npc-stats/import.ts")], { encoding: "utf8", env: { ...process.env, TR_EXPORT_SNAPSHOT: path.join(dir, "snapshot.json"), TR_DASHBOARD_DATA_DIR: dir } });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(path.join(dir, "npc-stats.json"), "utf8"));
    assert.equal(after.base.named.health, 9);
    assert.equal(after.oldBase.named.notes, "<p>Pending edit</p>");
    assert.deepEqual(after["kept:test"], before["kept:test"]);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "npc-stats-pending.json"), "utf8")), pending);
    assert(after["generic:Extra"].weak && after["generic:Extra"].average);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
