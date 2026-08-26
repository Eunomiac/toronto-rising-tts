"use strict";

/**
 * Fetch public Google Sheet CSV ranges → lib/skyboxes_catalog.ttslua (TOR-422, TOR-510).
 *
 * Run from repo root: node .dev/scripts/import_skyboxes_from_sheet.js
 * Prefer: npm run skyboxes:import (also regenerates Scenes location modals)
 */

const fs = require("fs");
const path = require("path");
const {
  parseSkyboxCatalogRows,
  parseGenericSkyboxRows,
  parseMemoriamSkyboxRows,
  renderSkyboxesCatalogLua,
} = require("./lib/skyboxes_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "skyboxes_catalog.ttslua");

const DEFAULT_SHEET_ID = "1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4";
const DEFAULT_CATALOG_RANGE = "SKYBOXCSV";
const DEFAULT_GENERICS_RANGE = "SKYBOXGENERICCSV";
const DEFAULT_MEMORIAM_RANGE = "SKYBOXMEMORIAMCSV";

/**
 * @param {string[]} argv
 * @returns {{ sheetId: string, catalogRange: string, genericsRange: string, memoriamRange: string }}
 */
function parseArgs(argv) {
  let sheetId = process.env.SKYBOX_SHEET_ID || DEFAULT_SHEET_ID;
  let catalogRange = process.env.SKYBOX_CATALOG_RANGE || DEFAULT_CATALOG_RANGE;
  let genericsRange = process.env.SKYBOX_GENERICS_RANGE || DEFAULT_GENERICS_RANGE;
  let memoriamRange = process.env.SKYBOX_MEMORIAM_RANGE || DEFAULT_MEMORIAM_RANGE;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--sheet-id" && argv[i + 1]) {
      sheetId = argv[i + 1];
      i += 1;
    } else if (a === "--catalog-range" && argv[i + 1]) {
      catalogRange = argv[i + 1];
      i += 1;
    } else if (a === "--generics-range" && argv[i + 1]) {
      genericsRange = argv[i + 1];
      i += 1;
    } else if (a === "--memoriam-range" && argv[i + 1]) {
      memoriamRange = argv[i + 1];
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/import_skyboxes_from_sheet.js [options]

Options:
  --sheet-id <id>           Spreadsheet id (default / env SKYBOX_SHEET_ID)
  --catalog-range <name>    Named range for Key,Display,isShown,URL (default SKYBOXCSV)
  --generics-range <name>   Named range for URL list (default SKYBOXGENERICCSV)
  --memoriam-range <name>   Named range for Memoriam panels (default SKYBOXMEMORIAMCSV)
`);
      process.exit(0);
    }
  }

  return { sheetId, catalogRange, genericsRange, memoriamRange };
}

/**
 * @param {string} sheetId
 * @param {string} rangeName
 * @returns {string}
 */
function exportCsvUrl(sheetId, rangeName) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&range=${encodeURIComponent(rangeName)}`;
}

/**
 * @param {string} url
 * @param {string} label
 * @returns {Promise<string>}
 */
async function fetchCsv(url, label) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "toronto-rising-tts-skyboxes-import/1.0" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status} from ${url}`);
  }
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("Sign in to your Google Account") ||
    trimmed.includes("Cannot load spreadsheet")
  ) {
    throw new Error(
      `${label}: response looks like HTML/login/error, not CSV. Check sheet sharing (anyone with link can view) and range name. URL: ${url}`,
    );
  }
  if (trimmed.length < 1) {
    throw new Error(`${label}: empty body from ${url}`);
  }
  return text;
}

/**
 * @param {string} filePath
 * @param {string} contents
 */
function writeAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, filePath);
}

async function main() {
  const { sheetId, catalogRange, genericsRange, memoriamRange } = parseArgs(process.argv.slice(2));
  const catalogUrl = exportCsvUrl(sheetId, catalogRange);
  const genericsUrl = exportCsvUrl(sheetId, genericsRange);
  const memoriamUrl = exportCsvUrl(sheetId, memoriamRange);

  console.log(`[skyboxes:import] Fetching ${catalogRange} …`);
  const catalogCsv = await fetchCsv(catalogUrl, catalogRange);
  console.log(`[skyboxes:import] Fetching ${genericsRange} …`);
  const genericsCsv = await fetchCsv(genericsUrl, genericsRange);
  console.log(`[skyboxes:import] Fetching ${memoriamRange} …`);
  const memoriamCsv = await fetchCsv(memoriamUrl, memoriamRange);

  const skyboxes = parseSkyboxCatalogRows(catalogCsv);
  const generics = parseGenericSkyboxRows(genericsCsv);
  const memoriam = parseMemoriamSkyboxRows(memoriamCsv);

  const lua = renderSkyboxesCatalogLua({
    skyboxes,
    generics,
    memoriam,
    meta: { sheetId, catalogRange, genericsRange, memoriamRange },
  });

  writeAtomic(outPath, lua);
  const memoriamCharacters = Object.keys(memoriam).length;
  let memoriamEntries = 0;
  for (const character of Object.keys(memoriam)) {
    memoriamEntries += Object.keys(memoriam[character]).length;
  }
  console.log(
    `[skyboxes:import] Wrote ${path.relative(root, outPath)} (${skyboxes.length} skyboxes, ${generics.length} generics, ${memoriamEntries} memoriam entries across ${memoriamCharacters} characters)`,
  );
}

main().catch((err) => {
  console.error(`[skyboxes:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
