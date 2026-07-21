"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildCourtProjectBlocks,
} = require("./princes_court_trait_placeholders.js");

test("buildCourtProjectBlocks expands eight 0-based Court project blocks from the princes_court partial", () => {
  const partial = fs.readFileSync(
    path.resolve(__dirname, "../../ui/.templates/princes_court/partials/project_block.xml"),
    "utf8"
  );

  const xml = buildCourtProjectBlocks(partial, 8);

  assert.match(xml, /court_project_0_@@color@@/);
  assert.match(xml, /court_project_7_@@color@@/);
  assert.doesNotMatch(xml, /court_project_8_/);
  assert.doesNotMatch(xml, /@@INDEX@@|@@PROJECT_STAKE_[1-4]_CLASS@@/);
  assert.equal((xml.match(/class="project_container"/g) || []).length, 8);
  assert.equal((xml.match(/id="court_project_\d+_stake_\d+_@@color@@"/g) || []).length, 32);
  assert.match(xml, /court_project_7_stake_4_dot_5_@@color@@/);
  assert.doesNotMatch(xml, /_stake_5_|_stake_6_/);
  assert.doesNotMatch(xml, /Print attributes|Dots are 'active=false'/);
  assert.match(xml, /active="false"/);
});

test("Court reconciler fills the complete character-sheet project field set with 0-based slots", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../core/projects.ttslua"),
    "utf8"
  );

  assert.match(source, /M\.DISPLAY_STAKE_ROWS = 4/);
  assert.match(source, /for i = 0, pool - 1 do/);
  assert.match(source, /court_project_" \.\. slot \.\. "_scope_dot_/);
  assert.match(source, /courtId\("result_margin"\)/);
  assert.match(source, /courtId\("stakes"\)/);
  assert.match(source, /court_project_" \.\. slot \.\. "_stake_" \.\. tostring\(s\)/);
  assert.match(source, /courtId\("date_start"\)/);
  assert.match(source, /courtId\("date_end"\)/);
  assert.match(source, /courtId\("date_increment"\)/);
});

test("Court reference layer uses Global project classes and the project-block token", () => {
  const referenceTemplate = fs.readFileSync(
    path.resolve(__dirname, "../../ui/.templates/panel_right_sidebar_referenceLayer.xml"),
    "utf8"
  );
  const globalDefaults = fs.readFileSync(
    path.resolve(__dirname, "../../ui/defaults_classes.xml"),
    "utf8"
  );

  assert.doesNotMatch(referenceTemplate, /csheet_defaults\.xml/);
  assert.doesNotMatch(referenceTemplate, /Court page 3 project styles mirror/);
  assert.doesNotMatch(referenceTemplate, /<Panel class="project_container"/);
  assert.match(globalDefaults, /class="vertical_project_container"/);
  assert.match(globalDefaults, /class="project_container"/);
  assert.match(
    referenceTemplate,
    /<VerticalLayout class="vertical_project_container">[\s\S]*@@COURT_PROJECT_BLOCKS@@/
  );
});
