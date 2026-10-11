"use strict";

/**
 * Pure helpers: Toronto Rising sheet WEATHER tab → `lib/tr_weather_schedule.ttslua`.
 *
 * Tab layout (row-per-day): the header row has `DayCodes` above the column of quoted hourly codes;
 * the three columns to its left hold month, month average temperature (°C) and day.
 * Codes are validated against `C.WEATHER` in `lib/constants.ttslua`.
 */

const HOURS_PER_DAY = 24;
const MONTH_COUNT = 12;
const CODES_HEADER = "DayCodes";

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
 * @param {string} body
 * @param {RegExp} re
 * @param {string} label
 * @returns {Set<string>}
 */
function collectKeys(body, re, label) {
  const keys = new Set();
  for (const m of body.matchAll(re)) {
    keys.add(m[1] !== undefined ? m[1] : m[2]);
  }
  if (keys.size === 0) {
    throw new Error(`No C.WEATHER.${label} keys parsed from lib/constants.ttslua`);
  }
  return keys;
}

/**
 * @param {string} constantsSource
 * @returns {{ base: Set<string>, temperatureDelta: Set<string>, humidity: Set<string>, wind: Set<string> }}
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
  const windOpen = weatherBlock.indexOf("Wind = {");
  if (windOpen < 0) {
    throw new Error("C.WEATHER.Wind not found in lib/constants.ttslua");
  }
  const windBody = weatherBlock.slice(windOpen + "Wind = {".length, weatherBlock.lastIndexOf("  }"));

  return {
    base: collectKeys(sliceWeatherSubTable(weatherBlock, "Base", "TemperatureDelta"), /^\s+([a-z]{2})\s*=\s*\{/gim, "Base"),
    temperatureDelta: collectKeys(
      sliceWeatherSubTable(weatherBlock, "TemperatureDelta", "Humidity"),
      /^\s+(?:\["([^"]+)"\]|([A-Za-z]))\s*=/gm,
      "TemperatureDelta",
    ),
    humidity: collectKeys(sliceWeatherSubTable(weatherBlock, "Humidity", "Wind"), /^\s+([a-zA-Z0-9])\s*=/gm, "Humidity"),
    wind: collectKeys(windBody, /^\s+([a-z])\s*=\s*\{/gim, "Wind"),
  };
}

/**
 * @param {string} code
 * @param {ReturnType<typeof loadWeatherValidationSets>} keys
 * @param {string} context
 */
function validateWeatherCode(code, keys, context) {
  if (code.length !== 5) {
    throw new Error(`${context}: expected 5-character code, got ${JSON.stringify(code)}`);
  }
  const parts = [
    ["base weather (chars 1–2)", code.slice(0, 2), keys.base],
    ["temperature delta (char 3)", code[2], keys.temperatureDelta],
    ["humidity (char 4)", code[3], keys.humidity],
    ["wind (char 5)", code[4], keys.wind],
  ];
  for (const [label, value, allowed] of parts) {
    if (!allowed.has(value)) {
      throw new Error(
        `${context}: invalid ${label} "${value}" in ${JSON.stringify(code)}; expected one of: ${[...allowed].sort().join(", ")}`,
      );
    }
  }
}

/**
 * @param {string[][]} rows parsed CSV of the whole WEATHER tab
 * @param {ReturnType<typeof loadWeatherValidationSets>} keys
 * @returns {{ month: number, avgTemp: number, days: string[][] }[]} months 1–12, days 1–N in order
 */
function parseWeatherSheetRows(rows, keys) {
  let codesCol = -1;
  for (const row of rows) {
    codesCol = row.findIndex((cell) => String(cell).trim() === CODES_HEADER);
    if (codesCol >= 0) break;
  }
  if (codesCol < 3) {
    throw new Error(`WEATHER tab: no "${CODES_HEADER}" header with month / avgTemp / day columns to its left.`);
  }
  const monthCol = codesCol - 3;
  const avgCol = codesCol - 2;
  const dayCol = codesCol - 1;

  /** @type {Map<number, { avgTemp: number, days: Map<number, string[]> }>} */
  const byMonth = new Map();
  for (const row of rows) {
    const list = String(row[codesCol] ?? "");
    const month = Number(row[monthCol]);
    const day = Number(row[dayCol]);
    if (!list.includes('"') || !Number.isInteger(month) || !Number.isInteger(day)) continue;
    const ctx = `WEATHER month ${month} day ${day}`;
    if (month < 1 || month > MONTH_COUNT || day < 1 || day > 31) {
      throw new Error(`${ctx}: month or day out of range.`);
    }
    const avgTemp = Number(String(row[avgCol]).trim());
    if (String(row[avgCol]).trim() === "" || !Number.isFinite(avgTemp)) {
      throw new Error(`${ctx}: average temperature must be numeric, got ${JSON.stringify(row[avgCol])}`);
    }
    const codes = [...list.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (codes.length !== HOURS_PER_DAY) {
      throw new Error(`${ctx}: expected ${HOURS_PER_DAY} hourly codes, got ${codes.length}`);
    }
    codes.forEach((code, hour) => validateWeatherCode(code, keys, `${ctx} hour ${hour}`));

    let entry = byMonth.get(month);
    if (!entry) {
      entry = { avgTemp: Math.trunc(avgTemp), days: new Map() };
      byMonth.set(month, entry);
    } else if (entry.avgTemp !== Math.trunc(avgTemp)) {
      throw new Error(`${ctx}: average temperature ${avgTemp} differs from earlier days (${entry.avgTemp}).`);
    }
    if (entry.days.has(day)) {
      throw new Error(`${ctx}: duplicate day.`);
    }
    entry.days.set(day, codes);
  }

  const months = [];
  for (let month = 1; month <= MONTH_COUNT; month += 1) {
    const entry = byMonth.get(month);
    if (!entry) {
      throw new Error(`WEATHER tab: month ${month} has no day rows.`);
    }
    const days = [];
    for (let day = 1; day <= entry.days.size; day += 1) {
      const codes = entry.days.get(day);
      if (!codes) {
        throw new Error(`WEATHER tab: month ${month} is missing day ${day}.`);
      }
      days.push(codes);
    }
    if (days.length < 28) {
      throw new Error(`WEATHER tab: month ${month} has only ${days.length} days.`);
    }
    months.push({ month, avgTemp: entry.avgTemp, days });
  }
  return months;
}

/**
 * @param {ReturnType<typeof parseWeatherSheetRows>} months
 * @returns {string}
 */
function renderWeatherScheduleLua(months) {
  const q = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  let slotCount = 0;
  const out = [];
  out.push(`--[[
    Toronto Rising — chronicle hourly weather schedule (month / day / hour codes).
    AUTO-GENERATED from the WEATHER tab of the Toronto Rising Google Sheet — DO NOT EDIT BY HAND.
    Regenerate: npm run weather:import
    Code format: see C.WEATHER in lib/constants.ttslua.
]]

local TRWeatherSchedule = {}

TRWeatherSchedule.DATA = {
`);
  for (const { month, avgTemp, days } of months) {
    const lines = [`  [${month}] = {`, `    avgTemp = ${avgTemp},`, "    weather = {"];
    days.forEach((codes, i) => {
      lines.push(`      [${i + 1}] = { ${codes.map(q).join(", ")} },`);
      slotCount += codes.length;
    });
    lines.push("    }", "  },");
    out.push(`${lines.join("\n")}\n`);
  }
  out.push(`}

TRWeatherSchedule.ROW_COUNT = ${slotCount}

return TRWeatherSchedule
`);
  return out.join("");
}

module.exports = {
  loadWeatherValidationSets,
  parseWeatherSheetRows,
  renderWeatherScheduleLua,
};
