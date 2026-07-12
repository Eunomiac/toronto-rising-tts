"use strict";

/**
 * Extracts fenced `lua` U.RunSequence blocks from E2E playbook markdown into a Lua module
 * consumed by DEBUG.RunTest / RunTest in core/debug.ttslua.
 *
 * Usage (repo root):
 *   node .dev/scripts/generate_e2e_playbook_lua.js --campaign Dice
 *   node .dev/scripts/generate_e2e_playbook_lua.js --campaign all
 */
const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const GENERATOR_REL = ".dev/scripts/generate_e2e_playbook_lua.js";

/** @type {Record<string, { markdownRel: string, moduleRel: string }>} */
const CAMPAIGNS = {
  Dice: {
    markdownRel: path.join(".dev", "E2E Playbooks", "Dice-E2E.md"),
    moduleRel: path.join("lib", "e2e_playbook_dice.ttslua"),
  },
  Scenes: {
    markdownRel: path.join(".dev", "E2E Playbooks", "Scenes-E2E.md"),
    moduleRel: path.join("lib", "e2e_playbook_scenes.ttslua"),
  },
  Gameboard: {
    markdownRel: path.join(".dev", "E2E Playbooks", "Gameboard-E2E.md"),
    moduleRel: path.join("lib", "e2e_playbook_gameboard.ttslua"),
  },
};

/**
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
 * @param {string} repoRoot
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(repoRoot, relPath) {
  const abs = path.join(repoRoot, relPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing source file: ${relPath}`);
  }
  return fs.readFileSync(abs, "utf8");
}

/**
 * @param {string} markdown
 * @returns {string[]}
 */
function extractLuaBlocks(markdown) {
  const blocks = [];
  const pattern = /```lua\r?\n([\s\S]*?)```/g;
  let match = pattern.exec(markdown);
  while (match !== null) {
    blocks.push(match[1].trim());
    match = pattern.exec(markdown);
  }
  return blocks;
}

/**
 * Pull the `{ ... }` table argument from `U.RunSequence({ ... })`.
 * @param {string} blockText
 * @param {number} stepIndex
 * @returns {string}
 */
function extractRunSequenceTable(blockText, stepIndex) {
  const trimmed = blockText.trim();
  const prefix = "U.RunSequence(";
  if (!trimmed.startsWith(prefix)) {
    throw new Error(
      `Step ${stepIndex}: expected block to start with U.RunSequence( — got: ${trimmed.slice(0, 40)}…`
    );
  }

  let index = prefix.length;
  while (index < trimmed.length && /\s/.test(trimmed[index])) {
    index += 1;
  }
  if (trimmed[index] !== "{") {
    throw new Error(`Step ${stepIndex}: expected table argument after U.RunSequence(`);
  }

  let depth = 0;
  const start = index;
  for (; index < trimmed.length; index += 1) {
    const ch = trimmed[index];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const tableText = trimmed.slice(start, index + 1);
        const remainder = trimmed.slice(index + 1).trim();
        if (remainder !== ")") {
          throw new Error(
            `Step ${stepIndex}: expected closing ")" after RunSequence table — trailing: ${remainder.slice(0, 20)}`
          );
        }
        return tableText;
      }
    }
  }

  throw new Error(`Step ${stepIndex}: unbalanced braces in U.RunSequence table`);
}

/**
 * @param {string} tableText
 * @param {number} stepIndex
 */
function validateLuaTable(tableText, stepIndex) {
  try {
    luaparse.parse(`local __e2e_step = ${tableText}`, {
      luaVersion: "5.1",
      scope: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Step ${stepIndex}: Lua parse failed — ${message}`);
  }
}

/**
 * @param {string} blockText
 * @returns {boolean}
 */
function blockEndsWithHumanGate(blockText) {
  return /printHeader\("\[HUMAN\][^"]*"/.test(blockText);
}

/** Level-1 suite open banners only (not step substeps like H1). */
const SUITE_L1_HEADER_RE =
  /printHeader\("[^"]*E2E: SUITE (0|E2|[A-Z])\s*[-:][^"]*"\s*,\s*1\)/g;

/**
 * Maps top-level suite id → first RunSequence step index (1-based).
 * @param {string[]} blocks
 * @returns {{ suiteSteps: Record<string, number>, suiteIds: string[] }}
 */
function extractTopLevelSuiteSteps(blocks) {
  /** @type {Record<string, number>} */
  const suiteSteps = {};
  /** @type {string[]} */
  const suiteIds = [];
  blocks.forEach((block, idx) => {
    const stepNum = idx + 1;
    SUITE_L1_HEADER_RE.lastIndex = 0;
    let match = SUITE_L1_HEADER_RE.exec(block);
    while (match !== null) {
      const id = match[1];
      if (suiteSteps[id] === undefined) {
        suiteSteps[id] = stepNum;
        suiteIds.push(id);
      }
      match = SUITE_L1_HEADER_RE.exec(block);
    }
  });
  return { suiteSteps, suiteIds };
}

/**
 * @param {Record<string, number>} suiteSteps
 * @param {string[]} suiteIds
 * @returns {string}
 */
function formatSuiteStepsLua(suiteSteps, suiteIds) {
  const lines = suiteIds.map((id) => `    ["${id}"] = ${suiteSteps[id]},`);
  const idsLiteral = suiteIds.map((id) => `"${id}"`).join(", ");
  return [
    "Playbook.suiteSteps = {",
    lines.join("\n"),
    "}",
    "",
    `Playbook.suiteIds = { ${idsLiteral} }`,
  ].join("\n");
}

/**
 * @param {string} campaign
 * @param {string} sourceRel
 * @param {string[]} stepTables
 * @param {boolean[]} humanGates
 * @param {Record<string, number>} suiteSteps
 * @param {string[]} suiteIds
 * @returns {string}
 */
function buildLuaModule(campaign, sourceRel, stepTables, humanGates, suiteSteps, suiteIds) {
  const stepLines = stepTables.map((tableText, idx) => {
    const lines = tableText.split("\n");
    const indented = lines.map((line) => `        ${line}`).join("\n");
    return `    -- step ${idx + 1}\n${indented}`;
  });

  const humanGateLiteral = humanGates.map((v) => (v ? "true" : "false")).join(", ");

  return [
    "--[[",
    `    E2E playbook steps for campaign "${campaign}"`,
    `    Source: ${sourceRel}`,
    `    DO NOT EDIT BY HAND — regenerate: node ${GENERATOR_REL} --campaign ${campaign}`,
    "]]",
    "",
    "-- Module export is Playbook, not M — steps call M.setCamera (core.main) as a global.",
    "local Playbook = {}",
    "",
    `Playbook.campaign = "${campaign}"`,
    `Playbook.sourceMarkdown = "${sourceRel.replace(/\\/g, "/")}"`,
    `Playbook.stepCount = ${stepTables.length}`,
    "",
    "-- true when the markdown block ends with a [HUMAN] printHeader cue",
    `Playbook.humanGateAfterStep = { ${humanGateLiteral} }`,
    "",
    "-- Top-level suite id → first step index (RunTest campaign + suite jump)",
    formatSuiteStepsLua(suiteSteps, suiteIds),
    "",
    "Playbook.steps = {",
    stepLines.join(",\n"),
    "}",
    "",
    "return Playbook",
    "",
  ].join("\n");
}

/**
 * @param {string} repoRoot
 * @param {string} campaign
 */
function generateCampaign(repoRoot, campaign) {
  const config = CAMPAIGNS[campaign];
  if (!config) {
    throw new Error(`Unknown campaign "${campaign}". Known: ${Object.keys(CAMPAIGNS).join(", ")}`);
  }

  const markdown = readRepoFile(repoRoot, config.markdownRel);
  const blocks = extractLuaBlocks(markdown);
  if (blocks.length === 0) {
    throw new Error(`No \`\`\`lua blocks found in ${config.markdownRel}`);
  }

  const stepTables = [];
  const humanGates = [];
  blocks.forEach((block, idx) => {
    const stepIndex = idx + 1;
    const tableText = extractRunSequenceTable(block, stepIndex);
    validateLuaTable(tableText, stepIndex);
    stepTables.push(tableText);
    humanGates.push(blockEndsWithHumanGate(block));
  });

  const { suiteSteps, suiteIds } = extractTopLevelSuiteSteps(blocks);
  if (suiteIds.length === 0) {
    throw new Error(`No top-level SUITE banners found in ${config.markdownRel}`);
  }

  const lua = buildLuaModule(campaign, config.markdownRel, stepTables, humanGates, suiteSteps, suiteIds);
  const outAbs = path.join(repoRoot, config.moduleRel);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, lua, "utf8");

  console.log(
    `[e2e-playbook] ${campaign}: ${stepTables.length} steps → ${config.moduleRel.replace(/\\/g, "/")}`
  );
  console.log(
    `[e2e-playbook] human gates: ${humanGates.filter(Boolean).length} / ${humanGates.length}`
  );
  console.log(`[e2e-playbook] suites: ${suiteIds.join(", ")}`);
}

function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const campaignArg = getArgValue("--campaign") || "Dice";
  const campaignKey = campaignArg.toLowerCase() === "all"
    ? "All"
    : campaignArg.charAt(0).toUpperCase() + campaignArg.slice(1).toLowerCase();

  if (campaignKey === "All") {
    Object.keys(CAMPAIGNS).forEach((campaign) => {
      generateCampaign(repoRoot, campaign);
    });
    return;
  }

  if (!CAMPAIGNS[campaignKey]) {
    console.error(
      `Unknown --campaign "${campaignArg}". Prepared generators: ${Object.keys(CAMPAIGNS).join(", ")}`
    );
    process.exit(1);
  }

  generateCampaign(repoRoot, campaignKey);
}

if (require.main === module) {
  main();
}

module.exports = {
  CAMPAIGNS,
  extractLuaBlocks,
  extractRunSequenceTable,
  validateLuaTable,
  blockEndsWithHumanGate,
  extractTopLevelSuiteSteps,
  buildLuaModule,
};
