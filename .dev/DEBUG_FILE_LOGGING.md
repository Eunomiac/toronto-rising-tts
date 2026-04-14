# Debug File Logging

The debug module uses TTS **`sendExternalMessage`** with **`type: "write"`** so the game asks the **External Editor** bridge to create or overwrite a file under your opened workspace.

**Where files land:** The repo **[`.tools/tts-bridge`](../.tools/tts-bridge)** listens on **localhost `39998`** (same inbound port as the [External Editor API](tts-api/Getting%20Started/External%20Editor%20API.md)) and writes payloads to:

**`<workspaceFolder>/.dev/.debug/<name>`**

where **`name`** is the string Lua puts on the message (e.g. `debug_logs/debug_log.txt` → **`.dev/.debug/debug_logs/debug_log.txt`**).

- **Cursor MCP:** the server calls **`ensureListening()`** on startup so this works as soon as the **toronto-rising-tts** MCP is connected.
- **Without Cursor:** run **`npm run tts-bridge:listen`** from the repo root (after **`npm run tts-bridge:build`** or **`npm run tts-mcp:build`**).
- **Override root:** set env **`TTS_WORKSPACE_WRITE_ROOT`** to an absolute path or a path relative to the workspace folder.

**Legacy:** The Sebaestschjin extension wrote **`type: "write"`** under **`.tts/output/<name>`**. That path is **not** used when the repo bridge owns **39998**.

**If logs disappear or you need a console copy:** enable **`lib.workspace_ndjson_log.mirrorAppendToPrint = true`** (Global `onLoad` does this for the agent debug hook) so each record is also **`print`**’d to the TTS console as `[workspace_ndjson] {...}`.

## Agent / contributor guidance (instrumentation)

When adding **runtime logging** from Lua (especially **object scripts** or one-off investigations), **use the debug module** so behavior stays consistent and failures surface in one place:

| Use case | API | Notes |
| -------- | --- | ----- |
| Line-oriented console-style log (TTS `lua logToFile(...)`) | `DEBUG.logToFile` | Files under **`.dev/.debug/debug_logs/`** when the bridge is listening. |
| One-off file body (overwrite) | `DEBUG.writeWorkspaceFile(relativePath, content, format?, silent?)` | `relativePath` is the **`name`** suffix (e.g. `debug_logs/npcs_panel.txt`). |
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

Payload shape is passed through to `lib/workspace_ndjson_log.append` (adds `timestamp`, optional default `sessionId`). Output is human-readable header lines plus `JSON.encode` per entry, under **`.dev/.debug/<relativePath>`** when the bridge handles the write.

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
└── .dev/
    └── .debug/
        └── debug_logs/
            ├── debug_log.txt
            ├── game_state.txt
            ├── scene_info.txt
            ├── zone_info.txt
            ├── test_results.txt
            └── seat_layout_frame_refs.lua   -- from rotational layout export, if you use that path
```

(The **`.dev/.debug/`** tree is gitignored.)

## File Format

### General Logs (`debug_log.txt`)

```
[1234567890] [INFO] This is an info message
```

### State Dumps (`game_state.txt`)

JSON pretty-printed when `format` is `"auto"`.

## Requirements

1. **Tabletop Simulator** with **External Editor** enabled (**Options → General → External Editor**).
2. **Exactly one** process listening on **127.0.0.1:39998** — the repo **tts-bridge** (MCP or `npm run tts-bridge:listen`) **or** another tool, not both. See [TTS_MCP.md](TTS_MCP.md) and [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md).

## Troubleshooting

1. **Look under `.dev/.debug/`** — not `.tts/output/` or a top-level `debug_logs/` folder. Example: `toronto-rising-tts/.dev/.debug/debug_session.log`.
2. **`sendExternalMessage` is nil** — Lua has **no path to the editor**; nothing is written and TTS prints a **`sendExternalMessage is nil`** line from `DEBUG.workspaceNdjsonBegin`. **Fix:** enable External Editor and ensure a bridge is listening on **39998** when you need file writes.
3. **`require lib.workspace_ndjson_log` failed** or **invalid** — often the Save & Play **bundle omitted** that module because it was only required inside functions. `core/debug.ttslua` includes a **top-level** `require("lib.workspace_ndjson_log")` so the bundler pulls it in. If you still see **`require failed:`**, read the error text and see **`.dev/TTS_BUNDLING_SETUP.md` (Issue 2a)**.
4. **Multi-root workspace** — run MCP / npm scripts with **`cwd`** set to this repo.
5. **`EADDRINUSE` on 39998** — stop **`npm run tts-bridge:listen`**, disconnect MCP, or disable another VS Code extension that binds the same inbound port.

### After Save & Play: still no file?

1. Open **TTS in-game console** (default `~`) and scroll for **`DEBUG.workspaceNdjsonBegin`** / **`sendExternalMessage`** lines.
2. If you see **`sendExternalMessage is nil`**, fix External Editor connectivity first.
3. If you see **`NDJSON session + bootstrap line -> .dev/.debug/...`**, the write path is correct — open **`.dev/.debug/<filename>`** on disk (folder may be hidden in some UIs because it starts with `.`).

## Cursor “Debug Logs” panel vs these files

**Cursor debug mode** can show a **Debug Logs** panel wired to an **HTTP ingest** (localhost). Logs from **Tabletop Simulator** use **`sendExternalMessage`** and land under **`.dev/.debug/`** when this repo’s bridge handles them. They are **not** posted to that HTTP ingest, so the panel may stay on **“Waiting for log entries…”** even when files are updating. Use the **on-disk path** (or TTS console `print` lines) to verify TTS instrumentation.

### “File disappeared” right after open

Previously, `workspace_ndjson_log.beginSession` issued a **`write` with empty `content`**, which cleared the file on disk **before** the first `append`. That could make the file look **deleted or empty** when the editor opened it briefly. **`beginSession` now only clears the in-memory buffer**; the first **`append`** performs the initial write.

### Only bootstrap lines in the log (no object / sheet lines)

**Object bundles** may **omit** modules that are only `require`’d **inside functions**. Character sheet logging must use a **top-level** `require("lib.workspace_ndjson_log")` in `ui/ui_csheet.ttslua` (or the same pattern for any object script). Do not rely on `pcall(require, "core.debug")` from object UI scripts — **`core.debug` is large and often not embedded**.

## Notes

- **Append mode** (`logToFile`, `logTestToFile`): in-memory cache in Lua; each send rewrites the full file for that path.
- **Overwrite dumps** (`logStateToFile`, etc.): full snapshot per call.
- **`.gitignore`** excludes **`.dev/.debug/`** so generated logs stay out of git.
