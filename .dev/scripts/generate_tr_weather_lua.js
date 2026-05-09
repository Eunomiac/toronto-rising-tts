/**
 * Converts `.dev/Chronicle Data/TR_Weather.csv` into `lib/tr_weather_schedule.ttslua`.
 * Validates Wind/Rain keys against `lib/soundscape_catalog.ttslua` weather tracks ("none" allowed).
 *
 * Run from repo root: node .dev/scripts/generate_tr_weather_lua.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const csvPath = path.join(root, ".dev", "Chronicle Data", "TR_Weather.csv");
const catalogPath = path.join(root, "lib", "soundscape_catalog.ttslua");
const outPath = path.join(root, "lib", "tr_weather_schedule.ttslua");

/**
 * @param {string} luaSource
 * @param {"rain"|"wind"} subType
 * @returns {Set<string>}
 */
function extractCatalogWeatherKeys(luaSource, subType) {
  const keys = new Set();
  // Anchor to catalog layout: key line immediately after `{`, then type/subType for weather.
  const re =
    /\r?\n\s{2}(\w+)\s*=\s*\{\s*\r?\n\s+key\s*=\s*"([^"]+)",\s*\r?\n\s+type\s*=\s*"weather",\s*\r?\n\s+subType\s*=\s*"([^"]+)"/g;
  let m = re.exec(luaSource);
  while (m !== null) {
    if (m[3] === subType) {
      keys.add(m[1]);
    }
    m = re.exec(luaSource);
  }
  return keys;
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  return line.split(",").map((cell) => cell.trim());
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
function parseThunder(raw) {
  const u = String(raw || "").trim().toUpperCase();
  if (u === "TRUE" || u === "1" || u === "YES") {
    return true;
  }
  if (u === "FALSE" || u === "" || u === "0" || u === "NO") {
    return false;
  }
  throw new Error(`Invalid Thunder value (expected TRUE/FALSE): "${raw}"`);
}

/**
 * @param {string} key
 * @param {Set<string>} allowed
 * @param {string} column
 */
function validateTrackKey(key, allowed, column) {
  if (key === "none") {
    return;
  }
  if (!allowed.has(key)) {
    throw new Error(`${column}: unknown catalog key "${key}"`);
  }
}

/**
 * @param {string} s
 * @returns {string}
 */
function luaString(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const catalogSrc = fs.readFileSync(catalogPath, "utf8");
const rainKeys = extractCatalogWeatherKeys(catalogSrc, "rain");
const windKeys = extractCatalogWeatherKeys(catalogSrc, "wind");

const csvRaw = fs.readFileSync(csvPath, "utf8");
const lines = csvRaw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
const header = splitCsvLine(lines[0] || "");
const expected = ["Month", "Day", "Hour", "Wind", "Rain", "Thunder"];
for (let i = 0; i < expected.length; i++) {
  if (header[i] !== expected[i]) {
    throw new Error(
      `Unexpected CSV header at column ${i + 1}: got "${header[i]}", want "${expected[i]}"`,
    );
  }
}

/** @type {Map<string, { month: number, day: number, hour: number, wind: string, rain: string, thunder: boolean }>} */
const bySlot = new Map();

for (let li = 1; li < lines.length; li++) {
  const line = lines[li];
  if (line === undefined || line.trim() === "") {
    continue;
  }
  const parts = splitCsvLine(line);
  if (parts.length < 6) {
    throw new Error(`Line ${li + 1}: expected 6 columns, got ${parts.length}`);
  }
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const hour = Number(parts[2]);
  let wind = String(parts[3] || "").trim();
  let rain = String(parts[4] || "").trim();
  const thunder = parseThunder(parts[5]);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Line ${li + 1}: invalid Month ${parts[0]}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`Line ${li + 1}: invalid Day ${parts[1]}`);
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`Line ${li + 1}: invalid Hour ${parts[2]}`);
  }

  if (wind === "") {
    wind = "none";
  }
  if (rain === "") {
    rain = "none";
  }

  validateTrackKey(wind, windKeys, "Wind");
  validateTrackKey(rain, rainKeys, "Rain");

  const slotKey = `${month}|${day}|${hour}`;
  if (bySlot.has(slotKey)) {
    throw new Error(`Line ${li + 1}: duplicate slot Month=${month} Day=${day} Hour=${hour}`);
  }
  bySlot.set(slotKey, { month, day, hour, wind, rain, thunder });
}

const rows = Array.from(bySlot.values());
rows.sort((a, b) => {
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  if (a.day !== b.day) {
    return a.day - b.day;
  }
  return a.hour - b.hour;
});

/** @type {Map<number, Map<number, Map<number, typeof rows[0]>>>} */
const nested = new Map();
for (const row of rows) {
  if (!nested.has(row.month)) {
    nested.set(row.month, new Map());
  }
  const byDay = nested.get(row.month);
  if (!byDay.has(row.day)) {
    byDay.set(row.day, new Map());
  }
  byDay.get(row.day).set(row.hour, row);
}

const out = [];
out.push(`--[[
    Toronto Rising — chronicle hourly weather schedule (nested lookup by month / day / hour).
    AUTO-GENERATED from .dev/Chronicle Data/TR_Weather.csv — DO NOT EDIT BY HAND.
    Regenerate: node .dev/scripts/generate_tr_weather_lua.js
]]

local TRWeatherSchedule = {}

TRWeatherSchedule.DATA = {
`);

const months = Array.from(nested.keys()).sort((a, b) => a - b);
for (const m of months) {
  out.push(`  [${m}] = {\n`);
  const byDay = nested.get(m);
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);
  for (const d of days) {
    out.push(`    [${d}] = {\n`);
    const byHour = byDay.get(d);
    const hours = Array.from(byHour.keys()).sort((a, b) => a - b);
    for (const h of hours) {
      const r = byHour.get(h);
      const th = r.thunder ? "true" : "false";
      out.push(
        `      [${h}] = { wind = ${luaString(r.wind)}, rain = ${luaString(r.rain)}, thunder = ${th} },\n`,
      );
    }
    out.push(`    },\n`);
  }
  out.push(`  },\n`);
}

out.push(`}

TRWeatherSchedule.ROW_COUNT = ${rows.length}

return TRWeatherSchedule
`);

fs.writeFileSync(outPath, out.join(""), "utf8");
console.log(
  "Wrote",
  outPath,
  "(" + rows.length + " rows, " + (fs.statSync(outPath).size / 1024).toFixed(1) + " KB)",
);
