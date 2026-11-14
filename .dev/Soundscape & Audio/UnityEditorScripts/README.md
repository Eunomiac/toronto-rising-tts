# Unity Editor scripts (Toronto Rising)

## Agent Routing

Read this when:
- generating or debugging local Unity editor reports for soundscape audio imports
- bulk-wiring Main playlist music into TTS Asset Bundle Effects prefabs
- comparing Unity import settings against `.dev/Soundscape & Audio/Audio Tracks.md`

Source of truth:
- `SoundscapeAudioImportReport.cs`
- `SoundscapeMainMusicBundleSync.cs`
- external Unity project asset import settings
- `.dev/Soundscape & Audio/Audio Tracks.md`

Verification:
- Unity menu `Tools → Toronto Rising → Soundscape Audio Import Report`
- Unity menu `Tools → Toronto Rising → Sync Main Music Into Prefabs`
- generated CSV manifests next to the Unity `Assets` folder

Copy `.cs` files into your **TTS modding Unity project** under an **`Editor/`** folder (for example `Assets/Editor/TorontoRising/`) so Unity compiles them with `UnityEditor`.

## `SoundscapeAudioImportReport.cs`

**Menu:** **Tools → Toronto Rising → Soundscape Audio Import Report**

- Scans **`Assets/Soundscape/Audio`** for **`.wav`** `AudioClip` assets.
- Reads **`AudioImporter.defaultSampleSettings`**: load type, compression format, quality.
- **Original size:** WAV file length on disk.
- **Imported size:** `AssetDatabase.GetAssetSize` via reflection when the Unity version provides it (matches the Inspector-style “storage for this asset” figure when available). If the API is missing or returns 0, the CSV leaves imported/ratio empty for that row.
- Writes **`Soundscape_Audio_Import_Report.csv`** in the project root (next to the `Assets` folder) and logs a fixed-width table to the Console.

Reimport assets first if sizes look stale (**Assets → Reimport** or change a setting and apply).

## `SoundscapeMainMusicBundleSync.cs`

**Menus:**

- **Tools → Toronto Rising → Sync Main Music Into Prefabs**
- **Tools → Toronto Rising → Export Prefab Effects Catalog CSV**
- **Tools → Toronto Rising → Sort Prefab Effect Lists Alphabetically**
- **Tools → Toronto Rising → Apply Main Music Import Settings Only**

Use this after you finish tracks in Audition and export **sound-matched, faded `.wav`** files into the configured folders.

### Configuration (top of the script)

Edit the `Config` class before running:

| Field | Purpose |
| --- | --- |
| `AudioFolders` | Array of project-relative folders that hold Main playlist WAVs. Use **two** folders when splitting under Steam Cloud’s ~300 MB limit. |
| `PrefabPaths` | Matching prefab paths (same index as `AudioFolders`). Each prefab needs `TTSAssetBundleEffects`. |
| `NameMode` | `PlagueTalePtCodeThenStem` (default): `PT_12_Title.wav` → `pt12`; otherwise a sanitized camelCase stem. |
| `PreserveUnmanagedTriggerEffects` | Keep Trigger Effects that this sync does not own (session starters, featured, etc.). |

Current Toronto Rising paths (edit `Config` if yours differ):

```text
Assets/Soundscape/Audio/Music/Main 1  →  Assets/Soundscape/Prefabs/TR Soundscape Music A.prefab
Assets/Soundscape/Audio/Music/Main 2  →  Assets/Soundscape/Prefabs/TR Soundscape Music B.prefab
```

Those folders/prefabs must exist in the Unity project before running the menu.

### What the sync does

1. Finds **`.wav`** clips under each configured folder.
2. Applies Main music import defaults: **Load Type = Streaming**, **Preload Audio Data off**, compression left at Unity default unless you flip `ForceCompressionFormat`.
3. Measures **duration from `AudioClip.length`** (no hand typing).
4. Upserts **Trigger Effects** (Main playlist tracks are one-shots in TTS; the playlist loops by rotating tracks in Lua).
5. Sets **Positional 3D = false** on each Sound block.
6. Writes **`Soundscape_Main_Music_Manifest.csv`** next to the Unity `Assets` folder (`effect_name`, durations, folder index, playlist=`main`).
7. Also writes **`Soundscape_Prefab_Effects_Catalog.csv`** by scanning **top-level** prefabs in `Config.PrefabsFolder` (default `Assets/Soundscape/Prefabs`, no subfolders). Each Looping/Trigger row includes prefab, `effect_list`, **0-based TTS index** (`index_0_based`), 1-based slot, effect name, duration, clip path, and Positional 3D — use this to align `lib/soundscape_catalog.ttslua`.

Re-run **Export Prefab Effects Catalog CSV** anytime without re-syncing music.

**Sort Prefab Effect Lists Alphabetically** reorders **Looping Effects** and **Trigger Effects** on every top-level prefab in `Config.PrefabsFolder` by effect **Name** (case-insensitive; blank names last). That **changes TTS 0-based indexes**, so the catalog CSV is refreshed automatically afterward. Prefer name-based Lua lookups; if anything still uses hard-coded indexes, update it from the new catalog.

Looping Effects (ambience, weather, `silent`) are not touched by the Main music sync; they still appear in the prefab catalog CSV.

### Optional ffprobe pass (outside Unity)

From the Toronto Rising repo:

```text
py ".dev/Soundscape & Audio/export_main_music_manifest.py" ^
  "D:\Unity\Tabletop-Simulator-Modding\Assets\Soundscape\Audio\MusicMainA" ^
  "D:\Unity\Tabletop-Simulator-Modding\Assets\Soundscape\Audio\MusicMainB" ^
  --out ".dev/Soundscape & Audio/Soundscape_Main_Music_Manifest.csv" ^
  --lua-draft ".dev/Soundscape & Audio/main_music_catalog_draft.ttslua"
```

Useful for checking effect names and catalog durations before opening Unity. The Unity menu remains the authority for wiring the prefab.

### After the sync

1. Build AssetBundles as usual.
2. Align `lib/soundscape_catalog.ttslua` and `Audio Tracks.md` with the manifest effect names and durations (Lua still needs those rows for the Main playlist).
3. Save & Play in TTS and spot-check Trigger Effect names on the emitters.
