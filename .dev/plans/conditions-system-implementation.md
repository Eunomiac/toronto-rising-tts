# Conditions system — implementation status

Implemented per the Conditions System plan (registry-driven, hard migration, no legacy shims). Roll policy layer: [Conditions System Guide §6](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md#6-roll-policy-layer).

**Scene-hosted conditions + `rollDefaults` removal:** [unified-hosted-conditions-and-scene-import.md](unified-hosted-conditions-and-scene-import.md)

## Layout

- `lib/condition_defs.ttslua` — definitions (per-condition `derive` functions)
- `lib/condition_derive.ttslua` — generic derive wrapper (`suppressedBy`)
- `lib/condition_effects.ttslua` — resolved stat/HUD/light merge
- `lib/condition_roll_policies.ttslua` — roll policy merge
- `core/conditions.ttslua` — Global API (`resolveForPlayer`, `resolveRollPolicy`, reconcile)
- `core/roll_condition_handlers.ttslua` — Tier 3 roll lifecycle handlers

## Docs (canonical)

- [Conditions System Guide](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md) — **start here** (Agent quick guide + roll policy §6)
- [PC Tracking & State Behavior](../PC%20Data%20&%20Tracking/PC%20Tracking%20&%20State%20Behavior.md) — persisted shape + sheet math
- [conditions-registry-pattern.md](../../docs/solutions/conditions-registry-pattern.md) — solutions digest
- [roll-conditions-policy-layer.md](roll-conditions-policy-layer.md) — implementation phase checklist

## Save migration

No automatic migrator. Legacy inline condition blobs error on load. Clear `playerData[id].conditions` or restore an older save before first boot on this system.
