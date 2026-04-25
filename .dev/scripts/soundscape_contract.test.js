"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const luaparse = require("luaparse");
const path = require("path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..", "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("soundscape runtime module exposes the planned API", () => {
  const source = readRepoFile("core/soundscape.ttslua");

  [
    "function Soundscape.onLoad()",
    "function Soundscape.applyContext(context)",
    "function Soundscape.setMusicMood(moodKey)",
    "function Soundscape.setWeatherCondition(weatherKey)",
    "function Soundscape.setLocationAudio(locationKey)",
    "function Soundscape.setIndoors(isIndoors)",
    "function Soundscape.stopAll()",
    "function Soundscape.inspectEmitters()",
    "function Soundscape.testLayeredPlayback()",
  ].forEach((signature) => {
    assert.ok(source.includes(signature), `missing ${signature}`);
  });
});

test("soundscape catalog defines channels, silent loop, moods, and context defaults", () => {
  const source = readRepoFile("lib/soundscape_catalog.ttslua");

  [
    "Catalog.CHANNELS",
    "Catalog.SILENT_EFFECT",
    "general",
    "intrigue",
    "combat",
    "weatherDucking",
    "indoorMultiplier",
    "industrialExterior",
  ].forEach((needle) => {
    assert.ok(source.includes(needle), `missing ${needle}`);
  });
});

test("soundscape Unity guide documents setup and live verification steps", () => {
  const source = readRepoFile(".dev/SOUNDSCAPE_UNITY_SETUP.md");

  [
    "Unity 6000.0.62f1",
    "spatialBlend = 0",
    "silent",
    "testSoundscape",
    "inspectSoundscapeAudio",
  ].forEach((needle) => {
    assert.ok(source.includes(needle), `missing ${needle}`);
  });
});

test("soundscape Lua files parse as Lua 5.1", () => {
  [
    "lib/soundscape_catalog.ttslua",
    "core/soundscape.ttslua",
    "core/state.ttslua",
    "core/scenes.ttslua",
    "core/global_script.ttslua",
    "core/debug.ttslua",
    "lib/ui_helpers.ttslua",
  ].forEach((relativePath) => {
    assert.doesNotThrow(() => {
      luaparse.parse(readRepoFile(relativePath), { luaVersion: "5.1" });
    }, `${relativePath} should parse`);
  });
});

test("soundscape runtime guards crossfade timers and reload restoration", () => {
  const source = readRepoFile("core/soundscape.ttslua");

  assert.ok(source.includes("local thisGeneration = musicGeneration"), "music generation should be captured per fade");
  assert.ok(source.includes("thisGeneration == musicGeneration"), "delayed silence should check generation before muting");
  assert.ok(source.includes("latest.activeMusicChannel ~= oldChannel"), "delayed silence should not mute the active channel");
  assert.ok(source.includes("playChannelEffect(newChannel, track.effect, targetVolume, fadeSeconds, 0)"), "fade-in should start from explicit zero volume");
  assert.ok(source.includes("state.musicEnabled == true"), "onLoad restore should only restart music when it was enabled");
});
