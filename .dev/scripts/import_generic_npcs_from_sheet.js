"use strict";

/**
 * Fetch public Google Sheet named-range CSV → Storyteller Dashboard generic NPC catalog.
 *
 * Same fetch pattern as skyboxes:import (link-viewable sheet, no OAuth).
 *
 * Run from repo root:
 *   node .dev/scripts/import_generic_npcs_from_sheet.js
 * Prefer: npm run generic-npcs:import
 */

const fs = require("fs");
const path = require("path");
const { parseGenericNpcRows, renderGenericNpcCatalogJson } = require("./lib/generic_npcs_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, ".dev", "storyteller-dashboard", "data", "generic-npcs.json");

const DEFAULT_SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
const DEFAULT_RANGE = "GENERICNPCCSV";

/**
 * @param {string[]} argv
 * @returns {{ sheetId: string, rangeName: string }}
 */
function parseArgs(argv) {
  let sheetId = process.env.GENERIC_NPC_SHEET_ID || DEFAULT_SHEET_ID;
  let rangeName = process.env.GENERIC_NPC_RANGE || DEFAULT_RANGE;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--sheet-id" && argv[i + 1]) {
      sheetId = argv[i + 1];
      i += 1;
    } else if (a === "--range" && argv[i + 1]) {
      rangeName = argv[i + 1];
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/import_generic_npcs_from_sheet.js [options]

Options:
  --sheet-id <id>   Spreadsheet id (default / env GENERIC_NPC_SHEET_ID)
  --range <name>    Named range (default GENERICNPCCSV / env GENERIC_NPC_RANGE)

The spreadsheet must be anyone-with-the-link can view, same as skyboxes:import.
`);
      process.exit(0);
    }
  }

  return { sheetId: String(sheetId).trim(), rangeName: String(rangeName).trim() };
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
    headers: { "User-Agent": "toronto-rising-tts-generic-npcs-import/1.0" },
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
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, filePath);
}

async function main() {
  const { sheetId, rangeName } = parseArgs(process.argv.slice(2));
  const url = exportCsvUrl(sheetId, rangeName);

  console.log(`[generic-npcs:import] Fetching ${rangeName} …`);
  const csv = await fetchCsv(url, rangeName);
  const npcs = parseGenericNpcRows(csv);
  const json = renderGenericNpcCatalogJson({ npcs, meta: { sheetId, rangeName } });

  writeAtomic(outPath, json);
  console.log(`[generic-npcs:import] Wrote ${path.relative(root, outPath)} (${npcs.length} NPCs)`);
}

main().catch((err) => {
  console.error(`[generic-npcs:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
