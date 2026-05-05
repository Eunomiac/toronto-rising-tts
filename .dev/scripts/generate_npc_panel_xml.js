"use strict";

const fs = require("fs");
const path = require("path");

/** Area keys wired by the button columns in ui/storyteller/partials/panel_npcs_*.xml */
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
    return {
      key: entry.key,
      label: labelMatch ? labelMatch[1] : entry.key,
      headerName: nameMatch ? nameMatch[1] : areaHeaderNameFromKey(entry.key),
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

function optionalColorAttr(hexColor) {
  if (typeof hexColor !== "string" || !hexColor.match(/^#[0-9a-fA-F]{6}$/)) {
    return "";
  }
  return ` color="${xmlEscape(hexColor)}"`;
}

function withAlphaHex(hexColor, alphaHex = "CC", fallback = "#444444CC") {
  const match = typeof hexColor === "string" ? hexColor.match(/^#([0-9a-fA-F]{6})$/) : null;
  if (!match) {
    return fallback;
  }
  return `#${match[1].toUpperCase()}${alphaHex}`;
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
    const groupColor = withAlphaHex(leader?.labelColor || "", "CC", "#444444CC");
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
  assertAreasMatchPartials(areas);
  const characters = parseCharacters(source);
  const groupIds = parseGroupIds(source);
  const groupDisplayNames = parseCoterieDisplayNames(constantsSource);
  const xml = buildPanelXml(projectRoot, { areas, characters, groupIds, groupDisplayNames });
  fs.writeFileSync(outputPath, xml, "utf8");
  console.log(`[npc_panel_xml_generator] Wrote ${path.relative(projectRoot, outputPath)}`);
}

main();
