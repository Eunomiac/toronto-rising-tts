# Conditions registry pattern

> **Start with the Agent quick guide** in [`.dev/PC Data & Tracking/Conditions System Guide.md`](../../.dev/PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md).

Toronto Rising stores **which** conditions are active in `gameState.playerData[id].conditions`. **What they do** lives only in [`lib/condition_defs.ttslua`](../../lib/condition_defs.ttslua).

## Modules

| Module | Role |
| --- | --- |
| `lib/condition_defs.ttslua` | Registry: per-condition `derive(stats, activeConditions, statChanges?)`, effects, priority |
| `lib/condition_derive.ttslua` | Generic derive wrapper (`suppressedBy`); passes merged `statChanges` into derive |
| `lib/condition_effects.ttslua` | Pure merge → `statChanges`, `hudElementIds`, `lightingModes` |
| `lib/condition_roll_policies.ttslua` | Pure merge → roll policy snapshot |
| `lib/effective_stats.ttslua` | Read-time facade: one resolve pass, typed stat getters |
| `lib/pc_sheet_collect.ttslua` | Pure merge math: `trackerMaxFromStats`, `effectiveTempForDot/Aggregate` |
| `core/conditions.ttslua` | Mutate, reconcile, validate, `afterChange`, `resolveRollPolicy` |
| `core/roll_condition_handlers.ttslua` | Tier 3 roll lifecycle handlers |

## Persisted shape

```lua
conditions = {
  impairedHealth = true,
  hudBlindfold = { variant = 3 },
}
```

Legacy inline payloads (`statChanges`, `hudChanges`, `lightingModeChanges`) **error on load**.

## Derived condition shape

Each derived entry owns its derivation logic:

```lua
impairedHealth = {
  kind = "derived",
  priority = 40,
  suppressedBy = { "torpor" },
  derive = function(stats, _activeConditions, statChanges)
    local maxBoxes = PSC.trackerMaxFromStats(stats, statChanges, "health")
    -- ...
    return (sup + agg) >= maxBoxes
  end,
  statChanges = { strength = -2, ... },
  hud = { overlay = "overlay_health_impaired" },
  lighting = { seatLight2 = "DIM_RED" },
}
```

Optional `deriveSticky = true` (e.g. torpor): reconcile may add when derive is true, but never auto-removes when derive is false.

Manual/event conditions have no `derive` function — set/cleared by callers.

## Location-hosted conditions

Optional `conditions = { "conditionId", ... }` on `C.Districts[*]` and `C.Sites[*]` (string refs to registry keys with `kind = "location"`).

`Conditions.reconcileLocationHostedForScene()` unions site + district ids from `sessionScene`, then for each PC:

- **Present** (`L.isPlayerPresentInActiveSeatLayout`) — add missing location keys when optional `derive(stats, …)` passes; remove keys no longer listed or failing derive.
- **Absent** — remove all location-kind keys (location effects do not apply off-scene).

Pass `{ skipPresentation = true }` when the caller runs `Sync.full` immediately afterward (scene apply, location apply, table switch, load) to avoid double HUD/light reconciliation. The caller must also run `PCST.refreshAllCharacterSheets()` after `Sync.full` so CSHEET page 1 dots and BP decals reflect location `statChanges` (`StorytellerScenesPanel` centralizes this in `reconcileLocationSyncAndPresentSheets`).

Triggers: location Apply, scene library apply, End scene, seat presence toggle, table switch, game load.

Example registry entry:

```lua
bumpBloodPotency = {
  kind = "location",
  derive = function(stats, _activeConditions)
    return CD.statsHasBloodPotencyRating(stats)
  end,
  statChanges = { bloodPotency = 1 },
}
```

Effect resolution re-checks `derive` for location kind so presentation stays gated if stats change without a reconcile pass.

## Adding a condition

See the **8-step checklist** in [Conditions System Guide §0](../../.dev/PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md#agent-quick-guide--adding-or-changing-a-condition). Roll effects: Guide §6.

## When conditions refresh

- **Derived reconcile** runs only on explicit triggers (damage/heal, humanity changes, load, torpor clear) — not on every `stats` write (e.g. hunger/XP alone do not reconcile).
- **Location reconcile** runs when session location, seat presence, or active table layout changes (see above).
- **Presentation** runs on `Conditions.afterChange` after mutations, and via on-demand `resolveForPlayer` during sheet/light/HUD reconcile.

## Roll policy

- Registry `roll = { ... }` merges into `active.rollPolicy` at roll initiate via `Conditions.resolveRollPolicy`.
- Roll FSM reads **`active.rollPolicy`** only — not `playerData.conditions` or `CD.Defs`.
- Stat helpers: **`EffectiveStats.forPlayer`** (preferred); legacy `Conditions.effectiveStatDelta`, `Conditions.effectiveAggregateDelta` delegate to the facade.

## Debug

- `DEBUG.dumpConditions("Brown")` — active ids and resolved stat/HUD/light effects.
- `DEBUG.dumpEffectiveStats("Brown")` — effective tracker max, BP rating, derived bloodSurge.
- `DEBUG.dumpRollPolicy("Brown")` — merged roll policy on the active roll.
