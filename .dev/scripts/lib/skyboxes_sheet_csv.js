"use strict";

/**
 * Pure helpers for Google Sheet CSV → skybox Lua catalog (TOR-422).
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

const LUA_IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * @param {string} csvText
 * @returns {{ key: string, display: string, url: string }[]}
 */
function parseSkyboxCatalogRows(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 1) {
    throw new Error("SKYBOXCSV: empty CSV");
  }
  const header = rows[0].map((c) => trimCell(c).toLowerCase());
  if (header.length < 3 || header[0] !== "key" || header[1] !== "display" || header[2] !== "url") {
    throw new Error(
      `SKYBOXCSV: expected header Key,Display,URL; got ${JSON.stringify(rows[0])}`,
    );
  }
  /** @type {{ key: string, display: string, url: string }[]} */
  const out = [];
  const seen = new Set();
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells || cells.every((c) => trimCell(c) === "")) {
      continue;
    }
    const key = trimCell(cells[0]);
    const display = trimCell(cells[1]);
    const url = trimCell(cells[2]);
    if (!key || !display || !url) {
      throw new Error(
        `SKYBOXCSV: row ${r + 1} missing Key, Display, or URL: ${JSON.stringify(cells)}`,
      );
    }
    if (!LUA_IDENT_RE.test(key)) {
      throw new Error(
        `SKYBOXCSV: row ${r + 1} key "${key}" must be a Lua identifier (A-Za-z_[A-Za-z0-9_]*)`,
      );
    }
    if (seen.has(key)) {
      throw new Error(`SKYBOXCSV: duplicate key "${key}" at row ${r + 1}`);
    }
    seen.add(key);
    out.push({ key, display, url });
  }
  if (out.length < 1) {
    throw new Error("SKYBOXCSV: no data rows");
  }
  return out;
}

/**
 * @param {string} csvText
 * @returns {string[]}
 */
function parseGenericSkyboxRows(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 1) {
    throw new Error("SKYBOXGENERICCSV: empty CSV");
  }
  const header0 = trimCell(rows[0][0]).toLowerCase();
  if (header0 !== "url") {
    throw new Error(
      `SKYBOXGENERICCSV: expected header URL; got ${JSON.stringify(rows[0])}`,
    );
  }
  /** @type {string[]} */
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const url = trimCell((rows[r] && rows[r][0]) || "");
    if (url === "") {
      continue;
    }
    out.push(url);
  }
  if (out.length < 1) {
    throw new Error("SKYBOXGENERICCSV: need at least one URL");
  }
  return out;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeLuaString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/**
 * @param {{
 *   skyboxes: { key: string, display: string, url: string }[],
 *   generics: string[],
 *   meta: { sheetId: string, catalogRange: string, genericsRange: string },
 * }} args
 * @returns {string}
 */
function renderSkyboxesCatalogLua(args) {
  const { skyboxes, generics, meta } = args;
  const lines = [];
  lines.push("--[[");
  lines.push("    Toronto Rising — skybox catalog (keyed assets + generic URL pool).");
  lines.push("    AUTO-GENERATED from Google Sheet — DO NOT EDIT BY HAND.");
  lines.push(`    Sheet id: ${meta.sheetId}`);
  lines.push(`    Ranges: ${meta.catalogRange} (Key,Display,URL), ${meta.genericsRange} (URL)`);
  lines.push("    Regenerate: npm run skyboxes:import");
  lines.push("    Script: .dev/scripts/import_skyboxes_from_sheet.js");
  lines.push("]]");
  lines.push("");
  lines.push("local SkyboxesCatalog = {}");
  lines.push("");
  lines.push("SkyboxesCatalog.Skyboxes = {");
  for (const entry of skyboxes) {
    lines.push(`  ${entry.key} = {`);
    lines.push(`    key = "${escapeLuaString(entry.key)}",`);
    lines.push(`    display = "${escapeLuaString(entry.display)}",`);
    lines.push(`    url = "${escapeLuaString(entry.url)}"`);
    lines.push("  },");
  }
  lines.push("}");
  lines.push("");
  lines.push("SkyboxesCatalog.GenericSkyboxes = {");
  for (const url of generics) {
    lines.push(`  "${escapeLuaString(url)}",`);
  }
  lines.push("}");
  lines.push("");
  lines.push("return SkyboxesCatalog");
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  parseCsv,
  parseSkyboxCatalogRows,
  parseGenericSkyboxRows,
  escapeLuaString,
  renderSkyboxesCatalogLua,
  LUA_IDENT_RE,
};
