# Dice — manual E2E playbook

> **NOTE FOR AGENTS:** User edits to this document are called out via the "😀" emoji. When you find one, process it immediately if possible. When such a user comment is fully integrated (i.e. requested changes implemented, reported bugs fixed, etc.), delete the user comment.
>
> **NOTE FOR AGENTS:** A passed test will be marked beneath the "Pass If" line with a "✅". If that symbol appears without further comment, the entire test passed. If a test partially passed, it will still receive a "✅", but may be accompanied by comments describing where it did not meet requirements -- these will be called out with the "⚠️" emoji. If a test fails completely, it will be marked with an "❌", and a description of the failure will accompany the emoji.

**TOR-141** · Author: table **Host** (solo OK) · Est. time: **~30 min smoke** (Suites 0, A–E) · **~90 min full** (all suites).

Ground truth: `[core/roll_controller.ttslua](../../core/roll_controller.ttslua)`, `[core/dice.ttslua](../../core/dice.ttslua)`, `[lib/dice_kinds.ttslua](../../lib/dice_kinds.ttslua)`, `[lib/rouse_outcomes.ttslua](../../lib/rouse_outcomes.ttslua)`, `[.dev/Dice System/Dice System Outline.md](../Dice%20System/Dice%20System%20Outline.md)`, `[.dev/Dice System/Dice System Modifications & Augmentations Pt. 2.md](../Dice%20System/Dice%20System%20Modifications%20%26%20Augmentations%20Pt.%202.md)`.

**Not implemented:** `DEBUG.testRollFlow_`* — use this playbook + `rollTest` / bags / UI.

---

## Solo Host (one client)

You do **not** need a second player connected. `rollTest` / `rollStTest` move the Host to the target seat (`Player.changeColor`), hide that seat’s loading overlay, and apply Debug Camera spoof **before** arming the roll. `rollCancel(color)` returns the Host to **Black** when `color` is not Black.


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
| `rollTest(color, diff?, type?, label?, hungerLevel?)`                    | Seat prep + arm **PRE_ROLL**; 5th arg sets hunger 0–5 when needed           |
| `rollStTest(label?, type?)`                                              | Seat prep on **Black** + ST NPC roll                                        |
| `rollSetFaces(color, { normal, hunger, rouse, oblivRouse })`             | After settle: set faces + `RC.recalculate`                                  |
| `rollE2eApplyConditions` / `rollE2eClearConditions`                      | Suite F (`e2eBestialNull`)                                                  |
| `rollCancel(color)`                                                      | Cancel roll; non-Black returns Host to **Black**; **Black** clears ST slots |
| `rollConfirm(color, expected)`                                           | Assert roll state; prints **PASS** / **FAIL** + mismatch list (E2E)         |
| `rollForceConfirm(color)`                                                | Force **CONFIRM** in POST_ROLL (automation only — not in human step lists)  |
| `rollConfirmTracker(color, { hunger?, stains?, willpowerSuperficial? })` | Tracker PASS/FAIL after confirm/broadcast                                   |
| `rollE2eSettlePresetCheck(color, faces)`                                 | Dedicated check: `rollSetFaces` + `startRolling` + settle (no Roll click)   |
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
rollConfirm("Brown", { pool = { rouse = 1 }, meta = { bloodSurgeActive = true } })
rollConfirm("Brown", { rouseStripLabel = "Rouse" })
rollConfirm("Brown", { wpRerollChosenCount = 1 })  -- after WP reroll cap test (I2)
```

**Matchers:** `{ present = true }` when the value is unknown until dice settle. Otherwise use **exact** literals (`pool = { normal = 5 }`). Shorthand keys `pool`, `meta`, `result` merge into `active.*`.

## Deterministic test conventions

Every step is **mandatory**. Do not improvise pool sizes, click counts, or assertion values.


| Rule                             | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pool size                        | Exact counts only (e.g. **5 dice**, not "about 5")                                                                                                                                                                                                                                                                                                                                                                                                      |
| Bag clicks                       | State **how many** left/right clicks on **which** bag                                                                                                                                                                                                                                                                                                                                                                                                   |
| `rollTest` hunger                | Pass 5th arg `hungerLevel` whenever the pool needs hunger dice (`0` = Normal bag adds only Normal dice)                                                                                                                                                                                                                                                                                                                                                 |
| **Auto-Hunger** (default **on**) | **Do not** left-click the **Hunger bag** to add hunger dice on standard rolls — that triggers **Blood Surge**. With `autoHunger` on, each **left-click Normal bag** adds a **Hunger** die while `pool.hunger < hungerLevel`, then **Normal** dice. To build **N** normal + **H** hunger: left-click **Normal bag `(hungerLevel + N)` times** when `H == hungerLevel` (typical). Example: `rollTest(..., 2)` and pool `2N+2H` → **4** Normal bag clicks. |
| `rollConfirm`                    | Use **exact** numbers. Avoid `{ min = N }` unless this doc cites a named constant. `**wpRerollChosenCount`** — count of dice randomized in the current WP wave (cap tests, e.g. I2)                                                                                                                                                                                                                                                                     |
| `rollConfirmTracker`             | Assert hunger / stains / superficial willpower after consequences apply                                                                                                                                                                                                                                                                                                                                                                                 |
| `rollE2eSettlePresetCheck`       | Dedicated Rouse/Obliv checks: preset face + settle (no die randomize step)                                                                                                                                                                                                                                                                                                                                                                              |
| `rollStConfirm`                  | Assert `liveSlotIndex` and ST initiate blocking                                                                                                                                                                                                                                                                                                                                                                                                         |
| Panel actions                    | Prefer console `RC.takeHalf`, `RC.openRoll` when listed; otherwise click the named panel control                                                                                                                                                                                                                                                                                                                                                        |
| Visual-only                      | **Only** when this doc explicitly says **Visual check** (dashboard label, known-bug UI)                                                                                                                                                                                                                                                                                                                                                                 |


### Brown fixture constants (re-verify after test-sheet BP change)


| Constant                        | Value | How to set                                                                        |
| ------------------------------- | ----- | --------------------------------------------------------------------------------- |
| `BROWN_SURGE_DICE`              | **2** | Brown Blood Potency yields `bloodSurge = 2` (`DEBUG.dumpEffectiveStats("Brown")`) |
| Brown hunger for bag-pool tests | **0** | `rollTest(..., 0)` as 5th argument unless step says otherwise                     |


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

**Pool composition (standard rolls):** At most one **main** pool (normal + hunger), one **rouse** check (`pool.rouse` — extra Rouse clicks add to the same check), and one **oblivion-rouse** check. Rouse and Oblivion-Rouse are **mutually exclusive** (silent bag fail). Blood Surge adds rouse + bonus normal/hunger; **Hunger bag right-click** undoes surge and clears **all** rouse dice. See Dice System Pt. 2 § Pool composition.

**Per-roll options:** Set with `RC.setRollOptions` **immediately after** `rollTest` and **before** **Roll** / **Spend WP**. Do not use the ST Opts modal during E2E (TOR-162).

```lua
RC.setRollOptions("Brown", { wpReroll = true, numberOfDiceRerolled = 3, canRerollHunger = false })
```

---

## Step 0 — Cleanup

**Harness check:** After **Save & Play**, `lua debugHelp()` must list `rollConfirm(color, expected)` (E2E assertions). If Step 0 prints `[DEBUG.rollConfirm] Brown: confirm failed — is the roll in POST_ROLL?`, the table is still on the **legacy** one-argument `rollConfirm` (force-confirm only) — save bundled Lua again and retry.

```lua
rollCancelAll()
rollConfirm("Brown", { noActive = true })
rollConfirm("Purple", { noActive = true })
rollConfirm("Black", { noActive = true })
```

**Pass if:** All three `rollConfirm` calls print **`[rollConfirm] PASS — … noActive`** (not `confirm failed`).

> ✅

---

## Smoke path (Suites A–E)

Quick regression after roll-pipeline edits. Full coverage is in Suites G–P below.

### Suite A — Standard roll (PRE_ROLL → roll → confirm)

#### Step A1 — Arm roll

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Standard")
rollConfirm("Brown", {
  phase = "preRoll",
  active = { difficulty = 3, rollType = C.RollType.STANDARD },
})
```

**Pass if:** `rollConfirm` prints **PASS**.

> ✅

#### Step A2 — Build pool (bags)

Re-arm with hunger **0** so Normal-bag clicks add Normal dice only:

```lua
rollCancel("Brown")
rollTest("Brown", 3, C.RollType.STANDARD, "E2E A2 pool", 0)
```

**Human — build pool to exactly 5 dice:**

1. **Left-click Normal bag 5 times.**

```lua
rollConfirm("Brown", { active = { pool = { normal = 5, hunger = 0 } } })
```

1. **Right-click Normal bag 1 time** (removes last Normal die).

```lua
rollConfirm("Brown", { active = { pool = { normal = 4, hunger = 0 } } })
```

1. **Left-click Normal bag 1 time** (restore pool to 5).

```lua
rollConfirm("Brown", { active = { pool = { normal = 5, hunger = 0 } } })
```

**Pass if:** All three `rollConfirm` calls print **PASS**.

**Visual check (known bug TOR-155):** Roll panel shows **5** white pool dots (no hunger dice in this step).

#### Step A3 — Roll and confirm

**Human:** Click **Roll** → wait for settle (**POST_ROLL**).

**Before Confirm — check:**

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { present = true, resultClass = { present = true } },
  },
})
```

**Pass if:** **PASS**. Then click **Confirm**. Do **not** call `rollConfirm` after confirm — active clears.

> ❌ Prior run: confirmed then called `rollState` — active already cleared. Use POST_ROLL inspection above.

---

### Suite B — Cancel and reset

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E B cancel", 0)
rollCancel("Brown")
rollConfirm("Brown", { noActive = true })
rollCancelAll()
rollConfirm("Brown", { noActive = true })
```

**Pass if:** Both `noActive` checks print **PASS**.

> ✅

---

### Suite C — Dedicated rouse check

#### C1 — `autoApplyRouseOutcomes` **on** (hunger +1)

```lua
rollCancel("Brown")
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)
setHunger("Brown", 2)
rollConfirmTracker("Brown", { hunger = 2 })
rollTest("Brown", 1, C.RollType.ROUSE, "E2E C1 rouse auto on")
rollE2eSettlePresetCheck("Brown", { rouse = { 4 } })
rollConfirm("Brown", { noActive = true })
rollConfirmTracker("Brown", { hunger = 3 })
```

**Pass if:** All `rollConfirm` / `rollConfirmTracker` calls print **PASS** (face **4** → hunger +1).

> ⚠️ Player roll panel displays "`R1`" text instead of a dark red dot (TOR-155).

```lua
rollCancel("Brown")
```

#### C2 — `autoApplyRouseOutcomes` **off** (hunger unchanged)

```lua
rollCancel("Brown")
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", false)
setHunger("Brown", 2)
rollConfirmTracker("Brown", { hunger = 2 })
rollTest("Brown", 1, C.RollType.ROUSE, "E2E C2 rouse auto off")
rollE2eSettlePresetCheck("Brown", { rouse = { 4 } })
rollConfirm("Brown", { noActive = true })
rollConfirmTracker("Brown", { hunger = 2 })
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)
```

**Pass if:** Hunger stays **2** after the same fail face **4**.

```lua
rollCancel("Brown")
```

---

### Suite D — Oblivion rouse dedicated (Purple)

Single-die dedicated check. Multi-die cases → **Suite P**.

```lua
rollCancel("Purple")
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E D obliv face 3")
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 2, stains = 2 })
```

**Pass if:** Face **3** → hunger **+1**, stains **unchanged** (still **2**).

> ⚠️ Player roll panel displays "`O1`" text instead of a dark purple dot (TOR-155).

```lua
rollCancel("Purple")
```

---

### Suite E — Storyteller NPC roll (standard)

```lua
rollCancel("Black")
rollStTest("E2E ST", C.RollType.STANDARD)
rollStConfirm({ liveSlotIndex = 1 })
```

**Visual check:** ST dashboard roll label reads **E2E ST**.

**Human:** **Left-click Normal bag 1 time** in the ST drawer (drawer opens on first spawn).

```lua
rollStConfirm({
  initiateBlocked = true,
  initiateLabel = "NPC Two",
  initiateRollType = C.RollType.STANDARD,
})
rollCancel("Black")
```

**Pass if:** `rollStConfirm` **PASS** for `liveSlotIndex = 1` and blocked second initiate.

> ✅ `liveSlotIndex` set, dashboard shows roll, drawer opens on die spawn, ST bags spawn into drawer arc.
>
> ⚠️ The roll panel dice pool shows, e.g., "`5N+2H`". **Expected Behavior:** All dice should be displayed as colored dots. Normal = white, Hunger = bright red, Rouse = dark red, Oblivion-Rouse = dark purple, Werewolf = yellow-green, Rage = orange.
>
> ⚠️ **(Likely a Problem with ALL rolls, not just ST Rolls)** Upon Confirming a roll for which the ST did not set a Difficulty, the result broadcast displays only "Roll Completed". **Expected Behavior:** A roll without a Difficulty should be treated as having an innate/default difficulty of 1. Dice images should still be displayed, the result should still be determined, and the number of successes should be included in the broadcast message -- but margin should be left out, as there is no difficulty against which to derive a margin.

```lua
rollCancel("Black")   -- also clears resolved ST slots + drawer dice
```

---

### Suite F — Conditions roll policy (`e2eBestialNull`)

Uses manual condition `**e2eBestialNull**` (`roll.bestialNull = true` in `lib/condition_defs.ttslua`). Both runs use the **same** forced faces at difficulty **2** and the **same** pool build. F1 must classify `**messyCritical`**; F2 must classify `**failure**`.

#### F1 — Baseline (no condition)

```lua
rollE2eClearConditions("Brown", { "e2eBestialNull" })
rollTest("Brown", 2, C.RollType.STANDARD, "E2E F baseline", 1)
RC.setPool("Brown", 3, 1)
GlobalSpawnDefaultPoolDiceForActive({ color = "Brown" })
rollConfirm("Brown", { pool = { normal = 3, hunger = 1, rouse = 0 } })
```

**Human:** Click **Roll** → wait for settle.

```lua
rollSetFaces("Brown", { normal = {10, 10, 3}, hunger = {1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { resultClass = "messyCritical", successes = 3 },
    rollPolicy = { bestialNull = false },
  },
})
```

```lua
rollCancel("Brown")
```

#### F2 — With `e2eBestialNull`

```lua
rollE2eApplyConditions("Brown", { "e2eBestialNull" })
rollTest("Brown", 2, C.RollType.STANDARD, "E2E F bestialNull", 1)
RC.setPool("Brown", 3, 1)
GlobalSpawnDefaultPoolDiceForActive({ color = "Brown" })
rollConfirm("Brown", { pool = { normal = 3, hunger = 1, rouse = 0 } })
```

**Human:** Click **Roll** → wait for settle.

```lua
rollSetFaces("Brown", { normal = {10, 10, 3}, hunger = {1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { resultClass = "failure", successes = 2, margin = -1 },
    rollPolicy = { bestialNull = true },
  },
  contributingIncludes = { "e2eBestialNull" },
})
```

**Pass if:** F2 `rollConfirm` prints **PASS** (includes `e2eBestialNull` in `contributingConditions`).

```lua
rollCancel("Brown")
rollE2eClearConditions("Brown", { "e2eBestialNull" })
```

**Pass if:** F1 classified `**messyCritical`** and F2 classified `**failure**` (different `resultClass`).

> Re-test after Save & Play with harness above.

---

## Suite G — Result calculation accuracy

After **Roll** + settle, run `rollSetFaces` then `rollConfirm` **before Confirm**. Each test lists exact expected `resultClass`, `successes`, and `margin`.

For **G6** / **G7**, set per-roll options via console (ST Opts panel may not stick — see TOR-162):

```lua
RC.setRollOptions("Brown", { crits = false })        -- G6
RC.setRollOptions("Brown", { bestialNull = true })
```

Call `setRollOptions` **after** `rollTest` returns and **before** clicking **Roll**.

### G1 — Win at diff 2

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G1", 0)
```

**Human:** **Left-click Normal bag 2 times** (no hunger dice). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {7, 7} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { result = { resultClass = "win", successes = 2, margin = 0 } },
})
```

```lua
rollCancel("Brown")
```

> ✅

### G2 — Critical at diff 3

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Classify G2", 2)
```

**Human:** **Left-click Normal bag 4 times** (`rollTest` set hunger **2**; Auto-Hunger adds **2** hunger dice, then **2** normal). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10}, hunger = {9, 1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { result = { resultClass = "criticalWin", margin = 2 } },
})
```

```lua
rollCancel("Brown")
```

> ✅

### G3 — Messy critical at diff 3

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Classify G3", 2)
```

**Human:** **Left-click Normal bag 4 times** (hunger **2** via `rollTest`; pool **2N+2H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10}, hunger = {10, 1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { result = { resultClass = "messyCritical" } },
})
```

```lua
rollCancel("Brown")
```

> ✅

### G4 — Bestial failure at diff 7

```lua
rollTest("Brown", 7, C.RollType.STANDARD, "E2E Classify G4", 2)
```

**Human:** **Left-click Normal bag 4 times** (hunger **2** via `rollTest`; pool **2N+2H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10}, hunger = {10, 1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { result = { resultClass = "bestialFailure", margin = -2 } },
})
```

```lua
rollCancel("Brown")
```

> ✅

### G5 — Total bestial failure at diff 2

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G5", 1)
```

**Human:** **Left-click Normal bag 3 times** (`rollTest` hunger **1**; pool **2N+1H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4}, hunger = {1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { result = { resultClass = "totalBestialFailure" } },
})
```

```lua
rollCancel("Brown")
```

> ✅

### G6 — Win with crits off (no 10-pair bonus)

```lua
rollTest("Brown", 4, C.RollType.STANDARD, "E2E Classify G6", 1)
RC.setRollOptions("Brown", { crits = false })
```

**Human:** **Left-click Normal bag 5 times** (`rollTest` hunger **1**; pool **4N+1H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 8, 7, 6}, hunger = {10} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { resultClass = "win" },
    rollOptions = { crits = false },
  },
})
```

```lua
rollCancel("Brown")
```

> ❌ Result = Messy Critical. **Expected Behavior:** Result = Win. ST Opts panel may not persist options (TOR-162); console `setRollOptions` should be used for this test.

### G7 — Failure with bestial null

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G7", 1)
RC.setRollOptions("Brown", { bestialNull = true })
```

**Human:** **Left-click Normal bag 4 times** (`rollTest` hunger **1**; pool **3N+1H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10, 3}, hunger = {1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { resultClass = "failure", successes = 2, margin = -1 },
    rollOptions = { bestialNull = true },
  },
})
```

```lua
rollCancel("Brown")
```

> ❌ Result = Critical Win. **Expected Behavior:** Result = Failure. Use console `setRollOptions` (TOR-162).

**Pass if:** Each `rollConfirm` prints **PASS** for the forced faces above.

---

## Suite H — Take Half

### H1 — Simple Take Half (no rouse in pool)

```lua
rollTest("Brown", 4, C.RollType.STANDARD, "E2E Take Half", 0)
```

**Human:** **Left-click Normal bag 4 times**, then run `RC.takeHalf("Brown")`.

**After Take Half resolves to POST_ROLL — check:**

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    tookHalf = true,
    result = { resultClass = "failure", successes = 2 },
    batonHolder = "storyteller",
  },
})
```

> ✅
>
> ⚠️ The result display panel does not display any dice images. **Expected Behavior:** The roll panel should display four normal dice images, two showing a single ankh (success) and two showing a blank face (failure), representing both the full dice pool and the effective successes after taking half.

### H2 — Take Half + rouse dice still in pool

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Take Half Rouse", 0)
```

**Human:** **Left-click Normal bag 4 times**, **left-click Rouse bag 1 time**, then run `RC.takeHalf("Brown")`.

**After Take Half (rouse still in pool) — check:**

```lua
rollConfirm("Brown", {
  phase = "rolling",
  active = { takeHalfAwaitingRouse = true },
})
```

**Preset rouse face and settle (no randomize):**

```lua
rollSetFaces("Brown", { rouse = { 4 } })
RC.onDiceSettled("Brown")
```

**After rouse settle (POST_ROLL) — check:**

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    tookHalf = true,
    result = { resultClass = "failure", successes = 2, margin = -1 },
  },
  rouseStrip = { label = "Rouse", narrative = "Hunger Roused" },
})
```

> ❌ When Take Half is clicked and the non-rouse dice are removed, the Rouse dice fall to the table where they *should* await the player to randomize them. However, the falling rouse dice are apparently treated like a roll and, when they settle, they are parsed as if they had already been rolled.
>
> ⚠️ The result broadcast displays `Rouse [6, 9]: Success` below the two rouse dice images. As with the H1 test, the normal dice representing the take half roll itself are not displayed (making the "Failure" main result confusing, as it appears directly beneath the `Rouse [6, 9]: Success` line. **Expected Behavior**: Remove the `Rouse [6, 9]: Success` line as redundant/obsolete. The panel should appear much like the following example:
>
> ```
> Fomorach - Standard Roll: E2E Take Half Rouse
> <line of images for the Rouse dice>
> Successful Rouse Check //OR// Hunger Roused (in all caps, but much smaller than the main "failure" line)
> <line of images for the Normal dice, representing the Take Half result>
> FAILURE
> 2 successes                           Margin: -1
> ```

```lua
rollCancel("Brown")
```

---

## Suite I — Spend Willpower

```lua
setWillpowerSuperficial("Brown", 3)
rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
```

**Pass if:** Brown superficial willpower is **3** before I1.

Shared failure pool for I1–I3: **3 normal** dice, faces `{4,4,4}` vs difficulty **3**.

---

### I1 — Default WP reroll (3 dice, hunger locked)

```lua
rollCancel("Brown")
rollTest("Brown", 3, C.RollType.STANDARD, "E2E I1 WP default", 0)
RC.setRollOptions("Brown", {
  wpReroll = true,
  numberOfRerolls = 1,
  numberOfDiceRerolled = 3,
  canRerollHunger = false,
})
```

**Human:** **Left-click Normal bag 3 times** (no hunger, no rouse). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4, 4} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { resultClass = "failure" },
    willpower = { available = true },
    rollOptions = { numberOfDiceRerolled = 3, canRerollHunger = false },
  },
})
```

**Human:** Click **Spend WP**. **Left-click** each of the **3** normal dice on the table once (reroll wave).

**Immediately after Spend WP — check:**

```lua
rollConfirm("Brown", {
  phase = "rolling",
  active = {
    willpower = { wpRerollWave = true, rerollsRemaining = 0 },
  },
})
```

**Human:** Wait for reroll settle.

**After reroll settle — check:**

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = { willpower = { wpRerollWave = false } },
})
```

```lua
rollCancel("Brown")
```

---

### I2 — WP reroll cap: 1 die only

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E I2 WP cap 1")
RC.setRollOptions("Brown", {
  wpReroll = true,
  numberOfRerolls = 1,
  numberOfDiceRerolled = 1,
  canRerollHunger = false,
})
```

**Human:** **Left-click Normal bag 3 times**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4, 4} })
rollConfirm("Brown", { phase = "postRoll", active = { result = { resultClass = "failure" } } })
```

**Human:** Click **Spend WP**. **Left-click** any **one** normal die on the table (first reroll). **Then attempt** to **left-click a second** normal die — it must **not** randomize (cap **1** locks the rest after the first choice).

**After the second-die attempt — check:**

```lua
rollConfirm("Brown", {
  phase = "rolling",
  active = {
    willpower = { wpRerollWave = true },
    rollOptions = { numberOfDiceRerolled = 1 },
  },
  wpRerollChosenCount = 1,
})
```

**Human:** Wait for the **one** rerolled die to settle.

```lua
rollCancel("Brown")
```

---

### I3 — Can reroll hunger

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E I3 WP hunger", 1)
RC.setRollOptions("Brown", {
  wpReroll = true,
  numberOfRerolls = 1,
  numberOfDiceRerolled = 3,
  canRerollHunger = true,
})
```

**Human:** **Left-click Normal bag 3 times** (`rollTest` hunger **1**; pool **2N+1H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4}, hunger = {4} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = { rollOptions = { canRerollHunger = true } },
})
```

**Human:** Click **Spend WP**, then **left-click the hunger die 1 time** (do not reroll normal dice).

**Immediately after Spend WP — check:**

```lua
rollConfirm("Brown", {
  phase = "rolling",
  active = { rollOptions = { canRerollHunger = true } },
})
```

**Human:** Wait for reroll settle.

```lua
rollCancel("Brown")
```

---

### I4 — Rouse die not WP-rerollable

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E I4 WP rouse lock")
RC.setRollOptions("Brown", {
  wpReroll = true,
  numberOfRerolls = 1,
  numberOfDiceRerolled = 3,
  canRerollHunger = false,
})
```

**Human:** **Left-click Normal bag 2 times**, then **left-click Rouse bag 1 time**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4}, rouse = {6} })
rollConfirm("Brown", { phase = "postRoll" })
```

**Human:** Click **Spend WP**, then attempt to **left-click the rouse die** (must stay locked).

```lua
rollConfirm("Brown", {
  phase = "rolling",
  active = { rollOptions = { numberOfDiceRerolled = 3 } },
})
```

**Human:** **Left-click both normal dice 1 time each**, wait for reroll settle.

```lua
rollCancel("Brown")
```

---

## Suite J — Compound roll (rouse in standard pool)

### J1 — One rouse in standard pool

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E J1 Compound", 0)
```

**Human:** **Left-click Normal bag 2 times**, then **left-click Rouse bag 1 time**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {7, 3}, rouse = {4} })
rollConfirm("Brown", {
  phase = "postRoll",
  rouseOutcomeStripsMin = 1,
  active = { result = { resultClass = "win", successes = 2 } },
})
```

**Human:** Click **Confirm** once.

```lua
rollCancel("Brown")
```

---

### J2 — Blood surge + compound (same roll)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E J2 Surge compound", 0)
```

**Human:** **Left-click Hunger bag 1 time** (Blood Surge — no hunger die yet).

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { rouse = 1, normal = 2, hunger = 0 },
})
```

**Human:** Click **Roll** → wait for settle.

```lua
rollSetFaces("Brown", { normal = { 7, 3 }, rouse = { 4 } })
rollConfirm("Brown", {
  phase = "postRoll",
  rouseOutcomeStripsMin = 1,
  active = { result = { resultClass = "win", successes = 2 } },
  rouseStripLabel = "Rouse",
})
```

**Human:** Click **Confirm** once.

```lua
rollCancel("Brown")
```

---

## Suite K — Dice bag clicks (left vs right)

Start each block with a clean slate:

```lua
rollCancelAll()
```

Host is on the roll seat after `rollTest` (automatic seat prep).

---

### K1 — No active roll: bag starts a roll

#### K1a — Hunger bag → STANDARD

```lua
rollCancelAll()
```

**Human:** **Left-click Hunger bag 1 time** (no roll active).

**Check:**

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { rollType = C.RollType.STANDARD },
})
```

```lua
rollCancel("Brown")
```

#### K1b — Rouse bag → ROUSE + 1 die

```lua
rollCancelAll()
```

**Human:** **Left-click Rouse bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { rollType = C.RollType.ROUSE, pool = { rouse = 1 } },
})
```

```lua
rollCancel("Brown")
```

#### K1c — Normal bag → STANDARD

```lua
rollCancelAll()
```

**Human:** **Left-click Normal bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { rollType = C.RollType.STANDARD },
})
```

```lua
rollCancel("Brown")
```

---

### K2 — PRE_ROLL on STANDARD roll

#### K2a — Normal bag left adds die

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2a", 0)
```

**Human:** **Left-click Normal bag 2 times**.

**Check:**

```lua
rollConfirm("Brown", { active = { pool = { normal = 2 } } })
```

#### K2b — Normal bag right removes last normal/hunger

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2b", 0)
```

**Human:** **Left-click Normal bag 2 times**, then **right-click Normal bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", { active = { pool = { normal = 1 } } })
```

```lua
rollCancel("Brown")
```

#### K2c — Hunger bag left (surge off) → Blood Surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2c surge", 0)
```

**Human:** **Left-click Hunger bag 1 time** (surge not active).

**Check:**

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { hunger = 0, rouse = 1, normal = 2 },
})
```

```lua
rollCancel("Brown")
```

#### K2d — Hunger bag left (surge on) adds hunger

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2d hunger", 0)
```

**Human:** **Left-click Hunger bag 1 time** (surge on), then **left-click Hunger bag 1 time** (hunger die).

**Check:**

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { hunger = 1, rouse = 1, normal = 2 },
})
```

```lua
rollCancel("Brown")
```

#### K2e — Rouse bag left adds rouse

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2e rouse", 0)
```

**Human:** **Left-click Rouse bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", { active = { pool = { rouse = 1 } } })
```

```lua
rollCancel("Brown")
```

#### K2f — Hunger bag right with surge active deactivates surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f surge off", 0)
```

**Human:** **Left-click Hunger bag 1 time** (surge on), then **right-click Hunger bag 1 time** (undo surge).

**Check:**

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = false },
  pool = { rouse = 0, normal = 0, hunger = 0 },
})
```

```lua
rollCancel("Brown")
```

#### K2g-Brown — Rouse blocks Oblivion-Rouse (silent fail)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2g Brown", 0)
```

**Human:** **Left-click Rouse bag 1 time**, then **left-click Oblivion-Rouse bag 1 time** (must fail silently on Brown).

```lua
rollConfirm("Brown", { pool = { rouse = 1, oblivRouse = 0 } })
rollCancel("Brown")
```

#### K2g-Purple — Oblivion-Rouse blocks Rouse (silent fail)

```lua
rollTest("Purple", 2, C.RollType.STANDARD, "E2E K2g Purple", 0)
```

**Human:** **Left-click Oblivion-Rouse bag 1 time**, then **left-click Rouse bag 1 time** (must fail silently on Purple).

```lua
rollConfirm("Purple", { pool = { rouse = 0, oblivRouse = 1 } })
rollCancel("Purple")
```

---

### K3 — PRE_ROLL on dedicated ROUSE

#### K3a — Normal bag resets rouse check to 1 die

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3a")
```

**Human:** **Left-click Rouse bag 2 times**, then **left-click Normal bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", { active = { pool = { rouse = 1 } } })
```

```lua
rollCancel("Brown")
```

#### K3b — Rouse bag right removes last rouse

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3b")
```

**Human:** **Left-click Rouse bag 2 times**, then **right-click Rouse bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", { active = { pool = { rouse = 1 } } })
rollCancel("Brown")
```

---

### K4 — Empty pool right-click cancels roll

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K4", 0)
```

**Human:** **Left-click Normal bag 2 times**, then **right-click Normal bag 2 times** (pool empty → roll cancels).

**Check:**

```lua
rollConfirm("Brown", { noActive = true })
```

---

## Suite L — Baton passing and permanent automation

### L1a — Setup: baton with storyteller

```lua
rollCancel("Brown")
RC.initiateRoll("Brown", { rollType = C.RollType.STANDARD, label = "E2E Baton" })
rollConfirm("Brown", {
  phase = "setup",
  active = { batonHolder = "storyteller" },
})
```

---

### L1b — Open roll: baton to player

**Human (ST):** Set difficulty **2** on ST dashboard for Brown, then click **Open roll**.

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { batonHolder = "player", difficulty = 2 },
})
```

---

### L1c — Roll: phases through rolling → postRoll

**Human:** **Left-click Normal bag 2 times**, click **Roll** → wait for settle.

**After settle — check:**

```lua
rollConfirm("Brown", { phase = "postRoll" })
rollCancel("Brown")
```

---

### L2a — `autoHunger` off: normal bag spawns normal

```lua
S.setStateVal("stRollSettings", "autoHunger", false)
rollTest("Brown", 2, C.RollType.STANDARD, "E2E L2a autoHunger off")
```

**Human:** **Left-click Normal bag 1 time** (Brown below hunger cap).

**Check:**

```lua
rollConfirm("Brown", { pool = { normal = 1, hunger = 0 } })
rollCancel("Brown")
S.setStateVal("stRollSettings", "autoHunger", true)
```

---

### L2b — `autoWp` off: WP spend does not auto-damage

```lua
S.setStateVal("stRollSettings", "autoWp", false)
setWillpowerSuperficial("Brown", 3)
rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
rollCancel("Brown")
rollTest("Brown", 3, C.RollType.STANDARD, "E2E L2b WP no auto", 0)
RC.setRollOptions("Brown", {
  wpReroll = true,
  numberOfRerolls = 1,
  numberOfDiceRerolled = 3,
  canRerollHunger = false,
})
```

**Human:** **Left-click Normal bag 3 times**, **Roll** → settle, click **Spend WP**, **left-click Normal die 1 time**, **left-click Normal die 1 time**, **left-click Normal die 1 time**, wait for reroll settle.

```lua
rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
rollCancel("Brown")
S.setStateVal("stRollSettings", "autoWp", true)
```

---

### L2c — `autoApplyRouseOutcomes` off: confirm does not apply rouse hunger

```lua
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", false)
setHunger("Brown", 2)
rollConfirmTracker("Brown", { hunger = 2 })
rollTest("Brown", 1, C.RollType.ROUSE, "E2E L2c rouse no auto")
rollE2eSettlePresetCheck("Brown", { rouse = { 3 } })
rollConfirm("Brown", { noActive = true })
rollConfirmTracker("Brown", { hunger = 2 })
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)
rollCancel("Brown")
```

---

## Suite M — Bestial Null via roll option (7 / 3 pool)

Distinct from **G7** (faces `10,10,3` + hunger `1`). Uses smaller faces so margin is unambiguous.

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E M1 bestialNull opt", 1)
RC.setRollOptions("Brown", { bestialNull = true })
```

**Human:** **Left-click Normal bag 3 times** (`rollTest` hunger **1**; pool **2N+1H**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {7, 3}, hunger = {1} })
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { resultClass = "failure" },
    rollOptions = { bestialNull = true },
  },
})
rollCancel("Brown")
```

---

## Suite N — Blood Surge (hunger bag)

### N1 — First hunger click activates surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N1 surge", 0)
```

**Human:** **Left-click Hunger bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { rouse = 1, normal = 2, hunger = 0 },
})
```

```lua
rollCancel("Brown")
```

---

### N2 — Second hunger click adds hunger die

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N2 hunger die", 0)
```

**Human:** **Left-click Hunger bag 1 time** (surge on), then **left-click Hunger bag 1 time** (hunger die).

**Check:**

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { hunger = 1, rouse = 1, normal = 2 },
})
```

```lua
rollCancel("Brown")
```

---

### N3 — Hunger bag right deactivates surge (clears all rouse)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N3 surge cancel", 0)
```

**Human:** **Left-click Hunger bag 1 time** (surge on), then **right-click Hunger bag 1 time**.

**Check:**

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = false },
  pool = { rouse = 0, normal = 0, hunger = 0 },
})
```

```lua
rollCancel("Brown")
```

---

## Suite O — Storyteller slots, Werewolf, brutal outcome

### O1a — One live ST slot

```lua
rollCancel("Black")
rollStTest("NPC One", C.RollType.STANDARD)
rollStConfirm({ liveSlotIndex = 1 })
rollStTest("NPC Two", C.RollType.STANDARD)
rollStConfirm({
  initiateBlocked = true,
  initiateLabel = "NPC Two",
  initiateRollType = C.RollType.STANDARD,
})
rollCancel("Black")
```

---

### O1b — Slot persists until CLEAR

```lua
rollCancel("Black")
rollStTest("NPC One", C.RollType.STANDARD)
rollStConfirm({ liveSlotIndex = 1 })
```

**Human:** **Left-click Normal bag 2 times** in ST drawer, set difficulty **2**, **Roll** → settle, click **Confirm** on ST dashboard.

```lua
rollStConfirm({ liveSlotIndex = 1 })
```

**Human:** Click **CLEAR** on slot **1** in ST dashboard.

```lua
rollStConfirm({ liveSlotIndexAbsent = true })
rollCancel("Black")
```

---

### O2 — Werewolf roll (no V5 bestial/messy classes)

```lua
rollStTest("Garou", C.RollType.WEREWOLF)
```

**Human:** **Left-click Werewolf bag 2 times**, **left-click Rage bag 2 times**. Set difficulty **3** on ST dashboard, click **Roll** → wait for settle.

```lua
rollSetFaces("Black", { werewolf = { 8, 6 }, rage = { 5, 7 } })
RC.startRolling("Black")
RC.onDiceSettled("Black")
rollConfirm("Black", {
  phase = "postRoll",
  active = { result = { resultClass = "win", successes = 3, margin = 1 } },
})
rollCancel("Black")
```

---

### O3 — Brutal outcome (rage 1 or 2)

```lua
rollStTest("Garou Brutal", C.RollType.WEREWOLF)
```

**Human:** **Left-click Rage bag 2 times** (no werewolf dice). Set difficulty **2** on ST dashboard, click **Roll** → wait for settle.

```lua
rollSetFaces("Black", { rage = { 1, 2 } })
RC.startRolling("Black")
RC.onDiceSettled("Black")
rollConfirm("Black", {
  phase = "postRoll",
  active = { pendingResolution = "brutalFailViolence" },
})
rollCancel("Black")
```

---

## Suite P — Oblivion-Rouse multi-die (Purple)

Each case is a **dedicated** `ROUSE_OBLIVION` roll with **2** oblivion dice in pool unless noted.

---

### P-A — All 6s: success, no hunger/stain

```lua
rollCancel("Purple")
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-A")
-- Pool: 2 oblivion dice (left-click bag twice before settle helper)
```

**Human:** **Left-click Oblivion-Rouse bag 2 times**.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 6, 6 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollCancel("Purple")
```

---

### P-B — All 3s: hunger +1

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-B")
```

**Human:** **Left-click Oblivion-Rouse bag 2 times**.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3, 3 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 2, stains = 2 })
rollCancel("Purple")
```

---

### P-C — 3 and 10: pending Hunger vs Stain

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-C")
```

**Human:** **Left-click Oblivion-Rouse bag 2 times**.

```lua
rollSetFaces("Purple", { oblivRouse = { 3, 10 } })
RC.startRolling("Purple")
RC.onDiceSettled("Purple")
rollConfirm("Purple", {
  phase = "postRoll",
  active = { pendingResolution = "oblivHungerStain" },
})
rollCancel("Purple")
```

---

### P-D — 1 and 10 (mixed): stained

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-D")
```

**Human:** **Left-click Oblivion-Rouse bag 2 times**.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 1, 10 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 1, stains = 3 })
rollCancel("Purple")
```

---

### P-E — 3 and 7: success (6–9 present)

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-E")
```

**Human:** **Left-click Oblivion-Rouse bag 2 times**.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3, 7 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollCancel("Purple")
```

---

### P-F — Oblivion in STANDARD compound (Purple)

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 2, C.RollType.STANDARD, "E2E P-F compound", 0)
```

**Human:** **Left-click Normal bag 2 times**, **left-click Oblivion-Rouse bag 2 times**. Click **Roll** → wait for settle.

```lua
rollSetFaces("Purple", { normal = { 7, 7 }, oblivRouse = { 3, 10 } })
RC.startRolling("Purple")
RC.onDiceSettled("Purple")
rollConfirm("Purple", {
  phase = "postRoll",
  rouseOutcomeStripsMin = 1,
  active = { pendingResolution = "oblivHungerStain" },
})
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollCancel("Purple")
```

---

## Sign-off


| Suite                           | Pass | Notes                    |
| ------------------------------- | ---- | ------------------------ |
| 0 Cleanup                       | ☐    |                          |
| A Standard smoke                | ☐    | A1–A3                    |
| B Cancel                        | ☐    |                          |
| C Rouse dedicated               | ☐    | C1–C2                    |
| D Oblivion dedicated (Purple)   | ☐    |                          |
| E ST standard                   | ☐    |                          |
| F Conditions (`e2eBestialNull`) | ☐    | F1–F2                    |
| G Classification                | ☐    | G1–G7                    |
| H Take Half                     | ☐    | H1–H2                    |
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
