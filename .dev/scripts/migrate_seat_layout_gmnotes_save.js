#!/usr/bin/env node
"use strict";

/**
 * Offline migration: copy seat-layout ROLE_COLOR identity from Name/Nickname into GMNotes
 * on a TTS save JSON (before Save & Play). Same save-direct-edit pattern as
 * `.tools/custom-ui-assets/merge-custom-ui-assets.js` (parse JSON → mutate → write).
 *
 * Usage:
 *   node .dev/scripts/migrate_seat_layout_gmnotes_save.js --dry-run
 *   node .dev/scripts/migrate_seat_layout_gmnotes_save.js --save .dev/TS_Save_230.json
 *   node .dev/scripts/migrate_seat_layout_gmnotes_save.js --saveName 230
 */

const fs = require("fs");
const path = require("path");
const { writeFileResilient } = require("./write_file_resilient");
const { resolveSavePath } = require("../../.tools/tts-save/resolve-save-path");

const ROOT = path.join(__dirname, "..", "..");
const DEFAULT_SAVE = path.join(ROOT, ".dev", "TS_Save_230.json");

function parseStringList(block) {
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function loadSeatConfig() {
  const constText = fs.readFileSync(path.join(ROOT, "lib", "constants.ttslua"), "utf8");
  const guidsText = fs.readFileSync(path.join(ROOT, "lib", "guids.ttslua"), "utf8");

  const playerColors = parseStringList(
    (constText.match(/C\.PlayerColors\s*=\s*\{([\s\S]*?)\n\}/) || [, ""])[1]
  );
  const npcSeats = parseStringList(
    (constText.match(/C\.NPCSeats\s*=\s*\{([\s\S]*?)\n\}/) || [, ""])[1]
  );

  const relativeBlock = (constText.match(/relative\s*=\s*\{([\s\S]*?)\n\s*\},/) || [, ""])[1];
  const relativeRefs = [...relativeBlock.matchAll(/G\.GUIDS(?:\.[A-Z0-9_]+)+/g)].map((m) => m[0]);

  function resolveGuid(ref) {
    const parts = ref.replace("G.GUIDS.", "").split(".");
    if (parts[0] === "TABLES") {
      const re = new RegExp(`\\b${parts[1]}\\s*=\\s*"([a-f0-9]+)"`);
      const m = guidsText.match(re);
      return m ? m[1] : null;
    }
    const key = parts[parts.length - 1];
    const re = new RegExp(`\\b${key}\\s*=\\s*"([a-f0-9]+)"`);
    const m = guidsText.match(re);
    return m ? m[1] : null;
  }

  const relativeGuids = new Set();
  for (const ref of relativeRefs) {
    const g = resolveGuid(ref);
    if (g) relativeGuids.add(g);
  }

  const validSuffixes = new Set(
    [...playerColors, ...npcSeats].map((s) => String(s).toUpperCase())
  );
  const seatTags = new Set(
    [...playerColors, ...npcSeats].map((seat) => `${seat}Object`)
  );

  return { playerColors, npcSeats, relativeGuids, validSuffixes, seatTags };
}

function trim(s) {
  return typeof s === "string" ? s.trim() : "";
}

function matchesRoleColorPattern(value, validSuffixes) {
  const s = trim(value);
  if (!s) return null;
  const m = s.match(/^(.+)_([A-Z0-9]+)$/);
  if (!m || !m[1]) return null;
  if (!validSuffixes.has(m[2])) return null;
  return s;
}

function readRoleColorIdentity(obj, validSuffixes) {
  const gm = trim(obj.GMNotes);
  return matchesRoleColorPattern(gm, validSuffixes);
}

/**
 * @returns {{ identity: string|null, source: "Name"|"Nickname"|null }}
 */
function readLegacyRoleColorIdentityWithSource(obj, validSuffixes) {
  const name = matchesRoleColorPattern(obj.Name, validSuffixes);
  if (name) return { identity: name, source: "Name" };
  const nick = matchesRoleColorPattern(obj.Nickname, validSuffixes);
  if (nick) return { identity: nick, source: "Nickname" };
  return { identity: null, source: null };
}

function readLegacyRoleColorIdentity(obj, validSuffixes) {
  return readLegacyRoleColorIdentityWithSource(obj, validSuffixes).identity;
}

function isHandZoneObject(obj) {
  if (trim(obj.Name) === "HandTrigger") return true;
  const legacy = trim(obj.Nickname) || trim(obj.Name);
  if (legacy.includes("HAND_ZONE")) return true;
  const gm = trim(obj.GMNotes);
  if (gm.includes("HAND_ZONE")) return true;
  return false;
}

function hasSeatTag(obj, seatTags) {
  const tags = obj.Tags;
  if (!Array.isArray(tags)) return false;
  for (const t of tags) {
    if (seatTags.has(t)) return true;
  }
  return false;
}

function isMigrationCandidate(obj, seatTags, relativeGuids) {
  if (!obj || typeof obj !== "object") return false;
  const guid = trim(obj.GUID);
  if (hasSeatTag(obj, seatTags)) return true;
  if (guid && relativeGuids.has(guid)) return true;
  return false;
}

function timestampForBackup() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function migrateObjectState(obj, ctx, summary, reason) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj.ContainedObjects)) {
    for (const child of obj.ContainedObjects) {
      migrateObjectState(child, ctx, summary, reason);
    }
  }

  if (!isMigrationCandidate(obj, ctx.seatTags, ctx.relativeGuids)) {
    return;
  }
  if (isHandZoneObject(obj)) {
    summary.skippedHandZone += 1;
    return;
  }

  summary.scanned += 1;
  const guid = trim(obj.GUID) || "unknown-guid";
  const { identity: legacy, source: legacySource } = readLegacyRoleColorIdentityWithSource(
    obj,
    ctx.validSuffixes
  );
  const current = readRoleColorIdentity(obj, ctx.validSuffixes);

  if (!legacy && current) {
    summary.alreadyMigrated += 1;
    return;
  }
  if (!legacy) {
    summary.skippedNoLegacy += 1;
    return;
  }

  const detail = {
    guid,
    reason,
    legacy,
    legacySource,
    previousGmNotes: obj.GMNotes || "",
    previousName: obj.Name || "",
    previousNickname: obj.Nickname || "",
  };

  if (ctx.dryRun) {
    summary.migrated += 1;
    summary.details.push(detail);
    return;
  }

  obj.GMNotes = legacy;
  if (ctx.clearLegacy && legacySource) {
    if (legacySource === "Name") {
      obj.Name = "";
    } else if (legacySource === "Nickname") {
      obj.Nickname = "";
    }
  }
  summary.migrated += 1;
  summary.details.push(detail);
}

function migrateSave(save, options) {
  const ctx = {
    ...loadSeatConfig(),
    dryRun: options.dryRun === true,
    clearLegacy: options.clearLegacy !== false,
  };

  const summary = {
    dryRun: ctx.dryRun,
    input: options.input,
    output: options.output,
    scanned: 0,
    migrated: 0,
    alreadyMigrated: 0,
    skippedNoLegacy: 0,
    skippedHandZone: 0,
    details: [],
  };

  const states = save.ObjectStates;
  if (!Array.isArray(states)) {
    throw new Error("Save JSON has no ObjectStates array");
  }

  for (const obj of states) {
    const tags = obj.Tags || [];
    let reason = "untagged";
    for (const t of tags) {
      if (ctx.seatTags.has(t)) {
        reason = `tag:${t}`;
        break;
      }
    }
    if (reason === "untagged" && ctx.relativeGuids.has(trim(obj.GUID))) {
      reason = "relative";
    }
    migrateObjectState(obj, ctx, summary, reason);
  }

  return summary;
}

/**
 * Resolve save path from CLI (matches custom-ui / tts-save tooling).
 * @param {Record<string, string | boolean | undefined>} options
 */
function resolveSavePathsFromArgs(options) {
  if (options.saveName) {
    const { savesDir, saveFileName, savePath } = resolveSavePath(
      String(options.saveName),
      options.savesDir ? String(options.savesDir) : undefined
    );
    options.savesDirResolved = savesDir;
    options.saveFileName = saveFileName;
    options.input = savePath;
  } else if (options.save) {
    options.input = path.resolve(String(options.save));
  } else if (options.input) {
    options.input = path.resolve(String(options.input));
  } else {
    options.input = DEFAULT_SAVE;
  }

  if (options.outputSave) {
    options.output = path.resolve(String(options.outputSave));
  } else if (options.output) {
    options.output = path.resolve(String(options.output));
  } else {
    options.output = options.input;
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    clearLegacy: true,
    noBackup: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--no-backup") options.noBackup = true;
    else if (arg === "--keep-legacy-names") options.clearLegacy = false;
    else if (arg === "--saveName") options.saveName = argv[++i];
    else if (arg === "--savesDir") options.savesDir = argv[++i];
    else if (arg === "--save" || arg === "--input") options.save = argv[++i];
    else if (arg === "--outputSave" || arg === "--output") options.outputSave = argv[++i];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  resolveSavePathsFromArgs(options);
  return options;
}

function printHelp() {
  console.log(`migrate_seat_layout_gmnotes_save.js — offline ROLE_COLOR → GMNotes migration

Options:
  --dry-run              Report changes without writing
  --saveName <id>        Live TTS save (e.g. 230 → TS_Save_230.json under Saves folder)
  --savesDir <path>      Override TTS Saves folder (else TTS_SAVES_DIR env or default)
  --save <path>          Save JSON path (default: .dev/TS_Save_230.json)
  --outputSave <path>    Write path (default: same as --save)
  --no-backup            Skip timestamped backup when overwriting input
  --keep-legacy-names    Do not clear Name/Nickname after copying to GMNotes (only the source field is cleared)
  -h, --help             Show this help

Aliases: --input / --output (same as --save / --outputSave)
`);
}

function printReloadAlert(savePath, summary) {
  const border = "================================================================================";
  console.log("");
  console.log(border);
  console.log("  SAVE FILE UPDATED — RELOAD REQUIRED IN TABLETOP SIMULATOR");
  console.log(border);
  console.log("");
  console.log(`  Patched ObjectStates GMNotes in:`);
  console.log(`  ${savePath}`);
  console.log("");
  console.log(
    `  Migrated: ${summary.migrated}   Already OK: ${summary.alreadyMigrated}   ` +
      `Skipped (no legacy): ${summary.skippedNoLegacy}`
  );
  console.log("");
  console.log("  >>> Reload this save in TTS (File → Load) so GM Notes changes take effect.");
  console.log("");
  console.log(border);
  console.log("");
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (options.savesDirResolved) {
    console.log(`Saves folder: ${options.savesDirResolved}`);
    console.log(`Save file:    ${options.saveFileName}`);
    console.log("");
  }

  if (!fs.existsSync(options.input)) {
    throw new Error(`Save file not found: ${options.input}`);
  }

  const raw = fs.readFileSync(options.input, "utf8");
  const save = JSON.parse(raw);
  const summary = migrateSave(save, options);

  console.log(
    `[migrate_seat_layout_gmnotes_save]${summary.dryRun ? " (dry-run)" : ""} ` +
      `scanned=${summary.scanned} migrated=${summary.migrated} already=${summary.alreadyMigrated} ` +
      `skippedNoLegacy=${summary.skippedNoLegacy} skippedHandZone=${summary.skippedHandZone}`
  );

  if (summary.details.length > 0 && summary.details.length <= 20) {
    for (const d of summary.details) {
      console.log(`  ${d.guid} ${d.legacy} (${d.reason})`);
    }
  } else if (summary.details.length > 20) {
    for (const d of summary.details.slice(0, 10)) {
      console.log(`  ${d.guid} ${d.legacy} (${d.reason})`);
    }
    console.log(`  ... and ${summary.details.length - 10} more`);
  }

  const reportPath = path.join(
    ROOT,
    ".dev",
    "build-logs",
    `seat-layout-gmnotes-migration${summary.dryRun ? "-dry-run" : ""}.json`
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);

  if (summary.dryRun) {
    console.log("Dry run — save file not modified.");
    return;
  }

  if (summary.migrated === 0) {
    console.log("No changes — save file not modified.");
    return;
  }

  const outJson = `${JSON.stringify(save, null, 2)}\n`;
  if (path.resolve(options.output) === path.resolve(options.input) && !options.noBackup) {
    const backupPath = `${options.input}.pre-gmnotes-migration.${timestampForBackup()}.json`;
    fs.copyFileSync(options.input, backupPath);
    console.log(`Backup: ${backupPath}`);
  }

  writeFileResilient(options.output, outJson);
  printReloadAlert(options.output, summary);
}

main();
