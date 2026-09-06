#!/usr/bin/env node
"use strict";

/**
 * Config-driven Cloud → CustomUIAssets / Lua catalog sync.
 *
 * Plan: .tools/Cloud-Asset-Sync-Plan.md
 * Config: .tools/cloud-asset-sync.jsonc
 *
 * Usage (repo root):
 *   npm run cloud-asset-sync
 *   npm run cloud-asset-sync -- --dry-run
 *   npm run cloud-asset-sync -- --yes-purge
 *   npm run cloud-asset-sync -- --job siteCards
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = path.join(__dirname, "cloud-asset-sync.jsonc");
const CLOUD_CATALOG_LUA = path.join(REPO_ROOT, "lib", "cloud_catalog.ttslua");

const {
  findExistingConfig,
} = require("./custom-ui-assets/lib/tts-assets-config.js");
const {
  resolveSaveWithConfig,
  resolveAssetTargets,
  writeAtomic,
  parseUserRegExp,
  backupSaveBeforeWrite,
} = require("./custom-ui-assets/lib/custom-ui-assets-save.js");

const OUTPUT_GLOBAL = "GlobalCustomUIAssets";
const OUTPUT_OBJECT = "ObjectCustomUIAssets";
const OUTPUT_LUA = "LuaCatalog";

/**
 * Strip // and /* *\/ comments outside strings (JSONC subset).
 * @param {string} text
 * @returns {string}
 */
function stripJsonc(text) {
  let out = "";
  let i = 0;
  const s = String(text);
  let inString = false;
  let escape = false;
  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1];
    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < s.length && s[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function loadJsonc(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(stripJsonc(raw));
}

/**
 * @param {string} patternSource
 * @returns {RegExp}
 */
function parseAnchoredSearchPattern(patternSource) {
  const raw = String(patternSource ?? "").trim();
  if (!raw.startsWith("^") || !raw.endsWith("$")) {
    throw new Error(
      `filenameToNameSearchPattern must start with ^ and end with $ (got: ${raw})`,
    );
  }
  return parseUserRegExp(raw);
}

/**
 * @param {string} replacePattern
 * @returns {string[] | null} purge family patterns, or null if cannot narrow
 */
function derivePurgePatterns(replacePattern) {
  const raw = String(replacePattern ?? "");
  if (raw === "") return null;

  let narrowed = false;
  let pattern = "^";
  const tokenRe = /(\$\d+)|([^$]+)/g;
  let m;
  while ((m = tokenRe.exec(raw)) !== null) {
    if (m[1]) {
      pattern += "(.*)";
    } else {
      const lit = m[2];
      if (/[A-Za-z0-9_]/.test(lit)) narrowed = true;
      pattern += lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  pattern += "$";
  if (!narrowed) return null;
  return [pattern];
}

/**
 * @param {unknown} job
 * @param {Set<string>} seenIds
 * @param {Set<string>} seenTableNames
 */
function validateJob(job, seenIds, seenTableNames) {
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new Error("Each job must be an object.");
  }
  const j = /** @type {Record<string, unknown>} */ (job);
  const id = typeof j.id === "string" ? j.id.trim() : "";
  if (id === "") throw new Error('Each job requires a non-empty string "id".');
  if (seenIds.has(id)) throw new Error(`Duplicate job id: ${id}`);
  seenIds.add(id);

  const output = typeof j.output === "string" ? j.output.trim() : "";
  if (
    output !== OUTPUT_GLOBAL &&
    output !== OUTPUT_OBJECT &&
    output !== OUTPUT_LUA
  ) {
    throw new Error(
      `Job "${id}": output must be ${OUTPUT_GLOBAL}, ${OUTPUT_OBJECT}, or ${OUTPUT_LUA}`,
    );
  }

  if (typeof j.cloudFolder !== "string" || j.cloudFolder.trim() === "") {
    throw new Error(`Job "${id}": cloudFolder is required.`);
  }
  if (
    typeof j.filenameToNameSearchPattern !== "string" ||
    j.filenameToNameSearchPattern.trim() === ""
  ) {
    throw new Error(`Job "${id}": filenameToNameSearchPattern is required.`);
  }
  if (typeof j.filenameToNameReplacePattern !== "string") {
    throw new Error(`Job "${id}": filenameToNameReplacePattern is required.`);
  }
  parseAnchoredSearchPattern(j.filenameToNameSearchPattern);

  if (j.purgePatterns !== undefined) {
    if (output === OUTPUT_LUA) {
      throw new Error(`Job "${id}": purgePatterns is not allowed on LuaCatalog.`);
    }
    if (!Array.isArray(j.purgePatterns)) {
      throw new Error(`Job "${id}": purgePatterns must be an array of strings.`);
    }
    for (const p of j.purgePatterns) {
      if (typeof p !== "string") {
        throw new Error(`Job "${id}": purgePatterns entries must be strings.`);
      }
    }
  }

  if (output === OUTPUT_OBJECT) {
    if (!Array.isArray(j.targetGUIDs) || j.targetGUIDs.length < 1) {
      throw new Error(`Job "${id}": ObjectCustomUIAssets requires targetGUIDs (non-empty).`);
    }
    for (const g of j.targetGUIDs) {
      if (typeof g !== "string" || g.trim() === "") {
        throw new Error(`Job "${id}": targetGUIDs must be non-empty strings.`);
      }
    }
    if (j.tableName !== undefined) {
      throw new Error(`Job "${id}": tableName is only valid on LuaCatalog.`);
    }
  } else if (output === OUTPUT_LUA) {
    const tableName = typeof j.tableName === "string" ? j.tableName.trim() : "";
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      throw new Error(
        `Job "${id}": tableName must be a valid Lua identifier (got: ${JSON.stringify(j.tableName)})`,
      );
    }
    if (seenTableNames.has(tableName)) {
      throw new Error(`Duplicate LuaCatalog tableName: ${tableName}`);
    }
    seenTableNames.add(tableName);
    if (j.targetGUIDs !== undefined) {
      throw new Error(`Job "${id}": targetGUIDs is only valid on ObjectCustomUIAssets.`);
    }
  } else {
    if (j.targetGUIDs !== undefined) {
      throw new Error(`Job "${id}": targetGUIDs is only valid on ObjectCustomUIAssets.`);
    }
    if (j.tableName !== undefined) {
      throw new Error(`Job "${id}": tableName is only valid on LuaCatalog.`);
    }
  }

  return {
    id,
    cloudFolder: String(j.cloudFolder).trim(),
    recurIntoSubfolders: j.recurIntoSubfolders === true,
    output,
    filenameToNameSearchPattern: String(j.filenameToNameSearchPattern).trim(),
    filenameToNameReplacePattern: String(j.filenameToNameReplacePattern),
    targetGUIDs: Array.isArray(j.targetGUIDs)
      ? j.targetGUIDs.map((g) => String(g).trim())
      : [],
    tableName: typeof j.tableName === "string" ? j.tableName.trim() : null,
    purgePatterns:
      j.purgePatterns === undefined
        ? null
        : /** @type {string[]} */ (j.purgePatterns).map((p) => String(p)),
  };
}

/**
 * @param {string} fileName
 * @param {RegExp} matchRe
 * @param {string} replacement
 * @returns {string}
 */
function transformName(fileName, matchRe, replacement) {
  const re = new RegExp(matchRe.source, matchRe.flags.replace(/g/g, ""));
  if (!re.test(fileName)) {
    throw new Error(`Internal: Name failed search pattern after filter: ${fileName}`);
  }
  re.lastIndex = 0;
  const out = fileName.replace(re, replacement).trim();
  if (out === "") {
    throw new Error(`Name transform produced empty string for: ${fileName}`);
  }
  return out;
}

/**
 * @param {string} value
 * @returns {string}
 */
function luaString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
}

/**
 * @param {string} key
 * @returns {string}
 */
function luaKey(key) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return key;
  return `[${luaString(key)}]`;
}

/**
 * @param {Record<string, { filename: string, key: string, URL: string }>} table
 * @param {string} indent
 * @returns {string}
 */
function formatLuaTableEntries(table, indent) {
  const keys = Object.keys(table).sort((a, b) => a.localeCompare(b));
  const lines = [];
  for (const k of keys) {
    const row = table[k];
    lines.push(`${indent}${luaKey(k)} = {`);
    lines.push(`${indent}  filename = ${luaString(row.filename)},`);
    lines.push(`${indent}  key = ${luaString(row.key)},`);
    lines.push(`${indent}  URL = ${luaString(row.URL)},`);
    lines.push(`${indent}},`);
  }
  return lines.join("\n");
}

/**
 * @param {Record<string, Record<string, { filename: string, key: string, URL: string }>>} cloud
 * @returns {string}
 */
function renderCloudCatalogLua(cloud) {
  const tableNames = Object.keys(cloud).sort((a, b) => a.localeCompare(b));
  const parts = [
    "-- AUTO-GENERATED by cloud asset sync (.tools/cloud-asset-sync.js) — do not edit by hand",
    "-- Plan: .tools/Cloud-Asset-Sync-Plan.md",
    "Cloud = {",
  ];
  for (const name of tableNames) {
    parts.push(`  ${luaKey(name)} = {`);
    const body = formatLuaTableEntries(cloud[name], "    ");
    if (body !== "") parts.push(body);
    parts.push("  },");
  }
  parts.push("}");
  parts.push("");
  parts.push("return Cloud");
  parts.push("");
  return parts.join("\n");
}

/**
 * @param {string[]} argv
 */
function parseCli(argv) {
  /** @type {string | null} */
  let configPath = null;
  /** @type {string | null} */
  let jobFilter = null;
  let dryRun = false;
  let yesPurge = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--config" && argv[i + 1] != null) {
      configPath = path.resolve(argv[i + 1]);
      i += 1;
    } else if (a === "--job" && argv[i + 1] != null) {
      jobFilter = String(argv[i + 1]).trim();
      i += 1;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--yes-purge" || a === "-y") {
      yesPurge = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .tools/cloud-asset-sync.js [options]

Options:
  --config <path>   JSONC jobs file (default: .tools/cloud-asset-sync.jsonc)
  --job <id>        Run only this job id
  --dry-run         Plan only; do not write save or cloud_catalog.ttslua
  --yes-purge, -y   Accept stale CustomUIAssets purges without prompting
  --help, -h
`);
      process.exit(0);
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }

  return {
    configPath: configPath || DEFAULT_CONFIG,
    jobFilter,
    dryRun,
    yesPurge,
  };
}

/**
 * @returns {Promise<boolean>}
 */
function promptYesNo(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.resolve(false);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const a = String(answer || "")
        .trim()
        .toLowerCase();
      resolve(a === "y" || a === "yes");
    });
  });
}

async function main() {
  let cli;
  try {
    cli = parseCli(process.argv.slice(2));
  } catch (err) {
    console.error(`[cloud-asset-sync] FAIL: ${err.message}`);
    process.exit(1);
  }

  if (!fs.existsSync(cli.configPath)) {
    console.error(`[cloud-asset-sync] FAIL: config not found: ${cli.configPath}`);
    process.exit(1);
  }

  /** @type {Record<string, unknown>} */
  let configRoot;
  try {
    configRoot = /** @type {Record<string, unknown>} */ (loadJsonc(cli.configPath));
  } catch (err) {
    console.error(`[cloud-asset-sync] FAIL: invalid JSONC: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(configRoot.jobs) || configRoot.jobs.length < 1) {
    console.error('[cloud-asset-sync] FAIL: config needs a non-empty "jobs" array.');
    process.exit(1);
  }

  const seenIds = new Set();
  const seenTableNames = new Set();
  /** @type {ReturnType<typeof validateJob>[]} */
  let jobs;
  try {
    jobs = configRoot.jobs.map((j) => validateJob(j, seenIds, seenTableNames));
  } catch (err) {
    console.error(`[cloud-asset-sync] FAIL: ${err.message}`);
    process.exit(1);
  }

  if (cli.jobFilter) {
    jobs = jobs.filter((j) => j.id === cli.jobFilter);
    if (jobs.length === 0) {
      console.error(`[cloud-asset-sync] FAIL: no job with id "${cli.jobFilter}".`);
      process.exit(1);
    }
  }

  const needsSave = jobs.some(
    (j) => j.output === OUTPUT_GLOBAL || j.output === OUTPUT_OBJECT,
  );
  const luaJobs = jobs.filter((j) => j.output === OUTPUT_LUA);

  console.error(`[cloud-asset-sync] Config: ${cli.configPath} (${jobs.length} job(s))`);
  if (cli.dryRun) console.error("[cloud-asset-sync] Mode: dry-run (no writes)");

  // --- Steam Cloud ---
  const steamPath = path.join(__dirname, "tts-cloud", "lib", "steam_cloud.js");
  let openCloudInfo;
  let joinCloudFolder;
  let filterByFolderScope;
  try {
    ({ openCloudInfo, joinCloudFolder, filterByFolderScope } = require(steamPath));
  } catch (err) {
    console.error(
      `[cloud-asset-sync] FAIL: cannot load Steam Cloud helper (run npm install in .tools/tts-cloud): ${err.message}`,
    );
    process.exit(1);
  }

  console.error("[cloud-asset-sync] Connecting to Steam CloudInfo …");
  let session;
  try {
    session = openCloudInfo();
  } catch (err) {
    console.error(`[cloud-asset-sync] FAIL: ${err.message}`);
    process.exit(1);
  }
  console.error(
    `[cloud-asset-sync] OK: ${session.personaName}; CloudInfo entries=${session.rows.length}`,
  );

  // --- Save (if needed) ---
  /** @type {Record<string, unknown> | null} */
  let saveRoot = null;
  /** @type {string | null} */
  let saveFile = null;
  /** @type {import("./custom-ui-assets/lib/tts-assets-config.js").TtsAssetsConfig | null} */
  let ttsConfig = null;
  let saveDirty = false;

  if (needsSave) {
    const explicitSave =
      typeof configRoot.saveFileLocation === "string" &&
      configRoot.saveFileLocation.trim() !== ""
        ? path.resolve(configRoot.saveFileLocation.trim())
        : null;

    const existing = findExistingConfig();
    if (!existing && !explicitSave) {
      console.error(
        "[cloud-asset-sync] FAIL: no tts-assets.config.json and no saveFileLocation in JSONC. Run npm run tts-assets:configure.",
      );
      process.exit(1);
    }

    try {
      const resolved = await resolveSaveWithConfig({
        savePath: explicitSave,
        interactive: false,
      });
      saveFile = resolved.saveFile;
      ttsConfig = resolved.config;
      if (resolved.configPath) {
        console.error(`[cloud-asset-sync] Toolkit config: ${resolved.configPath}`);
      }
      console.error(`[cloud-asset-sync] Save: ${saveFile}`);
      saveRoot = JSON.parse(fs.readFileSync(saveFile, "utf8"));
    } catch (err) {
      console.error(`[cloud-asset-sync] FAIL: ${err.message}`);
      process.exit(1);
    }
  }

  /** @type {Record<string, Record<string, { filename: string, key: string, URL: string }>>} */
  const cloudAccum = {};

  /** @type {{ jobId: string, label: string, names: string[] }[]} */
  const allPurgeCandidates = [];

  for (const job of jobs) {
    console.error(`\n[cloud-asset-sync] Job "${job.id}" (${job.output}) …`);
    const cloudFolder = joinCloudFolder(job.cloudFolder);
    const folderRows = filterByFolderScope(
      session.rows,
      cloudFolder,
      job.recurIntoSubfolders,
    );
    console.error(
      `[cloud-asset-sync]   Cloud "${cloudFolder}" recur=${job.recurIntoSubfolders}: ${folderRows.length} file(s) in scope`,
    );

    const searchRe = parseAnchoredSearchPattern(job.filenameToNameSearchPattern);
    /** @type {{ filename: string, URL: string, converted: string }[]} */
    const planned = [];
    /** @type {Set<string>} */
    const seenConverted = new Set();
    /** @type {Set<string>} */
    const seenFilenames = new Set();
    let skipped = 0;

    for (const row of folderRows) {
      const filename = typeof row.Name === "string" ? row.Name : "";
      if (filename === "") {
        skipped += 1;
        continue;
      }
      searchRe.lastIndex = 0;
      if (!searchRe.test(filename)) {
        skipped += 1;
        continue;
      }
      if (seenFilenames.has(filename)) {
        console.error(
          `[cloud-asset-sync] FAIL: duplicate Cloud file Name "${filename}" in job "${job.id}".`,
        );
        process.exit(1);
      }
      seenFilenames.add(filename);
      const converted = transformName(
        filename,
        searchRe,
        job.filenameToNameReplacePattern,
      );
      if (seenConverted.has(converted)) {
        console.error(
          `[cloud-asset-sync] FAIL: duplicate converted name "${converted}" in job "${job.id}" (from ${filename}).`,
        );
        process.exit(1);
      }
      seenConverted.add(converted);
      const url = typeof row.URL === "string" ? row.URL : "";
      if (url === "" || url === "undefined") {
        console.error(
          `[cloud-asset-sync] FAIL: missing URL for Cloud file "${filename}" in job "${job.id}".`,
        );
        process.exit(1);
      }
      planned.push({ filename, URL: url, converted });
    }

    console.error(
      `[cloud-asset-sync]   Filter ${searchRe}: kept ${planned.length}, skipped ${skipped}`,
    );
    if (planned.length === 0) {
      console.error(
        `[cloud-asset-sync] FAIL: job "${job.id}" matched zero files after filter.`,
      );
      process.exit(1);
    }

    if (job.output === OUTPUT_LUA) {
      /** @type {Record<string, { filename: string, key: string, URL: string }>} */
      const table = {};
      for (const row of planned) {
        table[row.converted] = {
          filename: row.filename,
          key: row.converted,
          URL: row.URL,
        };
      }
      cloudAccum[/** @type {string} */ (job.tableName)] = table;
      console.error(
        `[cloud-asset-sync]   LuaCatalog Cloud.${job.tableName}: ${planned.length} entr(y/ies)`,
      );
      continue;
    }

    // Save modes
    if (!saveRoot) {
      console.error("[cloud-asset-sync] FAIL: internal — save root missing.");
      process.exit(1);
    }

    const guids = job.output === OUTPUT_OBJECT ? job.targetGUIDs : [];
    let targets;
    try {
      targets = resolveAssetTargets(saveRoot, guids);
    } catch (err) {
      console.error(`[cloud-asset-sync] FAIL: ${err.message}`);
      process.exit(1);
    }

    /** @type {RegExp[] | null} */
    let purgeRes = null;
    if (job.purgePatterns !== null) {
      if (job.purgePatterns.length === 0) {
        console.error(
          `[cloud-asset-sync]   Purge: explicitly disabled (purgePatterns: [])`,
        );
      } else {
        purgeRes = job.purgePatterns.map((p) => parseUserRegExp(p));
        console.error(
          `[cloud-asset-sync]   Purge: override patterns ${job.purgePatterns.join(", ")}`,
        );
      }
    } else {
      const derived = derivePurgePatterns(job.filenameToNameReplacePattern);
      if (derived == null) {
        console.error(
          `[cloud-asset-sync]   Purge: skipped (replace pattern cannot safely narrow: ${JSON.stringify(job.filenameToNameReplacePattern)})`,
        );
      } else {
        purgeRes = derived.map((p) => parseUserRegExp(p));
        console.error(`[cloud-asset-sync]   Purge: derived ${derived.join(", ")}`);
      }
    }

    const plannedSet = new Set(planned.map((p) => p.converted));

    for (const target of targets) {
      let addCount = 0;
      let overwriteCount = 0;
      /** @type {Map<string, number>} */
      const byName = new Map();
      for (let i = 0; i < target.assets.length; i += 1) {
        const n =
          typeof target.assets[i].Name === "string"
            ? /** @type {string} */ (target.assets[i].Name)
            : "";
        if (n !== "" && !byName.has(n)) byName.set(n, i);
      }

      for (const row of planned) {
        const idx = byName.get(row.converted);
        if (idx == null) {
          target.assets.push({ Type: 0, Name: row.converted, URL: row.URL });
          byName.set(row.converted, target.assets.length - 1);
          addCount += 1;
        } else {
          target.assets[idx] = { Type: 0, Name: row.converted, URL: row.URL };
          overwriteCount += 1;
        }
      }

      /** @type {string[]} */
      const purgeNames = [];
      if (purgeRes) {
        for (const asset of target.assets) {
          const n = typeof asset.Name === "string" ? asset.Name : "";
          if (n === "" || plannedSet.has(n)) continue;
          let hit = false;
          for (const re of purgeRes) {
            re.lastIndex = 0;
            if (re.test(n)) {
              hit = true;
              break;
            }
          }
          if (hit) purgeNames.push(n);
        }
      }

      console.error(
        `[cloud-asset-sync]   Target ${target.label}: +${addCount} new, ~${overwriteCount} overwrite, ?${purgeNames.length} purge candidate(s)`,
      );

      if (purgeNames.length > 0) {
        allPurgeCandidates.push({
          jobId: job.id,
          label: target.label,
          names: purgeNames.sort((a, b) => a.localeCompare(b)),
        });
      }

      // Stash purge names on target for apply after confirm
      /** @type {any} */ (target)._purgeNames = purgeNames;
      /** @type {any} */ (target)._jobId = job.id;
    }

    saveDirty = true;
    // Keep targets on saveRoot via mutation; store purge lists for later apply
    if (!/** @type {any} */ (saveRoot)._pendingPurges) {
      /** @type {any} */ (saveRoot)._pendingPurges = [];
    }
    for (const target of targets) {
      /** @type {any} */ (saveRoot)._pendingPurges.push({
        jobId: job.id,
        label: target.label,
        guid: target.guid,
        mode: target.mode,
        object: target.object,
        names: /** @type {string[]} */ (/** @type {any} */ (target)._purgeNames || []),
      });
    }
  }

  // --- Purge confirm (save) ---
  let applyPurges = false;
  if (allPurgeCandidates.length > 0) {
    console.error("\n[cloud-asset-sync] Stale CustomUIAssets purge candidates:");
    for (const block of allPurgeCandidates) {
      console.error(`  [${block.jobId}] ${block.label}:`);
      for (const n of block.names) {
        console.error(`    - ${n}`);
      }
    }
    if (cli.dryRun) {
      console.error("[cloud-asset-sync] Dry-run: purge not applied.");
    } else if (cli.yesPurge) {
      applyPurges = true;
      console.error("[cloud-asset-sync] --yes-purge: will remove candidates on write.");
    } else if (process.stdin.isTTY && process.stdout.isTTY) {
      const ok = await promptYesNo(
        "Remove these stale CustomUIAssets entries? [y/N] ",
      );
      if (ok) {
        applyPurges = true;
      } else {
        console.error(
          "[cloud-asset-sync] Purge declined — will still write add/overwrite changes; stale names left in place.",
        );
      }
    } else {
      console.error(
        "[cloud-asset-sync] FAIL: purge candidates present but no TTY (non-interactive). Re-run with --yes-purge or from an interactive terminal.",
      );
      process.exit(1);
    }
  }

  if (applyPurges && saveRoot && /** @type {any} */ (saveRoot)._pendingPurges) {
    for (const block of /** @type {any} */ (saveRoot)._pendingPurges) {
      if (!block.names || block.names.length === 0) continue;
      const nameSet = new Set(block.names);
      /** @type {Record<string, unknown>[]} */
      let assets;
      if (block.mode === "global") {
        assets = /** @type {Record<string, unknown>[]} */ (saveRoot.CustomUIAssets);
        saveRoot.CustomUIAssets = assets.filter(
          (a) => typeof a.Name !== "string" || !nameSet.has(a.Name),
        );
      } else if (block.object) {
        assets = /** @type {Record<string, unknown>[]} */ (block.object.CustomUIAssets);
        block.object.CustomUIAssets = assets.filter(
          (a) => typeof a.Name !== "string" || !nameSet.has(a.Name),
        );
      }
    }
  }

  // Clean ephemeral keys
  if (saveRoot) {
    delete /** @type {any} */ (saveRoot)._pendingPurges;
  }

  // --- Writes ---
  if (cli.dryRun) {
    if (luaJobs.length > 0) {
      console.error(
        `[cloud-asset-sync] Dry-run: would write lib/cloud_catalog.ttslua (${Object.keys(cloudAccum).length} table(s))`,
      );
    }
    if (saveDirty && saveFile) {
      console.error(`[cloud-asset-sync] Dry-run: would write save ${saveFile}`);
    }
    console.error("[cloud-asset-sync] PASS (dry-run)");
    process.exit(0);
  }

  if (luaJobs.length > 0) {
    const lua = renderCloudCatalogLua(cloudAccum);
    writeAtomic(CLOUD_CATALOG_LUA, lua);
    console.error(
      `[cloud-asset-sync] Wrote ${CLOUD_CATALOG_LUA} (${Object.keys(cloudAccum).length} table(s))`,
    );
  } else {
    console.error(
      "[cloud-asset-sync] No LuaCatalog jobs in this run — left lib/cloud_catalog.ttslua untouched.",
    );
  }

  if (saveDirty && saveFile && saveRoot) {
    if (ttsConfig) {
      const backupPath = backupSaveBeforeWrite(saveFile, ttsConfig);
      if (backupPath) {
        console.error(`[cloud-asset-sync] Backup: ${backupPath}`);
      }
    }
    writeAtomic(saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
    console.error(`[cloud-asset-sync] Wrote save: ${saveFile}`);
    console.error(
      "[cloud-asset-sync] Reload the save in Tabletop Simulator to pick up CustomUIAssets changes.",
    );
  }

  console.error("[cloud-asset-sync] PASS");
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[cloud-asset-sync] FAIL: ${err && err.stack ? err.stack : err}`);
    process.exit(1);
  });
}

module.exports = {
  stripJsonc,
  derivePurgePatterns,
  parseAnchoredSearchPattern,
  validateJob,
};
