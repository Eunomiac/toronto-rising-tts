# Debug File Logging

The debug module uses the TTS Tools extension’s `sendExternalMessage` API (`type: "write"`) so TTS can ask the editor to create or overwrite a file **under your opened workspace**.

## How It Works (actual paths)

In **Sebaestschjin’s TTS Editor**, a `write` message with a `name` field is **not** written to the workspace root. The extension saves it under:

**`<workspaceFolder>/.tts/output/<name>`**

So `logToFile` (which uses `name = debug_logs/debug_log.txt`) creates:

**`<workspaceFolder>/.tts/output/debug_logs/debug_log.txt`**

The `name` you pass to `DEBUG.writeWorkspaceFile` is the same suffix (e.g. `debug_logs/seat_layout_frame_refs.lua` → **`.tts/output/debug_logs/seat_layout_frame_refs.lua`**).

If you set `object` on the message (this project does not), the extension would use a different root (object output naming); our code only sets `name`.

`customMessage` handling is gated by **`ttsEditor.enableMessages`** (on by default). If it is off, requests are ignored and nothing is written.

## Available Functions

### Basic Logging

```lua
lua logToFile("INFO", "This is an info message")
lua logToFile("WARN", "This is a warning", "custom_log")
lua logToFile("ERROR", "Something went wrong")
lua logToFile("DEBUG", "Debug information")
```

### State / Scene / Zone Logging

```lua
lua logStateToFile()
lua logSceneToFile()
lua logZonesToFile()
```

### Test Result Logging

```lua
lua logTestToFile("State Test", true, "All checks passed")
lua logTestToFile("Scene Test", false, "Scene not found", "my_tests")
```

### Comprehensive

```lua
lua logAllToFiles()
```

## File Locations

Typical layout (paths relative to the **folder** you opened in Cursor / VS Code, usually `toronto-rising-tts`):

```
<workspaceFolder>/
└── .tts/
    └── output/
        └── debug_logs/
            ├── debug_log.txt
            ├── game_state.txt
            ├── scene_info.txt
            ├── zone_info.txt
            ├── test_results.txt
            └── seat_layout_frame_refs.lua   -- from rotational layout export, if you use that path
```

## File Format

### General Logs (`debug_log.txt`)

```
[1234567890] [INFO] This is an info message
```

### State Dumps (`game_state.txt`)

JSON pretty-printed when `format` is `"auto"`.

## Requirements

- **TTS Tools / TTS Editor** connected to the same workspace instance  
- **`ttsEditor.enableMessages`** enabled  

## Troubleshooting

1. **Look under `.tts/output/`** — not a top-level `debug_logs/` folder at the repo root.
2. **Multi-root workspace** — the extension uses **`workspace.workspaceFolders[0]`**; put this repo first or open it as a single-folder workspace.
3. **Messages disabled** — turn on custom messages in TTS Editor settings.
4. **Auto-open** — the extension opens the written document in the editor when handling `write` (when `name` is set).

## Notes

- **Append mode** (`logToFile`, `logTestToFile`): in-memory cache in Lua; each send rewrites the full file for that path.
- **Overwrite dumps** (`logStateToFile`, etc.): full snapshot per call.
- Repository `.gitignore` may list patterns under root `debug_logs/`; generated logs actually live under **`.tts/output/debug_logs/`** unless you change ignore rules for `.tts/output`.

