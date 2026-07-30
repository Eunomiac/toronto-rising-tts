# Timing utilities — findings & recommendations

## Agent Routing

Read this when:
- changing `U.await`, `U.chain`, `U.stagger`, `U.Lerp`, or related helpers in `lib/util.ttslua`
- deciding whether to add a new wait/sequence helper vs reuse `U.chain`
- investigating stalled sequences, sub-second wait drift, or coroutine waiter faults

Source of truth:
- `lib/util.ttslua` (§ Time & Sequence Utilities; § Animation & Interpolation)
- [`docs/solutions/lua-wait-api-policy.md`](../../docs/solutions/lua-wait-api-policy.md)
- Post-merge agent guide: [`Agent-Handoff-Timing-API.md`](Agent-Handoff-Timing-API.md)
- TTS APIs: [Wait](https://api.tabletopsimulator.com/wait/), [Time](https://api.tabletopsimulator.com/time/), [Base `startLuaCoroutine`](https://api.tabletopsimulator.com/base/)

Verification:
- `npm run check:pcall-gate` (Wait.time / Wait.condition counts outside util)
- Grep clean of old names: `U.delay`, `U.RunSequence`, `U.waitUntil`, `U.sequence`, `U.runAfterObjectPhysicsSettled` (only landmines in util)
- Save & Play + one `U.chain` path (phase Advance, blindfold, or Dice step)
- Concurrent smoke: two overlapping awaits/lerps (unique-name regression)

Status: **implemented 2026-07-30 (TOR-438)**. Research below retained as rationale.

---

## Shipped public API

| API | Role | Transport |
| --- | --- | --- |
| **`U.stagger(funcs, timeDelay)`** | Parallel fixed offsets (old `U.sequence`) | `U.await` / `Wait.time` |
| **`U.await(callback, testRef, opts?)`** | One-shot after seconds \| pred \| object \| AND-table | `Wait.time` or `Wait.condition` |
| **`U.chain(funcs, opts?)`** | Dependent sequencer (old `RunSequence` / `RunSequenceWithOptions`) | Unique-name coroutines between steps |
| **`U.cancel(handle)`** | Cancel numeric await only | `Wait.stop` |
| **`U.scheduleAtOffsets`** | Same callback, many offsets | `U.await` |

Hard cut: old names are loud `error(...)` landmines in util — no silent aliases.

Fixes included: `Time.time` / `utilNowTime` clocks; unique `ChainWaitCoroutine_*` names; real maxWait abort (`step_timeout`); single-frame poll (no 60 FPS assumption); deleted unused `waitRestingSequence`; physics settle via `U.await` + resting pred.

---

## Background: two TTS async models

| Model | Mechanism | Best for |
| --- | --- | --- |
| **`Wait.*`** | Engine schedules callbacks; cancel via `Wait.stop` | One-shot delays, polls, die settle from hot object events |
| **`startLuaCoroutine`** | Named Global function; `coroutine.yield(0)` = next frame | Multi-step sequences that mix delays + predicates without nesting `Wait.time` inside `Wait.condition` |

Wall-clock accuracy must come from `Time.time` / `Wait.time`, not `os.time()` (1-second resolution).

---

## Pre-merge findings (solved by TOR-438)

1. **`os.time()` clocks** — fractional waits/lerps quantized → fixed via `utilNowTime()` / `Time.time`.
2. **`maxWait` often never started; timeout did not abort** → chainWait starts clock at creation and aborts with `onComplete(false, "step_timeout")`.
3. **Shared global name `CheckCoroutine`** → unique `ChainWaitCoroutine_<n>`.
4. **Poll assumed 60 FPS** → yield one frame per loop; gate with `Time.time`.
5. **`waitRestingSequence` nested delay-in-condition** → deleted (no callers).
6. **Physics settle from `onObjectRandomize`** → `U.await` + resting pred (same `Wait.condition` transport).

---

## Nesting rule (unchanged)

Do **not** schedule numeric `U.await` from inside a `Wait.condition` / predicate-`U.await` completion. Use **`U.chain`** for inter-step gaps (`return 3`, return pred, return object).

---

## Follow-ups (optional, not TOR-438)

- Thin `U.delayFrames` if `Wait.frames` sprawl becomes a gate concern.
- Pred/object cancel via `U.cancel` (v1: numeric only).
