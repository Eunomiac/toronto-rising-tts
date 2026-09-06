"use strict";

/**
 * Fetch public Google Sheet CSV → Storyteller Dashboard generic NPC catalog.
 *
 * Same contract as skyboxes:import: link-viewable sheet, no OAuth, fail loudly
 * on HTML/login. This workbook's named-range `/export?format=csv&range=` URL
 * returns HTTP 400 (unbounded A:D named ranges often do), so we use the public
 * Visualization CSV for the Generics Export tab instead.
 *
 * Primary refresh: Storyteller Dashboard server startup.
 * Manual: npm run generic-npcs:import
 */

const fs = require("fs");
const path = require("path");
const { parseGenericNpcRows, renderGenericNpcCatalogJson } = require("./lib/generic_npcs_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const defaultOutPath = path.join(root, ".dev", "storyteller-dashboard", "data", "generic-npcs.json");

const DEFAULT_SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
const DEFAULT_RANGE = "GENERICNPCCSV";
const DEFAULT_TAB = "Generics Export";

/**
 * @param {string[]} argv
 * @returns {{ sheetId: string, rangeName: string, tabName: string }}
 */
function parseArgs(argv) {
  let sheetId = process.env.GENERIC_NPC_SHEET_ID || DEFAULT_SHEET_ID;
  let rangeName = process.env.GENERIC_NPC_RANGE || DEFAULT_RANGE;
  let tabName = process.env.GENERIC_NPC_TAB || DEFAULT_TAB;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--sheet-id" && argv[i + 1]) {
      sheetId = argv[i + 1];
      i += 1;
    } else if (a === "--range" && argv[i + 1]) {
      rangeName = argv[i + 1];
      i += 1;
    } else if (a === "--tab" && argv[i + 1]) {
      tabName = argv[i + 1];
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/import_generic_npcs_from_sheet.js [options]

Options:
  --sheet-id <id>   Spreadsheet id (default / env GENERIC_NPC_SHEET_ID)
  --tab <name>      Worksheet tab (default Generics Export / env GENERIC_NPC_TAB)
  --range <name>    Named range recorded in catalog meta (default GENERICNPCCSV)

The spreadsheet must be anyone-with-the-link can view, same as skyboxes:import.
The Storyteller Dashboard also runs this refresh on server startup.
`);
      process.exit(0);
    }
  }

  return {
    sheetId: String(sheetId).trim(),
    rangeName: String(rangeName).trim(),
    tabName: String(tabName).trim(),
  };
}

/**
 * Public Visualization CSV. Named-range /export?format=csv 400s on this workbook.
 *
 * @param {string} sheetId
 * @param {string} tabName
 * @returns {string}
 */
function exportCsvUrl(sheetId, tabName) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
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
    trimmed.startsWith(")]}'") ||
    trimmed.includes("Sign in to your Google Account") ||
    trimmed.includes("Cannot load spreadsheet") ||
    trimmed.includes('"status":"error"')
  ) {
    throw new Error(
      `${label}: response looks like HTML/login/error, not CSV. Check sheet sharing (anyone with link can view) and tab name. URL: ${url}`,
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

/**
 * @param {{
 *   sheetId?: string,
 *   rangeName?: string,
 *   tabName?: string,
 *   outPath?: string,
 *   quiet?: boolean
 * }} [options]
 * @returns {Promise<{ npcCount: number, outPath: string, sheetId: string, tabName: string, rangeName: string }>}
 */
async function importGenericNpcs(options = {}) {
  const sheetId = String(options.sheetId || process.env.GENERIC_NPC_SHEET_ID || DEFAULT_SHEET_ID).trim();
  const rangeName = String(options.rangeName || process.env.GENERIC_NPC_RANGE || DEFAULT_RANGE).trim();
  const tabName = String(options.tabName || process.env.GENERIC_NPC_TAB || DEFAULT_TAB).trim();
  const outPath = options.outPath || defaultOutPath;
  const url = exportCsvUrl(sheetId, tabName);

  if (!options.quiet) {
    console.log(`[generic-npcs:import] Fetching tab "${tabName}" (${rangeName}) …`);
  }
  const csv = await fetchCsv(url, tabName);
  const npcs = parseGenericNpcRows(csv);
  const json = renderGenericNpcCatalogJson({ npcs, meta: { sheetId, rangeName, tabName } });

  writeAtomic(outPath, json);
  if (!options.quiet) {
    console.log(`[generic-npcs:import] Wrote ${path.relative(root, outPath)} (${npcs.length} NPCs)`);
  }
  return { npcCount: npcs.length, outPath, sheetId, tabName, rangeName };
}

async function main() {
  await importGenericNpcs(parseArgs(process.argv.slice(2)));
}

module.exports = {
  importGenericNpcs,
  parseArgs,
  exportCsvUrl,
  fetchCsv,
  DEFAULT_SHEET_ID,
  DEFAULT_RANGE,
  DEFAULT_TAB,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`[generic-npcs:import] FAIL: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
}
