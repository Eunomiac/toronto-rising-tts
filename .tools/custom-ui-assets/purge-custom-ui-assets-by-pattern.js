#!/usr/bin/env node
"use strict";

/**
 * Purge CustomUIAssets whose Name matches a regexp.
 *
 * Default: global save-root CustomUIAssets.
 * With --guids: object mode — only those objects' CustomUIAssets (never global).
 *
 * Examples:
 *   npm run custom-ui-assets:purge -- --pattern "^siteCard_" --dry-run
 *   npm run custom-ui-assets:purge -- --pattern "^bp_" --guids 0bdb4a,2cb469
 */

const fs = require("fs");
const {
  resolveSaveWithConfig,
  writeAtomic,
  parseUserRegExp,
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
  let pattern = null;
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
    if ((a === "--pattern" || a === "-p") && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") pattern = v;
    } else if (a === "--saveName" && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") saveName = v;
    } else if (a === "--save" && argv[i + 1] != null) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      if (v !== "") savePath = v;
    } else if ((a === "--guids" || a === "--objects") && argv[i + 1] != null) {
      // Empty value = global mode (omit object targeting).
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
    } else if (!a.startsWith("-") && pattern == null) {
      pattern = a;
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }

  if (pattern == null || String(pattern).trim() === "") {
    throw new Error("Missing --pattern <regexp>");
  }

  return {
    pattern,
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
  console.log(`Usage: node .tools/custom-ui-assets/purge-custom-ui-assets-by-pattern.js --pattern <regexp> [options]

Removes matching CustomUIAssets entries.

Modes:
  (default)            Global save-root CustomUIAssets only
  --guids <list>       Object mode: only listed GUIDs (recursive ObjectStates /
                       ContainedObjects / States). Never touches global assets.
                       Missing GUID → error before any write.

Options:
  --pattern, -p <re>   Regexp tested against asset Name (also positional)
                       Forms: ^siteCard_   or   /^siteCard_/i
  --guids <csv>        Comma-delimited object GUIDs (object mode)
  --saveName <id>      Override config default save slot
  --save <path>        Explicit save JSON path
  --configure          Re-run interactive tts-assets.config.json setup
  --dry-run            List matches; do not write
  --no-backup          Skip pre-write backup (default: backup ON)
  --yes, -y            Skip Y/N write confirmation (automation only)
  --help, -h
`);
}

/**
 * @param {RegExp} re
 * @param {import("./lib/custom-ui-assets-save.js").AssetTarget[]} targets
 */
function collectMatches(re, targets) {
  /** @type {{ targetLabel: string, Name: string, URL: string }[]} */
  const matches = [];
  /** @type {{ label: string, before: number, matchCount: number }[]} */
  const perTarget = [];

  for (const target of targets) {
    let matchCount = 0;
    const before = target.assets.length;
    for (const row of target.assets) {
      const name = typeof row.Name === "string" ? row.Name : "";
      if (name !== "" && re.test(name)) {
        matchCount += 1;
        matches.push({
          targetLabel: target.label,
          Name: name,
          URL: typeof row.URL === "string" ? row.URL : "",
        });
      }
      re.lastIndex = 0;
    }
    perTarget.push({ label: target.label, before, matchCount });
  }

  return { matches, perTarget };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[custom-ui:purge] FAIL: ${err.message}`);
    printHelp();
    process.exit(1);
  }

  const re = parseUserRegExp(args.pattern);
  const { saveFile, config, configPath } = await resolveSaveWithConfig({
    saveName: args.saveName || undefined,
    savePath: args.savePath,
    forceConfigure: args.configure,
  });
  const mode = args.guids.length > 0 ? "objects" : "global";
  console.error(`[custom-ui:purge] Save: ${saveFile}`);
  if (configPath) {
    console.error(`[custom-ui:purge] Config: ${configPath}`);
  }
  console.error(`[custom-ui:purge] Mode: ${mode}`);
  console.error(`[custom-ui:purge] Pattern: ${re}`);
  if (mode === "objects") {
    console.error(`[custom-ui:purge] GUIDs: ${args.guids.join(", ")}`);
  }

  const saveRoot = JSON.parse(fs.readFileSync(saveFile, "utf8"));
  const targets = resolveAssetTargets(saveRoot, args.guids);
  const { matches, perTarget } = collectMatches(re, targets);

  console.error("[custom-ui:purge] Per-target summary:");
  for (const row of perTarget) {
    console.error(`  ${row.label}: ${row.before} assets, ${row.matchCount} match(es)`);
  }
  console.error(`[custom-ui:purge] Total matches: ${matches.length}`);

  if (matches.length === 0) {
    console.error("[custom-ui:purge] Nothing to remove.");
    process.exit(0);
  }

  console.error("[custom-ui:purge] Matches:");
  for (const m of matches) {
    if (mode === "objects") {
      console.error(`  - ${m.targetLabel}: ${m.Name}`);
    } else {
      console.error(`  - ${m.Name}`);
    }
  }

  if (args.dryRun) {
    console.error("[custom-ui:purge] Dry run — no write.");
    process.exit(0);
  }

  await requireWriteConfirmation(
    args.yes,
    `Delete these ${matches.length} CustomUIAssets entr${matches.length === 1 ? "y" : "ies"} from the save (${mode} mode)?`,
  );

  backupSaveBeforeWrite(saveFile, config, { skipBackup: args.noBackup });

  let removed = 0;
  for (const target of targets) {
    const before = target.assets.length;
    const next = target.assets.filter((row) => {
      const name = typeof row.Name === "string" ? row.Name : "";
      const hit = name !== "" && re.test(name);
      re.lastIndex = 0;
      return !hit;
    });
    removed += before - next.length;
    if (target.mode === "global") {
      saveRoot.CustomUIAssets = next;
    } else if (target.object) {
      target.object.CustomUIAssets = next;
    }
  }

  writeAtomic(saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
  console.error(`[custom-ui:purge] PASS: removed ${removed} entr${removed === 1 ? "y" : "ies"} (${mode}).`);
  console.error("[custom-ui:purge] Reload the save in TTS to pick up the change.");
}

main().catch((err) => {
  if (err && err.code === "USER_ABORT") {
    console.error(`[custom-ui:purge] ${err.message}`);
    process.exit(1);
  }
  console.error(`[custom-ui:purge] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
