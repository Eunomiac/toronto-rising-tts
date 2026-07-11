"use strict";

const assert = require("assert");
const {
  CAMPAIGNS,
  extractLuaBlocks,
  extractRunSequenceTable,
  blockEndsWithHumanGate,
  extractTopLevelSuiteSteps,
  buildLuaModule,
} = require("./generate_e2e_playbook_lua.js");

assert.ok(CAMPAIGNS.Dice);
assert.ok(CAMPAIGNS.Scenes);

const sampleBlock = `U.RunSequence({
  function()
    printHeader("[HUMAN] Click Roll", 3)
  end
})`;

assert.strictEqual(blockEndsWithHumanGate(sampleBlock), true);

const autoBlock = `U.RunSequence({
  function() rollConfirm("Brown", { noActive = true }) end
})`;

assert.strictEqual(blockEndsWithHumanGate(autoBlock), false);

const tableText = extractRunSequenceTable(autoBlock, 1);
assert.ok(tableText.startsWith("{"));
assert.ok(tableText.endsWith("}"));

const markdown = "# Test\n\n```lua\n" + sampleBlock + "\n```\n\n```lua\n" + autoBlock + "\n```\n";
const blocks = extractLuaBlocks(markdown);
assert.strictEqual(blocks.length, 2);

const moduleText = buildLuaModule("Dice", ".dev/E2E Playbooks/Dice-E2E.md", [tableText], [false], { H: 12 }, ["H"]);
assert.ok(moduleText.includes('Playbook.suiteSteps = {'));
assert.ok(moduleText.includes('["H"] = 12'));

const suiteBlock = `U.RunSequence({
  function()
    printHeader("Scenes E2E: SUITE A - Apply library scene", 1)
  end
})`;
const suiteMd = "# Test\n\n```lua\n" + suiteBlock + "\n```\n";
const sceneSuiteBlocks = extractLuaBlocks(suiteMd);
const sceneSuites = extractTopLevelSuiteSteps(sceneSuiteBlocks);
assert.strictEqual(sceneSuites.suiteSteps.A, 1);

const sampleMd = "# Test\n\n```lua\n" + sampleBlock + "\n```\n";
const suiteBlocks = extractLuaBlocks(sampleMd);
const suites = extractTopLevelSuiteSteps(suiteBlocks);
assert.strictEqual(Object.keys(suites.suiteSteps).length, 0);

console.log("generate_e2e_playbook_lua.test.js: OK");
