"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildCourtProjectBlocks,
} = require("./princes_court_trait_placeholders.js");

test("buildCourtProjectBlocks expands eight full sheet-style Court project blocks", () => {
  const partial = fs.readFileSync(
    path.resolve(__dirname, "../../ui/.templates/csheet/partials/project_block.xml"),
    "utf8"
  );

  const xml = buildCourtProjectBlocks(partial, 8);

  assert.match(xml, /court_project_01_@@color@@/);
  assert.match(xml, /court_project_08_@@color@@/);
  assert.doesNotMatch(xml, /court_project_09_/);
  assert.doesNotMatch(xml, /@@INDEX@@|@@PROJECT_STAKE_[1-6]_CLASS@@/);
  assert.equal((xml.match(/class="project_container"/g) || []).length, 8);
  assert.equal((xml.match(/class="project_stake_container"/g) || []).length, 56);
  assert.match(xml, /court_project_08_stake_6_dot_5_@@color@@/);
  assert.doesNotMatch(xml, /Print attributes|Dots are 'active=false'/);
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

test("Court reference layer uses the canonical CSHEET defaults and project container", () => {
  const referenceTemplate = fs.readFileSync(
    path.resolve(__dirname, "../../ui/.templates/panel_right_sidebar_referenceLayer.xml"),
    "utf8"
  );

  assert.match(
    referenceTemplate,
    /<Include src="ui\/player\/csheets\/csheet_defaults\.xml"\s*\/>/
  );
  assert.doesNotMatch(referenceTemplate, /Court page 3 project styles mirror/);
  assert.doesNotMatch(referenceTemplate, /<Panel class="project_container"/);
  assert.match(
    referenceTemplate,
    /<VerticalLayout class="vertical_project_container">[\s\S]*@@COURT_PROJECT_BLOCKS@@/
  );
});
