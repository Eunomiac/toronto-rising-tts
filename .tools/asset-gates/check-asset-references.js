#!/usr/bin/env node
"use strict";

/**
 * check:asset-references — every image name the UI asks for exists as a Cloud job row.
 *
 * Fails on: a static image name in built XmlUI or Lua that no job writes
 *   (Global XmlUI → GlobalCustomUIAssets rows; character sheet XmlUI → ObjectCustomUIAssets rows).
 * Reports: each dynamic prefix ("dieFace_" .. kind) with how many job rows carry it (fails when none),
 *   and the Cloud file count against TTS's 10,000-file limit (newest index snapshot).
 *
 *   npm run check:asset-references
 */

const fs = require("fs");
const path = require("path");

const sync = require("../cloud-asset-sync.js");
const { loadCloudConfig } = require("../tts-cloud/lib/cloud_config.js");
const { parseIndex } = require("../tts-cloud/lib/cloud_index.js");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CLOUD_FILE_LIMIT = 10000;
const XML_IMAGE_RE = /\b(?:image|[a-z]+Image)="([^"]*)"/g;
const LUA_STATIC_RE = /"image"\s*,\s*"([^"]+)"\s*\)/g;
const LUA_DYNAMIC_RE = /"image"\s*,\s*"([^"]+)"\s*\.\./g;

/** Names the UI already asks for but that have no art yet. Warn only; remove when the file lands. */
const KNOWN_MISSING = new Map([
  [
    "refPanel_Coteries_colorBlitz",
    "Color Blitz has toggle art but no reference panel — drop refPanel_Coteries_colorBlitz.webp into assets/HUD/CorePanel_Center/Coterie References/",
  ],
]);

function walk(dir, keep) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return d.name.startsWith(".") ? [] : walk(full, keep);
    return keep(full) ? [full] : [];
  });
}

const rel = (full) => path.relative(REPO_ROOT, full).replace(/\\/g, "/");
const isName = (v) => v !== "" && !v.includes("://") && !/[{}$]/.test(v);

function collect(files, re) {
  /** @type {Map<string, string[]>} name → files */
  const out = new Map();
  for (const full of files) {
    for (const m of fs.readFileSync(full, "utf8").matchAll(re)) {
      if (!isName(m[1])) continue;
      if (!out.has(m[1])) out.set(m[1], []);
      if (!out.get(m[1]).includes(rel(full))) out.get(m[1]).push(rel(full));
    }
  }
  return out;
}

function cloudFileCount(cfg) {
  if (!cfg.indexSnapshotDir || !fs.existsSync(cfg.indexSnapshotDir)) return null;
  const snaps = fs.readdirSync(cfg.indexSnapshotDir).filter((n) => n.endsWith(".bson")).sort();
  if (snaps.length === 0) return null;
  const newest = snaps[snaps.length - 1];
  const doc = parseIndex(fs.readFileSync(path.join(cfg.indexSnapshotDir, newest)));
  return { count: Object.keys(doc).length, snapshot: newest };
}

function main() {
  const manifest = sync.readManifest();
  const namesFor = (output) =>
    new Set(Object.values(manifest.jobs).filter((j) => j.output === output).flatMap((j) => j.rows.map((r) => r.name)));
  const globalNames = namesFor("GlobalCustomUIAssets");
  const objectNames = namesFor("ObjectCustomUIAssets");
  const allNames = new Set([...globalNames, ...objectNames]);

  const uiDir = path.join(REPO_ROOT, "ui");
  const sheetDir = path.join(uiDir, "player", "csheets");
  const xmlFiles = walk(uiDir, (f) => f.endsWith(".xml"));
  const sheetXml = xmlFiles.filter((f) => f.startsWith(sheetDir + path.sep));
  const globalXml = xmlFiles.filter((f) => !f.startsWith(sheetDir + path.sep));
  const luaFiles = ["core", "lib", "ui", "objects"].flatMap((d) => walk(path.join(REPO_ROOT, d), (f) => f.endsWith(".ttslua")));

  const failures = [];
  const warnings = [];
  const check = (refs, names, where) => {
    for (const [name, files] of refs) {
      if (names.has(name)) continue;
      const whereAt = `${where}: ${files.slice(0, 3).join(", ")}${files.length > 3 ? ", …" : ""}`;
      if (KNOWN_MISSING.has(name)) warnings.push(`"${name}" (${whereAt}): ${KNOWN_MISSING.get(name)}`);
      else failures.push(`"${name}" (${whereAt}) has no Cloud job row.`);
    }
  };
  check(collect(globalXml, XML_IMAGE_RE), globalNames, "Global XmlUI");
  check(collect(sheetXml, XML_IMAGE_RE), objectNames, "sheet XmlUI");
  check(collect(luaFiles, LUA_STATIC_RE), allNames, "Lua");

  const dynamic = collect(luaFiles, LUA_DYNAMIC_RE);
  for (const [prefix, files] of [...dynamic].sort()) {
    const count = [...allNames].filter((n) => n.startsWith(prefix)).length;
    console.log(`[check:asset-references] dynamic "${prefix}…": ${count} row(s) (${files.join(", ")})`);
    if (count === 0) failures.push(`Dynamic prefix "${prefix}" (${files.join(", ")}) matches no Cloud job row.`);
  }

  const cfg = loadCloudConfig();
  const files = cloudFileCount(cfg);
  if (files) {
    const pct = Math.round((files.count / CLOUD_FILE_LIMIT) * 100);
    console.log(`[check:asset-references] Cloud files: ${files.count} / ${CLOUD_FILE_LIMIT} (${pct}%) per ${files.snapshot}`);
    if (files.count > CLOUD_FILE_LIMIT * 0.9) console.warn(`[check:asset-references] WARN Cloud is above 90% of the file limit.`);
  } else {
    console.warn("[check:asset-references] WARN No Cloud index snapshot found; file count not reported.");
  }

  for (const w of warnings) console.warn(`[check:asset-references] WARN ${w}`);
  if (failures.length > 0) {
    for (const f of failures) console.error(`[check:asset-references] FAIL ${f}`);
    process.exit(1);
  }
  console.log(`[check:asset-references] OK: ${globalNames.size} Global and ${objectNames.size} sheet names cover every static reference${warnings.length ? ` (${warnings.length} known gap(s))` : ""}.`);
}

main();
