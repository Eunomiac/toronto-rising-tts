"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { countEntries } = require("./log-file.cjs");

const CAPTURE = path.join(__dirname, "capture.cjs").replace(/\\/g, "/");

test("the preload writes only the lines worth reviewing", () => {
  const logFile = path.join(os.tmpdir(), `tr-build-review-${process.pid}.txt`);
  fs.rmSync(logFile, { force: true });
  const script = `
    console.warn("[locations:import] WARN unknown track");
    console.warn("[npc-art] No NPC art discrepancies.");
    console.error("[tts-save:backup-daily] Throttled (1.0h until next). Last backup stamp=1.");
    console.error("[cloud-asset-sync] uploaded 1/2: NPC Art/foo.webp");
    console.error("[cloud-asset-sync] WARN STRAY assets/NPC Art/loose.webp: in a job folder but matches no job pattern");
    console.log("npc-stats:import: 4 named NPCs, all unchanged.");
    console.log("TTS object stubs: repaired 1 file(s) under .tts/objects.");
    process.stderr.write("[pcall-gate] FAILED:\\n  - pcall count rose\\n");
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    env: {
      ...process.env,
      TORONTO_RISING_BUILD_REVIEW: "1",
      TORONTO_RISING_BUILD_REVIEW_LOG: logFile,
      NODE_OPTIONS: `--require ${CAPTURE}`,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(logFile, "utf8");
  assert.equal(countEntries(text), 4);
  assert.match(text, /unknown track/);
  assert.match(text, /STRAY assets/);
  assert.match(text, /repaired 1 file/);
  assert.match(text, /pcall-gate\] FAILED/);
  assert.doesNotMatch(text, /No NPC art discrepancies/);
  assert.doesNotMatch(text, /Throttled/);
  assert.doesNotMatch(text, /uploaded 1\/2/);
  assert.doesNotMatch(text, /all unchanged/);
  fs.rmSync(logFile, { force: true });
});
