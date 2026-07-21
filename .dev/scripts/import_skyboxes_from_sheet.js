"use strict";

/**
 * Fetch public Google Sheet CSV ranges → lib/skyboxes_catalog.ttslua (TOR-422).
 *
 * Run from repo root: node .dev/scripts/import_skyboxes_from_sheet.js
 * Prefer: npm run skyboxes:import (also regenerates Scenes location modals)
 */

const fs = require("fs");
const path = require("path");
const {
  parseSkyboxCatalogRows,
  parseGenericSkyboxRows,
  renderSkyboxesCatalogLua,
} = require("./lib/skyboxes_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "skyboxes_catalog.ttslua");

const DEFAULT_SHEET_ID = "1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4";
const DEFAULT_CATALOG_RANGE = "SKYBOXCSV";
const DEFAULT_GENERICS_RANGE = "SKYBOXGENERICCSV";

/**
 * @param {string[]} argv
 * @returns {{ sheetId: string, catalogRange: string, genericsRange: string }}
 */
function parseArgs(argv) {
  let sheetId = process.env.SKYBOX_SHEET_ID || DEFAULT_SHEET_ID;
  let catalogRange = process.env.SKYBOX_CATALOG_RANGE || DEFAULT_CATALOG_RANGE;
  let genericsRange = process.env.SKYBOX_GENERICS_RANGE || DEFAULT_GENERICS_RANGE;

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
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/import_skyboxes_from_sheet.js [options]

Options:
  --sheet-id <id>           Spreadsheet id (default / env SKYBOX_SHEET_ID)
  --catalog-range <name>    Named range for Key,Display,URL (default SKYBOXCSV)
  --generics-range <name>   Named range for URL list (default SKYBOXGENERICCSV)
`);
      process.exit(0);
    }
  }

  return { sheetId, catalogRange, genericsRange };
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
  const { sheetId, catalogRange, genericsRange } = parseArgs(process.argv.slice(2));
  const catalogUrl = exportCsvUrl(sheetId, catalogRange);
  const genericsUrl = exportCsvUrl(sheetId, genericsRange);

  console.log(`[skyboxes:import] Fetching ${catalogRange} …`);
  const catalogCsv = await fetchCsv(catalogUrl, catalogRange);
  console.log(`[skyboxes:import] Fetching ${genericsRange} …`);
  const genericsCsv = await fetchCsv(genericsUrl, genericsRange);

  const skyboxes = parseSkyboxCatalogRows(catalogCsv);
  const generics = parseGenericSkyboxRows(genericsCsv);

  const lua = renderSkyboxesCatalogLua({
    skyboxes,
    generics,
    meta: { sheetId, catalogRange, genericsRange },
  });

  writeAtomic(outPath, lua);
  console.log(
    `[skyboxes:import] Wrote ${path.relative(root, outPath)} (${skyboxes.length} skyboxes, ${generics.length} generics)`,
  );
}

main().catch((err) => {
  console.error(`[skyboxes:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
