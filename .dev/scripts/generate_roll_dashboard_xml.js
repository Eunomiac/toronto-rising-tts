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

/** Vertical stack — pixel offsets for absolute-positioned dashboard rows. */
const DASH_LAYOUT = {
  WIDTH: 730,
  ROW_GAP: 4,
  HEADER_H: 30,
  PC_ROW_H: 34,
  SLOTS_HEADER_H: 20,
  SLOT_ROW_H: 30,
  ST_ROW_H: 34,
};

/**
 * Tracks offsetXY Y for stacked dashboard rows.
 */
class VerticalStack {
  constructor() {
    this.y = 0;
  }

  /**
   * @param {number} height
   * @returns {string}
   */
  place(height) {
    const offsetY = this.y;
    this.y += height + DASH_LAYOUT.ROW_GAP;
    return String(offsetY);
  }

  /**
   * @returns {number}
   */
  bodyHeight() {
    return this.y > 0 ? this.y - DASH_LAYOUT.ROW_GAP : 0;
  }
}

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
  const bodyPath = path.join(root, "ui", ".templates", "roll", "dash_body.xml");

  const constantsPath = path.join(root, "lib", "constants.ttslua");
  const colors = readPlayerColorsFromConstants(constantsPath);

  const tplPc = loadPartial(root, "ui/.templates/roll/partials/dash_row_pc.xml");
  const tplSt = loadPartial(root, "ui/.templates/roll/partials/dash_row_st_live.xml");
  const tplSlot = loadPartial(root, "ui/.templates/roll/partials/dash_slot_row.xml");
  const tplActiveHeader = loadPartial(
    root,
    "ui/.templates/roll/partials/dash_active_header.xml"
  );
  const tplSlotsHeader = loadPartial(
    root,
    "ui/.templates/roll/partials/dash_slots_header.xml"
  );

  const stack = new VerticalStack();
  const dashWidth = String(DASH_LAYOUT.WIDTH);
  const dashInnerW = String(DASH_LAYOUT.WIDTH - 10);
  const dashDims = { DASH_WIDTH: dashWidth, DASH_INNER_W: dashInnerW };

  const activeHeader = apply(
    tplActiveHeader,
    "dash_active_header",
    { ...dashDims, ROW_OFFSET_Y: stack.place(DASH_LAYOUT.HEADER_H) },
    undefined
  );

  const pcRows = colors
    .map((color) =>
      apply(
        tplPc,
        "dash_row_pc",
        {
          ...dashDims,
          COLOR: color,
          ROW_BG: SEAT_ROW_BG[color] || "#333333",
          SHOW_OPTS: true,
          ROW_OFFSET_Y: stack.place(DASH_LAYOUT.PC_ROW_H),
        },
        undefined
      )
    )
    .join("\n");

  const slotsHeader = apply(
    tplSlotsHeader,
    "dash_slots_header",
    { ...dashDims, ROW_OFFSET_Y: stack.place(DASH_LAYOUT.SLOTS_HEADER_H) },
    undefined
  );

  const slotRows = [1, 2, 3]
    .map((i) =>
      apply(
        tplSlot,
        "dash_slot_row",
        {
          ...dashDims,
          SLOT_INDEX: String(i),
          ROW_OFFSET_Y: stack.place(DASH_LAYOUT.SLOT_ROW_H),
        },
        undefined
      )
    )
    .join("\n");

  const stLiveRow = apply(
    tplSt,
    "dash_row_st_live",
    {
      ...dashDims,
      SHOW_OBLIV_BUTTONS: true,
      SHOW_BRUTAL_BUTTONS: true,
      ROW_OFFSET_Y: stack.place(DASH_LAYOUT.ST_ROW_H),
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
      ...dashDims,
      BODY_HEIGHT: String(stack.bodyHeight()),
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

module.exports = { main, SEAT_ROW_BG, DASH_LAYOUT, VerticalStack };
