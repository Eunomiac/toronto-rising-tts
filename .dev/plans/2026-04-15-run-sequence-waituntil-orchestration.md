# RunSequence, waitUntil, and MCP-safe orchestration (Phase 1)

## Purpose

Deliver a **single, well-tested orchestration layer** in [`lib/util.ttslua`](../lib/util.ttslua) so multi-step TTS flows (debug tests, scenes, lighting, NPCs, future agent scripts) share:

- A clear **completion contract** (success, timeout, cancel, errors).
- **Predictable timeouts** (per-step and optional whole-sequence).
- **Observability** (step identity for logs and MCP reports).
- **Documented interaction** with the External Editor / [`tts_execute_lua`](../.tools/tts-mcp/src/index.ts) execution model (return vs deferred work vs sentinel prints).

This plan is **Phase 1**. After it is done, continue with **[MCP utilities and easing consumer (Phase 2)](2026-04-15-mcp-phase2-debug-objects-easing.md)**.

**Broader context:** [Improving MCP TTS Interface.md](Improving%20MCP%20TTS%20Interface.md)

---

## Current behavior (baseline)

### `U.waitUntil(afterFunc, testRef, isForcing, maxWait, testFrequency)`

- Coroutine-driven (`startLuaCoroutine`); **`afterFunc` runs when `testRef` condition passes** (or when `isForcing` + timeout).
- **`maxWait`** defaults to **60** seconds per wait; **`testFrequency`** defaults to **0.1** s between checks.
- Returns **`function() return afterReturnVal ~= nil`** — a done-predicate, not a blocking wait.
- On timeout without `isForcing`, alerts GM and can **spin** (loop continues); callers should understand this when choosing `maxWait`.

### `U.RunSequence(funcs, maxWait, frequency)`

- Mutates `funcs` with **`U.shift`** (callers must pass a disposable table or accept consumption — document).
- For each step: schedules **`U.waitUntil`** where the step function runs, then **`runNextFunc(thisFunc())`** uses the step’s **return value** as the next `testRef` (number / object / function / table / nil default delay).
- Returns **`function() return isDone`** — **does not block**; **no `onComplete`**, **no global sequence timeout**, **no step labels**.

### Call sites (grep maintenance)

| Location | Usage |
|----------|--------|
| [`core/debug.ttslua`](../core/debug.ttslua) | Multiple sequences (tests, easing animations, etc.) |
| [`core/scenes.ttslua`](../core/scenes.ttslua) | Scene lerp sequence |
| [`core/lighting.ttslua`](../core/lighting.ttslua) | Lighting sequence |

Any signature or semantics change must remain **backward compatible** unless a call site is intentionally migrated.

---

## Problems this phase solves

1. **Post-sequence work is ad hoc** — Callers cannot attach “when the whole sequence finishes” without polling `isDone()` or duplicating `Wait.time` glue.
2. **No whole-sequence timeout** — Only per-`waitUntil` `maxWait` applies per step; long sequences can exceed expectations without a single cap.
3. **Limited observability** — Hard to name a failing step or emit a structured report for MCP.
4. **MCP ambiguity** — Unclear whether one `execute` can **block until** `isDone`, or whether completion must use **`U.mcpEmitResult`** (Phase 2 adds the helper) or a follow-up execute; this plan **documents the verified contract** next to the API.
5. **`waitUntil` timeout behavior** — May deserve optional stricter “abort and signal” modes for agent-driven runs (design without breaking existing GM-facing alerts).

---

## Design principles

- **Backward compatibility:** Existing `U.RunSequence(funcs)` and `U.RunSequence(funcs, maxWait, frequency)` behave as today.
- **Opt-in power:** New behavior via optional **`opts` table** (preferred) or a **new named entry point** (e.g. `U.RunSequenceWithOptions`) if signature overload is too ambiguous in Lua.
- **One completion signal:** If `onComplete` (or equivalent) is supplied, it runs **exactly once** with a structured status (finished / sequence_timeout / cancelled / step_error where detectable).
- **Cancellation is best-effort** — Nested coroutines may limit hard cancellation; document what “cancel” actually guarantees (e.g. stop scheduling further steps).
- **Keep the step model** — Steps remain functions returning `waitUntil` test refs; avoid forcing a new abstraction unless necessary.

---

## Proposed API surface (implementation picks one shape)

**Option A — Trailing `opts` on `U.RunSequence`:**

```lua
U.RunSequence(funcs, maxWait, frequency, opts)
```

`opts` may include: `onComplete`, `sequenceTimeoutSeconds`, `stepNames`, `onStepStart`, `onStepEnd`, `cancelRegistry`, etc.

**Option B — New function:**

```lua
U.RunSequenceExt(funcs, { maxWait = ..., frequency = ..., onComplete = ..., ... })
```

Preserve `U.RunSequence` as a thin wrapper.

**`waitUntil` (optional in this phase):**

- Add **`opts`** or **`U.waitUntilExt`** only if needed for: timeout policy (alert vs silent fail), returning **reason** to caller, or cooperating with sequence-level cancel.
- Avoid large rewrites unless a concrete call site requires it.

---

## MCP / External Editor contract (verify during implementation)

1. **Does** a Lua `execute` chunk **block** the bridge until all nested `waitUntil` / sequence work finishes, or does the chunk **return immediately** while coroutines run?
2. If non-blocking: document that **completion** for agents must use **sentinel print** (`TR_MCP_RESULT` — implemented in Phase 2) and/or **long `maxWaitMs` / `idleTimeoutMs`** on `tts_execute_lua`, or a **second** MCP call that polls `isDone()`.
3. If blocking: document that **`return JSON.encode(...)`** after sequence completion is valid for one-shot agent runs.

Record findings in **JSDoc-style Lua header** on `U.RunSequence` and in [`.dev/TTS_MCP.md`](../.dev/TTS_MCP.md) (minimal cross-link in Phase 1; Phase 2 expands the playbook).

---

## Testing and verification

- **Grep:** all `U.RunSequence(` call sites — smoke test in TTS after changes.
- **New sequences:** add a tiny **Global-only debug snippet** or existing debug test that uses **`onComplete`** and asserts it fires once (manual or automated via MCP once Phase 2 lands).
- **Regression:** scenes + lighting sequences still run without new parameters.
- **Optional:** extract pure helpers (e.g. elapsed time, status enums) for **Vitest** under `.tools/tts-bridge` only if practical; do not block on off-TTS tests if not feasible.

---

## Deliverables checklist

- [x] `U.RunSequenceWithOptions` with **onComplete**, **sequence timeout**, **cancelRegistry**, **step names** / **onStepStart** / **onStepEnd**; `U.RunSequence` delegates without behavior change.
- [x] **`U.waitUntil`** optional **`abortCheck`** (6th arg) for cooperative abort.
- [x] Documented **MCP / execute** behavior in Lua headers and `.dev/TTS_MCP.md`.
- [x] **Backward-compatible** `U.RunSequence(funcs, maxWait, frequency)` call sites.
- [x] `.dev/TTS_MCP.md` — subsection “Orchestration (`U.RunSequence` / `U.RunSequenceWithOptions`)”.
- [ ] Optional follow-up: stricter `waitUntil` timeout modes; timer cancellation on early sequence complete.

---

## Follow-on (Phase 2 and beyond)

- **`debugObject` + GM Notes** helpers, easing rig, **`testEasingForMcp`**, lenient MCP idle defaults — see **[Phase 2 plan](2026-04-15-mcp-phase2-debug-objects-easing.md)**. (**`U.emitForAgent` / `U.mcpEmitResult`** landed early in `lib/util.ttslua`; see `.dev/TTS_MCP.md` *Machine-readable agent lines*.)

---

## Implementation todos

1. Audit call sites and decide **Option A vs B** for API shape.
2. Implement completion + sequence timeout + step labels (minimal viable).
3. Verify External Editor execute blocking behavior; document.
4. Manual TTS regression: debug sequence, scenes, lighting.
5. Cross-link Phase 2 plan and land small `.dev/TTS_MCP.md` note.
