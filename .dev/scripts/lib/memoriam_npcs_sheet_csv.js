"use strict";

/**
 * Pure helpers for Google Sheet CSV → Memoriam NPC dashboard catalog.
 * Named range MEMORIAMNPCCSV on the Toronto Rising workbook (tab Memoriam NPC Export).
 */

const { parseCsv } = require("./skyboxes_sheet_csv.js");

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const GENERIC_SUFFIX_RE = /_\d{2}$/;
const YEARS = new Set(["Modern", "1900s", "1800s", "1700s"]);

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
 * @param {string} raw
 * @param {string} rowLabel
 * @returns {boolean}
 */
function parseIsGeneric(raw, rowLabel) {
  const value = trimCell(raw).toUpperCase();
  if (value === "TRUE") {
    return true;
  }
  if (value === "FALSE") {
    return false;
  }
  throw new Error(`${rowLabel} isGeneric must be TRUE or FALSE; got ${JSON.stringify(raw)}`);
}

/**
 * Comma-separated cell. A blank piece is an error. `allowEmpty` is the whole cell being blank.
 * @param {string} raw
 * @param {string} rowLabel
 * @param {string} field
 * @param {boolean} allowEmpty
 * @returns {string[]}
 */
function splitCell(raw, rowLabel, field, allowEmpty) {
  const text = trimCell(raw);
  if (text === "") {
    if (allowEmpty) {
      return [];
    }
    throw new Error(`${rowLabel} ${field} must list at least one value.`);
  }
  const pieces = text.split(",");
  if (pieces.some((piece) => trimCell(piece) === "")) {
    throw new Error(`${rowLabel} ${field} has an empty entry. Separate values with commas.`);
  }
  return pieces.map((piece) => trimCell(piece));
}

/**
 * @param {string} raw
 * @param {string} rowLabel
 * @returns {string[]}
 */
function parseYearCell(raw, rowLabel) {
  const years = splitCell(raw, rowLabel, "year", false);
  for (const year of years) {
    if (!YEARS.has(year)) {
      throw new Error(
        `${rowLabel} year "${year}" must be Modern, 1900s, 1800s, or 1700s.`,
      );
    }
  }
  return years;
}

/**
 * @param {string} raw
 * @param {string} rowLabel
 * @returns {string[]}
 */
function parseLocationCell(raw, rowLabel) {
  return splitCell(raw, rowLabel, "location", true);
}

function parsePeriods(raw, rowLabel) {
  const periods = trimCell(raw)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (periods.length < 1) {
    throw new Error(`${rowLabel} periods must list at least one skybox key`);
  }
  for (const period of periods) {
    if (!KEY_RE.test(period)) {
      throw new Error(
        `${rowLabel} period "${period}" must be an identifier (A-Za-z_[A-Za-z0-9_]*)`,
      );
    }
  }
  return periods;
}

/**
 * Parse MEMORIAMNPCCSV.
 * Header: filename, key, label, location, year, variantOfUnique, isGeneric, tags, periods.
 * Preserves sheet row order.
 *
 * @param {string} csvText
 * @returns {{
 *   filename: string,
 *   key: string,
 *   label: string,
 *   location: string,
 *   year: string,
 *   variantOfUnique: string,
 *   isGeneric: boolean,
 *   tags: string,
 *   periods: string[],
 * }[]}
 */
function parseMemoriamNpcRows(csvText) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => trimCell(c) !== ""));
  if (rows.length < 2) {
    throw new Error("MEMORIAMNPCCSV: needs a header row and at least one data row.");
  }

  const headers = rows[0].map(normalizeHeader);
  const col = {
    filename: headers.indexOf("filename"),
    key: headers.indexOf("key"),
    label: headers.indexOf("label"),
    location: headers.indexOf("location"),
    year: headers.indexOf("year"),
    variantOfUnique: headers.indexOf("variantofunique"),
    isGeneric: headers.indexOf("isgeneric"),
    tags: headers.indexOf("tags"),
    periods: headers.indexOf("periods"),
  };
  const missing = Object.entries(col)
    .filter((entry) => entry[1] < 0)
    .map((entry) => entry[0]);
  if (missing.length > 0) {
    throw new Error(
      `MEMORIAMNPCCSV: expected header filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods; missing ${JSON.stringify(missing)}; got ${JSON.stringify(rows[0])}`,
    );
  }

  /** @type {ReturnType<typeof parseMemoriamNpcRows>} */
  const out = [];
  /** @type {Set<string>} */
  const seenKeys = new Set();

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const filename = trimCell(row[col.filename]);
    const key = trimCell(row[col.key]);
    const label = trimCell(row[col.label]);
    const location = trimCell(row[col.location]);
    const year = trimCell(row[col.year]);
    const variantOfUnique = trimCell(row[col.variantOfUnique]);
    const tags = trimCell(row[col.tags]);
    const periodsRaw = trimCell(row[col.periods]);
    const isGenericRaw = trimCell(row[col.isGeneric]);
    if (
      filename === "" &&
      key === "" &&
      label === "" &&
      location === "" &&
      year === "" &&
      variantOfUnique === "" &&
      isGenericRaw === "" &&
      tags === "" &&
      periodsRaw === ""
    ) {
      continue;
    }
    const rowLabel = `MEMORIAMNPCCSV: row ${r + 1}`;
    if (!filename || !key || !label || !year) {
      throw new Error(`${rowLabel} missing filename, key, label, or year: ${JSON.stringify(row)}`);
    }
    if (!KEY_RE.test(key)) {
      throw new Error(`${rowLabel} key "${key}" must be an identifier (A-Za-z_[A-Za-z0-9_]*).`);
    }
    if (filename !== `npc_${key}.webp`) {
      throw new Error(`${rowLabel} filename "${filename}" must be npc_${key}.webp.`);
    }
    if (variantOfUnique !== "" && !KEY_RE.test(variantOfUnique)) {
      throw new Error(
        `${rowLabel} variantOfUnique "${variantOfUnique}" must be an identifier (A-Za-z_[A-Za-z0-9_]*).`,
      );
    }
    parseLocationCell(location, rowLabel);
    parseYearCell(year, rowLabel);
    const isGeneric = parseIsGeneric(isGenericRaw, rowLabel);
    if (isGeneric && variantOfUnique !== "") {
      throw new Error(`${rowLabel} variantOfUnique is only for non-generic Memoriam NPCs.`);
    }
    const suffixGeneric = GENERIC_SUFFIX_RE.test(key);
    if (isGeneric !== suffixGeneric) {
      throw new Error(
        `${rowLabel} isGeneric ${isGeneric ? "TRUE" : "FALSE"} does not match key "${key}" (a generic Memoriam NPC key ends in _ plus two digits).`,
      );
    }
    if (seenKeys.has(key)) {
      throw new Error(`${rowLabel} duplicate key "${key}"`);
    }
    seenKeys.add(key);
    out.push({
      filename,
      key,
      label,
      location,
      year,
      variantOfUnique,
      isGeneric,
      tags,
      periods: parsePeriods(periodsRaw, rowLabel),
    });
  }

  if (out.length < 1) {
    throw new Error("MEMORIAMNPCCSV: no data rows");
  }
  return out;
}

/**
 * @param {{
 *   npcs: ReturnType<typeof parseMemoriamNpcRows>,
 *   meta: { sheetId: string, rangeName: string, tabName?: string }
 * }} payload
 * @returns {string}
 */
/**
 * Every variantOfUnique must name a catalogued character or another Memoriam NPC, with no cycle.
 * @param {ReturnType<typeof parseMemoriamNpcRows>} rows
 * @param {Set<string>} cataloguedKeys keys from lib/npcs_data.ttslua D.characters
 */
function validateMemoriamVariants(rows, cataloguedKeys) {
  /** @type {Map<string, string>} */
  const variantOf = new Map(rows.map((row) => [row.key, row.variantOfUnique]));
  for (const row of rows) {
    if (row.variantOfUnique === "") {
      continue;
    }
    /** @type {Set<string>} */
    const seen = new Set([row.key]);
    let current = row.variantOfUnique;
    while (current !== "") {
      if (seen.has(current)) {
        throw new Error(
          `MEMORIAMNPCCSV: variantOfUnique cycle at "${row.key}" through "${current}".`,
        );
      }
      seen.add(current);
      if (cataloguedKeys.has(current)) {
        break;
      }
      if (!variantOf.has(current)) {
        throw new Error(
          `MEMORIAMNPCCSV: "${row.key}" variantOfUnique "${row.variantOfUnique}" reaches "${current}", which is not a catalogued NPC or a Memoriam NPC.`,
        );
      }
      current = variantOf.get(current) || "";
    }
  }
}

/**
 * Character keys in D.characters (`name = {` at two-space indent, before the overrides block).
 * @param {string} luaText
 * @returns {Set<string>}
 */
function collectCharacterKeys(luaText) {
  const start = luaText.indexOf("D.characters = {");
  const end = luaText.indexOf("D.overrides");
  if (start < 0 || end < start) {
    throw new Error("lib/npcs_data.ttslua has no D.characters block to check variantOfUnique against.");
  }
  /** @type {Set<string>} */
  const keys = new Set();
  const slice = luaText.slice(start, end);
  for (const match of slice.matchAll(/^ {2}([A-Za-z_][A-Za-z0-9_]*) = \{$/gm)) {
    keys.add(match[1]);
  }
  if (keys.size < 1) {
    throw new Error("lib/npcs_data.ttslua D.characters listed no keys.");
  }
  return keys;
}

/**
 * @param {string} value
 * @returns {string}
 */
function luaString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

/**
 * @param {string} key
 * @returns {string}
 */
function luaKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`;
}

/**
 * TTS catalog: label, isGeneric, variantOfUnique. Location, year, and periods stay on the dashboard.
 * @param {ReturnType<typeof parseMemoriamNpcRows>} npcs
 * @returns {string}
 */
function renderMemoriamNpcCatalogLua(npcs) {
  const lines = [
    "-- AUTO-GENERATED by npm run memoriam-npcs:import — DO NOT EDIT BY HAND.",
    "-- Memoriam NPC keys for lib/npcs_data.ttslua. Location, year, and periods live in the dashboard catalog.",
    "",
    "return {",
  ];
  const sorted = [...npcs].sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  for (const npc of sorted) {
    lines.push(
      `  ${luaKey(npc.key)} = { label = ${luaString(npc.label)}, isGeneric = ${npc.isGeneric ? "true" : "false"}, variantOfUnique = ${luaString(npc.variantOfUnique)} },`,
    );
  }
  lines.push("}", "");
  return lines.join("\n");
}

function renderMemoriamNpcCatalogJson(payload) {
  return `${JSON.stringify(
    {
      generatedBy: "npm run memoriam-npcs:import",
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
  parseMemoriamNpcRows,
  renderMemoriamNpcCatalogJson,
  validateMemoriamVariants,
  collectCharacterKeys,
  renderMemoriamNpcCatalogLua,
};
