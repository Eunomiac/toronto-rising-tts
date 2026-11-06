"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { planSessionStart, readDecisions, forcePurgeAssets } = require("./session-start-assets.js");
const { assertSessionStartSlot, createSessionStart, renderRestoreProvider, writeJson } = require("./build-session-start.js");

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

test("ForcePurge removes registrations and clears direct URLs without mutating the source", () => {
  const source = fixture();
  source.SkyURL = keep;
  source.LuaScript = `local retained_script = '${keep}'`;
  source.CustomUIAssets.push({ Name: "alias", URL: keep });
  source.MusicPlayer = { AudioLibrary: [{ Item1: keep, Item2: "old" }, { Item1: bundle, Item2: "retained" }], CurrentAudioURL: keep, CurrentAudioTitle: "old", PlaylistEntry: 0 };
  source.DecalPallet = [{ Name: "old", ImageURL: keep }];
  source.ObjectStates[1].CustomImage = { ImageURL: keep, ImageSecondaryURL: bundle };
  source.ObjectStates[1].ContainedObjects = [{ CustomUIAssets: [{ Name: "old", URL: keep }] }];
  source.ObjectStates[1].States = { 2: { CustomImage: { ImageURL: keep } } };
  source.ObjectStates[1].CustomDeck = { 1: { FaceURL: keep, BackURL: bundle } };
  const before = JSON.stringify(source);
  const decisions = new Map(review);
  decisions.set(keep, { url: keep, decision: "ForcePurge" });
  const purged = forcePurgeAssets(source, decisions);
  assert.equal(JSON.stringify(source), before);
  assert.equal(purged.save.SkyURL, keep);
  assert.equal(purged.save.LuaScript, source.LuaScript);
  assert.deepEqual(purged.save.CustomUIAssets, []);
  assert.deepEqual(purged.save.DecalPallet, []);
  assert.equal(purged.save.MusicPlayer.AudioLibrary.length, 1);
  assert.equal(purged.save.MusicPlayer.CurrentAudioURL, "");
  assert.equal(purged.save.MusicPlayer.CurrentAudioTitle, "");
  assert.equal(purged.save.ObjectStates[1].CustomImage.ImageURL, "");
  assert.equal(purged.save.ObjectStates[1].CustomImage.ImageSecondaryURL, bundle);
  assert.deepEqual(purged.save.ObjectStates[1].CustomDeck, {});
  assert.equal(purged.save.ObjectStates[1].States[2].CustomImage.ImageURL, "");
  assert.deepEqual(forcePurgeAssets(purged.save, decisions).save, purged.save);
});

test("ForcePurge reaches both the full source and the session-start copy and has no restore record", () => {
  const source = fixture();
  source.LuaScriptState = JSON.stringify({ currentPhase: "Intermission" });
  const decisions = new Map(review);
  decisions.set(keep, { url: keep, decision: "ForcePurge" });
  const plan = planSessionStart(source, decisions);
  assert.deepEqual(plan.source.CustomUIAssets, []);
  assert.deepEqual(createSessionStart(source, plan, "lua", "xml").CustomUIAssets, []);
  assert.equal(plan.report.forcePurgedReferences, 1);
  assert.equal(plan.report.forcePurgedRegistrations, 1);
  assert.equal(plan.objects.length, 1);
  assert.deepEqual(plan.report.distinctAssetUrls, { before: 2, after: 0 });
});

test("Resolve is recognized but blocks generation, and absent Purge URLs need no dependency review", () => {
  const unresolved = readDecisions("URL,Manual decision,Author Resolution Instructions\nhttps://example.test/item,Resolve,Replace it\n");
  assert.equal(unresolved.values().next().value.resolutionInstructions, "Replace it");
  assert.throws(() => planSessionStart(fixture(), unresolved), /Resolve decisions need/);
  const decisions = new Map(review);
  decisions.set("https://example.test/old.png", { decision: "Purge", url: "https://example.test/old.png" });
  assert.deepEqual(planSessionStart(fixture(), decisions).report.purge, []);
});

test("RemoveFromSheet is recognized as a sheet cleanup task requiring completion", () => {
  const decisions = readDecisions("URL,Manual decision\nhttps://example.test/old.png,RemoveFromSheet\n");
  assert.equal(decisions.get("https://example.test/old.png").decision, "RemoveFromSheet");
  assert.throws(() => planSessionStart(fixture(), decisions), /RemoveFromSheet decisions need verified static-sheet cleanup/);
});

test("automatically keeps whichever image is the active SkyURL", () => {
  for (const skybox of ["https://example.test/old-skybox.jpg", "https://example.test/another-skybox.webp"]) {
    const source = fixture();
    source.SkyURL = skybox;
    source.LuaScriptState = JSON.stringify({ currentPhase: "Intermission" });
    const plan = planSessionStart(source, review);
    assert.equal(plan.report.retainedSkybox, skybox);
    assert.equal(plan.report.unreviewedUrls, 0);
    assert.equal(createSessionStart(source, plan, "lua", "xml").SkyURL, skybox);
    assert.deepEqual(plan.report.distinctAssetUrls, { before: 3, after: 2 });
  }
});

test("the active skybox is retained even when its review says Prune, Purge or Investigate", () => {
  const source = { ...fixture(), SkyURL: "https://example.test/sky.jpg" };
  for (const decision of ["Prune", "Purge", "Investigate"]) {
    const decisions = new Map(review);
    decisions.set(source.SkyURL, { url: source.SkyURL, decision });
    const plan = planSessionStart(source, decisions);
    assert.equal(plan.report.retainedSkybox, source.SkyURL);
    assert.equal(plan.report.pruned.length, 1);
    assert.equal(plan.report.purge.length, 0);
    assert.equal(plan.report.investigate.length, 0);
  }
});

test("the skybox allowance does not exempt another use of the same URL", () => {
  const source = { ...fixture(), SkyURL: "https://example.test/shared-sky.jpg" };
  source.CustomUIAssets.push({ Name: "other-use", URL: source.SkyURL });
  assert.equal(planSessionStart(source, review).report.unreviewedUrls, 1);
  const decisions = new Map(review);
  decisions.set(source.SkyURL, { url: source.SkyURL, decision: "Purge" });
  const plan = planSessionStart(source, decisions);
  assert.deepEqual(plan.report.purge[0].references.map(ref => ref.path), [["CustomUIAssets", 1, "URL"]]);
  decisions.set(source.SkyURL, { url: source.SkyURL, decision: "Prune" });
  assert.throws(() => planSessionStart(source, decisions), /needs a restore handler/);
});

test("preserves chronicle state and UI assets while staging only restore metadata in saved state", () => {
  const source = fixture();
  source.LuaScriptState = JSON.stringify({ currentPhase: "Intermission", sessionNum: 42, debug: { assumeConnected: true } });
  source.ObjectStates[0].GMNotes = "SOUNDSCAPE_MUSIC_C";
  const plan = planSessionStart(source, review);
  const output = createSessionStart(source, plan, "new lua", "new xml");
  const state = JSON.parse(output.LuaScriptState);
  assert.equal(output.LuaScript, "new lua");
  assert.equal(output.XmlUI, "new xml");
  assert.deepEqual(output.CustomUIAssets, source.CustomUIAssets);
  assert.equal(state.sessionNum, 42);
  assert.equal(state.debug.assumeConnected, false);
  assert.equal(state.connectionControls.sessionStartJoin, true);
  assert.deepEqual(state.connectionControls.joinColdPoolsBackup.entries, [
    { kind: "soundscape_emitter", guid: "abcdef" },
  ]);
  assert.throws(() => createSessionStart(output, plan, "", ""), /Use a full save/);
});

test("bundles identical emitter scripts once, separately from the per-object JSON", () => {
  const provider = renderRestoreProvider([
    { GUID: "abcdef", LuaScript: "identical emitter script" },
    { GUID: "012345", LuaScript: "identical emitter script", XmlUI: "custom UI" },
  ]);
  assert.equal(provider.split("identical emitter script").length, 2);
  assert.match(provider, /\["abcdef"\].*LuaScript = 1/);
  assert.match(provider, /\["012345"\].*LuaScript = 1, XmlUI = 2/);
  assert.match(provider, /function GlobalSessionStartRestoreData\(guid\)\n[^\n]+\n  local data = JSON.decode/);
});

test("FULL can replace its generated slot while one-off saves still refuse to overwrite", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "session-start-slot-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, "TS_Save_230.json");
  const slot = path.join(dir, "TS_Save_9001.json");
  const save = fixture();
  save.LuaScriptState = JSON.stringify({ currentPhase: "Intermission", sessionNum: 1 });
  writeJson(source, save);
  const before = fs.readFileSync(source, "utf8");
  assert.throws(() => assertSessionStartSlot(source, source), /separate/);
  assertSessionStartSlot(source, slot);
  writeJson(slot, save);
  assert.throws(() => assertSessionStartSlot(source, slot), /unrelated/);

  const generated = createSessionStart(save, planSessionStart(save, review), "lua", "xml");
  fs.unlinkSync(slot);
  writeJson(slot, generated, true);
  assertSessionStartSlot(source, slot);
  assert.throws(() => writeJson(slot, save), { code: "EEXIST" });
  assert.equal(JSON.parse(fs.readFileSync(slot)).SaveName, generated.SaveName);
  writeJson(slot, { ...generated, SaveName: "Updated session start" }, true);
  assert.equal(JSON.parse(fs.readFileSync(slot)).SaveName, "Updated session start");
  assert.equal(fs.readFileSync(source, "utf8"), before);
  assert.deepEqual(fs.readdirSync(dir), ["TS_Save_230.json", "TS_Save_9001.json"]);
});
