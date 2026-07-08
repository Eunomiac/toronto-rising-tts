"use strict";

/**
 * Builds `ui/storyteller/panel_scenes_location_modals.xml` from `lib/constants.ttslua`
 * (`C.Districts` + `C.Sites` keys and human `name` strings).
 *
 * Run from repo root: node .dev/scripts/generate_scenes_location_modals_xml.js
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const constantsPath = path.join(root, "lib", "constants.ttslua");
const outPath = path.join(root, "ui", "storyteller", "panel_scenes_location_modals.xml");

const BTN_COLORS = "#444444|#555555|#666666|rgba(0.3,0.3,0.3,0.5)";

/** Modal width/height (site modal is wide for many columns). */
const MODAL_WIDTH = 1120;
const MODAL_HEIGHT = 580;

/** How many picker buttons per row in district/site modals. */
const BUTTONS_PER_ROW = 8;

/**
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Same display `name` on multiple sites → append " 2", " 3", … (first keeps catalog label).
 * Bucket-local only (district list vs generic list are independent).
 *
 * @param {{ key: string, label: string }[]} rows mutable, already sorted for stable numbering
 */
function disambiguateDuplicatePickerLabels(rows) {
  const normCounts = new Map();
  for (const row of rows) {
    const norm = row.label.toLowerCase();
    normCounts.set(norm, (normCounts.get(norm) || 0) + 1);
  }
  const normIndex = new Map();
  for (const row of rows) {
    const norm = row.label.toLowerCase();
    if ((normCounts.get(norm) || 0) <= 1) {
      continue;
    }
    const i = (normIndex.get(norm) || 0) + 1;
    normIndex.set(norm, i);
    if (i >= 2) {
      row.label = `${row.label} ${i}`;
    }
  }
}

/**
 * @param {string} source
 * @param {string} marker e.g. `C.Districts =`
 */
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

/**
 * @param {string} tableBlock including outer `{` `}`
 */
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

/**
 * @param {string} s
 */
function xmlEscapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Grid of picker buttons: `BUTTONS_PER_ROW` per row. Display text is human `name` only;
 * lua handlers still read the canonical key from `id` (`scenes_pick_*_<key>`).
 *
 * @param {{ key: string, label: string }[]} rows
 * @param {"district"|"site"} kind
 * @param {string} [rowIndent] indent before each HorizontalLayout row (default 8 spaces)
 */
function renderPickerButtons(rows, kind, rowIndent = "        ") {
  const prefix = kind === "district" ? "scenes_pick_district_" : "scenes_pick_site_";
  const handler = kind === "district" ? "HUD_scenesPickDistrict" : "HUD_scenesPickSite";
  const btnIndent = `${rowIndent}  `;
  const chunks = chunkArray(rows, BUTTONS_PER_ROW);
  const blocks = [];
  for (const chunk of chunks) {
    const buttonLines = chunk.map((row) => {
      const id = `${prefix}${row.key}`;
      const label = row.label;
      return `${btnIndent}<Button id="${xmlEscapeAttr(id)}" class="hud_storyteller_button" fontSize="10" preferredHeight="34" minHeight="30" flexibleWidth="1" minWidth="0" colors="${BTN_COLORS}" textColor="#FFFFFF" text="${xmlEscapeAttr(label)}" onClick="${handler}" />`;
    });
    blocks.push(
      [`${rowIndent}<HorizontalLayout spacing="4" childForceExpandWidth="true" childAlignment="UpperCenter">`, ...buttonLines, `${rowIndent}</HorizontalLayout>`].join(
        "\n",
      ),
    );
  }
  return blocks.join("\n");
}

/**
 * @param {string} entryBody site entry `{ ... }` body including braces
 * @returns {string|null} `C.Districts.X` table key `X`, or null if no district line
 */
function parseSiteDistrictKey(entryBody) {
  const m = entryBody.match(/district\s*=\s*C\.Districts\.([A-Za-z_][A-Za-z0-9_]*)/);
  return m ? m[1] : null;
}

/**
 * Site modal: one bucket per district plus a generic bucket. Buckets are `<VerticalLayout>`
 * containers (not `<Panel>`) so they participate in the parent `VerticalLayout` flow — TTS
 * Panels stretch to fill their parent and overlap siblings, which made the always-active generic
 * bucket and the active district bucket occlude each other (TOR-83). Lua toggles `active` +
 * `visibility` on each bucket id; only the matching district bucket is active at a time, so the
 * active district sites stack above the always-visible generic list with no overlap.
 *
 * District buckets are emitted **before** the generic bucket so the selected district's sites
 * read first (top), with general sites below.
 *
 * @param {{ key: string, label: string }[]} districtEntries sorted
 * @param {Record<string, { key: string, label: string }[]>} sitesByDistrict
 * @param {{ key: string, label: string }[]} genericSites
 */
function renderSiteModalBody(districtEntries, sitesByDistrict, genericSites) {
  const buckets = [];
  for (const d of districtEntries) {
    const rows = sitesByDistrict[d.key] || [];
    const grid =
      rows.length === 0
        ? `      <Text fontSize="10" color="#888888" alignment="UpperCenter" text="No catalog sites are tied to this district." />`
        : renderPickerButtons(rows, "site", "      ");
    buckets.push(
      [
        `    <VerticalLayout id="scenes_site_group_dist_${d.key}" active="False" visibility="None" spacing="4" padding="0 0 10 0" childForceExpandWidth="true">`,
        `      <Text fontSize="11" fontStyle="Bold" color="#C9A84C" alignment="UpperCenter" text="${xmlEscapeAttr(`${d.label} — district sites`)}" />`,
        grid,
        `    </VerticalLayout>`,
      ].join("\n"),
    );
  }
  const genericGrid =
    genericSites.length === 0
      ? `      <Text fontSize="10" color="#888888" alignment="UpperCenter" text="No generic sites in catalog." />`
      : renderPickerButtons(genericSites, "site", "      ");
  buckets.push(
    [
      `    <VerticalLayout id="scenes_site_group_generic" active="True" visibility="Black|Host" spacing="4" padding="0 0 4 0" childForceExpandWidth="true">`,
      `      <Text fontSize="11" fontStyle="Bold" color="#AAAAAA" alignment="UpperCenter" text="General sites (no fixed district)" />`,
      genericGrid,
      `    </VerticalLayout>`,
    ].join("\n"),
  );
  return buckets.join("\n\n");
}

const luaSource = fs.readFileSync(constantsPath, "utf8");

const districtBlock = extractBlock(luaSource, "C.Districts =");
const siteBlock = extractBlock(luaSource, "C.Sites =");

const districtEntries = parseTopLevelEntries(districtBlock).map((entry) => {
  const nameMatch = entry.body.match(/name\s*=\s*"([^"]*)"/);
  const label = nameMatch ? nameMatch[1] : entry.key;
  return { key: entry.key, label };
});

/** @type {{ key: string, label: string, districtKey: string|null }[]} */
const siteEntries = parseTopLevelEntries(siteBlock).map((entry) => {
  const nameMatch = entry.body.match(/name\s*=\s*"([^"]*)"/);
  const label = nameMatch ? nameMatch[1] : entry.key;
  return { key: entry.key, label, districtKey: parseSiteDistrictKey(entry.body) };
});

/** Sort key: ignore a leading "The " (e.g. "The Discovery District" → "discovery district, the"). */
const sortKeyIgnoringLeadingThe = (label) => {
  const trimmed = String(label || "").trim();
  const rest = trimmed.replace(/^the\s+/i, "");
  if (rest !== trimmed) {
    return `${rest}, the`.toLowerCase();
  }
  return trimmed.toLowerCase();
};

const sortByLabel = (a, b) => {
  const la = sortKeyIgnoringLeadingThe(a.label);
  const lb = sortKeyIgnoringLeadingThe(b.label);
  if (la !== lb) {
    return la < lb ? -1 : 1;
  }
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

districtEntries.sort(sortByLabel);

/** @type {Record<string, { key: string, label: string }[]>} */
const sitesByDistrict = Object.fromEntries(districtEntries.map((d) => [d.key, []]));
/** @type {{ key: string, label: string }[]} */
const genericSites = [];
for (const site of siteEntries) {
  const { districtKey, ...row } = site;
  if (districtKey != null && sitesByDistrict[districtKey] != null) {
    sitesByDistrict[districtKey].push(row);
  } else {
    if (districtKey != null && sitesByDistrict[districtKey] == null) {
      console.warn(`Site "${site.key}" references unknown district "${districtKey}"; listing under General.`);
    }
    genericSites.push(row);
  }
}
for (const d of districtEntries) {
  sitesByDistrict[d.key].sort(sortByLabel);
  disambiguateDuplicatePickerLabels(sitesByDistrict[d.key]);
}
genericSites.sort(sortByLabel);
disambiguateDuplicatePickerLabels(genericSites);

const header = `<!-- AUTO-GENERATED — do not edit by hand. Source: lib/constants.ttslua -->
<!-- Regenerate: node .dev/scripts/generate_scenes_location_modals_xml.js -->
`;

const xml = `${header}
<!-- Host/Black only; centered pickers for Scenes panel district/site keys. -->
<Panel id="scenes_modal_districts_root" visibility="Black|Host" active="False" width="${MODAL_WIDTH}" height="${MODAL_HEIGHT}" rectAlignment="MiddleCenter" offsetXY="0 0">
  <VerticalLayout padding="14" spacing="8" color="#1A1A1AE6" childForceExpandWidth="true">
    <Text fontSize="16" fontStyle="Bold" color="#C9A84C" alignment="MiddleCenter" text="Pick district" />
    <Text fontSize="10" color="#888888" alignment="MiddleCenter" text="Sets district key field only — click Apply location + soundscape to push soundscape." />
    <HorizontalLayout spacing="8" childAlignment="MiddleCenter">
      <Button id="scenes_modal_districts_close" class="hud_storyteller_button" fontSize="12" preferredWidth="120" preferredHeight="32" colors="${BTN_COLORS}" textColor="#FFFFFF" text="Close" onClick="HUD_scenesCloseLocationModals" />
    </HorizontalLayout>
    <VerticalScrollView preferredHeight="460" minHeight="200" flexibleHeight="1" movementType="Clamped" vertical="true" horizontal="false" childForceExpandWidth="true">
      <VerticalLayout spacing="4" padding="4" childForceExpandWidth="true">
${renderPickerButtons(districtEntries, "district")}
      </VerticalLayout>
    </VerticalScrollView>
  </VerticalLayout>
</Panel>

<Panel id="scenes_modal_sites_root" visibility="Black|Host" active="False" width="${MODAL_WIDTH}" height="${MODAL_HEIGHT}" rectAlignment="MiddleCenter" offsetXY="0 0">
  <VerticalLayout padding="14" spacing="8" color="#1A1A1AE6" childForceExpandWidth="true">
    <Text fontSize="16" fontStyle="Bold" color="#C9A84C" alignment="MiddleCenter" text="Pick site" />
    <Text fontSize="10" color="#888888" alignment="MiddleCenter" text="District bucket matches sessionScene.districtKey; selected district sites list above the general sites. Apply location still required." />
    <HorizontalLayout spacing="8" childAlignment="MiddleCenter">
      <Button id="scenes_modal_sites_close" class="hud_storyteller_button" fontSize="12" preferredWidth="120" preferredHeight="32" colors="${BTN_COLORS}" textColor="#FFFFFF" text="Close" onClick="HUD_scenesCloseLocationModals" />
    </HorizontalLayout>
    <VerticalScrollView preferredHeight="460" minHeight="200" flexibleHeight="1" movementType="Clamped" vertical="true" horizontal="false" childForceExpandWidth="true">
      <VerticalLayout spacing="10" padding="4" childForceExpandWidth="true">
${renderSiteModalBody(districtEntries, sitesByDistrict, genericSites)}
      </VerticalLayout>
    </VerticalScrollView>
  </VerticalLayout>
</Panel>
`;

fs.writeFileSync(outPath, xml, "utf8");
const districtSiteCount = siteEntries.length - genericSites.length;
console.log(
  `Wrote ${outPath} (${districtEntries.length} districts, ${siteEntries.length} sites: ${districtSiteCount} district-scoped, ${genericSites.length} general)`,
);
