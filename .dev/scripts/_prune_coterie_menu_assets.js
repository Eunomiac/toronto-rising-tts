"use strict";

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const MANIFEST = path.join(REPO, "lib", "json", "cloud-assets.json");
const CONFIG = JSON.parse(fs.readFileSync(path.join(REPO, "tts-assets.config.json"), "utf8"));
const SAVES = ["TS_Save_230.json", "TS_Save_9001.json"];
const DROP_JOBS = new Set(["hudCoterieToggles", "hudCoterieReferences"]);

function walk(dir, ext, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".tts") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, ext, out);
    else if (name.endsWith(ext)) out.push(full);
  }
}

function assetName(row) {
  return row && (row.Name || row.name) || "";
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const dropNames = new Set();
  for (const id of DROP_JOBS) {
    for (const row of (manifest.jobs[id] && manifest.jobs[id].rows) || []) {
      if (row.name) dropNames.add(row.name);
    }
  }
  for (const row of (manifest.jobs.hudPanelToggles && manifest.jobs.hudPanelToggles.rows) || []) {
    if (typeof row.name === "string" && row.name.startsWith("toggle_Coteries_")) dropNames.add(row.name);
  }
  console.log(`coterie menu names: ${dropNames.size}`);

  const sources = [];
  for (const dir of ["ui", "core", "lib", "objects", "dashboard"]) {
    walk(path.join(REPO, dir), dir === "ui" ? ".xml" : ".ttslua", sources);
  }
  const blob = sources.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const referenced = [...dropNames].filter((name) => blob.includes(`"${name}"`)).sort();
  if (referenced.length) console.log("KEEP referenced:\n" + referenced.join("\n"));
  const referencedSet = new Set(referenced);
  const removing = [...dropNames].filter((name) => !referencedSet.has(name)).sort();
  console.log(removing.join("\n"));

  for (const fileName of SAVES) {
    const savePath = path.join(CONFIG.savesDir, fileName);
    if (!fs.existsSync(savePath)) throw new Error(`Save not found: ${savePath}`);
    let backup = path.join(CONFIG.backupDir, fileName.replace(/\.json$/, ".before-coteries-menu-prune.json"));
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    if (fs.existsSync(backup)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      backup = backup.replace(/\.json$/, `-${stamp}.json`);
    }
    fs.copyFileSync(savePath, backup);
    const save = JSON.parse(fs.readFileSync(savePath, "utf8"));
    if (!Array.isArray(save.CustomUIAssets)) throw new Error(`${fileName} has no root CustomUIAssets`);
    const before = save.CustomUIAssets.length;
    save.CustomUIAssets = save.CustomUIAssets.filter((row) => {
      const name = assetName(row);
      return !(dropNames.has(name) && !referencedSet.has(name));
    });
    fs.writeFileSync(savePath, JSON.stringify(save, null, 2) + "\n");
    console.log(`${fileName}: removed ${before - save.CustomUIAssets.length}; ${save.CustomUIAssets.length} remain; backup ${backup}`);
  }

  for (const id of DROP_JOBS) delete manifest.jobs[id];
  const toggles = manifest.jobs.hudPanelToggles;
  if (toggles && Array.isArray(toggles.rows)) {
    toggles.rows = toggles.rows.filter((row) => !dropNames.has(row.name));
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log("manifest updated");
}

main();
