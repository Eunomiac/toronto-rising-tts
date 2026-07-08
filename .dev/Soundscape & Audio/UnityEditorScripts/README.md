# Unity Editor scripts (Toronto Rising)

## Agent Routing

Read this when:
- generating or debugging local Unity editor reports for soundscape audio imports
- comparing Unity import settings against `.dev/Soundscape & Audio/Audio Tracks.md`

Source of truth:
- `SoundscapeAudioImportReport.cs`
- external Unity project asset import settings
- `.dev/Soundscape & Audio/Audio Tracks.md`

Verification:
- Unity menu `Tools -> Toronto Rising -> Soundscape Audio Import Report`
- generated `Soundscape_Audio_Import_Report.csv`

Copy `.cs` files into your **TTS modding Unity project** under an **`Editor/`** folder (for example `Assets/Editor/TorontoRising/`) so Unity compiles them with `UnityEditor`.

## `SoundscapeAudioImportReport.cs`

**Menu:** **Tools → Toronto Rising → Soundscape Audio Import Report**

- Scans **`Assets/Soundscape/Audio`** for **`.wav`** `AudioClip` assets.
- Reads **`AudioImporter.defaultSampleSettings`**: load type, compression format, quality.
- **Original size:** WAV file length on disk.
- **Imported size:** `AssetDatabase.GetAssetSize` via reflection when the Unity version provides it (matches the Inspector-style “storage for this asset” figure when available). If the API is missing or returns 0, the CSV leaves imported/ratio empty for that row.
- Writes **`Soundscape_Audio_Import_Report.csv`** in the project root (next to the `Assets` folder) and logs a fixed-width table to the Console.

Reimport assets first if sizes look stale (**Assets → Reimport** or change a setting and apply).
