"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { runFullPipeline } = require("./run_export_build.js");

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

test("FULL validates the Player Map before save bundling and publishes last", () => {
  const { calls, actions } = recorder();
  runFullPipeline({}, actions);

  assert.deepEqual(calls, [
    ["npm", "player-map:data:build"],
    ["npm", "build:tooling-after-exports"],
    ["npm", "player-map:check"],
    ["node", ".tools/tts-save/bundle-into-save.js"],
    ["node", ".tools/tts-save/build-session-start.js", "--full"],
    ["npm", "player-map:publish"],
  ]);
});

test("FULL can skip only the final Player Map publication for offline diagnosis", () => {
  const { calls, actions } = recorder();
  runFullPipeline({ TR_SKIP_PLAYER_MAP_PUBLISH: "1" }, actions);

  assert.equal(calls.some((call) => call[1] === "player-map:check"), true);
  assert.equal(calls.some((call) => call[1] === "player-map:publish"), false);
  assert.deepEqual(calls.at(-1), ["node", ".tools/tts-save/build-session-start.js", "--full"]);
});
