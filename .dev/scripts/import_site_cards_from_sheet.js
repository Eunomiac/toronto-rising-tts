"use strict";

/**
 * Fetch a public Google Sheet named-range CSV → Site Cards JSON + TTS save CustomUIAssets.
 *
 * Run from repo root:
 *   node .dev/scripts/import_site_cards_from_sheet.js --range SITECARDCSV
 * Prefer: npm run site-cards:import -- --range SITECARDCSV
 *
 * Sheet must be link-viewable. Columns: Name, URL (header row).
 */

const fs = require("fs");
const path = require("path");
const {
  parseSiteCardsCsv,
  mergeSiteCardsIntoCustomUiAssets,
} = require("./lib/site_cards_sheet_csv.js");
const { resolveSavePath } = require("../../.tools/tts-save/resolve-save-path");

const root = path.resolve(__dirname, "..", "..");
const defaultJsonOut = path.join(root, "lib", "json", "Site Cards.json");

/** Same spreadsheet as skyboxes import unless overridden. */
const DEFAULT_SHEET_ID = "1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4";

/** Known live save locations on this author machine (OneDrive default may be stale). */
const CANDIDATE_SAVES_DIRS = [
  process.env.TTS_SAVES_DIR,
  "D:/Owner/Documents/My Games/Tabletop Simulator/Saves",
  "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves",
  path.join(process.env.USERPROFILE || "", "Documents", "My Games", "Tabletop Simulator", "Saves"),
].filter((p) => typeof p === "string" && p.trim().length > 0);

/**
 * @param {string[]} argv
 * @returns {{
 *   sheetId: string,
 *   rangeName: string,
 *   jsonOut: string,
 *   savePath: string | null,
 *   dryRun: boolean,
 *   skipSave: boolean,
 * }}
 */
function parseArgs(argv) {
  let sheetId = process.env.SITE_CARDS_SHEET_ID || process.env.SKYBOX_SHEET_ID || DEFAULT_SHEET_ID;
  let rangeName = process.env.SITE_CARDS_RANGE || "";
  let jsonOut = process.env.SITE_CARDS_JSON_OUT || defaultJsonOut;
  /** @type {string | null} */
  let savePath = process.env.SITE_CARDS_SAVE || null;
  let saveName = process.env.SITE_CARDS_SAVE_NAME || "230";
  let dryRun = false;
  let skipSave = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--sheet-id" && argv[i + 1]) {
      sheetId = argv[i + 1];
      i += 1;
    } else if (a === "--range" && argv[i + 1]) {
      rangeName = argv[i + 1];
      i += 1;
    } else if (a === "--json-out" && argv[i + 1]) {
      jsonOut = path.resolve(argv[i + 1]);
      i += 1;
    } else if (a === "--save" && argv[i + 1]) {
      savePath = path.resolve(argv[i + 1]);
      i += 1;
    } else if (a === "--saveName" && argv[i + 1]) {
      saveName = argv[i + 1];
      i += 1;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--skip-save") {
      skipSave = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/import_site_cards_from_sheet.js --range <NamedRange> [options]

Options:
  --sheet-id <id>     Spreadsheet id (default: skyboxes sheet / SITE_CARDS_SHEET_ID)
  --range <name>      Named range with Name,URL columns (required; or SITE_CARDS_RANGE)
  --json-out <path>   Write Site Cards JSON (default: lib/json/Site Cards.json)
  --save <path>       TTS save JSON to patch CustomUIAssets
  --saveName <id>     Resolve TS_Save_<id>.json under TTS Saves dirs (default: 230)
  --skip-save         Only write the JSON file
  --dry-run           Fetch + parse; do not write files
`);
      process.exit(0);
    }
  }

  if (!rangeName || trim(rangeName) === "") {
    throw new Error("Missing named range. Pass --range <Name> or set SITE_CARDS_RANGE.");
  }

  if (!skipSave && !savePath) {
    savePath = resolveExistingSave(saveName);
  }

  return {
    sheetId: trim(sheetId),
    rangeName: trim(rangeName),
    jsonOut: path.resolve(jsonOut),
    savePath: skipSave ? null : savePath,
    dryRun,
    skipSave,
  };
}

/**
 * @param {string} value
 * @returns {string}
 */
function trim(value) {
  return String(value == null ? "" : value).trim();
}

/**
 * @param {string} saveName
 * @returns {string}
 */
function resolveExistingSave(saveName) {
  for (const dir of CANDIDATE_SAVES_DIRS) {
    const candidate = path.join(dir, `TS_Save_${String(saveName).replace(/^TS_Save_/i, "").replace(/\.json$/i, "")}.json`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  const fallback = resolveSavePath(saveName).savePath;
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  throw new Error(
    `Could not find TS_Save_${saveName}.json under known Saves dirs. Pass --save <path> or set TTS_SAVES_DIR.`,
  );
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
    headers: { "User-Agent": "toronto-rising-tts-site-cards-import/1.0" },
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
  const { sheetId, rangeName, jsonOut, savePath, dryRun, skipSave } = parseArgs(process.argv.slice(2));
  const url = exportCsvUrl(sheetId, rangeName);

  console.log(`[site-cards:import] Fetching range ${rangeName} …`);
  const csv = await fetchCsv(url, rangeName);
  const siteCards = parseSiteCardsCsv(csv);
  console.log(`[site-cards:import] Parsed ${siteCards.length} site cards`);

  const jsonText = `${JSON.stringify(siteCards, null, 2)}\n`;

  if (dryRun) {
    console.log(`[site-cards:import] Dry run — would write ${path.relative(root, jsonOut)}`);
    if (!skipSave && savePath) {
      console.log(`[site-cards:import] Dry run — would merge into ${savePath}`);
    }
    return;
  }

  writeAtomic(jsonOut, jsonText);
  console.log(`[site-cards:import] Wrote ${path.relative(root, jsonOut)}`);

  if (skipSave || !savePath) {
    console.log("[site-cards:import] Skipped save patch (--skip-save)");
    return;
  }

  const saveRaw = fs.readFileSync(savePath, "utf8");
  const saveRoot = JSON.parse(saveRaw);
  if (!Array.isArray(saveRoot.CustomUIAssets)) {
    throw new Error(`Save missing CustomUIAssets array: ${savePath}`);
  }

  const before = saveRoot.CustomUIAssets.length;
  const merged = mergeSiteCardsIntoCustomUiAssets(saveRoot.CustomUIAssets, siteCards);
  saveRoot.CustomUIAssets = merged.assets;

  writeAtomic(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`);
  console.log(
    `[site-cards:import] Patched ${savePath} (CustomUIAssets ${before} → ${merged.assets.length}; removed ${merged.removed} siteCard_*; added ${merged.added})`,
  );
  console.log("[site-cards:import] Reload the save in TTS (or Save & Play) to pick up new Custom UI assets.");
}

main().catch((err) => {
  console.error(`[site-cards:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
