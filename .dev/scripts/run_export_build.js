"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fetchSnapshot, validateSnapshot, root, writeAtomic } = require("./lib/sheet_exports.js");
function run(script, env) {
  const child = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, env, stdio: "inherit" });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`${script} failed (${child.status})`);
}
async function main() {
  const full = process.argv.includes("--full");
  // Write-back must finish before we read formula-derived exports. It is a no-op without pending edits.
  if (full) run(".dev/storyteller-dashboard/scripts/npc-stats/push.ts", process.env);
  const snapshot = process.env.TR_EXPORT_SNAPSHOT ? validateSnapshot(JSON.parse(fs.readFileSync(process.env.TR_EXPORT_SNAPSHOT, "utf8"))) : await fetchSnapshot();
  const { validateExportData } = require("./lib/validate_export_data.js");
  const counts = validateExportData(snapshot);
  for (const warning of snapshot.warnings) console.warn(`[exports] ${warning}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toronto-rising-exports-"));
  const file = path.join(dir, "snapshot.json");
  writeAtomic(file, JSON.stringify(snapshot));
  const env = { ...process.env, TR_EXPORT_SNAPSHOT: file };
  try {
    const scripts = ["import_character_exports.js", "import_weather_from_sheet.js", "import_complications_from_sheet.js"];
    // FULL joins asset URLs after its upload job; a newly authored skybox may not exist in the manifest yet.
    if (!full) scripts.push("import_skyboxes_from_sheet.js", "import_locations_from_sheet.js");
    for (const script of scripts) run(`.dev/scripts/${script}`, env);
    run(".dev/storyteller-dashboard/scripts/npc-stats/import.ts", env);
    console.log(full ? "[exports] All nine exports validated; asset joins follow cloud sync:" : "[exports] All nine exports generated successfully:", counts);
    if (full) {
      const child = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build:tooling-after-exports"], { cwd: root, env, stdio: "inherit", shell: process.platform === "win32" });
      if (child.error) throw child.error;
      if (child.status !== 0) throw new Error(`Remaining FULL tooling failed (${child.status})`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
