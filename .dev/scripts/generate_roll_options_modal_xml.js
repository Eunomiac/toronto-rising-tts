"use strict";

/**
 * Composes ST Roll Options modal XML from ui/.templates/roll/roll_options_modal.xml.
 * Roll condition buttons are generated from lib/condition_defs.ttslua (type roll + kind standard).
 * Run: node .dev/scripts/generate_roll_options_modal_xml.js
 */

const fs = require("fs");
const path = require("path");

const {
  apply,
  stripLeadingParametersComment,
} = require("./ui_xml_template_engine");

const GENERATOR_REL = ".dev/scripts/generate_roll_options_modal_xml.js";
const TARGET_COMMENT_REGEX = /^<!--\s*TARGET:\s*(\S+)\s*-->\s*$/;

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
 * @param {string} defsPath
 * @returns {{ id: string, displayName: string }[]}
 */
function readStandardRollConditions(defsPath) {
  const text = fs.readFileSync(defsPath, "utf8");
  const start = text.indexOf("CD.Defs = {");
  if (start < 0) {
    throw new Error("Failed to locate CD.Defs in lib/condition_defs.ttslua");
  }
  const body = text.slice(start);
  const entries = [];
  const entryRe = /^\s{2}(\w+)\s*=\s*\{([\s\S]*?)^\s{2}\},?\s*$/gm;
  let match;
  while ((match = entryRe.exec(body)) !== null) {
    const block = match[2];
    if (!/type\s*=\s*"roll"/.test(block) || !/kind\s*=\s*"standard"/.test(block)) {
      continue;
    }
    const idMatch = block.match(/id\s*=\s*"([^"]+)"/);
    const nameMatch = block.match(/displayName\s*=\s*"([^"]+)"/);
    if (!idMatch || !nameMatch) {
      continue;
    }
    entries.push({ id: idMatch[1], displayName: nameMatch[1] });
  }
  entries.sort((a, b) => {
    if (a.displayName !== b.displayName) {
      return a.displayName.localeCompare(b.displayName);
    }
    return a.id.localeCompare(b.id);
  });
  if (entries.length === 0) {
    throw new Error("No standard roll conditions found in CD.Defs");
  }
  return entries;
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
 * Distribute items round-robin into N columns.
 * @param {unknown[]} items
 * @param {number} columns
 * @returns {unknown[][]}
 */
function roundRobinColumns(items, columns) {
  const cols = Array.from({ length: columns }, () => []);
  items.forEach((item, index) => {
    cols[index % columns].push(item);
  });
  return cols;
}

/**
 * @param {string} projectRoot
 */
function main(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, "../..");
  const templatePath = path.join(
    root,
    "ui",
    ".templates",
    "roll",
    "roll_options_modal.xml"
  );
  const templateRaw = fs.readFileSync(templatePath, "utf8");
  const targetRel = parseTargetFromFirstLine(templateRaw, templatePath);
  const shellTemplate = stripLeadingParametersComment(templateRaw);

  const defsPath = path.join(root, "lib", "condition_defs.ttslua");
  const conditions = readStandardRollConditions(defsPath);
  const partialTpl = loadPartial(
    root,
    "ui/.templates/roll/partials/roll_options_roll_condition.xml"
  );

  const columnCount = 4;
  const columns = roundRobinColumns(conditions, columnCount);
  const columnXml = columns.map((col) =>
    col
      .map((entry) =>
        apply(partialTpl, "roll_options_roll_condition", {
          CONDITION_KEY: entry.id,
          CONDITION_NAME: entry.displayName,
        })
      )
      .join("\n")
  );

  const composed = apply(
    shellTemplate,
    "roll_options_modal",
    {
      ROLL_CONDITIONS_COLUMN_1: columnXml[0] || "",
      ROLL_CONDITIONS_COLUMN_2: columnXml[1] || "",
      ROLL_CONDITIONS_COLUMN_3: columnXml[2] || "",
      ROLL_CONDITIONS_COLUMN_4: columnXml[3] || "",
    },
    {
      rawKeys: {
        ROLL_CONDITIONS_COLUMN_1: true,
        ROLL_CONDITIONS_COLUMN_2: true,
        ROLL_CONDITIONS_COLUMN_3: true,
        ROLL_CONDITIONS_COLUMN_4: true,
      },
    }
  );

  const outPath = path.join(root, ...targetRel.split("/"));
  const templateRel = "ui/.templates/roll/roll_options_modal.xml";
  const banner = [
    `<!-- Generated file. Edit ${templateRel} and partials under ui/.templates/roll/partials/ only. -->`,
    `<!-- Regenerate: node ${GENERATOR_REL} -->`,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, banner + composed + "\n", "utf8");

  const outRel = path.relative(root, outPath).split(path.sep).join("/");
  console.log(
    `[generate_roll_options_modal_xml] Wrote ${outRel} (${conditions.length} roll conditions, ${columnCount} columns)`
  );
}

if (require.main === module) {
  main();
}

module.exports = { main, readStandardRollConditions };
