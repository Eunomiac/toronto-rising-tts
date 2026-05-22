# Conditions system — implementation status

Implemented per the Conditions System plan (registry-driven, hard migration, no legacy shims).

## Layout

- `lib/condition_defs.ttslua` — definitions
- `lib/condition_derive.ttslua` — pure derive rules
- `lib/condition_effects.ttslua` — resolved effects merge
- `core/conditions.ttslua` — Global API

## Docs

- [PC Tracking & State Behavior](../PC%20Data%20&%20Tracking/PC%20Tracking%20&%20State%20Behavior.md) — persisted shape + APIs
- [conditions-registry-pattern.md](../../docs/solutions/conditions-registry-pattern.md) — developer workflow + roll hooks

## Save migration

No automatic migrator. Legacy inline condition blobs error on load. Clear `playerData[id].conditions` or restore an older save before first boot on this system.
