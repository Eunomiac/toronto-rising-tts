#!/usr/bin/env node
/**
 * Download character-sheet custom UI images (Steam CDN) from the TTS object dumps into
 * dashboard assets as webp. Sources: `.tts/objects/*.data.json` CustomUIAssets and
 * `lib/json/PC_Relationship_Images.json` (page 4 portraits).
 *
 *   node scripts/fetch-sheet-assets.mjs           # only missing files
 *   node scripts/fetch-sheet-assets.mjs --force   # re-download everything
 *
 * Requires ImageMagick (`magick`) on PATH for the webp conversion.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(dashboardRoot, "..", "..");
const objectsDir = path.join(repoRoot, ".tts", "objects");
const portraitJson = path.join(repoRoot, "lib", "json", "PC_Relationship_Images.json");
const assetsDir = path.join(dashboardRoot, "assets");
const force = process.argv.includes("--force");

const DOT_NAMES = new Set(["dot_project", "dot_grey_red_x", "dot_blank"]);
const SHEET_PATTERN = /^(discName_|divider_|project_die_\d+$|project_win$|project_crit$|page2_dotline$|navigate_)/;

/** @returns {Map<string, string>} asset name -> URL (first object wins) */
const collectObjectAssets = () => {
  const out = new Map();
  for (const file of readdirSync(objectsDir)) {
    if (!/ - p\.[2-6]\.[0-9a-f]+\.data\.json$/i.test(file)) {
      continue;
    }
    const data = JSON.parse(readFileSync(path.join(objectsDir, file), "utf8"));
    for (const row of data.CustomUIAssets ?? []) {
      if (typeof row?.Name === "string" && typeof row?.URL === "string" && !out.has(row.Name)) {
        out.set(row.Name, row.URL);
      }
    }
  }
  return out;
};

/** @returns {Map<string, string>} portrait key -> URL */
const collectPortraits = () => {
  const out = new Map();
  const rows = JSON.parse(readFileSync(portraitJson, "utf8"));
  for (const row of Array.isArray(rows) ? rows : []) {
    if (typeof row?.imgKey === "string" && typeof row?.imgURL === "string" && row.imgKey.endsWith("Portrait") && !out.has(row.imgKey)) {
      out.set(row.imgKey, row.imgURL);
    }
  }
  return out;
};

const download = async (url, target) => {
  if (!force && existsSync(target)) {
    return "skip";
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  const raw = path.join(tmpdir(), `tr-sheet-${process.pid}-${path.basename(target)}.bin`);
  writeFileSync(raw, Buffer.from(await response.arrayBuffer()));
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    execFileSync("magick", [raw, "-quality", "90", target], { stdio: "inherit" });
  } finally {
    rmSync(raw, { force: true });
  }
  return "ok";
};

const jobs = [];
for (const [name, url] of collectObjectAssets()) {
  if (DOT_NAMES.has(name)) {
    jobs.push({ name, url, target: path.join(assetsDir, "dots", `${name}.webp`) });
  } else if (SHEET_PATTERN.test(name)) {
    jobs.push({ name, url, target: path.join(assetsDir, "sheet", `${name}.webp`) });
  }
}
for (const [name, url] of collectPortraits()) {
  jobs.push({ name, url, target: path.join(assetsDir, "portraits", `${name}.webp`) });
}

let fetched = 0;
let skipped = 0;
const failures = [];
for (const job of jobs) {
  try {
    const result = await download(job.url, job.target);
    if (result === "ok") {
      fetched += 1;
      console.log(`fetched ${path.relative(assetsDir, job.target)}`);
    } else {
      skipped += 1;
    }
  } catch (error) {
    failures.push(`${job.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`Sheet assets: ${fetched} fetched, ${skipped} already present, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
