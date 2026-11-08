import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [npcs, dashboard, commands, actions, glance] = await Promise.all([
  readFile("core/npcs.ttslua", "utf8"),
  readFile("dashboard/scenes.ttslua", "utf8"),
  readFile(".dev/storyteller-dashboard/src/client/scenesPanel/commands.ts", "utf8"),
  readFile(".dev/storyteller-dashboard/src/client/scenesPanel/useLibraryActions.ts", "utf8"),
  readFile(".dev/storyteller-dashboard/src/client/scenesPanel/glance.tsx", "utf8"),
]);

assert.ok(npcs.includes("function NPCS.preloadSceneNpcs(sessionScene, sceneTitle, preloadNpcKeys)"), "NPC module must expose scene preload");
assert.ok(npcs.includes("function NPCS.inspectPreloadPool()"), "NPC module must expose an explicit pool diagnostic");
assert.ok(npcs.includes("local batchSize = 2"), "preload spawning must stay bounded to two pairs per batch");
assert.ok(npcs.includes("releaseOrDespawnNpcInstance(name)"), "untargeted reconciles must return reserved pairs to the pool");
assert.ok(npcs.includes("Pool.disable(\"preload sequence \""), "preload failure must disable the pool");
assert.ok(dashboard.includes('if op == "preloadScene" then'), "TTS dashboard bridge must accept preloadScene");
assert.ok(commands.includes('readonly op: "preloadScene"'), "dashboard command union must include preloadScene");
assert.ok(actions.includes('op: "preloadScene"'), "scene library action must send preloadScene");
assert.ok(glance.includes("actions.preload(entry.key)"), "each scene library row must expose Preload");

console.log("npc preload integration policy tests passed");
