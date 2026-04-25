"use strict";

/**
 * Embeds ui/player/csheets/csheet_defaults.xml into a Lua module for runtime UI.setXml calls.
 * Run from repo root: node .dev/scripts/generate_csheet_defaults_lua.js
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_SOURCE_REL = ["ui", "player", "csheets", "csheet_defaults.xml"];
const DEFAULT_OUT_REL = ["lib", "csheet_defaults_xml.ttslua"];
const GENERATOR_REL = ".dev/scripts/generate_csheet_defaults_lua.js";

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
 * Chooses a Lua long-bracket delimiter that cannot be closed by the XML payload.
 * @param {string} text
 * @returns {{ open: string, close: string }}
 */
function makeLongBracketLiteral(text) {
  for (let level = 1; level <= 80; level += 1) {
    const marks = "=".repeat(level);
    const close = `]${marks}]`;
    if (!text.includes(close)) {
      return {
        open: `[${marks}[`,
        close,
      };
    }
  }
  throw new Error("Unable to find a safe Lua long-bracket delimiter for csheet defaults XML.");
}

/**
 * Checks that the source looks like the expected Defaults document before embedding it.
 * @param {string} xml
 */
function validateDefaultsXml(xml) {
  if (typeof xml !== "string" || xml.trim() === "") {
    throw new Error("csheet defaults XML is empty.");
  }
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<Defaults>") || !trimmed.endsWith("</Defaults>")) {
    throw new Error("csheet defaults XML must be a single <Defaults>...</Defaults> document.");
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
  validateDefaultsXml(xml);
  const literal = makeLongBracketLiteral(xml);
  const xmlWithFinalNewline = xml.endsWith("\n") ? xml : `${xml}\n`;

  return [
    "--[[",
    `    Character sheet XML defaults embedded from ${sourceRel}`,
    `    DO NOT EDIT BY HAND - regenerate: node ${generatorRel}`,
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
  console.log(`[csheet_defaults_lua] Wrote ${outRel} (${sizeKb} KB)`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLuaModule,
  makeLongBracketLiteral,
  validateDefaultsXml,
};
