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
    "function Soundscape.setLocationMusic(playlistKey)",
    "function Soundscape.playFeaturedMusic(featureKey)",
    "function Soundscape.stopFeaturedMusic()",
    "function Soundscape.resumeBackgroundMusic()",
    "function Soundscape.setWeatherCondition(weatherKey)",
    "function Soundscape.setRainLayer(rainKey)",
    "function Soundscape.setWindLayer(windKey)",
    "function Soundscape.setThunderEnabled(isEnabled)",
    "function Soundscape.triggerThunder(hitKey)",
    "function Soundscape.setLocationAudio(locationKey)",
    "function Soundscape.setIndoors(isIndoors)",
    "function Soundscape.stopAll()",
    "function Soundscape.inspectEmitters()",
    "function Soundscape.testLayeredPlayback()",
    "function Soundscape.playDebugTrack(categoryKey, trackKey)",
    "function Soundscape.setDebugTrackVolume(categoryKey, trackKey, volume)",
    "function Soundscape.getDebugPlayingTracks()",
  ].forEach((signature) => {
    assert.ok(source.includes(signature), `missing ${signature}`);
  });
});

test("soundscape catalog defines generated playlists, channels, and context defaults", () => {
  const source = readRepoFile("lib/soundscape_catalog.ttslua");

  [
    "Catalog.CHANNELS",
    "Catalog.SILENT_EFFECT",
    "Catalog.TRACKS",
    "Catalog.PLAYLISTS",
    "Catalog.PLAYMODES",
    "function Catalog.getBackgroundPlaylist(playlistKey)",
    "function Catalog.getLocationTrack(trackKey)",
    "function Catalog.getFeaturedTrack(trackKey)",
    "function Catalog.getWeatherTrack(layerKey, trackKey)",
    "function Catalog.getDebugCategories()",
    "Catalog.WEATHER_CONDITIONS",
    "SOUNDSCAPE_MUSIC_A",
    "SOUNDSCAPE_MUSIC_B",
    "SOUNDSCAPE_FEATURED_A",
    "SOUNDSCAPE_FEATURED_B",
    "SOUNDSCAPE_LOCATION_A",
    "SOUNDSCAPE_LOCATION_B",
    "SOUNDSCAPE_WEATHER_RAIN",
    "SOUNDSCAPE_WEATHER_WIND",
    "SOUNDSCAPE_WEATHER_THUNDER",
    "main",
    "intrigue",
    "combat",
    "weatherDucking",
    "indoorMultiplier",
    "airport",
    "gioCatacombs",
    "TR_Intro",
    "TR_Loop",
    "thunder1",
  ].forEach((needle) => {
    assert.ok(source.includes(needle), `missing ${needle}`);
  });

  [
    "Catalog.MUSIC_MOODS",
    "Catalog.LOCATION_MUSIC",
    "Catalog.FEATURED_MUSIC",
    "Catalog.LOCATIONS",
    "Catalog.WEATHER_RAIN",
    "Catalog.WEATHER_WIND",
    "Catalog.WEATHER_THUNDER",
    "Catalog.WEATHER_PRESETS",
    "function Catalog.getMusicMood",
    "function Catalog.getLocationMusic",
    "function Catalog.getFeaturedMusic",
    "function Catalog.getLocation(",
    "function Catalog.getRain",
    "function Catalog.getWind",
    "function Catalog.getThunder",
    "function Catalog.getWeatherPreset",
  ].forEach((needle) => {
    assert.equal(source.includes(needle), false, `stale catalog surface remains: ${needle}`);
  });
});

test("soundscape Unity guide documents setup and live verification steps", () => {
  const source = readRepoFile(".dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md");

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

test("soundscape runtime resolves GUID emitters and trigger effects", () => {
  const source = readRepoFile("core/soundscape.ttslua");

  [
    "require(\"lib.guids\")",
    "getObjectFromGUID",
    "guidKey",
    "getTriggerEffects",
    "playTriggerEffect",
    "triggerEffects",
    "musicGeneration",
    "featuredGeneration",
    "weatherGeneration",
  ].forEach((needle) => {
    assert.ok(source.includes(needle), `missing ${needle}`);
  });

  [
    "Catalog.getMusicMood",
    "Catalog.getLocationMusic",
    "Catalog.getFeaturedMusic",
    "Catalog.getLocation(",
    "Catalog.getRain",
    "Catalog.getWind",
    "Catalog.getThunder",
    "Catalog.getWeatherPreset",
  ].forEach((needle) => {
    assert.equal(source.includes(needle), false, `runtime still calls stale catalog API: ${needle}`);
  });
});

test("soundscape debug helpers expose expanded lane controls", () => {
  const source = readRepoFile("core/debug.ttslua");

  [
    "function DEBUG.soundscapeRain(rainKey)",
    "function DEBUG.soundscapeWind(windKey)",
    "function DEBUG.soundscapeThunder(mode, hitKey)",
    "function DEBUG.soundscapeFeatured(featureKey)",
    "function DEBUG.soundscapeStopFeatured()",
    "function DEBUG.soundscapeResumeBackground()",
    "soundscapeRain = DEBUG.soundscapeRain",
    "soundscapeWind = DEBUG.soundscapeWind",
    "soundscapeThunder = DEBUG.soundscapeThunder",
    "soundscapeFeatured = DEBUG.soundscapeFeatured",
  ].forEach((needle) => {
    assert.ok(source.includes(needle), `missing ${needle}`);
  });
});

test("soundscape test bed exposes a site-change simulation helper", () => {
  const source = readRepoFile(".dev/.debug/TEST BED.ttslua");

  [
    "local function SoundscapeSiteTest(site)",
    "C.Sites[site]",
    "siteData.soundscape.backgroundMusic",
    "siteData.soundscape.location",
    "Soundscape.applyContext(context)",
    "-- SoundscapeSiteTest(\"CasaLoma\")",
    "local SOUNDSCAPE_TEST_MOOD = \"intrigue\"",
    "local SOUNDSCAPE_TEST_LOCATION = \"softIndoor\"",
    "local SOUNDSCAPE_TEST_LOCATION_MUSIC = \"casaLoma\"",
    "local SOUNDSCAPE_TEST_RAIN = \"rainHeavy\"",
    "local SOUNDSCAPE_TEST_WIND = \"windMed\"",
  ].forEach((needle) => {
    assert.ok(source.includes(needle), `missing ${needle}`);
  });
});

test("soundscape GUID registry contains all runtime emitters", () => {
  const source = readRepoFile("lib/guids.ttslua");

  [
    "SOUNDSCAPE_MUSIC_A",
    "SOUNDSCAPE_MUSIC_B",
    "SOUNDSCAPE_FEATURED_A",
    "SOUNDSCAPE_FEATURED_B",
    "SOUNDSCAPE_LOCATION_A",
    "SOUNDSCAPE_LOCATION_B",
    "SOUNDSCAPE_WEATHER_RAIN",
    "SOUNDSCAPE_WEATHER_WIND",
    "SOUNDSCAPE_WEATHER_THUNDER",
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
    "core/soundscape_debug_panel.ttslua",
    "core/storyteller_panel_ui.ttslua",
    ".dev/.debug/TEST BED.ttslua",
  ].forEach((relativePath) => {
    assert.doesNotThrow(() => {
      luaparse.parse(readRepoFile(relativePath), { luaVersion: "5.1" });
    }, `${relativePath} should parse`);
  });
});

test("soundscape runtime guards crossfade timers and reload restoration", () => {
  const source = readRepoFile("core/soundscape.ttslua");

  assert.ok(source.includes("local thisGeneration = musicGeneration"), "music generation should be captured per scheduled track");
  assert.ok(source.includes("thisGeneration == musicGeneration"), "music callbacks should check generation before playing");
  assert.ok(source.includes("local thisFeaturedGeneration = featuredGeneration") || source.includes("generation ~= featuredGeneration"), "featured generation should be captured per scheduled transition");
  assert.ok(source.includes("thisFeaturedGeneration == featuredGeneration") || source.includes("generation ~= featuredGeneration"), "featured callbacks should check generation before playing");
  assert.ok(source.includes("local thisWeatherGeneration = weatherGeneration"), "weather generation should be captured per thunder schedule");
  assert.ok(source.includes("thisWeatherGeneration == weatherGeneration"), "weather callbacks should check generation before playing thunder");
  assert.ok(source.includes("state.backgroundMusicEnabled == true"), "onLoad restore should only restart background music when it was enabled");
});

test("soundscape featured and location lanes use paired emitters", () => {
  const catalog = readRepoFile("lib/soundscape_catalog.ttslua");
  const runtime = readRepoFile("core/soundscape.ttslua");
  const state = readRepoFile("core/state.ttslua");
  const guids = readRepoFile("lib/guids.ttslua");

  [
    "featuredA",
    "featuredB",
    "locationA",
    "locationB",
    "SOUNDSCAPE_FEATURED_A",
    "SOUNDSCAPE_FEATURED_B",
    "SOUNDSCAPE_LOCATION_A",
    "SOUNDSCAPE_LOCATION_B",
  ].forEach((needle) => {
    assert.ok(catalog.includes(needle) || guids.includes(needle) || runtime.includes(needle) || state.includes(needle), `missing paired emitter support: ${needle}`);
  });

  assert.ok(runtime.includes("activeFeaturedChannel"), "featured lane should track the active featured emitter");
  assert.ok(runtime.includes("activeLocationChannel"), "location lane should track the active location emitter");
  assert.ok(runtime.includes("playFeaturedEntry"), "featured playback should use paired emitter handoff helper");
  assert.ok(runtime.includes("playLocationEntry"), "location playback should use paired emitter crossfade helper");
  const oldDelayKey = ["featuredLoop", "HandoffDelaySeconds"].join("");
  const oldFeaturedGuidKey = ["guidKey = \"SOUNDSCAPE", "FEATURED\""].join("_");
  const oldLocationGuidKey = ["guidKey = \"SOUNDSCAPE", "LOCATION\""].join("_");

  assert.equal(catalog.includes(oldDelayKey), false, "featured loop delay should be removed now that paired emitters prevent collisions");
  assert.equal(runtime.includes(oldDelayKey), false, "runtime should not apply the old featured loop handoff delay");
  assert.equal(catalog.includes(oldFeaturedGuidKey), false, "catalog should not reference the old single featured GUID");
  assert.equal(catalog.includes(oldLocationGuidKey), false, "catalog should not reference the old single location GUID");
});

test("soundscape music exclusivity uses generic featured sequencing", () => {
  const runtime = readRepoFile("core/soundscape.ttslua");

  [
    "findFeaturedSequence(trackKey)",
    "scheduleNextFeaturedTrack",
    "pauseBackgroundForFeatured",
    "resumeBackgroundAfterFeatured",
    "stopFeaturedMusicInternal",
    "playFeaturedTrack(feature, playlist, trackIndex, options)",
    "state.backgroundPausedForFeatured",
    "state.featuredCompletionExpected",
    "playFeaturedEntry(feature, targetChannel, crossFadeSeconds, fromVolume)",
  ].forEach((needle) => {
    assert.ok(runtime.includes(needle), `missing music exclusivity support: ${needle}`);
  });

  assert.equal(runtime.includes("featureKey == \"TR_Intro\""), false, "featured sequencing should not special-case the Toronto Rising intro");
  assert.equal(runtime.includes("Catalog.getFeaturedTrack(\"TR_Loop\")"), false, "featured sequencing should not hardcode the Toronto Rising loop");
});

test("soundscape uses standard lane behavior by emitter count", () => {
  const runtime = readRepoFile("core/soundscape.ttslua");

  [
    "playPairedEmitterEntry(entry, options)",
    "playSingleEmitterFadeOutIn(channelKey, entry, volume, fadeSeconds)",
    "incomingFadeSeconds",
    "resolveActiveMusicChannel(state)",
    "resolveActiveFeaturedChannel(state)",
    "resolveActiveLocationChannel(state)",
    "singleEmitterTransitionGeneration[channelKey]",
    "fadeSeconds / 2",
  ].forEach((needle) => {
    assert.ok(runtime.includes(needle), `missing standard emitter-count behavior: ${needle}`);
  });

  assert.ok(runtime.includes("incomingFadeSeconds = 0"), "featured music should explicitly skip incoming fade-in");
  assert.ok(runtime.includes("playSingleEmitterFadeOutIn(\"weatherRain\""), "rain should use same-emitter fade-out/fade-in");
  assert.ok(runtime.includes("playSingleEmitterFadeOutIn(\"weatherWind\""), "wind should use same-emitter fade-out/fade-in");
  assert.ok(runtime.includes("playCatalogEntry(\"weatherThunder\", thunder, thunder.volume or 0.7, 0)"), "thunder should play immediately at full volume without fade-out/fade-in");
  assert.equal(runtime.includes("playSingleEmitterFadeOutIn(\"weatherThunder\""), false, "thunder should never use same-emitter fade-out/fade-in");
});

test("soundscape debug panel is wired through UI and global handlers", () => {
  const hud = readRepoFile("ui/storyteller/hud_storyteller.xml");
  const panel = readRepoFile("ui/storyteller/panel_debug_soundscape.xml");
  const globalScript = readRepoFile("core/global_script.ttslua");
  const panelController = readRepoFile("core/soundscape_debug_panel.ttslua");

  [
    "HUD_debugSoundscapeActivate",
    "panel_debug_soundscape.xml",
    "Debug Soundscape",
  ].forEach((needle) => {
    assert.ok(hud.includes(needle), `hud missing ${needle}`);
  });

  [
    "id=\"panel_debug_soundscape_root\"",
    "id=\"ds_dynamic_root\"",
    "Debug Soundscape",
  ].forEach((needle) => {
    assert.ok(panel.includes(needle), `debug panel missing ${needle}`);
  });

  [
    "SoundscapeDebugPanel = require(\"core.soundscape_debug_panel\")",
    "function HUD_debugSoundscapeActivate(player, button, id)",
    "function HUD_debugSoundscapePlay(player, button, id)",
    "function HUD_debugSoundscapeVolume(player, value, id)",
    "function HUD_debugSoundscapeDone(player, button, id)",
  ].forEach((needle) => {
    assert.ok(globalScript.includes(needle), `global script missing ${needle}`);
  });

  [
    "function SoundscapeDebugPanel.activate(player)",
    "function SoundscapeDebugPanel.onPlay(player, button, id)",
    "function SoundscapeDebugPanel.onVolume(player, value, id)",
    "function SoundscapeDebugPanel.done()",
    "Soundscape.getDebugCategories()",
    "Playing Tracks",
    "onClick=\"HUD_debugSoundscapePlay\"",
    "onValueChanged=\"HUD_debugSoundscapeVolume\"",
    "Soundscape.playDebugTrack(categoryKey, trackKey)",
    "Soundscape.setDebugTrackVolume(categoryKey, trackKey, volume)",
  ].forEach((needle) => {
    assert.ok(panelController.includes(needle), `panel controller missing ${needle}`);
  });
});
