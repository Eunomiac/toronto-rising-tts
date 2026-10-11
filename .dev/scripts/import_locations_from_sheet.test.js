"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { parseDistrictRows, parseSiteRows, renderLocationsCatalogLua } = require("./lib/locations_sheet_csv.js");

const CATALOGS = {
  districtKeys: new Set(["Annex", "Sewers"]),
  skyboxKeys: new Set(["AnarchBar"]),
  musicKeys: new Set(["casaLoma"]),
  trackKeys: new Set(["diveBar", "warrens"]),
  conditionIds: new Set(["bestialNull", "bumpBloodPotency"]),
};

/** Build a sheet: `sections` = [[title, [header, …]], …]; `data` rows are objects keyed by header. */
function sheet(sections, data) {
  const row0 = [];
  const row1 = [];
  /** @type {Record<string, number>} */
  const at = {};
  for (const [title, headers] of sections) {
    row0[row1.length] = title;
    for (const h of headers) {
      at[`${title}/${h}`] = row1.length;
      row1.push(h);
    }
  }
  const width = Math.max(row0.length, row1.length);
  const fill = (row) => Array.from({ length: width }, (_, i) => row[i] ?? "");
  const rows = data.map((values) => {
    const row = [];
    for (const [k, v] of Object.entries(values)) row[at[k]] = v;
    return fill(row);
  });
  return [fill(row0), fill(row1), ...rows];
}

/** DISTRICTS keeps its condition header in row 1 (the section-title row). */
function districtRows(entries) {
  return [
    ["District", "Condition", "Export Range for Toronto Rising API .csv Files", ""],
    ["", "", "key", "NAME"],
    ...entries.map(([key, name, cond]) => ["", cond, key, name]),
  ];
}

const TTS = "Parsing for TTS Output";
const SITE_SECTIONS = [
  ["Conditions", ["Condition"]],
  ["Data Processing for CSV Export", ["Key", "District"]],
  [TTS, ["name", "Skybox", "district", "soundscape\nmusic", "soundscape\nlocation", "is\nindoors", "Weather\nDucking", "LightMode", "Top Fog", "map\nlocation"]],
  ["COPY COLUMN>", ["Combined"]],
];

function siteRow(key, overrides = {}) {
  const base = {
    "Data Processing for CSV Export/Key": key,
    [`${TTS}/name`]: `    name = "${key} Name",`,
    [`${TTS}/Skybox`]: "",
    [`${TTS}/district`]: "    district = C.Districts.Annex,",
    [`${TTS}/soundscape\nmusic`]: "",
    [`${TTS}/soundscape\nlocation`]: '      location = {playlist = "location", track = "diveBar"}\n    },',
    [`${TTS}/is\nindoors`]: "    isIndoors = true,",
    [`${TTS}/Weather\nDucking`]: "    weatherDucking = 0.4,",
    [`${TTS}/LightMode`]: '    lightMode = "IndoorDim",',
    [`${TTS}/Top Fog`]: "    topFog = false,",
    [`${TTS}/map\nlocation`]: "",
  };
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides)) out[k.includes("/") ? k : `${TTS}/${k}`] = v;
  return out;
}

test("districts: key, title-cased NAME and implemented conditions only", () => {
  const { districts, warnings } = parseDistrictRows(
    districtRows([
      ["Sewers", "the Sewers", ""],
      ["Annex", "the Annex", "bestialNull|launchBonus2"],
      ["", "", ""],
    ]),
    CATALOGS,
  );
  assert.deepEqual(districts, [
    { key: "Annex", name: "The Annex", conditions: ["bestialNull"] },
    { key: "Sewers", name: "The Sewers", conditions: [] },
  ]);
  assert.match(warnings[0], /Annex: skipped condition\(s\) .*launchBonus2/);
});

test("sites: reads the TTS output fragments", () => {
  const rows = sheet(SITE_SECTIONS, [
    siteRow("AnarchBar", {
      Skybox: '    skybox = "AnarchBar",',
      "soundscape\nmusic": '      backgroundMusic = {playlist = "casaLoma"},',
      "Top Fog": "    topFog = true,",
      "map\nlocation": '    offsetXY = "\u221212.5 40"',
      "Conditions/Condition": "bumpBloodPotency",
    }),
    siteRow("Alley", { district: "", "is\nindoors": "    isIndoors = false,", "Weather\nDucking": "    weatherDucking = 1," }),
    { "Data Processing for CSV Export/District": "hub row without a key" },
  ]);
  const { sites, warnings } = parseSiteRows(rows, CATALOGS);
  assert.deepEqual(warnings, []);
  assert.deepEqual(sites[1], {
    key: "AnarchBar",
    name: "AnarchBar Name",
    skybox: "AnarchBar",
    districtKey: "Annex",
    backgroundMusic: "casaLoma",
    locationTrack: "diveBar",
    isIndoors: true,
    weatherDucking: 0.4,
    isTopFogActive: true,
    offsetXY: "-12.5 40",
    conditions: ["bumpBloodPotency"],
  });
  assert.equal(sites[0].key, "Alley");
  assert.equal(sites[0].districtKey, null);
  assert.equal(sites[0].isIndoors, false);
});

test("sites: accent-free keys, track aliases and missing playlists warn", () => {
  const rows = sheet(SITE_SECTIONS, [
    siteRow("WarrensFom\u00f3rach", {
      district: "    district = C.Districts.Sewers,",
      "soundscape\nmusic": '      backgroundMusic = {playlist = "nosWarrens"},',
      "soundscape\nlocation": '      location = {playlist = "location", track = "warrensSafe"}\n    },',
    }),
  ]);
  const { sites, warnings } = parseSiteRows(rows, CATALOGS);
  assert.equal(sites[0].key, "WarrensFomorach");
  assert.equal(sites[0].locationTrack, "warrens");
  assert.equal(sites[0].backgroundMusic, null);
  assert.equal(warnings.length, 3);
});

test("sites: unknown catalog values fail loudly", () => {
  const bad = (overrides, pattern) =>
    assert.throws(() => parseSiteRows(sheet(SITE_SECTIONS, [siteRow("X", overrides)]), CATALOGS), pattern);
  bad({ Skybox: '    skybox = "Nope",' }, /skybox "Nope"/);
  bad({ district: "    district = C.Districts.Nowhere," }, /district "Nowhere"/);
  bad({ "soundscape\nlocation": '      location = {playlist = "location", track = "nope"}' }, /location track "nope"/);
  bad({ "soundscape\nmusic": '      backgroundMusic = {playlist = "nope"},' }, /background music "nope"/);
  bad({ "is\nindoors": "" }, /isIndoors: missing value/);
  bad({ "Weather\nDucking": "    weatherDucking = 2," }, /between 0 and 1/);
});

test("render: districts first, sites reference Districts.<key>", () => {
  const lua = renderLocationsCatalogLua({
    districts: [{ key: "Annex", name: "The Annex", conditions: ["bestialNull"] }],
    sites: [
      {
        key: "AnarchBar",
        name: 'Anarch "Dive" Bar',
        skybox: null,
        districtKey: "Annex",
        backgroundMusic: null,
        locationTrack: "diveBar",
        isIndoors: true,
        weatherDucking: 0.4,
        isTopFogActive: false,
        offsetXY: null,
        conditions: [],
      },
    ],
  });
  assert.match(lua, /local Districts = \{\n {2}Annex = \{\n {4}name = "The Annex",\n {4}conditions = \{ "bestialNull" \},\n {2}\},\n\}/);
  assert.match(lua, /name = "Anarch \\"Dive\\" Bar",\n {4}district = Districts\.Annex,/);
  assert.match(lua, /return LocationsCatalog\n$/);
});
