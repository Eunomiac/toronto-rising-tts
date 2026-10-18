"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitize, classifyWarn, classifyError, classifyLog } = require("./classify.cjs");

test("warnings are kept, and a clean NPC art report is not", () => {
  assert.equal(classifyWarn('[locations:import] WARN unknown skybox "x"'), "warn");
  assert.equal(classifyWarn('Site "haven" references unknown district "old"; listing under General.'), "warn");
  assert.equal(classifyWarn("[npc-art] No NPC art discrepancies."), null);
  assert.equal(
    classifyWarn("(node:1) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.\n(Use `node --trace-deprecation ...` to show where the warning was created)"),
    null,
  );
  assert.equal(classifyError("npm warn exec The following package was not found and will be installed: node@1.0.0"), null);
  assert.equal(classifyWarn("[npc-art] NPC art discrepancies:\n  1 figurine(s) are in no catalog"), "warn");
  assert.equal(classifyWarn("   "), null);
  assert.equal(classifyError("\u001b[1G"), null);
  assert.equal(classifyError("\u001b[0K"), null);
  assert.equal(classifyError("⠙"), null);
  assert.equal(sanitize("\u001b[1G\n⠙\n\u001b[0K\n[locations:import] WARN kept"), "[locations:import] WARN kept");
});

test("routine save and cloud progress is dropped; real changes are kept", () => {
  assert.equal(
    classifyError("[tts-save:backup-daily] Throttled (18.0h until next). Last backup stamp=1."),
    null,
  );
  assert.equal(classifyError("[tts-save:backup-daily] Copied C:/save.json → C:/backup.json"), null);
  assert.equal(
    classifyError("[tts-save:backup-daily] No tts-assets.config.json found (run npm run tts-assets:configure) — continuing build."),
    "error",
  );
  assert.equal(classifyError("[tts-save:silence-emitters] All 8 emitters already on silent."), null);
  assert.equal(classifyError("[tts-save:silence-emitters] No tts-assets.config.json found — skipping."), "error");
  assert.equal(classifyError("[tts-save:silence-emitters] Set SOUNDSCAPE_RAIN (abc) 2 → 0"), "error");

  assert.equal(
    classifyError("[cloud-asset-sync] Push: 10 in sync, 0 to upload, 0 to move, 0 to delete; 0 Cloud-only file(s) under the root (npm run cloud:strays)."),
    null,
  );
  assert.equal(
    classifyError("[cloud-asset-sync] Push: 10 in sync, 2 to upload, 0 to move, 0 to delete; 0 Cloud-only file(s) under the root (npm run cloud:strays)."),
    "error",
  );
  assert.equal(classifyError("[cloud-asset-sync] uploaded 1/2: NPC Art/foo.webp"), null);
  assert.equal(classifyError("[cloud-asset-sync] Job \"tokens\" (LuaModule, assets/NPC Art): 4 file(s)"), null);
  assert.equal(classifyError("[cloud-asset-sync] PASS"), null);
  assert.equal(
    classifyError("[cloud-asset-sync] WARN Steam is not available (nope); push skipped, links come from the ledger."),
    "error",
  );
  assert.equal(
    classifyError("[cloud-asset-sync] SKIP push: Tabletop Simulator is open. 2 file(s) waiting to upload, 0 to move. Close TTS and run npm run cloud:push."),
    "error",
  );
  assert.equal(
    classifyError("[cloud-asset-sync] Wrote save D:/save.json — reload it in Tabletop Simulator."),
    "error",
  );
  assert.equal(
    classifyError("[bundle-size-gate] FAILED (ceilings / heavy modules):\n  - dice bag: too big\n"),
    "error",
  );
});

test("only the notable console.log lines are kept", () => {
  assert.equal(classifyLog("npc-stats:import: 40 named NPCs, all unchanged."), null);
  assert.equal(classifyLog("npc-stats:import: skipped 12 row(s) with no stats: a, b"), null);
  assert.equal(classifyLog("npc-stats:push: no dashboard edits waiting for the sheet."), null);
  assert.equal(classifyLog("npc-stats:import: 40 named NPCs (1 new, 0 changed). Reload the dashboard page."), "note");
  assert.equal(classifyLog("npc-stats:push: wrote 1 NPC(s) to the sheet."), "note");
  assert.equal(classifyLog("  morgan · Clan: Brujah  →  Nosferatu"), "note");
  assert.equal(
    classifyLog("[npc-art] 2 drawn token(s) used the automatic head crop (set a crop in the dashboard to override)."),
    "note",
  );
  assert.equal(classifyLog("TTS object stubs: repaired 3 file(s) under .tts/objects."), "note");
  assert.equal(classifyLog("[build-review] custom note"), "note");
  assert.equal(classifyLog("Wrote lib/pcs_data.ttslua (12.0 KB)"), null);
});
