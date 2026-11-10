import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("core/scatter_mode.ttslua", "utf8");
const npcs = await readFile("core/npcs.ttslua", "utf8");
const start = source.indexOf("function ScatterMode.movePcToGroup");
const end = source.indexOf("function ScatterMode.moveNpcToGroup");
assert.ok(start > 0 && end > start, "player and NPC group moves must both exist");
const playerMove = source.slice(start, end);
assert.ok(playerMove.includes("applyScatterMovedPc(pcKey)"), "a player group change moves only that player");
assert.equal(playerMove.includes("applyScatterPcPoses"), false, "a player group change must not re-pose every player");
assert.equal(playerMove.includes("applyWorldLayout"), false, "a player group change must not run the full layout");
assert.equal(playerMove.includes("applyScatterNpcPoses"), false, "a player group change must not pose NPC figurines");
assert.ok(source.includes("function ScatterMode.applyWorldLayout()"), "entering Scatter and NPC moves still have a full layout");
assert.ok(source.includes("applyScatterNpcPoses()"), "the full layout still poses NPCs");

const enterStart = source.indexOf("function ScatterMode.enter");
const enterEnd = source.indexOf("function ScatterMode.leave");
const enter = source.slice(enterStart, enterEnd);
assert.equal(enter.includes("ScatterMode.applyWorldLayout()"), false, "Scatter enter must not apply the world before Sync.npcs");
assert.ok(enter.includes("Sync.npcs({ reason = \"scatter_enter\" })"), "Scatter enter delegates to the NPC reconciler");
assert.ok(
  npcs.includes("deferScatterWorldLayout = reconcileStepEnabled(opts or {}, 5)"),
  "Step Three should defer Scatter layout when Step Five will own it",
);
assert.ok(
  npcs.includes("deferred_to_scatter_step_five"),
  "the deferred Scatter layout should be visible to Sync Trace",
);

console.log("scatter pc move policy tests passed");
