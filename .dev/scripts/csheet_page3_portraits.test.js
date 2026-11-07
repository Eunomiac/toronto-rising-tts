"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { stripLeadingParametersComment } = require("./embed_ui_xml_templates");
const { buildTraitBlockParams } = require("./lib/trait_sheet_xml");
const { applyTemplate } = require("./lib/ui_xml_template_apply");

const template = stripLeadingParametersComment(fs.readFileSync(
  path.resolve(__dirname, "../../ui/.templates/csheet/partials/bg_block.xml"),
  "utf8"
));

const render = (portrait) => {
  const [params] = buildTraitBlockParams({
    name: "Resources",
    base: 2,
    max: 2,
    description: ["A useful background."],
    ...(portrait === undefined ? {} : { portrait })
  }, "bg", 0, false, { pageNum: 3 });
  return applyTemplate("csheet/partials/bg_block", template, params);
};

test("Page 3 omits the portrait image when No portrait is selected", () => {
  const xml = render("");
  assert.doesNotMatch(xml, /<Image image=""/);
  assert.doesNotMatch(xml, /PORTRAIT_PRESENT|##IF/);
});

test("Page 3 keeps an explicitly selected portrait", () => {
  const xml = render("npcPortrait_test");
  assert.match(xml, /<Image image="npcPortrait_test"/);
});
