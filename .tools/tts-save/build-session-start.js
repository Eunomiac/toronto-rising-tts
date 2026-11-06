#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { parseArgs } = require("node:util");
const { bundleString } = require("luabundle");
const { loadCloudConfig } = require("../tts-cloud/lib/cloud_config.js");
const { expandXmlFile } = require("../../.dev/scripts/embed_ui_global_xml_docs.js");
const { escapeLuaString } = require("../../.dev/scripts/lib/skyboxes_sheet_csv.js");
const { planSessionStart, readDecisions } = require("./session-start-assets.js");

const root = path.resolve(__dirname, "../..");

function readSourceState(save) {
  const state = JSON.parse(save.LuaScriptState);
  if (state.currentPhase !== "Intermission") throw new Error("Save the source in Intermission before building a session-start copy.");
  const controls = state.connectionControls ?? {};
  if (controls.sessionStartJoin || controls.joinXmlArmed || controls.joinColdPoolsActive ||
      controls.joinColdPoolsBackup || controls.joinXmlCustomAssetsBackup) {
    throw new Error("Use a full save with all join stages completed as the source.");
  }
  return state;
}

function createSessionStart(save, plan, lua, xml) {
  const state = readSourceState(save);
  state.connectionControls = {
    ...state.connectionControls,
    generatedSessionStart: true,
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

function assertSessionStartSlot(source, output) {
  if (path.resolve(source).toLowerCase() === path.resolve(output).toLowerCase()) {
    throw new Error("The session-start slot must be separate from the main save.");
  }
  const stat = fs.lstatSync(output, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isFile()) {
    const save = JSON.parse(fs.readFileSync(output, "utf8"));
    const controls = JSON.parse(save.LuaScriptState || "{}").connectionControls;
    if (controls?.generatedSessionStart === true) return;
  }
  throw new Error(`The session-start slot is occupied by an unrelated file. Move it before running FULL: ${output}`);
}

function writeJson(file, data, replace = false) {
  const dest = path.resolve(file);
  const tmp = path.join(path.dirname(dest), `.session-start-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
    if (replace) fs.renameSync(tmp, dest);
    else fs.linkSync(tmp, dest);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function renderRestoreProvider(objects) {
  const scripts = new Map();
  const quote = (value) => `"${escapeLuaString(value).replace(/[\x00-\x1f\x7f]/g, char => `\\${String(char.charCodeAt(0)).padStart(3, "0")}`)}"`;
  const records = objects.map((object) => {
    const data = { ...object };
    const fields = [];
    for (const field of ["LuaScript", "LuaScriptState", "XmlUI"]) {
      if (typeof data[field] !== "string") continue;
      if (!scripts.has(data[field])) scripts.set(data[field], scripts.size + 1);
      fields.push(`${field} = ${scripts.get(data[field])}`);
      delete data[field];
    }
    return `  [${quote(object.GUID)}] = { ${quote(JSON.stringify(data))}, { ${fields.join(", ")} } },`;
  });
  return [
    "do", "local scripts = {",
    ...[...scripts.keys()].map(script => `  ${quote(script)},`),
    "}", "local records = {", ...records, "}",
    "function GlobalSessionStartRestoreData(guid)",
    "  local record = assert(records[guid], 'Missing deferred object data for ' .. tostring(guid))",
    "  local data = JSON.decode(record[1])",
    "  for field, index in pairs(record[2]) do data[field] = scripts[index] end",
    "  return data",
    "end", "end", "",
  ].join("\n");
}

function bundleGlobal(objects) {
  const resolveModule = (name) => ["ttslua", "lua"]
    .map(ext => path.join(root, `${name.replaceAll(".", "/")}.${ext}`)).find(file => fs.existsSync(file)) ?? null;
  const entry = renderRestoreProvider(objects) + 'require("core.global_script")\n';
  return bundleString(entry, { rootModuleName: "__root", resolveModule, metadata: false });
}

function fullOptions() {
  const { saveFile: source, savesDir } = loadCloudConfig();
  const output = path.join(savesDir, "TS_Save_9001.json");
  const decisions = path.join(root, ".dev", "session-start-decisions.local.csv");
  if (!fs.existsSync(decisions)) {
    throw new Error(`Download the Integrated assets tab as CSV and save it to ${decisions} before running FULL.`);
  }
  assertSessionStartSlot(source, output);
  return { source, output, decisions, report: path.join(root, ".dev", "build-logs", "session-start-report.json") };
}

function main() {
  let { values } = parseArgs({ options: {
    decisions: { type: "string" }, source: { type: "string" }, output: { type: "string" },
    report: { type: "string" }, "dry-run": { type: "boolean" },
    full: { type: "boolean" }, "full-preflight": { type: "boolean" },
  } });
  const replace = values.full === true;
  const preflight = values["full-preflight"] === true;
  if (replace || preflight) {
    if (Object.keys(values).length !== 1) throw new Error("Pass the FULL session-start mode by itself.");
    values = fullOptions();
  }
  if (!values.decisions || (values["dry-run"] ? values.output : !values.output)) {
    throw new Error("Usage: npm run tts-save:session-start -- --decisions <Integrated assets.csv> (--dry-run | --output <new-save.json>) [--source <save.json>] [--report <new-report.json>]");
  }
  const source = path.resolve(values.source ?? loadCloudConfig().saveFile);
  const save = JSON.parse(fs.readFileSync(source, "utf8"));
  const decisions = readDecisions(fs.readFileSync(values.decisions, "utf8"));
  if (preflight) {
    readSourceState(save);
    return;
  }
  const plan = planSessionStart(save, decisions);
  const { report } = plan;
  const reportData = { source, ...report, restoredObjects: plan.objects.map(({ GUID, Nickname }) => ({ guid: GUID, name: Nickname })) };
  const copy = values.output && createSessionStart(save, plan, bundleGlobal(plan.objects),
    expandXmlFile(root, path.join(root, "ui", "Global.xml"), new Set()));
  if (values.report) {
    if (replace) fs.mkdirSync(path.dirname(values.report), { recursive: true });
    writeJson(values.report, reportData, replace);
  }
  if (copy) {
    if (replace) assertSessionStartSlot(source, values.output);
    writeJson(values.output, copy, replace);
    console.log(`Wrote session-start copy to ${path.resolve(values.output)}.`);
  }
  console.log(`Asset URLs ${report.distinctAssetUrls.before} → ${report.distinctAssetUrls.after}; top-level objects ${report.topLevelObjects.before} → ${report.topLevelObjects.after}.`);
  console.log(`Deferred ${report.pruned.length} reviewed bundles (${report.deferredKnownBytes.toLocaleString("en-CA")} known bytes, ${report.deferredUnknownSizes} unknown sizes).`);
  if (report.retainedSkybox) console.log("Kept the active skybox automatically (SkyURL).");
  console.log(`Left ${report.purge.length} Purge and ${report.investigate.length} Investigate decisions for dependency review, plus ${report.unreviewedUrls} current URLs without a decision.`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { assertSessionStartSlot, createSessionStart, renderRestoreProvider, writeJson };
