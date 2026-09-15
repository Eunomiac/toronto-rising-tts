"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { parseCli, renderCloudCatalogLua } = require("./cloud-asset-sync.js");

test("parseCli --lua-catalog selects catalog-only mode", () => {
  const cli = parseCli(["--lua-catalog", "--dry-run"]);
  assert.equal(cli.luaCatalogOnly, true);
  assert.equal(cli.dryRun, true);
  assert.equal(cli.jobFilter, null);
});

test("parseCli --job still works alongside --lua-catalog", () => {
  const cli = parseCli(["--lua-catalog", "--job", "memoriamNpcFigurines"]);
  assert.equal(cli.luaCatalogOnly, true);
  assert.deepEqual(cli.jobFilter, ["memoriamNpcFigurines"]);
});

test("renderCloudCatalogLua emits empty tables so consumers can default URLs to empty", () => {
  const lua = renderCloudCatalogLua({
    MemoriamNpcFigurines: {},
    MemoriamNpcTokenFronts: {},
  });
  assert.match(lua, /MemoriamNpcFigurines = \{/);
  assert.match(lua, /MemoriamNpcTokenFronts = \{/);
  assert.doesNotMatch(lua, /URL = "/);
});
