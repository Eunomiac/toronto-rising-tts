# Conditions System Guide

Canonical reference for creating or changing **any** condition in Toronto Rising. Persisted runtime shape and sheet math live in [PC Tracking & State Behavior](PC%20Tracking%20&%20State%20Behavior.md); this guide covers registry design, mutation triggers, effect channels, and roll policies.

---

## Agent quick guide — adding or changing a condition

> **Read this section first.** Full detail is in the sections below.

### `canApplyManually`

| Value | Meaning |
| --- | --- |
| `false` | Automatic only (e.g. torpor, impaired health). Has `derive`; never listed on scene/location import; never `setManual` / `setEvent`. |
| `true` | May be applied manually, listed on `sessionScene.conditions` / `C.Districts` / `C.Sites`, or toggled from ST UI. May still have `derive` for gating (e.g. `bumpBloodPotency`). |

**Effect type** (`type` = roll | stat | ui) is separate from manual applicability — use registry channels (`statChanges`, `roll`, `hud`, `lighting`).

### Typical mutation paths

| Situation | Typical mutation |
| --- | --- |
| Auto from stats (damage, humanity stains, …) | `canApplyManually = false` → `reconcileDerivedForPlayer` on stat paths; load |
| Storyteller panel toggle (frenzy) | `canApplyManually = true`, no `instanceSchema` → `setManual` / `clear` |
| Instance payload (blindfold variant) | `canApplyManually = true`, `instanceSchema` → `setEvent` / `clear` |
| District/site while PC is **present** | `canApplyManually = true` on `C.Districts` / `C.Sites` row + `reconcileHostedForSession` |
| Scene bundle while PC is **present** | `canApplyManually = true` on `sessionScene.conditions` (Scene Constructor import) + `reconcileHostedForSession` |

### Which effect channels?

| Channel | Registry key | Consumers (do not edit unless new channel) |
| --- | --- | --- |
| Stat dots / tracker length | `statChanges` | Sheets (`resolveForPlayer`), **`EffectiveStats.forPlayer`**, legacy `Conditions.effectiveStatDelta` / `effectiveAggregateDelta` |
| HUD overlay | `hud.overlay` or `hud.blindfoldVariant` | `core/hud_overlays.ttslua` |
| Seat spotlight | `lighting.seatLight2` | `core/lighting.ttslua` |
| Roll behavior | `roll = { ... }` | `active.rollPolicy` snapshot → `RC` hooks (see §6) |

### Checklist

1. Add entry to [`lib/condition_defs.ttslua`](../../lib/condition_defs.ttslua): `id`, `type`, `displayName`, `canApplyManually`, `priority`, effect channels.
2. If `canApplyManually = false`: add `derive(stats, activeConditions, statChanges?)`; optional `deriveSticky`, `suppressedBy`. If `canApplyManually = true` with hosting: optional `derive` for gating at reconcile time.
3. Wire **mutation** (skip if reconcile handles it):
   - Auto (`canApplyManually = false`) → `Conditions.reconcileDerivedForPlayer` on the mutation path
   - Hosted → `conditions` on district/site row or `sessionScene.conditions`; `reconcileHostedForSession` on scene lifecycle hooks
   - ST toggle (no `instanceSchema`) → `Conditions.setManual` / `clear`
   - Instance payload → `Conditions.setEvent` / `clear`
4. Roll effect → add `roll = { ... }`; pick tier (§6). Tier 1 = registry only; Tier 3 = handler module.
5. New HUD overlay → `ui/.templates/panel_overlays.xml` + `HO.allManagedOverlayIdsForSeat`.
6. Update `ConditionId` in [PC Tracking doc](PC%20Tracking%20&%20State%20Behavior.md) if adding a new id.
7. **Do not** scatter `CD.Defs` / `playerData.conditions` reads in consumers; **do not** hide reconciliation inside state setters.

### Decision tree

```
Auto from current stats only (never manual / scene list)?
  → canApplyManually = false (+ derive + reconcileDerivedForPlayer on stat writes)
Listed on district/site or sessionScene.conditions?
  → canApplyManually = true (+ optional derive for gating)
ST toggles in panel (boolean)?
  → canApplyManually = true, no instanceSchema → setManual
Needs instance payload (blindfold variant)?
  → canApplyManually = true, instanceSchema → setEvent
```

### Roll effect decision tree (only if `roll` channel needed)

```
Changes success math from faces only (crits, bestial null)?
  → Tier 1: roll.countCriticalPairs / roll.bestialNull
Changes a numeric knob (surge dice, reroll count, hunger reroll)?
  → Tier 1: matching roll.* policy key
Changes which dice unlock on WP spend (same FSM)?
  → Tier 2: roll.wpRerollScope enum
Changes confirm gating or mandatory full reroll lifecycle?
  → Tier 3: roll.handlers + core/roll_condition_handlers.ttslua
```

### Key files

| File | Role |
| --- | --- |
| `lib/condition_defs.ttslua` | Registry (**you edit this**) |
| `lib/condition_derive.ttslua` | Derived `suppressedBy` wrapper |
| `lib/condition_effects.ttslua` | Merge stat/HUD/light for presentation |
| `lib/condition_roll_policies.ttslua` | Merge `roll` → policy table |
| `core/conditions.ttslua` | Mutate, reconcile, `resolveForPlayer`, `resolveRollPolicy` |
| `core/roll_condition_handlers.ttslua` | Tier 3 roll lifecycle handlers |
| `core/roll_controller.ttslua` | Roll FSM (Tier 2/3 hooks only) |

### Verify

- `DEBUG.dumpConditions(seatColor)` — active ids + resolved stat/HUD/light
- `DEBUG.dumpRollPolicy(seatColor)` — merged roll policy for active roll (when rolling)

---

## 1. Architecture

**Registry** ([`lib/condition_defs.ttslua`](../../lib/condition_defs.ttslua)) defines behavior. **Persisted state** ([`playerData.conditions`](PC%20Tracking%20&%20State%20Behavior.md)) stores only **which** ids are active (plus minimal instance data).

Two phases on every change:

1. **Mutation** — write/remove keys in `playerData.conditions` (derive reconcile, location reconcile, setManual, setEvent, clear).
2. **Presentation** — `Conditions.afterChange` applies per-player lights/HUD/overlays/sheets (same slice as `Sync.player`, without requiring `core.sync`); consumers read **`Conditions.resolveForPlayer`** or **`Conditions.resolveRollPolicy`** on demand.

Do not embed world side effects in `S.setStateVal` for stats without an explicit sync/reconcile call afterward.

### Module map

| Module | Role |
| --- | --- |
| `lib/condition_defs.ttslua` | Static registry: `derive`, effects, priority |
| `lib/condition_derive.ttslua` | `suppressedBy` for derived evaluation |
| `lib/condition_effects.ttslua` | Merge → `statChanges`, `hudElementIds`, `lightingModes` |
| `lib/condition_roll_policies.ttslua` | Merge → roll policy snapshot |
| `core/conditions.ttslua` | Global API: mutate, reconcile, resolve |
| `core/roll_condition_handlers.ttslua` | Tier 3 roll hook dispatch |

---

## 2. `canApplyManually`

### `canApplyManually = false` (automatic only)

- Requires `derive(stats, activeConditions, statChanges?)`.
- `Conditions.reconcileDerivedForPlayer` adds/removes keys from stats (+ `suppressedBy`, `deriveSticky`).
- `deriveSticky = true` (torpor): reconcile **adds** when derive is true; **never auto-removes** when false — only `Conditions.clear`.
- **Cannot** appear on `sessionScene.conditions`, district/site rows, or `setManual` / `setEvent`.

### `canApplyManually = true`

- May be listed on scene import, `C.Districts` / `C.Sites`, or applied via ST APIs.
- **Boolean toggle:** no `instanceSchema` → `Conditions.setManual(playerID, id, true)`.
- **Instance payload:** `instanceSchema` present → `Conditions.setEvent(playerID, id, instance)` (e.g. blindfold `variant` 1..6).
- **Hosted session:** `Conditions.reconcileHostedForSession` applies listed ids to **present** PCs only. Unions site/district rows and `sessionScene.conditions`.
- Optional `derive` gates who receives a hosted key and when effects apply (e.g. `bumpBloodPotency` only for vampires with BP).

Pass `{ skipPresentation = true }` to `reconcileHostedForSession` when the caller runs `Sync.full` immediately afterward.

---

## 3. Effect channels

### `statChanges`

Merged into presentation via `Conditions.resolveForPlayer`. **Read-time game logic** must use [`lib/effective_stats.ttslua`](../../lib/effective_stats.ttslua) (`EffectiveStats.forPlayer` / `forSeat`) — see §10. Legacy `Conditions.effectiveStatDelta` / `effectiveAggregateDelta` delegate to the same math.

### `hud` / `lighting`

- `hud.overlay` → managed overlay id per seat
- `hud.blindfoldVariant` → instance-driven blindfold overlay
- `lighting.seatLight2` → seat spotlight mode override (priority merge)

### `roll`

See §6. Snapshot on `active.rollPolicy` at roll initiate; `RC` reads policy only — not raw condition tables.

---

## 4. When conditions refresh

| Event | What runs |
| --- | --- |
| Health/willpower Apply | `reconcileDerivedForPlayer` → `afterChange` |
| Humanity stain/base/clear | `reconcileDerivedForPlayer` → `afterChange` |
| ST torpor clear | `clear("torpor")` → `reconcileDerivedForPlayer` |
| ST frenzy/blindfold | `setManual` / `clear` → `afterChange` |
| Scene transition blindfold | `setEvent` / `clear` → `afterChange` |
| Game load | `validateAllPersisted` → `reconcileDerivedAllPlayers` → `reconcileHostedForSession` |
| Location / scene apply / End scene | `reconcileHostedForSession` |
| Seat presence / table switch | `reconcileHostedForSession` |
| Roll initiate | `resolveRollPolicyForActive` → `RC.computeEffectiveRollState` |
| Hunger, XP, other stats alone | **No** automatic derive reconcile |

---

## 5. Registry examples

**Automatic — torpor** (`canApplyManually = false`, `deriveSticky`, suppressed downstream impaired health via separate `suppressedBy` on those entries):

```lua
torpor = {
  canApplyManually = true,
  priority = 100,
  deriveSticky = true,
  derive = function(stats, _activeConditions) ... end,
  lighting = { seatLight2 = "OFF" },
}
```

Torpor and impaired-willpower no longer have a HUD overlay (overlay art removed); they keep their stat/lighting effects only.

**Automatic — stained** (`canApplyManually = false`; overlay shows whenever Humanity has ≥ 1 Stain):

```lua
stained = {
  canApplyManually = false,
  priority = 45,
  derive = function(stats, _activeConditions)
    local stains = tonumber(stats.humanity and stats.humanity.stains) or 0
    return stains >= 1
  end,
  hud = { overlay = "overlay_stained" },
}
```

**Manual ST toggle — hudFrenzy:**

```lua
hudFrenzy = {
  canApplyManually = true,
  priority = 30,
  hud = { overlay = "overlay_frenzy" },
}
```

**Per-roll overlay — bestialNull:** `type = "roll"`, `canApplyManually = true`, `roll = { bestialNull = true }`. Shown in Roll Options modal for all roll types. Dice-E2E Suite F applies via `rollE2eApplyConditions("Brown", { "bestialNull" })`.

**Event instance — hudBlindfold:**

```lua
hudBlindfold = {
  canApplyManually = true,
  priority = 70,
  instanceSchema = { variant = "number" },
  hud = { blindfoldVariant = true },
}
```

**Hosted location — bumpBloodPotency** (Dupont district):

```lua
bumpBloodPotency = {
  canApplyManually = true,
  priority = 10,
  derive = function(stats, _activeConditions)
    return CD.statsHasBloodPotencyRating(stats)
  end,
  statChanges = { bloodPotency = 1 },
}
```

**Manual major claim — skill temp bonus** (persists until `Conditions.clear`; dot keys are flat skill names):

```lua
majorClaim_DupontByTheCastle = {
  canApplyManually = true,
  priority = 10,
  statChanges = { etiquette = 2 },
}
```

Apply: `Conditions.setManual(playerID, "majorClaim_DupontByTheCastle", true)` — merges +2 into effective skill temp via `EffectiveStats` / sheet dots without writing `stats.skills.etiquette.temp` directly.

---

## 6. Roll policy layer

Conditions may declare **`roll = { ... }`**. At `RC.initiateRoll`, `Conditions.resolveRollPolicyForActive(playerID, active)` merges persisted conditions plus per-roll `active.rollConditionOverlay` into **`active.rollPolicy`**. `RC.computeEffectiveRollState` seeds effective structural `rollOptions`; `RC` and handlers read the snapshot — never `CD.Defs` directly.

### Merge order (with ST roll options)

1. `RO.defaultsForRollType`
2. **Condition roll policy** (from registry via active `playerData.conditions`)
3. ST modal overrides — **except** keys listed in `rollPolicy.locked`

### Policy schema (v1)

| Key | Type | Merge | Consumer |
| --- | --- | --- | --- |
| `bloodSurgeDiceMultiplier` | number | multiply (default 1) | `RC.activateBloodSurge` |
| `wpCanRerollHunger` | boolean | OR | `active.rollPolicy.wpCanRerollHunger` (WP reroll wave) |
| `wpRerollCountBonus` | number | sum | `ROLL_NUMBER_OF_REROLLS` |
| `countCriticalPairs` | boolean | last-wins by priority | `CLASSIFICATION_OPT_BUILDERS` |
| `bestialNull` | boolean | OR | classification builder |
| `takeHalfAllowed` | boolean | AND | seed / sanitize |
| `wpRerollScope` | enum | highest severity | `applyWpRerollWaveStart`, handlers |
| `handlers` | string[] | union | `RollConditionHandlers.run` |
| `locked` | table | union of field names | `RC.setRollOptions` guard |

**`wpRerollScope` values:**

- `selective` — default: cap N dice; hunger locked unless `wpCanRerollHunger`
- `all_optional` — unlock all eligible dice; player chooses
- `all_mandatory` — Tier 3: must reroll every die before confirm (handler-owned)

### Roll tiers

| Tier | Meaning | Author work |
| --- | --- | --- |
| **1** | Boolean/number policy keys | Registry `roll` table only |
| **2** | Algorithm variant (enum) | Registry + one branch in existing `RC` helper |
| **3** | Lifecycle change | Registry `handlers` + entry in `core/roll_condition_handlers.ttslua` |

### Hook inventory

| Hook | When | Policy use |
| --- | --- | --- |
| `onRollInitiated` | After `RO.seedActiveRoll` in `initiateRoll` | snapshot + apply |
| `onBloodSurgeActivate` | `RC.activateBloodSurge` | `bloodSurgeDiceMultiplier` |
| `onClassifyOpts` | `CLASSIFICATION_OPT_BUILDERS` | crits, bestial null |
| `onPostRollSettle` | `recalculate` → POST_ROLL | WP offer (future) |
| `onWillpowerSpent` | `RC.spendWillpower` | handlers + scope |
| `onWpRerollWaveStart` | `applyWpRerollWaveStart` | `wpRerollScope` |
| `onWpDieRandomized` | `RC.onWpRerollDieRandomized` | mandatory-all tracking |
| `onConfirmRoll` | `RC.confirmRoll` | gate confirm (Tier 3) |

### Roll examples

```lua
-- Tier 1: double Blood Surge bonus dice (automatic from stats)
doubleBloodSurge = {
  canApplyManually = false,
  priority = 20,
  derive = function(stats) ... end,
  roll = { bloodSurgeDiceMultiplier = 2 },
}

-- Tier 1: allow Hunger dice on WP reroll (hosted or manual)
allowHungerWpReroll = {
  canApplyManually = true,
  priority = 15,
  roll = { wpCanRerollHunger = true },
}

-- Tier 3: mandatory full reroll on WP spend (handler stub)
compulsionFullReroll = {
  canApplyManually = true,
  priority = 80,
  roll = {
    wpRerollScope = "all_mandatory",
    handlers = { "mandatoryFullWpReroll" },
    locked = { wpRerollScope = true },
  },
}
```

### Roll non-goals (v1)

- Pool-size modifiers at initiate (`poolBonus` — future)
- Mid-roll live policy refresh when conditions change
- Post-resolution consequence registry (keep `RC._applyRollConsequences` as-is)

Implementation checklist: [`.dev/plans/roll-conditions-policy-layer.md`](../plans/roll-conditions-policy-layer.md).

---

## 7. Walkthrough — add a derived stat penalty

1. Add `myCondition` to `CD.Defs` with `canApplyManually = false`, `derive`, `statChanges`, optional `hud`/`lighting`.
2. Call `Conditions.reconcileDerivedForPlayer(playerID)` from the stat mutation path that should trigger it.
3. No sheet/HUD/light code changes if using existing channels.
4. Test with `DEBUG.dumpConditions(seatColor)`.

---

## 8. Debug and test matrix

| Check | Command / action |
| --- | --- |
| Active ids + presentation | `DEBUG.dumpConditions("Brown")` |
| Effective stat getters | `DEBUG.dumpEffectiveStats("Brown")` |
| Roll policy on active roll | `DEBUG.dumpRollPolicy("Brown")` |
| Location condition | Apply Dupont site; verify `bumpBloodPotency` on present PC |
| Roll Tier 1 | Blood Surge with multiplier condition; WP reroll hunger toggle |
| Locked policy | ST modal cannot override `rollPolicy.locked` fields |

---

## 9. Effective stats (read-time)

**Single facade:** [`lib/effective_stats.ttslua`](../../lib/effective_stats.ttslua) — one `Conditions.resolveForPlayer` pass per `forPlayer` / `forSeat` call; typed getters by stat family.

```lua
local ES = require("lib.effective_stats")
local ctx = ES.forPlayer(playerID)  -- or ES.forSeat(color)

ctx.trackerMax("health")           -- damage overflow, remorse pool, derive thresholds
ctx.bloodPotencyDerived().bloodSurge
ctx.humanityLineLen()
ctx.dotRating("athletics")         -- future roll pool hooks (v1: not used for pool sizing)
ctx.scalar("hunger")               -- explicit no-merge scalars
ctx.rollPolicy()                   -- convenience; rolls still snapshot at initiateRoll
```

**Pure helper (no playerID):** `EffectiveStats.trackerMaxFromStats(stats, statChanges, trackerKey)` — shared with derive predicates via `PSC.trackerMaxFromStats`.

**Roll policy vs stats:** Stat-derived values use `EffectiveStats`. Roll knobs (`crits`, WP scope, surge multiplier) stay on **`active.rollPolicy`** snapshot at `initiateRoll`. Blood Surge may re-resolve policy at activation via `ctx.rollPolicy()` (intentional mid-PRE_ROLL exception).

### Anti-patterns

- Manual `base + temp` on health/willpower/humanity for outcomes (damage, remorse, derive, admin HUD).
- `S.getPlayerVal(..., "stats")` + ad-hoc condition math in game logic.
- `CD.trackerMaxFromStats` for outcome thresholds without merged `statChanges` (deprecated wrapper — base+temp only).
- `P.effectiveBloodPotencyWithConditions` (removed — use facade).

### Audit appendix — stat read access points

| Area | Module / function | Pattern | Verdict |
| --- | --- | --- | --- |
| Blood Surge dice | `RC.activateBloodSurge` | `ES.forSeat` → `bloodPotencyDerived` + `rollPolicy` | Facade |
| Remorse pool | `RC.initiateRoll` REMORSE | `ctx.trackerMax("humanity")` | Facade |
| Roll policy | `RC.initiateRoll` | `resolveRollPolicy` snapshot on `active` | Keep separate |
| Damage overflow | `P.applyDamageOrHeal` | `ctx.trackerMax(which)` | Facade |
| Derived conditions | `condition_defs` derive fns | `PSC.trackerMaxFromStats(stats, statChanges, …)` | Effective |
| Admin sidebar HUD | `UpdateUIDisplays` | `ctx.trackerMax` health/willpower | Facade |
| Sheets / decals | `GlobalCollectSheetImageUpdates`, `BPD` | `EffectiveStats` / `ctx.statChanges` | Facade |
| Attribute pool sizing | roll pool build | **Not consumed v1** | Documented non-goal |
| Hunger / XP | various | `ctx.scalar` / raw | No condition channel v1 |

### Raw stat read allowlist (grep gate)

Allowed without `EffectiveStats` (mutation, bootstrap, pure math):

- `lib/effective_stats.ttslua`, `lib/blood_potency_derived.ttslua` (BP rating + derived row lookup; object-safe split for CSHEET bundles), `lib/pc_sheet_collect.ttslua`
- `core/state.ttslua`, `lib/pc_bootstrap.ttslua` (bootstrap / persistence)
- `lib/condition_defs.ttslua` (registry only — derive receives pre-merged `statChanges`)
- Tests / `.tools/` gate scripts

New game-logic consumers needing condition-aware values **must** use `EffectiveStats.forPlayer`.

---

## 10. Related documents

- [PC Tracking & State Behavior](PC%20Tracking%20&%20State%20Behavior.md) — persisted shape, sheet math, API table
- [conditions-registry-pattern.md](../../docs/solutions/conditions-registry-pattern.md) — solutions digest
- [Custom Roll Mechanics](../Dice%20System/Custom%20Roll%20Mechanics.md) — roll FSM buckets A/B/C + §D roll policies
- [conditions-system-implementation.md](../plans/conditions-system-implementation.md) — module layout status
