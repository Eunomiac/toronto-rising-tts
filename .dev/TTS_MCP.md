# Tabletop Simulator MCP (TTS Tools extension)

## Agent Routing

Read this when:
- running Lua in live TTS from an agent (`tts_execute_lua`)
- interpreting MCP `prints` / `returnValue` / `TR_AGENT_V1` lines
- debugging External Editor message flow or `.dev/.debug/` writes (`.tools/tts-bridge/`)

Source of truth:
- MCP server: `tts-tools/packages/tts-editor/src/mcp/` (fork of TTS Tools; docs `docs/modules/ROOT/pages/mcp.adoc`)
- `.tools/tts-bridge/` (repo-local listener / write sink / scripts — not the MCP)
- `.dev/tts-api/Getting Started/External Editor API.md`
- `lib/util.ttslua` agent-output helpers

Verification:
- In `tts-tools/packages/tts-editor`: `npm run smoke:mcp` (TTS running, gateway up)
- Agent: call `tts_status`, then `tts_execute_lua` with `return 1 + 1`

Status: current.

The **TTS Tools extension** (fork, 2.6.0+) ships an MCP server named **`tts-tools`** and registers it with Cursor on activation — no `mcp.json` entry needed. It joins the local **TTS gateway** (control port **39997**) as route tag **`MCP`**, so it runs **alongside** the extension and the Storyteller Dashboard. It never binds **39998** itself: if the gateway is down (for example after **Release TTS Editor Port**), tool calls say so, and the next call reconnects once the gateway is back.

Requirements: TTS open with a save loaded, the TTS Tools extension active (it starts the gateway), `node` on PATH. Opt out with the extension setting `ttsEditor.mcp.enabled`.

## Port conflict (39998)

The gateway helper holds **39998**; the extension, Dashboard, and MCP all share it through **39997**. Repo-local tools that bind **39998** directly (`npm run tts-bridge:listen`, `tts-bridge` scripts) still need the gateway released first. To stop leftover **node** listeners without touching Cursor or Tabletop Simulator:

```bash
npm run tts-bridge:free-port
```

Cursor **Run Task → FREE TTS EDITOR PORT (39998)** runs the same command. `npm run tts-bridge:free-port -- --dry-run` lists holders only. See [TTS_BUNDLING_SETUP.md — Issue 0b](TTS_BUNDLING_SETUP.md#issue-0b-port-39998-already-in-use-eaddrinuse).

**Bridge only** (write sink to `.dev/.debug/`, no MCP): `npm run tts-bridge:listen` — binds **39998**; release the extension's port first.

## Tools exposed

| Tool | Purpose |
|------|---------|
| `tts_execute_lua` | Execute `script` in Global (default `guid` `"-1"`) or an object's script context. Waits for TTS to report the chunk finished — TTS **always** sends that, with `returnValue` when the chunk returns one — or a Lua error, or **`maxWaitMs`** (default 30000, max 120000). **`listenAfterReturnMs`** keeps collecting `prints` after the chunk returns (for `Wait.time` / `U.chain` output). Returns `returnValue`, `prints`, `error`, `customMessages`, `finishedBy`, `timedOut`. A Lua error marks the tool result as an error. In mod Lua, prefer **`U.emitForAgent`** / **`U.mcpEmitResult`** (`TR_AGENT_V1` lines in `prints`) for structured output. |
| `tts_send_custom_message` | Send `messageID: 2` with a JSON object; TTS delivers it to `onExternalMessage` in Lua. Fire-and-forget (no output capture). |
| `tts_status` | Whether the MCP is connected through the gateway. |

**Prints are broadcast:** the gateway sends every TTS print to every client, so output from other scripts running at the same moment (Save & Play, Dashboard calls) can appear in `prints`. Lua can unicast a line with the `<@MCP@>` prefix.

**Execute context:** The target object must already have a script slot in TTS, or execute fails (see External Editor API “Execute Lua Code”).

## Pitfalls and obstacles (agents)

These issues showed up while running Toronto Rising Lua through **`tts_execute_lua`** / **`TtsExternalEditorBridge`**. They are easy to misread as “MCP is broken” or “the test harness failed” when the real cause is TTS execute context or stale bundles.

### 1. Live game must match the repo (Save & Play)

- External Editor runs whatever is **bundled into the save**, not the files on disk. After changing **`core/debug.ttslua`**, **`lib/util.ttslua`**, or other bundled scripts, you need **Save & Play** (or equivalent) so TTS loads the new code.
- **Symptom:** A quick probe like `print(type(DEBUG.rollTest))` prints `function`, but a fuller call still fails or behaves like old code — the Global chunk can be partially updated or you may be mis-attributing errors. When in doubt, **re-bundle and reload** before long debugging sessions.
- **Rule of thumb:** If the docs say a fix exists in repo but TTS still misbehaves, assume **bundle drift** until you confirm a fresh Save & Play.

### 2. `spawnObject` from Global execute can crash the host

- On at least some TTS builds, calling **`spawnObject({ type = "Block", ... })`** from a **Global** script executed via the External Editor (**`guid` `"-1"`**) triggers a **.NET null-reference** on the game side. The bridge often reports this as **`Object reference not set to an instance of an object`** with **`[Global] Lua Error <executeScript>`**, sometimes with **no useful `prints`** (failure happens before Lua prints).
- **`spawnObjectData({ data = ..., position = ... })`** with a valid built-in **`Name`** (e.g. **`BlockSquare`** for simple blocks) has been observed to work from the same execute path. Prefer **`spawnObjectData`** over **`spawnObject`** for MCP-driven spawns; see spawn patterns in [`core/npcs.ttslua`](../core/npcs.ttslua).
- **When adding MCP-driven setup that spawns objects:** prefer **`spawnObjectData`** (or patterns already used in **`core/npcs.ttslua`**) and verify from a **minimal** execute snippet before wiring full tests.

### 3. Diagnosing “empty prints + generic host error”

1. Run **`print("step0")`** — confirms execute path works.
2. Wrap the suspect call in **`pcall`** and **`print` the results — confirms Lua vs host crash and surfaces Lua errors if any.
3. If the suspect path spawns objects, try the smallest **`spawnObject`** vs **`spawnObjectData`** comparison (see §2).
4. Use a small **checked-in script** under **`.tools/tts-bridge/scripts/`** instead of one-liner **`node -e`** on Windows — **PowerShell quoting** breaks easily on embedded Lua strings.

### 4. Long-running sequences and timeouts

- **`U.chain`** does **not** block until the sequence finishes; the execute chunk returns while coroutines run. Rely on **`onComplete`**, **`U.mcpEmitResult`**, and **`prints`** (see *Orchestration* and *Machine-readable agent lines*).
- For multi-step visual sequences, raise **`maxWaitMs`** (up to **120000**) and set **`listenAfterReturnMs`** to the longest **quiet** gap between prints in the sequence (e.g. **10000–20000**). See the tools table above.

### 5. Execute finished but the sequence did not (`listenAfterReturnMs`)

- **`messageID` 5** reflects **“chunk returned”**, not **“animations + `onComplete` finished”**. Without `listenAfterReturnMs`, the tool returns right after the chunk (plus a 250 ms grace for trailing prints/errors), so later `U.chain` output is missed.
- With `listenAfterReturnMs`, the call stays open until that much silence passes after the last print, capped by `maxWaitMs`. Too large a value means waiting out silence after the final `TR_AGENT_V1` line — not TTS still working.

### 6. Local harness (bridge smoke)

- **`npm run tts-bridge:run-sequence-test`** — smaller **`U.chain`** live check against TTS.

**Manual E2E:** Periodic in-table verification uses [`.dev/E2E Playbooks/`](E2E%20Playbooks/README.md) (not automated MCP easing tests).

## Return values (`messageID` 5) and structured data

The [External Editor API](tts-api/Getting%20Started/External%20Editor%20API.md) states that executed Lua may send a **return** back as inbound **`messageID` 5** with a **`returnValue`** field. In practice TTS sends `messageID` 5 after **every** execute (verified 2026-10-01 through the gateway, ~1.3 s round trip), but treat the **value** as **best-effort**:

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

**When to use:** Any `tts_execute_lua` snippet that must be parsed reliably; combine with **`return JSON.encode(...)`** when a string return is enough (see *Return values* above). Orchestrations using **`U.chain`** should call **`U.mcpEmitResult`** from **`onComplete`** (and/or **`emitForAgent`** per step) so agents do not depend on idle timing alone.

Defined in [`lib/util.ttslua`](../lib/util.ttslua) (`U.AGENT_EMIT_LINE_PREFIX`, `U.emitForAgent`, `U.mcpEmitResult`).

## Debug objects (`debugObject` + `TR_DEBUG:v1`)

For MCP or debug flows that need stable table objects, use the shared debug-object utilities in [`lib/util.ttslua`](../lib/util.ttslua):

- Tag debug rig objects with `U.DEBUG_OBJECT_TAG` (`"debugObject"`).
- Put `TR_DEBUG:v1 test=<testId> role=<role>` on the first GM Notes line.
- Resolve existing objects with `U.getDebugObjectSingle(testId, role, opts)`.
- Create missing objects with `U.ensureDebugObject(testId, role, factory, opts)`, which tags the created object and writes the GM Notes header.

When a flow creates objects from MCP, prefer `spawnObjectData` over `spawnObject`; see the host-crash warning above.

### Sync performance metrics (`kind` = `sync_metrics`)

When profiling sync cost, enable metrics before exercising the game:

```lua
Sync.setMetricsEnabled(true)
-- or persist: S.setStateVal({ syncMetricsEnabled = true }, "debug")
```

Then trigger `Sync.full({ reason = "..." })` or `Sync.player("Red")`. Each pass emits one **`TR_AGENT_V1`** line with **`kind`** = **`sync_metrics`** and **`data`** fields such as **`pass`** (`full` | `player` | `bootstrap_retry`), **`reason`**, **`force`**, **`elapsedSec`**, **`soundscapeFadeSteps`**, and **`color`** (player pass).

NPC preload batches emit **`kind`** = **`npc_preload`** with **`characterCount`**, **`missingCount`**, and **`spawnPairsIssued`**.

**Verification:** Save and Play, run a hunger change or load, then parse MCP **`prints`** for `TR_AGENT_V1` lines (filter `kind === "sync_metrics"`). Compare before/after optimization work.

## Orchestration (`U.chain`)

Multi-step table logic in this project often uses [`U.chain`](../lib/util.ttslua) (coroutine-driven inter-step waits). Important for agents:

1. **Non-blocking execute:** A Lua snippet invoked through the External Editor **returns as soon as the chunk finishes**. `U.chain` **schedules** work in coroutines; it **does not** block the bridge until animations or waits finish. Treat completion as **asynchronous** unless you explicitly design otherwise.
2. **Completion hooks:** Use **`U.chain(funcs, { onComplete = ... })`** for a single callback when the sequence finishes (`ok` plus optional `detail`: `step_error`, `step_timeout`, `sequence_timeout`, `cancelled`). You still get the returned **`isDone`** predicate: `local done = U.chain(...);` later `done()`.
3. **Cancel / sequence timeout:** Pass **`cancelRegistry`** (`{ cancelled = false, reason = nil }`) and/or **`sequenceTimeoutSeconds`**. Waits use an **`abortCheck`** on `U.await` so timeouts and cancellation can end a step without waiting for the original condition.
4. **MCP observation:** Prefer **`onComplete`** plus **`U.mcpEmitResult`** / **`U.emitForAgent`**, and generous **`maxWaitMs` / `listenAfterReturnMs`** on `tts_execute_lua`, over assuming a **`return`** from the snippet finalizes after long sequences.
5. **Console `print` order:** Multiple `print` calls in one Lua function do **not** reliably appear in source order in the TTS console / `prints` array. Inside `U.chain` / `U.stagger`, isolate each `print` / `printHeader` in its own step (see [Dice-E2E.md](E2E%20Playbooks/Dice-E2E.md)). Prefer `log` for table dumps, or `U.emitForAgent` / `U.mcpEmitResult` when order must be reconstructed via `seq` / `t`. Full rule: [TESTING.md § Console print ordering](TESTING.md#console-print-ordering-tts).

## Scripts (local)

| Command | Description |
|---------|-------------|
| `npm run tts-bridge:build` | Compile only `tts-bridge`. |
| `npm run tts-bridge:test` | Vitest suite for the bridge (mock TTS, no game). |
| `npm run build` | **Main** pipeline (default Ctrl+Shift+B): daily save backup, gates, object stub fix. |
| `npm run build:xml` | Main + UI XML / template generators + Global XmlUI embed. |
| `npm run build:full` | Full tooling (backup + `build:all-tooling`): sheets, JSON embeds, XML, stubs, CustomUIAssets merge. |
| `npm run build:all-tooling` | Full generator chain without the daily backup. |
| `npm run tts-bridge:listen` | Bridge only: listen on **39998** and persist Lua **`sendExternalMessage`** `type: "write"` to **`.dev/.debug/`** (no MCP). |
| `npm run tts-bridge:free-port` | Stop leftover **node** listeners on **39998** (dashboard / bridge). Leaves Cursor and Tabletop Simulator alone. `--dry-run` lists only. |

**File writes from Lua:** When the bridge holds **39998**, inbound **`messageID` 4** with `customMessage.type === "write"` is written under **`.dev/.debug/`** (see [DEBUG_FILE_LOGGING.md](DEBUG_FILE_LOGGING.md)). The bundled MCP server does not handle `write` messages.

## References

- In-repo API notes: [External Editor API.md](tts-api/Getting%20Started/External%20Editor%20API.md)
- Bundling / ports: [TTS_BUNDLING_SETUP.md](TTS_BUNDLING_SETUP.md)
