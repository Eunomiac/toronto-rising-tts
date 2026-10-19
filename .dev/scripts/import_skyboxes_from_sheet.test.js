"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseCsv,
  parseSkyboxCatalogRows,
  attachSkyboxUrls,
  genericSkyboxUrls,
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
  "Panel B Display",
  "Panel B isOutdoors",
  "Panel B isDaytime",
  "Panel B Weather",
  "Panel B Location Audio",
  "Panel C Display",
  "Panel C isOutdoors",
  "Panel C isDaytime",
  "Panel C Weather",
  "Panel C Location Audio",
  "Panel D Display",
  "Panel D isOutdoors",
  "Panel D isDaytime",
  "Panel D Weather",
  "Panel D Location Audio",
  "Splash Text",
].join(",");

/**
 * @param {string[]} cells
 * @returns {string}
 */
function memoriamCsv(cells) {
  return [MEMORIAM_HEADER, cells.join(",")].join("\n");
}

function emptyMemoriamTail() {
  return [""];
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

test("parseSkyboxCatalogRows ignores a leftover URL column", () => {
  const rows = parseSkyboxCatalogRows("Key,Display,isShown,URL\nA,One,TRUE,https://stale/\nB,Two,TRUE,\n");
  assert.deepEqual(rows, [
    { key: "A", display: "One", isShown: true },
    { key: "B", display: "Two", isShown: true },
  ]);
});

test("attachSkyboxUrls joins Cloud rows by key and fails on a missing file", () => {
  const sheet = [{ key: "A", display: "One", isShown: true }];
  assert.deepEqual(attachSkyboxUrls(sheet, [{ name: "A", url: "https://a/" }, { name: "Z", url: "https://z/" }]), [
    { key: "A", display: "One", isShown: true, url: "https://a/" },
  ]);
  assert.throws(() => attachSkyboxUrls(sheet, [{ name: "Z", url: "https://z/" }]), /no file .*skybox_<key>[\s\S]*A/);
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

test("genericSkyboxUrls orders by number and requires one file", () => {
  assert.throws(() => genericSkyboxUrls([]), /No generic skyboxes/);
  const urls = genericSkyboxUrls([
    { name: "10", url: "https://j/" },
    { name: "2", url: "https://b/" },
    { name: "1", url: "https://a/" },
  ]);
  assert.deepEqual(urls, ["https://a/", "https://b/", "https://j/"]);
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
    },
  });
  assert.match(lua, /SkyboxesCatalog\.Skyboxes = \{/);
  assert.match(lua, /CLHall = \{/);
  assert.match(lua, /display = "Hall \\"A\\""/);
  assert.match(lua, /isShown = true,/);
  assert.match(lua, /HiddenHall = \{[\s\S]*isShown = false,/);
  assert.match(lua, /Key,Display,isShown\)/);
  assert.match(lua, /cloud-assets\.json/);
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
  ...emptyMemoriamTail(),
];

test("parseMemoriamSkyboxRows stores entries by key with a characters list", () => {
  const parsed = parseMemoriamSkyboxRows(memoriamCsv(AISHE2_CELLS));
  const entry = parsed.aishe2;
  assert.equal(entry.key, "aishe2");
  assert.deepEqual(entry.characters, ["aishe"]);
  assert.equal(entry.startYear, 1799);
  assert.equal(entry.endYear, 1833);
  assert.equal(entry.location, "Brașov, Romania");
  assert.equal(entry.splashText, "");
  assert.equal(entry.npcs, undefined);
  assert.equal(entry.blindfoldURL, undefined);
  assert.deepEqual(entry.panelA, {
    display: "Father's townhouse",
    isOutdoors: false,
    isDaytime: true,
    weather: ["windLow", "rainLight"],
    locationAudio: "quietIndoor",
  });
  assert.deepEqual(entry.panelB, {
    display: "Market square",
    isOutdoors: true,
    isDaytime: false,
    weather: [],
    locationAudio: "busyStreet",
  });
  assert.equal(entry.panelC, undefined);
  assert.equal(entry.panelD, undefined);
  assert.equal(parsed.aishe, undefined);
});

test("parseMemoriamSkyboxRows keeps pipe-delimited characters on one entry", () => {
  const cells = AISHE2_CELLS.slice();
  cells[0] = "lucien14";
  cells[1] = "lucien|fomorach";
  const parsed = parseMemoriamSkyboxRows(memoriamCsv(cells));
  assert.deepEqual(parsed.lucien14.characters, ["lucien", "fomorach"]);
  assert.equal(parsed.lucien14.key, "lucien14");
  assert.equal(parsed.lucien, undefined);
  assert.equal(parsed.fomorach, undefined);
});

test("parseMemoriamSkyboxRows imports splash text and ignores leftover NPC columns", () => {
  const cells = AISHE2_CELLS.slice();
  cells[25] = "Smoke and memory";
  const header = `${MEMORIAM_HEADER},NPC 1 Key,NPC 1 Label,NPC 1 Scale`;
  const parsed = parseMemoriamSkyboxRows([header, cells.concat(["mem_drake", "Drake", "60"]).join(",")].join("\n"));
  assert.equal(parsed.aishe2.splashText, "Smoke and memory");
  assert.equal(parsed.aishe2.npcs, undefined);
});

test("parseMemoriamSkyboxRows ignores leftover Panel URL columns", () => {
  const header = `${MEMORIAM_HEADER},Panel A URL`;
  const cells = AISHE2_CELLS.concat(["#REF!"]);
  const parsed = parseMemoriamSkyboxRows([header, cells.join(",")].join("\n"));
  assert.equal(parsed.aishe2.panelA.url, undefined);
  assert.equal(parsed.aishe2.npcs, undefined);
});

test("parseMemoriamSkyboxRows splits weather pipes and treats blank weather as empty array", () => {
  const withPipes = parseMemoriamSkyboxRows(memoriamCsv(AISHE2_CELLS));
  assert.deepEqual(withPipes.aishe2.panelA.weather, ["windLow", "rainLight"]);
  assert.deepEqual(withPipes.aishe2.panelB.weather, []);
});

test("parseMemoriamSkyboxRows omits panel C/D only when display is blank", () => {
  const withC = AISHE2_CELLS.slice();
  withC[15] = "Hidden cellar";
  withC[16] = "FALSE";
  withC[17] = "FALSE";
  withC[18] = "fogLow";
  withC[19] = "quietIndoor";
  const parsed = parseMemoriamSkyboxRows(memoriamCsv(withC));
  assert.deepEqual(parsed.aishe2.panelC, {
    display: "Hidden cellar",
    isOutdoors: false,
    isDaytime: false,
    weather: ["fogLow"],
    locationAudio: "quietIndoor",
  });
  assert.equal(parsed.aishe2.panelD, undefined);
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
  blankPanels[10] = "";
  const csv = [MEMORIAM_HEADER, AISHE2_CELLS.join(","), blankPanels.join(",")].join("\n");
  const parsed = parseMemoriamSkyboxRows(csv);
  assert.equal(parsed.aishe2.key, "aishe2");
  assert.equal(parsed.rashid12b, undefined);
});

test("parseMemoriamSkyboxRows skips rows with a blank Key", () => {
  const blankKey = AISHE2_CELLS.slice();
  blankKey[0] = "";
  blankKey[1] = "rashid";
  blankKey[2] = "";
  blankKey[3] = "";
  const csv = [MEMORIAM_HEADER, AISHE2_CELLS.join(","), blankKey.join(",")].join("\n");
  const parsed = parseMemoriamSkyboxRows(csv);
  assert.equal(parsed.aishe2.key, "aishe2");
  assert.equal(parsed.rashid, undefined);
});

test("parseMemoriamSkyboxRows rejects duplicate keys", () => {
  const csv = [MEMORIAM_HEADER, AISHE2_CELLS.join(","), AISHE2_CELLS.join(",")].join("\n");
  assert.throws(() => parseMemoriamSkyboxRows(csv), /duplicate key/i);
});

test("renderSkyboxesCatalogLua emits flat MemoriamSkyboxes keyed by skybox key", () => {
  const parsed = parseMemoriamSkyboxRows(memoriamCsv(AISHE2_CELLS));
  const lua = renderSkyboxesCatalogLua({
    skyboxes: [{ key: "CLHall", display: "Hall", isShown: true, url: "https://u/" }],
    generics: ["https://g/"],
    memoriam: parsed,
    meta: {
      sheetId: "sheet123",
      catalogRange: "SKYBOXCSV",
      memoriamRange: "SKYBOXMEMORIAMCSV",
    },
  });
  assert.match(lua, /SkyboxesCatalog\.MemoriamSkyboxes = \{/);
  assert.match(lua, /SKYBOXMEMORIAMCSV/);
  assert.match(lua, /aishe2 = \{/);
  assert.match(lua, /characters = \{"aishe"\}/);
  assert.match(lua, /startYear = 1799,/);
  assert.match(lua, /endYear = 1833,/);
  assert.match(lua, /location = "Brașov, Romania"/);
  assert.match(lua, /panelA = \{/);
  assert.match(lua, /isOutdoors = false,/);
  assert.match(lua, /isDaytime = true,/);
  assert.match(lua, /weather = \{[\s\S]*"windLow",[\s\S]*"rainLight"/);
  assert.match(lua, /locationAudio = "quietIndoor"/);
  assert.match(lua, /weather = \{\}/);
  assert.match(lua, /splashText = ""/);
  assert.doesNotMatch(lua, /blindfoldURL/);
  assert.doesNotMatch(lua, /panelA[\s\S]*url = /);
  assert.doesNotMatch(lua, /tokenURL/);
  assert.doesNotMatch(lua, /figurineURL/);
  assert.doesNotMatch(lua, /npcs = \{/);
  assert.doesNotMatch(lua, /NPC 1–10/);
  assert.doesNotMatch(lua, /figurineScale/);
  assert.doesNotMatch(lua, /label = /);
  assert.doesNotMatch(lua, /panelC =/);
  assert.doesNotMatch(lua, /panelD =/);
});
