"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseExport, contract, exportUrl, validateSnapshot, genericFigures, uniqueCharacters, compulsions } = require("./lib/sheet_exports.js");
const spec = name => contract.exports.find(s => s.name === `EXPORT_${name}`);
const table = (name, rows) => [spec(name).headers, ...rows.map(row => spec(name).headers.map(h => row[h] || ""))];
function fixture() {
  const tables = Object.fromEntries(contract.exports.map(s => [s.name, [s.headers, s.headers.map(() => "value")]]));
  tables.EXPORT_CHARACTERS_NAMED = table("CHARACTERS_NAMED", [
    { "API Key": "base", Type: "Named NPC", Name: "Base", "Is PC": "FALSE", "In Catalog": "TRUE", "Has Figurine": "TRUE", "Figurine Filename": "npc_base.webp" },
    { "API Key": "base_historical", Type: "Named NPC", Name: "Variant", "Is PC": "FALSE", "In Catalog": "FALSE", "Has Figurine": "TRUE", "Figurine Filename": "npc_base_historical.webp", "Variant Of": "base", "Memoriam Periods": "period" },
  ]);
  tables.EXPORT_CHARACTERS_GENERIC = table("CHARACTERS_GENERIC", ["Weak", "Average"].map(Tier => ({ "API Key": "extra_01", Tier, Kind: "Mortal", Label: "Extra", "Has Figurine": "TRUE", "Figurine Filename": "npc_extra_01.webp", "In Catalog": "TRUE" })));
  tables.EXPORT_LOCATIONS_DISTRICTS = table("LOCATIONS_DISTRICTS", [{ Key: "district", Name: "District" }]);
  tables.EXPORT_LOCATIONS_SITES = table("LOCATIONS_SITES", [{ Key: "site", Name: "Site", "Sound - Location": "silent", District: "district", "Is Outdoors": "FALSE", "Top Fog": "FALSE", "Unique?": "TRUE", "Is Silent?": "TRUE", "Weather Ducking": "0" }]);
  tables.EXPORT_MEMORIAM = table("MEMORIAM", [{ Key: "period", Characters: "base", "Start Year": "1800", "End Year": "1801", Location: "Toronto", "Panel A Display": "A", "Panel A isOutdoors": "FALSE", "Panel A isDaytime": "FALSE", "Panel B Display": "B", "Panel B isOutdoors": "FALSE", "Panel B isDaytime": "FALSE" }]);
  tables.EXPORT_SKYBOXES = table("SKYBOXES", [{ Key: "skybox", Display: "Skybox", isShown: "TRUE", Filename: "skybox_skybox.jpg" }]);
  tables.EXPORT_DISCIPLINES = table("DISCIPLINES", [{ Discipline: "Animalism", Level: "2", Name: "Feral Whispers", "Rouse Checks": "1", "Trait Affinity 1": "Charisma", "Trait Affinity 2": "Manipulation", "Difficulty Range": "3-6" }]);
  tables.EXPORT_COMPULSIONS = table("COMPULSIONS", [4, 2, 1, 3].map(Card => Object.fromEntries(spec("COMPULSIONS").headers.map(h => [h, h === "Compulsion Key" ? "hunger" : h === "Card" ? String(Card) : h === "Clan" ? "" : "Text"]))));
  const fs = require("node:fs");
  const { loadWeatherValidationSets } = require("./lib/weather_sheet_csv.js");
  const keys = loadWeatherValidationSets(fs.readFileSync(require("node:path").join(__dirname, "../../lib/constants.ttslua"), "utf8"));
  const code = [keys.base, keys.temperatureDelta, keys.humidity, keys.wind].map(set => [...set][0]).join("");
  const days = [31,29,31,30,31,30,31,31,30,31,30,31];
  tables.EXPORT_WEATHER = table("WEATHER", days.flatMap((n, month) => Array.from({length:n}, (_, day) => ({ Month: String(month+1), "Average Temperature": "0", Day: String(day+1), DayCodes: Array(24).fill(`"${code}"`).join(",") }))));
  tables.EXPORT_COMPLICATIONS = table("COMPLICATIONS", [{ Index: "1", Name: "Test", Category: "", Rarity: "Common", Value: "0", "Function Calls": "projectDiePenalty", Standard: "TRUE", Discipline: "TRUE", Willpower: "FALSE", Launch: "FALSE", Goal: "FALSE" }]);
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
test("one figure groups supplied tiers; Named variants retain their parent identity", () => {
  const snapshot = validateSnapshot(fixture());
  assert.equal(genericFigures(snapshot).length, 1);
  assert.deepEqual(genericFigures(snapshot)[0].tiers, ["weak", "average"]);
  const characters = uniqueCharacters(snapshot);
  assert.equal(characters.base.filename, "npc_base.webp");
  assert.equal(characters.base_historical.variantOfUnique, "base");
});
test("duplicate figure tiers, conflicting metadata, obsolete schemas and variant cycles fail", () => {
  const snapshot = fixture();
  snapshot.tables.EXPORT_CHARACTERS_GENERIC.push(snapshot.tables.EXPORT_CHARACTERS_GENERIC[1]);
  assert.throws(() => validateSnapshot(snapshot), /duplicate extra_01\/Weak/);
  const cycle = fixture(), headers = cycle.tables.EXPORT_CHARACTERS_NAMED[0];
  cycle.tables.EXPORT_CHARACTERS_NAMED[1][headers.indexOf("Variant Of")] = "base_historical";
  assert.throws(() => validateSnapshot(cycle), /non-variant parent/);
  const obsolete = fixture();
  obsolete.tables.EXPORT_CHARACTERS_UNIQUE = obsolete.tables.EXPORT_CHARACTERS_NAMED;
  assert.throws(() => validateSnapshot(obsolete), /Unexpected export table EXPORT_CHARACTERS_UNIQUE/);
});

test("coterie portraits validate, render and inherit alongside PC portrait recipients", () => {
  const snapshot = fixture();
  const headers = spec("CHARACTERS_NAMED").headers;
  for (const row of snapshot.tables.EXPORT_CHARACTERS_NAMED.slice(1)) {
    row[headers.indexOf("Has Portrait")] = "coterie, rashid";
    row[headers.indexOf("Portrait Filename")] = "npcPortrait_base.webp";
  }
  validateSnapshot(snapshot);
  const { renderPortraitLua } = require("./lib/sheet_exports.js");
  assert.match(renderPortraitLua(snapshot), /\["base_historical"\] = \{ \["coterie"\] = "npcPortrait_base", \["rashid"\] = "npcPortrait_base"/);
  snapshot.tables.EXPORT_CHARACTERS_NAMED[1][headers.indexOf("Has Portrait")] = "unknown";
  assert.throws(() => validateSnapshot(snapshot), /portrait recipient/);
  snapshot.tables.EXPORT_CHARACTERS_NAMED[1][headers.indexOf("Has Portrait")] = "coterie, coterie";
  assert.throws(() => validateSnapshot(snapshot), /duplicate portrait recipient/);
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
  assert.throws(() => validateExportData(cards), /Invalid completed card/);
  const memoriam = structuredClone(snapshot);
  memoriam.tables.EXPORT_MEMORIAM[1][spec("MEMORIAM").headers.indexOf("Panel A Location Audio")] = "unavailableTrack";
  assert.doesNotThrow(() => validateExportData(memoriam));
  assert.match(memoriam.warnings.join("\n"), /unavailableTrack.*period panel A/);
});

test("unapproved period assignments remain visible and generic metadata must agree between tiers", () => {
  const snapshot = fixture(), headers = spec("CHARACTERS_NAMED").headers;
  snapshot.tables.EXPORT_CHARACTERS_NAMED[1][headers.indexOf("Memoriam Periods")] = "unapproved";
  const validated = validateSnapshot(snapshot);
  assert.match(validated.warnings[0], /unapproved.*retained/);
  assert.equal(validated.tables.EXPORT_CHARACTERS_NAMED[1][headers.indexOf("Memoriam Periods")], "unapproved");
  const generic = fixture();
  generic.tables.EXPORT_CHARACTERS_GENERIC[2][spec("CHARACTERS_GENERIC").headers.indexOf("Label")] = "Different figure";
  assert.throws(() => validateSnapshot(generic), /inconsistent figure metadata/);
});

test("named Discipline references use exact pool precedence and retain explicit powers", () => {
  const { disciplinePowerLookup, parseStatRecord } = require("../storyteller-dashboard/scripts/npc-stats/sheet.ts");
  const catalogue = disciplinePowerLookup([
    { Discipline: "Animalism", Level: "2", Name: "Feral Whispers", "Rouse Checks": "1", "Trait Affinity 1": "Charisma", "Trait Affinity 2": "Manipulation", "Difficulty Range": "3-6" },
    { Discipline: "Rituals", Level: "1", Name: "Herd Ward (Minor)", "Rouse Checks": "1", "Difficulty Range": "0,3,4" },
  ]);
  const row = { Kind: "Vampire", Difficulty: "3/2", Powers: "Animalism 2 (Feral Whispers,2-1:One Voice)|Rituals 1 (Herd Ward (Minor))" };
  const withPools = pools => parseStatRecord({ ...row, "Exceptional Pools": pools }, "example", true, catalogue);
  for (const [pools, expected] of [
    ["Manipulation|Feral Whispers|Charisma|Animalism", "Animalism"],
    ["Manipulation|Feral Whispers|Charisma", "Feral Whispers"],
    ["Manipulation|Charisma", "Charisma"],
    ["Manipulation|animalism", "Manipulation"],
    ["charisma|animalism", null],
  ]) {
    const block = withPools(pools);
    const [resolved, explicit] = block.powers[0].powers;
    const pool = block.exceptional.find(candidate => candidate.name === expected);
    assert.deepEqual(resolved, { level: 2, name: "Feral Whispers", rouse: 1, difficulty: "3-6", traits: ["Charisma", "Manipulation"], pool: pool ? `ex:${pool.id}` : "supernatural" });
    assert.deepEqual(explicit, { level: 2, name: "One Voice", rouse: 1, pool: "" });
    assert.equal(block.powers[1].powers[0].difficulty, "0,3,4");
  }
  assert.throws(() => parseStatRecord({ ...row, Powers: "Animalism 2 (Unknown)" }, "example", true, catalogue), /example: Unknown catalogue power "Animalism \/ Unknown"/);
});

test("stats import preserves pending edits, kept NPCs and the pending file", () => {
  const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), { spawnSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-export-stats-test-"));
  try {
    const snapshot = fixture(), headers = spec("CHARACTERS_NAMED").headers;
    for (const [header, value] of Object.entries({ Kind: "Mortal", Health: "5", Willpower: "4", Difficulty: "2/1" })) snapshot.tables.EXPORT_CHARACTERS_NAMED[1][headers.indexOf(header)] = value;
    fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(snapshot));
    const block = { kind: "mortal", health: 9, exceptional: [], attacks: [], powers: [], notes: "<p>Pending edit</p>" };
    const before = { base: { named: block }, "kept:test": { named: block, kept: { name: "Kept", figurineKey: "extra_01", label: "Extra" } } };
    fs.writeFileSync(path.join(dir, "npc-stats.json"), JSON.stringify(before));
    const pending = { base: "2026-11-03T00:00:00Z" };
    fs.writeFileSync(path.join(dir, "npc-stats-pending.json"), JSON.stringify(pending));
    const result = spawnSync(process.execPath, [path.resolve(__dirname, "../storyteller-dashboard/scripts/npc-stats/import.ts")], { encoding: "utf8", env: { ...process.env, TR_EXPORT_SNAPSHOT: path.join(dir, "snapshot.json"), TR_DASHBOARD_DATA_DIR: dir } });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(path.join(dir, "npc-stats.json"), "utf8"));
    assert.equal(after.base.named.health, 9);
    assert.equal(after.base.named.notes, "<p>Pending edit</p>");
    assert.deepEqual(after["kept:test"], before["kept:test"]);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "npc-stats-pending.json"), "utf8")), pending);
    assert(after["generic:extra_01"].weak && after["generic:extra_01"].average);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
