#!/usr/bin/env node
"use strict";

/**
 * Local assets/ → Steam Cloud → save rows, object images, Lua modules, manifest.
 *
 * Config: .tools/cloud-asset-sync.jsonc. Docs: .tools/Cloud-Asset-Sync-Plan.md
 *
 * Flow: push assets/ to Cloud (skipped while TTS is open) → refresh assets/Save Only →
 * build each job's rows from its assets/ folder + the ledger's links → write outputs →
 * delete Cloud copies of files removed locally (kept while still used).
 *
 * Usage (repo root):
 *   npm run cloud-asset-sync
 *   npm run cloud-asset-sync -- --dry-run
 *   npm run cloud-asset-sync -- --job siteCards[,memoriamPanels]
 *   npm run cloud-asset-sync -- --no-push        (outputs from the ledger only)
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = path.join(__dirname, "cloud-asset-sync.jsonc");
const MANIFEST_PATH = path.join(REPO_ROOT, "lib", "json", "cloud-assets.json");

const { loadCloudConfig } = require("./tts-cloud/lib/cloud_config.js");
const { loadLedger, scanAssets } = require("./tts-cloud/lib/assets_tree.js");
const { planPush, applyPush, applyDeletes, refreshSaveOnly } = require("./tts-cloud/lib/push.js");
const { resolveAssetTargets, writeAtomic, parseUserRegExp } = require("./custom-ui-assets/lib/custom-ui-assets-save.js");
const { findExistingConfig, backupSaveBeforeWrite } = require("./custom-ui-assets/lib/tts-assets-config.js");

const OUTPUT_GLOBAL = "GlobalCustomUIAssets";
const OUTPUT_OBJECT = "ObjectCustomUIAssets";
const OUTPUT_IMAGE = "ObjectImage";
const OUTPUT_LUA = "LuaModule";
const OUTPUT_MANIFEST = "Manifest";
const OUTPUTS = [OUTPUT_GLOBAL, OUTPUT_OBJECT, OUTPUT_IMAGE, OUTPUT_LUA, OUTPUT_MANIFEST];
const SAVE_OUTPUTS = new Set([OUTPUT_GLOBAL, OUTPUT_OBJECT, OUTPUT_IMAGE]);

function log(msg) {
  console.error(`[cloud-asset-sync] ${msg}`);
}

function warn(msg) {
  console.error(`[cloud-asset-sync] WARN ${msg}`);
}

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
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
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
 * Literal text a filename must contain outside capture groups, ignoring the extension.
 * "" means the pattern is not specific (it would match strays).
 *   ^siteCard_(.*)\.webp$ → "siteCard_"   ^(.*)_panel\.jpg$ → "_panel"   ^(.*)\.webp$ → ""
 * @param {string} source
 * @returns {string}
 */
function distinguishingLiteral(source) {
  const s = String(source).trim().replace(/^\^/, "").replace(/\$$/, "");
  const WILD = "\u0000";
  let out = "";
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "\\") {
      const next = s[i + 1] || "";
      if (depth === 0) out += /[dDwWsSbB]/.test(next) ? WILD : `\\${next}`;
      i += 1;
      continue;
    }
    if (ch === "[") {
      let j = i + 1;
      if (s[j] === "^") j += 1;
      if (s[j] === "]") j += 1;
      while (j < s.length && s[j] !== "]") {
        if (s[j] === "\\") j += 1;
        j += 1;
      }
      i = j;
      if (depth === 0) out += WILD;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      if (depth === 1) out += WILD;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      continue;
    }
    if (depth > 0) continue;
    if (ch === "?" || ch === "*") {
      out = out.endsWith(WILD) ? out : `${out.replace(/\\?.$/s, "")}${WILD}`;
      continue;
    }
    if (ch === "{") {
      const close = s.indexOf("}", i);
      const min = Number(s.slice(i + 1, close).split(",")[0]);
      if (min === 0) out = `${out.replace(/\\?.$/s, "")}${WILD}`;
      i = close;
      continue;
    }
    if (ch === "+") continue;
    if (ch === "." || ch === "|") {
      out += WILD;
      continue;
    }
    out += ch;
  }
  out = out.replace(/(?:\\\.[A-Za-z0-9]*|\u0000)+$/, "");
  const literal = out.replace(/\\(.)/g, "$1").split(WILD).join("");
  return /[A-Za-z0-9]/.test(literal) ? literal : "";
}

/**
 * Save-row name family from the replace pattern: siteCard_$1 → ^siteCard_(.*)$.
 * @param {string} replacePattern
 * @returns {string[] | null} null when the replace pattern has no literal to narrow on
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
      if (/[A-Za-z0-9]/.test(m[2])) narrowed = true;
      pattern += m[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  pattern += "$";
  return narrowed ? [pattern] : null;
}

/**
 * @param {unknown} raw
 * @param {Record<string, string[]>} targetGroups
 * @param {string} id
 * @returns {string[]}
 */
function resolveTargets(raw, targetGroups, id) {
  const isGroup = (g) => typeof g === "string" && Object.prototype.hasOwnProperty.call(targetGroups, g);
  const list = typeof raw === "string" ? targetGroups[raw] : raw;
  if (typeof raw === "string" && !list) throw new Error(`Job "${id}": unknown target group "${raw}".`);
  if (!Array.isArray(list) || list.length === 0) throw new Error(`Job "${id}": targets must be a non-empty list of GUIDs / target groups, or a target group.`);
  return list.flatMap((g) => (isGroup(g) ? targetGroups[g] : [g])).map((g) => {
    if (typeof g !== "string" || g.trim() === "") throw new Error(`Job "${id}": targets must be GUID strings or target group names.`);
    return g.trim();
  });
}

/**
 * @typedef {{
 *   id: string, folder: string, recurIntoSubfolders: boolean, output: string,
 *   searchPattern: string, replacePattern: string, literal: string,
 *   targets: string[], ownsAllRows: boolean, purgePatterns: string[],
 *   module: string | null, field: string | null, objects: Record<string, string[]>,
 * }} Job
 */

/**
 * @param {unknown} job
 * @param {Record<string, string[]>} targetGroups
 * @param {Set<string>} seenIds
 * @returns {Job}
 */
function validateJob(job, targetGroups, seenIds) {
  if (!job || typeof job !== "object" || Array.isArray(job)) throw new Error("Each job must be an object.");
  const j = /** @type {Record<string, any>} */ (job);
  const id = typeof j.id === "string" ? j.id.trim() : "";
  if (id === "") throw new Error('Each job requires a non-empty string "id".');
  if (seenIds.has(id)) throw new Error(`Duplicate job id: ${id}`);
  seenIds.add(id);

  const output = typeof j.output === "string" ? j.output.trim() : "";
  if (!OUTPUTS.includes(output)) throw new Error(`Job "${id}": output must be one of ${OUTPUTS.join(", ")}.`);
  const folder = typeof j.folder === "string" ? j.folder.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") : "";
  if (folder === "") throw new Error(`Job "${id}": folder (under assets/) is required.`);

  const searchPattern = typeof j.filenameToNameSearchPattern === "string" ? j.filenameToNameSearchPattern.trim() : "";
  if (!searchPattern.startsWith("^") || !searchPattern.endsWith("$")) {
    throw new Error(`Job "${id}": filenameToNameSearchPattern must start with ^ and end with $.`);
  }
  parseUserRegExp(searchPattern);
  if (typeof j.filenameToNameReplacePattern !== "string" || j.filenameToNameReplacePattern === "") {
    throw new Error(`Job "${id}": filenameToNameReplacePattern is required.`);
  }

  const purgePatterns = j.purgePatterns === undefined ? [] : j.purgePatterns;
  if (!Array.isArray(purgePatterns) || purgePatterns.some((p) => typeof p !== "string" || p === "")) {
    throw new Error(`Job "${id}": purgePatterns must be a non-empty list of patterns (or omitted).`);
  }
  if (j.purgePatterns !== undefined && purgePatterns.length === 0) {
    throw new Error(`Job "${id}": purgePatterns: [] is not allowed; every save-writing job purges what it no longer owns.`);
  }

  const out = {
    id,
    folder,
    recurIntoSubfolders: j.recurIntoSubfolders === true,
    output,
    searchPattern,
    replacePattern: j.filenameToNameReplacePattern,
    literal: distinguishingLiteral(searchPattern),
    targets: [],
    ownsAllRows: j.ownsAllRows === true,
    purgePatterns,
    module: null,
    field: null,
    objects: {},
  };

  if (output === OUTPUT_OBJECT) {
    out.targets = resolveTargets(j.targets, targetGroups, id);
  } else if (j.targets !== undefined || j.ownsAllRows !== undefined) {
    throw new Error(`Job "${id}": targets / ownsAllRows are only valid on ${OUTPUT_OBJECT}.`);
  }
  if (output === OUTPUT_GLOBAL || output === OUTPUT_OBJECT) {
    if (!out.ownsAllRows && purgePatterns.length === 0 && derivePurgePatterns(out.replacePattern) === null) {
      throw new Error(
        `Job "${id}": no purge family — give filenameToNameReplacePattern a literal (e.g. siteCard_$1), purgePatterns, or ownsAllRows.`,
      );
    }
  } else if (j.purgePatterns !== undefined) {
    throw new Error(`Job "${id}": purgePatterns are only valid on save-row jobs.`);
  }

  if (output === OUTPUT_LUA) {
    const mod = typeof j.module === "string" ? j.module.trim() : "";
    if (!/^lib\/cloud_[a-z0-9_]+\.ttslua$/.test(mod)) {
      throw new Error(`Job "${id}": module must be lib/cloud_<name>.ttslua (got ${JSON.stringify(j.module)}).`);
    }
    out.module = mod;
  } else if (j.module !== undefined) {
    throw new Error(`Job "${id}": module is only valid on ${OUTPUT_LUA}.`);
  }

  if (output === OUTPUT_IMAGE) {
    const field = typeof j.field === "string" ? j.field.trim() : "";
    if (!/^[A-Za-z]+(\.[A-Za-z]+)*$/.test(field)) throw new Error(`Job "${id}": field must be a dotted save path such as CustomImage.ImageURL.`);
    out.field = field;
    if (!j.objects || typeof j.objects !== "object" || Array.isArray(j.objects) || Object.keys(j.objects).length === 0) {
      throw new Error(`Job "${id}": objects must map asset names to a GUID, GUID list, or target group.`);
    }
    for (const [name, guids] of Object.entries(j.objects)) {
      const isGroup = typeof guids === "string" && Object.prototype.hasOwnProperty.call(targetGroups, guids);
      out.objects[name] = resolveTargets(isGroup || Array.isArray(guids) ? guids : [guids], targetGroups, id);
    }
  } else if (j.field !== undefined || j.objects !== undefined) {
    throw new Error(`Job "${id}": field / objects are only valid on ${OUTPUT_IMAGE}.`);
  }
  return out;
}

/**
 * @param {Record<string, any>} configRoot
 * @returns {Job[]}
 */
function validateConfig(configRoot) {
  if (!Array.isArray(configRoot.jobs) || configRoot.jobs.length === 0) throw new Error('Config needs a non-empty "jobs" array.');
  const targetGroups = configRoot.targetGroups || {};
  const seenIds = new Set();
  const jobs = configRoot.jobs.map((j) => validateJob(j, targetGroups, seenIds));
  const modules = new Set();
  for (const j of jobs) {
    if (!j.module) continue;
    if (modules.has(j.module)) throw new Error(`Two jobs write ${j.module}.`);
    modules.add(j.module);
  }
  return jobs;
}

/**
 * @param {string} fileName
 * @param {RegExp} re
 * @param {string} replacement
 */
function transformName(fileName, re, replacement) {
  const out = fileName.replace(re, replacement).trim();
  if (out === "") throw new Error(`Name transform produced an empty string for ${fileName}.`);
  return out;
}

/**
 * @param {string} value
 */
function luaString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
}

/**
 * @param {string} key
 */
function luaKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`;
}

/**
 * @param {Job} job
 * @param {{ name: string, filename: string, url: string }[]} rows
 */
function renderLuaModule(job, rows) {
  const lines = [
    `-- AUTO-GENERATED by npm run cloud-asset-sync (job ${job.id}, assets/${job.folder}) — do not edit by hand`,
    "return {",
  ];
  for (const row of [...rows].sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  ${luaKey(row.name)} = { filename = ${luaString(row.filename)}, URL = ${luaString(row.url)} },`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

/**
 * @param {string[]} argv
 */
function parseCli(argv) {
  let configPath = DEFAULT_CONFIG;
  const jobFilter = [];
  let dryRun = false;
  let noPush = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--config" && argv[i + 1] != null) {
      configPath = path.resolve(argv[i + 1]);
      i += 1;
    } else if (a === "--job" && argv[i + 1] != null) {
      for (const id of String(argv[i + 1]).split(",")) {
        if (id.trim() !== "" && !jobFilter.includes(id.trim())) jobFilter.push(id.trim());
      }
      i += 1;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--no-push") {
      noPush = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .tools/cloud-asset-sync.js [options]

  --job <id[,id…]>  Rebuild only these jobs; other jobs keep their last manifest rows
  --dry-run         Plan only: no Cloud, save, module, or manifest writes
  --no-push         Skip the Cloud push and deletes; build outputs from the ledger
  --config <path>   Jobs file (default: .tools/cloud-asset-sync.jsonc)`);
      process.exit(0);
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }
  return { configPath, jobFilter: jobFilter.length > 0 ? jobFilter : null, dryRun, noPush };
}

/**
 * @returns {{ jobs: Record<string, { output: string, folder: string, rows: any[] }> }}
 */
function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { jobs: {} };
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

/**
 * Every object with this GUID (top level, contained, states).
 * @param {Record<string, any>} saveRoot
 * @returns {Map<string, Record<string, any>[]>}
 */
function objectsByGuid(saveRoot) {
  const map = new Map();
  const visit = (o) => {
    if (!o || typeof o !== "object") return;
    if (typeof o.GUID === "string") {
      const k = o.GUID.toLowerCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(o);
    }
    for (const c of o.ContainedObjects || []) visit(c);
    for (const s of Object.values(o.States || {})) visit(s);
  };
  for (const o of saveRoot.ObjectStates || []) visit(o);
  return map;
}

/**
 * @param {Record<string, any>} obj
 * @param {string} field dotted
 * @param {string} value
 */
function setDotted(obj, field, value) {
  const parts = field.split(".");
  let node = obj;
  for (const p of parts.slice(0, -1)) {
    if (!node[p] || typeof node[p] !== "object") throw new Error(`Object ${obj.GUID} has no ${p} (field ${field}).`);
    node = node[p];
  }
  const leaf = parts[parts.length - 1];
  if (node[leaf] === value) return false;
  node[leaf] = value;
  return true;
}

/**
 * @param {Job} job
 * @param {import("./tts-cloud/lib/assets_tree.js").LocalFile[]} local
 */
function filesInScope(job, local) {
  return local.filter((f) => f.folder === job.folder || (job.recurIntoSubfolders && f.folder.startsWith(`${job.folder}/`)));
}

/** Collect only rows whose current local bytes have a matching Cloud ledger entry. */
function collectJobRows(job, local, ledger) {
  const re = parseUserRegExp(job.searchPattern);
  const rows = [], pending = [], seen = new Map();
  for (const f of filesInScope(job, local)) {
    if (!re.test(f.name)) continue;
    const name = transformName(f.name, re, job.replacePattern);
    if (seen.has(name)) throw new Error(`Job "${job.id}": assets/${f.relPath} and assets/${seen.get(name)} both become "${name}".`);
    seen.set(name, f.relPath);
    const entry = ledger.files[f.relPath];
    // A skipped push can leave an older version at this path. Never publish
    // the new local hash beside the old Cloud URL.
    if (!entry || entry.key !== f.key) pending.push(f.name);
    else rows.push({ name, filename: f.name, path: f.relPath, sha1: f.sha1, url: entry.url, size: f.size });
  }
  rows.sort((a, b) => a.path.localeCompare(b.path));
  return { rows, pending };
}

/**
 * Files in a job folder that no job (skipped or not) matches.
 * @param {Job[]} jobs
 * @param {import("./tts-cloud/lib/assets_tree.js").LocalFile[]} local
 * @returns {string[]} relPaths, sorted
 */
function findLocalStrays(jobs, local) {
  const claimed = new Set();
  const inScope = new Set();
  for (const job of jobs) {
    const re = parseUserRegExp(job.searchPattern);
    for (const f of filesInScope(job, local)) {
      inScope.add(f.relPath);
      if (re.test(f.name)) claimed.add(f.relPath);
    }
  }
  return [...inScope].filter((rel) => !claimed.has(rel)).sort();
}

async function main() {
  const cli = parseCli(process.argv.slice(2));
  const configRoot = JSON.parse(stripJsonc(fs.readFileSync(cli.configPath, "utf8")));
  const allJobs = validateConfig(configRoot);
  if (cli.jobFilter) {
    const unknown = cli.jobFilter.filter((id) => !allJobs.some((j) => j.id === id));
    if (unknown.length > 0) throw new Error(`No job with id "${unknown.join('", "')}".`);
  }
  const cfg = loadCloudConfig();
  const prevManifest = readManifest();
  log(`Config: ${path.relative(REPO_ROOT, cli.configPath)} (${allJobs.length} jobs); assets: ${cfg.assetsDir}${cli.dryRun ? "; DRY RUN" : ""}`);

  /** @type {Job[]} */
  const active = [];
  /** @type {Set<string>} */
  const carried = new Set();
  for (const job of allJobs) {
    if (cli.jobFilter && !cli.jobFilter.includes(job.id)) {
      carried.add(job.id);
    } else if (job.literal === "") {
      warn(
        `SKIP job "${job.id}": filenameToNameSearchPattern ${job.searchPattern} has no distinguishing literal outside its capture groups (it would match stray files). Give its files a prefix or suffix (e.g. ^token_(.*)\\.webp$). Its outputs are left as they are.`,
      );
      carried.add(job.id);
    } else {
      active.push(job);
    }
  }

  let session = null;
  if (!cli.noPush) {
    try {
      session = require("./tts-cloud/lib/steam_session.js").openSteamSession();
    } catch (err) {
      warn(`Steam is not available (${err.message}); push skipped, links come from the ledger.`);
    }
  }

  try {
    let plan = null;
    if (session) {
      plan = planPush(cfg, session);
      log(
        `Push: ${plan.inSync.length} in sync, ${plan.uploads.length} to upload, ${plan.moves.length} to move, ${plan.deleteCandidates.length} to delete; ${plan.cloudOnly.length} Cloud-only file(s) under the root (npm run cloud:strays).`,
      );
      for (const d of plan.localDuplicates) warn(`DUPLICATE LOCAL ${d.file}: same file as ${d.sameAs}`);
      if (!cli.dryRun) {
        await applyPush(cfg, session, plan, { label: "build", log });
        const so = refreshSaveOnly(cfg, session, plan.rows);
        if (so.written + so.removed > 0) log(`Save Only: ${so.written} updated, ${so.removed} removed.`);
      }
    }

    const ledger = loadLedger(cfg.assetsDir);
    const local = scanAssets(cfg.assetsDir);

    for (const rel of findLocalStrays(allJobs, local)) warn(`STRAY assets/${rel}: in a job folder but matches no job pattern`);

    /** @type {Map<string, { name: string, filename: string, path: string, sha1: string, url: string, size: number }[]>} */
    const rowsByJob = new Map();
    for (const job of [...active]) {
      const { rows, pending } = collectJobRows(job, local, ledger);
      if (pending.length > 0) {
        warn(
          `HOLD job "${job.id}": ${pending.length} file(s) are not in Cloud yet (${pending.slice(0, 3).join(", ")}${pending.length > 3 ? ", …" : ""}). Its outputs are left as they are until npm run cloud:push (TTS closed).`,
        );
        active.splice(active.indexOf(job), 1);
        carried.add(job.id);
        continue;
      }
      rowsByJob.set(job.id, rows);
      log(`Job "${job.id}" (${job.output}, assets/${job.folder}): ${rows.length} file(s)`);
    }

    // --- Save outputs ---
    const saveJobs = active.filter((j) => SAVE_OUTPUTS.has(j.output));
    let saveRoot = null;
    let saveBefore = "";
    if (saveJobs.length > 0) {
      saveRoot = JSON.parse(fs.readFileSync(cfg.saveFile, "utf8"));
      saveBefore = JSON.stringify(saveRoot);
      log(`Save: ${cfg.saveFile}`);

      const rowJobs = allJobs.filter((j) => j.output === OUTPUT_GLOBAL || j.output === OUTPUT_OBJECT);
      /** @type {Map<string, Set<string>>} target key → names some job owns there this run */
      const owned = new Map();
      const own = (key, name) => {
        if (!owned.has(key)) owned.set(key, new Set());
        owned.get(key).add(name);
      };
      const targetKeys = (job) => (job.output === OUTPUT_GLOBAL ? ["global"] : job.targets.map((g) => g.toLowerCase()));
      /** Targets of a held job that has never run: its rows are unknown, so nothing there is purged. */
      const unsettled = new Map();
      for (const job of rowJobs) {
        const rows = carried.has(job.id) ? (prevManifest.jobs[job.id] || { rows: [] }).rows : rowsByJob.get(job.id);
        for (const key of targetKeys(job)) for (const r of rows) own(key, r.name);
        if (carried.has(job.id) && !prevManifest.jobs[job.id]) for (const key of targetKeys(job)) unsettled.set(key, job.id);
      }

      for (const job of saveJobs.filter((j) => j.output !== OUTPUT_IMAGE)) {
        const rows = rowsByJob.get(job.id);
        const targets = resolveAssetTargets(saveRoot, job.output === OUTPUT_GLOBAL ? [] : job.targets);
        const family = [...(derivePurgePatterns(job.replacePattern) || []), ...job.purgePatterns].map((p) => parseUserRegExp(p));
        const prevNames = new Set(((prevManifest.jobs[job.id] || {}).rows || []).map((r) => r.name));
        for (const target of targets) {
          const key = target.mode === "global" ? "global" : String(target.guid).toLowerCase();
          const ownedHere = owned.get(key) || new Set();
          const byName = new Map(target.assets.map((a, i) => [a.Name, i]));
          let added = 0;
          let changed = 0;
          for (const r of rows) {
            const idx = byName.get(r.name);
            if (idx == null) {
              target.assets.push({ Type: 0, Name: r.name, URL: r.url });
              added += 1;
            } else if (target.assets[idx].URL !== r.url) {
              target.assets[idx] = { Type: 0, Name: r.name, URL: r.url };
              changed += 1;
            }
          }
          const purged = [];
          const heldBy = unsettled.get(key);
          if (heldBy) warn(`NO PURGE ${job.id} → ${target.label}: job "${heldBy}" on the same target has not run yet.`);
          const kept = target.assets.filter((a) => {
            const n = typeof a.Name === "string" ? a.Name : "";
            if (n === "" || heldBy || ownedHere.has(n)) return true;
            const mine = job.ownsAllRows || prevNames.has(n) || family.some((re) => re.test(n));
            if (mine) purged.push(n);
            return !mine;
          });
          target.assets.length = 0;
          target.assets.push(...kept);
          if (added + changed + purged.length > 0) {
            log(`  ${job.id} → ${target.label}: +${added} new, ~${changed} relinked, -${purged.length} purged${purged.length ? ` (${purged.join(", ")})` : ""}`);
          }
        }
      }

      const byGuid = objectsByGuid(saveRoot);
      for (const job of saveJobs.filter((j) => j.output === OUTPUT_IMAGE)) {
        const rows = new Map(rowsByJob.get(job.id).map((r) => [r.name, r]));
        for (const [name, guids] of Object.entries(job.objects)) {
          const row = rows.get(name);
          if (!row) throw new Error(`Job "${job.id}": no file in assets/${job.folder} becomes "${name}" (needed by ${guids.join(", ")}).`);
          for (const guid of guids) {
            const objs = byGuid.get(guid.toLowerCase());
            if (!objs) throw new Error(`Job "${job.id}": object ${guid} is not in the save.`);
            for (const o of objs) if (setDotted(o, job.field, row.url)) log(`  ${job.id} → ${guid} ${job.field} = ${name}`);
          }
        }
      }
    }

    // --- Lua modules + manifest ---
    const manifest = { cloudRoot: cfg.cloudRoot, jobs: {} };
    for (const job of allJobs) {
      if (carried.has(job.id)) {
        if (prevManifest.jobs[job.id]) manifest.jobs[job.id] = prevManifest.jobs[job.id];
        continue;
      }
      manifest.jobs[job.id] = {
        output: job.output,
        folder: job.folder,
        rows: rowsByJob.get(job.id).map((r) => ({ path: r.path, name: r.name, sha1: r.sha1, url: r.url, size: r.size })),
      };
    }

    if (cli.dryRun) {
      log("PASS (dry run; nothing written)");
      return;
    }

    for (const job of active.filter((j) => j.output === OUTPUT_LUA)) {
      const abs = path.join(REPO_ROOT, job.module);
      const text = renderLuaModule(job, rowsByJob.get(job.id));
      if (!fs.existsSync(abs) || fs.readFileSync(abs, "utf8") !== text) {
        writeAtomic(abs, text);
        log(`Wrote ${job.module}`);
      }
    }
    const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
    if (!fs.existsSync(MANIFEST_PATH) || fs.readFileSync(MANIFEST_PATH, "utf8") !== manifestText) {
      writeAtomic(MANIFEST_PATH, manifestText);
      log(`Wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)}`);
    }

    if (saveRoot) {
      if (JSON.stringify(saveRoot) !== saveBefore) {
        const existing = findExistingConfig();
        backupSaveBeforeWrite(cfg.saveFile, existing ? existing.config : null);
        writeAtomic(cfg.saveFile, `${JSON.stringify(saveRoot, null, 2)}\n`);
        log(`Wrote save ${cfg.saveFile} — reload it in Tabletop Simulator.`);
      }
    }

    if (session && plan) {
      applyDeletes(cfg, session, plan, { label: "build", log, warn });
    }
    log("PASS");
  } finally {
    if (session) session.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[cloud-asset-sync] FAIL: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
}

module.exports = {
  stripJsonc,
  distinguishingLiteral,
  derivePurgePatterns,
  validateConfig,
  findLocalStrays,
  readManifest,
  MANIFEST_PATH,
  renderLuaModule,
  parseCli,
  collectJobRows,
};
