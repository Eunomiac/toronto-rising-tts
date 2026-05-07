# Lua `pcall` policy (Toronto Rising TTS)

## Goal

Prefer **no** `pcall` / `xpcall`. Errors should surface in the TTS log so failures are visible during development and in-session debugging.

## Build gate

Run `npm run check:pcall-gate` (see `.tools/pcall-gate/check-pcall-gate.mjs`). It counts `pcall(` invocations under `core/`, `global/`, `lib/`, `objects/`, and `ui/` (recursive `*.ttslua` only), compares to the last numeric baseline in `.dev/build-logs/pcall-gate.txt`, and **exits with an error** if the current count is **greater** than that baseline. To approve a higher count after intentional changes, edit the **last** data line in that log (or append a new line) with a count ≥ the new total, then re-run.

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

- `ui/ui_csheet.ttslua`: all `pcall` removed; use direct TTS / `Global.call` / `C.GetPlayerIDOrNil`.
- `lib/constants.ttslua`: `C.GetPlayerColor` no longer uses `pcall(C.GetPlayerID, …)`; added `C.GetPlayerIDOrNil`.
- `core/global_script.ttslua`: `GlobalRollSeatCamera` calls `M.setCamera` directly.

## Inventory (remaining `pcall` sites)

The list below is from a repo-wide search of `*.ttslua` / `*.lua`. Update this section when adding or removing calls.

| File | Lines (approx.) |
|------|-----------------|
| `core/camera_debug_focus.ttslua` | 102 |
| `core/debug.ttslua` | 298, 342, 383, 973, 1643, 1673, 1863, 1893, 2315–2316, 2356, 2363, 2437, 2474, 2482, 2491, 2501, 2530, 2533, 2570, 3298, 3323, 3325, 3343, 3352, 3433, 3573, 3806, 3813, 4158, 4210, 4288, 4296, 4624, 4798, 4831, 4837 |
| `core/hud_player.ttslua` | 233, 465, 482 |
| `core/light_test.ttslua` | 46, 220, 265, 317 |
| `core/lighting.ttslua` | 1337, 1340 |
| `core/npcs.ttslua` | 90, 95, 178, 184, 336, 367, 375, 381, 635, 684, 691, 713, 793, 835, 846, 877, 911, 1142, 1148, 1551, 1697, 1768, 1833, 1845 |
| `core/objects.ttslua` | 35, 56 |
| `core/roll_controller.ttslua` | 917 |
| `core/soundscape.ttslua` | 211, 219, 252, 271, 293, 316, 326, 349, 357, 365, 382, 388, 392, 505, 1544, 1551 |
| `core/state.ttslua` | 1060 |
| `core/storyteller_panel_ui.ttslua` | 28 |
| `lib/dice_drawer.ttslua` | 51 |
| `lib/object_positions.ttslua` | 72, 258, 271, 279, 286, 295, 302, 311, 315, 323, 335, 339, 344, 348 |
| `lib/pc_bootstrap.ttslua` | 16, 21 |
| `lib/pc_stats.ttslua` | 46, 60, 108, 461 |
| `lib/pcs_data.ttslua` | 3674 |
| `lib/rotational-seat-layout.ttslua` | 1706, 1709, 1712, 1883, 1889, 2354, 2634, 2731 |
| `lib/util.ttslua` | 1499, 2252, 2272, 2592, 2723, 2753, 2887, 2923, 2935, 2970, 2983, 3037, 3066, 3070, 3072, 3196, 3393, 3503, 3576, 3579, 3616 |
| `ui/ui_tarot_button.ttslua` | 37, 241 |
| `.dev/test_rotatetofrom.ttslua` | 419 |

**Note:** `core/debug.ttslua` and `.dev/*` are dev/test-heavy; treat production modules under `core/`, `lib/`, `ui/` as the highest priority for elimination or documentation.

## Migration patterns

- **Optional resolution**: add `*OrNil` / boolean-return helpers instead of `pcall(f)` around callers that throw.
- **Optional modules**: prefer one top-level guarded `require` with a clear `if not mod then … end` rather than scattered `pcall(require, …)` unless the module is intentionally absent in some bundles (then document that in the annotation).
- **Coroutine / callback harnesses**: `lib/util.ttslua` uses `pcall` around user-supplied callbacks; shrinking that surface is a larger refactor; annotate each site until replaced.
