"use strict";

/**
 * Pure helpers for Google Sheet CSV → generic NPC dashboard catalog.
 */

const { parseCsv } = require("./skyboxes_sheet_csv.js");

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.webp$/;

/**
 * @param {string} value
 * @returns {string}
 */
function trimCell(value) {
  return String(value == null ? "" : value).trim();
}

/**
 * @param {string} header
 * @returns {string}
 */
function normalizeHeader(header) {
  return trimCell(header).toLowerCase().replace(/[\s_]+/g, "");
}

/**
 * Parse GENERICNPCCSV (header filename,label,key,tags). Preserves sheet row order.
 *
 * @param {string} csvText
 * @returns {{ filename: string, label: string, key: string, tags: string }[]}
 */
function parseGenericNpcRows(csvText) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => trimCell(c) !== ""));
  if (rows.length < 2) {
    throw new Error("GENERICNPCCSV: needs a header row and at least one data row.");
  }

  const headers = rows[0].map(normalizeHeader);
  const filenameIdx = headers.indexOf("filename");
  const labelIdx = headers.indexOf("label");
  const keyIdx = headers.indexOf("key");
  const tagsIdx = headers.indexOf("tags");
  if (filenameIdx < 0 || labelIdx < 0 || keyIdx < 0 || tagsIdx < 0) {
    throw new Error(
      `GENERICNPCCSV: expected header filename,label,key,tags; got ${JSON.stringify(rows[0])}`,
    );
  }

  /** @type {{ filename: string, label: string, key: string, tags: string }[]} */
  const out = [];
  /** @type {Set<string>} */
  const seenKeys = new Set();

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const filename = trimCell(row[filenameIdx]);
    const label = trimCell(row[labelIdx]);
    const key = trimCell(row[keyIdx]);
    const tags = trimCell(row[tagsIdx]);
    if (filename === "" && label === "" && key === "" && tags === "") {
      continue;
    }
    if (!filename || !label || !key) {
      throw new Error(
        `GENERICNPCCSV: row ${r + 1} missing filename, label, or key: ${JSON.stringify(row)}`,
      );
    }
    if (!FILENAME_RE.test(filename)) {
      throw new Error(
        `GENERICNPCCSV: row ${r + 1} filename "${filename}" must be a .webp basename (no folders).`,
      );
    }
    if (!KEY_RE.test(key)) {
      throw new Error(
        `GENERICNPCCSV: row ${r + 1} key "${key}" must be an identifier (A-Za-z_[A-Za-z0-9_]*).`,
      );
    }
    if (seenKeys.has(key)) {
      throw new Error(`GENERICNPCCSV: duplicate key "${key}" at row ${r + 1}`);
    }
    seenKeys.add(key);
    out.push({ filename, label, key, tags });
  }

  if (out.length < 1) {
    throw new Error("GENERICNPCCSV: no data rows");
  }
  return out;
}

/**
 * @param {{
 *   npcs: { filename: string, label: string, key: string, tags: string }[],
 *   meta: { sheetId: string, rangeName: string, tabName?: string }
 * }} payload
 * @returns {string}
 */
function renderGenericNpcCatalogJson(payload) {
  return `${JSON.stringify(
    {
      generatedBy: "npm run generic-npcs:import",
      sheetId: payload.meta.sheetId,
      rangeName: payload.meta.rangeName,
      tabName: payload.meta.tabName || "",
      npcs: payload.npcs,
    },
    null,
    2,
  )}\n`;
}

module.exports = {
  parseGenericNpcRows,
  renderGenericNpcCatalogJson,
};
