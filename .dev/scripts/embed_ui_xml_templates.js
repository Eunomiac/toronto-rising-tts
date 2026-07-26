"use strict";

/**
 * Embeds UI XML templates under ui/.templates/{csheet,princes_court}/ into
 * per-consumer pack modules so object scripts only bundle keys they use.
 *
 * Run from repo root: node .dev/scripts/embed_ui_xml_templates.js
 *
 * Template keys use forward-slash paths relative to ui/.templates/ (no .xml suffix),
 * e.g. csheet/page3, csheet/partials/bg_block.
 *
 * Packs (object-script isolation):
 *   lib/ui_xml_templates_csheet_page3.ttslua
 *   lib/ui_xml_templates_csheet_page4.ttslua
 *   lib/ui_xml_templates_csheet_page5.ttslua
 *   lib/ui_xml_templates_princes_court.ttslua
 *
 * Consumers: require("lib.ui_xml_template").registerPack(require("lib.ui_xml_templates_…"))
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
const GENERATOR_REL = ".dev/scripts/embed_ui_xml_templates.js";

/**
 * Explicit packs — every collected template key must match exactly one pack.
 * Object CSHEET page entries require only their page pack (never princes_court).
 * @type {Array<{
 *   id: string,
 *   outRel: string[],
 *   keys?: string[],
 *   keyPrefix?: string,
 * }>}
 */
const PACKS = [
  {
    id: "csheet_page3",
    outRel: ["lib", "ui_xml_templates_csheet_page3.ttslua"],
    keys: [
      "csheet/page3",
      "csheet/partials/bg_block",
      "csheet/partials/merit_block",
      "csheet/partials/flaw_block",
    ],
  },
  {
    id: "csheet_page4",
    outRel: ["lib", "ui_xml_templates_csheet_page4.ttslua"],
    keys: [
      "csheet/page4",
      "csheet/partials/touchstone_block",
      "csheet/partials/sire_block",
      "csheet/partials/childe_block",
      "csheet/partials/thrall_block",
      "csheet/partials/regnant_block",
      "csheet/partials/otherRelation_block",
    ],
  },
  {
    id: "csheet_page5",
    outRel: ["lib", "ui_xml_templates_csheet_page5.ttslua"],
    keys: ["csheet/page5", "csheet/partials/project_block"],
  },
  {
    id: "princes_court",
    outRel: ["lib", "ui_xml_templates_princes_court.ttslua"],
    keyPrefix: "princes_court/",
  },
];

/** Legacy monolithic output — removed; fail loudly if required. */
const LEGACY_MONOLITH_OUT_REL = ["lib", "ui_xml_templates.ttslua"];

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
 * @param {Array<{ key: string, fullPath: string }>} acc
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
 * @param {string} packLabel
 * @returns {string}
 */
function buildLuaModule(templates, packLabel) {
  const sorted = [...templates].sort((a, b) => a.key.localeCompare(b.key));
  const lines = [
    "--[[",
    `    Embedded UI XML template pack: ${packLabel}`,
    `    DO NOT EDIT BY HAND - regenerate: node ${GENERATOR_REL}`,
    "    Register with: require(\"lib.ui_xml_template\").registerPack(require(\"…\"))",
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
 * @param {string} key
 * @param {typeof PACKS} packs
 * @returns {object|null}
 */
function findPackForKey(key, packs) {
  let matched = null;
  for (const pack of packs) {
    let hit = false;
    if (Array.isArray(pack.keys) && pack.keys.includes(key)) {
      hit = true;
    } else if (typeof pack.keyPrefix === "string" && key.startsWith(pack.keyPrefix)) {
      hit = true;
    }
    if (!hit) {
      continue;
    }
    if (matched !== null) {
      throw new Error(
        `[embed_ui_xml_templates] Template key "${key}" matches multiple packs: ${matched.id} and ${pack.id}`
      );
    }
    matched = pack;
  }
  return matched;
}

/**
 * @param {string} projectRoot
 */
function main(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, "../..");
  const keyBaseDir = path.join(root, ...TEMPLATE_KEY_BASE_REL);

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

  /** @type {Map<string, { key: string, body: string }>} */
  const byKey = new Map();
  for (const { key, fullPath } of files) {
    const raw = fs.readFileSync(fullPath, "utf8");
    const body = stripLeadingParametersComment(raw);
    if (body === "") {
      console.warn(`[embed_ui_xml_templates] Skipping empty template: ${key}`);
      continue;
    }
    if (byKey.has(key)) {
      throw new Error(`[embed_ui_xml_templates] Duplicate template key: ${key}`);
    }
    byKey.set(key, { key, body });
  }

  /** @type {Map<string, Array<{ key: string, body: string }>>} */
  const packTemplates = new Map();
  for (const pack of PACKS) {
    packTemplates.set(pack.id, []);
  }

  const orphans = [];
  for (const key of byKey.keys()) {
    const pack = findPackForKey(key, PACKS);
    if (pack === null) {
      orphans.push(key);
      continue;
    }
    packTemplates.get(pack.id).push(byKey.get(key));
  }

  if (orphans.length > 0) {
    throw new Error(
      `[embed_ui_xml_templates] Template keys not assigned to any pack:\n  - ${orphans.join("\n  - ")}`
    );
  }

  for (const pack of PACKS) {
    if (Array.isArray(pack.keys)) {
      const missing = pack.keys.filter((k) => !byKey.has(k));
      if (missing.length > 0) {
        throw new Error(
          `[embed_ui_xml_templates] Pack ${pack.id} lists missing keys:\n  - ${missing.join("\n  - ")}`
        );
      }
    }
  }

  const written = [];
  for (const pack of PACKS) {
    const templates = packTemplates.get(pack.id) || [];
    if (templates.length === 0) {
      throw new Error(`[embed_ui_xml_templates] Pack ${pack.id} has zero templates`);
    }
    const outPath = path.join(root, ...pack.outRel);
    const lua = buildLuaModule(templates, pack.id);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, lua, "utf8");
    const outRel = path.relative(root, outPath).split(path.sep).join("/");
    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
    written.push({ outRel, count: templates.length, sizeKb });
    console.log(
      `[embed_ui_xml_templates] Wrote ${outRel} (${templates.length} templates, ${sizeKb} KB)`
    );
  }

  const legacyPath = path.join(root, ...LEGACY_MONOLITH_OUT_REL);
  if (fs.existsSync(legacyPath)) {
    fs.unlinkSync(legacyPath);
    console.log(
      `[embed_ui_xml_templates] Removed legacy monolith ${LEGACY_MONOLITH_OUT_REL.join("/")}`
    );
  }

  const total = written.reduce((n, w) => n + w.count, 0);
  console.log(
    `[embed_ui_xml_templates] OK: ${written.length} packs, ${total} templates from ${sourceRoots.join(", ")}`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  stripLeadingParametersComment,
  buildLuaModule,
  collectXmlFiles,
  PACKS,
};
