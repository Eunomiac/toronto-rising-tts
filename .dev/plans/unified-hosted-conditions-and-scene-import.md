# Unified hosted conditions and scene import `conditions`

Shipped implementation plan for deprecating `sessionScene.rollDefaults` and replacing it with `sessionScene.conditions` (registry id array).

---

## §1 Current state (pre-change audit)

### Registry (`lib/condition_defs.ttslua`)

- **Kinds (mutation/hosting scope):** `derived`, `manual`, `event`, `location`.
- **Effect channels (apply time):** `statChanges`, `hud`, `lighting`, `roll` — orthogonal to kind.
- Shipped location example: `bumpBloodPotency` (stat). Shipped roll example: `e2eBestialNull` (manual, E2E only).

### Mutation API (`core/conditions.ttslua`)

| API | Scope |
| --- | --- |
| `setManual` / `setEvent` / `clear` | ST toggles, transition events |
| `reconcileDerivedForPlayer` | Stats-driven keys |
| `reconcileLocationHostedForScene` | Site/district `conditions` arrays; **location kind only**; present PCs only |

### Resolve (deferred apply)

- **Stat/HUD/light:** `Effects.resolveForPlayer` ← `Conditions.resolveForPlayer`
- **Roll:** `RollPolicies.mergeForPlayer` ← `Conditions.resolveRollPolicy` → `RC.applyRollPolicyToActive` at `initiateRoll`

### `rollDefaults` bypass

- Only consumer: `RO.seedActiveRoll` in `lib/roll_options.ttslua` — merged into `active.rollOptions` before condition policy.
- Stored on `sessionScene.rollDefaults`; validated at scene import.

### Scene lifecycle hooks (`reconcileLocationHostedForScene`)

| Call site | File |
| --- | --- |
| Game load | `core/global_script.ttslua` |
| Library scene Apply | `core/storyteller_scenes_panel.ttslua` ~980 |
| End scene, table, seat presence, location Apply | `reconcileLocationSyncAndPresentSheets` |

Pattern: `skipPresentation = true` → `Sync.full` → `PCST.refreshAllCharacterSheets()`.

---

## §2 Pipeline verdict

### Already correct

- Stat vs roll split at **resolve/apply** time, not at persistence.
- District/site rows may reference roll or stat conditions; only `kind = "location"` is required for hosted location ids.

### Gaps addressed by this change

| Gap | Fix |
| --- | --- |
| Hosted reconcile only `location` | `reconcileHostedForSession` handles `location` + `scene` |
| No scene-hosted source | `sessionScene.conditions` string array |
| `rollDefaults` parallel path | Removed; roll modifiers via condition `roll` policy only |
| Docs framed “location conditions” as primary | **Hosted conditions** = location or scene sources |

**Out of scope:** merging `reconcileDerivedForPlayer` into hosted reconcile; per-`rollType` JSON keys; inline roll policy in scene JSON.

---

## §3 Implementation summary (shipped)

### Registry

- `kind = "scene"` for scene-import-hosted conditions.
- Examples: `sceneBonusWpReroll` (roll), `sceneVitaeCharge` (stat).

### Hosted reconciler

- `Conditions.collectHostedIdsForSession()` — union site + district + `sessionScene.conditions`.
- `Conditions.reconcileHostedForSession(opts?)` — single presence check per PC; strips/adds `location` and `scene` keys.
- `Conditions.reconcileLocationHostedForScene` — alias to `reconcileHostedForSession`.

### Scene import

- `sessionScene.conditions`: optional string array; each id must be `kind = "scene"`.
- `sessionScene.rollDefaults`: **hard reject** on import.

### Roll merge order (post-change)

1. `RO.defaultsForRollType`
2. Condition roll policy (active `playerData.conditions`)
3. ST modal overrides (respect `rollPolicy.locked`)

### Presentation contract

Hosted reconcile at scene boundaries: `skipPresentation = true` → caller `Sync.full` + sheet refresh.

---

## §4 Verification checklist

- [ ] Import with `conditions: ["sceneBonusWpReroll"]` → apply → present PCs have key in `DEBUG.dumpConditions`
- [ ] Seat absent → hosted keys stripped
- [ ] End scene → hosted keys cleared when bundle clears site/scene conditions
- [ ] Roll with scene roll condition → `DEBUG.dumpRollPolicy` reflects policy
- [ ] Import with `rollDefaults` → validation error
- [x] `npm run build` OK through Lua codegen (pre-existing `tts-object-stub-guids` gate fails on workshop stubs — unrelated)
- [ ] Dupont district + scene condition stack for present PC
