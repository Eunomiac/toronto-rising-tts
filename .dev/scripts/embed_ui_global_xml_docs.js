"use strict";

/**
 * Expands ui/Global.xml + ui/Global.join_minimal.xml Includes into a Lua module
 * for Host remount via UI.setXml (TOR-439 join-XML spike).
 *
 * Run from repo root: node .dev/scripts/embed_ui_global_xml_docs.js
 * Also wired into npm run build:all-tooling / package.json script ui-global-xml:embed.
 *
 * Include resolution (mirrors Rolandostar / TTS Save & Play for this repo):
 *   1. Relative to the including file's directory
 *   2. Relative to the repo root
 *   3. Relative to ui/
 */

const fs = require("fs");
const path = require("path");

const { makeLongBracketLiteral } = require("./generate_csheet_defaults_lua");

const GENERATOR_REL = ".dev/scripts/embed_ui_global_xml_docs.js";
const OUT_REL = ["lib", "ui_global_xml_docs.ttslua"];
const FULL_ROOT_REL = ["ui", "Global.xml"];
const MINIMAL_ROOT_REL = ["ui", "Global.join_minimal.xml"];

const INCLUDE_RE = /<Include\s+src\s*=\s*"([^"]+)"\s*\/>/gi;

/**
 * @param {string} projectRoot
 * @param {string} fromFile
 * @param {string} src
 * @returns {string}
 */
function resolveIncludePath(projectRoot, fromFile, src) {
  const candidates = [
    path.resolve(path.dirname(fromFile), src),
    path.resolve(projectRoot, src),
    path.resolve(projectRoot, "ui", src),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(
    `Include not found: src="${src}" from ${path.relative(projectRoot, fromFile)} ` +
      `(tried: ${candidates.map((c) => path.relative(projectRoot, c)).join(", ")})`
  );
}

/**
 * @param {string} projectRoot
 * @param {string} filePath
 * @param {Set<string>} stack
 * @returns {string}
 */
function expandXmlFile(projectRoot, filePath, stack) {
  const abs = path.resolve(filePath);
  const rel = path.relative(projectRoot, abs).split(path.sep).join("/");
  if (stack.has(abs)) {
    throw new Error(`Circular Include: ${[...stack, abs].map((p) => path.relative(projectRoot, p)).join(" → ")}`);
  }
  stack.add(abs);
  const raw = fs.readFileSync(abs, "utf8");
  const expanded = raw.replace(INCLUDE_RE, (_match, src) => {
    const childPath = resolveIncludePath(projectRoot, abs, src);
    const childRel = path.relative(projectRoot, childPath).split(path.sep).join("/");
    const body = expandXmlFile(projectRoot, childPath, stack);
    return `\n<!-- include ${childRel} -->\n${body}\n<!-- /include ${childRel} -->\n`;
  });
  stack.delete(abs);
  return expanded;
}

/**
 * @param {string} xml
 * @param {string} fieldName
 * @param {string} sourceRel
 * @returns {string}
 */
function fieldLiteral(xml, fieldName, sourceRel) {
  const literal = makeLongBracketLiteral(xml);
  const xmlWithNl = xml.endsWith("\n") ? xml : `${xml}\n`;
  return [
    `-- Expanded from ${sourceRel}`,
    `M.${fieldName} = ${literal.open}`,
    `${xmlWithNl}${literal.close}`,
  ].join("\n");
}

/**
 * @param {string} fullXml
 * @param {string} minimalXml
 * @returns {string}
 */
function buildLuaModule(fullXml, minimalXml) {
  return [
    "--[[",
    "    Expanded Global XmlUI documents for Host remount (TOR-439 join-XML spike).",
    `    DO NOT EDIT BY HAND - regenerate: node ${GENERATOR_REL}`,
    "]]",
    "",
    "local M = {}",
    "",
    fieldLiteral(fullXml, "full", "ui/Global.xml"),
    "",
    fieldLiteral(minimalXml, "minimal", "ui/Global.join_minimal.xml"),
    "",
    "--- @return string",
    "function M.getFull()",
    "    return M.full",
    "end",
    "",
    "--- @return string",
    "function M.getMinimal()",
    "    return M.minimal",
    "end",
    "",
    "return M",
    "",
  ].join("\n");
}

function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const fullRoot = path.join(projectRoot, ...FULL_ROOT_REL);
  const minimalRoot = path.join(projectRoot, ...MINIMAL_ROOT_REL);
  const outPath = path.join(projectRoot, ...OUT_REL);

  if (!fs.existsSync(fullRoot)) {
    throw new Error(`Missing ${FULL_ROOT_REL.join("/")}`);
  }
  if (!fs.existsSync(minimalRoot)) {
    throw new Error(`Missing ${MINIMAL_ROOT_REL.join("/")}`);
  }

  const fullXml = expandXmlFile(projectRoot, fullRoot, new Set());
  const minimalXml = expandXmlFile(projectRoot, minimalRoot, new Set());
  const lua = buildLuaModule(fullXml, minimalXml);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lua, "utf8");

  const outRel = path.relative(projectRoot, outPath).split(path.sep).join("/");
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(
    `[ui_global_xml_docs] Wrote ${outRel} (${sizeMb} MB; full=${(fullXml.length / 1024).toFixed(0)} KB, minimal=${(minimalXml.length / 1024).toFixed(0)} KB)`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  expandXmlFile,
  resolveIncludePath,
  buildLuaModule,
};
