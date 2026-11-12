"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fetchSnapshot, validateSnapshot, root, writeAtomic } = require("./lib/sheet_exports.js");
function run(script, env, args = []) {
  const child = spawnSync(process.execPath, [path.join(root, script), ...args], { cwd: root, env, stdio: "inherit" });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`${script} failed (${child.status})`);
}
function runNpm(script, env) {
  // Windows cannot spawn npm.cmd without a shell (Node EINVAL). Pass a fixed
  // command string with shell:true — no args array (Node DEP0190) — and only
  // accept hardcoded package-script names from our callers.
  if (typeof script !== "string" || !/^[A-Za-z0-9:_-]+$/.test(script)) {
    throw new Error(`Refusing unsafe npm script name: ${JSON.stringify(script)}`);
  }
  const child = spawnSync(`npm run ${script}`, { cwd: root, env, stdio: "inherit", shell: true });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`${script} failed (${child.status})`);
}
function runFullPipeline(env, actions = { run, runNpm }) {
  // Generate from the same temporary Sheet snapshot before any consumer can
  // fetch a newer one independently.
  actions.runNpm("player-map:data:build", env);
  actions.runNpm("build:tooling-after-exports", env);
  // This includes data freshness, type, unit, production-boundary, and real
  // desktop/mobile browser checks, and leaves the verified dist ready to ship.
  actions.runNpm("player-map:check", env);
  // Inject scripts into the main save first so session-start copies those object scripts into 9001.
  actions.run(".tools/tts-save/bundle-into-save.js", env);
  actions.run(".tools/tts-save/build-session-start.js", env, ["--full"]);
  // Publication is deliberately the final external side effect. The escape
  // hatch is for CI/offline diagnosis, not the author's normal FULL workflow.
  if (env.TR_SKIP_PLAYER_MAP_PUBLISH === "1") {
    console.log("[player-map] Publication skipped by TR_SKIP_PLAYER_MAP_PUBLISH=1.");
  } else {
    actions.runNpm("player-map:publish", env);
  }
}
async function main() {
  const full = process.argv.includes("--full");
  const check = process.argv.includes("--check");
  if (full && check) throw new Error("--full and --check cannot be combined");
  // Write-back must finish before we read formula-derived exports. It is a no-op without pending edits.
  if (full) run(".dev/storyteller-dashboard/scripts/npc-stats/push.ts", process.env);
  const snapshot = process.env.TR_EXPORT_SNAPSHOT ? validateSnapshot(JSON.parse(fs.readFileSync(process.env.TR_EXPORT_SNAPSHOT, "utf8"))) : await fetchSnapshot();
  const { validateExportData } = require("./lib/validate_export_data.js");
  const counts = validateExportData(snapshot);
  for (const warning of snapshot.warnings) console.warn(`[exports] ${warning}`);
  if (check) {
    console.log("[exports] All exports validated:", counts);
    return;
  }
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
    console.log(full ? "[exports] All exports validated; asset joins follow cloud sync:" : "[exports] All exports generated successfully:", counts);
    if (full) {
      runFullPipeline(env);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });

module.exports = { runFullPipeline, runNpm };
