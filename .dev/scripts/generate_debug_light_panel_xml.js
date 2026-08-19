"use strict";

/**
 * Composes the Storyteller debug light panel from ui/.templates/storyteller/
 * (selection-button pool + authoring layout).
 * Run: node .dev/scripts/generate_debug_light_panel_xml.js
 * Wired into npm run debug-light-panel:generate and build:all-tooling
 * (before ui-global-xml:embed so hud_storyteller Include sees the generated pool).
 *
 * Keep POOL_SIZE in sync with core/light_debug_focus.ttslua SELECTION_POOL_SIZE.
 */

const fs = require("fs");
const path = require("path");

const {
  apply,
  stripLeadingParametersComment,
} = require("./ui_xml_template_engine");

const GENERATOR_REL = ".dev/scripts/generate_debug_light_panel_xml.js";
const TEMPLATE_REL = "ui/.templates/storyteller/panel_debug_light.xml";
const PARTIAL_REL = "ui/.templates/storyteller/partials/debug_button_light.xml";
const TARGET_COMMENT_REGEX = /^<!--\s*TARGET:\s*(\S+)\s*-->\s*$/;

/** Must match LightDebugFocus SELECTION_POOL_SIZE. */
const POOL_SIZE = 60;

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
 * @param {number} i 1-based slot
 * @returns {string}
 */
function slotToken(i) {
  return String(i).padStart(2, "0");
}

/**
 * @param {string} [projectRoot]
 */
function main(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, "../..");
  const templatePath = path.join(root, TEMPLATE_REL);
  const bodyRaw = fs.readFileSync(templatePath, "utf8");
  const targetRel = parseTargetFromFirstLine(bodyRaw, templatePath);
  const bodyTemplate = stripLeadingParametersComment(bodyRaw);

  const tplButton = loadPartial(root, PARTIAL_REL);
  const buttons = [];
  for (let i = 1; i <= POOL_SIZE; i += 1) {
    buttons.push(
      apply(tplButton, "debug_button_light", { SLOT: slotToken(i) }, undefined)
    );
  }
  const buttonsXml = buttons.join("\n    ");

  const composed = apply(
    bodyTemplate,
    "panel_debug_light",
    { BUTTONS: buttonsXml },
    { rawKeys: { BUTTONS: true } }
  );

  const outPath = path.join(root, ...targetRel.split("/"));
  const banner = [
    `<!-- Generated file. Edit ${TEMPLATE_REL} and partials under ui/.templates/storyteller/partials/ only. -->`,
    `<!-- Regenerate: node ${GENERATOR_REL} -->`,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, banner + composed + "\n", "utf8");

  const outRel = path.relative(root, outPath).split(path.sep).join("/");
  console.log(
    `[generate_debug_light_panel_xml] Wrote ${outRel} (${POOL_SIZE} selection slots)`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  POOL_SIZE,
};
