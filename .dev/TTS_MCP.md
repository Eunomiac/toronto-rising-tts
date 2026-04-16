# Tabletop Simulator MCP (Cursor)

This repo includes a small **Model Context Protocol** server that runs **Tabletop Simulator** Lua on your machine and returns `print` output, return values, and errors via the official [External Editor API](tts-api/Getting%20Started/External%20Editor%20API.md) (localhost **39999** → TTS, **39998** ← TTS).

## Prerequisites

1. **Tabletop Simulator** is running with a game loaded.
2. **External Editor** is enabled in TTS (**Options → General → External Editor**). See [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md) (Issue 0).
3. **Node.js 18+** and project dependencies: `npm install` at the repo root.
4. **Build** the server: `npm run tts-mcp:build`. Outputs go to `.tools/tts-bridge/dist/` and `.tools/tts-mcp/dist/` (ignored by git — rebuild after pull).

## Port conflict (39998)

Only **one** process may listen on **39998**. If another tool (e.g. a VS Code TTS extension’s inbound server) is already bound there, stop it or do not run the MCP server at the same time. Details: [TTS_BUNDLING_SETUP.md — Issue 0b](TTS_BUNDLING_SETUP.md#issue-0b-port-39998-already-in-use-eaddrinuse).

## Cursor MCP configuration

In Cursor, add an MCP server whose command runs the compiled entry (adjust the path if your clone lives elsewhere).

**Example (`mcp.json` or Cursor MCP settings):**

```json
{
  "mcpServers": {
    "toronto-rising-tts": {
      "command": "node",
      "args": ["D:\\Projects\\.CODING\\toronto-rising-tts\\.tools\\tts-mcp\\dist\\index.js"],
      "cwd": "D:\\Projects\\.CODING\\toronto-rising-tts"
    }
  }
}
```

Use forward slashes if your environment prefers: `D:/Projects/.CODING/toronto-rising-tts/.tools/tts-mcp/dist/index.js`.

After saving, reload MCP / restart Cursor if needed. The server speaks **stdio** only (no HTTP port).

## Tools exposed

| Tool | Purpose |
|------|---------|
| `tts_execute_lua` | Send `messageID: 3` execute with `script` and optional `guid` (default `"-1"` Global). **Timeouts:** `idleTimeoutMs` default 90000 — omit for long sequence gaps; pass ~2000–5000 for fast print-only probes. `maxWaitMs` default 30000 — raise toward 120000 for multi-minute runs (e.g. `testEasingForMcp()` visual sequence). See **Return values** below — do not assume complex Lua `return` values always appear in `returnValue`. In mod Lua, prefer **`U.emitForAgent`** / **`U.mcpEmitResult`** (`TR_AGENT_V1` lines in `prints`) for structured output. Returns `prints`, `returnValue`, `error`, `customMessages`, `timedOut`. |
| `tts_send_custom_message` | Send `messageID: 2` with a JSON object; TTS delivers it to `onExternalMessage` in Lua. Fire-and-forget (no output capture). |

**Execute context:** The target object must already have a script slot in TTS, or execute fails (see External Editor API “Execute Lua Code”).

## Pitfalls and obstacles (agents)

These issues showed up while running Toronto Rising Lua through **`tts_execute_lua`** / **`TtsExternalEditorBridge`**. They are easy to misread as “MCP is broken” or “the test harness failed” when the real cause is TTS execute context or stale bundles.

### 1. Live game must match the repo (Save & Play)

- External Editor runs whatever is **bundled into the save**, not the files on disk. After changing **`core/debug.ttslua`**, **`lib/util.ttslua`**, or other bundled scripts, you need **Save & Play** (or equivalent) so TTS loads the new code.
- **Symptom:** A quick probe like `print(type(testEasingForMcp))` prints `function`, but a fuller call still fails or behaves like old code — the Global chunk can be partially updated or you may be mis-attributing errors. When in doubt, **re-bundle and reload** before long debugging sessions.
- **Rule of thumb:** If the docs say a fix exists in repo but TTS still misbehaves, assume **bundle drift** until you confirm a fresh Save & Play.

### 2. `spawnObject` from Global execute can crash the host

- On at least some TTS builds, calling **`spawnObject({ type = "Block", ... })`** from a **Global** script executed via the External Editor (**`guid` `"-1"`**) triggers a **.NET null-reference** on the game side. The bridge often reports this as **`Object reference not set to an instance of an object`** with **`[Global] Lua Error <executeScript>`**, sometimes with **no useful `prints`** (failure happens before Lua prints).
- **`spawnObjectData({ data = ..., position = ... })`** with a valid built-in **`Name`** (e.g. **`BlockSquare`** for simple blocks) has been observed to work from the same execute path. Toronto Rising’s **`DEBUG.ensureEasingTestRig()`** uses **`spawnObjectData`** for the **`center`** and **`target`** marker blocks for this reason (see [`core/debug.ttslua`](../core/debug.ttslua)).
- **When adding MCP-driven setup that spawns objects:** prefer **`spawnObjectData`** (or patterns already used in **`core/npcs.ttslua`**) and verify from a **minimal** execute snippet before wiring full tests.

### 3. Diagnosing “empty prints + generic host error”

1. Run **`print("step0")`** — confirms execute path works.
2. Wrap the suspect call in **`pcall`** and **`print` the results — confirms Lua vs host crash and surfaces Lua errors if any.
3. If the suspect path spawns objects, try the smallest **`spawnObject`** vs **`spawnObjectData`** comparison (see §2).
4. Use a small **checked-in script** under **`.tools/tts-bridge/scripts/`** instead of one-liner **`node -e`** on Windows — **PowerShell quoting** breaks easily on embedded Lua strings.

### 4. Long-running sequences and timeouts

- **`U.RunSequenceWithOptions`** does **not** block until the sequence finishes; the execute chunk returns while coroutines run. Rely on **`onComplete`**, **`U.mcpEmitResult`**, and **`prints`** (see *Orchestration* and *Machine-readable agent lines*).
- Use a high **`maxWaitMs`** (up to **120000**) and the default or higher **`idleTimeoutMs`** (**90000** in the bridge when omitted) for multi-step visual tests (e.g. easing). See the tools table above.

### 5. Bridge “hangs” after the test looks done (`idleTimeoutMs`)

- The bridge completes an execute when it receives **`messageID` 5** (`returnValue`), **or** when **`idleTimeoutMs`** elapses **with no new** inbound **`messageID` 2–5** (prints, errors, return, custom payloads all reset the idle timer).
- **`testEasingForMcp()`** returns from the Lua chunk quickly while **`U.RunSequenceWithOptions`** keeps running in coroutines. **`messageID` 5** (if any) therefore often reflects **“chunk returned”**, not **“animations + `onComplete` finished”**. The session then stays open until prints stop and **idle** fires.
- If **`idleTimeoutMs`** is very large (e.g. **120000**), you can sit for **minutes after the last `TR_AGENT_V1` / `mcpEmitResult` line** with nothing left to observe — that is the timer waiting out silence, not TTS still working. Prefer a **moderate idle** (e.g. **10–20 s**) once you trust the longest **quiet** gap between prints in your sequence, or lower it for harnesses where the final structured line is always last.
- See **`.tools/tts-bridge/scripts/run-easing-mcp-test.mjs`** (documents this; uses a shorter post-result idle and a high **`maxWaitMs`** wall cap).

### 6. Local harness (easing / bridge smoke)

- **`npm run tts-bridge:run-easing-mcp-test`** — builds the bridge and runs **`testEasingForMcp()`** with a high **`maxWaitMs`** and a **short-ish `idleTimeoutMs`** after the last print (see script). Useful to reproduce MCP-style executes without going through Cursor’s MCP UI.
- **`npm run tts-bridge:run-sequence-test`** — smaller **`RunSequenceWithOptions`** live check.

Related: *Easing tests* below (rig tags, **`TR_AGENT_V1`** summary).

## Return values (`messageID` 5) and structured data

The [External Editor API](tts-api/Getting%20Started/External%20Editor%20API.md) states that executed Lua may send a **return** back as inbound **`messageID` 5** with a **`returnValue`** field. In practice (and in this repo’s **tts-bridge**), agents should treat that as **best-effort** only:

1. **Nested Lua tables** and other non–JSON-friendly values often **never show up** as `returnValue` on the Node side — the field may be **missing** or **`undefined`** even when the chunk ran successfully and printed output.
2. **Primitives and simple JSON-like values** (strings, numbers, booleans, or values TTS already maps to JSON) are the reliable cases for raw `return`.
3. **Recommended pattern for structured payloads** (lists of GUIDs, nested maps, query results):
   - Build a Lua table, then **`local encoded = JSON.encode(payload)`** (TTS exposes **`JSON`** globally in scripted games).
   - **`print(encoded)`** so results still appear in **`prints`** if `returnValue` is omitted.
   - **`return encoded`** so consumers can **`JSON.parse`** a **string** when `messageID` 5 works.
4. **Host-side handling:** Prefer parsing **`returnValue`** when `typeof returnValue === "string"`; otherwise scan **`prints`** from the last line upward for a JSON payload (see `.tools/tts-bridge/scripts/export-color-object-tags-to-markdown.mjs` for a full example).

Implementation note: `.tools/tts-bridge/src/bridge.ts` documents the same limitation at the `messageID` 5 handler.

## Machine-readable agent lines (`U.emitForAgent` / `U.mcpEmitResult`)

For automation and MCP, prefer **structured lines** over many unrelated `print` strings:

- **`U.emitForAgent(kind, data)`** — prints one line: **`TR_AGENT_V1`** + space + **`JSON.encode` envelope** `{ v, seq, kind, t, data }`. Monotonic **`seq`** and **`os.time()`** in **`t`** help when **`prints` order** does not match strict execution order (coroutines / editor delivery).
- **`U.mcpEmitResult(data)`** — same format with **`kind`** = `"result"` (final or summary payloads). Put your fields inside **`data`** (e.g. `{ test = "easing", ok = true, steps = {...} }`).

**Host parsing:** find lines starting with **`TR_AGENT_V1`**, strip the prefix and the first space, **`JSON.parse`** the remainder. Prefer **`kind === "result"`** for pass/fail; use other **`kind`** values (e.g. `"trace"`) for progress.

**When to use:** Any `tts_execute_lua` snippet that must be parsed reliably; combine with **`return JSON.encode(...)`** when a string return is enough (see *Return values* above). Orchestrations using **`U.RunSequenceWithOptions`** should call **`U.mcpEmitResult`** from **`onComplete`** (and/or **`emitForAgent`** per step) so agents do not depend on idle timing alone.

Defined in [`lib/util.ttslua`](../lib/util.ttslua) (`U.AGENT_EMIT_LINE_PREFIX`, `U.emitForAgent`, `U.mcpEmitResult`).

## Orchestration (`U.RunSequence` / `U.RunSequenceWithOptions`)

Multi-step table logic in this project often uses [`U.RunSequence`](../lib/util.ttslua) (coroutine-driven via `U.waitUntil`). Important for agents:

1. **Non-blocking execute:** A Lua snippet invoked through the External Editor **returns as soon as the chunk finishes**. `U.RunSequence` / `U.RunSequenceWithOptions` **schedule** work in coroutines; they **do not** block the bridge until animations or waits finish. Treat completion as **asynchronous** unless you explicitly design otherwise.
2. **Completion hooks:** Use **`U.RunSequenceWithOptions(funcs, { onComplete = ... })`** for a single callback when the sequence finishes (`ok` plus optional `detail`: `step_error`, `sequence_timeout`, `cancelled`). You still get the returned **`isDone`** predicate: `local done = U.RunSequenceWithOptions(...);` later `done()`.
3. **Cancel / sequence timeout:** Pass **`cancelRegistry`** (`{ cancelled = false, reason = nil }`) and/or **`sequenceTimeoutSeconds`**. Waits use an **`abortCheck`** on `U.waitUntil` so timeouts and cancellation can end a step without waiting for the original condition.
4. **MCP observation:** Prefer **`onComplete`** plus **`U.mcpEmitResult`** / **`U.emitForAgent`**, and generous **`maxWaitMs` / `idleTimeoutMs`** on `tts_execute_lua`, over assuming a **`return`** from the snippet finalizes after long sequences.

Design notes: [`.dev/plans/2026-04-15-run-sequence-waituntil-orchestration.md`](plans/2026-04-15-run-sequence-waituntil-orchestration.md).

## Easing tests (`testEasingForMcp`, debug rig)

Hands-off easing validation + visual sequence: ensure the mod is loaded (Save & Play from this repo), then execute Global Lua such as:

```lua
return testEasingForMcp()
```

- **`DEBUG.ensureEasingTestRig()`** spawns or reuses three objects: tag **`debugObject`**, first line of GM Notes **`TR_DEBUG:v1 test=easing role=…`** (roles: `light`, `center`, `target`). Helpers live on **`U`** in [`lib/util.ttslua`](../lib/util.ttslua) (`U.DEBUG_OBJECT_TAG`, `U.getDebugObjectSingle`, `U.ensureDebugObject`, …). The **`center`** and **`target`** roles use **`spawnObjectData`** (`BlockSquare`); see *Pitfalls and obstacles* §2 for why **`spawnObject`** from Global execute is unsafe. After changing [`core/debug.ttslua`](../core/debug.ttslua), **Save & Play** before MCP-driven runs.
- **`DEBUG.destroyEasingTestRig()`** removes all tagged rig objects (unlocks then **`destruct()`**). **`DEBUG.testEasing`** calls it when the sequence finishes (or after validation-only runs) unless **`cleanupRig = false`**.
- **`testEasingForMcp()`** runs **`DEBUG.testEasing({ interactive = false, forMcp = true, ensureRig = false })`** after the rig is ensured; the visual sequence uses **`U.RunSequenceWithOptions`** and emits a final summary via **`U.mcpEmitResult`** (`TR_AGENT_V1` / `kind: "result"`). Parse **`prints`** for those lines; **`returnValue`** is only a small JSON hint.
- **MCP:** pass a high **`maxWaitMs`** (up to **120000**) for the full run; default **`idleTimeoutMs`** is **90000** in the bridge when omitted.

## Scripts (local)

| Command | Description |
|---------|-------------|
| `npm run tts-bridge:build` | Compile only `tts-bridge`. |
| `npm run tts-bridge:test` | Vitest suite for the bridge (mock TTS, no game). |
| `npm run tts-mcp:build` | Build bridge + MCP. |
| `npm run tts-mcp:start` | Run the MCP server on stdio (normally Cursor spawns this; useful for debugging). |
| `npm run tts-bridge:listen` | Bridge only: listen on **39998** and persist Lua **`sendExternalMessage`** `type: "write"` to **`.dev/.debug/`** (no MCP). |
| `npm run tts-bridge:run-easing-mcp-test` | Build bridge, then run **`testEasingForMcp()`** against live TTS (long timeouts; same style as MCP execute). |

**File writes from Lua:** When the bridge holds **39998**, inbound **`messageID` 4** with `customMessage.type === "write"` is written under **`.dev/.debug/`** (see [DEBUG_FILE_LOGGING.md](DEBUG_FILE_LOGGING.md)). MCP startup calls **`ensureListening()`** so this works before the first `tts_execute_lua`.

## References

- In-repo API notes: [External Editor API.md](tts-api/Getting%20Started/External%20Editor%20API.md)
- Bundling / ports: [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md)
