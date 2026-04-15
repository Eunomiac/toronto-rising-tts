# Tabletop Simulator MCP (Cursor) — Toronto Rising

Bridge to the live game over the [External Editor API](tts-api/Getting%20Started/External%20Editor%20API.md): **39999** → TTS, **39998** ← TTS.

## Prepare live session (minimal)

1. Open **Tabletop Simulator** (Toronto Rising save), **Cursor** (this repo as the workspace root), and keep your usual External Editor setting.
2. **Tasks: Run Task** → **`Prepare Live Game Session`** — builds tooling, checks that **toronto-rising-tts MCP is not** listening on **39998** (extension / Save & Play workflow), verifies **39999** (TTS). **39998** may still be closed until you use the TTSLua extension; that is only a console warning. On blocking failures you get a **Windows message box** plus details in the Terminal.
3. **Object refresh without Save & Play**
   - **While Cursor MCP is on** (normal): in chat, ask the agent to run **`tts_quiet_refresh_object`** with **only the `guid`** (paste from TTS). Lua/XML are auto-found under the repo and under the TTS Temp sync path (see `.cursor/mcp.json` `TTS_OBJECT_SYNC_DIRS`).
   - **Task (optional):** **`TTS: Quiet refresh object (paste GUID)`** only works if **nothing else** is listening on **39998**. If **toronto-rising-tts** MCP is running, that task will fail by design — keep using the **agent tool** instead.

**Repo setup (not every session):** `npm install`, `npm run tts-mcp:build` when you pull changes. Project MCP: **[`.cursor/mcp.json`](../.cursor/mcp.json)** (`cwd` = repo root).

## Port 39998 (one listener)

MCP, **rolandostar.tabletopsimulator-lua**, and **sebaestschjin.tts-editor** all want **39998**. Use **one** per session. Details: [TTS_BUNDLING_SETUP.md — Issue 0b](TTS_BUNDLING_SETUP.md#issue-0b-port-39998-already-in-use-eaddrinuse). Tool **`tts_bridge_status`** (when MCP is up) summarizes **39998** / **39999**.

## Agent tools (reference)

| Tool | Purpose |
|------|---------|
| `tts_bridge_status` | **39998** / **39999** + short `hint`. |
| `tts_execute_lua` | Run Lua in TTS; read `prints` / `returnValue` / errors. |
| `tts_send_custom_message` | Fire-and-forget `onExternalMessage` payload. |
| `tts_quiet_refresh_object` | **GUID-only OK:** omit `luaEntryPath` / `xmlPath` to find `*.guid.lua` and `*.guid.xml` (repo + `TTS_OBJECT_SYNC_DIRS`). Not for Global `-1`. |

### `tts_quiet_refresh_object` caveats

- Object is **destroyed and respawned** (flicker; stale userdata elsewhere).
- **Global** needs Save & Play.
- Very large JSON may need a full save reload instead.

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run tts-prepare-live-session` | Session prep script (used by **Prepare Live Game Session** task). `npm run tts-game-day-init` is an alias. |
| `npm run tts-quiet-refresh -- <guid>` | Standalone refresh (needs free **39998**). |
| `npm run tts-mcp:build` | Build bridge + MCP. |
| `npm run tts-mcp:start` | Stdio MCP (debug). |
| `npm run tts-bridge:listen` | Bridge only: **39998** + `.dev/.debug` writes ([DEBUG_FILE_LOGGING.md](DEBUG_FILE_LOGGING.md)). |

## More reading

- [External Editor API.md](tts-api/Getting%20Started/External%20Editor%20API.md)
- [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md)
