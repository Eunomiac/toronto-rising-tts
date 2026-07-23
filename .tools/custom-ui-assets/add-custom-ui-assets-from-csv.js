#!/usr/bin/env node
"use strict";

/**
 * Add CustomUIAssets from a Name/URL CSV (e.g. tts-cloud:export output).
 *
 * Transforms each CSV Name with a regexp + replace string to produce the asset Name.
 *
 * Default: global save-root CustomUIAssets.
 * With --guids: object mode — same CSV applied to each listed object's CustomUIAssets
 * (never global). Missing GUID → error before any write.
 *
 * Example (Sites → siteCard_*):
 *   npm run custom-ui-assets:add-csv -- \\
 *     --csv .tools/tts-cloud/out/Sites.csv \\
 *     --name-match "^(.*)\\.webp$" \\
 *     --name-replace "siteCard_$1"
 *
 * Example (object mode / CSHEET):
 *   npm run custom-ui-assets:add-csv -- \\
 *     --csv path/to/dots.csv \\
 *     --name-match "^(.*)\\.webp$" \\
 *     --name-replace "$1" \\
 *     --guids 0bdb4a,2cb469,07ead9
 */

const fs = require("fs");
const path = require("path");
const {
  resolveSaveWithConfig,
  writeAtomic,
  parseUserRegExp,
  parseNameUrlCsv,
  parseGuidsList,
  resolveAssetTargets,
  requireWriteConfirmation,
  backupSaveBeforeWrite,
} = require("./lib/custom-ui-assets-save.js");

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {string | null} */
  let csvPath = null;
  /** @type {string | null} */
  let nameMatch = null;
  /** @type {string | null} */
  let nameReplace = null;
  /** @type {string | null} */
  let saveName = process.env.TTS_SAVE_NAME || null;
  /** @type {string | null} */
  let savePath = process.env.TTS_SAVE_PATH || null;
  /** @type {string | null} */
  let guidsRaw = null;
  let dryRun = false;
  let yes = false;
  let noBackup = false;
  let configure = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    // VS Code tasks may pass empty strings for optional prompts / pickString.
    if (a == null || String(a).trim() === "") {
      continue;
    }
    if ((a === "--csv" || a === "-c") && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") csvPath = v;
    } else if ((a === "--name-match" || a === "--match") && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") nameMatch = v;
    } else if ((a === "--name-replace" || a === "--replace") && argv[i + 1] != null) {
      // Allow empty replacement string; only skip when arg omitted via blank task input
      // that left a following flag — treat whitespace-only as empty replacement.
      nameReplace = String(argv[i + 1]);
      i += 1;
    } else if (a === "--saveName" && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") saveName = v;
    } else if (a === "--save" && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") savePath = v;
    } else if ((a === "--guids" || a === "--objects") && argv[i + 1] != null) {
      guidsRaw = String(argv[i + 1]).trim() === "" ? null : argv[i + 1];
      i += 1;
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
    } else if (!a.startsWith("-") && csvPath == null) {
      csvPath = a;
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }

  if (csvPath == null || String(csvPath).trim() === "") {
    throw new Error("Missing --csv <path>");
  }
  if (nameMatch == null || String(nameMatch).trim() === "") {
    throw new Error("Missing --name-match <regexp>");
  }
  if (nameReplace == null) {
    throw new Error("Missing --name-replace <replacement> (may be empty string)");
  }

  return {
    csvPath: path.resolve(csvPath),
    nameMatch,
    nameReplace,
    saveName,
    savePath,
    guids: parseGuidsList(guidsRaw),
    dryRun,
    yes,
    noBackup,
    configure,
  };
}

function printHelp() {
  console.log(`Usage: node .tools/custom-ui-assets/add-custom-ui-assets-from-csv.js --csv <path> --name-match <re> --name-replace <repl> [options]

Reads a Name,URL CSV (Name = cloud filename), builds CustomUIAssets entries:
  { Type: 0, Name: <transformed>, URL: <url> }

Modes:
  (default)            Global save-root CustomUIAssets only
  --guids <list>       Object mode: apply the same CSV to each GUID's
                       CustomUIAssets (creates [] if missing). Never touches global.
                       Missing GUID → error before any write.

Name transform uses JavaScript String.replace semantics ($1, $2, …).

Example:
  --csv .tools/tts-cloud/out/Sites.csv
  --name-match "^(.*)\\\\.webp$"
  --name-replace "siteCard_$1"
  → AnarchBar.webp becomes siteCard_AnarchBar

Options:
  --csv, -c <path>          Input CSV (relative to cwd ok)
  --name-match <regexp>     Tested/replaced against CSV Name
  --name-replace <string>   Replacement (supports $1 capture refs)
  --guids <csv>             Comma-delimited object GUIDs (object mode)
  --saveName <id>           Override config default save slot
  --save <path>             Explicit save JSON path
  --configure               Re-run interactive tts-assets.config.json setup
  --dry-run                 Show plan; do not write
  --no-backup               Skip pre-write backup (default: backup ON)
  --yes, -y                 Skip Y/N write confirmation (automation only)
  --help, -h
`);
}

/**
 * @param {string} fileName
 * @param {RegExp} matchRe
 * @param {string} replacement
 * @returns {string}
 */
function transformAssetName(fileName, matchRe, replacement) {
  const re = new RegExp(matchRe.source, matchRe.flags.replace(/g/g, ""));
  if (!re.test(fileName)) {
    throw new Error(`CSV Name did not match --name-match: ${fileName}`);
  }
  re.lastIndex = 0;
  const out = fileName.replace(re, replacement).trim();
  if (out === "") {
    throw new Error(`Name transform produced empty string for: ${fileName}`);
  }
  return out;
}

/**
 * @param {Record<string, unknown>[]} assets
 * @returns {Map<string, number>}
 */
function indexByName(assets) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (let i = 0; i < assets.length; i += 1) {
    const name = typeof assets[i].Name === "string" ? /** @type {string} */ (assets[i].Name) : "";
    if (name !== "" && !map.has(name)) {
      map.set(name, i);
    }
  }
  return map;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[custom-ui:add-csv] FAIL: ${err.message}`);
    printHelp();
    process.exit(1);
  }

  if (!fs.existsSync(args.csvPath)) {
    console.error(`[custom-ui:add-csv] FAIL: CSV not found: ${args.csvPath}`);
    process.exit(1);
  }

  const matchRe = parseUserRegExp(args.nameMatch);
  const csvRows = parseNameUrlCsv(fs.readFileSync(args.csvPath, "utf8"));
  const mode = args.guids.length > 0 ? "objects" : "global";
  console.error(`[custom-ui:add-csv] CSV: ${args.csvPath} (${csvRows.length} rows)`);
  console.error(`[custom-ui:add-csv] Transform: /${matchRe.source}/${matchRe.flags} → "${args.nameReplace}"`);
  console.error(`[custom-ui:add-csv] Mode: ${mode}`);
  if (mode === "objects") {
    console.error(`[custom-ui:add-csv] GUIDs: ${args.guids.join(", ")}`);
  }

  /** @type {{ Type: number, Name: string, URL: string, sourceName: string }[]} */
  const planned = [];
  /** @type {Set<string>} */
  const seenPlanned = new Set();
  for (const row of csvRows) {
    const assetName = transformAssetName(row.Name, matchRe, args.nameReplace);
    if (seenPlanned.has(assetName)) {
      throw new Error(`Duplicate transformed Name in CSV: ${assetName} (from ${row.Name})`);
    }
    seenPlanned.add(assetName);
    planned.push({
      Type: 0,
      Name: assetName,
      URL: row.URL,
      sourceName: row.Name,
    });
  }

  const saveFileResolved = await resolveSaveWithConfig({
    saveName: args.saveName || undefined,
    savePath: args.savePath,
    forceConfigure: args.configure,
  });
  const saveFile = saveFileResolved.saveFile;
  const config = saveFileResolved.config;
  if (saveFileResolved.configPath) {
    console.error(`[custom-ui:add-csv] Config: ${saveFileResolved.configPath}`);
  }
  console.error(`[custom-ui:add-csv] Save: ${saveFile}`);

  const saveRoot = JSON.parse(fs.readFileSync(saveFile, "utf8"));
  // Preflight: resolve all GUIDs (throws if any missing) before planning mutations.
  const targets = resolveAssetTargets(saveRoot, args.guids);

  /** @type {{
   *   target: import("./lib/custom-ui-assets-save.js").AssetTarget,
   *   before: number,
   *   fresh: typeof planned,
   *   duplicates: typeof planned,
   *   nameIndex: Map<string, number>,
   * }[]} */
  const plans = [];
  let totalFresh = 0;
  let totalDup = 0;

  for (const target of targets) {
    const nameIndex = indexByName(target.assets);
    /** @type {typeof planned} */
    const fresh = [];
    /** @type {typeof planned} */
    const duplicates = [];
    for (const row of planned) {
      if (nameIndex.has(row.Name)) {
        duplicates.push(row);
      } else {
        fresh.push(row);
      }
    }
    totalFresh += fresh.length;
    totalDup += duplicates.length;
    plans.push({
      target,
      before: target.assets.length,
      fresh,
      duplicates,
      nameIndex,
    });
  }

  console.error(
    `[custom-ui:add-csv] Planned across ${targets.length} target(s): ${totalFresh} new, ${totalDup} overwrite`,
  );
  console.error("[custom-ui:add-csv] Per-target:");
  for (const p of plans) {
    console.error(
      `  ${p.target.label}: ${p.before} assets → +${p.fresh.length} new, ${p.duplicates.length} overwrite`,
    );
  }

  console.error("[custom-ui:add-csv] Name sample (from CSV transform):");
  for (const row of planned.slice(0, 8)) {
    console.error(`  ${row.sourceName} → ${row.Name}`);
  }
  if (planned.length > 8) {
    console.error(`  … +${planned.length - 8} more`);
  }

  if (totalDup > 0) {
    console.error("[custom-ui:add-csv] Duplicates (existing Names → will overwrite if confirmed):");
    /** @type {Set<string>} */
    const listed = new Set();
    for (const p of plans) {
      for (const row of p.duplicates) {
        const key = `${p.target.label}::${row.Name}`;
        if (listed.has(key)) continue;
        listed.add(key);
        const idx = p.nameIndex.get(row.Name);
        const existingUrl =
          idx != null && typeof p.target.assets[idx].URL === "string"
            ? /** @type {string} */ (p.target.assets[idx].URL)
            : "";
        console.error(`  - ${p.target.label}: ${row.Name}`);
        console.error(`      old: ${existingUrl}`);
        console.error(`      new: ${row.URL}`);
      }
    }
  }

  if (args.dryRun) {
    console.error("[custom-ui:add-csv] Dry run — no write.");
    process.exit(0);
  }

  // Single confirmation covering the whole multi-target plan (including overwrites).
  await requireWriteConfirmation(
    args.yes,
    `Write ${totalFresh} new + ${totalDup} overwrite across ${targets.length} target(s) (${mode} mode)?`,
  );

  backupSaveBeforeWrite(saveFile, config, { skipBackup: args.noBackup });

  let added = 0;
  let updated = 0;
  for (const p of plans) {
    const assets = p.target.assets;
    for (const row of p.duplicates) {
      const idx = p.nameIndex.get(row.Name);
      if (idx == null) continue;
      assets[idx] = { Type: 0, Name: row.Name, URL: row.URL };
      updated += 1;
    }
    for (const row of p.fresh) {
      assets.push({ Type: 0, Name: row.Name, URL: row.URL });
      added += 1;
    }
    if (p.target.mode === "global") {
      saveRoot.CustomUIAssets = assets;
    } else if (p.target.object) {
      p.target.object.CustomUIAssets = assets;
    }
  }

  writeAtomic(saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
  console.error(
    `[custom-ui:add-csv] PASS: added ${added}, updated ${updated} across ${targets.length} target(s) (${mode}).`,
  );
  console.error("[custom-ui:add-csv] Reload the save in TTS to pick up the change.");
}

main().catch((err) => {
  if (err && err.code === "USER_ABORT") {
    console.error(`[custom-ui:add-csv] ${err.message}`);
    process.exit(1);
  }
  console.error(`[custom-ui:add-csv] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
