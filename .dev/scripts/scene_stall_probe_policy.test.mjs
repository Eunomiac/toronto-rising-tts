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
const dashboardPush = read("dashboard/push.ttslua");

for (const action of [
  "baseline",
  "census",
  "scatter_figurine",
  "scatter_hand",
  "scatter_seat",
  "scatter_camera",
  "scatter_all",
  "scatter_hud",
  "dashboard_profile_seats",
  "dashboard_build_seats",
  "dashboard_encode_seats",
  "dashboard_emit_seats",
  "dashboard_build_scene",
  "dashboard_encode_scene",
  "dashboard_emit_scene",
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
assert.match(
  dashboardPush,
  /function DashPush\.debugMeasureWorldSlice\(/,
  "dashboard probes should separate world-slice build, encode, and tagged-console emit",
);
assert.match(
  dashboardPush,
  /function DashPush\.debugProfileSeatsBuild\(/,
  "dashboard probes should expose sectional seats-build timings",
);
assert.match(dashboardPush, /\[DashPushSlow\]/, "slow production dashboard flushes should name their expensive stage");
const worldSnapshot = read("dashboard/world_snapshot.ttslua");
assert.match(worldSnapshot, /snapshotsForKeys/, "seats build should batch NPC condition snapshots");
assert.match(worldSnapshot, /function W\.profileSeatsBuild\(/, "seats profile helper should live on world_snapshot");

console.log("scene_stall_probe_policy.test.mjs: OK");
