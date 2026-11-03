"use strict";

/**
 * Google Sheet CSV ranges (keys, labels, Memoriam data) + Steam Cloud links → lib/skyboxes_catalog.ttslua
 * (TOR-422, TOR-510). Links come from lib/json/cloud-assets.json (jobs skyboxes, genericSkyboxes), so run
 * after npm run cloud-asset-sync; a sheet key without a Cloud file fails the import.
 *
 * Run from repo root: node .dev/scripts/import_skyboxes_from_sheet.js
 * Prefer: npm run skyboxes:import (regenerates Scenes location modals, then embeds Global XmlUI)
 */

const fs = require("fs");
const path = require("path");
const {
  parseSkyboxCatalogRows,
  attachSkyboxUrls,
  genericSkyboxUrls,
  parseMemoriamSkyboxRows,
  renderSkyboxesCatalogLua,
} = require("./lib/skyboxes_sheet_csv.js");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "skyboxes_catalog.ttslua");
const manifestPath = path.join(root, "lib", "json", "cloud-assets.json");

/**
 * @param {string} jobId
 * @returns {{ name: string, url: string }[]}
 */
function cloudRows(jobId) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const job = manifest.jobs && manifest.jobs[jobId];
  if (!job) {
    throw new Error(`${path.relative(root, manifestPath)} has no "${jobId}" job yet — run npm run cloud-asset-sync first.`);
  }
  return job.rows;
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
  const { loadSnapshot, csvOf, contract } = require("./lib/sheet_exports.js");
  const snapshot = await loadSnapshot();
  const sheetId = contract.spreadsheetId, catalogRange = "EXPORT_SKYBOXES", memoriamRange = "EXPORT_MEMORIAM";
  const catalogCsv = csvOf(snapshot, "SKYBOXES"), memoriamCsv = csvOf(snapshot, "MEMORIAM");

  const skyboxes = attachSkyboxUrls(parseSkyboxCatalogRows(catalogCsv), cloudRows("skyboxes"));
  const generics = genericSkyboxUrls(cloudRows("genericSkyboxes"));
  const memoriam = parseMemoriamSkyboxRows(memoriamCsv);

  const lua = renderSkyboxesCatalogLua({
    skyboxes,
    generics,
    memoriam,
    meta: { sheetId, catalogRange, memoriamRange },
  });

  writeAtomic(outPath, lua);
  console.log(
    `[skyboxes:import] Wrote ${path.relative(root, outPath)} (${skyboxes.length} skyboxes, ${generics.length} generics, ${Object.keys(memoriam).length} memoriam entries)`,
  );
}

main().catch((err) => {
  console.error(`[skyboxes:import] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
