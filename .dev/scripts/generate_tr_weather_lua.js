/**
 * Embeds `lib/json/Weather.json` into `lib/tr_weather_schedule.ttslua` as `TRWeatherSchedule.DATA`.
 * Five-character hourly codes are validated against `C.WEATHER` in `lib/constants.ttslua`.
 *
 * Run from repo root: node .dev/scripts/generate_tr_weather_lua.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const jsonPath = path.join(root, "lib", "json", "Weather.json");
const constantsPath = path.join(root, "lib", "constants.ttslua");
const outPath = path.join(root, "lib", "tr_weather_schedule.ttslua");

const HOURS_PER_DAY = 24;
const MONTH_MIN = 1;
const MONTH_MAX = 12;

/**
 * @param {string} luaSource
 * @param {string} tableName
 * @param {string} nextTableName
 * @returns {string}
 */
function sliceWeatherSubTable(luaSource, tableName, nextTableName) {
  const open = `${tableName} = {`;
  const start = luaSource.indexOf(open);
  if (start < 0) {
    throw new Error(`C.WEATHER.${tableName} not found in lib/constants.ttslua`);
  }
  const bodyStart = start + open.length;
  const nextIdx = luaSource.indexOf(`${nextTableName} = {`, bodyStart);
  if (nextIdx < 0) {
    throw new Error(`C.WEATHER.${nextTableName} not found after ${tableName} in lib/constants.ttslua`);
  }
  return luaSource.slice(bodyStart, nextIdx);
}

/**
 * @param {string} constantsSource
 * @returns {{
 *   base: Set<string>,
 *   temperatureDelta: Set<string>,
 *   humidity: Set<string>,
 *   wind: Set<string>,
 * }}
 */
function loadWeatherValidationSets(constantsSource) {
  const weatherStart = constantsSource.indexOf("C.WEATHER = {");
  if (weatherStart < 0) {
    throw new Error("C.WEATHER not found in lib/constants.ttslua");
  }
  const weatherEnd = constantsSource.indexOf("-- #endregion", weatherStart);
  if (weatherEnd < 0) {
    throw new Error("C.WEATHER region end not found in lib/constants.ttslua");
  }
  const weatherBlock = constantsSource.slice(weatherStart, weatherEnd);

  const baseBody = sliceWeatherSubTable(weatherBlock, "Base", "TemperatureDelta");
  const tempBody = sliceWeatherSubTable(weatherBlock, "TemperatureDelta", "Humidity");
  const humidityBody = sliceWeatherSubTable(weatherBlock, "Humidity", "Wind");
  const windEnd = weatherBlock.lastIndexOf("  }");
  const windOpen = weatherBlock.indexOf("Wind = {");
  if (windOpen < 0) {
    throw new Error("C.WEATHER.Wind not found in lib/constants.ttslua");
  }
  const windBody = weatherBlock.slice(windOpen + "Wind = {".length, windEnd);

  /** @type {Set<string>} */
  const base = new Set();
  const baseKeyRe = /^\s+([a-z]{2})\s*=\s*\{/gim;
  let m = baseKeyRe.exec(baseBody);
  while (m !== null) {
    base.add(m[1]);
    m = baseKeyRe.exec(baseBody);
  }
  if (base.size === 0) {
    throw new Error("No C.WEATHER.Base keys parsed from lib/constants.ttslua");
  }

  /** @type {Set<string>} */
  const temperatureDelta = new Set();
  const tempKeyRe = /^\s+(?:\["([^"]+)"\]|([A-Za-z]))\s*=/gm;
  m = tempKeyRe.exec(tempBody);
  while (m !== null) {
    temperatureDelta.add(m[1] !== undefined ? m[1] : m[2]);
    m = tempKeyRe.exec(tempBody);
  }
  if (temperatureDelta.size === 0) {
    throw new Error("No C.WEATHER.TemperatureDelta keys parsed from lib/constants.ttslua");
  }

  /** @type {Set<string>} */
  const humidity = new Set();
  const humidityKeyRe = /^\s+([a-zA-Z0-9])\s*=/gm;
  m = humidityKeyRe.exec(humidityBody);
  while (m !== null) {
    humidity.add(m[1]);
    m = humidityKeyRe.exec(humidityBody);
  }
  if (humidity.size === 0) {
    throw new Error("No C.WEATHER.Humidity keys parsed from lib/constants.ttslua");
  }

  /** @type {Set<string>} */
  const wind = new Set();
  const windKeyRe = /^\s+([a-z])\s*=\s*\{/gim;
  m = windKeyRe.exec(windBody);
  while (m !== null) {
    wind.add(m[1]);
    m = windKeyRe.exec(windBody);
  }
  if (wind.size === 0) {
    throw new Error("No C.WEATHER.Wind keys parsed from lib/constants.ttslua");
  }

  return { base, temperatureDelta, humidity, wind };
}

/** @type {ReturnType<typeof loadWeatherValidationSets>} */
const WEATHER_KEYS = loadWeatherValidationSets(fs.readFileSync(constantsPath, "utf8"));

/**
 * @param {string} s
 * @returns {string}
 */
function luaString(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * @param {string} code
 * @param {string} context
 */
function validateWeatherCode(code, context) {
  if (typeof code !== "string" || code.length !== 5) {
    throw new Error(`${context}: expected 5-character code, got ${JSON.stringify(code)}`);
  }

  const base = code.slice(0, 2);
  const temp = code[2];
  const humidity = code[3];
  const wind = code[4];

  if (!WEATHER_KEYS.base.has(base)) {
    throw new Error(
      `${context}: invalid base weather "${base}" (chars 1–2) in ${JSON.stringify(code)}; ` +
        `expected one of: ${[...WEATHER_KEYS.base].sort().join(", ")}`,
    );
  }
  if (!WEATHER_KEYS.temperatureDelta.has(temp)) {
    throw new Error(
      `${context}: invalid temperature delta "${temp}" (char 3) in ${JSON.stringify(code)}; ` +
        `expected one of: ${[...WEATHER_KEYS.temperatureDelta].sort().join(", ")}`,
    );
  }
  if (!WEATHER_KEYS.humidity.has(humidity)) {
    throw new Error(
      `${context}: invalid humidity "${humidity}" (char 4) in ${JSON.stringify(code)}; ` +
        `expected one of: ${[...WEATHER_KEYS.humidity].sort().join(", ")}`,
    );
  }
  if (!WEATHER_KEYS.wind.has(wind)) {
    throw new Error(
      `${context}: invalid wind "${wind}" (char 5) in ${JSON.stringify(code)}; ` +
        `expected one of: ${[...WEATHER_KEYS.wind].sort().join(", ")}`,
    );
  }
}

/**
 * @param {unknown} raw
 * @param {string} context
 * @returns {number}
 */
function parseAvgTemp(raw, context) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${context}: avgTemp must be numeric, got ${JSON.stringify(raw)}`);
  }
  return Math.trunc(n);
}

/**
 * @param {Record<string, { avgTemp: string, weather: Record<string, string[]> }>} data
 * @returns {{ monthCount: number, dayCount: number, slotCount: number }}
 */
function validateAndSummarize(data) {
  let monthCount = 0;
  let dayCount = 0;
  let slotCount = 0;

  for (let month = MONTH_MIN; month <= MONTH_MAX; month += 1) {
    const monthKey = String(month);
    const monthEntry = data[monthKey];
    const monthCtx = `Month ${month}`;
    if (monthEntry === undefined || typeof monthEntry !== "object" || monthEntry === null) {
      throw new Error(`Missing month entry ${monthKey} in Weather.json`);
    }
    parseAvgTemp(monthEntry.avgTemp, `${monthCtx} avgTemp`);
    const byDay = monthEntry.weather;
    if (typeof byDay !== "object" || byDay === null) {
      throw new Error(`${monthCtx}: weather must be an object`);
    }

    const days = Object.keys(byDay)
      .map((k) => Number(k))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
    if (days.length === 0) {
      throw new Error(`${monthCtx}: weather has no day entries`);
    }
    days.sort((a, b) => a - b);

    monthCount += 1;
    for (const day of days) {
      const dayKey = String(day);
      const hours = byDay[dayKey];
      const dayCtx = `${monthCtx} Day ${day}`;
      if (!Array.isArray(hours)) {
        throw new Error(`${dayCtx}: expected array of hourly codes`);
      }
      if (hours.length !== HOURS_PER_DAY) {
        throw new Error(`${dayCtx}: expected ${HOURS_PER_DAY} hours, got ${hours.length}`);
      }
      for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
        validateWeatherCode(hours[hour], `${dayCtx} Hour ${hour}`);
      }
      dayCount += 1;
      slotCount += HOURS_PER_DAY;
    }
  }

  return { monthCount, dayCount, slotCount };
}

/**
 * @param {string[]} hours
 * @returns {string}
 */
function formatHourArray(hours) {
  return `{ ${hours.map((code) => luaString(code)).join(", ")} }`;
}

/**
 * @param {number} month
 * @param {{ avgTemp: string, weather: Record<string, string[]> }} monthEntry
 * @returns {string}
 */
function formatMonthBlock(month, monthEntry) {
  const lines = [];
  const avgTemp = parseAvgTemp(monthEntry.avgTemp, `Month ${month} avgTemp`);
  lines.push(`  [${month}] = {`);
  lines.push(`    avgTemp = ${avgTemp},`);
  lines.push("    weather = {");

  const days = Object.keys(monthEntry.weather)
    .map((k) => Number(k))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);

  for (const day of days) {
    const hours = monthEntry.weather[String(day)];
    lines.push(`      [${day}] = ${formatHourArray(hours)},`);
  }

  lines.push("    }");
  lines.push("  },");
  return lines.join("\n");
}

const jsonRaw = fs.readFileSync(jsonPath, "utf8");
/** @type {Record<string, { avgTemp: string, weather: Record<string, string[]> }>} */
const weatherData = JSON.parse(jsonRaw);
const summary = validateAndSummarize(weatherData);

const out = [];
out.push(`--[[
    Toronto Rising — chronicle hourly weather schedule (month / day / hour codes).
    AUTO-GENERATED from lib/json/Weather.json — DO NOT EDIT BY HAND.
    Regenerate: node .dev/scripts/generate_tr_weather_lua.js
    Code format: see C.WEATHER in lib/constants.ttslua.
]]

local TRWeatherSchedule = {}

TRWeatherSchedule.DATA = {
`);

for (let month = MONTH_MIN; month <= MONTH_MAX; month += 1) {
  out.push(`${formatMonthBlock(month, weatherData[String(month)])}\n`);
}

out.push(`}

TRWeatherSchedule.ROW_COUNT = ${summary.slotCount}

return TRWeatherSchedule
`);

fs.writeFileSync(outPath, out.join(""), "utf8");
console.log(
  "Wrote",
  outPath,
  `(${summary.monthCount} months, ${summary.dayCount} days, ${summary.slotCount} hourly slots, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`,
);
