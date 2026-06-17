"use strict";

/**
 * Composes ST Roll Dashboard body XML from ui/.templates/roll/ partials.
 * Run: node .dev/scripts/generate_roll_dashboard_xml.js
 * Wired into npm run roll-dashboard:generate and build:all-tooling.
 */

const fs = require("fs");
const path = require("path");

const {
  apply,
  stripLeadingParametersComment,
} = require("./ui_xml_template_engine");

const GENERATOR_REL = ".dev/scripts/generate_roll_dashboard_xml.js";
const TARGET_COMMENT_REGEX = /^<!--\s*TARGET:\s*(\S+)\s*-->\s*$/;

/**
 * @param {string} constantsPath
 * @returns {string[]}
 */
function readPlayerColorsFromConstants(constantsPath) {
  const constantsText = fs.readFileSync(constantsPath, "utf8");
  const match = constantsText.match(/C\.PlayerColors\s*=\s*\{([\s\S]*?)\}/m);
  if (!match) {
    throw new Error("Failed to locate C.PlayerColors in lib/constants.ttslua");
  }
  const colors = [];
  const quoted = match[1].matchAll(/"([^"]+)"/g);
  for (const m of quoted) {
    colors.push(m[1]);
  }
  if (colors.length === 0) {
    throw new Error("Failed to extract any player colors from C.PlayerColors");
  }
  return colors;
}

/** Seat row background colors (matches prior roll_panels.xml). */
const SEAT_ROW_BG = {
  Brown: "#654321",
  Orange: "#b45914",
  Red: "#ff0000",
  Pink: "#ff008c",
  Purple: "#9900ff",
};

/**
 * @param {string} projectRoot
 * @param {string} relPath
 * @returns {string}
 */
function loadPartial(projectRoot, relPath) {
  const full = path.join(projectRoot, relPath);
  const raw = fs.readFileSync(full, "utf8");
  return stripLeadingParametersComment(raw);
}

/**
 * @param {string} fileText
 * @param {string} templatePath
 * @returns {string}
 */
function parseTargetFromFirstLine(fileText, templatePath) {
  const lines = fileText.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") {
    i += 1;
  }
  if (i >= lines.length) {
    throw new Error(`Missing TARGET comment in ${templatePath}`);
  }
  const m = lines[i].match(TARGET_COMMENT_REGEX);
  if (!m) {
    throw new Error(
      `First non-empty line must be <!-- TARGET: path --> in ${templatePath}`
    );
  }
  return m[1].trim();
}

/**
 * @param {string} projectRoot
 */
function main(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, "../..");
  const partialsDir = path.join(root, "ui", ".templates", "roll", "partials");
  const bodyPath = path.join(root, "ui", ".templates", "roll", "dash_body.xml");

  const constantsPath = path.join(root, "lib", "constants.ttslua");
  const colors = readPlayerColorsFromConstants(constantsPath);

  const tplPc = loadPartial(root, "ui/.templates/roll/partials/dash_row_pc.xml");
  const tplSt = loadPartial(root, "ui/.templates/roll/partials/dash_row_st_live.xml");
  const tplSlot = loadPartial(root, "ui/.templates/roll/partials/dash_slot_row.xml");
  const activeHeader = loadPartial(
    root,
    "ui/.templates/roll/partials/dash_active_header.xml"
  );
  const slotsHeader = loadPartial(
    root,
    "ui/.templates/roll/partials/dash_slots_header.xml"
  );

  const pcRows = colors
    .map((color) => {
      const layoutKey =
        color === "Brown" ? "USE_FLEX_COLUMNS" : "USE_FIXED_COLUMNS";
      return apply(
        tplPc,
        "dash_row_pc",
        {
          COLOR: color,
          ROW_BG: SEAT_ROW_BG[color] || "#333333",
          SHOW_OPTS: true,
          [layoutKey]: true,
        },
        undefined
      );
    })
    .join("\n");

  const slotRows = [1, 2, 3]
    .map((i) =>
      apply(tplSlot, "dash_slot_row", { SLOT_INDEX: String(i) }, undefined)
    )
    .join("\n");

  const stLiveRow = apply(
    tplSt,
    "dash_row_st_live",
    {
      SHOW_OBLIV_BUTTONS: true,
      SHOW_BRUTAL_BUTTONS: true,
    },
    undefined
  );

  const bodyRaw = fs.readFileSync(bodyPath, "utf8");
  const targetRel = parseTargetFromFirstLine(bodyRaw, bodyPath);
  const bodyTemplate = stripLeadingParametersComment(bodyRaw);

  const composed = apply(
    bodyTemplate,
    "dash_body",
    {
      ACTIVE_HEADER: activeHeader,
      PC_ROWS: pcRows,
      SLOTS_HEADER: slotsHeader,
      SLOT_ROWS: slotRows,
      ST_LIVE_ROW: stLiveRow,
    },
    {
      rawKeys: {
        ACTIVE_HEADER: true,
        PC_ROWS: true,
        SLOTS_HEADER: true,
        SLOT_ROWS: true,
        ST_LIVE_ROW: true,
      },
    }
  );

  const outPath = path.join(root, ...targetRel.split("/"));
  const templateRel = "ui/.templates/roll/dash_body.xml";
  const banner = [
    `<!-- Generated file. Edit ${templateRel} and partials under ui/.templates/roll/partials/ only. -->`,
    `<!-- Regenerate: node ${GENERATOR_REL} -->`,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, banner + composed + "\n", "utf8");

  const outRel = path.relative(root, outPath).split(path.sep).join("/");
  console.log(
    `[generate_roll_dashboard_xml] Wrote ${outRel} (${colors.length} PC rows, 3 slot rows)`
  );
}

if (require.main === module) {
  main();
}

module.exports = { main, SEAT_ROW_BG };
