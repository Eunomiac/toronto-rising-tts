#!/usr/bin/env node
"use strict";

/**
 * One-time rename of overlay CustomUIAssets Names for TOR-565
 * (session-start / global blindfold reorganization).
 *
 * Examples:
 *   npm run custom-ui-assets:rename-overlays -- --dry-run
 *   npm run custom-ui-assets:rename-overlays -- --yes
 *   npm run custom-ui-assets:rename-overlays -- --session 1 --yes
 */

const fs = require("fs");
const {
  resolveSaveWithConfig,
  writeAtomic,
  getGlobalCustomUiAssets,
  requireWriteConfirmation,
  backupSaveBeforeWrite,
} = require("./lib/custom-ui-assets-save.js");

const PC_KEYS = ["blackCaesar", "fomorach", "aishe", "rashid", "lordLucien"];

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {string | null} */
  let saveName = process.env.TTS_SAVE_NAME || null;
  /** @type {string | null} */
  let savePath = process.env.TTS_SAVE_PATH || null;
  let session = 1;
  let dryRun = false;
  let yes = false;
  let noBackup = false;
  let configure = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a == null || String(a).trim() === "") continue;
    if (a === "--saveName" && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") saveName = v;
    } else if (a === "--save" && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") savePath = v;
    } else if (a === "--session" && argv[i + 1] != null) {
      const n = Number(argv[i + 1]);
      i += 1;
      if (!Number.isFinite(n) || n < 1) {
        throw new Error("--session must be a positive integer");
      }
      session = Math.floor(n);
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--yes" || a === "-y") {
      yes = true;
    } else if (a === "--no-backup") {
      noBackup = true;
    } else if (a === "--configure") {
      configure = true;
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }

  return { saveName, savePath, session, dryRun, yes, noBackup, configure };
}

function printHelp() {
  console.log(`Usage: node .tools/custom-ui-assets/rename-overlay-custom-ui-assets-in-save.js [options]

One-time TOR-565 rename of global CustomUIAssets Names (URLs unchanged).

Options:
  --saveName <id>   TS_Save id (default from tts-assets.config.json)
  --save <path>     Explicit save JSON path
  --session <N>     Map overlay_explode_sessionNum/Title → overlay_sessionNumber/Title_<N>
                    (default 1)
  --dry-run         List renames only
  --yes, -y         Skip write confirmation
  --no-backup       Skip timestamped backup
  --configure       Force interactive tts-assets config setup
`);
}

/**
 * @param {number} session
 * @returns {Map<string, string>}
 */
function buildRenameMap(session) {
  /** @type {Map<string, string>} */
  const map = new Map();

  for (const pc of PC_KEYS) {
    map.set(`overlay_explode_image_${pc}`, `overlay_characterIntroImage_${pc}`);
    map.set(`overlay_explode_text_${pc}`, `overlay_characterIntroCaption_${pc}`);
  }

  map.set("overlay_explode_sessionNum", `overlay_sessionNumber_${session}`);
  map.set("overlay_explode_sessionTitle", `overlay_sessionTitle_${session}`);
  map.set("overlay_explode_sessionNum_bg_1", "overlay_sessionNumber_bg_1");
  map.set("overlay_explode_sessionNum_bg_2", "overlay_sessionNumber_bg_2");
  map.set("overlay_explode_sessionTitle_bg_1", "overlay_sessionTitle_bg_1");
  map.set("overlay_explode_sessionTitle_bg_2", "overlay_sessionTitle_bg_2");
  map.set("overlay_explode_frame", "overlay_sessionSplashFrame");

  // Session-numbered covers (any N present in the save).
  // Handled via regex pass below; also map common session 1 explicitly for clarity.
  map.set("overlay_blindfold_session_1", "overlay_sessionStartSplash_1");
  map.set("overlay_blindfold_end_session_1", "overlay_sessionEndSplash_1");

  for (let i = 1; i <= 32; i += 1) {
    map.set(`overlay_blindfold_${i}`, `overlay_globalBlindfold_${i}`);
  }

  return map;
}

/**
 * Pattern renames for any session index beyond the explicit map.
 * @param {string} name
 * @returns {string | null}
 */
function patternRename(name) {
  let m = /^overlay_blindfold_session_(\d+)$/.exec(name);
  if (m) return `overlay_sessionStartSplash_${m[1]}`;
  m = /^overlay_blindfold_end_session_(\d+)$/.exec(name);
  if (m) return `overlay_sessionEndSplash_${m[1]}`;
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { saveFile, config } = await resolveSaveWithConfig({
    saveName: args.saveName || undefined,
    savePath: args.savePath,
    forceConfigure: args.configure,
    interactive: !args.dryRun,
  });

  const raw = fs.readFileSync(saveFile, "utf8");
  const saveRoot = /** @type {Record<string, unknown>} */ (JSON.parse(raw));
  const assets = getGlobalCustomUiAssets(saveRoot);
  const renameMap = buildRenameMap(args.session);

  /** @type {{ from: string, to: string }[]} */
  const planned = [];
  /** @type {Set<string>} */
  const usedTargets = new Set();

  for (const asset of assets) {
    const name = typeof asset.Name === "string" ? asset.Name : "";
    if (name === "") continue;
    let next = renameMap.get(name) || patternRename(name);
    if (!next || next === name) continue;
    if (usedTargets.has(next)) {
      throw new Error(`Rename collision: two assets would become "${next}"`);
    }
    // Skip if target name already exists as a different asset.
    const conflict = assets.some(
      (a) => a !== asset && typeof a.Name === "string" && a.Name === next,
    );
    if (conflict) {
      throw new Error(`Target name already present in save: "${next}" (from "${name}")`);
    }
    planned.push({ from: name, to: next });
    usedTargets.add(next);
  }

  console.log(`[rename-overlays] Save: ${saveFile}`);
  console.log(`[rename-overlays] Session for explode sessionNum/Title: ${args.session}`);
  console.log(`[rename-overlays] Planned renames: ${planned.length}`);
  for (const row of planned) {
    console.log(`  ${row.from}  →  ${row.to}`);
  }

  const missingHints = [
    "overlay_sessionNumber_bg_1",
    "overlay_sessionNumber_bg_2",
    "overlay_sessionTitle_bg_1",
    "overlay_sessionTitle_bg_2",
  ];
  for (const hint of missingHints) {
    const present = assets.some((a) => a.Name === hint) || planned.some((p) => p.to === hint);
    if (!present) {
      console.log(`[rename-overlays] Note: "${hint}" not in save (upload later if needed).`);
    }
  }

  if (planned.length === 0) {
    console.log("[rename-overlays] Nothing to rename (already applied or assets missing).");
    return;
  }

  if (args.dryRun) {
    console.log("[rename-overlays] Dry run — no write.");
    return;
  }

  await requireWriteConfirmation(
    args.yes,
    `Rename ${planned.length} CustomUIAssets Name(s) in ${saveFile}?`,
  );

  if (!args.noBackup && config && config.backupBeforeWrite !== false) {
    const backupPath = backupSaveBeforeWrite(saveFile, config);
    if (backupPath) {
      console.log(`[rename-overlays] Backup: ${backupPath}`);
    }
  }

  const byFrom = new Map(planned.map((p) => [p.from, p.to]));
  for (const asset of assets) {
    const name = typeof asset.Name === "string" ? asset.Name : "";
    const next = byFrom.get(name);
    if (next) asset.Name = next;
  }

  writeAtomic(saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
  console.log(`[rename-overlays] Wrote ${planned.length} rename(s). Reload the save in TTS.`);
}

main().catch((err) => {
  if (err && err.code === "USER_ABORT") {
    console.error(String(err.message || err));
    process.exit(2);
  }
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
