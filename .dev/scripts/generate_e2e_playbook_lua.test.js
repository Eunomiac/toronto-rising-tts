"use strict";

const assert = require("assert");
const {
  extractLuaBlocks,
  extractRunSequenceTable,
  blockEndsWithHumanGate,
  buildLuaModule,
} = require("./generate_e2e_playbook_lua.js");

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

const moduleText = buildLuaModule("Dice", ".dev/E2E Playbooks/Dice-E2E.md", [tableText], [false]);
assert.ok(moduleText.includes('Playbook.campaign = "Dice"'));
assert.ok(moduleText.includes("Playbook.steps = {"));
assert.ok(!moduleText.includes("local M = {}"));

console.log("generate_e2e_playbook_lua.test.js: OK");
