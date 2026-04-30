"use strict";

const fs = require("fs");
const path = require("path");

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

function parseAreas(luaSource) {
  const block = extractBlock(luaSource, "D.areas =");
  const entries = parseTopLevelEntries(block);
  return entries.map((entry) => {
    const labelMatch = entry.body.match(/label\s*=\s*"([^"]+)"/);
    return {
      key: entry.key,
      label: labelMatch ? labelMatch[1] : entry.key,
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

function withAlphaHex(hexColor, alphaHex = "CC", fallback = "#444444CC") {
  const match = typeof hexColor === "string" ? hexColor.match(/^#([0-9a-fA-F]{6})$/) : null;
  if (!match) {
    return fallback;
  }
  return `#${match[1].toUpperCase()}${alphaHex}`;
}

function buildPanelXml({ areas, characters, groupIds, groupDisplayNames }) {
  const rows = [];

  rows.push('<Text class="hud_storyteller_header">Seated NPCs</Text>');
  const seatKeys = ["NPC1", "NPC2", "NPC3", "NPC4"];
  for (const seatKey of seatKeys) {
    const toAreaButtons = areas
      .map(
        (area) =>
          `<Button id="npc_seated_toArea_${seatKey}_${area.key}" class="hud_storyteller_button hud_storyteller_button_icon" onClick="HUD_npcDispatch">${xmlEscape(area.label)}</Button>`
      )
      .join("");
    rows.push(`<HorizontalLayout id="npc_seatedRow_${seatKey}" class="hud_storyteller_button_row" active="false">
  <Text id="npc_seatedLabel_${seatKey}" class="hud_storyteller_label hud_storyteller_button_icon_narrow">${xmlEscape(seatKey)}</Text>
  <Text id="npc_seatedName_${seatKey}" class="hud_storyteller_label hud_storyteller_row_name">-</Text>
  ${toAreaButtons}
  <Button id="npc_seated_unseat_${seatKey}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onClick="HUD_npcDispatch">✕</Button>
  <Panel class="hud_storyteller_horiz_spacer" />
</HorizontalLayout>`);
  }

  rows.push('<Text class="hud_storyteller_header">Areas</Text>');
  for (const area of areas) {
    const moveGroupButtons = areas
      .filter((target) => target.key !== area.key)
      .map(
        (target) =>
          `<Button id="npc_moveGroup_${area.key}_${target.key}" class="hud_storyteller_button hud_storyteller_button_icon" onClick="HUD_npcDispatch">${xmlEscape(target.label)}</Button>`
      )
      .join("");
    rows.push(
      `<HorizontalLayout id="npc_areaHeader_${area.key}" class="hud_storyteller_button_row" active="false">` +
        `<Text id="npc_areaLabel_${area.key}" class="hud_storyteller_label hud_storyteller_row_name">${xmlEscape(area.label)}</Text>` +
        moveGroupButtons +
        `<Button id="npc_clearArea_${area.key}" class="hud_storyteller_button hud_storyteller_button_icon" onClick="HUD_npcDispatch">✕</Button>` +
        `<Panel class="hud_storyteller_horiz_spacer" />` +
        `</HorizontalLayout>`
    );

    for (const npc of characters) {
      const npcName = npc.key;
      const nameColorAttr = npc.labelColor ? ` color="${xmlEscape(npc.labelColor)}"` : "";
      const moveOneButtons = areas
        .filter((target) => target.key !== area.key)
        .map(
          (target) =>
            `<Button id="npc_move_${area.key}_${npcName}_${target.key}" class="hud_storyteller_button hud_storyteller_button_icon" onClick="HUD_npcDispatch">${xmlEscape(target.label)}</Button>`
        )
        .join("");
      rows.push(`<HorizontalLayout id="npc_occRow_${area.key}_${npcName}" class="hud_storyteller_button_row" active="false">
  <Button id="npc_toggle_${area.key}_${npcName}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onClick="HUD_npcDispatch">⊚</Button>
  <Button id="npc_spot_${area.key}_${npcName}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onMouseDown="HUD_npcSpotDown" onMouseUp="HUD_npcSpotUp">◎</Button>
  <Text id="npc_occName_${area.key}_${npcName}" class="hud_storyteller_label hud_storyteller_row_name"${nameColorAttr}>${xmlEscape(npc.fullName)}</Text>
  <Button id="npc_stats_${area.key}_${npcName}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onClick="HUD_npcDispatch">i</Button>
  ${moveOneButtons}
  <Button id="npc_remove_${area.key}_${npcName}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onClick="HUD_npcDispatch">✕</Button>
  <Panel class="hud_storyteller_horiz_spacer" />
</HorizontalLayout>`);
    }
  }

  rows.push('<Text class="hud_storyteller_header">Groups</Text>');
  for (const groupId of groupIds) {
    const groupLabel = groupDisplayNames[groupId] || groupId;
    const groupMembers = characters
      .filter((ch) => typeof ch.groups[groupId] === "number")
      .sort((a, b) => {
        const rankDiff = chRank(a, groupId) - chRank(b, groupId);
        if (rankDiff !== 0) return rankDiff;
        return a.key.localeCompare(b.key);
      });
    if (groupMembers.length === 0) {
      continue;
    }
    const leader = groupMembers.find((ch) => ch.groups[groupId] === 1);
    const groupColor = withAlphaHex(leader?.labelColor || "", "CC", "#444444CC");
    const groupColorAttr = ` color="${xmlEscape(groupColor)}"`;
    const groupButtons = areas
      .map(
        (area) =>
          `<Button id="npc_group_${groupId}_${area.key}" class="hud_storyteller_button hud_storyteller_button_icon npc_group_button_icon" onClick="HUD_npcDispatch">${xmlEscape(area.label)}</Button>`
      )
      .join("");
    rows.push(`<HorizontalLayout id="npc_groupRow_${groupId}" class="hud_storyteller_button_row" active="true"${groupColorAttr}>
  <Button id="npc_groupTwirl_${groupId}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow npc_group_button_icon" onClick="HUD_npcDispatch">▸</Button>
  <Text id="npc_groupName_${groupId}" class="hud_storyteller_label hud_storyteller_row_name npc_group_row_name">${xmlEscape(groupLabel)}</Text>
  ${groupButtons}
  <Panel class="hud_storyteller_horiz_spacer" />
</HorizontalLayout>`);

    for (const member of groupMembers) {
      const memberColorAttr = member.labelColor ? ` color="${xmlEscape(member.labelColor)}"` : "";
      const memberLocButtons = areas
        .map(
          (area) =>
            `<Button id="npc_memberLoc_${groupId}_${member.key}_${area.key}" class="hud_storyteller_button hud_storyteller_button_icon" onClick="HUD_npcDispatch">${xmlEscape(area.label)}</Button>`
        )
        .join("");
      const memberSeatButtons = seatKeys
        .map(
          (seatKey, index) =>
            `<Button id="npc_memberLoc_${groupId}_${member.key}_${seatKey}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onClick="HUD_npcDispatch">${index + 1}</Button>`
        )
        .join("");
      rows.push(`<HorizontalLayout id="npc_groupMemberRow_${groupId}_${member.key}" class="hud_storyteller_button_row npc_group_member_row" active="false">
  <Text id="npc_groupMemberName_${groupId}_${member.key}" class="hud_storyteller_label hud_storyteller_row_name"${memberColorAttr}>${xmlEscape(member.fullName)}</Text>
  <Button id="npc_memberLock_${groupId}_${member.key}" class="hud_storyteller_button hud_storyteller_button_icon" onClick="HUD_npcDispatch">⨀</Button>
  ${memberLocButtons}
  ${memberSeatButtons}
  <Button id="npc_unseat_${member.key}" class="hud_storyteller_button hud_storyteller_button_icon hud_storyteller_button_icon_narrow" onClick="HUD_npcDispatch">✕</Button>
  <Panel class="hud_storyteller_horiz_spacer" />
</HorizontalLayout>`);
    }
  }

  return `<!-- Generated file. Edit .dev/scripts/generate_npc_panel_xml.js and lib/npcs_data.ttslua only. -->
<!-- Storyteller NPC spawn / lighting panel (static rows; runtime toggles active/text via core/npcs.ttslua). -->
<Panel id="panel_npcs" class="npc_panel_root">
  <VerticalLayout class="npc_panel_layout_root">
    <VerticalScrollView class="npc_panel_scroll">
      <VerticalLayout id="npcPanelRowsRoot" class="npc_panel_rows_root">
${rows.map((row) => `          ${row}`).join("\n")}
      </VerticalLayout>
    </VerticalScrollView>
  </VerticalLayout>
</Panel>
`;
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
  const characters = parseCharacters(source);
  const groupIds = parseGroupIds(source);
  const groupDisplayNames = parseCoterieDisplayNames(constantsSource);
  const xml = buildPanelXml({ areas, characters, groupIds, groupDisplayNames });
  fs.writeFileSync(outputPath, xml, "utf8");
  console.log(`[npc_panel_xml_generator] Wrote ${path.relative(projectRoot, outputPath)}`);
}

main();
