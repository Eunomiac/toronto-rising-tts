import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const luaparse = require("luaparse");
const root = path.resolve(import.meta.dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const files = {
  global: read("core/global_script.ttslua"),
  debug: read("core/debug.ttslua"),
  state: read("core/state.ttslua"),
  companion: read("lib/companion_toggle.ttslua"),
  bag: read("objects/dice_bag.ttslua"),
  tarotObject: read("ui/ui_tarot_button.ttslua"),
  companionObject: read("ui/ui_companion_toggle.ttslua"),
  hud: read("ui/storyteller/hud_storyteller.xml"),
  embeddedHud: read("lib/ui_global_xml_docs.ttslua"),
};

test("Storyteller debug panel exposes the master logger and bounded interaction reboot", () => {
  assert.match(files.hud, /id="debug_verboseLogging"[^>]+onClick="HUD_toggleVerboseLogging"/);
  assert.match(files.hud, /onClick="HUD_rebootInteractions">Reboot Interactions</);
  assert.match(files.embeddedHud, /id="debug_verboseLogging"[^>]+onClick="HUD_toggleVerboseLogging"/);
  assert.match(files.embeddedHud, /onClick="HUD_rebootInteractions">Reboot Interactions</);
  assert.match(files.state, /verboseLoggingEnabled = false/);
  assert.match(files.debug, /function DEBUG\.toggleVerboseLogging\(/);
  assert.match(files.debug, /require\("lib\.sync_trace"\)\.setEnabled\(on\)/);
  assert.match(files.global, /function HUD_rebootInteractions\(/);
  assert.match(files.global, /for _, color in ipairs\(C\.PlayerColors\) do/);
  assert.match(files.global, /G\.GetAllPlayerDiceBagGUIDs\(color\)/);
  assert.doesNotMatch(
    files.global.match(/function HUD_rebootInteractions\([\s\S]*?\nend/)?.[0] ?? "",
    /getAllObjects|getObjectsWithTag|Physics\.cast/,
  );
});

test("all three interaction object scripts emit diagnostics and expose a rebuild entry", () => {
  for (const source of [files.bag, files.tarotObject, files.companionObject]) {
    assert.match(source, /GlobalInteractionVerboseLog/);
    assert.match(source, /function rebootInteractions\(/);
    assert.doesNotMatch(source, /require\("core\./);
  }
  assert.match(files.bag, /spawn-callback-stale/);
  assert.match(files.bag, /resetSpawnQueue\("destroy-dice"\)/);
  assert.match(files.companion, /math\.abs\(normalizeDeg\(rot\.z\)\)/);
  assert.match(files.companion, /z = 0/);
});

test("changed Lua sources parse as Lua 5.1", () => {
  for (const relativePath of [
    "core/debug.ttslua",
    "core/global_script.ttslua",
    "core/state.ttslua",
    "lib/companion_toggle.ttslua",
    "objects/dice_bag.ttslua",
    "ui/ui_companion_toggle.ttslua",
    "ui/ui_tarot_button.ttslua",
  ]) {
    assert.doesNotThrow(
      () => luaparse.parse(read(relativePath), { luaVersion: "5.1" }),
      relativePath,
    );
  }
});
