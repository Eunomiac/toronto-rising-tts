"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("FULL preflight and final preparation skip unfinished saves without touching either save", () => {
  const root = path.resolve(__dirname, "../..");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-incomplete-full-"));
  const report = path.join(root, ".dev/build-logs/session-start-report.json");
  const priorReport = fs.existsSync(report) ? fs.readFileSync(report) : null;
  try {
    const source = path.join(dir, "TS_Save_1.json"), output = path.join(dir, "TS_Save_9001.json");
    const sourceText = JSON.stringify({ ObjectStates: [], LuaScriptState: JSON.stringify({
      currentPhase: "Intermission", connectionControls: { sessionStartJoin: true, joinColdPoolsActive: true,
        joinColdPoolsBackup: { version: 1, entries: [{ guid: "abcdef" }] } },
    }) });
    const outputText = "Unrelated slot which must not be read or replaced when generation is skipped";
    fs.writeFileSync(source, sourceText); fs.writeFileSync(output, outputText);
    fs.writeFileSync(path.join(dir, "tts-assets.config.json"), JSON.stringify({ savesDir: dir, defaultSaveName: "1", cloudRoot: "Test Cloud", backupDir: dir }));
    const preload = path.join(dir, "fake-fetch.cjs");
    fs.writeFileSync(preload, 'global.fetch = async () => new Response("URL,Known bytes,Manual decision,Manual notes\\nhttps://example.test/bundle,1,Prune,\\n");');
    const env = { ...process.env, TR_SESSION_START_REVIEW_SNAPSHOT: path.join(dir, "review.json") };
    for (const mode of ["--full-preflight", "--full"]) {
      const result = spawnSync(process.execPath, ["--require", preload, path.join(__dirname, "build-session-start.js"), mode], { cwd: dir, env, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stderr, /SKIP session-start/);
      assert.equal(fs.readFileSync(source, "utf8"), sourceText);
      assert.equal(fs.readFileSync(output, "utf8"), outputText);
    }
    assert.equal(JSON.parse(fs.readFileSync(report)).status, "skipped");
    assert.equal(JSON.parse(fs.readFileSync(report)).source, source);
  } finally {
    if (priorReport) fs.writeFileSync(report, priorReport); else fs.rmSync(report, { force: true });
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
