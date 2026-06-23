# Conditions registry pattern

> **Start with the Agent quick guide** in [`.dev/PC Data & Tracking/Conditions System Guide.md`](../../.dev/PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md).

Toronto Rising stores **which** conditions are active in `gameState.playerData[id].conditions`. **What they do** lives only in [`lib/condition_defs.ttslua`](../../lib/condition_defs.ttslua).

## Modules

| Module | Role |
| --- | --- |
| `lib/condition_defs.ttslua` | Registry: per-condition `derive(stats, activeConditions, statChanges?)`, effects, priority, `canApplyManually` |
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

## Automatic conditions (`canApplyManually = false`)

Each automatic entry owns its derivation logic:

```lua
impairedHealth = {
  canApplyManually = false,
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

## Hosted conditions (scene + location lists)

Optional `conditions = { "conditionId", ... }` on:

- `C.Districts[*]` and `C.Sites[*]`
- `sessionScene` (Scene Constructor import)

Each id must have **`canApplyManually = true`**. Stat vs roll behavior is defined by registry **effect channels** (`statChanges`, `roll`, …), not by hosting source.

`Conditions.reconcileHostedForSession()` unions site + district + `sessionScene.conditions`, then for each PC:

- **Present** (`L.isPlayerPresentInActiveSeatLayout`) — add missing hosted keys when optional `derive(stats, …)` passes; remove keys no longer listed or failing derive.
- **Absent** — remove session-hosted stat/roll conditions (not UI toggles like `hudFrenzy`).

Pass `{ skipPresentation = true }` when the caller runs `Sync.full` immediately afterward (scene apply, location apply, table switch, load). The caller must also run `PCST.refreshAllCharacterSheets()` after `Sync.full` (`StorytellerScenesPanel.reconcileHostedSyncAndPresentSheets`).

Triggers: location Apply, scene library apply, End scene, seat presence toggle, table switch, game load.

Example registry entries:

```lua
bumpBloodPotency = {
  canApplyManually = true,
  derive = function(stats, _activeConditions)
    return CD.statsHasBloodPotencyRating(stats)
  end,
  statChanges = { bloodPotency = 1 },
}

bonusWpReroll = {
  canApplyManually = true,
  roll = { wpRerollCountBonus = 1 },
}
```

Effect resolution re-checks `derive` for session-hosted conditions with a derive function so presentation stays gated if stats change without a reconcile pass.

## Adding a condition

See the **checklist** in [Conditions System Guide §0](../../.dev/PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md#agent-quick-guide--adding-or-changing-a-condition). Roll effects: Guide §6.

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
