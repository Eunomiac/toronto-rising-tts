# Lua Wait API policy (Toronto Rising TTS)

## Goal

Game-facing Lua must not call TTS `Wait.time`, `Wait.condition`, or `Wait.stop` directly. Schedule delays and condition waits through [`lib/util.ttslua`](../../lib/util.ttslua) so timing behavior stays centralized and the build gate can enforce the rule.

## Build gate

`npm run check:pcall-gate` (see [`.tools/pcall-gate/check-pcall-gate.mjs`](../../.tools/pcall-gate/check-pcall-gate.mjs)) also tracks:

| Metric | Regex (outside `lib/util.ttslua` only) |
|--------|----------------------------------------|
| `waitTime` | `\bWait\.time\s*\(` and `\bW\.time\s*\(` |
| `waitCondition` | `\bWait\.condition\s*\(` |

Log lines in [`.dev/build-logs/pcall-gate.txt`](../../.dev/build-logs/pcall-gate.txt) use:

`ISO8601\tpcall=N\twaitTime=N\twaitCondition=N`

The gate fails when any metric **increases** above the last logged baseline. After intentional adds, bump the last line before building.

`pcall` is still counted in **all** scanned `*.ttslua` files (including util). See [`lua-pcall-policy.md`](lua-pcall-policy.md).

## Approved APIs

| Need | Use |
|------|-----|
| One-shot delay, debounce, cancellable timer handle | `U.delay(callback, seconds)` / `U.stopDelay(handle)` |
| Poll until predicate (non-coroutine) | `U.waitForCondition(onDone, testFn, timeoutSeconds?)` |
| Same callback at several offsets | `U.scheduleAtOffsets(callback, { 0.35, 1.5, ... })` |
| Fixed stagger between steps | `U.sequence(funcs, timeDelay)` |
| Conditional steps, lerps, load gates | `U.RunSequence` / `U.RunSequenceWithOptions` |
| Physics settled after randomize / spawn | `U.runAfterObjectPhysicsSettled` (not `U.waitUntil(obj)` from those callbacks) |

## Do not

- Nest `U.delay` inside the completion callback of `U.waitForCondition` — TTS may fire the delay immediately. Use `U.RunSequence` instead (see [`HUD_FUNCTIONS.md`](../../.dev/HUD_FUNCTIONS.md) loading-overlay note).
- Call `U.waitUntil(..., gameObject)` from `onObjectRandomize` or similar — use `U.runAfterObjectPhysicsSettled`.

## Comments and the gate

The gate matches **comments and strings** that contain `Wait.time(` or `Wait.condition(`. Prefer `U.delay` / `U.waitForCondition` in prose, or describe behavior without those substrings.
