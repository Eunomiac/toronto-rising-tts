"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildLuaModule,
  makeLongBracketLiteral,
} = require("./generate_csheet_defaults_lua.js");

test("buildLuaModule embeds defaults XML as the module XML value", () => {
  const xml = [
    "<Defaults>",
    "  <Text class=\"sample\" text=\"Example\" />",
    "</Defaults>",
    "",
  ].join("\n");

  const lua = buildLuaModule(
    xml,
    "ui/player/csheets/csheet_defaults.xml",
    ".dev/scripts/generate_csheet_defaults_lua.js"
  );

  assert.match(lua, /D\.XML = \[=+\[/);
  assert.ok(lua.includes(xml));
  assert.match(lua, /function D\.getXml\(\)/);
  assert.match(lua, /return D/);
});

test("makeLongBracketLiteral avoids delimiters already present in XML", () => {
  const xml = "<Defaults>]=] ]==] ]===]</Defaults>";
  const literal = makeLongBracketLiteral(xml);

  assert.equal(xml.includes(literal.close), false);
  assert.equal(literal.open.startsWith("["), true);
  assert.equal(literal.close.endsWith("]"), true);
});
