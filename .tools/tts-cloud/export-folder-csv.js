#!/usr/bin/env node
"use strict";

/**
 * Export a TTS Cloud Manager subfolder as Name,URL CSV.
 *
 * Root folder is configured in .tools/tts-cloud/config.js (CLOUD_ROOT).
 * Subfolder is required on the CLI.
 *
 * Prereqs: Steam running; `cd .tools/tts-cloud && npm install`
 *
 * Examples (repo root):
 *   npm run tts-cloud:export -- Sites
 *   npm run tts-cloud:export -- Sites --out "lib/json/Site Cards.csv"
 *   npm run tts-cloud:export -- Sites --name-filter "\\.webp$"
 *   node .tools/tts-cloud/export-folder-csv.js Districts
 */

const path = require("path");
const fs = require("fs");
const {
  TOOLS_DIR,
  config,
  joinCloudFolder,
  openCloudInfo,
  filterByFolder,
  toNameUrlCsv,
  listFolders,
  normalizeCloudPath,
} = require("./lib/steam_cloud.js");

/**
 * @param {string} patternSource e.g. \\.webp$ or /\\.webp$/i
 * @returns {RegExp}
 */
function parseUserRegExp(patternSource) {
  const raw = String(patternSource ?? "").trim();
  if (raw === "") {
    throw new Error("Regexp pattern is empty.");
  }
  const slashForm = raw.match(/^\/(.+)\/([gimsuy]*)$/s);
  if (slashForm) {
    return new RegExp(slashForm[1], slashForm[2]);
  }
  return new RegExp(raw);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {string | null} */
  let subfolder = null;
  /** @type {string | null} */
  let outPath = null;
  /** @type {string | null} */
  let nameFilter = null;
  let listOnly = false;
  let stdoutOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    // VS Code tasks may pass empty strings for optional prompts.
    if (a == null || String(a).trim() === "") {
      continue;
    }
    if (a === "--out" || a === "-o") {
      if (argv[i + 1] == null) throw new Error(`${a} requires a path`);
      const v = String(argv[i + 1]).trim();
      i += 1;
      // Blank --out from a task prompt → use default out path.
      if (v !== "") {
        outPath = v;
      }
    } else if (
      (a === "--name-filter" || a === "--whitelist" || a === "-f") &&
      argv[i + 1] != null
    ) {
      const v = String(argv[i + 1]).trim();
      i += 1;
      // Blank filter from a task prompt → include all files.
      if (v !== "") {
        nameFilter = v;
      }
    } else if (a === "--list-folders") {
      listOnly = true;
    } else if (a === "--stdout") {
      stdoutOnly = true;
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    } else if (subfolder == null) {
      subfolder = a;
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }

  return { subfolder, outPath, nameFilter, listOnly, stdoutOnly };
}

function printHelp() {
  console.log(`Usage: node .tools/tts-cloud/export-folder-csv.js <Subfolder> [options]

Reads CloudInfo.bson via Steamworks and writes a CSV:
  Name,URL
  AnarchBar.webp,https://steamusercontent-a.akamaihd.net/ugc/...

Cloud path = CLOUD_ROOT / <Subfolder>
  CLOUD_ROOT (config.js): "${config.CLOUD_ROOT}"

Options:
  --out, -o <path|name>         Output CSV path.
                                Default: .tools/tts-cloud/out/<Subfolder>.csv
                                Bare name (e.g. CSheets) → .tools/tts-cloud/out/<name>.csv
                                Missing .csv extension is added automatically.
  --name-filter, --whitelist, -f <regexp>
                                Optional whitelist: only include files whose Name matches.
                                Forms: \\\\.webp$   or   /\\\\.webp$/i
                                Omit / blank → include all files in the folder.
  --stdout                      Print CSV to stdout instead of writing a file
  --list-folders                List folders under CLOUD_ROOT and exit (no Subfolder required)
  --help, -h
`);
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function ensureCsvExtension(filePath) {
  const ext = path.extname(filePath);
  if (ext.toLowerCase() === ".csv") {
    return filePath;
  }
  return `${filePath}.csv`;
}

/**
 * @param {string} subfolder
 * @returns {string}
 */
function defaultOutPath(subfolder) {
  const safe = normalizeCloudPath(subfolder).replace(/[\/\\]+/g, "_");
  return path.join(TOOLS_DIR, "out", `${safe}.csv`);
}

/**
 * Resolve --out:
 * - omitted → defaultOutPath(subfolder)
 * - bare filename (no dir separators) → .tools/tts-cloud/out/<name>.csv
 * - relative/absolute path → as given (cwd-resolved if relative), +.csv if needed
 * @param {string | null} outArg
 * @param {string} subfolder
 * @returns {string}
 */
function resolveOutPath(outArg, subfolder) {
  if (outArg == null || String(outArg).trim() === "") {
    return defaultOutPath(subfolder);
  }
  const raw = String(outArg).trim();
  const hasDir = raw.includes("/") || raw.includes("\\") || path.isAbsolute(raw);
  if (!hasDir) {
    const base = path.basename(raw);
    return path.join(TOOLS_DIR, "out", ensureCsvExtension(base));
  }
  return ensureCsvExtension(path.resolve(raw));
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[tts-cloud:export] FAIL: ${err.message}`);
    printHelp();
    process.exit(1);
  }

  console.error(`[tts-cloud:export] Connecting (CLOUD_ROOT="${config.CLOUD_ROOT}") …`);
  let session;
  try {
    session = openCloudInfo();
  } catch (err) {
    console.error(`[tts-cloud:export] FAIL: ${err.message}`);
    process.exit(1);
  }

  console.error(
    `[tts-cloud:export] OK: ${session.personaName}; RemoteStorage files=${session.remoteFileCount}; CloudInfo entries=${session.rows.length}`,
  );

  if (args.listOnly) {
    const folders = listFolders(session.rows, config.CLOUD_ROOT);
    console.error(`[tts-cloud:export] Folders under "${config.CLOUD_ROOT}" (${folders.length}):`);
    for (const f of folders) {
      console.log(f);
    }
    process.exit(0);
  }

  if (args.subfolder == null || String(args.subfolder).trim() === "") {
    console.error("[tts-cloud:export] FAIL: Subfolder is required (e.g. Sites).");
    printHelp();
    process.exit(1);
  }

  const cloudFolder = joinCloudFolder(args.subfolder);
  let matched = filterByFolder(session.rows, cloudFolder);
  console.error(`[tts-cloud:export] "${cloudFolder}": ${matched.length} file(s) in folder`);

  if (args.nameFilter) {
    const re = parseUserRegExp(args.nameFilter);
    const before = matched.length;
    matched = matched.filter((row) => {
      const name = typeof row.Name === "string" ? row.Name : "";
      const ok = name !== "" && re.test(name);
      re.lastIndex = 0;
      return ok;
    });
    console.error(
      `[tts-cloud:export] Name filter ${re}: ${before} → ${matched.length} file(s)`,
    );
  }

  if (matched.length === 0) {
    const folders = listFolders(session.rows, config.CLOUD_ROOT);
    console.error(
      args.nameFilter
        ? "[tts-cloud:export] FAIL: no files left after name whitelist filter."
        : "[tts-cloud:export] FAIL: no entries in that folder.",
    );
    if (!args.nameFilter) {
      console.error("[tts-cloud:export] Available under CLOUD_ROOT:");
      for (const f of folders.slice(0, 40)) console.error(`  - ${f}`);
      if (folders.length > 40) console.error(`  … +${folders.length - 40} more`);
    }
    process.exit(1);
  }

  const missingUrl = matched.filter((r) => !r.URL || r.URL === "undefined");
  if (missingUrl.length > 0) {
    console.error(
      `[tts-cloud:export] WARN: ${missingUrl.length} row(s) missing URL (still included).`,
    );
  }

  const csv = toNameUrlCsv(matched);

  if (args.stdoutOnly) {
    process.stdout.write(csv);
    console.error(`[tts-cloud:export] PASS: wrote ${matched.length} rows to stdout`);
    process.exit(0);
  }

  const outPath = resolveOutPath(args.outPath, args.subfolder);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv, "utf8");
  console.error(`[tts-cloud:export] PASS: wrote ${matched.length} rows → ${outPath}`);
  process.exit(0);
}

main();
