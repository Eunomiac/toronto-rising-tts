# MCP utilities and easing test consumer (Phase 2)

## Prerequisite

Complete **[RunSequence, waitUntil, and MCP-safe orchestration (Phase 1)](2026-04-15-run-sequence-waituntil-orchestration.md)** first. This phase assumes **`U.RunSequence`** (or successor) provides a **documented completion path** so easing and other tests do not implement private wait loops.

**Context:** [Improving MCP TTS Interface.md](Improving%20MCP%20TTS%20Interface.md)

---

## Scope (what Phase 2 adds)

1. **`debugObject` tag + structured GM Notes** — Generic helpers in [`lib/util.ttslua`](../lib/util.ttslua) to resolve / ensure debug-spawned objects (parseable GM Notes, duplicate policy, `ensure` factory). No per-test tag proliferation.
2. **`U.mcpEmitResult` / `U.emitForAgent`** — Already in [`lib/util.ttslua`](../lib/util.ttslua): lines prefixed with **`TR_AGENT_V1`** + JSON envelope (`kind`, `seq`, `data`). Use from tests and **`U.RunSequenceWithOptions` `onComplete`**; see [`.dev/TTS_MCP.md`](../TTS_MCP.md) (*Machine-readable agent lines*).
3. **MCP bridge** — Lenient default **`idleTimeoutMs`** in [`.tools/tts-mcp/src/index.ts`](../.tools/tts-mcp/src/index.ts); agents opt into shorter timeouts via tool args.
4. **Easing rig + tests** — `DEBUG.ensureEasingTestRig()`, refactor **`DEBUG.testEasing`**: `interactive` flag, pause audit (remove vs condition-wait), use Phase 1 sequence completion + `mcpEmitResult` / return per documented contract; **`testLookAt`** aligned; thin **`testEasingForMcp`** (or equivalent).
5. **Documentation** — Expand [`.dev/TTS_MCP.md`](../.dev/TTS_MCP.md) as the agent playbook (debug objects, MCP results, timeouts, easing example).

---

## Problem recap (Phase 2 only)

### Resolvable world objects

Hardcoded GUIDs in easing / `testLookAt` rot when objects are deleted. **Solution:** `debugObject` + GM Notes helpers + `ensureEasingTestRig` (spotlight via [`lib/npcs_light_spawn_defaults.ttslua`](../lib/npcs_light_spawn_defaults.ttslua), blocks for markers).

### Interactive pauses

`continueTest()` blocks agents. **Solution:** `interactive = false` for automation; audit pauses — remove human-only delays or replace with **`U.waitUntil`** / object-at-rest / real readiness conditions.

### MCP completion semantics

Bridge uses return + idle + `maxWait`. **Solution:** `mcpEmitResult`, lenient idle defaults, document patterns (from Phase 1 verification).

---

## Files to touch (expected)

| File | Role |
|------|------|
| [`lib/util.ttslua`](../lib/util.ttslua) | `debugObject` + GM Notes helpers; (`emitForAgent` / `mcpEmitResult` done) |
| [`core/debug.ttslua`](../core/debug.ttslua) | Easing rig; `testEasing` / `testLookAt`; MCP entry |
| [`.tools/tts-mcp/src/index.ts`](../.tools/tts-mcp/src/index.ts) | Default timeouts |
| [`.dev/TTS_MCP.md`](../.dev/TTS_MCP.md) | Agent playbook |

---

## Verification

- Rig spawns once, reuses tagged objects on second run.
- `testEasing()` manual / interactive unchanged in default mode.
- `testEasingForMcp()` (or equivalent) completes unattended with structured outcome.
- MCP: one `tts_execute_lua` run matches documented contract from Phase 1 + Phase 2.

---

## Implementation todos

1. Implement `debugObject` + GM Notes util API and document format string (e.g. `TR_DEBUG:v1` line or JSON).
2. Wire easing summary / MCP entry to **`U.mcpEmitResult`** (already in util).
3. Adjust `tts-mcp` defaults and document agent-passed shorter timeouts.
4. Refactor easing test + rig + pause audit; use Phase 1 `RunSequence` completion — **no bespoke sequence polling in debug.ttslua**.
5. Flesh out `.dev/TTS_MCP.md` with copy-paste examples.
