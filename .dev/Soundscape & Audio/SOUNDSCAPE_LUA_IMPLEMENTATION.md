# Soundscape Lua Implementation Guide

This guide describes the Lua runtime that expands the original soundscape scaffold
to match the full audio inventory in `Audio Tracks.md`.

The Unity AssetBundle can be authored with the full catalog first. Lua support can
then evolve without rebuilding the AssetBundle every time, as long as effect names
remain stable.

## Current Runtime Shape

The implemented Lua runtime uses nine GUID-registered AssetBundle emitters:

- `musicA` / `musicB`: alternating background music lanes for trigger-based mood or location-music playlists.
- `featuredA` / `featuredB`: alternating featured music lanes for one-off songs and catalog-driven sequence handoffs.
- `locationA` / `locationB`: alternating sustained site ambience loops.
- `weatherRain`: sustained rain loops.
- `weatherWind`: sustained wind loops.
- `weatherThunder`: one-shot thunder Trigger Effects.

Emitter lookup is GUID-first through `lib/guids.ttslua`, with tags retained for inspection and human validation. Direct `AssetBundle` calls remain isolated in `core/soundscape.ttslua`.

## Current Runtime Baseline

The current Lua implementation includes:

- `core/soundscape.ttslua` owns emitter lookup, looping effect playback, volume
  control probes, trigger dispatch, background scheduling, featured music, indoor
  weather ducking, thunder scheduling, state restoration, inspection, and live smoke tests.
- `lib/soundscape_catalog.ttslua` is the source of truth for static audio keys,
  effect names, tags, default volumes, fade durations, and playlists.
- `core/state.ttslua` persists the `soundscape` state across saves.
- `core/global_script.ttslua` exposes basic Storyteller music controls.
- `core/debug.ttslua` exposes console helpers such as `testSoundscape()`,
  `inspectSoundscapeAudio()`, `soundscapeRain()`, `soundscapeWind()`,
  `soundscapeThunder()`, and `soundscapeFeatured()`.

## Target Runtime Shape

The expanded runtime should support these independent channels:

- `musicA`: background music crossfade lane A.
- `musicB`: background music crossfade lane B.
- `featuredA`: featured music lane A.
- `featuredB`: featured music lane B.
- `locationA`: site ambience loop lane A.
- `locationB`: site ambience loop lane B.
- `weatherRain`: rain loop.
- `weatherWind`: wind loop.
- `weatherThunder`: thunder trigger lane.

The current `weather` channel should be replaced rather than kept as a parallel
compatibility layer unless there is already shipped save data that depends on it.
This branch is still in development, so prefer a clean state shape over compatibility
shims.

## Naming Rules

Use exact effect names from `Audio Tracks.md` in Unity and the Lua catalog. The
current AssetBundle intentionally includes mixed casing and short names such as
`pt1`, `TR_Intro`, `STB_HouseOfTheRisingSun`, `gioCatacombs`, and `thunder1`.

Do not call `AssetBundle.playLoopingEffect` or trigger effect APIs outside
`core/soundscape.ttslua`. Other systems should express intent through
`Soundscape.applyContext()` or focused soundscape setters.

## Implementation Sequence

### 1. Expand The Catalog

Modify `lib/soundscape_catalog.ttslua`.

Update `Catalog.CHANNELS` so it contains:

- `musicA` with tag `soundscape_music_a`.
- `musicB` with tag `soundscape_music_b`.
- `featuredA` with tag `soundscape_featured_a`.
- `featuredB` with tag `soundscape_featured_b`.
- `locationA` with tag `soundscape_location_a`.
- `locationB` with tag `soundscape_location_b`.
- `weatherRain` with tag `soundscape_weather_rain`.
- `weatherWind` with tag `soundscape_weather_wind`.
- `weatherThunder` with tag `soundscape_weather_thunder`.

Keep `Catalog.SILENT_EFFECT = "silent"` for loop channels. Do not use `silent` to
stop one-shot thunder; trigger effects naturally end.

Add or reshape these catalog sections:

- `Catalog.MUSIC_MOODS`: background music playlists. The existing `general`,
  `intrigue`, and `combat` keys should remain, but their track lists should grow to
  match `Audio Tracks.md`.
- `Catalog.LOCATION_MUSIC`: optional site-specific background music playlists such
  as Casa Loma and Giovanni Estate.
- `Catalog.FEATURED_MUSIC`: featured full songs, intros, and loops, including the
  Toronto Rising intro/loop split.
- `Catalog.LOCATIONS`: site ambience loops from the Ambient Audio section.
- `Catalog.WEATHER_RAIN`: rain loop definitions.
- `Catalog.WEATHER_WIND`: wind loop definitions.
- `Catalog.WEATHER_THUNDER`: thunder hit definitions.
- `Catalog.WEATHER_PRESETS`: named weather combinations that select one rain key,
  one wind key, and optional thunder behavior.

Suggested weather preset fields:

- `label`: display/debug name.
- `rain`: key in `Catalog.WEATHER_RAIN`, or `"none"`.
- `wind`: key in `Catalog.WEATHER_WIND`, or `"none"`.
- `thunder`: table with `enabled`, `hits`, `minDelaySeconds`, `maxDelaySeconds`,
  and `volume`.
- `volume`: optional weather-wide multiplier before indoor ducking.

Add getter functions for each new catalog group:

- `Catalog.getMusicMood(moodKey)`
- `Catalog.getLocationMusic(playlistKey)`
- `Catalog.getFeaturedMusic(featureKey)`
- `Catalog.getLocation(locationKey)`
- `Catalog.getRain(rainKey)`
- `Catalog.getWind(windKey)`
- `Catalog.getThunder(thunderKey)`
- `Catalog.getWeatherPreset(weatherKey)`

### 2. Update Persistent State

Modify both `core/state.ttslua` and the local `defaultState()` function inside
`core/soundscape.ttslua`.

The soundscape state should include:

- `musicMode`: `"background"` or `"featured"`.
- `musicMood`: current generic background mood.
- `locationMusic`: current site music playlist key, or `"none"`.
- `featuredMusic`: current featured music key, or `"none"`.
- `backgroundMusicEnabled`: boolean.
- `featuredMusicEnabled`: boolean.
- `activeMusicChannel`: `"musicA"` or `"musicB"`.
- `location`: current site ambience key.
- `weather`: current weather preset key.
- `weatherRain`: current rain key.
- `weatherWind`: current wind key.
- `weatherThunderEnabled`: boolean.
- `isIndoors`: boolean.
- `channels`: per-channel effect, volume, availability, and volume-control state.
- `capabilities`: runtime probe results, including volume control and trigger support
  if detected.

Keep state serializable. Do not store TTS object handles, Wait timer references, or
Unity component handles.

### 3. Add Trigger Effect Support

Modify `core/soundscape.ttslua`.

The runtime currently only indexes looping effects. Add equivalent support for
trigger effects:

- `getTriggerEffectIndexByName(obj)`: reads trigger effects from the AssetBundle.
- `resolveTriggerEffectIndex(obj, effectName)`: resolves one trigger name.
- `playChannelTrigger(channelKey, effectName, volume)`: sets volume/spatial blend on
  the emitter and plays a trigger effect.

Use the actual TTS AssetBundle trigger methods exposed by the object. Verify method
names against `.dev/tts-api/Scripting API/Object Behaviors/AssetBundle.md` before
implementation. If the API only exposes trigger effects through a method with a
different name than expected, adapt the helper there and keep the public soundscape
API unchanged.

Update `inspectEmitters()` so each row reports both `loopingEffects` and
`triggerEffects`. This is important because thunder setup failures should be visible
from `lua inspectSoundscapeAudio()`.

### 4. Replace Single Weather With Layered Weather

Replace `Soundscape.setWeatherCondition(weatherKey)` internals so the public method
applies a weather preset instead of selecting one loop.

Expected behavior:

- Resolve `weatherKey` through `Catalog.getWeatherPreset(weatherKey)`.
- Select and play the preset rain loop on `weatherRain`.
- Select and play the preset wind loop on `weatherWind`.
- Stop omitted rain or wind layers with `silent`.
- Apply indoor/outdoor ducking to rain and wind.
- Transition rain and wind on their single emitters by fading fully out, then fading
  the new loop in. Do not attempt paired-emitter crossfades for weather unless a
  second emitter is added for that specific weather layer.
- Thunder hits are Trigger Effects and should bypass weather fades entirely: play
  immediately at full volume and never interrupt already-playing thunder.
- Enable or disable thunder scheduling based on the preset.
- Persist `weather`, `weatherRain`, `weatherWind`, and `weatherThunderEnabled`.

Add focused setters for future systems and debug helpers:

- `Soundscape.setRainLayer(rainKey)`
- `Soundscape.setWindLayer(windKey)`
- `Soundscape.setThunderEnabled(isEnabled)`
- `Soundscape.triggerThunder(hitKeyOrNil)`

`Soundscape.setIndoors(isIndoors)` should reapply rain and wind volumes without
restarting their loops unless the current implementation cannot change volume in
place. If volume writes are unavailable, replaying the same loop at the ducked volume
is acceptable.

### 5. Add Thunder Scheduling

Thunder should be scheduled with a generation token, following the same safety
pattern as music crossfade scheduling.

Add a `weatherGeneration` or `thunderGeneration` counter. Increment it when:

- Weather preset changes.
- Thunder is disabled.
- `Soundscape.stopAll()` runs.
- The runtime reloads and rebuilds scheduling state.

Scheduling behavior:

- If thunder is enabled, wait a random delay between the preset minimum and maximum.
- Choose a random thunder hit from the preset hit list.
- Play it through `weatherThunder` as a trigger effect.
- Schedule the next hit only if the generation still matches.

This avoids old timers firing after weather changes.

### 6. Add Featured Music Behavior

Featured music should not permanently erase the background music context, but it is exclusive with background music while active.

Add public APIs:

- `Soundscape.playFeaturedMusic(featureKey)`
- `Soundscape.stopFeaturedMusic()`
- `Soundscape.resumeBackgroundMusic()`
- `Soundscape.setLocationMusic(playlistKey)`

Expected behavior:

- Background music continues to be represented by `musicMood` or `locationMusic`.
- Background music, featured music, and location ambience use the same paired-emitter
  lane-swap behavior because each category has A/B emitters.
- Featured music swaps between `featuredA` and `featuredB` whenever a new featured track starts.
- Featured tracks start immediately at their catalog volume; only the outgoing featured lane fades according to the playlist `crossFadeSeconds`.
- Starting featured music fades out background music, marks background cycling paused, and preserves the background context.
- When featured music naturally completes, the runtime resumes the previous background music mode with a fresh track.
- If featured music is stopped early, it fades out while the requested background music fades in.
- Any featured playlist with `playMode = Catalog.PLAYMODES.SEQUENCE` can schedule the next track; do not hardcode a specific track pair.

Use a separate generation token for featured music scheduling so an intro-to-loop
timer cannot fire after the feature has been stopped or replaced.

### 7. Extend Context Application

Extend `Soundscape.applyContext(context)` to accept:

- `musicMood`
- `locationMusic`
- `featuredMusic`
- `weather`
- `rain`
- `wind`
- `thunderEnabled`
- `location`
- `locationAudio`
- `isIndoors`

Keep the ownership boundary clear:

- Scenes may provide defaults.
- Future SITES data should pass `location`, `locationMusic`, and `isIndoors`.
- Future clock/weather systems should pass `weather` or explicit `rain`/`wind`
  overrides.
- Storyteller UI may override mood or stop layers manually.

### 8. Update Debug And UI Helpers

Modify `core/debug.ttslua` so console testing covers the expanded runtime:

- `inspectSoundscapeAudio()`: now prints looping and trigger effects.
- `testSoundscape()`: starts background music, location ambience, rain, wind, and one
  thunder trigger.
- `soundscapeWeather(weatherKey, isIndoors)`: applies a preset.
- `soundscapeRain(rainKey)`: tests rain independently.
- `soundscapeWind(windKey)`: tests wind independently.
- `soundscapeThunder(hitKey)`: triggers a thunder hit.
- `soundscapeFeatured(featureKey)`: plays featured music.
- `soundscapeStopFeatured()`: stops featured music and resumes background.

Modify `core/global_script.ttslua` and `ui/storyteller/panel_soundscape.xml` only
after the runtime APIs exist. Keep UI expansion modest at first:

- Music mood buttons.
- Stop all.
- Inspect.
- Optional weather preset selector.
- Optional featured music trigger buttons.

Do not build a large manual weather mixer UI until the weather/calendar system exists.

### 9. Update Static Tests

Modify `.dev/scripts/soundscape_contract.test.js`.

The test should assert:

- New public API signatures exist.
- `Catalog.CHANNELS` includes `featuredA`, `featuredB`, `locationA`, `locationB`,
  `weatherRain`, `weatherWind`, and `weatherThunder`.
- Catalog sections for rain, wind, thunder, featured music, and location music exist.
- `inspectEmitters()` reports trigger effects.
- Generation guard strings exist for music, featured music, and thunder scheduling.
- The Unity setup guide path points to
  `.dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md`.
- The Lua files still parse as Lua 5.1.

Also add contract checks for the new implementation guide so future agents keep the
Unity and Lua documentation aligned.

### 10. Update Documentation References

Update these docs after implementation:

- `.dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md`
- `.dev/Soundscape & Audio/Audio Tracks.md`
- `.dev/AVAILABLE_FUNCTIONS.md`
- `.dev/HUD_FUNCTIONS.md`
- `.dev/TESTING.md`
- `docs/solutions/architecture-patterns/tabletop-simulator-soundscape-architecture-2026-04-25.md`

Keep `Audio Tracks.md` as an asset inventory and import-settings reference. Keep this
guide focused on Lua implementation and runtime behavior.

## Verification Checklist

Static verification:

- The soundscape contract test passes.
- All edited Lua files parse as Lua 5.1.
- Markdown diagnostics pass for changed docs.

Unity/TTS verification:

- `lua inspectSoundscapeAudio()` finds all current emitters.
- Each loop emitter lists the expected Looping Effects, including `silent`.
- The thunder emitter lists expected Trigger Effects.
- `lua testSoundscape()` plays background music, location ambience, rain, and wind
  simultaneously.
- `lua soundscapeThunder()` plays one thunder hit without interrupting rain or wind.
- `lua soundscapeWeather("none")` silences rain and wind and cancels thunder timers.
- `lua soundscapeWeather("<storm preset>", false)` plays outdoor rain/wind and
  schedules thunder.
- `lua soundscapeWeather("<storm preset>", true)` keeps the same weather but applies
  indoor ducking.
- `lua soundscapeFeatured("<feature key>")` plays featured music.
- `lua soundscapeStopFeatured()` returns to the previous background music.
- `lua soundscapeStopAll()` silences all loop layers and cancels pending music,
  featured, and thunder timers.

Multiplayer verification:

- A connected client hears the same layers.
- Moving the camera away from hidden emitters does not change perceived volume.
- Triggered thunder is audible to clients, not only the host.

## Known Risks

- TTS AssetBundle trigger method names must be verified against the local TTS API
  docs before coding.
- Unity/TTS may not expose reliable writable `AudioSource.volume` on every platform.
  The runtime should keep the existing capability probe and degrade to direct loop
  switching if needed.
- Streaming too many simultaneous clips can become CPU-heavy. The recommended runtime
  shape streams only the active music/featured lane while keeping layered ambience
  and weather compressed in memory.
- Old `Wait.time` callbacks can fire after state changes unless every scheduled lane
  uses generation tokens.
- The current contract test still references the old Unity guide path and must be
  corrected as part of the Lua expansion work.
