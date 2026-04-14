# Debug File Logging

The debug module uses the TTS Tools extension’s `sendExternalMessage` API (`type: "write"`) so TTS can ask the editor to create or overwrite a file **under your opened workspace**.

**Why not write to the repo root or `dev/`?** The Sebaestschjin **TTS Editor** routes `type: "write"` messages with a `name` field to **`workspaceFolder/.tts/output/<name>`** (see below). Game Lua cannot choose another root unless the extension adds that feature. If **object sync** churns `.tts/` and your log **disappears**, enable **`lib.workspace_ndjson_log.mirrorAppendToPrint = true`** (Global `onLoad` does this for the agent debug hook) so each record is also **`print`**’d to the TTS console as `[workspace_ndjson] {...}` — copy from there or from the External Editor log.

## How It Works (actual paths)

In **Sebaestschjin’s TTS Editor**, a `write` message with a `name` field is **not** written to the workspace root. The extension saves it under:

**`<workspaceFolder>/.tts/output/<name>`**

So `logToFile` (which uses `name = debug_logs/debug_log.txt`) creates:

**`<workspaceFolder>/.tts/output/debug_logs/debug_log.txt`**

The `name` you pass to `DEBUG.writeWorkspaceFile` is the same suffix (e.g. `debug_logs/seat_layout_frame_refs.lua` → **`.tts/output/debug_logs/seat_layout_frame_refs.lua`**).

If you set `object` on the message (this project does not), the extension would use a different root (object output naming); our code only sets `name`.

`customMessage` handling is gated by **`ttsEditor.enableMessages`** (on by default). If it is off, requests are ignored and nothing is written.

## Agent / contributor guidance (instrumentation)

When adding **runtime logging** from Lua (especially **object scripts** or one-off investigations), **use the debug module** so behavior stays consistent and failures surface in one place:

| Use case | API | Notes |
| -------- | --- | ----- |
| Line-oriented console-style log (TTS `lua logToFile(...)`) | `DEBUG.logToFile` | Writes under `.tts/output/debug_logs/`. |
| One-off file body (overwrite) | `DEBUG.writeWorkspaceFile(relativePath, content, format?, silent?)` | `relativePath` is under `.tts/output/`. |
| **Structured NDJSON** (hypothesis tags, session id, etc.) | **`DEBUG.workspaceNdjsonBegin`** + **`DEBUG.workspaceNdjsonAppend`** | Prefer this over `require("lib.workspace_ndjson_log")` in new code. |
| Quick NDJSON session with fixed name | `DEBUG.beginWorkspaceDebugSession()` | Clears `debug_workspace_ndjson.log` only. |

**Do not** wire new features directly to `lib/workspace_ndjson_log` unless you have a specific reason; **`core/debug.ttslua`** is the supported façade.

### NDJSON session example (Global script)

Global already loads `DEBUG`. At run start (e.g. `onLoad`), clear the log for a clean capture:

```lua
DEBUG.workspaceNdjsonBegin("debug_myrun.log")
```

Append records from Global or from object scripts (object scripts should `pcall(require, "core.debug")` then call the same helpers):

```lua
DEBUG.workspaceNdjsonAppend("debug_myrun.log", {
    sessionId = "optional-session-id",
    hypothesisId = "H1",
    location = "global_script:onLoad",
    message = "state initialized",
    data = { phase = "Play" },
})
```

Payload shape is passed through to `lib/workspace_ndjson_log.append` (adds `timestamp`, optional default `sessionId`). Output is human-readable header lines plus `JSON.encode` per entry, under **`.tts/output/<relativePath>`**.

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

1. **Look under `.tts/output/`** — not a top-level `debug_logs/` folder at the repo root. Example: `toronto-rising-tts/.tts/output/debug_session.log`, not `toronto-rising-tts/debug_session.log`.
2. **`sendExternalMessage` is nil** — Lua has **no path to the editor**; nothing is written and TTS prints a **`sendExternalMessage is nil`** line from `DEBUG.workspaceNdjsonBegin`.  
   **Fix:** Use the TTS Editor with this workspace and **`ttsEditor.enableMessages`** enabled.
3. **`require lib.workspace_ndjson_log` failed** or **invalid** — often the Save & Play **bundle omitted** that module because it was only required inside functions. `core/debug.ttslua` now includes a **top-level** `require("lib.workspace_ndjson_log")` so the bundler pulls it in. If you still see **`require failed:`**, read the error text and see **`dev/TTS_BUNDLING_SETUP.md` (Issue 2a)**.
4. **Multi-root workspace** — the extension uses **`workspace.workspaceFolders[0]`**; put this repo first or open it as a single-folder workspace.
5. **Messages disabled** — turn on custom messages in TTS Editor settings.
6. **Auto-open** — the extension opens the written document in the editor when handling `write` (when `name` is set).

### After Save & Play: still no file?

1. Open **TTS in-game console** (default `~`) and scroll for **`DEBUG.workspaceNdjsonBegin`** / **`sendExternalMessage`** lines.
2. If you see **`sendExternalMessage is nil`**, the game is not connected to the extension workflow above — fix connectivity first.
3. If you see **`NDJSON session + bootstrap line -> .tts/output/...`**, the bridge worked — open the repo in the editor and check **`.tts/output/<filename>`**.

## Cursor “Debug Logs” panel vs these files

**Cursor debug mode** can show a **Debug Logs** panel wired to an **HTTP ingest** (localhost). Logs from **Tabletop Simulator** use **`sendExternalMessage`** and appear as files under **`.tts/output/`** only. They are **not** posted to that ingest, so the panel may stay on **“Waiting for log entries…”** even when `.tts/output/<your_log>.log` is updating correctly. Use the **on-disk path** (or TTS console `print` lines) to verify TTS instrumentation.

### “File disappeared” right after open

Previously, `workspace_ndjson_log.beginSession` issued a **`write` with empty `content`**, which cleared the file on disk **before** the first `append`. That could make the file look **deleted or empty** when the editor opened it briefly. **`beginSession` now only clears the in-memory buffer**; the first **`append`** performs the initial write.

### Sync / `.tts` churn wiping `.tts/output/`

Some workflows **refresh files under `.tts/`** when pulling object scripts from the game. Output logs live under **`.tts/output/`**, so a heavy sync can **remove or replace** a log file right after it appears. **Mitigation:** turn on **`mirrorAppendToPrint`** on `lib.workspace_ndjson_log` (see Global `onLoad` agent hook) and capture lines from the **TTS console** or External Editor output.

### Only bootstrap lines in the log (no object / sheet lines)

**Object bundles** may **omit** modules that are only `require`’d **inside functions**. Character sheet logging must use a **top-level** `require("lib.workspace_ndjson_log")` in `ui/ui_csheet.ttslua` (or the same pattern for any object script). Do not rely on `pcall(require, "core.debug")` from object UI scripts — **`core.debug` is large and often not embedded**.

## Notes

- **Append mode** (`logToFile`, `logTestToFile`): in-memory cache in Lua; each send rewrites the full file for that path.
- **Overwrite dumps** (`logStateToFile`, etc.): full snapshot per call.
- Repository `.gitignore` may list patterns under root `debug_logs/`; generated logs actually live under **`.tts/output/debug_logs/`** unless you change ignore rules for `.tts/output`.

