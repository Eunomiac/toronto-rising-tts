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
 * Google Sheets checkbox / boolean cells export as TRUE/FALSE.
 * @param {string} raw
 * @param {string} rowLabel
 * @param {string} [fieldName]
 * @returns {boolean}
 */
function parseSheetBoolean(raw, rowLabel, fieldName) {
  const field = fieldName || "isShown";
  const v = trimCell(raw).toLowerCase();
  if (v === "true") {
    return true;
  }
  if (v === "false") {
    return false;
  }
  throw new Error(`${rowLabel} ${field} must be TRUE or FALSE; got ${JSON.stringify(raw)}`);
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeHeader(value) {
  return trimCell(value).toLowerCase().replace(/\s+/g, " ");
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function splitPipeList(raw) {
  const trimmed = trimCell(raw);
  if (trimmed === "") {
    return [];
  }
  /** @type {string[]} */
  const out = [];
  for (const part of trimmed.split("|")) {
    const token = trimCell(part);
    if (token !== "") {
      out.push(token);
    }
  }
  return out;
}

/**
 * @param {string} raw
 * @param {string} rowLabel
 * @param {string} fieldName
 * @returns {number}
 */
function parseSheetInteger(raw, rowLabel, fieldName) {
  const v = trimCell(raw);
  if (!/^-?\d+$/.test(v)) {
    throw new Error(`${rowLabel} ${fieldName} must be an integer; got ${JSON.stringify(raw)}`);
  }
  return Number.parseInt(v, 10);
}

const MEMORIAM_REQUIRED_HEADERS = [
  "key",
  "characters",
  "start year",
  "end year",
  "location",
  "panel a display",
  "panel a isoutdoors",
  "panel a isdaytime",
  "panel a weather",
  "panel a location audio",
  "panel a url",
  "panel b display",
  "panel b isoutdoors",
  "panel b isdaytime",
  "panel b weather",
  "panel b location audio",
  "panel b url",
  "panel c display",
  "panel c isoutdoors",
  "panel c isdaytime",
  "panel c weather",
  "panel c location audio",
  "panel c url",
  "panel d display",
  "panel d isoutdoors",
  "panel d isdaytime",
  "panel d weather",
  "panel d location audio",
  "panel d url",
];

/**
 * @param {string[]} headerRow
 * @returns {Record<string, number>}
 */
function memoriamHeaderIndex(headerRow) {
  /** @type {Record<string, number>} */
  const map = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const name = normalizeHeader(headerRow[i]);
    if (name !== "" && map[name] == null) {
      map[name] = i;
    }
  }
  const missing = MEMORIAM_REQUIRED_HEADERS.filter((name) => map[name] == null);
  if (missing.length > 0) {
    throw new Error(
      `SKYBOXMEMORIAMCSV: expected header Key, Characters, Start Year, End Year, Location, Panel A–D fields; missing ${JSON.stringify(missing)}; got ${JSON.stringify(headerRow)}`,
    );
  }
  return map;
}

/**
 * @param {string[]} cells
 * @param {number} index
 * @returns {string}
 */
function cellAt(cells, index) {
  if (index == null || index < 0 || index >= cells.length) {
    return "";
  }
  return cells[index];
}

/**
 * @param {string[]} cells
 * @param {Record<string, number>} cols
 * @param {string} rowLabel
 * @param {"A"|"B"|"C"|"D"} letter
 * @param {{ optional: boolean }} opts
 * @returns {{
 *   display: string,
 *   isOutdoors: boolean,
 *   isDaytime: boolean,
 *   weather: string[],
 *   locationAudio: string,
 *   url: string,
 * } | null}
 */
function parseMemoriamPanel(cells, cols, rowLabel, letter, opts) {
  const prefix = `panel ${letter.toLowerCase()}`;
  const display = trimCell(cellAt(cells, cols[`${prefix} display`]));
  if (display === "") {
    if (opts.optional) {
      return null;
    }
    throw new Error(`${rowLabel} Panel ${letter} Display is required`);
  }
  return {
    display,
    isOutdoors: parseSheetBoolean(
      cellAt(cells, cols[`${prefix} isoutdoors`]),
      rowLabel,
      `Panel ${letter} isOutdoors`,
    ),
    isDaytime: parseSheetBoolean(
      cellAt(cells, cols[`${prefix} isdaytime`]),
      rowLabel,
      `Panel ${letter} isDaytime`,
    ),
    weather: splitPipeList(cellAt(cells, cols[`${prefix} weather`])),
    locationAudio: trimCell(cellAt(cells, cols[`${prefix} location audio`])),
    url: trimCell(cellAt(cells, cols[`${prefix} url`])),
  };
}

/**
 * @param {{
 *   key: string,
 *   startYear: number,
 *   endYear: number,
 *   location: string,
 *   panelA: object,
 *   panelB: object,
 *   panelC?: object,
 *   panelD?: object,
 * }} entry
 * @returns {typeof entry}
 */
function cloneMemoriamEntry(entry) {
  /** @param {object} panel */
  const clonePanel = (panel) => ({
    display: panel.display,
    isOutdoors: panel.isOutdoors,
    isDaytime: panel.isDaytime,
    weather: panel.weather.slice(),
    locationAudio: panel.locationAudio,
    url: panel.url,
  });
  const cloned = {
    key: entry.key,
    startYear: entry.startYear,
    endYear: entry.endYear,
    location: entry.location,
    panelA: clonePanel(entry.panelA),
    panelB: clonePanel(entry.panelB),
  };
  if (entry.panelC) {
    cloned.panelC = clonePanel(entry.panelC);
  }
  if (entry.panelD) {
    cloned.panelD = clonePanel(entry.panelD);
  }
  return cloned;
}

/**
 * @param {string} csvText
 * @returns {Record<string, Record<string, {
 *   key: string,
 *   startYear: number,
 *   endYear: number,
 *   location: string,
 *   panelA: object,
 *   panelB: object,
 *   panelC?: object,
 *   panelD?: object,
 * }>>}
 */
function parseMemoriamSkyboxRows(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 1) {
    throw new Error("SKYBOXMEMORIAMCSV: empty CSV");
  }
  const cols = memoriamHeaderIndex(rows[0]);
  /** @type {Record<string, Record<string, object>>} */
  const out = {};
  let dataRows = 0;
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells || cells.every((c) => trimCell(c) === "")) {
      continue;
    }
    const rowLabel = `SKYBOXMEMORIAMCSV: row ${r + 1}`;
    const key = trimCell(cellAt(cells, cols.key));
    if (!key) {
      continue;
    }
    const panelADisplay = trimCell(cellAt(cells, cols["panel a display"]));
    const panelBDisplay = trimCell(cellAt(cells, cols["panel b display"]));
    if (panelADisplay === "" && panelBDisplay === "") {
      continue;
    }
    const charactersRaw = cellAt(cells, cols.characters);
    const location = trimCell(cellAt(cells, cols.location));
    if (!LUA_IDENT_RE.test(key)) {
      throw new Error(
        `${rowLabel} key "${key}" must be a Lua identifier (A-Za-z_[A-Za-z0-9_]*)`,
      );
    }
    const characters = [];
    const seenCharacters = new Set();
    for (const token of splitPipeList(charactersRaw)) {
      if (!LUA_IDENT_RE.test(token)) {
        throw new Error(
          `${rowLabel} character "${token}" must be a Lua identifier (A-Za-z_[A-Za-z0-9_]*)`,
        );
      }
      if (seenCharacters.has(token)) {
        continue;
      }
      seenCharacters.add(token);
      characters.push(token);
    }
    if (characters.length < 1) {
      throw new Error(`${rowLabel} missing Characters: ${JSON.stringify(cells)}`);
    }
    if (!location) {
      throw new Error(`${rowLabel} missing Location: ${JSON.stringify(cells)}`);
    }
    const startYear = parseSheetInteger(cellAt(cells, cols["start year"]), rowLabel, "Start Year");
    const endYear = parseSheetInteger(cellAt(cells, cols["end year"]), rowLabel, "End Year");
    const panelA = parseMemoriamPanel(cells, cols, rowLabel, "A", { optional: false });
    const panelB = parseMemoriamPanel(cells, cols, rowLabel, "B", { optional: false });
    const panelC = parseMemoriamPanel(cells, cols, rowLabel, "C", { optional: true });
    const panelD = parseMemoriamPanel(cells, cols, rowLabel, "D", { optional: true });
    const entry = {
      key,
      startYear,
      endYear,
      location,
      panelA,
      panelB,
    };
    if (panelC) {
      entry.panelC = panelC;
    }
    if (panelD) {
      entry.panelD = panelD;
    }
    for (const character of characters) {
      if (!out[character]) {
        out[character] = {};
      }
      if (out[character][key]) {
        throw new Error(`${rowLabel} duplicate key "${key}" under character "${character}"`);
      }
      out[character][key] = cloneMemoriamEntry(entry);
    }
    dataRows += 1;
  }
  if (dataRows < 1) {
    throw new Error("SKYBOXMEMORIAMCSV: no data rows");
  }
  return out;
}

/**
 * @param {string} csvText
 * @returns {{ key: string, display: string, isShown: boolean, url: string }[]}
 */
function parseSkyboxCatalogRows(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 1) {
    throw new Error("SKYBOXCSV: empty CSV");
  }
  const header = rows[0].map((c) => trimCell(c).toLowerCase());
  if (
    header.length < 4 ||
    header[0] !== "key" ||
    header[1] !== "display" ||
    header[2] !== "isshown" ||
    header[3] !== "url"
  ) {
    throw new Error(
      `SKYBOXCSV: expected header Key,Display,isShown,URL; got ${JSON.stringify(rows[0])}`,
    );
  }
  /** @type {{ key: string, display: string, isShown: boolean, url: string }[]} */
  const out = [];
  const seen = new Set();
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells || cells.every((c) => trimCell(c) === "")) {
      continue;
    }
    const key = trimCell(cells[0]);
    const display = trimCell(cells[1]);
    const isShownRaw = cells[2];
    const url = trimCell(cells[3]);
    if (!key || !display || !url) {
      throw new Error(
        `SKYBOXCSV: row ${r + 1} missing Key, Display, or URL: ${JSON.stringify(cells)}`,
      );
    }
    const isShown = parseSheetBoolean(isShownRaw, `SKYBOXCSV: row ${r + 1}`);
    if (!LUA_IDENT_RE.test(key)) {
      throw new Error(
        `SKYBOXCSV: row ${r + 1} key "${key}" must be a Lua identifier (A-Za-z_[A-Za-z0-9_]*)`,
      );
    }
    if (seen.has(key)) {
      throw new Error(`SKYBOXCSV: duplicate key "${key}" at row ${r + 1}`);
    }
    seen.add(key);
    out.push({ key, display, isShown, url });
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
 * @param {string[]} lines
 * @param {string} name
 * @param {{
 *   display: string,
 *   isOutdoors: boolean,
 *   isDaytime: boolean,
 *   weather: string[],
 *   locationAudio: string,
 *   url: string,
 * }} panel
 * @param {string} indent
 */
function renderMemoriamPanelLua(lines, name, panel, indent) {
  lines.push(`${indent}${name} = {`);
  lines.push(`${indent}  display = "${escapeLuaString(panel.display)}",`);
  lines.push(`${indent}  isOutdoors = ${panel.isOutdoors ? "true" : "false"},`);
  lines.push(`${indent}  isDaytime = ${panel.isDaytime ? "true" : "false"},`);
  if (panel.weather.length < 1) {
    lines.push(`${indent}  weather = {},`);
  } else {
    lines.push(`${indent}  weather = {`);
    for (let i = 0; i < panel.weather.length; i += 1) {
      const comma = i < panel.weather.length - 1 ? "," : "";
      lines.push(`${indent}    "${escapeLuaString(panel.weather[i])}"${comma}`);
    }
    lines.push(`${indent}  },`);
  }
  lines.push(`${indent}  locationAudio = "${escapeLuaString(panel.locationAudio)}",`);
  lines.push(`${indent}  url = "${escapeLuaString(panel.url)}"`);
  lines.push(`${indent}},`);
}

/**
 * @param {{
 *   skyboxes: { key: string, display: string, isShown?: boolean, url: string }[],
 *   generics: string[],
 *   memoriam?: Record<string, Record<string, {
 *     key: string,
 *     startYear: number,
 *     endYear: number,
 *     location: string,
 *     panelA: object,
 *     panelB: object,
 *     panelC?: object,
 *     panelD?: object,
 *   }>>,
 *   meta: { sheetId: string, catalogRange: string, genericsRange: string, memoriamRange?: string },
 * }} args
 * @returns {string}
 */
function renderSkyboxesCatalogLua(args) {
  const { skyboxes, generics, memoriam = {}, meta } = args;
  const memoriamRange = meta.memoriamRange || "SKYBOXMEMORIAMCSV";
  const lines = [];
  lines.push("--[[");
  lines.push("    Toronto Rising — skybox catalog (keyed assets + generic URL pool).");
  lines.push("    AUTO-GENERATED from Google Sheet — DO NOT EDIT BY HAND.");
  lines.push(`    Sheet id: ${meta.sheetId}`);
  lines.push(
    `    Ranges: ${meta.catalogRange} (Key,Display,isShown,URL), ${meta.genericsRange} (URL), ${memoriamRange} (Key,Characters,Start Year,End Year,Location,Panel A–D)`,
  );
  lines.push("    Regenerate: npm run skyboxes:import");
  lines.push("    Script: .dev/scripts/import_skyboxes_from_sheet.js");
  lines.push("]]");
  lines.push("");
  lines.push("local SkyboxesCatalog = {}");
  lines.push("");
  lines.push("SkyboxesCatalog.Skyboxes = {");
  for (const entry of skyboxes) {
    const isShown = entry.isShown !== false;
    lines.push(`  ${entry.key} = {`);
    lines.push(`    key = "${escapeLuaString(entry.key)}",`);
    lines.push(`    display = "${escapeLuaString(entry.display)}",`);
    lines.push(`    isShown = ${isShown ? "true" : "false"},`);
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
  lines.push("SkyboxesCatalog.MemoriamSkyboxes = {");
  for (const character of Object.keys(memoriam)) {
    const byKey = memoriam[character] || {};
    lines.push(`  ${character} = {`);
    for (const key of Object.keys(byKey)) {
      const entry = byKey[key];
      lines.push(`    ${key} = {`);
      lines.push(`      key = "${escapeLuaString(entry.key)}",`);
      lines.push(`      startYear = ${entry.startYear},`);
      lines.push(`      endYear = ${entry.endYear},`);
      lines.push(`      location = "${escapeLuaString(entry.location)}",`);
      renderMemoriamPanelLua(lines, "panelA", entry.panelA, "      ");
      renderMemoriamPanelLua(lines, "panelB", entry.panelB, "      ");
      if (entry.panelC) {
        renderMemoriamPanelLua(lines, "panelC", entry.panelC, "      ");
      }
      if (entry.panelD) {
        renderMemoriamPanelLua(lines, "panelD", entry.panelD, "      ");
      }
      lines.push("    },");
    }
    lines.push("  },");
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
  parseMemoriamSkyboxRows,
  escapeLuaString,
  renderSkyboxesCatalogLua,
  LUA_IDENT_RE,
};
