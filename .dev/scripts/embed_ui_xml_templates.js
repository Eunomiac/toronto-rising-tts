"use strict";

/**
 * Embeds all .xml under ui/.templates/ into lib/ui_xml_templates.ttslua for runtime UI.setXml assembly.
 * Run from repo root: node .dev/scripts/embed_ui_xml_templates.js
 *
 * Template keys use forward-slash paths relative to ui/.templates/ (no .xml suffix),
 * e.g. csheet/page3, csheet/partials/bg_block.
 */
const fs = require("fs");
const path = require("path");

const { makeLongBracketLiteral } = require("./generate_csheet_defaults_lua");

/** Runtime-embed template roots (not top-level `ui/.templates/*.xml` color-expansion sources). */
const DEFAULT_TEMPLATE_ROOTS_REL = [
  ["ui", ".templates", "csheet"],
  ["ui", ".templates", "princes_court"],
];
const TEMPLATE_KEY_BASE_REL = ["ui", ".templates"];
const DEFAULT_OUT_REL = ["lib", "ui_xml_templates.ttslua"];
const GENERATOR_REL = ".dev/scripts/embed_ui_xml_templates.js";

/**
 * @param {string} fileText
 * @returns {string}
 */
function stripLeadingParametersComment(fileText) {
  const trimmed = fileText.trimStart();
  if (!trimmed.startsWith("<!--")) {
    return fileText.trim();
  }
  const end = trimmed.indexOf("-->");
  if (end < 0) {
    return fileText.trim();
  }
  const after = trimmed.slice(end + 3).trim();
  return after;
}

/**
 * @param {string} dir
 * @param {string} baseDir
 * @param {string[]} acc
 */
function collectXmlFiles(dir, baseDir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectXmlFiles(full, baseDir, acc);
    } else if (entry.isFile() && entry.name.endsWith(".xml")) {
      const rel = path.relative(baseDir, full).split(path.sep).join("/");
      const key = rel.replace(/\.xml$/i, "");
      acc.push({ key, fullPath: full });
    }
  }
}

/**
 * @param {Array<{ key: string, body: string }>} templates
 * @param {string} sourceRootRel
 * @returns {string}
 */
function buildLuaModule(templates, sourceRootRel) {
  const sorted = [...templates].sort((a, b) => a.key.localeCompare(b.key));
  const lines = [
    "--[[",
    `    Embedded UI XML templates from ${sourceRootRel}/`,
    `    DO NOT EDIT BY HAND - regenerate: node ${GENERATOR_REL}`,
    "]]",
    "",
    "local M = {}",
    "",
    "M._byKey = {}",
    "",
  ];

  for (const { key, body } of sorted) {
    const literal = makeLongBracketLiteral(body);
    const bodyWithNewline = body.endsWith("\n") ? body : `${body}\n`;
    lines.push(`M._byKey["${key}"] = ${literal.open}`);
    lines.push(bodyWithNewline + literal.close);
    lines.push("");
  }

  lines.push("--- @param templateKey string e.g. \"csheet/page3\"");
  lines.push("--- @return string|nil");
  lines.push("function M.get(templateKey)");
  lines.push("  if type(templateKey) ~= \"string\" or templateKey == \"\" then");
  lines.push("    return nil");
  lines.push("  end");
  lines.push("  return M._byKey[templateKey]");
  lines.push("end");
  lines.push("");
  lines.push("return M");
  lines.push("");

  return lines.join("\n");
}

/**
 * @param {string} projectRoot
 */
function main(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, "../..");
  const keyBaseDir = path.join(root, ...TEMPLATE_KEY_BASE_REL);
  const outPath = path.join(root, ...DEFAULT_OUT_REL);

  const files = [];
  const sourceRoots = [];
  for (const rootRel of DEFAULT_TEMPLATE_ROOTS_REL) {
    const templateRoot = path.join(root, ...rootRel);
    if (!fs.existsSync(templateRoot)) {
      console.warn(`[embed_ui_xml_templates] Skipping missing root: ${templateRoot}`);
      continue;
    }
    sourceRoots.push(path.relative(root, templateRoot).split(path.sep).join("/"));
    collectXmlFiles(templateRoot, keyBaseDir, files);
  }

  if (files.length === 0) {
    throw new Error("No .xml templates found under configured template roots");
  }

  const templates = files.map(({ key, fullPath }) => {
    const raw = fs.readFileSync(fullPath, "utf8");
    const body = stripLeadingParametersComment(raw);
    if (body === "") {
      console.warn(`[embed_ui_xml_templates] Skipping empty template: ${key}`);
      return null;
    }
    return { key, body };
  }).filter((t) => t !== null);

  const sourceRootRel = sourceRoots.join(", ");
  const lua = buildLuaModule(templates, sourceRootRel);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lua, "utf8");

  const outRel = path.relative(root, outPath).split(path.sep).join("/");
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[embed_ui_xml_templates] Wrote ${outRel} (${templates.length} templates, ${sizeKb} KB)`);
}

if (require.main === module) {
  main();
}

module.exports = {
  stripLeadingParametersComment,
  buildLuaModule,
  collectXmlFiles,
};
