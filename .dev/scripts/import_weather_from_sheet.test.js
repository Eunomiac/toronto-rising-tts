"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  loadWeatherValidationSets,
  parseWeatherSheetRows,
  renderWeatherScheduleLua,
} = require("./lib/weather_sheet_csv.js");

const keys = loadWeatherValidationSets(
  fs.readFileSync(path.resolve(__dirname, "..", "..", "lib", "constants.ttslua"), "utf8"),
);

const CLEAR = "xxoxs";

/** @param {number} month @param {number} avg @param {number} day @param {string[]} codes */
const dayRow = (month, avg, day, codes) => ["", String(month), String(avg), String(day), codes.map((c) => `"${c}"`).join(", ")];

/** Header row plus 28 clear days for every month. */
function fixtureRows() {
  const rows = [["", "", "", "", "DayCodes"]];
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= 28; day += 1) {
      rows.push(dayRow(month, month - 6, day, Array(24).fill(CLEAR)));
    }
  }
  return rows;
}

test("parses month / avgTemp / day / codes relative to the DayCodes header", () => {
  const months = parseWeatherSheetRows(fixtureRows(), keys);
  assert.equal(months.length, 12);
  assert.equal(months[0].avgTemp, -5);
  assert.equal(months[0].days.length, 28);
  assert.deepEqual(months[11].days[27], Array(24).fill(CLEAR));
});

test("renders TRWeatherSchedule with a slot count", () => {
  const lua = renderWeatherScheduleLua(parseWeatherSheetRows(fixtureRows(), keys));
  assert.match(lua, /\[1\] = \{\n {4}avgTemp = -5,/);
  assert.match(lua, /TRWeatherSchedule\.ROW_COUNT = 8064\n/);
});

test("rejects codes that C.WEATHER cannot decode", () => {
  const rows = fixtureRows();
  rows[5] = dayRow(1, -5, 5, [...Array(23).fill(CLEAR), "qqoxs"]);
  assert.throws(() => parseWeatherSheetRows(rows, keys), /month 1 day 5 hour 23: invalid base weather/);
});

test("rejects a day with the wrong number of hours", () => {
  const rows = fixtureRows();
  rows[3] = dayRow(1, -5, 3, Array(23).fill(CLEAR));
  assert.throws(() => parseWeatherSheetRows(rows, keys), /expected 24 hourly codes, got 23/);
});

test("rejects a missing day", () => {
  const rows = fixtureRows().filter((row) => !(row[1] === "2" && row[3] === "14"));
  assert.throws(() => parseWeatherSheetRows(rows, keys), /month 2 is missing day 14|month 2 has only/);
});
