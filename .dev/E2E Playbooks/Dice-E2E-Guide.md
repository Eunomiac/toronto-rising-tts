# Dice E2E — Guide

Reference for the lean test playbook `Dice-E2E.md`. Run tests in order from Suite 0.

**Run log reviews:** [`Dice-E2E-Run-1-Findings.md`](Dice-E2E-Run-1-Findings.md) (Run 1), [`Dice-E2E-Run-2-Findings.md`](Dice-E2E-Run-2-Findings.md) (Run 2, annotated).

## Running the playbook (streamlined blocks)

`Dice-E2E.md` contains **only** fenced `U.RunSequence` Lua blocks (no markdown suite/step headers). Context appears in console via **`printHeader`**:

| Level | Meaning |
| --- | --- |
| **1** `*` | Suite open/close (`Dice E2E: SUITE A - …`) |
| **2** `=` | Step/substep open/close (`Step A1 - …`, `K2a - …`) |
| **3** `-` | **`[HUMAN]`** — stop after this block and act in TTS |

**Workflow (manual):** paste **one** `lua` block → execute → if the last line is `[HUMAN]`, perform the action → paste the **next** block.

**Workflow (`RunTest`):** faster console driver — blocks are embedded at build time from this markdown into `lib/e2e_playbook_dice.ttslua`.

```lua
lua RunTest("Dice")        -- prints [RunTest] Initialized 'Dice' (next RunTest runs step 1)
lua RunTest("Dice", 8)     -- arm at step 8/56; RunTest("Dice", "H") jumps to suite H
lua RunTest()              -- prints [RunTest] Dice step N/total, then runs the block
```

Re-arming with `RunTest("Dice")` resets the step index and cancels any in-flight step. Step index is **1-based** (each fenced `U.RunSequence` block). Suite ids (`0`, `A`–`P`, `E2`) map to the first block that opens that suite. After a **Save & Play** reload, all steps are replayable; without reload, steps already run in-session may be empty (playbook tables are mutated once per load).

`RunTest` adds no extra lines after the step — rely on level-3 `[HUMAN]` banners inside the playbook output. FAIL-abort arms only after a **level-1** suite `printHeader` (ten leading `*`) in that step; then any console line containing **`FAIL`** (case-sensitive) cancels the step (`[RunTest] Stopped at step N/total: FAIL detected in output`). Mid-playbook `RunTest("Dice", N)` without a suite banner does not arm FAIL-abort. `RunTest("Scenes")` and `RunTest("Gameboard")` return **not yet prepared** until those playbooks are streamlined and wired. Regenerate: `npm run e2e-playbook:generate` (or full `npm run build`), then **Save & Play**.

After `rollForceConfirm`, put `rollE2eExpectBroadcast` in the **next** `RunSequence` function (not the same step as confirm) so the default inter-step wait lets the broadcast panel populate.

Collapsed blocks may chain many automated steps (setup + spawn + `rollConfirm`) before the human gate. The **last block** of the file closes the run (`printHeader("", 1)` + `print("")`) with no `[HUMAN]`.

Cross-playbook rules: [TESTING.md § Streamlined block workflow](../TESTING.md#streamlined-block-workflow).

---

> **NOTE FOR AGENTS:** User edits to this document are called out via the "😀" emoji. When you find one, process it immediately if possible. When such a user comment is fully integrated (i.e. requested changes implemented, reported bugs fixed, etc.), delete the user comment.
>
> **NOTE FOR AGENTS:** A passed test will be marked beneath the "Pass If" line with a "✅". If that symbol appears without further comment, the entire test passed. If a test partially passed, it will still receive a "✅", but may be accompanied by comments describing where it did not meet requirements -- these will be called out with the "⚠️" emoji. If a test fails completely, it will be marked with an "❌", and a description of the failure will accompany the emoji.

**TOR-141** · Author: table **Host** (solo OK) · Est. time: **~30 min smoke** (Suites 0, A–E) · **~90 min full** (all suites).

Ground truth: `[core/roll_controller.ttslua](../../core/roll_controller.ttslua)`, `[core/dice.ttslua](../../core/dice.ttslua)`, `[lib/dice_kinds.ttslua](../../lib/dice_kinds.ttslua)`, `[lib/rouse_outcomes.ttslua](../../lib/rouse_outcomes.ttslua)`, `[.dev/Dice System/Dice System Outline.md](../Dice%20System/Dice%20System%20Outline.md)`, `[.dev/Dice System/Dice System Modifications & Augmentations Pt. 2.md](../Dice%20System/Dice%20System%20Modifications%20%26%20Augmentations%20Pt.%202.md)`.

**Optional difficulty (TOR-163):** Standard and Werewolf rolls may resolve when the ST never sets difficulty — classification uses implicit difficulty **1**, margin omitted, full broadcast (dice + class + successes).

**Not implemented:** `DEBUG.testRollFlow_`* — use this playbook + `rollTest` / bags / UI.

### Roll lifecycle (2026 INBOX — harness alignment)

| Behavior | E2E impact |
| --- | --- |
| **SETUP** pool build before ST **Open** | Bag-click suites use `rollTest(..., { skipOpen = true })` (or `{ hunger = n, skipOpen = true }`); assert `phase = "setup"` while building pool |
| **Open** → **PRE_ROLL** | Suite A Step A3 / K2i: hunger bag enabled in **SETUP**; left-click toggles **Blood Surge** (pool hunger dice via Normal bag auto-hunger only); automation: `rollE2eOpenRoll(color)` for baton/Open checks |
| Drawer **y > 2.5** before `releaseDice` | `rollE2eWaitForDiceTray` (~1.0s); `rollE2eSettlePresetCheck` may **return wait seconds** → follow with `rollE2eSettlePresetCheckResume(color)` in the **next** `U.RunSequence` function |
| **POST_ROLL Confirm** on player panel | `batonHolder = "player"` after settle/take-half; human **Brown/Purple Confirm** (not ST dashboard confirm); `rollForceConfirm` still valid for automation |
| Pool spawn on **open** | Dedicated rouse/remorse: `rollE2eSpawnActivePool` after `rollTest` when bag auto-spawn is not used |

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
| `rollTest(color, diff?, type?, label?, extra?)`                    | Seat prep + arm roll; default calls `openRoll` → **PRE_ROLL**. 5th arg: hunger `number` or `{ hunger?, skipOpen? }` — **`skipOpen = true`** leaves **SETUP** for bag build |
| `rollTestNoDiff(color, type?, label?, extra?)`                       | Same as `rollTest` but **no** `setDifficulty` — optional-difficulty E2E (Suite E2, H1b) |
| `rollE2eOpenRoll(color)`                                             | ST **Open** (SETUP → PRE_ROLL) after SETUP pool assembly |
| `rollStTest(label?, type?)`                                              | Seat prep on **Black** + ST NPC roll                                        |
| `rollSetFaces(color, { normal, hunger, rouse, bloodSurgeRouse, oblivRouse, werewolf, rage })` | After settle: set faces + `RC.recalculate` (use **`bloodSurgeRouse`**, not `rouse`, for surge dice) |
| `rollE2eApplyConditions` / `rollE2eClearConditions`                      | Suite F (`bestialNull`)                                                  |
| `rollCancel(color)`                                                      | Cancel roll; non-Black returns Host to **Black**; **Black** clears ST slots |
| `rollConfirm(color, expected)`                                           | Assert roll state; prints **PASS** / **FAIL** + mismatch list (E2E)         |
| `rollForceConfirm(color)`                                                | Force **CONFIRM** in POST_ROLL (automation only — not in human step lists)  |
| `rollConfirmTracker(color, { hunger?, stains?, willpowerSuperficial? })` | Tracker PASS/FAIL after confirm/broadcast                                   |
| `rollE2eSetPoolAndSpawn(color, normal, hunger)`                         | Set `active.pool` + spawn staged dice (PRE_ROLL)                                                            |
| `rollE2eSetPoolAutoHunger(color, normalBagClicks)`                      | Auto-Hunger pool from virtual Normal-bag clicks + spawn (Suite G)                                           |
| `rollE2eAddPoolKindSpawn(color, kind, count)`                           | Add pool kind + spawn after base pool (H2, I4, J1). **Rouse-family** kinds spawn via bag hook (+1 pool per die); helper must not preset count before spawn. |
| `rollE2eWaitForDiceTray`                                                | `U.RunSequence` step — returns ~1.0s pause after spawn (drawer must reach y > 2.5 before dice unlock)         |
| `rollE2eSpawnActivePool(color)`                                         | Spawn missing PRE_ROLL pool dice (dedicated rouse / after `rollTest`)                                       |
| `rollE2ePrepareRollRelease(color)`                                      | Dice-tray camera + open drawer (mirrors panel Roll prep; used before Take Half + rouse release)             |
| `rollE2eSettlePresetCheck(color, faces, opts?)`          | **PRE_ROLL:** release, `startRolling`, preset faces, settle. **SETUP:** spawn/wait only (`{}` faces; no release) — same async wait + **`rollE2eSettlePresetCheckResume(color)`** when drawer is still opening |
| `rollE2eConfirmBagEnabled(color, dieKind, wantEnabled)`                  | Assert player bag enabled/disabled at rest Y (K1a, K2g-Purple)                                              |
| `rollE2eExpectBroadcast({ color, visible, resultClass?, successes?, margin?, marginAbsent? })` | Assert shared `rollRes_*` panel after Confirm / `rollForceConfirm`; defer to the **next** RunSequence step after confirm. Pass **`color`** explicitly on human-confirm steps; automation may omit it only when the prior function called `rollForceConfirm` on that seat. History tail fallback is **seat-scoped** (no cross-player newest scan). `resultClass` shorthands (`Win`, `Failure`, …) match `C.ResultClassLabel` text. |
| `rollStConfirm({ liveSlotIndex?, liveSlotIndexAbsent?, slotNotCleared?, initiateBlocked? })` | ST slots: `liveSlotIndex` while rolling; after Confirm use `liveSlotIndexAbsent` + `slotNotCleared` for occupied drawer |
| `setHumanityStains(color, n)` / `setWillpowerSuperficial(color, n)`      | Seed tracker before outcome tests                                           |
| `printHeader(text, level)`                                               | E2E console banner (level 1 `*`, 2 `=`, 3 `-`; 100 chars when short, else `10pad + " " + text`) |
| `RunTest("Dice")` / `RunTest()`                                          | Console step driver over generated `lib/e2e_playbook_dice.ttslua` (build: `npm run e2e-playbook:generate`) |


## Console output (`printHeader` + `U.RunSequence`)

Cross-playbook rules live in [TESTING.md § E2E console output conventions](../TESTING.md#e2e-console-output-conventions). **Dice-E2E.md** is the reference implementation.

### Banner levels

| Level | When to open | When to close |
| --- | --- | --- |
| **1** | Start of each suite (`Dice E2E: SUITE A - Standard roll`) | End of suite: `printHeader("", 1)` then `print("")` |
| **2** | Start of each step (`Step A1 - Arm roll`, `G3 - …`) | End of that step when the next level-2 step begins — `printHeader("", 2)` |
| **3** | Immediately before human action: `printHeader("[HUMAN] …", 3)` | **Never** — level-3 lines are cues, not section wrappers |

### Sequence layout (typical step)

1. Open level-2 header (own `function()` step).
2. `rollCancelAll` or `rollCancel(color)` when the step requires a clean roll.
3. Setup + pre-human assertions in one `function()` (e.g. `rollTest`, `rollE2eSetPoolAndSpawn`, `rollConfirm` for `preRoll`).
4. **`rollE2eWaitForDiceTray`** after any staged spawn (or human bag clicks) and **before** release / `rollE2eSettlePresetCheck` / Take Half that unlocks dice.
5. `M.setCamera` + level-3 `[HUMAN]` header (own `function()` step) — tester performs UI actions (SETUP bag clicks, ST **Open**, player **Roll**, player **Confirm**).
6. **Separate** `U.RunSequence` block after human acts: optional `rollE2eWaitForDiceTray` if human just spawned dice; then `return rollE2eSettlePresetCheck(...)` when automating settle; **`rollE2eSettlePresetCheckResume(color)`** in the following function when the prior step returned a wait; post-settle `rollConfirm` / `rollE2eExpectBroadcast`, then `printHeader("", 2)` if the step ends.

**One `[HUMAN]` per block** — never two level-3 headers in one `U.RunSequence` (e.g. Suite E: ST label check and bag click are separate blocks).

Multi-phase steps within one level-2 section (e.g. Suite A Step A2 bag clicks) repeat steps 5–6 without closing level 2 until the step’s final assertion passes. Automated substeps with no human gate between them belong in the **same** block (see streamlined merges in `Dice-E2E.md`: E2a→E2b→F, G1–G6, etc.).

### Dice-specific camera targets

| Seat under test | `M.setCamera` target |
| --- | --- |
| Brown (default PC) | `"rollBrown"` |
| Purple (Oblivion) | `"rollPurple"` |
| Black (ST / Werewolf) | `"rollBlack"` |

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
| `rollE2eWaitForDiceTray`         | **Required** after spawn (or human bag clicks) — pause ~0.75s so the dice tray finishes opening before dice are released |
| `rollE2eSettlePresetCheck`       | **After spawn + wait** — `{ skipSpawn = true }` when pool dice already staged; release + `startRolling`, preset faces, settle (replaces panel Roll) |
| `rollE2eExpectBroadcast`         | After **Confirm** / `rollForceConfirm`: assert `rollRes_panel` visible and class/successes/margin text; use `marginAbsent = true` when ST never set difficulty |
| **Optional difficulty**          | Steps using `rollTestNoDiff`: do **not** set ST dashboard difficulty; assert `marginAbsent` unless the step sets difficulty mid-test (E2b) |
| Suites **H onward**              | Start each test with `rollCancel(color)`; spawn pool via helpers (**not** bag clicks) unless the step tests bag behavior (Suite **K**) |
| **Pass if**                      | Use the **Sign-off** checklist below; lean `Dice-E2E.md` has no per-step **Pass if:** lines |
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

**Pool composition (standard rolls):** Main pool (`normal` + `hunger`), optional **Blood Surge rouse** (`pool.bloodSurgeRouse`), optional **manual rouse** (`pool.rouse`), optional **oblivion-rouse**. Manual rouse and Obliv are **mutually exclusive**; `bloodSurgeRouse` coexists with manual rouse. Blood Surge: Hunger **left** activates (surge off) or adds surge rouse (surge on); Hunger **right** removes one surge rouse then full undo when none remain. Hunger bag hidden until a standard roll reaches PRE_ROLL (stays raised through ROLLING; hidden at POST_ROLL). Normal bag **right** removes main-pool dice. See Dice System Pt. 2 § Pool composition.

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
- Suite F: Conditions roll policy (`bestialNull`).
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

- **H2 / H2b:** Take Half + rouse merge required all rouse dice **locked** before POST_ROLL (fixed in `recalculateTakeHalfAwaitingRouse` — use readable on-table faces after settle debounce). Manual rouse throws also need `onObjectRandomize` to accept Custom Dice via `getRotationValue` (`RC.isPhysicalDieRandomizeEvent`); allow ~3s debounce after the die rests. **`rollE2eAddPoolKindSpawn` double-count:** presetting `pool.rouse` then spawning fired `GlobalOnBagDieSpawned` (+1) → UI showed 2R with 1 die; merge waited forever for a second die (fixed — rouse spawn uses bag increment path only; reduce uses `GlobalRemoveDieFromBag`, not `setPoolKindCount`).
- **Tray timing:** Automated spawn → release must include `rollE2eWaitForDiceTray` between staging and `rollE2eSettlePresetCheck({ skipSpawn = true })` (or Take Half + rouse release). Matches panel Roll’s drawer animation (~0.5s smooth + buffer).
- **`destroyDice` console error on cancel:** If a bag object’s bundled script drifted (e.g. `DICEBAG_ROUSE_PURPLE` / `70c7cf` missing `function destroyDice`), `rollCancelAll` logged a Lua error but tests continued. Global now falls back to destroying locked hover dice by tag. Often caused by **`.tts/objects` GUID mismatch** (stub on wrong filename) — `npm run build` runs `check:tts-object-stub-guids`; fix with **Get Lua Scripts** → `npm run tts-objects:fix-stubs` → Save & Play.
- **I1:** WP reroll wave ends after chosen dice settle (debounce ignores unlocked pool dice) or via **Confirm** during the wave (TOR-165). Cap N auto-finishes when N dice have randomized and locked.

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
| F Conditions (`bestialNull`) | ☐    | F1–F2                    |
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