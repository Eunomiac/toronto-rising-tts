"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseCsv,
  parseSkyboxCatalogRows,
  parseGenericSkyboxRows,
  parseMemoriamSkyboxRows,
  escapeLuaString,
  renderSkyboxesCatalogLua,
} = require("./lib/skyboxes_sheet_csv.js");

const MEMORIAM_HEADER = [
  "Key",
  "Characters",
  "Start Year",
  "End Year",
  "Location",
  "Panel A Display",
  "Panel A isOutdoors",
  "Panel A isDaytime",
  "Panel A Weather",
  "Panel A Location Audio",
  "Panel A URL",
  "Panel B Display",
  "Panel B isOutdoors",
  "Panel B isDaytime",
  "Panel B Weather",
  "Panel B Location Audio",
  "Panel B URL",
  "Panel C Display",
  "Panel C isOutdoors",
  "Panel C isDaytime",
  "Panel C Weather",
  "Panel C Location Audio",
  "Panel C URL",
  "Panel D Display",
  "Panel D isOutdoors",
  "Panel D isDaytime",
  "Panel D Weather",
  "Panel D Location Audio",
  "Panel D URL",
].join(",");

/**
 * @param {string[]} cells
 * @returns {string}
 */
function memoriamCsv(cells) {
  return [MEMORIAM_HEADER, cells.join(",")].join("\n");
}

test("parseCsv handles quoted commas", () => {
  const rows = parseCsv('Key,Display,URL\nA,"Hi, there",https://x/\n');
  assert.deepEqual(rows[1], ["A", "Hi, there", "https://x/"]);
});

test("parseSkyboxCatalogRows accepts valid rows and preserves order", () => {
  const csv = [
    "Key,Display,isShown,URL",
    "Beta,Beta Label,TRUE,https://b/",
    "Alpha,Alpha Label,FALSE,https://a/",
    "",
  ].join("\n");
  const rows = parseSkyboxCatalogRows(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].key, "Beta");
  assert.equal(rows[0].isShown, true);
  assert.equal(rows[1].key, "Alpha");
  assert.equal(rows[1].isShown, false);
});

test("parseSkyboxCatalogRows rejects bad header", () => {
  assert.throws(() => parseSkyboxCatalogRows("A,B,C\nx,y,z\n"), /expected header/i);
  assert.throws(
    () => parseSkyboxCatalogRows("Key,Display,URL\nA,One,https://a/\n"),
    /expected header/i,
  );
});

test("parseSkyboxCatalogRows rejects invalid isShown", () => {
  const csv = "Key,Display,isShown,URL\nA,One,maybe,https://a/\n";
  assert.throws(() => parseSkyboxCatalogRows(csv), /isShown must be TRUE or FALSE/i);
});

test("parseSkyboxCatalogRows rejects duplicate keys", () => {
  const csv = "Key,Display,isShown,URL\nA,One,TRUE,https://a/\nA,Two,TRUE,https://b/\n";
  assert.throws(() => parseSkyboxCatalogRows(csv), /duplicate key/i);
});

test("parseSkyboxCatalogRows rejects invalid Lua identifier keys", () => {
  const csv = "Key,Display,isShown,URL\nbad-key,Label,TRUE,https://a/\n";
  assert.throws(() => parseSkyboxCatalogRows(csv), /Lua identifier/i);
});

test("parseGenericSkyboxRows requires at least one URL", () => {
  assert.throws(() => parseGenericSkyboxRows("URL\n\n"), /at least one URL/i);
  const urls = parseGenericSkyboxRows("URL\nhttps://a/\nhttps://b/\n");
  assert.deepEqual(urls, ["https://a/", "https://b/"]);
});

test("escapeLuaString escapes backslash and quotes", () => {
  assert.equal(escapeLuaString('say "hi"'), 'say \\"hi\\"');
  assert.equal(escapeLuaString("a\\b"), "a\\\\b");
});

test("renderSkyboxesCatalogLua emits module shape", () => {
  const lua = renderSkyboxesCatalogLua({
    skyboxes: [
      { key: "CLHall", display: 'Hall "A"', isShown: true, url: "https://u/" },
      { key: "HiddenHall", display: "Hidden", isShown: false, url: "https://h/" },
    ],
    generics: ["https://g/"],
    meta: {
      sheetId: "sheet123",
      catalogRange: "SKYBOXCSV",
      genericsRange: "SKYBOXGENERICCSV",
    },
  });
  assert.match(lua, /SkyboxesCatalog\.Skyboxes = \{/);
  assert.match(lua, /CLHall = \{/);
  assert.match(lua, /display = "Hall \\"A\\""/);
  assert.match(lua, /isShown = true,/);
  assert.match(lua, /HiddenHall = \{[\s\S]*isShown = false,/);
  assert.match(lua, /Key,Display,isShown,URL/);
  assert.match(lua, /SkyboxesCatalog\.GenericSkyboxes = \{/);
  assert.match(lua, /SkyboxesCatalog\.MemoriamSkyboxes = \{/);
  assert.match(lua, /return SkyboxesCatalog/);
  assert.match(lua, /sheet123/);
});

const AISHE2_CELLS = [
  "aishe2",
  "aishe",
  "1799",
  "1833",
  '"Brașov, Romania"',
  "Father's townhouse",
  "FALSE",
  "TRUE",
  "windLow|rainLight",
  "quietIndoor",
  "",
  "Market square",
  "TRUE",
  "FALSE",
  "",
  "busyStreet",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];

test("parseMemoriamSkyboxRows nests entries under character then key", () => {
  const nested = parseMemoriamSkyboxRows(memoriamCsv(AISHE2_CELLS));
  const entry = nested.aishe.aishe2;
  assert.equal(entry.key, "aishe2");
  assert.equal(entry.startYear, 1799);
  assert.equal(entry.endYear, 1833);
  assert.equal(entry.location, "Brașov, Romania");
  assert.deepEqual(entry.panelA, {
    display: "Father's townhouse",
    isOutdoors: false,
    isDaytime: true,
    weather: ["windLow", "rainLight"],
    locationAudio: "quietIndoor",
    url: "",
  });
  assert.deepEqual(entry.panelB, {
    display: "Market square",
    isOutdoors: true,
    isDaytime: false,
    weather: [],
    locationAudio: "busyStreet",
    url: "",
  });
  assert.equal(entry.panelC, undefined);
  assert.equal(entry.panelD, undefined);
});

test("parseMemoriamSkyboxRows duplicates a row under each pipe-delimited character", () => {
  const cells = AISHE2_CELLS.slice();
  cells[0] = "lucien14";
  cells[1] = "lucien|fomorach";
  const nested = parseMemoriamSkyboxRows(memoriamCsv(cells));
  assert.deepEqual(nested.lucien.lucien14, nested.fomorach.lucien14);
  assert.equal(nested.lucien.lucien14.key, "lucien14");
  assert.equal(nested.aishe, undefined);
});

test("parseMemoriamSkyboxRows splits weather pipes and treats blank weather as empty array", () => {
  const withPipes = parseMemoriamSkyboxRows(memoriamCsv(AISHE2_CELLS));
  assert.deepEqual(withPipes.aishe.aishe2.panelA.weather, ["windLow", "rainLight"]);
  assert.deepEqual(withPipes.aishe.aishe2.panelB.weather, []);
});

test("parseMemoriamSkyboxRows omits panel C/D only when display is blank", () => {
  const withC = AISHE2_CELLS.slice();
  withC[17] = "Hidden cellar";
  withC[18] = "FALSE";
  withC[19] = "FALSE";
  withC[20] = "fogLow";
  withC[21] = "quietIndoor";
  withC[22] = "https://c/";
  const nested = parseMemoriamSkyboxRows(memoriamCsv(withC));
  assert.deepEqual(nested.aishe.aishe2.panelC, {
    display: "Hidden cellar",
    isOutdoors: false,
    isDaytime: false,
    weather: ["fogLow"],
    locationAudio: "quietIndoor",
    url: "https://c/",
  });
  assert.equal(nested.aishe.aishe2.panelD, undefined);
});

test("parseMemoriamSkyboxRows rejects bad header", () => {
  assert.throws(() => parseMemoriamSkyboxRows("Key,Characters\nx,y\n"), /expected header/i);
});

test("parseMemoriamSkyboxRows rejects invalid years", () => {
  const cells = AISHE2_CELLS.slice();
  cells[2] = "seventeen";
  assert.throws(() => parseMemoriamSkyboxRows(memoriamCsv(cells)), /start year/i);
});

test("parseMemoriamSkyboxRows skips rows with blank Panel A and Panel B display", () => {
  const blankPanels = AISHE2_CELLS.slice();
  blankPanels[0] = "rashid12b";
  blankPanels[1] = "rashid";
  blankPanels[5] = "";
  blankPanels[11] = "";
  const csv = [MEMORIAM_HEADER, AISHE2_CELLS.join(","), blankPanels.join(",")].join("\n");
  const nested = parseMemoriamSkyboxRows(csv);
  assert.equal(nested.aishe.aishe2.key, "aishe2");
  assert.equal(nested.rashid, undefined);
});

test("parseMemoriamSkyboxRows skips rows with a blank Key", () => {
  const blankKey = AISHE2_CELLS.slice();
  blankKey[0] = "";
  blankKey[1] = "rashid";
  blankKey[2] = "";
  blankKey[3] = "";
  const csv = [MEMORIAM_HEADER, AISHE2_CELLS.join(","), blankKey.join(",")].join("\n");
  const nested = parseMemoriamSkyboxRows(csv);
  assert.equal(nested.aishe.aishe2.key, "aishe2");
  assert.equal(nested.rashid, undefined);
});

test("parseMemoriamSkyboxRows rejects duplicate key under the same character", () => {
  const csv = [MEMORIAM_HEADER, AISHE2_CELLS.join(","), AISHE2_CELLS.join(",")].join("\n");
  assert.throws(() => parseMemoriamSkyboxRows(csv), /duplicate key/i);
});

test("renderSkyboxesCatalogLua emits nested MemoriamSkyboxes", () => {
  const nested = parseMemoriamSkyboxRows(memoriamCsv(AISHE2_CELLS));
  const lua = renderSkyboxesCatalogLua({
    skyboxes: [{ key: "CLHall", display: "Hall", isShown: true, url: "https://u/" }],
    generics: ["https://g/"],
    memoriam: nested,
    meta: {
      sheetId: "sheet123",
      catalogRange: "SKYBOXCSV",
      genericsRange: "SKYBOXGENERICCSV",
      memoriamRange: "SKYBOXMEMORIAMCSV",
    },
  });
  assert.match(lua, /SkyboxesCatalog\.MemoriamSkyboxes = \{/);
  assert.match(lua, /SKYBOXMEMORIAMCSV/);
  assert.match(lua, /aishe = \{/);
  assert.match(lua, /aishe2 = \{/);
  assert.match(lua, /startYear = 1799,/);
  assert.match(lua, /endYear = 1833,/);
  assert.match(lua, /location = "Brașov, Romania"/);
  assert.match(lua, /panelA = \{/);
  assert.match(lua, /isOutdoors = false,/);
  assert.match(lua, /isDaytime = true,/);
  assert.match(lua, /weather = \{[\s\S]*"windLow",[\s\S]*"rainLight"/);
  assert.match(lua, /locationAudio = "quietIndoor"/);
  assert.match(lua, /url = ""/);
  assert.match(lua, /weather = \{\}/);
  assert.doesNotMatch(lua, /panelC =/);
  assert.doesNotMatch(lua, /panelD =/);
});
