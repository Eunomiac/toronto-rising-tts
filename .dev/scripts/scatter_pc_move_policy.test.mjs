import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("core/scatter_mode.ttslua", "utf8");
const start = source.indexOf("function ScatterMode.movePcToGroup");
const end = source.indexOf("function ScatterMode.moveNpcToGroup");
assert.ok(start > 0 && end > start, "player and NPC group moves must both exist");
const playerMove = source.slice(start, end);
assert.ok(playerMove.includes("applyScatterPcPoses()"), "a player group change poses player seat objects");
assert.equal(playerMove.includes("applyWorldLayout"), false, "a player group change must not run the full layout");
assert.equal(playerMove.includes("applyScatterNpcPoses"), false, "a player group change must not pose NPC figurines");
assert.ok(source.includes("function ScatterMode.applyWorldLayout()"), "entering Scatter and NPC moves still have a full layout");
assert.ok(source.includes("applyScatterNpcPoses()"), "the full layout still poses NPCs");

console.log("scatter pc move policy tests passed");
