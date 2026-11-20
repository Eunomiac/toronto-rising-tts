#!/usr/bin/env node
"use strict";

/**
 * One-shot inject of CSHEET_NPC_<COLOR> tiles cloned from CSHEET_PAGE_1_<COLOR> (TOR-95).
 *
 * Pure helpers: planInject(save, opts) → patches; applyInject(save, patches).
 * CLI resolves Documents TS_Save_* via resolve-save-path, backs up under backupDir, writes save.
 *
 * Usage (repo root):
 *   node .tools/tts-save/inject-csheet-npc-sheets.js --saveName 230
 *   npm run tts-save:inject-csheet-npc -- --saveName 230
 *   … --dryRun
 *   … --noBackup
 */

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("./resolve-save-path.js");
const { findExistingConfig } = require("../custom-ui-assets/lib/tts-assets-config.js");

const COLORS = ["BROWN", "ORANGE", "RED", "PINK", "PURPLE"];
const HIDE_Y = -200;
const NPC_XML = '<Include src="ui/player/csheets/npc_sheet.xml" />';
const NPC_LUA = 'require("ui.ui_csheet_npc")\n';

/** Pre-chosen unique GUIDs (collision-checked at plan time). */
const DEFAULT_GUIDS = {
  BROWN: "eb8b3c",
  ORANGE: "2cfc7c",
  RED: "6c80ed",
  PINK: "0fede4",
  PURPLE: "470570",
};

const BACKUP_SUBDIR = "csheet-npc-inject";

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = "1";
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function collectGuids(save) {
  const set = new Set();
  for (const obj of save.ObjectStates || []) {
    if (obj && typeof obj.GUID === "string" && obj.GUID) set.add(obj.GUID.toLowerCase());
  }
  return set;
}

function findByGmNotes(save, gmNotes) {
  return (save.ObjectStates || []).find((o) => o && o.GMNotes === gmNotes) || null;
}

/**
 * @param {object} save
 * @param {{ guids?: Record<string,string>, knownGuids?: Record<string,string> }} [opts]
 * @returns {{ clones: object[], mappings: { color: string, guid: string, sourceGuid: string }[] }}
 */
function planInject(save, opts = {}) {
  if (!save || !Array.isArray(save.ObjectStates)) {
    throw new Error("planInject requires a save with ObjectStates[]");
  }
  const guids = { ...DEFAULT_GUIDS, ...(opts.guids || {}) };
  const existing = collectGuids(save);
  for (const [role, g] of Object.entries(opts.knownGuids || {})) {
    if (g) existing.add(String(g).toLowerCase());
  }

  for (const color of COLORS) {
    const role = `CSHEET_NPC_${color}`;
    if (findByGmNotes(save, role)) {
      throw new Error(`Idempotent refuse: ${role} already present in ObjectStates`);
    }
  }

  const clones = [];
  const mappings = [];
  for (const color of COLORS) {
    const sourceRole = `CSHEET_PAGE_1_${color}`;
    const source = findByGmNotes(save, sourceRole);
    if (!source) {
      throw new Error(`Missing source object GMNotes=${sourceRole}`);
    }
    const guid = String(guids[color] || "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(guid)) {
      throw new Error(`Invalid GUID for ${color}: ${guid}`);
    }
    if (existing.has(guid)) {
      throw new Error(`GUID collision for CSHEET_NPC_${color}: ${guid}`);
    }
    existing.add(guid);

    const colorTag = `${color.charAt(0)}${color.slice(1).toLowerCase()}Object`;
    const transform = { ...(source.Transform || {}) };
    transform.posY = HIDE_Y;

    const clone = {
      ...JSON.parse(JSON.stringify(source)),
      GUID: guid,
      Nickname: `NPC Sheet - ${color.charAt(0)}${color.slice(1).toLowerCase()}`,
      Description: "",
      GMNotes: `CSHEET_NPC_${color}`,
      Transform: transform,
      Tags: Array.from(
        new Set([...(source.Tags || []).filter((t) => t !== "HiddenObject"), "AlignmentDone", colorTag, "HiddenObject"])
      ),
      Locked: true,
      LuaScript: NPC_LUA,
      LuaScriptState: "[]",
      XmlUI: NPC_XML,
      CustomUIAssets: [],
      Interactable: false,
    };
    clones.push(clone);
    mappings.push({ color, guid, sourceGuid: source.GUID });
  }

  return { clones, mappings };
}

/**
 * @param {object} save
 * @param {{ clones: object[] }} plan
 * @returns {object} mutated save
 */
function applyInject(save, plan) {
  if (!plan || !Array.isArray(plan.clones)) throw new Error("applyInject requires plan.clones");
  save.ObjectStates = [...(save.ObjectStates || []), ...plan.clones];
  return save;
}

function buildBackupPath(savePath) {
  const found = findExistingConfig();
  const configured =
    found && found.config && typeof found.config.backupDir === "string" && found.config.backupDir.trim() !== ""
      ? path.resolve(found.config.backupDir)
      : null;
  if (configured == null) {
    throw new Error("tts-assets.config.json backupDir is required for inject backups");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(configured, BACKUP_SUBDIR);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `pre-inject-csheet-npc.${stamp}${path.extname(savePath) || ".json"}`);
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const dryRun = args.dryRun === "1";
  const noBackup = args.noBackup === "1";
  const saveName = args.saveName || args.save || "230";
  const resolved = resolveSavePath(saveName, args.savesDir);
  const savePath = resolved.savePath;
  if (!fs.existsSync(savePath)) {
    throw new Error(`Save not found: ${savePath}`);
  }
  const raw = fs.readFileSync(savePath, "utf8");
  const save = JSON.parse(raw);
  const plan = planInject(save);
  console.log("CSHEET_NPC inject plan:");
  for (const m of plan.mappings) {
    console.log(`  CSHEET_NPC_${m.color} = ${m.guid}  (from PAGE_1 ${m.sourceGuid})`);
  }
  if (dryRun) {
    console.log("dryRun: no write");
    return 0;
  }
  if (!noBackup) {
    const backup = buildBackupPath(savePath);
    fs.copyFileSync(savePath, backup);
    console.log(`backup: ${backup}`);
  }
  applyInject(save, plan);
  const trailingNl = raw.endsWith("\n");
  fs.writeFileSync(savePath, JSON.stringify(save, null, 2) + (trailingNl ? "\n" : ""));
  console.log(`wrote ${plan.clones.length} CSHEET_NPC objects → ${savePath}`);
  console.log("Close TTS (or switch slot), then File → Load this save.");
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

module.exports = {
  planInject,
  applyInject,
  DEFAULT_GUIDS,
  COLORS,
  HIDE_Y,
  NPC_XML,
  NPC_LUA,
};
