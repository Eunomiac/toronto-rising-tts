"use strict";

/**
 * Fetch public Google Sheet CSV → Storyteller Dashboard Memoriam NPC catalog.
 *
 * Named-range `/export?format=csv&range=` returns HTTP 400 on this workbook, and the
 * gviz URL for this tab returns HTTP 500, so the tab gid is read from the public HTML
 * view and the CSV comes from `/export?format=csv&gid=`.
 *
 * Primary refresh: Storyteller Dashboard server startup, and npm run build:all-tooling
 * (before npc-art:draw).
 * Manual: npm run memoriam-npcs:import
 */

const fs = require("fs");
const path = require("path");
const {
  parseMemoriamNpcRows,
  renderMemoriamNpcCatalogJson,
} = require("./lib/memoriam_npcs_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const defaultOutPath = path.join(root, ".dev", "storyteller-dashboard", "data", "memoriam-npcs.json");

const DEFAULT_SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
const DEFAULT_RANGE = "MEMORIAMNPCCSV";
const DEFAULT_TAB = "Memoriam NPC Export";
const USER_AGENT = "toronto-rising-tts-memoriam-npcs-import/1.0";

/**
 * @param {string[]} argv
 * @returns {{ sheetId: string, rangeName: string, tabName: string }}
 */
function parseArgs(argv) {
  let sheetId = process.env.MEMORIAM_NPC_SHEET_ID || DEFAULT_SHEET_ID;
  let rangeName = process.env.MEMORIAM_NPC_RANGE || DEFAULT_RANGE;
  let tabName = process.env.MEMORIAM_NPC_TAB || DEFAULT_TAB;

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
      console.log(`Usage: node .dev/scripts/import_memoriam_npcs_from_sheet.js [options]

Options:
  --sheet-id <id>   Spreadsheet id (default / env MEMORIAM_NPC_SHEET_ID)
  --tab <name>      Worksheet tab (default "Memoriam NPC Export" / env MEMORIAM_NPC_TAB)
  --range <name>    Named range recorded in catalog meta (default MEMORIAMNPCCSV)

The spreadsheet must be anyone-with-the-link can view.
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
 * @param {string} url
 * @param {string} label
 * @returns {Promise<string>}
 */
async function fetchText(url, label) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status} from ${url}`);
  }
  if (text.trim().length < 1) {
    throw new Error(`${label}: empty body from ${url}`);
  }
  if (text.includes("Sign in to your Google Account") || text.includes("Cannot load spreadsheet")) {
    throw new Error(
      `${label}: response looks like a login page. Check sheet sharing (anyone with link can view). URL: ${url}`,
    );
  }
  return text;
}

/**
 * @param {string} url
 * @param {string} label
 * @returns {Promise<string>}
 */
async function fetchCsv(url, label) {
  const text = await fetchText(url, label);
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith(")]}'")) {
    throw new Error(`${label}: response looks like HTML, not CSV. URL: ${url}`);
  }
  return text;
}

/**
 * @param {string} sheetId
 * @param {string} tabName
 * @returns {Promise<string>}
 */
async function resolveTabGid(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/htmlview`;
  const html = await fetchText(url, "sheet tab list");
  const escaped = tabName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`name: "${escaped}"[^}]*?gid: "(\\d+)"`).exec(html);
  if (!match) {
    throw new Error(`No "${tabName}" tab in ${url} (renamed, or the sheet is no longer public?)`);
  }
  return match[1];
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
async function importMemoriamNpcs(options = {}) {
  const sheetId = String(options.sheetId || process.env.MEMORIAM_NPC_SHEET_ID || DEFAULT_SHEET_ID).trim();
  const rangeName = String(options.rangeName || process.env.MEMORIAM_NPC_RANGE || DEFAULT_RANGE).trim();
  const tabName = String(options.tabName || process.env.MEMORIAM_NPC_TAB || DEFAULT_TAB).trim();
  const outPath = options.outPath || defaultOutPath;
  const meta = { sheetId, rangeName, tabName };

  if (!options.quiet) {
    console.log(`[memoriam-npcs:import] Fetching tab "${tabName}" (${rangeName}) …`);
  }
  const gid = await resolveTabGid(sheetId, tabName);
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${gid}`;
  const csv = await fetchCsv(url, tabName);
  const npcs = parseMemoriamNpcRows(csv);
  const json = renderMemoriamNpcCatalogJson({ npcs, meta });

  writeAtomic(outPath, json);
  if (!options.quiet) {
    console.log(`[memoriam-npcs:import] Wrote ${path.relative(root, outPath)} (${npcs.length} NPCs)`);
  }
  return { npcCount: npcs.length, outPath, sheetId, tabName, rangeName };
}

async function main() {
  await importMemoriamNpcs(parseArgs(process.argv.slice(2)));
}

module.exports = {
  importMemoriamNpcs,
  parseArgs,
  resolveTabGid,
  DEFAULT_SHEET_ID,
  DEFAULT_RANGE,
  DEFAULT_TAB,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`[memoriam-npcs:import] FAIL: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
}
