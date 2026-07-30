# Lua Wait API policy (Toronto Rising TTS)

## Goal

Game-facing Lua must not call TTS `Wait.time`, `Wait.condition`, or `Wait.stop` directly. Schedule delays and condition waits through [`lib/util.ttslua`](../../lib/util.ttslua) so timing behavior stays centralized and the build gate can enforce the rule.

## Build gate

`npm run check:pcall-gate` (see [`.tools/pcall-gate/check-pcall-gate.mjs`](../../.tools/pcall-gate/check-pcall-gate.mjs)) also tracks:

| Metric | Regex (outside `lib/util.ttslua` only) |
|--------|----------------------------------------|
| `waitTime` | `\bWait\.time\s*\(` and `\bW\.time\s*\(` |
| `waitCondition` | `\bWait\.condition\s*\(` |

Full-UI XML refresh (`setXml` / `setXmlTable`) is tracked in the same gate; see [`lua-ui-full-xml-policy.md`](lua-ui-full-xml-policy.md).

Log lines in [`.dev/build-logs/pcall-gate.txt`](../../.dev/build-logs/pcall-gate.txt) use:

`ISO8601\tpcall=N\twaitTime=N\twaitCondition=N\tsetXml=N\tsetXmlTable=N`

The gate fails when any metric **increases** above the last logged baseline. After intentional adds, bump the last line before building.

`pcall` is still counted in **all** scanned `*.ttslua` files (including util). See [`lua-pcall-policy.md`](lua-pcall-policy.md).

## Approved APIs (TOR-438)

| Need | Use |
|------|-----|
| One-shot delay, debounce, cancellable timer handle | `U.await(callback, seconds)` / `U.cancel(handle)` |
| Poll until predicate | `U.await(onDone, testFn, { maxWait = n }?)` |
| Same callback at several offsets | `U.scheduleAtOffsets(callback, { 0.35, 1.5, ... })` |
| Fixed stagger between steps (parallel offsets) | `U.stagger(funcs, timeDelay)` |
| Dependent steps / lerps / load gates | `U.chain(funcs, opts?)` |
| Physics settled after randomize / spawn | `U.await(callback, pred, { maxWait = n })` with resting/`loading_custom` (and cancel token) in `pred` |

Object scripts that cannot `require("lib.util")` may use thin `CU.await` in `lib/csheet_util.ttslua` / `lib/object_positions_object.ttslua` (direct `Wait.time`).

## Do not

- Nest numeric `U.await` inside the completion callback of a predicate `U.await` — TTS may fire the delay immediately. Use `U.chain` instead (see [`HUD_FUNCTIONS.md`](../../.dev/HUD_FUNCTIONS.md) loading-overlay note).
- Call raw `Wait.time` / `Wait.condition` / `Wait.stop` from game modules.
- Use removed names (`U.delay`, `U.RunSequence`, `U.waitUntil`, …) — they `error()` loudly.

## Comments and the gate

The gate matches **comments and strings** that contain `Wait.time(` or `Wait.condition(`. Prefer `U.await` / `U.chain` in prose, or describe behavior without those substrings.
