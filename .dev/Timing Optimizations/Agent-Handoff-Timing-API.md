# Timing API handoff — `stagger` / `chain` / `await`

## Agent Routing

Read this when:
- scheduling delayed or sequenced work (startup gates, connect, blindfold, sync retries, settle waits)
- replacing or reviewing any use of the **old** names below
- the join-load / startup-defer agent is implementing Host Lua delays after the timing merge has shipped

Source of truth:
- Implementation: `lib/util.ttslua`
- Policy: [`docs/solutions/lua-wait-api-policy.md`](../../docs/solutions/lua-wait-api-policy.md)
- Full research/plan: [`Timing-Utilities-Plan.md`](Timing-Utilities-Plan.md)

Verification:
- Grep for banned old names (must be zero in live Lua outside util landmines): `U.delay`, `U.RunSequence`, `U.waitUntil`, `U.sequence`, `U.waitForCondition`, `U.runAfterObjectPhysicsSettled`, `U.stopDelay`
- Prefer `U.await` / `U.chain` / `U.stagger` only

Status: **shipped (TOR-438, 2026-07-30).** This is the **timing contract** for new Host Lua work (`U.stagger` / `U.chain` / `U.await`).

---

## Why this exists

Toronto Rising collapsed overlapping wait helpers into a small **timing contract** — three named APIs — so agents do not mix “parallel stagger,” “one-shot wait,” and “dependent sequence.” The merge also hardens clocks (`Time.time` / `Wait.time`) and removes compatibility aliases — **old names error or are gone.**

If you are the **join / startup defer** agent: schedule Host Lua work under this contract only. Do not nest numeric `U.await` inside `Wait.condition` / predicate-`U.await` completions — use `U.chain` for sequenced gaps. Do not reintroduce old names (`U.delay`, `U.RunSequence`, …).

Prefer the word **contract** (or **trio** when naming the three functions). Avoid “regime” / “framework.”

---

## The three functions

### `U.stagger(funcs, timeDelay)`

Runs a list of functions at **fixed wall-clock offsets**. Later steps do **not** wait for earlier steps to finish their work — only for the timer.

```lua
U.stagger({
  function() doA() end,
  function() doB() end,
  function() doC() end,
}, 0.05)  -- B at +0.05s, C at +0.10s from start (plus any numeric pauses in the list)
```

**Use for:** fire-and-forget staggered UI/lighting updates.

**Do not use for:** “do A, when ready do B, when ready do C.”

---

### `U.await(callback, testRef, opts?)`

Runs **one** callback after a flexible condition (`testRef`):

| `testRef` | Meaning |
| --- | --- |
| `number` | Wait that many **seconds** (`Wait.time`; accurate fractions) |
| `function` | Poll until it returns true (`Wait.condition`) |
| GameObject | Wait until not `loading_custom` and `resting` |
| `table` | AND of the above |
| `nil` | Default short wait (same spirit as old waitUntil default) |

```lua
-- Fixed time (cancellable)
local handle = U.await(function()
  finishStartupSlice()
end, 2.5)
-- later:
U.cancel(handle)

-- Predicate (e.g. table sync ready)
U.await(function()
  revealHud()
end, function()
  return startupTableSyncDone and startupSeatLightsReady()
end, { maxWait = 60 })

-- Object settled (replaces runAfterObjectPhysicsSettled)
U.await(function()
  lockDie(guid)
end, function()
  local o = getObjectFromGUID(guid)
  if o == nil then return true end
  if o.loading_custom == true then return false end
  return o.resting == true
end, { maxWait = timeoutSec })
```

**Cancel MVP:** `U.cancel(handle)` only for **numeric** awaits. Predicate/object awaits are not cancelled via `U.cancel` in v1.

**Use for:** single deferred action — connect fallbacks, one-shot retries, “when lights ready,” die settle.

---

### `U.chain(funcs, opts?)`

Dependent multi-step sequencer. Each step runs; its **return value** is the wait before the **next** step (same `testRef` rules as `U.await`). Optional `opts`: `maxWait`, `onComplete`, `onStepStart`, `onStepEnd`, `stepNames`, `sequenceTimeoutSeconds`, `cancelRegistry`.

**Return a number to delay:** `return 2.5` from a step waits **2.5 seconds** before the next step. Prefer that over a follow-up step whose only job is `U.await(function() end, n)`.

**Console `print` order:** Put each `print` / `printHeader` in its **own** chain (or stagger) step — TTS does not reliably show multiple prints from one function in source order. Prefer `log` for table dumps. A step may still `print` once and `return 3.5` (one print + numeric wait is fine). See [TESTING.md § Console print ordering](../TESTING.md#console-print-ordering-tts).

```lua
U.chain({
  function()
    lowerBlindfold()
    return 2.5  -- wait for slide/FadeIn before heavy work
  end,
  function()
    Sync.full({ reason = "startup_gate" })
    return function()
      return seatLightsReady()
    end
  end,
  function()
    applyPhaseBlindfold()
  end,
}, {
  onComplete = function(ok, detail)
    -- ok false => step_error / step_timeout / cancelled / sequence_timeout
  end,
})
```

**Critical:** `U.chain` **safeguards** inter-step timing internally (coroutine-based waits). You may return a predicate from one step and a number of seconds from the next. You do **not** need to avoid “condition then timed wait” in normal `return` values.

**Still forbidden everywhere (including inside a chain step body):** starting a `Wait.condition` / pred-`U.await` whose **completion callback** then calls numeric `U.await` / `Wait.time` — TTS may fire that timer immediately. Prefer another `U.chain` step instead of hand-nested Waits.

**Use for:** startup readiness gates, phase Advance, blindfold staged transitions, any “A then wait then B then wait then C” flow.

---

## Old → new cheat sheet

| Old (banned) | New |
| --- | --- |
| `U.delay(fn, sec)` / `U.stopDelay(h)` | `U.await(fn, sec)` / `U.cancel(h)` |
| `U.waitUntil(fn, testRef, …)` | `U.await(fn, testRef, opts?)` (one-shot) or `U.chain` (sequences) |
| `U.waitForCondition(onDone, pred, timeout?)` | `U.await(onDone, pred, { maxWait = timeout })` |
| `U.RunSequence` / `U.RunSequenceWithOptions` | `U.chain(funcs, opts?)` |
| `U.sequence(funcs, dt)` | `U.stagger(funcs, dt)` |
| `U.runAfterObjectPhysicsSettled(getObj, timeout, cb, early?)` | `U.await(cb, pred, { maxWait = timeout })` with resting/`completeEarlyIf` in `pred` |
| `U.waitRestingSequence` | Deleted — use `U.chain` / `U.await` |

`U.scheduleAtOffsets(callback, { 0.35, 1.5, … })` remains for “same callback at several delays” (Sync bootstrap style). Prefer `U.chain` if steps differ.

---

## Guidance for join / startup defer work

1. **Engine join cost** (CustomUIAssets / ObjectStates) is separate from Host Lua timing — see [Join-Load Inventory](../Multiplayer%20Functionality/Join-Load%20Inventory.md). This API only schedules **Host Lua**.
2. For “wait until X, then run heavy sync / reveal,” use **`U.chain`** or **`U.await`**, not staggered parallel `U.stagger` (unless you truly want overlapping timers).
3. For “retry the same reconciler at 0.35s and 1.5s,” `U.scheduleAtOffsets` is fine.
4. Never nest numeric `U.await` inside a condition-completion callback; use **`U.chain`** steps.
5. Do not call raw `Wait.time` / `Wait.condition` — policy still routes through util (`U.await` / `U.cancel`).

---

## Minimal examples (startup-shaped)

**Single delayed reveal:**

```lua
U.await(function()
  hideLoadingOverlay()
end, 4)
```

**Gate then work (preferred for multi-condition startup):**

```lua
U.chain({
  function()
    return function()
      return startupTableSyncDone
        and startupInitialSyncDone
        and startupSeatLightsReadyForReveal()
    end
  end,
  function()
    Sync.full({ reason = "onLoad_startup_gate" })
    return 0
  end,
  function()
    applyGlobalBlindfoldFromPhase()
  end,
})
```

---

## Related docs

- [Timing-Utilities-Plan.md](Timing-Utilities-Plan.md) — findings, hard-cut policy, chain nesting rationale
- [Join-Load Inventory.md](../Multiplayer%20Functionality/Join-Load%20Inventory.md) — connect timeout context (engine vs Host Lua)
- [lua-wait-api-policy.md](../../docs/solutions/lua-wait-api-policy.md) — build gate / approved APIs
