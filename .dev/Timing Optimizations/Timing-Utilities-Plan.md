# Timing utilities — findings & recommendations

## Agent Routing

Read this when:
- changing `U.delay`, `U.waitForCondition`, `U.waitUntil`, `U.RunSequence`, `U.Lerp`, or related helpers in `lib/util.ttslua`
- deciding whether to add a new wait/sequence helper vs reuse `U.RunSequence`
- investigating stalled sequences, sub-second wait drift, or coroutine/`CheckCoroutine` faults

Source of truth:
- `lib/util.ttslua` (§ Time & Sequence Utilities; § Animation & Interpolation)
- [`docs/solutions/lua-wait-api-policy.md`](../../docs/solutions/lua-wait-api-policy.md)
- TTS APIs: [Wait](https://api.tabletopsimulator.com/wait/), [Time](https://api.tabletopsimulator.com/time/), [Base `startLuaCoroutine`](https://api.tabletopsimulator.com/base/)

Verification:
- `npm run check:pcall-gate` (Wait.time / Wait.condition counts outside util)
- Save & Play + one `U.RunSequence` path (e.g. phase Advance, blindfold staged transition, or `RunTest` Dice step)
- Concurrent smoke: two overlapping waits/lerps (unique-name regression)

Status: plan from 2026-07-30 research; not yet implemented.

---

## Goals

1. Keep accurate, cancellable timing for the many call sites that depend on `U.chain` / merged `U.delay` / `U.Lerp`.
2. Avoid the known TTS footgun: nesting timed `Wait.time` inside a `Wait.condition` completion callback (startup gate / loading-overlay notes).
3. Consolidate onto **`U.delay` / `U.chain` / `U.stagger`**; purge obsolete timing APIs with **loud errors**, not compatibility shims.

---

## Background: two TTS async models

| Model | Mechanism | Pauses caller? | Best for |
| --- | --- | --- | --- |
| **`Wait.*`** | Engine schedules callbacks (`time`, `condition`, `frames`); cancel via `Wait.stop(id)` | No | One-shot delays, polls, die settle from hot object events |
| **`startLuaCoroutine`** | Named function on Global/object; `coroutine.yield(0)` = next frame; must `return 1` | No (coroutine resumes later) | Multi-step sequences that mix delays + predicates without nesting `Wait.time` inside `Wait.condition` |

Stock Lua coroutines are cooperative only. TTS does **not** give wall-clock yield; only frame yields. Wall-clock accuracy must come from `Time.time` / `Wait.time`, not `os.time()` (1-second resolution).

Host-only: all Lua timing runs on the host. Clients see replicated world/UI, not local coroutine execution.

---

## Current utility map

```text
Wait.time ─────────► U.delay / U.stopDelay
                      └─► U.scheduleAtOffsets (same callback, many offsets)
                      └─► U.sequence (staggered fire-and-forget; NOT dependent)

Wait.condition ────► U.waitForCondition
                      └─► U.runAfterObjectPhysicsSettled
                      └─► U.waitRestingSequence (delay + condition; nests delay — anti-pattern)

startLuaCoroutine ─► U.waitUntil  (CheckCoroutine; delay | object | pred | AND table)
                      └─► U.RunSequence / U.RunSequenceWithOptions
                      └─► U.Lerp / LerpPath / LerpDeferred (unique names already)
```

Policy: game code must not call `Wait.time` / `Wait.condition` directly — see wait-api policy. `Wait.frames` is still used raw in several modules (ungated).

---

## Findings (bugs / limitations)

### P0 — `os.time()` clocks (~1s resolution)

`U.waitUntil` number waits, `maxWait` elapsed checks, and `U.Lerp` progress all use `os.time()`.

Effects:
- `return 0.5` / fractional sequence steps quantize to whole seconds
- Sub-second lerps can jump in coarse steps
- Blindfold / scene / phase timing that authors write as fractional seconds is noisier than intended

**Recommendation:** use `Time.time` (TTS Unity clock; documented as more accurate than `os.time()`). Fallback candidate: `os.clock()` (already used for load mono labels in util).

### P0 — `maxWait` often never starts; timeout does not abort

`waitStartTime` is only set when a **number** test runs. Pure function/object waits leave `elapsedTime == 0`, so `maxWait` never fires.

When timeout *does* fire and `isForcing` is false (`RunSequence` always passes false), the waiter AlertGMs and **keeps looping** instead of aborting.

**Recommendation:** start a wall clock at waiter creation; on exceed, abort (or honor `isForcing`); surface through `RunSequenceWithOptions` `cancelRegistry` / `onComplete(false, "sequence_timeout"|step timeout)`.

### P1 — Shared global name `CheckCoroutine`

Every `U.waitUntil` assigns `function CheckCoroutine()` and `startLuaCoroutine(..., "CheckCoroutine")`. `U.Lerp` already uses unique `LerpCoroutine_<id>` names.

Sequential `RunSequence` steps usually overwrite only after the prior waiter finishes, so day-to-day may look fine. Concurrent waiters race the name. Comments in lighting / dice already treat `CheckCoroutine` as unreliable from some spawn/randomize callbacks.

**Recommendation:** unique `_G` name per waiter; clear on exit (mirror Lerp).

### P1 — Poll loop assumes 60 FPS

`testFrequency` is converted with `math.floor(testFrequency * 60)` frame yields. Host FPS changes effective poll interval.

**Recommendation:** yield one frame per loop; gate re-check / timeout with `Time.time`.

### P2 — `waitRestingSequence` nests `U.delay` inside condition completion

Matches the documented anti-pattern that forced startup to use `RunSequence` instead of condition+delay nesting.

### P3 — `Wait.frames` bypasses util / pcall-gate

Used in Global, CSHEET, rolls, gameboard. Optional thin `U.delayFrames` for consistency — not required for correctness.

---

## Recommended work slices

| Slice | Change | Call-site impact | Risk |
| --- | --- | --- | --- |
| **A** | `os.time` → `Time.time` in `waitUntil` + `Lerp` (+ any sibling timing in those paths) | None (API stable) | Low |
| **B** | Always-on timeout clock; abort non-forcing waits; plumb cancel | Behavior change for hung waits (desirable) | Medium — smoke scene/phase/blindfold |
| **C** | Unique `waitUntil` coroutine names | None | Low |
| **D** | Time-gated single-frame poll | Slight timing shift | Low |
| **E** | Delete or rewrite `waitRestingSequence` onto `RunSequence` | None if unused (verify grep) | Low |
| **F** (optional) | Wait-predicate-encoded sequence (delays as `Time.time` preds inside `Wait.condition`) to retire coroutines for `RunSequence` | Keep `RunSequence` surface | Higher — needs nest-bug proof |

Do **not** start with F. A–D deliver most of the value behind the existing sequencer API.

---

## Consolidation analysis: is everything just `RunSequence`?

### Design intent (confirmed)

`U.RunSequence` is the intended one-size-fits-all **dependent sequencer**: each step runs, then its return value is a `waitUntil` `testRef` (number seconds, object resting, predicate, AND-table, or nil → default 0.5s) before the next step.

`U.RunSequenceWithOptions` is the same sequencer plus cancel / timeout / step hooks / `onComplete`.

`U.waitUntil` is not a competing sequencer — it is the **primitive** `RunSequence` uses between steps (and is callable alone for a single wait-then-callback).

### Capability vs transport

Several helpers **overlap in capability** with `RunSequence` / `waitUntil` but differ in **transport** (`Wait.condition` vs coroutine) or **scheduling shape** (parallel vs dependent). Overlap ≠ safe merge without preserving transport.

### Per-helper verdict

| Helper | Variation of `RunSequence`? | Merge? | Notes |
| --- | --- | --- | --- |
| **`U.RunSequenceWithOptions`** | It *is* the sequencer | Keep | Canonical full API; `RunSequence` is the thin wrapper |
| **`U.waitUntil`** | Primitive under the sequencer | Keep | Single wait-then-callback; do not force every one-liner into a 2-step table |
| **`U.delay` / `U.stopDelay`** | No | Keep | Thin `Wait.time`; cancellable; building block |
| **`U.waitForCondition`** | No | Keep | Thin `Wait.condition`; required transport for hot object/spawn paths |
| **`U.runAfterObjectPhysicsSettled`** | **Capability yes; transport no** | **Keep for now** | See deep dive below |
| **`U.waitRestingSequence`** | Yes (multi-step settle chain) | **Delete or rewrite** | Same resting rules; implemented with nested delay+condition; **no production call sites** found outside util/docs (2026-07-30 grep) |
| **`U.sequence`** | **No** | Keep | Fire-and-forget staggered `U.delay` offsets; steps do **not** wait for each other |
| **`U.scheduleAtOffsets`** | **No** | Keep | Same callback at many wall-clock offsets (Sync bootstrap retries) |
| **`U.Lerp*`** | Related (often returned from sequence steps) | Keep | Frame animation; already unique-named coroutines |

### Deep dive: `U.runAfterObjectPhysicsSettled`

**Author intuition is half-right:** waiting until an object is not `loading_custom` and `resting`, then running a callback, is expressible with `RunSequence` / `waitUntil`, e.g.:

```lua
U.RunSequence({
  function()
    return function()
      local o = getObject()
      if o == nil then return true end
      if o.loading_custom == true then return false end
      return o.resting == true
    end
  end,
  function()
    callback(getObject())
  end,
})
```

Or, if a stable object ref exists: `return obj` from a step (object `testRef`).

**Why it still exists as a separate helper:**

1. **Transport** — Implemented with `U.waitForCondition` (`Wait.condition`), not `CheckCoroutine`. Dice WP reroll and lighting comments document that coroutine waiters are unreliable from `onObjectRandomize` / some spawn callbacks.
2. **Re-resolve** — Polls `getObject()` each tick (destroy / GUID refresh). `waitUntil(obj)` holds a userdata snapshot.
3. **`completeEarlyIf`** — Cancel-token style early success without inventing a sequence cancel registry at every call site.
4. **Ergonomics** — One call from hot roll paths vs a two-step table.

**Merge rule:** Do **not** replace call sites with `RunSequence` until slice **C** (unique names) is proven safe from `onObjectRandomize`. Even then, prefer keeping a **thin alias** that stays on `Wait.condition`:

```lua
-- Future shape (illustrative): same public name, still Wait.condition under the hood
function U.runAfterObjectPhysicsSettled(...)
  -- stay on Wait.condition; optionally share resting-predicate helper with waitUntil's object branch
end
```

Shared **predicate helper** (resting / loading_custom / nil-object) is a good consolidation; collapsing onto coroutine `RunSequence` is not, until transport parity is proven.

### What *can* merge soon

| Action | Target |
| --- | --- |
| Remove or rewrite | `U.waitRestingSequence` → express as `U.RunSequence` steps (or delete if unused) |
| Share predicate | Extract `objectPhysicsSettled(getObject)` used by `runAfterObjectPhysicsSettled` and `waitUntil`'s object branch |
| Docs | Teach “prefer `RunSequence` for multi-step; prefer `waitForCondition` / `runAfterObjectPhysicsSettled` for hot object events; prefer `delay` for one-shot timers” |

### What should stay separate

| Keep | Reason |
| --- | --- |
| `delay` / `waitForCondition` | Engine primitives; policy wrappers |
| `scheduleAtOffsets` | Parallel retries ≠ sequence |
| `sequence` | Parallel stagger ≠ dependent sequence |
| `runAfterObjectPhysicsSettled` | Wait.condition transport + getObject re-resolve |
| `waitUntil` | Single-shot primitive; engine for `RunSequence` |
| `Lerp*` | Animation loop, not step orchestration |

---

## Naming scheme (author direction 2026-07-30)

Rename for **scheduling shape**. Adopt the public trio:

| Name | Role |
| --- | --- |
| **`U.delay(callback, testRef, opts?)`** | One-shot: **delay the callback until X**. `testRef` = seconds \| predicate \| resting object \| AND-table. Absorbs today’s `U.delay` + `U.waitUntil`. Cancellable via `U.stopDelay`. |
| **`U.chain(funcs, opts?)`** | Dependent multi-step sequencer (today `RunSequence` / `WithOptions` merged — optional opts only). |
| **`U.stagger(funcs, timeDelay)`** | Parallel fixed-offset schedule (today `U.sequence`). |

```lua
U.delay(fn, 1.5)
U.delay(fn, dieObj)
U.delay(fn, function() return ready end)
local h = U.delay(fn, 2); U.stopDelay(h)

U.chain({
  function() UI.hide(id) return 3 end,
  function() restoreChildren() end,
}, { onComplete = ... })

U.stagger({ fnA, fnB, fnC }, 0.05)
```

| Current | Fate |
| --- | --- |
| `U.stopDelay` | Keep — stops any `delay` handle |
| `U.scheduleAtOffsets` | Keep (or `U.atOffsets`) |
| `U.waitForCondition` | Fold into `delay(cb, pred, opts)`; delete old name (loud `error` stub only if needed to catch stragglers) |
| `U.runAfterObjectPhysicsSettled` | Thin helper or `delay` + shared resting pred; **Wait.condition** on hot object paths — no parallel obsolete engine left behind |
| `U.waitRestingSequence` | Delete |
| `U.Lerp*` | Unchanged |
| Old names (`RunSequence`, `RunSequenceWithOptions`, `waitUntil`, `sequence`, …) | **Delete.** Assign stubs that **`error(...)`** with a clear migration message if anything still calls them — no silent aliases, no temporary shims |

### Hard cut — no backwards compatibility (author policy)

Aligns with repo development style (no “just in case” shims):

1. **No migration aliases / dual APIs.** Do not keep `U.RunSequence = U.chain` (or similar) “for one cycle.” Ship the new names only.
2. **Obsolete entry points must fail loudly.** If an old name must remain momentarily as a landmine while grepping finishes, it should be a function that **`error("Use U.chain instead of U.RunSequence", 2)`** (or equivalent) — never a forwarding alias. Prefer deleting the name entirely once call sites are migrated in the same change.
3. **Purge obsolete implementations.** Remove coroutine/`os.time` waiter bodies, unused `waitRestingSequence`, and dead helpers in the same change — do not leave parallel old engines “in case.”
4. **Surfaced errors are the migration signal.** Treat any hit of an old name or removed API as a bug to fix at the call site, not as a reason to restore compatibility.

### Pushback on this direction (honest)

**Not blocking — adopt `delay` as the merged one-shot name.**

Light naming cost: in TTS culture “delay” usually means seconds (`Wait.time`). “Delay until object rests” is a mild stretch. Mitigate with docs that lead with “delay callback until X.” The triad `stagger` / `chain` / `delay` is clearer than today’s run/sequence soup.

### Cancel / abort scope (author direction)

**MVP (aligns with today):** `U.stopDelay(handle)` is required only for **numeric** delays (`U.delay(fn, seconds)` → `Wait.time`). Pred/object/AND waits need not return a stoppable handle in the first cut.

That is **not** a regression: today’s public `U.delay` is time-only cancel; today’s `waitUntil` does not expose a stop handle (chain cancel goes through `cancelRegistry` / `abortCheck` on `chain` opts — separate from `stopDelay`).

| Capability | Strictly necessary for merge? | Notes |
| --- | --- | --- |
| Cancel numeric `delay` via `stopDelay` | **Yes** | Current `U.delay` contract |
| Cancel pred/object `delay` via `stopDelay` | **No** (nice later) | Would be **new** public functionality |
| `chain` cancel via `opts.cancelRegistry` | Keep if already used | Orchestrator concern, not `stopDelay` |

Cohesive abort across all `delay` arities is preferred eventually; **not** a blocker for the merge.

### The one pushback that still matters (restate)

**Not about cancel. Not about forcing one internal engine everywhere.**

Standalone one-shots are fine to implement “however works best”:

- `U.delay(fn, 1.5)` → `Wait.time` (efficient, cancellable)
- `U.delay(fn, pred)` / object → `Wait.condition` (efficient, good on hot object paths)
- `U.chain` → coroutine **or** carefully encoded waits — **whatever avoids the TTS quirk**

The quirk:

> Scheduling **`Wait.time` from inside a `Wait.condition` completion callback** is unreliable in TTS (timer may fire immediately). Startup/loading-overlay notes already ban nesting `U.delay` inside `waitForCondition` completions for this reason.

**Who must worry — call sites or `U.chain`?**

| Use | Burden |
| --- | --- |
| Normal `U.chain` steps (`return 3`, `return obj`, `return pred`) | **`U.chain` safeguards this.** Callers should not need to avoid “condition step then timed step,” or avoid returning seconds after a predicate wait. Inter-step waiting is the orchestrator’s job. |
| Manual nesting inside a step body (step starts `Wait.condition` / pred-`delay`, and *that* completion calls timed `U.delay`) | **Call-site / general wait policy** — same footgun anywhere, not special to `chain`. Prefer `chain` for multi-step flows instead of hand-nested Waits. |

So the trap is **not** “never pass a function to `U.chain` that might someday use `Wait.time`.” It is “**`U.chain` must not implement its own inter-step waits by nesting `Wait.time` inside `Wait.condition` completions.**” With a coroutine-based (or time-in-predicate) orchestrator — as today — step bodies may call standalone `U.delay(fn, secs)` freely.

Bad pattern for *implementing* `chain` (internal):

```text
Wait.condition(stepReady) → in that callback → Wait.time / U.delay(nextGap, 3)
```

Fine for *callers*:

```lua
U.chain({
  function() startThing() return function() return ready end end,  -- wait until ready
  function() hideUI() return 3 end,                                 -- then wait 3s (chain handles safely)
  function() restore() end,
})
```

### Is abort the only challenge?

**No — but cancel-for-all-arities is not the missing piece.** For MVP, time-only `stopDelay` is enough. Remaining work:

1. **Seconds → `Wait.time`** on standalone `delay`.
2. **Pred/object → prefer `Wait.condition`** on standalone `delay`.
3. **`chain` must not nest `Wait.time` inside `Wait.condition` completions** (see above) — internal strategy may differ from standalone `delay`.
4. **Timeout / maxWait** for non-time waits (wall clock; abort or force per opts).
5. **Hard-cut migration** of all call sites.

### One `U.chain` — no `chainWithOptions`

`RunSequence` is already a thin opts wrapper. Canonical: `U.chain(funcs, opts?)` only.

### Migration approach

1. Grep-migrate **all** call sites (core, playbooks, testbed, docs examples) to `delay` / `chain` / `stagger` in the **same** change as the util rewrite.
2. Delete old names and obsolete implementations; optional loud `error(...)` stubs only if a name must exist briefly to catch stragglers — never silent forwarders.
3. Update wait-api policy + `AVAILABLE_FUNCTIONS.md` in the same change.
4. Save & Play / smoke: any old-name `error` in console = fix that call site, do not reintroduce aliases.

### Alternatives considered

| Scheme | Notes |
| --- | --- |
| `afterWhen` as merged one-shot | Rejected — author prefers **`delay`** |
| `runChain` / `pipeline` | Longer / less local |
| Keep separate seconds-only `delay` | Unnecessary once cancel + `Wait.time` land on the merged API |

---

## Non-goals (this plan)

- Rewriting all call sites to raw `Wait.*`
- Using `Wait.stopAll` in production flows
- Changing XmlUI animation durations (blindfold slide, etc.) — only the Lua wait layer
- Solving P10 live `gameState` broadcast via timing helpers

---

## Doc / policy updates when implementing

In the same change as code slices A–E:

- [`docs/solutions/lua-wait-api-policy.md`](../../docs/solutions/lua-wait-api-policy.md) — approved APIs: `delay` / `chain` / `stagger`
- [`.dev/AVAILABLE_FUNCTIONS.md`](../AVAILABLE_FUNCTIONS.md) — rename table; drop `waitRestingSequence` if removed
- This file — mark slices done with dates / commits

---

## Open questions for author

1. Keep a named `whenObjectRests` / `runAfterObjectPhysicsSettled` helper (Wait.condition + `getObject` re-resolve), or only `delay(cb, pred)`?
2. Confirm `waitRestingSequence` can be deleted.
3. Hardened coroutine `chain` vs long-term Wait-predicate-only `chain` (slice F)?

**Decided:** hard rename in one pass — no alias period; obsolete APIs error or are deleted (see Hard cut above).
