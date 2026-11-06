"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildCourtProjectBlocks,
} = require("./princes_court_trait_placeholders.js");

test("Court Advantages render optional portraits and keep empty slots available for later assignment", () => {
  const { buildTraitPlaceholderMap } = require("./lib/trait_sheet_xml.js");
  const { stripLeadingParametersComment } = require("./embed_ui_xml_templates.js");
  const templates = Object.fromEntries(["bg", "merit", "flaw"].map(kind => [
    `princes_court/partials/${kind}_block`,
    stripLeadingParametersComment(fs.readFileSync(path.resolve(__dirname, `../../ui/.templates/princes_court/partials/${kind}_block.xml`), "utf8")),
  ]));
  const entry = { name: "Test", base: 1, max: 1, portrait: "npcPortrait_theAristocrat" };
  const slots = buildTraitPlaceholderMap({
    coterieBackgrounds: [entry], coterieMerits: [entry],
    coterieFlaws: [entry, { name: "Empty", base: 1, max: 1, blank: true, active: true }],
  }, templates);
  for (const section of ["BACKGROUNDS", "MERITS", "FLAWS"]) {
    const xml = [1, 2, 3].map(col => slots[`COTERIE_${section}_COLUMN_${col}`]).join("");
    assert.match(xml, /class="advantage_portrait" image="npcPortrait_theAristocrat" active="true"/);
    assert.doesNotMatch(xml, /@@IMAGE_REF@@|@@PORTRAIT_ACTIVE@@|##IF/);
  }
  const flaws = [1, 2, 3].map(col => slots[`COTERIE_FLAWS_COLUMN_${col}`]).join("");
  assert.match(flaws, /id="pc_p2_flaw_1_portrait_@@color@@" class="advantage_portrait" image="" active="false"/);
});

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
    path.resolve(__dirname, "../../ui/.templates/princes_court/panel.xml"),
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
  assert.doesNotMatch(referenceTemplate, /VerticalScrollView/);
  assert.match(
    referenceTemplate,
    /<VerticalLayout id="page_3_left" class="vertical_project_container"[^>]*>[\s\S]*@@COURT_PROJECT_BLOCKS@@/
  );
});

test("each Court rebuild uses the current data and preserves shared IDs", () => {
  const { buildSharedCourt } = require("./extract_shared_princes_court.js");
  const root = path.resolve(__dirname, "../..");
  const data = { coterieFlaws: [{ name: "Adversary", base: 2, max: 3, portrait: "npcPortrait_theAristocrat" }] };
  const first = buildSharedCourt(root, data);
  assert.match(first, /id="pc_p2_flaw_0_portrait" class="advantage_portrait" image="npcPortrait_theAristocrat" active="true"/);
  assert.match(first, /id="court_project_7"/);
  assert.doesNotMatch(first, /@@|##IF|##ENDIF/);
  const ids = [...first.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  delete data.coterieFlaws[0].portrait;
  const second = buildSharedCourt(root, data);
  assert.doesNotMatch(second, /npcPortrait_theAristocrat/);
  assert.match(second, /id="pc_p2_flaw_0_portrait" class="advantage_portrait" image="" active="false"/);
  assert.equal(second, buildSharedCourt(root, data));
});
