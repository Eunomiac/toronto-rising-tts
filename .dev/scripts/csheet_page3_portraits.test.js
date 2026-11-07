"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { stripLeadingParametersComment } = require("./embed_ui_xml_templates");
const { buildTraitBlockParams } = require("./lib/trait_sheet_xml");
const { applyTemplate } = require("./lib/ui_xml_template_apply");

const templateFor = (sectionKey) => stripLeadingParametersComment(fs.readFileSync(
  path.resolve(__dirname, `../../ui/.templates/csheet/partials/${sectionKey}_block.xml`),
  "utf8"
));

const render = (sectionKey, portrait) => {
  const [params] = buildTraitBlockParams({
    name: "Resources",
    base: 2,
    max: 2,
    description: ["A useful background."],
    ...(portrait === undefined ? {} : { portrait })
  }, sectionKey, 0, sectionKey === "flaw", { pageNum: 3 });
  return applyTemplate(`csheet/partials/${sectionKey}_block`, templateFor(sectionKey), params);
};

const assertBalancedXml = (xml) => {
  const stack = [];
  const tagPattern = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*?)?(\/?)\s*>/g;
  for (const match of xml.matchAll(tagPattern)) {
    const [, closing, name, selfClosing] = match;
    if (selfClosing === "/") continue;
    if (closing === "/") {
      assert.equal(name, stack.pop(), `closing </${name}> must match the latest open tag`);
    } else {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], `unclosed XML tags: ${stack.join(", ")}`);
};

for (const sectionKey of ["bg", "merit", "flaw"]) {
  test(`Page 3 ${sectionKey} keeps a balanced full-width body when No portrait is selected`, () => {
    const xml = render(sectionKey, "");
    assert.doesNotMatch(xml, /<Image image=""/);
    assert.doesNotMatch(xml, /PORTRAIT_PRESENT|BODY_WITH_|##IF/);
    assert.match(xml, /text="A useful background\."/);
    assert.doesNotMatch(xml, /childAlignment="UpperLeft" spacing="8"/);
    assertBalancedXml(xml);
  });

  test(`Page 3 ${sectionKey} keeps an explicitly selected portrait in balanced XML`, () => {
    const xml = render(sectionKey, "npcPortrait_test");
    assert.match(xml, /<Image image="npcPortrait_test"/);
    assert.match(xml, /childAlignment="UpperLeft" spacing="8"/);
    assert.doesNotMatch(xml, /BODY_WITH_|##IF/);
    assertBalancedXml(xml);
  });
}

test("Lord Lucien's current Page 3 trait fragments are all balanced", () => {
  const pcs = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../lib/json/PCS.json"), "utf8"));
  const lucien = pcs.PCs?.lordLucien;
  assert.ok(lucien, "Lord Lucien must exist in PCS.json");
  let rendered = 0;
  let withoutPortrait = 0;
  for (const [sectionKey, entries] of [
    ["bg", lucien.backgrounds],
    ["merit", lucien.merits],
    ["flaw", lucien.flaws],
  ]) {
    for (const [index, entry] of (entries || []).entries()) {
      if (entry.sheetDisplay === false) continue;
      const [params] = buildTraitBlockParams(entry, sectionKey, index, sectionKey === "flaw", { pageNum: 3 });
      const xml = applyTemplate(
        `csheet/partials/${sectionKey}_block`,
        templateFor(sectionKey),
        params
      );
      assertBalancedXml(xml);
      rendered += 1;
      if (!entry.portrait || !entry.portrait.trim()) {
        assert.doesNotMatch(xml, /<Image image=""/);
        withoutPortrait += 1;
      }
    }
  }
  assert.ok(rendered > 0, "Lord Lucien should have visible Page 3 traits");
  assert.ok(withoutPortrait > 0, "regression fixture should include at least one trait without a portrait");
});
