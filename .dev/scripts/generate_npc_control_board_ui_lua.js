"use strict";

/**
 * Embeds ui/objects/npc_control_board.xml into lib/npc_control_board_ui_xml.ttslua for runtime UI.setXml.
 * Run from repo root: node .dev/scripts/generate_npc_control_board_ui_lua.js
 */
const fs = require("fs");
const path = require("path");

const { makeLongBracketLiteral } = require("./generate_csheet_defaults_lua.js");

const DEFAULT_SOURCE_REL = ["ui", "objects", "npc_control_board.xml"];
const DEFAULT_OUT_REL = ["lib", "npc_control_board_ui_xml.ttslua"];
const GENERATOR_REL = ".dev/scripts/generate_npc_control_board_ui_lua.js";

/**
 * Returns an argument value after a flag, or null when absent.
 * @param {string} flagName
 * @returns {string | null}
 */
function getArgValue(flagName) {
  const idx = process.argv.indexOf(flagName);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[idx + 1];
}

/**
 * Checks that the source looks like the expected CONTROL_BOARD XmlUI document before embedding it.
 * @param {string} xml
 */
function validateControlBoardXml(xml) {
  if (typeof xml !== "string" || xml.trim() === "") {
    throw new Error("npc_control_board XML is empty.");
  }
  if (!xml.includes('id="gb_root"')) {
    throw new Error('npc_control_board XML must include Panel id="gb_root".');
  }
  if (!xml.includes('id="gb_apply"')) {
    throw new Error('npc_control_board XML must include Button id="gb_apply".');
  }
}

/**
 * Builds the generated Lua module text.
 * @param {string} xml
 * @param {string} sourceRel
 * @param {string} generatorRel
 * @returns {string}
 */
function buildLuaModule(xml, sourceRel, generatorRel) {
  validateControlBoardXml(xml);
  const literal = makeLongBracketLiteral(xml);
  const xmlWithFinalNewline = xml.endsWith("\n") ? xml : `${xml}\n`;

  return [
    "--[[",
    `    CONTROL_BOARD object XmlUI embedded from ${sourceRel}`,
    "    DO NOT EDIT BY HAND - regenerate:",
    `    node ${generatorRel}`,
    "    or: npm run npc-control-board-ui:generate",
    "]]",
    "",
    "local D = {}",
    "",
    `D.XML = ${literal.open}`,
    `${xmlWithFinalNewline}${literal.close}`,
    "",
    "--- @return string",
    "function D.getXml()",
    "  return D.XML",
    "end",
    "",
    "return D",
    "",
  ].join("\n");
}

/**
 * Resolves a CLI path relative to the project root.
 * @param {string} projectRoot
 * @param {string | null} cliValue
 * @param {string[]} defaultSegments
 * @returns {string}
 */
function resolveProjectPath(projectRoot, cliValue, defaultSegments) {
  if (cliValue === null || cliValue.trim() === "") {
    return path.join(projectRoot, ...defaultSegments);
  }
  if (path.isAbsolute(cliValue)) {
    return cliValue;
  }
  return path.join(projectRoot, cliValue);
}

function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const sourcePath = resolveProjectPath(projectRoot, getArgValue("--source"), DEFAULT_SOURCE_REL);
  const outPath = resolveProjectPath(projectRoot, getArgValue("--out"), DEFAULT_OUT_REL);

  const xml = fs.readFileSync(sourcePath, "utf8");
  const sourceRel = path.relative(projectRoot, sourcePath).split(path.sep).join("/");
  const lua = buildLuaModule(xml, sourceRel, GENERATOR_REL);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lua, "utf8");

  const outRel = path.relative(projectRoot, outPath).split(path.sep).join("/");
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[npc_control_board_ui_lua] Wrote ${outRel} (${sizeKb} KB)`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLuaModule,
  validateControlBoardXml,
};
