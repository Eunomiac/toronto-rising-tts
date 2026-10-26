"use strict";

/**
 * Fetch a whole tab of a public Google Sheet as CSV.
 * Supply options.gid to use the regular export and preserve mixed-type columns;
 * gviz (the default) can blank text in predominantly numeric/boolean columns.
 * Sheet ids and tab map: `.dev/Chronicle Data/Google Sheets.md`.
 */

const fs = require("fs");
const path = require("path");

const SHEET_IDS = {
  torontoRising: "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs",
  api: "1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4",
  districtsAndSites: "1ol1JOQNZER7QGsmBoeVXbKFNmCjYvKc-xibXtS3sFKk",
};

/**
 * @param {string} sheetId
 * @param {string} tab
 * @returns {string}
 */
function tabCsvUrl(sheetId, tab) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(tab)}`;
}

/**
 * @param {string} sheetId
 * @param {string} tab
 * @param {string} userAgent
 * @param {{gid?: number}} [options]
 * @returns {Promise<string>}
 */
async function fetchTabCsv(sheetId, tab, userAgent, options = {}) {
  const url = options.gid != null
    ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(options.gid)}`
    : tabCsvUrl(sheetId, tab);
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": userAgent } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${tab}: HTTP ${response.status} from ${url}`);
  }
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("Sign in to your Google Account")
  ) {
    throw new Error(`${tab}: response looks like HTML/login, not CSV. Check sheet sharing and tab name. URL: ${url}`);
  }
  if (trimmed.length < 1) {
    throw new Error(`${tab}: empty body from ${url}`);
  }
  return text;
}

/**
 * @param {string} filePath
 * @param {string} contents
 */
function writeAtomic(filePath, contents) {
  const tmp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, filePath);
}

module.exports = { SHEET_IDS, tabCsvUrl, fetchTabCsv, writeAtomic };
