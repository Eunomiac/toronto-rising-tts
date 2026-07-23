"use strict";

/**
 * Pure helpers for Google Sheet CSV → Site Cards CustomUIAssets JSON.
 */

/**
 * Minimal RFC4180-ish CSV parse (quoted fields, commas, CRLF).
 * @param {string} text
 * @returns {string[][]}
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const s = String(text || "").replace(/^\uFEFF/, "");

  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

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
 * Parse Name + URL CSV (header row required) into TTS CustomUIAssets rows.
 * Extra columns (e.g. Type) are ignored; Type is always 0.
 *
 * @param {string} csvText
 * @returns {{ Type: number, Name: string, URL: string }[]}
 */
function parseSiteCardsCsv(csvText) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => trimCell(c) !== ""));
  if (rows.length < 2) {
    throw new Error("Site cards CSV needs a header row and at least one data row.");
  }

  const headers = rows[0].map(normalizeHeader);
  let nameIdx = headers.indexOf("name");
  let urlIdx = headers.indexOf("url");
  if (nameIdx < 0) nameIdx = 0;
  if (urlIdx < 0) urlIdx = 1;
  if (nameIdx === urlIdx) {
    throw new Error('Could not resolve distinct "Name" and "URL" columns from CSV header.');
  }

  /** @type {{ Type: number, Name: string, URL: string }[]} */
  const out = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const name = trimCell(row[nameIdx]);
    const url = trimCell(row[urlIdx]);
    if (name === "" && url === "") {
      continue;
    }
    if (name === "") {
      throw new Error(`Row ${r + 1}: missing Name.`);
    }
    if (url === "") {
      throw new Error(`Row ${r + 1} (${name}): missing URL.`);
    }
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`Row ${r + 1} (${name}): URL must be http(s): ${url}`);
    }
    if (seen.has(name)) {
      throw new Error(`Duplicate Name in sheet: ${name}`);
    }
    seen.add(name);
    out.push({ Type: 0, Name: name, URL: url });
  }

  if (out.length < 1) {
    throw new Error("Site cards CSV produced zero rows.");
  }
  return out;
}

/**
 * Replace every CustomUIAssets entry whose Name starts with siteCard_ with imported rows.
 * Non-site assets are preserved in their relative order; site cards are appended as a block.
 *
 * @param {Record<string, unknown>[]} assets
 * @param {{ Type: number, Name: string, URL: string }[]} siteCards
 * @returns {{ assets: Record<string, unknown>[], removed: number, added: number }}
 */
function mergeSiteCardsIntoCustomUiAssets(assets, siteCards) {
  if (!Array.isArray(assets)) {
    throw new Error("CustomUIAssets must be an array.");
  }
  const kept = assets.filter((row) => {
    if (!row || typeof row !== "object") return true;
    const name = /** @type {Record<string, unknown>} */ (row).Name;
    return typeof name !== "string" || !name.startsWith("siteCard_");
  });
  const removed = assets.length - kept.length;
  const addedRows = siteCards.map((row) => ({
    Type: 0,
    Name: row.Name,
    URL: row.URL,
  }));
  return {
    assets: kept.concat(addedRows),
    removed,
    added: addedRows.length,
  };
}

module.exports = {
  parseCsv,
  parseSiteCardsCsv,
  mergeSiteCardsIntoCustomUiAssets,
};
