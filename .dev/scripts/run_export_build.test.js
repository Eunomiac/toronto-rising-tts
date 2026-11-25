"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { runFullPipeline, runNpm, refreshDashboardExportCache } = require("./run_export_build.js");

function recorder() {
  const calls = [];
  return {
    calls,
    actions: {
      run(script, _env, args = []) { calls.push(["node", script, ...args]); },
      runNpm(script) { calls.push(["npm", script]); },
    },
  };
}

test("FULL builds the Player Map before save bundling and publishes last", () => {
  const { calls, actions } = recorder();
  runFullPipeline({}, actions);

  assert.deepEqual(calls, [
    ["npm", "player-map:data:build"],
    ["npm", "build:tooling-after-exports"],
    ["npm", "player-map:build"],
    ["node", ".tools/tts-save/bundle-into-save.js"],
    ["node", ".tools/tts-save/build-session-start.js", "--full"],
    ["npm", "player-map:publish"],
    ["npm", "complications:web:publish"],
  ]);
});

test("FULL can skip only the final Player Map publication for offline diagnosis", () => {
  const { calls, actions } = recorder();
  runFullPipeline({ TR_SKIP_PLAYER_MAP_PUBLISH: "1" }, actions);

  assert.equal(calls.some((call) => call[1] === "player-map:build"), true);
  assert.equal(calls.some((call) => call[1] === "player-map:publish"), false);
  assert.deepEqual(calls.at(-1), ["npm", "complications:web:publish"]);
});

test("FULL can skip Complications web publication", () => {
  const { calls, actions } = recorder();
  runFullPipeline({ TR_SKIP_COMPLICATIONS_WEB_PUBLISH: "1" }, actions);

  assert.equal(calls.some((call) => call[1] === "player-map:publish"), true);
  assert.equal(calls.some((call) => call[1] === "complications:web:publish"), false);
});

test("runNpm refuses script names that would break the fixed shell command", () => {
  assert.throws(
    () => runNpm("player-map:data:build && echo pwned", process.env),
    /Refusing unsafe npm script name/
  );
});

test("live export builds refresh the Dashboard sheet-exports cache", () => {
  const writes = [];
  const logs = [];
  const snapshot = { version: 1, tables: {} };
  assert.equal(refreshDashboardExportCache(snapshot, {
    liveFetch: true,
    cachePath: "sheet-exports.json",
    write: (file, contents) => writes.push([file, contents]),
    log: (message) => logs.push(message),
  }), true);
  assert.deepEqual(writes, [["sheet-exports.json", JSON.stringify(snapshot)]]);
  assert.match(logs[0], /Refreshed Dashboard export cache/);
});

test("offline TR_EXPORT_SNAPSHOT replay leaves the Dashboard cache alone", () => {
  const writes = [];
  assert.equal(refreshDashboardExportCache({ version: 1 }, {
    liveFetch: false,
    write: (file, contents) => writes.push([file, contents]),
  }), false);
  assert.deepEqual(writes, []);
});
