# Custom roll mechanics — definition, application, and extension

This document describes how chronicle-specific and optional mechanics are wired today, and how to add new ones without duplicating the core roll pipeline.

---

## Three buckets (what kind of change is it?)

Mechanics fall into three layers. Pick the right layer so classification math, UI options, and table physics stay separated.

### A. Storyteller / per-roll configuration (`active.rollOptions`)

- **Defined** in `lib/roll_options.ttslua`: string keys (`RO.ROLL_*`), defaults per `rollType` in `RO.defaultsForRollType`, structural rules in `RO.sanitizeRollOptions` (e.g. which toggles apply to which roll types, numeric clamps).
- **Stored** on the active roll as `active.rollOptions`, seeded when the roll is created (`RO.seedActiveRoll`).
- **Edited** in the ST modal: `ui/shared/roll_options_modal.xml` plus `core/roll_ui.ttslua` (`RUI.openRollOptionsModal`, `RUI.applyRollOptionsModal`).
- **Merged** by `RC.setRollOptions` in `core/roll_controller.ttslua` (booleans and numbers).
- **Read** with `RO.getForActive`, `RO.getNumberForActive`, `RO.isWillpowerSpendAllowedByOptions`, etc., wherever behavior needs a tunable.

Use this bucket for **“the ST sets a knob for this roll.”**

### B. Classification-time rules (face values → result class)

- **Pure V5 math** lives in `core/dice.ttslua` (`Dice.classifyRoll` and helpers). It receives an **`opts`** table (e.g. `countCriticalPairs`, `bestialNull`).
- **Wiring** from `active.rollOptions` and `rollType` → `opts` is `RC.classifyOptsFromActive` in `core/roll_controller.ttslua`, which runs **`CLASSIFICATION_OPT_BUILDERS`**: a list of small functions `(active, opts) →` that only mutate `opts`.
- **Display** variants (e.g. paired faces for Bestial Null) are handled in `RC.buildDiceFacesForActive`; extend there when a mechanic changes how the UI shows dice, not the whole FSM.

Use this bucket for **rules that only change how pool math / result class is computed from numbers.**

### C. Table / session behavior (physics, Willpower waves, locks, cameras)

- Implemented in `core/roll_controller.ttslua` (phases, `willpower`, locking helpers, `RC.onWpRerollDieRandomized`, etc.) and `core/global_script.ttslua` (`onObjectRandomize`, HUD handlers, `GlobalRollSeatCamera`).
- **Per-die locks after WP randomize** use **`U.runAfterObjectPhysicsSettled`** (**`Wait.condition`**, same rest semantics as **`U.waitRestingSequence`**) instead of **`U.waitUntil(obj)`** (**`CheckCoroutine`** is brittle from **`onObjectRandomize`** — see **`core/lighting.ttslua`**). Max timeout: **`C.WP_REROLL_DIE_REST_MAX_WAIT_SECONDS`**.
- **Parameters** for that behavior still belong in `active.rollOptions` (e.g. can reroll hunger, number of rerolls, dice per spend) so new tuning does not require new globals.

Use this bucket for **what happens on the table** between phases, independent of success counting.

### D. Condition roll policies (`active.rollPolicy`)

- **Declared** in registry `roll = { ... }` on condition entries ([Conditions System Guide §6](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md#6-roll-policy-layer)).
- **Merged** at roll initiate by `Conditions.resolveRollPolicy` → `lib/condition_roll_policies.ttslua`.
- **Snapshotted** on `active.rollPolicy`; `RC.computeEffectiveRollState` derives effective structural `rollOptions` (respecting `locked` and per-roll overlay).
- **Tier 1** keys (surge multiplier, hunger reroll, classification flags) need no `RC` conditionals beyond apply + existing hooks.
- **Tier 2** enums (`wpRerollScope`) branch in `applyWpRerollWaveStart`.
- **Tier 3** lifecycle (`handlers`) dispatches via `core/roll_condition_handlers.ttslua`.

| Hook | Policy / handler use |
| --- | --- |
| `RC.initiateRoll` | overlay seed + `computeEffectiveRollState` |
| `RC.activateBloodSurge` | `bloodSurgeDiceMultiplier` |
| `CLASSIFICATION_OPT_BUILDERS` | `countCriticalPairs`, `bestialNull` from policy |
| `applyWpRerollWaveStart` | `wpRerollScope` |
| `RC.spendWillpower` / `onWpRerollDieRandomized` / `confirmRoll` | Tier 3 handlers |

Roll FSM must **not** scan `playerData.conditions` — only `active.rollPolicy`.

---

## What is not fully option-pluggable yet

- **Post-resolution automation** (Hunger increase after Rouse, Remorse humanity changes, etc.) is still largely driven by **roll type** in `RC._applyRollConsequences`. Adding a brand-new automated consequence path may touch that function until a small registry is extracted (same pattern as `CLASSIFICATION_OPT_BUILDERS`).
- **Tables of roll types** in `lib/constants.ttslua` (e.g. `C.RollTypesAutoBroadcast`, `C.RollTypesNoWillpower`) remain **data**: extend by adding entries, not by forking handlers.

---

## Checklist: adding a new mechanic

| If the mechanic is… | You typically add… |
|---------------------|-------------------|
| A new ST toggle or numeric field for a roll | A `RO.ROLL_*` key, default in `defaultsForRollType`, visibility/clamps in `sanitizeRollOptions`, XML + `RUI` open/apply, merge via `RC.setRollOptions`. |
| A change to how successes / crits / pools are computed from faces | Logic in `core/dice.ttslua` (or helpers it calls), new fields on `opts`, **one** new entry in `CLASSIFICATION_OPT_BUILDERS`, optional update to `RC.buildDiceFacesForActive`. |
| A change to physical rerolls, locks, waves, or cameras | State/helpers in `RC` and hooks in `global_script`; keep tunables in `rollOptions` where possible. |
| Something that runs **after** the roll is confirmed | `RC._applyRollConsequences` today, or a future registry if the switch grows too large. |

---

## Design principle

**Keep configuration (`rollOptions`), pure math (`dice.ttslua` + `opts`), and table mechanics (`RC` + global) separate.** New mechanics should **add rows** (keys, builders, focused helpers) rather than threading new conditionals through every step of `recalculate`, unless the mechanic truly changes the lifecycle—which most do not.

---

## Code anchors (quick navigation)

| Concern | Primary locations |
|--------|-------------------|
| Per-roll keys & defaults | `lib/roll_options.ttslua` |
| Condition roll policy merge | `lib/condition_roll_policies.ttslua`, `Conditions.resolveRollPolicyForActive`, `RC.computeEffectiveRollState` |
| Tier 3 roll handlers | `core/roll_condition_handlers.ttslua` |
| `opts` assembly for classify | `CLASSIFICATION_OPT_BUILDERS`, `RC.classifyOptsFromActive` — `core/roll_controller.ttslua` |
| Result math | `core/dice.ttslua` |
| Die face images for result strip | `RC.buildDiceFacesForActive` — `core/roll_controller.ttslua` |
| ST modal | `ui/shared/roll_options_modal.xml`, `core/roll_ui.ttslua` |
| WP / locks / phases | `core/roll_controller.ttslua`, `core/global_script.ttslua` |

---

## Related documents

- [Conditions System Guide](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md) — roll policy §6 + condition authoring
- [Dice System Outline](Dice%20System%20Outline.md) — full design and control flow.
- [Dice System Modifications](Dice%20System%20Modifications.md) — recent chronicle-specific requirements log.
