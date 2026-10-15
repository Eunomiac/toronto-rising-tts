#!/usr/bin/env node
"use strict";

/**
 * check:asset-ownership — every image link the mod or dashboard uses comes from a Cloud job.
 *
 * Fails on:
 *   - hand-typed Steam Cloud / GitHub raw art links outside generated files (EXTERNAL lists the allowed exceptions)
 *   - tracked repo images named like a job-owned row (a fallback copy that could shadow the Cloud file)
 *   - save-writing jobs without a purge family (validateConfig)
 * Warns on:
 *   - jobs skipped for a pattern with no distinguishing literal
 *   - local strays: files in a job folder that no job matches
 *
 *   npm run check:asset-ownership
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const sync = require("../cloud-asset-sync.js");
const { scanAssets } = require("../tts-cloud/lib/assets_tree.js");
const { loadCloudConfig } = require("../tts-cloud/lib/cloud_config.js");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const LINK_RE = /steamusercontent|raw\.githubusercontent\.com\/Eunomiac\//;

/** Written by cloud-asset-sync or importers that read its manifest. */
const GENERATED = [
  /^lib\/cloud_[A-Za-z0-9_]+\.ttslua$/,
  /^lib\/json\/cloud-assets\.json$/,
  /^lib\/skyboxes_catalog\.ttslua$/,
  /^lib\/npc_art_urls\.ttslua$/,
  /^\.dev\/storyteller-dashboard\/data\/scene-catalogs\.json$/,
];

/** Links that are not ours to host, with the reason. */
const EXTERNAL = new Map([
  ["lib/npcs_light_spawn_defaults.ttslua", "NPC light object AssetBundle from a Workshop creator's Cloud"],
  [".dev/NPC Object Spawning & Spotlighting/NPC Light Object Data.jsonc", "reference dump of the same Workshop light object"],
]);

/** Not shipped art: docs, tooling that parses links, tests, and audit reports. */
const IGNORED = [/\.md$/, /\.mdc$/, /^\.cursor\//, /^\.tools\//, /^\.dev\/!! User Guides\//, /\.test\.[cm]?[jt]s$/, /^\.dev\/Performance Audits\//];

function gitFiles(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter(Boolean);
}

function handTypedLinks() {
  let hits;
  try {
    hits = gitFiles(["grep", "--untracked", "-I", "-l", "-E", LINK_RE.source, "--", "."]);
  } catch (err) {
    if (err.status === 1) return [];
    throw err;
  }
  return hits.filter((rel) => !IGNORED.some((re) => re.test(rel)) && !GENERATED.some((re) => re.test(rel)) && !EXTERNAL.has(rel));
}

function shadowingRepoImages(ownedNames) {
  return gitFiles(["ls-files", "--cached", "--others", "--exclude-standard"])
    .filter((rel) => /\.(webp|png|jpe?g)$/i.test(rel))
    .filter((rel) => fs.existsSync(path.join(REPO_ROOT, rel)))
    .filter((rel) => !rel.replace(/\\/g, "/").startsWith("assets/"))
    .filter((rel) => ownedNames.has(path.posix.basename(rel).replace(/\.[^.]+$/, "")));
}

function main() {
  const configPath = path.join(REPO_ROOT, ".tools", "cloud-asset-sync.jsonc");
  const jobs = sync.validateConfig(JSON.parse(sync.stripJsonc(fs.readFileSync(configPath, "utf8"))));
  const manifest = sync.readManifest();
  const ownedNames = new Set(Object.values(manifest.jobs).flatMap((j) => j.rows.map((r) => r.name)));

  const failures = [];
  for (const rel of handTypedLinks()) failures.push(`Hand-typed art link in ${rel}: add the file under assets/ with a job, or list it in EXTERNAL with a reason.`);
  for (const rel of shadowingRepoImages(ownedNames)) failures.push(`${rel} is named like a Cloud job row; delete the repo copy (assets/ is the only source).`);

  const warnings = [];
  for (const job of jobs.filter((j) => j.literal === "")) warnings.push(`Job "${job.id}" is skipped by the build: its pattern ${job.searchPattern} needs a prefix or suffix literal.`);
  const local = scanAssets(loadCloudConfig().assetsDir);
  for (const rel of sync.findLocalStrays(jobs, local)) warnings.push(`STRAY assets/${rel}: in a job folder but matches no job pattern.`);

  for (const w of warnings) console.warn(`[check:asset-ownership] WARN ${w}`);
  if (failures.length > 0) {
    for (const f of failures) console.error(`[check:asset-ownership] FAIL ${f}`);
    process.exit(1);
  }
  console.log(`[check:asset-ownership] OK: ${jobs.length} jobs, ${ownedNames.size} job-owned names, ${warnings.length} warning(s).`);
}

main();
