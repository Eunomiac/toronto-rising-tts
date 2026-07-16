"use strict";

/**
 * Expands Prince's Court trait column placeholders in the reference-layer template from lib/json/Coterie.json.
 * Run from repo root before xml_color_template_generator.js (wired in package.json build:all-tooling).
 *
 * Writes ui/.templates/.build/panel_right_sidebar_referenceLayer.xml (trait columns baked; @@color@@ preserved).
 */

const fs = require("fs");
const path = require("path");

const { stripLeadingParametersComment, collectXmlFiles } = require("./embed_ui_xml_templates");
const { buildTraitPlaceholderMap } = require("./lib/trait_sheet_xml");
const { hydrateCoterieData, buildTraitSectionDividerFlags } = require("./lib/coterie_hydrate");
const { processConditionals } = require("./lib/ui_xml_template_apply");

const SOURCE_TEMPLATE_REL = path.join("ui", ".templates", "panel_right_sidebar_referenceLayer.xml");
const BUILD_TEMPLATE_REL = path.join("ui", ".templates", ".build", "panel_right_sidebar_referenceLayer.xml");
const COTERIE_JSON_REL = path.join("lib", "json", "Coterie.json");
const PRINCES_COURT_PARTIALS_REL = path.join("ui", ".templates", "princes_court");
const CSHEET_PROJECT_PARTIAL_REL = path.join(
  "ui",
  ".templates",
  "csheet",
  "partials",
  "project_block.xml"
);
const KEY_BASE_REL = path.join("ui", ".templates");

const TRAIT_TOKEN_REGEX = /@@(COTERIE|DOMAIN|HAVEN)_(BACKGROUNDS|MERITS|FLAWS)_COLUMN_[123]@@/g;
const COURT_PROJECT_BLOCKS_TOKEN = "@@COURT_PROJECT_BLOCKS@@";
const COURT_PROJECT_POOL = 8;

/**
 * @param {string} projectRoot
 * @returns {Record<string, string>}
 */
function loadPrincesCourtTemplates(projectRoot) {
  const keyBaseDir = path.join(projectRoot, KEY_BASE_REL);
  const partialsDir = path.join(projectRoot, PRINCES_COURT_PARTIALS_REL);
  const files = [];
  collectXmlFiles(partialsDir, keyBaseDir, files);
  /** @type {Record<string, string>} */
  const templates = {};
  for (const { key, fullPath } of files) {
    const raw = fs.readFileSync(fullPath, "utf8");
    templates[key] = stripLeadingParametersComment(raw);
  }
  return templates;
}

/**
 * @param {string} xml
 * @param {Record<string, string>} placeholders
 * @returns {string}
 */
function replacePlaceholders(xml, placeholders) {
  let out = xml;
  const keys = Object.keys(placeholders).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const token = `@@${key}@@`;
    out = out.split(token).join(placeholders[key]);
  }
  return out;
}

/**
 * Build the fixed Court page-3 project pool while preserving @@color@@ for the
 * downstream color-template generator.
 * @param {string} partialXml
 * @param {number} poolSize
 * @returns {string}
 */
function buildCourtProjectBlocks(partialXml, poolSize = COURT_PROJECT_POOL) {
  const count = Math.max(0, Math.floor(Number(poolSize) || 0));
  const source = stripLeadingParametersComment(partialXml)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(?:\r?\n){3,}/g, "\n\n")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  const blocks = [];
  for (let i = 1; i <= count; i += 1) {
    const slot = String(i).padStart(2, "0");
    let block = source.split("@@INDEX@@").join(slot);
    block = block.replace(/@@PROJECT_STAKE_[1-6]_CLASS@@/g, "self");
    block = block.replace(
      /id="((?:db_)?project_[^"]+)"/g,
      (_match, id) => {
        const courtId = id
          .replace(/^db_project_/, "db_court_project_")
          .replace(/^project_/, "court_project_");
        return `id="${courtId}_@@color@@"`;
      }
    );
    block = block.replace(
      /<Panel\s+class="project_container"\s*>/,
      `<Panel id="court_project_${slot}_@@color@@" class="project_container" active="false">`
    );
    blocks.push(block);
  }
  return blocks.join("\n");
}

/**
 * @param {string} projectRoot
 */
function main(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, "../..");
  const sourcePath = path.join(root, SOURCE_TEMPLATE_REL);
  const buildPath = path.join(root, BUILD_TEMPLATE_REL);
  const jsonPath = path.join(root, COTERIE_JSON_REL);
  const projectPartialPath = path.join(root, CSHEET_PROJECT_PARTIAL_REL);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source template not found: ${sourcePath}`);
  }
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Coterie JSON not found: ${jsonPath}`);
  }
  if (!fs.existsSync(projectPartialPath)) {
    throw new Error(`CSHEET project partial not found: ${projectPartialPath}`);
  }

  const coterieData = hydrateCoterieData(JSON.parse(fs.readFileSync(jsonPath, "utf8")));
  const templates = loadPrincesCourtTemplates(root);
  const placeholders = buildTraitPlaceholderMap(coterieData, templates);
  const projectPartial = fs.readFileSync(projectPartialPath, "utf8");
  placeholders.COURT_PROJECT_BLOCKS = buildCourtProjectBlocks(projectPartial);

  let templateXml = fs.readFileSync(sourcePath, "utf8");
  templateXml = processConditionals(templateXml, buildTraitSectionDividerFlags(coterieData));
  templateXml = replacePlaceholders(templateXml, placeholders);

  const remaining = templateXml.match(TRAIT_TOKEN_REGEX);
  if (remaining && remaining.length > 0) {
    throw new Error(
      `[princes_court_trait_placeholders] Unexpanded trait tokens remain: ${[...new Set(remaining)].join(", ")}`
    );
  }
  if (templateXml.includes(COURT_PROJECT_BLOCKS_TOKEN)) {
    throw new Error(
      `[princes_court_trait_placeholders] Unexpanded token remains: ${COURT_PROJECT_BLOCKS_TOKEN}`
    );
  }

  fs.mkdirSync(path.dirname(buildPath), { recursive: true });
  fs.writeFileSync(buildPath, templateXml, "utf8");

  const rel = path.relative(root, buildPath).split(path.sep).join("/");
  console.log(`[princes_court_trait_placeholders] Wrote ${rel} (${Object.keys(placeholders).length} column slots)`);
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  replacePlaceholders,
  buildCourtProjectBlocks,
  BUILD_TEMPLATE_REL,
};
