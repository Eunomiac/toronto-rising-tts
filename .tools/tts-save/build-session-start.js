#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { parseArgs } = require("node:util");
const { bundleString } = require("luabundle");
const { loadCloudConfig } = require("../tts-cloud/lib/cloud_config.js");
const { expandXmlFile } = require("../../.dev/scripts/embed_ui_global_xml_docs.js");
const { planSessionStart, readDecisions } = require("./session-start-assets.js");

const root = path.resolve(__dirname, "../..");

function createSessionStart(save, plan, lua, xml) {
  const state = JSON.parse(save.LuaScriptState);
  if (state.currentPhase !== "Intermission") throw new Error("Save the source in Intermission before building a session-start copy.");
  const controls = state.connectionControls ?? {};
  if (controls.sessionStartJoin || controls.joinXmlArmed || controls.joinColdPoolsActive ||
      controls.joinColdPoolsBackup || controls.joinXmlCustomAssetsBackup) {
    throw new Error("Use a full save with all join stages completed as the source.");
  }
  state.connectionControls = {
    ...controls,
    sessionStartJoin: true,
    deferSetXml: true,
    deferConnectByColor: {},
    deferAutoSeatByColor: {},
    joinColdPoolsActive: true,
    joinColdPoolsBackup: {
      version: 1,
      entries: plan.objects.map(object => ({
        kind: object.GMNotes?.startsWith("SOUNDSCAPE_") ? "soundscape_emitter" : "asset_bundle",
        guid: object.GUID,
        data: object,
      })),
    },
  };
  state.debug = { ...state.debug, assumeConnected: false };
  return {
    ...save,
    SaveName: `${save.SaveName || "Toronto Rising"} — Session Start`,
    ObjectStates: plan.retained,
    LuaScript: lua,
    XmlUI: xml,
    LuaScriptState: JSON.stringify(state),
  };
}

function writeNewJson(file, data) {
  const dest = path.resolve(file);
  const tmp = path.join(path.dirname(dest), `.session-start-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
    // Publish the complete file only if the destination is new, even on Windows.
    fs.linkSync(tmp, dest);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function bundleGlobal() {
  const resolveModule = (name) => ["ttslua", "lua"]
    .map(ext => path.join(root, `${name.replaceAll(".", "/")}.${ext}`)).find(file => fs.existsSync(file)) ?? null;
  return bundleString('require("core.global_script")\n', { rootModuleName: "__root", resolveModule, metadata: false });
}

function main() {
  const { values } = parseArgs({ options: {
    decisions: { type: "string" }, source: { type: "string" }, output: { type: "string" },
    report: { type: "string" }, "dry-run": { type: "boolean" },
  } });
  if (!values.decisions || (values["dry-run"] ? values.output : !values.output)) {
    throw new Error("Usage: npm run tts-save:session-start -- --decisions <Integrated assets.csv> (--dry-run | --output <new-save.json>) [--source <save.json>] [--report <new-report.json>]");
  }
  const source = path.resolve(values.source ?? loadCloudConfig().saveFile);
  const save = JSON.parse(fs.readFileSync(source, "utf8"));
  const plan = planSessionStart(save, readDecisions(fs.readFileSync(values.decisions, "utf8")));
  const { report } = plan;
  const reportData = { source, ...report, restoredObjects: plan.objects.map(({ GUID, Nickname }) => ({ guid: GUID, name: Nickname })) };
  if (values.output) {
    const xml = expandXmlFile(root, path.join(root, "ui", "Global.xml"), new Set());
    const copy = createSessionStart(save, plan, bundleGlobal(), xml);
    writeNewJson(values.output, copy);
    console.log(`Wrote session-start copy to ${path.resolve(values.output)}.`);
  }
  if (values.report) writeNewJson(values.report, reportData);
  console.log(`Asset URLs ${report.distinctAssetUrls.before} → ${report.distinctAssetUrls.after}; top-level objects ${report.topLevelObjects.before} → ${report.topLevelObjects.after}.`);
  console.log(`Deferred ${report.pruned.length} reviewed bundles (${report.deferredKnownBytes.toLocaleString("en-CA")} known bytes, ${report.deferredUnknownSizes} unknown sizes).`);
  console.log(`Left ${report.purge.length} Purge and ${report.investigate.length} Investigate decisions for dependency review, plus ${report.unreviewedUrls} current URLs without a decision.`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { createSessionStart };
