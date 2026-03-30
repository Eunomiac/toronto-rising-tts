# Tabletop Simulator MCP (Cursor)

This repo includes a small **Model Context Protocol** server that runs **Tabletop Simulator** Lua on your machine and returns `print` output, return values, and errors via the official [External Editor API](tts-api/Getting%20Started/External%20Editor%20API.md) (localhost **39999** → TTS, **39998** ← TTS).

## Prerequisites

1. **Tabletop Simulator** is running with a game loaded.
2. **External Editor** is enabled in TTS (**Options → General → External Editor**), same as for TTS Tools. See [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md) (Issue 0).
3. **Node.js 18+** and project dependencies: `npm install` at the repo root.
4. **Build** the server: `npm run tts-mcp:build`. Outputs go to `tools/tts-bridge/dist/` and `tools/tts-mcp/dist/` (ignored by git — rebuild after pull).

## Port conflict (39998)

Only **one** process may listen on **39998**. If **TTS Tools** (or another editor bridge) is already bound there, stop it or do not run the MCP server at the same time. Details: [TTS_BUNDLING_SETUP.md — Issue 0b](TTS_BUNDLING_SETUP.md#issue-0b-port-39998-already-in-use-eaddrinuse).

## Cursor MCP configuration

In Cursor, add an MCP server whose command runs the compiled entry (adjust the path if your clone lives elsewhere).

**Example (`mcp.json` or Cursor MCP settings):**

```json
{
  "mcpServers": {
    "toronto-rising-tts": {
      "command": "node",
      "args": ["D:\\Projects\\.CODING\\toronto-rising-tts\\tools\\tts-mcp\\dist\\index.js"],
      "cwd": "D:\\Projects\\.CODING\\toronto-rising-tts"
    }
  }
}
```

Use forward slashes if your environment prefers: `D:/Projects/.CODING/toronto-rising-tts/tools/tts-mcp/dist/index.js`.

After saving, reload MCP / restart Cursor if needed. The server speaks **stdio** only (no HTTP port).

## Tools exposed

| Tool | Purpose |
|------|---------|
| `tts_execute_lua` | Send `messageID: 3` execute with `script` and optional `guid` (default `"-1"` Global). **Timeouts:** `idleTimeoutMs` default 60000 — omit for long sequence gaps; pass ~2000–5000 for fast print-only probes. `maxWaitMs` default 30000 — raise toward 120000 for multi-minute runs. Returning a serializable value usually ends without waiting the full idle window. Returns `prints`, `returnValue`, `error`, `customMessages`, `timedOut`. |
| `tts_send_custom_message` | Send `messageID: 2` with a JSON object; TTS delivers it to `onExternalMessage` in Lua. Fire-and-forget (no output capture). |

**Execute context:** The target object must already have a script slot in TTS, or execute fails (see External Editor API “Execute Lua Code”).

## Scripts (local)

| Command | Description |
|---------|-------------|
| `npm run tts-bridge:build` | Compile only `tts-bridge`. |
| `npm run tts-bridge:test` | Vitest suite for the bridge (mock TTS, no game). |
| `npm run tts-mcp:build` | Build bridge + MCP. |
| `npm run tts-mcp:start` | Run the MCP server on stdio (normally Cursor spawns this; useful for debugging). |

## References

- In-repo API notes: [External Editor API.md](tts-api/Getting%20Started/External%20Editor%20API.md)
- TTS Tools / bundling: [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md)
