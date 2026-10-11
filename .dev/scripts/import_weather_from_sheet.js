"use strict";

/**
 * Toronto Rising sheet WEATHER tab → lib/tr_weather_schedule.ttslua.
 *
 * Run from repo root: npm run weather:import
 */

const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./lib/skyboxes_sheet_csv.js");
const { SHEET_IDS, fetchTabCsv, writeAtomic } = require("./lib/google_sheet_fetch.js");
const {
  loadWeatherValidationSets,
  parseWeatherSheetRows,
  renderWeatherScheduleLua,
} = require("./lib/weather_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "tr_weather_schedule.ttslua");

async function main() {
  console.log("[weather:import] Fetching Toronto Rising › WEATHER …");
  const csv = await fetchTabCsv(SHEET_IDS.torontoRising, "WEATHER", "toronto-rising-tts-weather-import/1.0");
  const keys = loadWeatherValidationSets(fs.readFileSync(path.join(root, "lib", "constants.ttslua"), "utf8"));
  const months = parseWeatherSheetRows(parseCsv(csv), keys);
  writeAtomic(outPath, renderWeatherScheduleLua(months));
  const dayCount = months.reduce((n, m) => n + m.days.length, 0);
  console.log(`[weather:import] Wrote ${path.relative(root, outPath)} (${months.length} months, ${dayCount} days)`);
}

main().catch((err) => {
  console.error(`[weather:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
