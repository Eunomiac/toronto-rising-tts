"use strict";

const fs = require("fs");
const path = require("path");
const { writeFileResilient } = require("./write_file_resilient");

/** Area keys wired by the button columns in ui/storyteller/partials/panel_npcs_*.xml */
/** Areas in npcs_data with `excludeFromNpcPanel = true` are omitted from generated rows (e.g. preload). */
const WIRED_AREA_KEYS = ["centerForward", "farLeft", "farRight", "nearLeft", "nearRight"];

const PARTIAL_SHELL = "panel_npcs_shell.xml";
const PARTIAL_SEATED_ROW = "panel_npcs_seated_npc_row.xml";
const PARTIAL_AREA_HEADER = "panel_npcs_area_header_row.xml";
const PARTIAL_AREA_NPC_ROW = "panel_npcs_area_npc_row.xml";
const PARTIAL_GROUP_HEADER = "panel_npcs_group_header_row.xml";
const PARTIAL_GROUP_MEMBER_ROW = "panel_npcs_group_npc_row.xml";

const partialCache = new Map();

function extractBlock(source, marker) {
  const markerIndex = source.lastIndexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Missing marker: ${marker}`);
  }
  const startBrace = source.indexOf("{", markerIndex);
  if (startBrace < 0) {
    throw new Error(`Missing opening brace after marker: ${marker}`);
  }
  let depth = 0;
  for (let i = startBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startBrace, i + 1);
      }
    }
  }
  throw new Error(`Unterminated table block for marker: ${marker}`);
}

function parseTopLevelEntries(tableBlock) {
  const entries = [];
  const body = tableBlock.slice(1, -1);
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s|,/.test(body[i])) {
      i += 1;
    }
    if (i >= body.length) {
      break;
    }
    const keyMatch = body.slice(i).match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{/);
    if (!keyMatch) {
      i += 1;
      continue;
    }
    const key = keyMatch[1];
    const openIndex = i + keyMatch[0].lastIndexOf("{");
    let depth = 0;
    let endIndex = -1;
    for (let j = openIndex; j < body.length; j += 1) {
      const ch = body[j];
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          endIndex = j;
          break;
        }
      }
    }
    if (endIndex < 0) {
      throw new Error(`Failed to parse entry block for key ${key}`);
    }
    const entryBody = body.slice(openIndex, endIndex + 1);
    entries.push({ key, body: entryBody });
    i = endIndex + 1;
  }
  return entries;
}

function areaHeaderNameFromKey(key) {
  const words = key.replace(/([A-Z])/g, " $1").trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function parseAreas(luaSource) {
  const block = extractBlock(luaSource, "D.areas =");
  const entries = parseTopLevelEntries(block);
  return entries.map((entry) => {
    const nameMatch = entry.body.match(/name\s*=\s*"([^"]+)"/);
    const labelMatch = entry.body.match(/label\s*=\s*"([^"]+)"/);
    const excludeFromNpcPanel = /excludeFromNpcPanel\s*=\s*true/.test(entry.body);
    return {
      key: entry.key,
      label: labelMatch ? labelMatch[1] : entry.key,
      headerName: nameMatch ? nameMatch[1] : areaHeaderNameFromKey(entry.key),
      excludeFromNpcPanel,
    };
  });
}

function parseCharacters(luaSource) {
  const block = extractBlock(luaSource, "D.characters =");
  const entries = parseTopLevelEntries(block);
  return entries
    .map((entry) => {
      const fullNameMatch = entry.body.match(/fullName\s*=\s*"([^"]+)"/);
      const labelColorMatch = entry.body.match(/labelColor\s*=\s*"([^"]+)"/);
      const groups = {};
      const groupsMatch = entry.body.match(/groups\s*=\s*\{([\s\S]*?)\}/);
      if (groupsMatch) {
        const groupPairs = groupsMatch[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)/g);
        for (const pair of groupPairs) {
          groups[pair[1]] = Number(pair[2]);
        }
      }
      return {
        key: entry.key,
        fullName: fullNameMatch ? fullNameMatch[1] : entry.key,
        labelColor: labelColorMatch ? labelColorMatch[1] : null,
        groups,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function parseGroupIds(luaSource) {
  const block = extractBlock(luaSource, "D.characters =");
  const groups = new Set();
  const groupMatches = block.matchAll(/groups\s*=\s*\{([\s\S]*?)\}/g);
  for (const match of groupMatches) {
    const groupBody = match[1];
    const keys = groupBody.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g);
    for (const keyMatch of keys) {
      groups.add(keyMatch[1]);
    }
  }
  return Array.from(groups).sort();
}

function parseCoterieDisplayNames(constantsSource) {
  const coteriesBlock = extractBlock(constantsSource, "coteries =");
  const entries = parseTopLevelEntries(coteriesBlock);
  const out = {};
  for (const entry of entries) {
    const nameMatch = entry.body.match(/name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      out[entry.key] = nameMatch[1];
    }
  }
  return out;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

/**
 * Clamp a numeric byte channel to the 0..255 integer range.
 * Returns 0 for non-finite input so downstream formatting never produces NaN.
 *
 * @param {number} n - Channel value (may be a float; rounded to nearest int).
 * @returns {number} Integer in [0, 255].
 */
function clampByte(n) {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Clamp a unit-interval value (e.g. alpha or float RGB) to 0..1.
 * Returns 1 for non-finite input when used for alpha elsewhere; callers may
 * substitute 0 for RGB if they need a different default.
 *
 * @param {number} n - Value in [0, 1].
 * @returns {number} Number in [0, 1].
 */
function clampUnit(n) {
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(0, Math.min(1, n));
}

/**
 * Format one TTS UI color channel (or alpha) in 0..1 using **two significant figures**.
 * Exact 0 and 1 render as "0" and "1" without decimals.
 *
 * Uses scaled rounding (not `Number#toPrecision`), because `toPrecision` emits scientific
 * notation for small magnitudes (e.g. `"1e-7"`), and `String(number)` can keep that form.
 * TTS UI `colors` / `rgba()` attributes require plain decimal literals.
 *
 * @param {number} n - Channel in [0, 1] (non-finite values become "0").
 * @returns {string}
 */
function formatTwoSigFigUnit(n) {
  if (!Number.isFinite(n)) {
    return "0";
  }
  const u = Math.max(0, Math.min(1, n));
  if (u === 0) {
    return "0";
  }
  if (u === 1) {
    return "1";
  }

  const exp = Math.floor(Math.log10(u));
  const scale = Math.pow(10, 2 - 1 - exp);
  let rounded = Math.round(u * scale) / scale;

  if (rounded <= 0) {
    return "0";
  }
  if (rounded >= 1) {
    return "1";
  }

  const magnitudeExp = Math.floor(Math.log10(rounded));
  const decimalPlaces = Math.min(20, Math.max(1, -magnitudeExp + 1));
  let s = rounded.toFixed(decimalPlaces);
  s = s.replace(/\.?0+$/, "");
  return s;
}

/**
 * Parse three RGB components from `rgb(...)` / `rgba(...)`.
 * If max(R,G,B) > 1, components are treated as 8-bit (0..255) and divided by 255.
 * Otherwise they are treated as TTS-style floats in 0..1.
 *
 * @param {string} rRaw
 * @param {string} gRaw
 * @param {string} bRaw
 * @returns {{ r: number, g: number, b: number } | null}
 */
function parseRgbTriplet(rRaw, gRaw, bRaw) {
  const r = Number(rRaw);
  const g = Number(gRaw);
  const b = Number(bRaw);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return null;
  }
  const maxCh = Math.max(r, g, b);
  if (maxCh > 1) {
    return {
      r: clampByte(r) / 255,
      g: clampByte(g) / 255,
      b: clampByte(b) / 255,
    };
  }
  return {
    r: clampUnit(r),
    g: clampUnit(g),
    b: clampUnit(b),
  };
}

/**
 * Format a normalized color record as a TTS-friendly `rgba(r, g, b, a)` string.
 * All channels are **floats in 0..1**, each printed with **two significant figures**
 * (see `formatTwoSigFigUnit`). This matches Tabletop Simulator UI expectations.
 *
 * @param {{ r: number, g: number, b: number, a: number }} parsed - RGBA in unit space.
 * @returns {string}
 */
function formatRgba(parsed) {
  const rStr = formatTwoSigFigUnit(parsed.r);
  const gStr = formatTwoSigFigUnit(parsed.g);
  const bStr = formatTwoSigFigUnit(parsed.b);
  const aStr = formatTwoSigFigUnit(parsed.a);
  return `rgba(${rStr}, ${gStr}, ${bStr}, ${aStr})`;
}

/** Fallback group-header bar when the leader has no parseable `labelColor`. */
const FALLBACK_GROUP_RGBA = formatRgba({
  r: 68 / 255,
  g: 68 / 255,
  b: 68 / 255,
  a: 0.8,
});

/**
 * Parse a labelColor string from `lib/npcs_data.ttslua` into a normalized
 * `{ r, g, b, a }` record in **0..1 unit space**, accepting any of:
 *   - `rgba(R, G, B, A)` — R/G/B either 0..255 (any channel > 1 selects byte scale)
 *     or TTS-style 0..1 floats; A is always 0..1
 *   - `rgb(R, G, B)` (alpha defaults to 1)
 *   - `#RRGGBB` / `#RRGGBBAA` (converted to unit RGBA)
 *
 * Hex forms remain a fallback for legacy entries until fully migrated.
 *
 * @param {string} value
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 *          Null when the input is absent or cannot be parsed.
 */
function parseLabelColor(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/i
  );
  if (rgbaMatch) {
    const rgb = parseRgbTriplet(rgbaMatch[1], rgbaMatch[2], rgbaMatch[3]);
    if (!rgb) {
      return null;
    }
    return {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: rgbaMatch[4] === undefined ? 1 : clampUnit(Number(rgbaMatch[4])),
    };
  }

  const hexMatch = trimmed.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (hexMatch) {
    const rgbHex = hexMatch[1];
    return {
      r: parseInt(rgbHex.slice(0, 2), 16) / 255,
      g: parseInt(rgbHex.slice(2, 4), 16) / 255,
      b: parseInt(rgbHex.slice(4, 6), 16) / 255,
      a: hexMatch[2] ? clampUnit(parseInt(hexMatch[2], 16) / 255) : 1,
    };
  }

  return null;
}

/**
 * Build the optional ` color="rgba(...)"` attribute fragment for a per-NPC row.
 * Returns an empty string when the labelColor is missing or unparseable so the
 * row inherits the default text color rather than emitting a broken attribute.
 *
 * Alpha is intentionally forced to 1 here: per-NPC label rows are always rendered
 * fully opaque, regardless of the alpha encoded in the data (the alpha channel is
 * preserved in `npcs_data.ttslua` for non-panel consumers like spotlight tints).
 *
 * @param {string} labelColor - Raw labelColor string from `D.characters[*].labelColor`.
 * @returns {string} Empty string, or a leading-space color attribute fragment.
 */
function optionalColorAttr(labelColor) {
  const parsed = parseLabelColor(labelColor);
  if (!parsed) {
    return "";
  }
  return ` color="${xmlEscape(formatRgba({ r: parsed.r, g: parsed.g, b: parsed.b, a: 1 }))}"`;
}

/**
 * Resolve the group-header background color: take the leader's RGB and override
 * the alpha to a fixed value (0.8 by convention), so all group-header bars share
 * a consistent translucency regardless of how the leader's labelColor encodes alpha.
 *
 * @param {string} labelColor - The group leader's labelColor string.
 * @param {number} alpha - Forced alpha (0..1) applied to the group header.
 * @param {string} fallback - Color string returned when labelColor is missing/unparseable.
 * @returns {string} An `rgba(...)` string suitable for an XML `color="..."` attribute.
 */
function withAlphaOverride(labelColor, alpha, fallback) {
  const parsed = parseLabelColor(labelColor);
  if (!parsed) {
    return fallback;
  }
  return formatRgba({
    r: parsed.r,
    g: parsed.g,
    b: parsed.b,
    a: clampUnit(alpha),
  });
}

function stripLeadingXmlComment(source) {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("<!--")) {
    return source.trim();
  }
  const end = trimmed.indexOf("-->");
  if (end < 0) {
    return source.trim();
  }
  return trimmed.slice(end + 3).trim();
}

function loadPartial(projectRoot, filename) {
  if (partialCache.has(filename)) {
    return partialCache.get(filename);
  }
  const fullPath = path.join(projectRoot, "ui", "storyteller", "partials", filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing partial: ${path.relative(projectRoot, fullPath)}`);
  }
  const raw = fs.readFileSync(fullPath, "utf8");
  const body = stripLeadingXmlComment(raw);
  partialCache.set(filename, body);
  return body;
}

function applyTemplate(template, replacements) {
  let out = template;
  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const token = `@@${key}@@`;
    const val = replacements[key];
    if (val === undefined) {
      throw new Error(`Missing template value for ${token}`);
    }
    out = out.split(token).join(val);
  }
  const unfilled = out.match(/@@([a-zA-Z0-9_]+)@@/g);
  if (unfilled && unfilled.length > 0) {
    throw new Error(`Unfilled placeholders: ${unfilled.join(", ")}`);
  }
  return out;
}

function indentBlock(text, spaces) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
}

function assertAreasMatchPartials(areas) {
  const parsed = new Set(areas.map((a) => a.key));
  const wired = new Set(WIRED_AREA_KEYS);
  for (const k of wired) {
    if (!parsed.has(k)) {
      throw new Error(
        `npcs_data.ttslua D.areas is missing "${k}", which is wired in ui/storyteller/partials/. Add the area or update the partials.`
      );
    }
  }
  for (const a of areas) {
    if (!wired.has(a.key)) {
      throw new Error(
        `npcs_data.ttslua defines area "${a.key}" but ui/storyteller/partials/ only wire [${WIRED_AREA_KEYS.join(", ")}]. ` +
          `Extend the partial XML or remove the area.`
      );
    }
  }
}

function buildPanelXml(projectRoot, { areas, characters, groupIds, groupDisplayNames }) {
  const shell = loadPartial(projectRoot, PARTIAL_SHELL);
  const tplSeated = loadPartial(projectRoot, PARTIAL_SEATED_ROW);
  const tplAreaHeader = loadPartial(projectRoot, PARTIAL_AREA_HEADER);
  const tplAreaNpc = loadPartial(projectRoot, PARTIAL_AREA_NPC_ROW);
  const tplGroupHeader = loadPartial(projectRoot, PARTIAL_GROUP_HEADER);
  const tplGroupMember = loadPartial(projectRoot, PARTIAL_GROUP_MEMBER_ROW);

  const rows = [];
  const pushRow = (xmlFragment) => {
    rows.push(indentBlock(xmlFragment.trim(), 8));
  };

  pushRow('<Text class="hud_storyteller_header">Seated NPCs</Text>');
  for (let seatIndex = 1; seatIndex <= 4; seatIndex += 1) {
    pushRow(applyTemplate(tplSeated, { index: String(seatIndex) }));
  }

  pushRow('<Text class="hud_storyteller_header">Areas</Text>');
  const areasOrdered = [...areas].sort((a, b) => a.key.localeCompare(b.key));
  for (const area of areasOrdered) {
    pushRow(
      applyTemplate(tplAreaHeader, {
        area_key: area.key,
        area_name: xmlEscape(area.headerName),
      })
    );
    for (const npc of characters) {
      pushRow(
        applyTemplate(tplAreaNpc, {
          area_key: area.key,
          npc_key: npc.key,
          npc_name: xmlEscape(npc.fullName),
          npc_color_attr: optionalColorAttr(npc.labelColor),
        })
      );
    }
  }

  pushRow('<Text class="hud_storyteller_header">Groups</Text>');
  for (const groupId of groupIds) {
    const groupLabel = groupDisplayNames[groupId] || groupId;
    const groupMembers = characters
      .filter((ch) => typeof ch.groups[groupId] === "number")
      .sort((a, b) => {
        const rankDiff = chRank(a, groupId) - chRank(b, groupId);
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return a.key.localeCompare(b.key);
      });
    if (groupMembers.length === 0) {
      continue;
    }
    const leader = groupMembers.find((ch) => ch.groups[groupId] === 1);
    const groupColor = withAlphaOverride(leader?.labelColor || "", 0.8, FALLBACK_GROUP_RGBA);
    pushRow(
      applyTemplate(tplGroupHeader, {
        group_key: groupId,
        group_name: xmlEscape(groupLabel),
        group_color: xmlEscape(groupColor),
      })
    );
    for (const member of groupMembers) {
      pushRow(
        applyTemplate(tplGroupMember, {
          group_key: groupId,
          npc_key: member.key,
          npc_name: xmlEscape(member.fullName),
          member_color_attr: optionalColorAttr(member.labelColor),
        })
      );
    }
  }

  const contentRows = rows.join("\n");
  const panelInner = applyTemplate(shell, { content_rows: contentRows });
  return (
    `<!-- Generated file. Edit ui/storyteller/partials/panel_npcs_*.xml, this script, and lib/npcs_data.ttslua. -->\n` +
    `<!-- Storyteller NPC spawn / lighting panel (static rows; runtime toggles active/text via core/npcs.ttslua). -->\n` +
    `${panelInner.trim()}\n`
  );
}

function chRank(ch, groupId) {
  return Number(ch.groups[groupId] ?? 9999);
}

function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const npcDataPath = path.join(projectRoot, "lib", "npcs_data.ttslua");
  const constantsPath = path.join(projectRoot, "lib", "constants.ttslua");
  const outputPath = path.join(projectRoot, "ui", "storyteller", "panel_npcs.xml");
  const source = fs.readFileSync(npcDataPath, "utf8");
  const constantsSource = fs.readFileSync(constantsPath, "utf8");
  const areas = parseAreas(source).sort((a, b) => a.key.localeCompare(b.key));
  const panelAreas = areas.filter((a) => !a.excludeFromNpcPanel);
  const skipped = areas.filter((a) => a.excludeFromNpcPanel).map((a) => a.key);
  if (skipped.length > 0) {
    console.log(`[npc_panel_xml_generator] Skipping areas (excludeFromNpcPanel): ${skipped.join(", ")}`);
  }
  assertAreasMatchPartials(panelAreas);
  const characters = parseCharacters(source);
  const groupIds = parseGroupIds(source);
  const groupDisplayNames = parseCoterieDisplayNames(constantsSource);
  const xml = buildPanelXml(projectRoot, { areas: panelAreas, characters, groupIds, groupDisplayNames });
  writeFileResilient(outputPath, xml);
  console.log(`[npc_panel_xml_generator] Wrote ${path.relative(projectRoot, outputPath)}`);
}

main();
