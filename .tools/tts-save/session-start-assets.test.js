"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { planSessionStart, readDecisions } = require("./session-start-assets.js");

const bundle = "https://steamusercontent-a.akamaihd.net/ugc/42/0123456789ABCDEF0123456789ABCDEF01234567/";
const keep = "https://example.test/keep.png";
const review = readDecisions([
  "URL,Decision,URL,Known bytes,Manual decision,Manual notes",
  `https://example.test/dynamic.png,Keep,${bundle},10,Prune,restore in game`,
  `,,${keep},,Keep,`,
].join("\n"));
const fixture = () => ({
  CustomUIAssets: [{ Name: "keep", URL: keep }],
  LuaScript: `local url = '${bundle}'`,
  ObjectStates: [{ GUID: "abcdef", CustomAssetbundle: { AssetbundleURL: bundle } }, { GUID: "012345" }],
});

test("uses the static review URL and removes only reviewed bundle objects", () => {
  const source = fixture();
  source.ObjectStates[0].CustomAssetbundle.AssetbundleURL = bundle.replace("steamusercontent-a.akamaihd.net", "steamusercontent.com");
  const result = planSessionStart(source, review);
  assert.deepEqual(result.report.distinctAssetUrls, { before: 2, after: 1 });
  assert.equal(result.report.deferredKnownBytes, 10);
  assert.deepEqual(result.objects.map(o => o.GUID), ["abcdef"]);
  assert.deepEqual(result.retained.map(o => o.GUID), ["012345"]);
  assert.equal(source.ObjectStates.length, 2);
});

test("fails closed for drift, unsupported placements, and collateral assets", () => {
  const source = fixture();
  source.ObjectStates[0].CustomAssetbundle.AssetbundleSecondaryURL = keep;
  assert.throws(() => planSessionStart(source, review), /would also remove/);
  source.CustomUIAssets.push({ Name: "bundle", URL: bundle });
  assert.throws(() => planSessionStart(source, review), /needs a restore handler/);
  assert.throws(() => planSessionStart({ ObjectStates: [] }, review), /no longer occurs/);
});
