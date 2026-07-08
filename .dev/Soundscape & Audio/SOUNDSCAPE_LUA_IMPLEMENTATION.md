# Soundscape Lua Implementation Guide

## Agent Routing

Read this when:
- changing Lua soundscape runtime, emitter channels, catalog keys, or scene/location/weather audio behavior
- editing `gameState.soundscape`
- debugging duplicate fades, load silence, or AssetBundle emitter control

Source of truth:
- `core/soundscape.ttslua`
- `lib/soundscape_catalog.ttslua`
- `lib/guids.ttslua`
- `.dev/Soundscape & Audio/Audio Tracks.md`
- `.dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md`

Verification:
- `npm run build`
- `node .dev/scripts/soundscape_contract.test.js`
- in-TTS soundscape smoke from `.dev/TESTING.md`

Status: current Lua runtime guide; verify channel names and catalog entries against source.

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
- `core/global_script.ttslua` exposes Storyteller music controls and **`Soundscape.prepareEmittersForSave()`** via the Sound panel **Silence for save** button (`HUD_soundscapePrepareSave`): calls **`bootstrapSilenceStrayEmitterLoops`** (physical silent stub + zero gain only) and **`invalidateReconcileCache`** — does **not** call `stopAll` or `reconcileFromState`, so `gameState.soundscape` keeps scene/site audio intent for load reconcile. **Load branch** (active scene restore vs Main-only when no scene) is **TOR-152**, not silence-for-save. Host **`onLoad_initial`** `Sync.full` passes **`skipSoundscape = true`** so physical soundscape apply is deferred to the startup gate (`Scenes.reconcilePlaySessionOnEnter`) — single soundscape authority on load (TOR-269).
- After **`Soundscape.applyContext`** drives emitters to match persisted `gameState.soundscape`, callers that immediately run **`Sync.full`** should invoke **`Soundscape.markReconciledToCurrentState()`** so incremental `Soundscape.reconcileFromState` does not queue a duplicate fade (scene / library apply used to stack three fades: site context, narrative context, reconcile snapshot). On library **Apply active scene**, defer **`markReconciledToCurrentState`** until after chronicle weather / final **`applyContext`** so the fingerprint matches post-weather emitters (see `StorytellerScenesPanel.sceneLibraryApply`).
- **Looping clip swaps (`playCatalogEntry`):** Before a non-silent looping effect, swap to the catalog **`silent`** stub at zero gain, then call `playLoopingEffect` for the target clip with **`armEmitterSilentBeforePlayback`** (mute + volume 0). Unmute or fade-in runs after **`U.delay(..., EMITTER_POST_SWAP_ARM_SECONDS)`** (~one frame) so Unity does not audibly crossfade old→new at full gain. **`playCatalogEntryGeneration`** per channel invalidates stale delayed arms when a newer swap or **`cancelSingleEmitterTransition`** occurs. **`setChannelImmediateVolume`** and weather hold paths use the same silence-first policy (TOR-270).
- **Weather rain/wind on scene switch:** **`setRainLayer`** / **`setWindLayer`** skip clip restart when the channel already plays the same catalog effect; they adjust volume via **`setChannelImmediateVolume`** or **`fadeWeatherHoldToNatural`** during staged transitions (indoor ducking changes without a burst-prone restart). _(TOR-136 / TOR-270.)_
- `core/debug.ttslua` exposes console helpers such as `inspectSoundscapeAudio()`,
  `soundscapeRain()`, `soundscapeWind()`,
  `soundscapeThunder()`, and `soundscapeFeatured()`.

## Naming Rules

Use exact effect names from `Audio Tracks.md` in Unity and the Lua catalog. The
current AssetBundle intentionally includes mixed casing and short names such as
`pt1`, `TR_Intro`, `STB_HouseOfTheRisingSun`, `gioCatacombs`, and `thunder1`.

Do not call `AssetBundle.playLoopingEffect` or trigger effect APIs outside
`core/soundscape.ttslua`. Other systems should express intent through
`Soundscape.applyContext()` or focused soundscape setters.

### Silent sites (`siteSilent`)

`C.Sites` entries may set `isSilent = true`. Apply with `Soundscape.applyContext(Soundscape.contextFromSite(site))` (or pass `isSilent` directly in a context table). That sets persisted `soundscape.siteSilent`, stops background music, location ambience, and weather (including thunder scheduling), and **does not** stop the featured lane. Storyteller actions that start ambient audio (`setMusicMood`, weather/location setters, etc.) clear `siteSilent`. While `siteSilent` is true, `resumeBackgroundMusic` does not restart background tracks after featured music ends. Indoor ducking is irrelevant while silent (weather is off); `applyContext` skips `isIndoors` when `isSilent = true`.

## Verification Checklist

Static verification:

- The soundscape contract test passes.
- All edited Lua files parse as Lua 5.1.
- Markdown diagnostics pass for changed docs.

Unity/TTS verification:

- `lua inspectSoundscapeAudio()` finds all current emitters.
- Each loop emitter lists the expected Looping Effects, including `silent`.
- The thunder emitter lists expected Trigger Effects.
- Apply a scene with site + weather, or use Sound panel / Debug Soundscape for layered playback.
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
