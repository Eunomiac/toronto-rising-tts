"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { beginReview, publishReview } = require("./log-file.cjs");

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
    process.stderr.write("\\u001b[1G");
    process.stderr.write("\\u001b[0K");
    process.stderr.write("⠙");
  `;
  const previousLog = process.env.TORONTO_RISING_BUILD_REVIEW_LOG;
  process.env.TORONTO_RISING_BUILD_REVIEW_LOG = logFile;
  beginReview();
  const result = spawnSync(process.execPath, ["-e", script], {
    env: {
      ...process.env,
      TORONTO_RISING_BUILD_REVIEW: "1",
      TORONTO_RISING_BUILD_REVIEW_LOG: logFile,
      NODE_OPTIONS: `--require ${CAPTURE}`,
    },
    encoding: "utf8",
  });
  const count = publishReview();
  if (previousLog == null) delete process.env.TORONTO_RISING_BUILD_REVIEW_LOG;
  else process.env.TORONTO_RISING_BUILD_REVIEW_LOG = previousLog;
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(logFile, "utf8");
  assert.equal(count, 4);
  assert.match(text, /unknown track/);
  assert.match(text, /STRAY assets/);
  assert.match(text, /repaired 1 file/);
  assert.match(text, /pcall-gate\] FAILED/);
  assert.doesNotMatch(text, /No NPC art discrepancies/);
  assert.doesNotMatch(text, /Throttled/);
  assert.doesNotMatch(text, /uploaded 1\/2/);
  assert.doesNotMatch(text, /all unchanged/);
  assert.doesNotMatch(text, /\u001b/);
  assert.doesNotMatch(text, /⠙/);
  assert.doesNotMatch(text, /^---$/m);
  fs.rmSync(logFile, { force: true });
});

test("each publish replaces the review file", () => {
  const logFile = path.join(os.tmpdir(), `tr-build-review-replace-${process.pid}.txt`);
  const previousLog = process.env.TORONTO_RISING_BUILD_REVIEW_LOG;
  process.env.TORONTO_RISING_BUILD_REVIEW_LOG = logFile;
  const { appendEntry } = require("./log-file.cjs");
  beginReview();
  appendEntry("first note");
  publishReview();
  beginReview();
  appendEntry("second note");
  publishReview();
  const text = fs.readFileSync(logFile, "utf8");
  assert.match(text, /second note/);
  assert.doesNotMatch(text, /first note/);
  if (previousLog == null) delete process.env.TORONTO_RISING_BUILD_REVIEW_LOG;
  else process.env.TORONTO_RISING_BUILD_REVIEW_LOG = previousLog;
  fs.rmSync(logFile, { force: true });
  fs.rmSync(`${logFile}.partial`, { force: true });
});
