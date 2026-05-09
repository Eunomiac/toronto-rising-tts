# Soundscape Unity Setup

This guide creates the Unity `Custom_Assetbundle` used by `core/soundscape.ttslua`.
The Lua side is already written to tolerate missing emitters, so you can bundle the
code first and add the Unity asset later.

For the overall architecture and extension rules, see
`docs/solutions/architecture-patterns/tabletop-simulator-soundscape-architecture-2026-04-25.md`.
For the Lua-side expansion work needed to support the full audio inventory, see
`SOUNDSCAPE_LUA_IMPLEMENTATION.md`.

## Required Unity Version

Use Unity 6000.0.62f1, matching the current Tabletop Simulator AssetBundle
documentation. Install Windows, Mac, and Linux build support so all players can load
the same `.unity3d` bundle.

## Create The AssetBundle

The goal in Unity is to create one prefab that contains all named soundscape clips
as TTS effects. Looping ambience, music, rain, and wind clips should be **Looping
Effects**. One-shot clips such as thunder hits should be **Trigger Effects**.

The current Lua runtime uses four emitters: two music emitters, one weather emitter,
and one location emitter. The expanded audio catalog in `Audio Tracks.md` will need
additional Lua work before every planned layer is controllable, but you can still
author the Unity AssetBundle now with the full future catalog.

### 1. Open the TTS Modding Project

1. Download the [Berserk Games Tabletop Simulator Modding project](https://github.com/Berserk-Games/Tabletop-Simulator-Modding).
2. Unzip it somewhere easy to find, for example `D:\Projects\Unity\Tabletop-Simulator-Modding`.
3. Open **Unity Hub**.
4. Click **Add** or **Add project from disk**.
5. Select the unzipped `Tabletop-Simulator-Modding` folder.
6. In Unity Hub, confirm the project opens with Unity `6000.0.62f1`.
7. Click the project tile to open it.
8. If Unity asks to upgrade or convert the project, stop and confirm you are using
   Unity `6000.0.62f1` before proceeding.

The windows you need are:

- **Hierarchy**: usually left side; shows objects currently in the scene.
- **Project**: usually bottom; shows project files/assets.
- **Inspector**: usually right side; shows settings for the selected object or file.
- **Scene**: center; visual scene view.

If a window is missing, use Unity's top menu:

- **Window → General → Hierarchy**
- **Window → General → Project**
- **Window → General → Inspector**
- **Window → General → Scene**

### 2. Create Folders For The Soundscape Asset

1. In the **Project** window, open the `Assets` folder.
2. Right-click empty space in the **Project** window.
3. Choose **Create → Folder**.
4. Name it `Soundscape`.
5. Open `Assets/Soundscape`.
6. Create two folders inside it:
   - `Audio`
   - `Prefabs`

### 3. Import Audio Files

1. In the **Project** window, open `Assets/Soundscape/Audio`.
2. Drag your audio files from Windows File Explorer into this folder.
3. Click one imported audio file.
4. In the **Inspector**, review the import settings. Use the per-file recommendations
   in `Audio Tracks.md` as the source of truth.
5. Click **Apply** if Unity shows an **Apply** button.
6. Repeat for the rest of the imported audio files if you change settings.

You need one audio clip for every effect name below. For early testing, you can
reuse the same short loop for several effect names, but each effect name that Lua
will call must exist in the prefab.

For seamless looping clips, export a loop-clean `WAV 44.1kHz/16-bit PCM` source
from your audio editor before importing into Unity. Remove baked-in fade-ins and
fade-outs from loop assets unless they are musically part of the repeating loop;
the Lua runtime handles scene-level fades and crossfades through volume control.

### 4. Create A Silent Audio Clip

The runtime stops channels by switching to a `silent` loop. The easiest safe path
is to import a very short silent audio file, such as a 1-second silent `.wav`.

1. Create or obtain a 1-second silent audio file named `silent.wav`.
2. Drag it into `Assets/Soundscape/Audio`.
3. Select it in Unity.
4. In the **Inspector**, set it like a short loop:
   - **Load Type**: `Compressed In Memory`
   - **Preload Audio Data**: enabled
5. Click **Apply** if needed.

### 5. Create The Root Soundscape Object

1. In Unity's top menu, choose **GameObject → Create Empty**.
2. In the **Hierarchy**, a new object appears, usually named `GameObject`.
3. Select it.
4. In the **Inspector**, rename it to `TR_Soundscape_Bundle`.
5. In the **Inspector**, find **Transform** and set:
   - **Position**: `0, 0, 0`
   - **Rotation**: `0, 0, 0`
   - **Scale**: `1, 1, 1`

This object does not need visible geometry. It is just a container for TTS effects.

### 6. Add The TTS AssetBundle Effects Component

1. Select `TR_Soundscape_Bundle` in the **Hierarchy**.
2. In the **Inspector**, click **Add Component**.
3. Type `TTS` into the search box.
4. Select **TTS Asset Bundle Effects** or **TTSAssetBundleEffects**.
5. The component should appear in the Inspector.

If you cannot find the component, the TTS Modding project was not opened correctly
or the project version is wrong. Re-open the Berserk Games modding project in the
required Unity version.

### 7. Add Effect Entries

1. In the **Inspector**, find the **TTS Asset Bundle Effects** component.
2. Expand **Looping Effects**.
3. Set **Size** to the number of looping effect names you are authoring.
4. Expand **Element 0**.
5. Set **Name** to the first effect name, for example `silent`.
6. Find the **Sound** section inside that element.
7. Drag the matching audio clip from `Assets/Soundscape/Audio` into the **Audio**
   field. If Unity shows a small circle selector instead, click it and choose the
   matching clip.
8. If the effect has a **Duration** field, set it to the clip length or a practical
   loop duration. For long music, using the real track length helps future timing.
9. Leave **Positional 3D** unchecked if that option appears. This soundscape must
   be non-positional.
10. Repeat for every required effect name.

For thunder and other one-shot sounds:

1. Expand **Trigger Effects**.
2. Set **Size** to the number of one-shot effect names.
3. Add each thunder hit as its own trigger effect, for example `weather_thunder_01`.
4. Leave **Positional 3D** unchecked if that option appears.

Important: effect names are case-sensitive. They must match `lib/soundscape_catalog.ttslua`.
For planned future clips that are not yet in the Lua catalog, choose stable names now
and add those same names to the catalog when the runtime is expanded.

### 8. Add AudioSource Components If Needed

Some TTS effect setups expose audio only through the effect entries. For this
module, Lua also tries to inspect/set Unity `AudioSource.volume` and
`AudioSource.spatialBlend`. To maximize compatibility, add AudioSource components
for your clips as child objects.

For each clip:

1. Right-click `TR_Soundscape_Bundle` in the **Hierarchy**.
2. Choose **Create Empty**.
3. Rename the child to the effect name, for example `music_general_01`.
4. Select the child.
5. In the **Inspector**, click **Add Component**.
6. Search for `Audio Source`.
7. Select **Audio Source**.
8. In the **Audio Source** component:
   - Drag the matching clip into **AudioClip**.
   - Check **Loop** for looping effects.
   - Leave **Loop** unchecked for trigger effects such as thunder hits.
   - Uncheck **Play On Awake**.
   - Set **Spatial Blend** all the way to `2D` or `0`.
   - Set **Volume** to a safe starting value such as `0.5`.
9. Repeat for each required clip, including `silent`.

If your Unity Inspector has a **3D Sound Settings** foldout, you can ignore distance
rolloff when **Spatial Blend** is fully 2D. The key requirement is `spatialBlend = 0`.

### 9. Turn The Object Into A Prefab

1. In the **Project** window, open `Assets/Soundscape/Prefabs`.
2. Drag `TR_Soundscape_Bundle` from the **Hierarchy** into the
   `Assets/Soundscape/Prefabs` folder.
3. Unity creates a prefab asset.
4. Click the prefab asset in the **Project** window.
5. Confirm the **Inspector** shows the prefab and the `TTS Asset Bundle Effects`
   component.

### 10. Assign An AssetBundle Name

1. Select the `TR_Soundscape_Bundle` prefab in `Assets/Soundscape/Prefabs`.
2. In the **Inspector**, scroll to the bottom.
3. Find the **AssetBundle** dropdown.
4. Click the dropdown.
5. Choose **New...** if available.
6. Enter `tr_soundscape`.
7. Press Enter.

Unity will export a file named `tr_soundscape` in the `AssetBundles` output folder.
TTS accepts this as the `.unity3d` AssetBundle file even if the extension is not
shown in Windows Explorer.

### 11. Build The AssetBundle

1. In the **Project** window, right-click empty space.
2. Choose **Build AssetBundles**.
3. Wait for Unity to finish.
4. Unity should create or open an `AssetBundles` folder in the project directory.
5. Find the built file named `tr_soundscape`.

If the menu item is missing, make sure you are using the Berserk Games TTS Modding
project, not a blank Unity project.

### 12. Import The Bundle Into Tabletop Simulator

1. Open Tabletop Simulator.
2. Load the Toronto Rising mod.
3. In the top menu, choose **Objects → Components → Custom → AssetBundle**.
4. In the import dialog, set the main AssetBundle file/URL:
   - If uploading through Steam Cloud, choose the local `tr_soundscape` bundle file
     and upload it.
   - If using another host, paste the hosted URL.
5. Choose a simple material/type if TTS asks. The object does not need visible art.
6. Click **Import**.
7. A `Custom_Assetbundle` object should appear on the table.
8. Right-click it and look for **Looping Effects**. Confirm the names appear.

If the right-click menu does not show looping effects, return to Unity and confirm
the prefab has `TTS Asset Bundle Effects` with Looping Effects configured.

### 13. Create Runtime Emitters

The current Lua system expects four separate TTS objects using the same AssetBundle.

1. In TTS, select the imported soundscape object.
2. Copy/paste or clone it three times so there are four total.
3. For each object:
   - Right-click the object.
   - Choose **Name** or edit the name field if available.
   - Give it a readable name, such as `Soundscape Music A`.
   - Add the matching tag listed in the next section.
   - Lock it.
   - Disable tooltip if convenient.
   - Move it somewhere out of the normal play area.
4. Save the mod after all four emitters are placed and tagged.

The object names are for human debugging. The Lua code finds objects by tag.

For the expanded weather design in `Audio Tracks.md`, plan on adding separate
runtime emitters later for:

- rain loops
- wind loops
- thunder trigger hits

That future layout will let rain and wind loop simultaneously while thunder plays
random one-shots over them, with indoor/outdoor ducking applied to all weather
layers. Do not delete the current four emitters; treat the expanded weather emitters
as additional runtime objects once the Lua runtime has corresponding channels.

## Effect Names

The current Lua catalog expects these looping effects:

- `silent`
- `music_general_01`
- `music_general_02`
- `music_intrigue_01`
- `music_intrigue_02`
- `music_combat_01`
- `music_combat_02`
- `weather_light_rain`
- `weather_heavy_rain`
- `weather_wind`
- `location_indoor_office`
- `location_sewers`
- `location_alleyway`
- `location_industrial_exterior`

The expanded audio inventory in `Audio Tracks.md` should be authored into the bundle
using these categories:

- **Ambient/location loops**: Looping Effects, one per site ambience clip.
- **Background music tracks**: Looping Effects, one per playlist track.
- **Featured music intros/full songs**: Trigger Effects if they play once.
- **Featured music loops**: Looping Effects if they repeat after an intro.
- **Rain loops**: Looping Effects.
- **Wind loops**: Looping Effects.
- **Thunder hits**: Trigger Effects.

Use lower-snake-case names that describe the channel and source, such as
`weather_rain_heavy`, `weather_wind_winter_low`, `weather_thunder_01`,
`location_airport`, or `featured_toronto_rising_loop`. You can add more names later
by updating `lib/soundscape_catalog.ttslua`.

## Place Hidden Emitters In TTS

Create nine hidden/locked `Custom_Assetbundle` objects using the same soundscape
bundle for the current runtime. Each object should be tagged as follows:

- `soundscape_music_a`
- `soundscape_music_b`
- `soundscape_featured_a`
- `soundscape_featured_b`
- `soundscape_location_a`
- `soundscape_location_b`
- `soundscape_weather_rain`
- `soundscape_weather_wind`
- `soundscape_weather_thunder`

The paired music, featured, and location emitters allow crossfades or intro-to-loop
handoffs if TTS exposes writable `AudioSource.volume` through Lua. Rain, wind, and
thunder each need one independent emitter so they can play simultaneously with music.

When the Lua runtime is expanded for three-layer weather, add additional hidden
emitters with tags similar to:

- `soundscape_weather_rain`
- `soundscape_weather_wind`
- `soundscape_weather_thunder`

Those names are a forward-looking convention, not active tags in the current Lua
runtime until `lib/soundscape_catalog.ttslua` and `core/soundscape.ttslua` are
updated.

Recommended object settings:

- Locked: true
- Tooltip: false
- Hidden from normal play area if possible
- Scale can be small; audio should remain non-positional because `spatialBlend = 0`

## Live Verification

After saving the objects into the mod:

1. Use Save & Play so TTS loads the current Lua bundle.
2. In the TTS console, run:
   - `lua inspectSoundscapeAudio()`
   - `lua testSoundscape()`
3. Confirm `inspectSoundscapeAudio` lists all four emitters, at least one
   `AudioSource` per emitter, and the expected looping effect names.
4. Confirm `testSoundscape` starts music, weather, and location audio together.
5. Ask a connected client to confirm they hear the same non-positional audio.
6. Move the camera away from the hidden emitters and confirm volume does not change.
7. Run:
   - `lua soundscapeWeather("lightRain", false)`
   - `lua soundscapeWeather("lightRain", true)`
   The indoor version should be significantly quieter because indoor ducking is applied.
8. Run `lua soundscapeStopAll()` and confirm every layer becomes silent.

## Troubleshooting

- **Rain/music briefly wrong on load:** Unity/TTS restores looping `AudioSource`
  state from the saved table before Global Lua finishes. `onLoad` calls
  `Soundscape.bootstrapSilenceStrayEmitterLoops()` (physical silent loop + volume 0)
  right after `S.InitializeGameState`, then `reconcileFromState` reapplies
  `gameState.soundscape` after a short defer (~0.15s). This is not fixed by “stop on
  save” alone — the stray audio is deserialized with the workshop objects.

- If `inspectSoundscapeAudio` says an emitter is missing, check the object tags.
- If effects are missing, check exact Looping Effect names in Unity.
- If layers do not crossfade, TTS may not expose writable `AudioSource.volume` for
  this AssetBundle. The Lua module will still switch loops cleanly.
- If audio fades with distance, re-open the prefab and confirm every `AudioSource`
  has `spatialBlend = 0`.
- If new Lua debug functions do not exist in TTS, assume bundle drift and run Save & Play.
