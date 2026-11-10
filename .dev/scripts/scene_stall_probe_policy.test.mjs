import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const probe = read("core/scene_stall_probe.ttslua");
const debug = read("core/debug.ttslua");
const scatter = read("core/scatter_mode.ttslua");
const layout = read("lib/figurine_seat_layout.ttslua");

for (const action of [
  "baseline",
  "census",
  "scatter_figurine",
  "scatter_hand",
  "scatter_seat",
  "scatter_camera",
  "scatter_all",
  "scatter_hud",
  "dashboard",
  "table",
  "seats",
  "npcs",
  "scene",
  "ui",
  "soundscape",
  "full",
]) {
  assert.match(probe, new RegExp(`"${action}"`), `probe should route ${action}`);
}

assert.match(probe, /U\.await\(function\(\)[\s\S]*HEARTBEAT 0/, "probe should schedule a zero-delay heartbeat");
assert.match(probe, /HEARTBEAT 250/, "probe should schedule a short heartbeat");
assert.doesNotMatch(probe, /\bWait\.(?:time|condition|stop)\b/, "probe must use the timing contract");
assert.match(debug, /function DEBUG\.sceneStallProbe\(/, "DEBUG should expose the probe");
assert.match(scatter, /function ScatterMode\.debugReapplyPcSlice\(/, "Scatter should expose current-state slices");
assert.match(layout, /helpers\.onlyRoleKeys/, "seat layout should support a role-only diagnostic slice");
assert.match(layout, /helpers\.skipFigurine/, "seat layout should isolate satellites from the figurine");

console.log("scene_stall_probe_policy.test.mjs: OK");
