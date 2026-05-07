# Lua `pcall` policy (Toronto Rising TTS)

## Goal

Prefer **no** `pcall` / `xpcall`. Errors should surface in the TTS log so failures are visible during development and in-session debugging.

## Build gate

Run `npm run check:pcall-gate` (see `.tools/pcall-gate/check-pcall-gate.mjs`). It counts non-overlapping matches of the regex `\bpcall\s*\(` in `*.ttslua` under `core/`, `global/`, `lib/`, `objects/`, and `ui/` (recursive only). That includes **comments and strings** that contain the substring `pcall(` — avoid writing prose like `` `pcall(require)` `` in comments or the gate count will be inflated. The script compares the total to the last numeric baseline in `.dev/build-logs/pcall-gate.txt` and **exits with an error** if the current count is **greater** than that baseline. To approve a higher count after intentional changes, edit the **last** data line in that log (or append a new line) with a count ≥ the new total, then re-run.

`npm run build` / `npm run build:all-tooling` (default **Ctrl+Shift+B** pipeline) runs **`check:pcall-gate` first** so a failed gate stops before TypeScript or Lua generators. For other workflows, chain `npm run check:pcall-gate` manually before build steps, or run it in CI.

## When `pcall` is temporarily allowed

If `pcall` cannot yet be removed, **every** use must be annotated **immediately above** the call with:

1. **Why** `pcall` is reasonable or necessary here (1–2 sentences).
2. **Why** letting the error propagate would be worse for players or operators in this specific path (1 sentence).

If both are not true, remove `pcall` and use direct calls, explicit `nil` checks, or a typed helper (e.g. `C.GetPlayerIDOrNil`) instead.

### Suggested annotation shape

```lua
-- pcall: <necessity>. Propagating would <player/operator impact>.
pcall(function()
  ...
end)
```

## Recent removals (reference)

Large-scale removals (2026 pass): production paths in `core/`, `lib/`, and `ui/` that used `pcall` only to swallow TTS API errors were converted to direct calls so failures show in the log. Representative areas: lighting, soundscape, seat sync, roll controller, object pose application, HUD/storyteller UI, and many NPC spawn branches.

Older targeted cleanups still worth citing:

- `ui/ui_csheet.ttslua`: all `pcall` removed; use direct TTS / `Global.call` / `C.GetPlayerIDOrNil`.
- `lib/constants.ttslua`: `C.GetPlayerColor` no longer uses `pcall(C.GetPlayerID, …)`; added `C.GetPlayerIDOrNil`.
- `core/global_script.ttslua`: `GlobalRollSeatCamera` calls `M.setCamera` directly.

## Inventory (remaining `pcall` sites)

**Gate scope:** the numeric baseline in `.dev/build-logs/pcall-gate.txt` matches **only** `*.ttslua` under `core/`, `global/`, `lib/`, `objects/`, `ui/`. Files elsewhere (e.g. `.dev/test_rotatetofrom.ttslua`) are not counted by the gate but should still follow this policy if they ship with the game.

**Current inventory** (25 matches under the gate trees; lines drift — re-run ripgrep `\bpcall\s*\(` after edits):

| Count | File | Lines (approx.) | Role |
|------:|------|-----------------|------|
| 13 | `lib/util.ttslua` | 1499, 2594, 2756, 2891, 2927, 2940, 2976, 2990, 3045, 3075, 3080, 3083, 3399 | `U.isIn` userdata probe; `startLuaCoroutine` startup guards; `U.waitUntil` / `U.RunSequenceWithOptions` isolation around author-supplied callbacks and hooks |
| 4 | `core/debug.ttslua` | 3474, 4498, 4704, 4711 | Isolated test runner; optional `require` of generated custom-UI manifest (primary + slash fallback) |
| 4 | `core/npcs.ttslua` | 90, 95, 864, 1635 | JSON encode/decode clone for spawn snapshots; deferred `applyCurrentLightMode` with guaranteed override cleanup; optional `require("core.debug")` |
| 2 | `lib/pc_bootstrap.ttslua` | 16, 21 | JSON round-trip deep clone with `U.clone` fallback |
| 1 | `lib/object_positions.ttslua` | 72 | `Global.call("GlobalGetSeatLayoutCenterPoint")` from object-script VMs |
| 1 | `lib/pcs_data.ttslua` | 3674 | Guarded JSON paths when encoding PCS-derived tables |

Each site above has a `-- pcall: …` comment **immediately** above the `pcall(` (same rule as “Suggested annotation shape”).

**Outside gate:** `.dev/test_rotatetofrom.ttslua` also uses one `pcall` in a dev-only rotation test runner (same annotation rule); it is not counted by `check:pcall-gate`.

**Note:** `core/debug.ttslua` is dev/test-heavy; the `lib/util.ttslua` harness sites are the highest remaining **production** surface area if you want to shrink the protected-error pattern further (large refactor).
## Migration patterns

- **Optional resolution**: add `*OrNil` / boolean-return helpers instead of `pcall(f)` around callers that throw.
- **Optional modules**: prefer one top-level guarded `require` with a clear `if not mod then … end` rather than scattered `pcall(require, …)` unless the module is intentionally absent in some bundles (then document that in the annotation).
- **Coroutine / callback harnesses**: `lib/util.ttslua` uses `pcall` around user-supplied callbacks; shrinking that surface is a larger refactor; annotate each site until replaced.
