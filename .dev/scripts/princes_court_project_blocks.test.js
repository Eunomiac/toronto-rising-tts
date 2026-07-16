"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildCourtProjectBlocks,
} = require("./princes_court_trait_placeholders.js");

test("buildCourtProjectBlocks expands eight full sheet-style Court project blocks", () => {
  const partial = [
    '<Panel id="court_project_@@SLOT@@_@@color@@" class="project_container">',
    '  <Image id="court_project_@@SLOT@@_scope_dot_1_@@color@@" class="project_scope_dot" />',
    '  <Text id="court_project_@@SLOT@@_goal_@@color@@" class="project_goal_text" />',
    '  <Image id="court_project_@@SLOT@@_project_die_@@color@@" class="project_die" />',
    '  <Image id="court_project_@@SLOT@@_result_image_@@color@@" class="project_result_image" />',
    '  <Text id="court_project_@@SLOT@@_result_margin_@@color@@" class="project_result_margin" />',
    '  <GridLayout id="court_project_@@SLOT@@_stakes_@@color@@" class="project_stake_container">',
    '    <HorizontalLayout id="court_project_@@SLOT@@_stake_1_@@color@@">',
    '      <Text id="court_project_@@SLOT@@_stake_1_label_@@color@@" class="project_stake_label" />',
    '      <Image id="court_project_@@SLOT@@_stake_1_dot_1_@@color@@" class="project_stake_dot" />',
    "    </HorizontalLayout>",
    "  </GridLayout>",
    '  <Text id="court_project_@@SLOT@@_date_start_@@color@@" class="project_date_text" />',
    '  <Text id="court_project_@@SLOT@@_date_end_@@color@@" class="project_date_text" />',
    '  <Text id="court_project_@@SLOT@@_date_increment_@@color@@" class="project_increment_text" />',
    "</Panel>",
  ].join("\n");

  const xml = buildCourtProjectBlocks(partial, 8);

  assert.match(xml, /court_project_01_@@color@@/);
  assert.match(xml, /court_project_08_@@color@@/);
  assert.doesNotMatch(xml, /court_project_09_/);
  assert.doesNotMatch(xml, /@@SLOT@@/);
  assert.equal((xml.match(/class="project_container"/g) || []).length, 8);
  assert.equal((xml.match(/class="project_stake_container"/g) || []).length, 8);
});

test("Court reconciler fills the complete character-sheet project field set", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../core/projects.ttslua"),
    "utf8"
  );

  assert.match(source, /court_project_" \.\. slot \.\. "_scope_dot_/);
  assert.match(source, /courtId\("result_margin"\)/);
  assert.match(source, /courtId\("stakes"\)/);
  assert.match(source, /court_project_" \.\. slot \.\. "_stake_" \.\. tostring\(s\)/);
  assert.match(source, /courtId\("date_start"\)/);
  assert.match(source, /courtId\("date_end"\)/);
  assert.match(source, /courtId\("date_increment"\)/);
});
