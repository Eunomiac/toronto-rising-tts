# Conditions registry pattern

Toronto Rising stores **which** conditions are active in `gameState.playerData[id].conditions`. **What they do** lives only in [`lib/condition_defs.ttslua`](../../lib/condition_defs.ttslua).

## Modules

| Module | Role |
| --- | --- |
| `lib/condition_defs.ttslua` | Static registry (derive rules, statChanges, HUD/light templates, priority) |
| `lib/condition_derive.ttslua` | Pure derive evaluators |
| `lib/condition_effects.ttslua` | Pure merge → `statChanges`, `hudElementIds`, `lightingModes` |
| `core/conditions.ttslua` | Mutate, reconcile, validate, `afterChange`, roll helpers |

## Persisted shape

```lua
conditions = {
  impairedHealth = true,
  hudBlindfold = { variant = 3 },
}
```

Legacy inline payloads (`statChanges`, `hudChanges`, `lightingModeChanges`) **error on load**.

## Adding a condition

1. Add entry to `CD.Defs` with `kind`, `priority`, effects, and optional `derive` / `instanceSchema`.
2. New `derive.type` → one evaluator in `condition_derive.ttslua`.
3. New HUD overlay → `ui/.templates/panel_overlays.xml` + `HO.allManagedOverlayIdsForSeat`.
4. Wire trigger: stat mutation paths call `Conditions.reconcileDerivedForPlayer`, or call `Conditions.setManual` / `setEvent` / `clear`.
5. Do **not** edit sheet/HUD/lighting loops unless adding a new **effect channel**.

## Roll hooks (Phase A)

- `Conditions.effectiveStatDelta(playerID, statKey)` — attribute/skill/discipline dots + future pools.
- `Conditions.effectiveAggregateDelta(playerID, trackerKey)` — health/willpower/humanity box counts (Remorse uses humanity).
- Phase B: optional per-condition `roll` section in registry when attribute-driven pools land.

Roll FSM should call **`Conditions.resolveForPlayer` once** per initiation — not re-scan raw condition tables.

## Debug

`DEBUG.dumpConditions("Brown")` prints active ids and resolved effects.
