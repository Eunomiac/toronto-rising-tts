---
title: Tabletop Simulator Soundscape Architecture
date: 2026-04-25
category: architecture-patterns
module: soundscape
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - Adding layered music, weather, or location ambience to the Tabletop Simulator module
  - Extending future weather, clock, calendar, SITES, scene, or Storyteller audio controls
  - Changing the Unity AssetBundle audio catalog used by the soundscape runtime
related_components:
  - documentation
  - tooling
  - development_workflow
  - testing_framework
tags: [soundscape, tabletop-simulator, ttslua, unity-audio, assetbundle, storyteller-ui, catalog-driven]
---

## Context

The soundscape system is the architecture for layered, non-positional Tabletop Simulator audio. It was created because TTS `MusicPlayer` is a single global music lane and is not suitable for simultaneous background music, weather audio, and location ambience.

The architecture is intentionally split across a small runtime service, a static catalog, Storyteller UI, debug helpers, persisted state, scene/context hooks, and a Unity setup guide. Future agents should extend those pieces rather than adding direct `AssetBundle.playLoopingEffect` calls in unrelated modules.

## Guidance

Use `core.soundscape` as the only runtime playback API:

- `Soundscape.setMusicMood(moodKey)` changes Storyteller-controlled music mood.
- `Soundscape.setLocationMusic(playlistKey)` changes site-specific background music playlists.
- `Soundscape.playFeaturedMusic(featureKey)` plays one-off or intro-to-loop featured music.
- `Soundscape.setWeatherCondition(weatherKey)` changes layered weather presets.
- `Soundscape.setRainLayer(rainKey)`, `Soundscape.setWindLayer(windKey)`, and `Soundscape.setThunderEnabled(isEnabled)` control focused weather lanes.
- `Soundscape.triggerThunder(hitKey)` plays one thunder Trigger Effect immediately.
- `Soundscape.setLocationAudio(locationKey)` changes the site/location ambience layer.
- `Soundscape.setIndoors(isIndoors)` applies indoor/outdoor weather ducking.
- `Soundscape.applyContext(context)` lets scenes, future weather/calendar code, and future SITES data express audio intent without owning playback.
- `Soundscape.stopAll()` switches every channel to the `silent` loop.
- `Soundscape.inspectEmitters()` verifies hidden AssetBundle emitters and effects.
- `Soundscape.testLayeredPlayback()` starts a live music/weather/location smoke test.

Keep sound definitions in `lib/soundscape_catalog.ttslua`. Add new moods, weather keys, location keys, effect names, effect-list types, volumes, and durations there first, then make the Unity AssetBundle expose matching Looping or Trigger Effect names. Do not bury static audio keys in scene presets, HUD handlers, or future SITES/weather modules.

The runtime expects nine hidden, locked `Custom_Assetbundle` emitters registered in `lib/guids.ttslua` and tagged for inspection:

- `soundscape_music_a`
- `soundscape_music_b`
- `soundscape_featured_a`
- `soundscape_featured_b`
- `soundscape_location_a`
- `soundscape_location_b`
- `soundscape_weather_rain`
- `soundscape_weather_wind`
- `soundscape_weather_thunder`

Paired music, featured, and location emitters use one standard lane-swap path when TTS exposes writable `AudioSource.volume`. Featured sequencing is catalog-driven: any `SEQUENCE` featured playlist can schedule its next track on the opposite featured emitter. Featured music is mutually exclusive with background music, so starting featured music pauses background cycling and fades background out; featured completion resumes background with a fresh track. Single weather loop emitters cannot crossfade, so rain and wind transition by fading the current loop out, then fading the new loop in on the same emitter. Thunder is different: thunder hits are short trigger effects, start immediately at full volume, and are never interrupted by fade transitions. Loop channels stop by switching to `Catalog.SILENT_EFFECT`, currently `silent`; scheduled callbacks are generation-guarded so stale timers cannot start new audio after the context changes.

Unity authoring is part of the contract. Follow `.dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md` and ensure every `AudioSource` is non-positional:

- `spatialBlend = 0`
- `loop = true`
- `playOnAwake = false`
- no distance rolloff dependency

## Why This Matters

Centralizing audio orchestration prevents future systems from fighting over the same emitters. Scenes, Storyteller controls, weather, clock/calendar, and SITES can all call `Soundscape.applyContext` or a focused setter, while `core.soundscape` owns emitter lookup, loop name resolution, crossfade behavior, indoor ducking, missing-emitter tolerance, state persistence, and debug output.

This also avoids known TTS failure modes:

- `MusicPlayer` only provides one global playback lane.
- AssetBundle looping effects are object-local, so simultaneous layers need separate emitters.
- Looping effects are easier to silence by switching to a known `silent` loop.
- Unity audio must be authored as 2D, otherwise camera/object distance can affect perceived volume.
- Lua, Unity effect names, UI controls, and test commands can drift unless the catalog remains the source of truth.

## When to Apply

Apply this architecture when adding or changing:

- background music moods or playlists
- weather audio
- location/site ambience
- scene audio defaults
- Storyteller audio controls
- clock/calendar-to-weather integration
- SITES `audio` or `isIndoors` integration
- Unity soundscape AssetBundle effect names

Use `Soundscape.applyContext` when another system owns narrative context. For example, a future SITES system should pass `location` and `isIndoors`; a future weather resolver should pass `weather`; a scene preset may pass defaults but should not become the only source of soundscape truth.

## Examples

Scene presets may provide defaults without owning playback:

```lua
soundscapeContext = {
    musicMood = "intrigue",
    weather = "lightRain",
    location = "alleyway",
    isIndoors = false,
}
```

A future SITES module should express site context:

```lua
Soundscape.applyContext({
    location = site.audio.location,
    isIndoors = site.isIndoors,
})
```

A future weather/calendar module should express weather context:

```lua
Soundscape.applyContext({
    weather = resolvedHourlyWeather.audioKey,
})
```

Adding a new weather loop requires coordinated changes:

1. Add a `Catalog.WEATHER_RAIN`, `Catalog.WEATHER_WIND`, or `Catalog.WEATHER_THUNDER` entry in `lib/soundscape_catalog.ttslua`.
2. Add the same named Looping or Trigger Effect to the Unity AssetBundle.
3. Include it in a `Catalog.WEATHER_PRESETS` entry if it should be selected by a named weather condition.
4. Trigger it through `Soundscape.setWeatherCondition("newWeatherKey")`, a focused setter, or `Soundscape.applyContext({ weather = "newWeatherKey" })`.
5. Run `lua inspectSoundscapeAudio()` and confirm the effect exists on the expected emitter.

## Verification

Use these TTS console commands after Save & Play and after placing the hidden AssetBundle emitters:

```lua
lua inspectSoundscapeAudio()
lua testSoundscape()
lua soundscapeMusic("intrigue")
lua soundscapeWeather("thunderstorm", true)
lua soundscapeThunder("hit", "thunder1")
lua soundscapeFeatured("TR_Intro")
lua soundscapeLocation("sewers")
lua soundscapeStopAll()
```

Expected live results:

- Seven emitters are found by GUID.
- Loop-capable emitters list expected Looping Effect names, including `silent`.
- Trigger-capable emitters list expected Trigger Effect names.
- Exactly one music lane should be active: background music or featured music, plus rain, wind, thunder, and location as independent layers.
- Moving the camera away from hidden emitters does not change perceived volume.
- Indoor weather is quieter than outdoor weather.
- `soundscapeStopAll()` silences every layer.

Use the executable contract test for static regression coverage:

```powershell
node --test ".dev/scripts/soundscape_contract.test.js"
```

That test checks the public API surface, catalog/docs presence, Lua parseability, and crossfade/reload guardrails. It does not replace live TTS audio validation because Unity AssetBundle behavior must be verified in Tabletop Simulator.

## Related

- Runtime: `core/soundscape.ttslua`
- Catalog: `lib/soundscape_catalog.ttslua`
- State/lifecycle: `core/state.ttslua`, `core/global_script.ttslua`
- Scene defaults: `core/scenes.ttslua`
- Storyteller UI: `ui/storyteller/panel_soundscape.xml`, `ui/storyteller/panel_storyteller_toolbar.xml`, `lib/ui_helpers.ttslua`
- Debug helpers: `core/debug.ttslua`
- Unity setup: `.dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md`
- Test guide: `.dev/TESTING.md`
- API references: `.dev/AVAILABLE_FUNCTIONS.md`, `.dev/HUD_FUNCTIONS.md`
- Static contract test: `.dev/scripts/soundscape_contract.test.js`
- TTS API docs: `.dev/tts-api/Scripting API/Object Behaviors/AssetBundle.md`, `.dev/tts-api/Scripting API/Music Player.md`
