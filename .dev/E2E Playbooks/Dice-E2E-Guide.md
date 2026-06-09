# Dice E2E — Guide

Reference for the lean test playbook `Dice-E2E.md`. Run tests in order from Step 0.


> **NOTE FOR AGENTS:** User edits to this document are called out via the "😀" emoji. When you find one, process it immediately if possible. When such a user comment is fully integrated (i.e. requested changes implemented, reported bugs fixed, etc.), delete the user comment.
>
> **NOTE FOR AGENTS:** A passed test will be marked beneath the "Pass If" line with a "✅". If that symbol appears without further comment, the entire test passed. If a test partially passed, it will still receive a "✅", but may be accompanied by comments describing where it did not meet requirements -- these will be called out with the "⚠️" emoji. If a test fails completely, it will be marked with an "❌", and a description of the failure will accompany the emoji.

**TOR-141** · Author: table **Host** (solo OK) · Est. time: **~30 min smoke** (Suites 0, A–E) · **~90 min full** (all suites).

Ground truth: `[core/roll_controller.ttslua](../../core/roll_controller.ttslua)`, `[core/dice.ttslua](../../core/dice.ttslua)`, `[lib/dice_kinds.ttslua](../../lib/dice_kinds.ttslua)`, `[lib/rouse_outcomes.ttslua](../../lib/rouse_outcomes.ttslua)`, `[.dev/Dice System/Dice System Outline.md](../Dice%20System/Dice%20System%20Outline.md)`, `[.dev/Dice System/Dice System Modifications & Augmentations Pt. 2.md](../Dice%20System/Dice%20System%20Modifications%20%26%20Augmentations%20Pt.%202.md)`.

**Optional difficulty (TOR-163):** Standard and Werewolf rolls may resolve when the ST never sets difficulty — classification uses implicit difficulty **1**, margin omitted, full broadcast (dice + class + successes).

**Not implemented:** `DEBUG.testRollFlow_`* — use this playbook + `rollTest` / bags / UI.

---

## Solo Host (one client)

You do **not** need a second player connected. `rollTest` / `rollStTest` move the **Host** (whichever seat they occupy) to the target seat via `changeColor`, hide that seat’s loading overlay, and apply Debug Camera spoof **before** arming the roll. If you are **already** on the target seat (e.g. mid–Suite A), prep still succeeds. `rollCancel(color)` returns the Host to **Black** when `color` is not Black.


| Goal                     | Solo approach                                                         |
| ------------------------ | --------------------------------------------------------------------- |
| Arm roll / read state    | Console: `rollTest`, `rollState`, `print(GlobalGetRollPhase(...))`    |
| Click dice bags + panel  | Host is already on the roll seat after `rollTest`                     |
| Skip physics, finish FSM | `rollForceConfirm(color)` in **POST_ROLL** only (after settle/recalc) |
| Assert state (E2E)       | `rollConfirm(color, { phase, active, pool, ... })` → PASS/FAIL        |
| Storyteller NPC roll     | `rollStTest()` (prep on **Black**) + ST dashboard                     |
| Oblivion rouse (D, P)    | `rollTest("Purple", …)`                                               |


### E2E harness helpers (console)


| Helper                                                                   | Purpose                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `rollTest(color, diff?, type?, label?, hungerLevel?)`                    | Seat prep + arm **PRE_ROLL** with ST difficulty; 5th arg sets hunger 0–5 when needed |
| `rollTestNoDiff(color, type?, label?, hungerLevel?)`                       | Same as `rollTest` but **no** `setDifficulty` — optional-difficulty E2E (Suite E2, H1b) |
| `rollStTest(label?, type?)`                                              | Seat prep on **Black** + ST NPC roll                                        |
| `rollSetFaces(color, { normal, hunger, rouse, oblivRouse })`             | After settle: set faces + `RC.recalculate`                                  |
| `rollE2eApplyConditions` / `rollE2eClearConditions`                      | Suite F (`e2eBestialNull`)                                                  |
| `rollCancel(color)`                                                      | Cancel roll; non-Black returns Host to **Black**; **Black** clears ST slots |
| `rollConfirm(color, expected)`                                           | Assert roll state; prints **PASS** / **FAIL** + mismatch list (E2E)         |
| `rollForceConfirm(color)`                                                | Force **CONFIRM** in POST_ROLL (automation only — not in human step lists)  |
| `rollConfirmTracker(color, { hunger?, stains?, willpowerSuperficial? })` | Tracker PASS/FAIL after confirm/broadcast                                   |
| `rollE2eSetPoolAndSpawn(color, normal, hunger)`                         | Set `active.pool` + spawn staged dice (PRE_ROLL)                                                            |
| `rollE2eSetPoolAutoHunger(color, normalBagClicks)`                      | Auto-Hunger pool from virtual Normal-bag clicks + spawn (Suite G)                                           |
| `rollE2eAddPoolKindSpawn(color, kind, count)`                           | Add pool kind (e.g. `"rouse"`) + spawn after base pool (H2, I4, J1)                                         |
| `rollE2eSettlePresetCheck(color, faces)`                                 | Spawn pool + `startRolling` + preset faces + settle (Suites C–G; no panel Roll)                             |
| `rollE2eExpectBroadcast({ visible, resultClass?, successes?, margin?, marginAbsent? })` | Assert shared `rollResult_*` panel after Confirm / `rollForceConfirm` |
| `rollStConfirm({ liveSlotIndex?, initiateBlocked? })`                    | ST slot assertions                                                          |
| `setHumanityStains(color, n)` / `setWillpowerSuperficial(color, n)`      | Seed tracker before outcome tests                                           |


### `rollConfirm` (assertions)

Phase is `active.phase` (same value as `GlobalGetRollPhase({ color })`). Aliases: `preRoll`, `PRE_ROLL`, `postRoll`, etc.

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { difficulty = 3, rollType = C.RollType.STANDARD },
})
rollConfirm("Brown", { noActive = true })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { result = { present = true, resultClass = { present = true } } },
})
rollConfirm("Brown", { pool = { bloodSurgeRouse = 1 }, meta = { bloodSurgeActive = true } })
rollConfirm("Brown", { rouseStripLabel = "Blood Surge Rouse" })
rollConfirm("Brown", { wpRerollChosenCount = 1 })  -- after WP reroll cap test (I2)
rollConfirm("Brown", {
  active = { result = { resultClass = "win", successes = 2, marginAbsent = true } },
})
```

**Matchers:** `{ present = true }` means the value must exist (not nil). `{ present = false }` means nil/absent. `marginAbsent = true` on `result` asserts `active.result.margin == nil`. You can combine with nested fields, e.g. `result = { present = true, resultClass = { present = true } }` — that asserts `active.result` and `active.result.resultClass` exist; it does **not** look for a literal `.present` key on the result record. Otherwise use **exact** literals (`pool = { normal = 5 }`). Shorthand keys `pool`, `meta`, `result` merge into `active.*`.

## Deterministic test conventions

Every step is **mandatory**. Do not improvise pool sizes, click counts, or assertion values.


| Rule                             | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pool size                        | Exact counts only (e.g. **5 dice**, not "about 5")                                                                                                                                                                                                                                                                                                                                                                                                      |
| Bag clicks                       | State **how many** left/right clicks on **which** bag                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Tray die reroll**              | **Do not** left-click dice on the tray. **Hover** the die, press **R** to randomize (Willpower reroll, manual corrections). Bag clicks are unchanged.                                                                                                                                                                                                                                                                                                    |
| `rollTest` hunger                | Pass 5th arg `hungerLevel` whenever the pool needs hunger dice (`0` = Normal bag adds only Normal dice)                                                                                                                                                                                                                                                                                                                                                 |
| **Auto-Hunger** (default **on**) | **Do not** left-click the **Hunger bag** to add hunger dice on standard rolls — that triggers **Blood Surge**. With `autoHunger` on, each **left-click Normal bag** adds a **Hunger** die while `pool.hunger < hungerLevel`, then **Normal** dice. To build **N** normal + **H** hunger: left-click **Normal bag `(hungerLevel + N)` times** when `H == hungerLevel` (typical). Example: `rollTest(..., 2)` and pool `2N+2H` → **4** Normal bag clicks. |
| `rollConfirm`                    | Use **exact** numbers. Avoid `{ min = N }` unless this doc cites a named constant. `**wpRerollChosenCount`** — count of dice randomized in the current WP wave (cap tests, e.g. I2)                                                                                                                                                                                                                                                                     |
| `rollConfirmTracker`             | Assert hunger / stains / superficial willpower after consequences apply                                                                                                                                                                                                                                                                                                                                                                                 |
| `rollE2eSetPoolAndSpawn` / `rollE2eSetPoolAutoHunger` | After `rollTest`: set pool + spawn staged dice (Suite F explicit counts; Suite G uses `rollE2eSetPoolAutoHunger` with Normal-bag click count) |
| `rollE2eAddPoolKindSpawn`        | Add a pool kind (e.g. **rouse**) + spawn — use after `rollE2eSetPoolAndSpawn` when the test needs compound pools (H2, I4, J1) |
| `rollE2eSettlePresetCheck`       | **After pool spawn** — `startRolling`, preset faces, settle (replaces panel Roll; **do not** click Roll between `rollTest` and this helper)                                                                                                                                                                                                                                              |
| `rollE2eExpectBroadcast`         | After **Confirm** / `rollForceConfirm`: assert `rollResult_panel` visible and class/successes/margin text; use `marginAbsent = true` when ST never set difficulty |
| **Optional difficulty**          | Steps using `rollTestNoDiff`: do **not** set ST dashboard difficulty; assert `marginAbsent` unless the step sets difficulty mid-test (E2b) |
| Suites **H onward**              | Start each test with `rollCancel(color)`; spawn pool via helpers (**not** bag clicks) unless the step tests bag behavior (Suite **K**) |
| **Pass if**                      | Every test block includes a **Pass if:** line; agent removes integrated 😀 notes |
| `rollStConfirm`                  | Assert `liveSlotIndex` and ST initiate blocking                                                                                                                                                                                                                                                                                                                                                                                                         |
| Panel actions                    | Prefer console `RC.takeHalf`, `RC.openRoll` when listed; otherwise click the named panel control                                                                                                                                                                                                                                                                                                                                                        |
| Visual-only                      | **Only** when this doc explicitly says **Visual check** (dashboard label, known-bug UI)                                                                                                                                                                                                                                                                                                                                                                 |


### Brown fixture constants (re-verify after test-sheet BP change)


| Constant                        | Value | How to set                                                                        |
| ------------------------------- | ----- | --------------------------------------------------------------------------------- |
| `BROWN_SURGE_DICE`              | **2** | Brown Blood Potency yields `bloodSurge = 2` (`DEBUG.dumpEffectiveStats("Brown")`) |
| Brown hunger for bag-pool tests | **0** | `rollTest(..., 0)` as 5th argument unless step says otherwise                     |


## Step 0 harness check

After **Save & Play**, `lua debugHelp()` must list `rollConfirm(color, expected)`. If Step 0 prints `confirm failed — is the roll in POST_ROLL?`, the table is still on legacy one-argument `rollConfirm` — save bundled Lua again and retry.

## Prerequisites

- Table **Host** (you).
- **Save & Play** so bundled Lua matches repo.
- Character data for test colors: **Brown** (suites A–C, F, G–N), **Purple** (D, P), **Black** (E, O).
- No active roll on any seat (Step 0).
- **Suite I** seeds Brown superficial willpower via `setWillpowerSuperficial` (see Suite I setup).

## Inspection cheat sheet

```lua
rollCancelAll()
rollState("Brown")                    -- full active record + queue
print(GlobalGetRollPhase({ color = "Brown" }))
DEBUG.dumpRollPolicy("Brown")
DEBUG.dumpConditions("Brown")
DEBUG.dumpEffectiveStats("Brown")
rollStSlots()                         -- ST drawer slots
```

**Baton holders** (`active.batonHolder`): `storyteller` → ST acts; `player` → PC acts; `auto` → physics/settle.

**Permanent automation** (`gameState.stRollSettings`): `autoHunger`, `autoWp`, `autoApplyRouseOutcomes`, `autoRemorse` — toggles in ST **Roll options** modal (`rollOpts_perm_`*).

**Pool composition (standard rolls):** Main pool (`normal` + `hunger`), optional **Blood Surge rouse** (`pool.bloodSurgeRouse`), optional **manual rouse** (`pool.rouse`), optional **oblivion-rouse**. Manual rouse and Obliv are **mutually exclusive**; `bloodSurgeRouse` coexists with manual rouse. Blood Surge: Hunger **left** activates (surge off) or adds surge rouse (surge on); Hunger **right** removes one surge rouse then full undo when none remain. Hunger bag disabled until PRE_ROLL. Normal bag **right** removes main-pool dice. See Dice System Pt. 2 § Pool composition.

**Per-roll options:** Set with `RC.setRollOptions` **immediately after** `rollTest` and **before** **Roll** / **Spend WP**. Do not use the ST Opts modal during E2E (TOR-162).

**`S.setStateVal`:** Value first, then path keys — e.g. `S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")`, not `S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)`.

```lua
RC.setRollOptions("Brown", { wpReroll = true, numberOfDiceRerolled = 3, canRerollHunger = false })
```

---


## Suite overview

- Step 0: Clear all active rolls.
- Suites A–E: Smoke path (~30 min). Standard roll, cancel, dedicated rouse, Oblivion rouse (Purple), ST NPC roll.
- Suite E2: Optional difficulty (TOR-163). E2c is covered by Suite O O2b.
- Suite F: Conditions roll policy (`e2eBestialNull`).
- Suite G: Result classification G1–G7. G6/G7: call `RC.setRollOptions` after `rollTest`, before settle.
- Suite H: Take Half (TOR-73).
- Suite I: Spend Willpower I1–I4.
- Suite J: Compound rouse in standard pool.
- Suite K: Dice bag clicks K1–K4.
- Suite L: Baton passing and permanent automation.
- Suite M: Bestial Null via roll option.
- Suite N: Blood Surge.
- Suite O: ST slots, Werewolf, brutal outcome.
- Suite P: Oblivion-Rouse multi-die (Purple).

### Suite G pool parameters

| Step | rollTest hunger (5th arg) | rollE2eSetPoolAutoHunger clicks |
| ---- | ------------------------- | ------------------------------- |
| G1   | 0                         | 2                               |
| G2–G4| 2                         | 4                               |
| G5   | 1                         | 3                               |
| G6   | 1                         | 5                               |
| G7   | 1                         | 4                               |

## Agent maintenance

User edits marked with 😀: integrate then delete the comment.
Passed tests: ✅ beneath Pass if. Partial: ✅ + ⚠️. Failed: ❌ + notes.

## Known failures (historical)

Record new failures in Linear; keep brief notes here when a step blocks the suite.

- **E2a:** `rollE2eExpectBroadcast` may expect `Win` while panel shows `SUCCESS`.
- **H1b:** `rollE2eExpectBroadcast` may report panel not visible even when it appeared on screen.
- **H2 / H2b:** Take Half + rouse may stay in `rolling` after `RC.onDiceSettled`; ST Confirm may be unavailable until fixed.
- **I4:** `rollE2eSettlePresetCheck` may lock dice before they drop to the tray (floating dice).
- **I1:** If the WP reroll wave never ends on hesitation, see TOR-165 (WP reroll wave / Confirm).

## Sign-off


| Suite                           | Pass | Notes                    |
| ------------------------------- | ---- | ------------------------ |
| 0 Cleanup                       | ☐    |                          |
| A Standard smoke                | ☐    | A1–A3                    |
| B Cancel                        | ☐    |                          |
| C Rouse dedicated               | ☐    | C1–C2                    |
| D Oblivion dedicated (Purple)   | ☐    |                          |
| E ST standard                   | ☐    |                          |
| E2 Optional difficulty          | ☐    | E2a–E2c (+ O2b)           |
| F Conditions (`e2eBestialNull`) | ☐    | F1–F2                    |
| G Classification                | ☐    | G1–G7                    |
| H Take Half                     | ☐    | H1–H1c, H2–H2b           |
| I Spend WP                      | ☐    | I1–I4                    |
| J Compound rouse                | ☐    | J1–J2                    |
| K Bag clicks                    | ☐    | K1a–K4, K2g-Brown/Purple |
| L Baton + automation            | ☐    | L1a–L2c                  |
| M Bestial Null (roll option)    | ☐    | M1                       |
| N Blood Surge                   | ☐    | N1–N3                    |
| O ST / Werewolf / Brutal        | ☐    | O1a–O3                   |
| P Oblivion multi-die            | ☐    | P-A–P-F, Purple          |


---


## Appendix — Oblivion procedure (A–D)

From Pt. 2 / `RO.resolveOblivRouseDice`:

1. **All same face** — single-face table (1 → hunger+stain, 2–5 → hunger, 6–9 → pass, 10 → stain).
2. **Any 6–9** — success.
3. **Any 2–5 without 6–9** — hunger +1; if also **10** → player chooses hunger **or** stain.
4. **Only 1s and/or 10s** (not all identical) — stained.

---


## Related

- [TESTING.md](../TESTING.md) — console helper index
- [Conditions System Guide](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md) — roll policy §6
- [Custom Roll Mechanics](../Dice%20System/Custom%20Roll%20Mechanics.md) — three option buckets


- Dice-E2E-Guide.md (this file)
- Dice-E2E.md (test steps only)