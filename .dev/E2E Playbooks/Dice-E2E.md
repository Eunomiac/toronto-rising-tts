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

| Goal | Solo approach |
| --- | --- |
| Arm roll / read state | Console: `rollTest`, `rollState`, `print(GlobalGetRollPhase(...))` |
| Click dice bags + panel | Host is already on the roll seat after `rollTest` |
| Skip physics, finish FSM | `rollConfirm(color)` in **POST_ROLL** only (after settle/recalc) |
| Storyteller NPC roll | `rollStTest()` (prep on **Black**) + ST dashboard |
| Oblivion rouse (D, P) | `rollTest("Purple", …)` |

### E2E harness helpers (console)

| Helper | Purpose |
| --- | --- |
| `rollTest(color, diff?, type?, label?, hungerLevel?)` | Seat prep + arm **PRE_ROLL**; 5th arg sets hunger 0–5 when needed |
| `rollStTest(label?, type?)` | Seat prep on **Black** + ST NPC roll |
| `rollSetFaces(color, { normal, hunger, rouse, oblivRouse })` | After settle: set faces + `RC.recalculate` |
| `rollE2eApplyConditions` / `rollE2eClearConditions` | Suite F (`e2eBestialNull`) |
| `rollCancel(color)` | Cancel roll; non-Black returns Host to **Black**; **Black** clears ST slots |

## Prerequisites

- Table **Host** (you).
- **Save & Play** so bundled Lua matches repo.
- Character data for test colors: **Brown** (suites A–C, F, G–N), **Purple** (D, P), **Black** (E, O).
- No active roll on any seat (Step 0).
- Optional: note starting **hunger** / **willpower** for Brown before Suites I, N (for consequence checks).

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

**Per-roll options:** Set with `RC.setRollOptions` **immediately after** `rollTest` and **before** **Roll** / **Spend WP**. Do not use the ST Opts modal during E2E (TOR-162).

```lua
RC.setRollOptions("Brown", { wpReroll = true, numberOfDiceRerolled = 3, canRerollHunger = false })
```

---

## Step 0 — Cleanup

```lua
rollCancelAll()
```

**Pass if:** No stuck roll UI; `rollState` shows no active roll for Brown/Purple/Black.

> ✅

---

## Smoke path (Suites A–E)

Quick regression after roll-pipeline edits. Full coverage is in Suites G–P below.

### Suite A — Standard roll (PRE_ROLL → roll → confirm)

#### Step A1 — Arm roll

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Standard")
print(GlobalGetRollPhase({ color = "Brown" }))
```

**Immediately after arming — check:**

| Command | Expect |
| --- | --- |
| `print(GlobalGetRollPhase({ color = "Brown" }))` | Phase string **`preRoll`** |
| `rollState("Brown")` | `active.difficulty == 3`, `active.rollType` = standard |

> ✅

#### Step A2 — Build pool (bags)

**Human:** Left-click **normal** / **hunger** bags until pool ≈ 5 dice. Right-click removes last die of that kind (Suite K).

**After pool is built — check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.normal` / `.hunger` | Counts match staged dice |
| Roll panel pool dots | Count matches pool (hunger dots should be red — see known bugs below) |

> ❌ `active.pool` is accurate, and the *number* of dice displayed with dots in the roll panel is accurate. However, the displayed dice-dots are all the same color (white). **Expected Behavior:** Hunger dice in the pool should be displayed as *red* dots in the player roll panel.
>
> ❌ Right-clicking on the Normal dice bag does not remove Hunger dice from the roll. **Expected Behavior:** Right-clicking on the Normal dice bag should remove the last Normal *or* Hunger die that was added to the pool, regardless of type.  Right-clicking on the Hunger dice bag, conversely, should undo a Blood Surge if one has been taken for this roll. If no Blood Surge has been applied, it should instead remove a Hunger die from the pool, if possible.

#### Step A3 — Roll and confirm

**Human:** Click **Roll** → wait for settle (**POST_ROLL**).

**Before Confirm — check:**

```lua
print(GlobalGetRollPhase({ color = "Brown" }))
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| Phase | **`postRoll`** |
| `active.result` | Non-nil |
| `active.result.resultClass` | Present |
| `active.result.successes` | Number |

Then **Confirm**. Do **not** call `rollState` after confirm (active clears).

> ❌ Prior run: confirmed then called `rollState` — active already cleared. Use POST_ROLL inspection above.

---

### Suite B — Cancel and reset

```lua
rollTest("Brown", 2)
rollCancel("Brown")
rollCancelAll()
```

**Pass if:** No active roll after each step.

> ✅

---

### Suite C — Dedicated rouse check

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E Rouse")
```

**Human:** Roll the spawned **rouse** die (auto-spawned). Rouse-family rolls **auto-broadcast** on settle when no WP pending.

**After settle — force fail face, then check:**

```lua
rollSetFaces("Brown", { rouse = { 4 } })
rollState("Brown")
```

| Field / tracker | Expect |
| --- | --- |
| `active.result` | Populated for rouse check |
| Hunger tracker | +1 on face ≤5 when `autoApplyRouseOutcomes` on |

> ✅ Roll completed, and increased Hunger by 1 on failure.
>
> ⚠️ Player roll panel displays "`R1`" in the dice pool display. **Expected Behavior:** Rouse dice, like Hunger and Normal dice, should be displayed as a colored dot. Rouse dice should be displayed a dark red dot.
>
> ⚠️ Roll broadcast display shows the text "`Rouse [1]: Hunger Roused`". **Expected Behavior:** This line of redundant text should be removed.

```lua
rollState("Brown")
rollCancel("Brown")
```

---

### Suite D — Oblivion rouse dedicated (Purple)

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E Oblivion Rouse")
```

**Human:** Roll the Oblivion rouse die. Multi-die corners → **Suite P**.

**After settle — check (pick one face case):**

```lua
rollSetFaces("Purple", { oblivRouse = { 3 } })   -- hunger +1 on ≤5
rollState("Purple")
-- or: rollSetFaces("Purple", { oblivRouse = { 6 } }) then rollState
```

| Expect | Notes |
| --- | --- |
| Roll completes on settle | Single-die dedicated check — no pending choice |
| Hunger / stains | Per face rules when auto-apply on |

> ✅ Roll completed. Hunger increased on results <= 5, and Stains were conferred on rolls of 1 or 10.
>
> ⚠️ Player roll panel displays "`O1`" in the dice pool display. **Expected Behavior:** Oblivion-Rouse dice, like Rouse, Hunger and Normal dice, should be displayed as a colored dot. Oblivion-Rouse dice should be displayed a dark purple dot.
>
> ⚠️ Roll broadcast display shows summary text, e.g. "`Oblivion Rouse [1]: Hunger Roused & Stained`" or "`Oblivion Rouse [10]: Stained`". **Expected Behavior:** This line of redundant text should be removed.

```lua
rollState("Purple")
rollCancel("Purple")
```

---

### Suite E — Storyteller NPC roll (standard)

```lua
rollStTest("E2E ST", C.RollType.STANDARD)
```

**Immediately after `rollStTest` — check:**

```lua
rollStSlots()
```

| Field | Expect |
| --- | --- |
| `liveSlotIndex` | `1`, `2`, or `3` (slot in use) |
| ST dashboard | Roll visible for label **E2E ST** |

**Human:** Spawn dice from ST drawer bags → drawer opens on first spawn.

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

Uses manual condition **`e2eBestialNull`** (`roll.bestialNull = true` in `lib/condition_defs.ttslua`). Same forced faces at difficulty **2**; **without** the condition you should **not** get `failure`; **with** it you **must** get `failure`. If both runs classify the same, the condition policy is not applied.

#### F1 — Baseline (no condition)

```lua
rollE2eClearConditions("Brown", { "e2eBestialNull" })
rollTest("Brown", 2, C.RollType.STANDARD, "E2E F baseline")
```

**Human:** Build pool **3 normal + 1 hunger** (bags). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10, 3}, hunger = {1} })
rollState("Brown")
```

**Check now (POST_ROLL, before Confirm):**

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`messyCritical`** or **`critical`** (3 successes at diff 2) — **not** `failure` |
| `active.result.successes` | `3` |
| `active.rollPolicy.bestialNull` | `false` or absent |

```lua
rollCancel("Brown")
```

#### F2 — With `e2eBestialNull`

```lua
rollE2eApplyConditions("Brown", { "e2eBestialNull" })
rollTest("Brown", 2, C.RollType.STANDARD, "E2E F bestialNull")
```

**Human:** Same pool (**3 normal + 1 hunger**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10, 3}, hunger = {1} })
rollState("Brown")
DEBUG.dumpRollPolicy("Brown")
```

**Check now (POST_ROLL, before Confirm):**

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`failure`** (hunger 1 nullifies one 10 → 2 successes vs diff 2) |
| `active.result.successes` | `2` |
| `active.result.margin` | `-1` (or equivalent failure margin) |
| `active.rollPolicy.bestialNull` | **`true`** |
| `DEBUG.dumpRollPolicy` | `contributingConditions` includes **`e2eBestialNull`** |

```lua
rollCancel("Brown")
rollE2eClearConditions("Brown", { "e2eBestialNull" })
```

**Pass if:** F1 and F2 produce **different** `resultClass` as above. **Fail if:** Both runs yield the same classification.

> Re-test after Save & Play with harness above.

---

## Suite G — Result calculation accuracy

After **Roll** + settle, run `rollSetFaces` then `rollState` **before Confirm**. Verify `active.result.resultClass`, `active.result.successes`, and `active.result.margin`.

For **G6** / **G7**, set per-roll options via console (ST Opts panel may not stick — see TOR-162):

```lua
RC.setRollOptions("Brown", { crits = false })        -- G6
RC.setRollOptions("Brown", { bestialNull = true }) -- G7 (or use Suite F condition instead)
```

Call `setRollOptions` **after** `rollTest` returns and **before** clicking **Roll**.

### G1 — Win at diff 2

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G1")
```

**Human:** Pool **2 normal** (no hunger). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {7, 7} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`win`** |
| `active.result.successes` | `2` |
| `active.result.margin` | `0` |

```lua
rollCancel("Brown")
```

> ✅

### G2 — Critical at diff 3

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Classify G2", 2)
```

**Human:** Pool **2 normal + 2 hunger**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10}, hunger = {9, 1} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`critical`** |
| `active.result.margin` | `+2` (typical) |

```lua
rollCancel("Brown")
```

> ✅

### G3 — Messy critical at diff 3

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Classify G3", 2)
```

**Human:** Pool **2 normal + 2 hunger**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10}, hunger = {10, 1} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`messyCritical`** |

```lua
rollCancel("Brown")
```

> ✅

### G4 — Bestial failure at diff 7

```lua
rollTest("Brown", 7, C.RollType.STANDARD, "E2E Classify G4", 2)
```

**Human:** Pool **2 normal + 2 hunger**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10}, hunger = {10, 1} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`bestialFailure`** |
| `active.result.margin` | `-2` (typical) |

```lua
rollCancel("Brown")
```

> ✅

### G5 — Total bestial failure at diff 2

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G5", 1)
```

**Human:** Pool **2 normal + 1 hunger** (hunger face **1**). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4}, hunger = {1} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`totalBestialFailure`** |

```lua
rollCancel("Brown")
```

> ✅

### G6 — Win with crits off (no 10-pair bonus)

```lua
rollTest("Brown", 4, C.RollType.STANDARD, "E2E Classify G6", 2)
RC.setRollOptions("Brown", { crits = false })
```

**Human:** Pool **4 normal + 1 hunger**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 8, 7, 6}, hunger = {10} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`win`** (not messy/critical from 10 pair) |
| `active.rollOptions.crits` | **`false`** |

```lua
rollCancel("Brown")
```

> ❌ Result = Messy Critical. **Expected Behavior:** Result = Win. ST Opts panel may not persist options (TOR-162); console `setRollOptions` should be used for this test.

### G7 — Failure with bestial null

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G7", 1)
RC.setRollOptions("Brown", { bestialNull = true })
```

**Human:** Pool **3 normal + 1 hunger**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {10, 10, 3}, hunger = {1} })
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`failure`** |
| `active.result.successes` | `2` |
| `active.result.margin` | `-1` |
| `active.rollOptions.bestialNull` | **`true`** |

```lua
rollCancel("Brown")
```

> ❌ Result = Critical Win. **Expected Behavior:** Result = Failure. Use console `setRollOptions` (TOR-162).

**Stop if:** Any G row shows wrong `resultClass` with the forced faces above — bug in `classifyRoll` or face read.

---

## Suite H — Take Half

### H1 — Simple Take Half (no rouse in pool)

```lua
rollTest("Brown", 4, C.RollType.STANDARD, "E2E Take Half")
```

**Human:** Add **4** normal+hunger dice only (no rouse/obliv). Click **Take Half**.

**After Take Half resolves to POST_ROLL — check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.tookHalf` | **`true`** |
| `active.result.resultClass` | **`failure`** |
| `active.result.successes` | **`2`** |
| `active.batonHolder` | **`storyteller`** (confirm step) |

> ✅
>
> ⚠️ The result display panel does not display any dice images. **Expected Behavior:** The roll panel should display four normal dice images, two showing a single ankh (success) and two showing a blank face (failure), representing both the full dice pool and the effective successes after taking half.

### H2 — Take Half + rouse dice still in pool

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Take Half Rouse")
```

**Human:** Add 4 normal/hunger **and** 1+ **rouse** (left-click rouse bag). **Take Half**.

**After Take Half (rouse still in pool) — check:**

```lua
print(GlobalGetRollPhase({ color = "Brown" }))
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| Phase | **`rolling`** while rouse throws |
| `active.takeHalfAwaitingRouse` | **`true`** until rouse settles |

**After rouse settle (POST_ROLL) — check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.rouseOutcomeStrips` | Non-empty |
| `active.result.resultClass` | **`failure`** (Take Half half-pool) |

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
rollState("Brown")
rollCancel("Brown")
```

---

## Suite I — Spend Willpower

**Prerequisite:** Brown has **willpower ≥ 1** superficial (note tracker before I1).

Shared failure pool for I1–I3: **3 normal** dice, faces all fail vs diff **3**.

---

### I1 — Default WP reroll (3 dice, hunger locked)

```lua
rollCancel("Brown")
rollTest("Brown", 3, C.RollType.STANDARD, "E2E I1 WP default")
RC.setRollOptions("Brown", {
  wpReroll = true,
  numberOfRerolls = 1,
  numberOfDiceRerolled = 3,
  canRerollHunger = false,
})
```

**Human:** Pool **3 normal** (no hunger, no rouse). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4, 4} })
rollState("Brown")
```

**Before Spend WP — check:**

| Field | Expect |
| --- | --- |
| Phase | **`postRoll`** |
| `active.result.resultClass` | **`failure`** |
| `active.willpower.available` | **`true`** |
| `active.rollOptions.numberOfDiceRerolled` | **`3`** |
| `active.rollOptions.canRerollHunger` | **`false`** |

**Human:** Click **Spend WP** (not Take Half). Reroll up to **3** normal dice (hunger would be locked if present).

**Immediately after Spend WP — check:**

```lua
print(GlobalGetRollPhase({ color = "Brown" }))
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| Phase | **`rolling`** |
| `active.willpower.wpRerollWave` | **`true`** |
| `active.willpower.rerollsRemaining` | **`0`** (one spend of default 1 reroll) |

**After reroll settle — check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| Phase | **`postRoll`** |
| `active.willpower.wpRerollWave` | **`false`** |

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

**Human:** Pool **3 normal**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4, 4} })
rollState("Brown")
```

**Human:** **Spend WP**. Reroll **exactly one** die (pick one normal; leave others untouched).

**After first die randomized and locked — check:**

```lua
rollState("Brown")
```

| Field / observation | Expect |
| --- | --- |
| `active.rollOptions.numberOfDiceRerolled` | **`1`** |
| Other normal dice | **Locked** (cannot randomize a second normal) |

**Human:** Finish reroll wave (randomize the one allowed die, wait for settle).

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

**Human:** Pool **2 normal + 1 hunger**. **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4}, hunger = {4} })
rollState("Brown")
```

**Human:** **Spend WP**.

**Immediately after Spend WP — check:**

| Observation | Expect |
| --- | --- |
| Hunger die on table | **Unlocked** (can be picked up / randomized) |
| `active.rollOptions.canRerollHunger` | **`true`** |

**Human:** Randomize the **hunger** die (and any normals you choose, up to cap 3). Wait for settle.

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

**Human:** Pool **2 normal + 1 rouse** (left-click rouse bag once). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {4, 4}, rouse = {6} })
rollState("Brown")
```

**Human:** **Spend WP**.

**Immediately after Spend WP — check:**

| Observation | Expect |
| --- | --- |
| Rouse die on table | **Stays locked** (cannot randomize for WP reroll) |
| Normal dice | Unlocked for reroll (up to 3) |

```lua
rollCancel("Brown")
```

---

## Suite J — Compound roll (rouse in standard pool)

### J1 — One rouse in standard pool

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E J1 Compound")
```

**Human:** Pool **2 normal** + **1 rouse** (rouse bag left-click). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {7, 3}, rouse = {4} })
rollState("Brown")
```

**Before Confirm — check:**

| Field | Expect |
| --- | --- |
| `active.result` | Main V5 result present |
| `active.rouseOutcomeStrips` | **Non-empty** (rouse strip for face 4) |
| `active.result.resultClass` | **`win`** at diff 2 (2 successes from normals) |

**Human:** **Confirm** once.

```lua
rollCancel("Brown")
```

---

### J2 — Blood surge + compound (same roll)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E J2 Surge compound")
```

**Human:** **Left-click Hunger bag once** (Blood Surge — no hunger die yet).

**After surge — check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.meta.bloodSurgeActive` | **`true`** |
| `active.pool.rouse` | **≥ 1** |
| Spawned dice | **1 rouse** + **N normal** (N = character Blood Surge count) |

**Human:** **Roll** all dice → settle → **Confirm**.

**Before Confirm — check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.rouseOutcomeStrips` | Includes **Blood Surge** rouse strip (not only a manual rouse bag add) |

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

**Human:** **Left-click Hunger bag** (no roll active).

**Check:**

```lua
print(GlobalGetRollPhase({ color = "Brown" }))
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| Phase | **`preRoll`** |
| `active.rollType` | **STANDARD** |

```lua
rollCancel("Brown")
```

#### K1b — Rouse bag → ROUSE + 1 die

```lua
rollCancelAll()
```

**Human:** **Left-click Rouse bag**.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.rollType` | **ROUSE** |
| `active.pool.rouse` | **`1`** |

```lua
rollCancel("Brown")
```

#### K1c — Normal bag → STANDARD

```lua
rollCancelAll()
```

**Human:** **Left-click Normal bag**.

**Check:**

```lua
print(GlobalGetRollPhase({ color = "Brown" }))
```

| Expect |
| --- |
| Phase **`preRoll`**, STANDARD roll |

```lua
rollCancel("Brown")
```

---

### K2 — PRE_ROLL on STANDARD roll

#### K2a — Normal bag left adds die

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2a")
```

**Human:** **Left-click Normal bag** twice.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.normal` | **`2`** |

#### K2b — Normal bag right removes last normal/hunger

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2b")
```

**Human:** Left-click Normal **twice**, then **right-click Normal** once.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.normal` | **`1`** |

```lua
rollCancel("Brown")
```

#### K2c — Hunger bag left (surge off) → Blood Surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2c surge")
```

**Human:** **Left-click Hunger bag** once (surge not active).

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.meta.bloodSurgeActive` | **`true`** |
| `active.pool.hunger` | **`0`** (no hunger die added on first click) |

```lua
rollCancel("Brown")
```

#### K2d — Hunger bag left (surge on) adds hunger

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2d hunger")
```

**Human:** Left-click Hunger once (activate surge), then **left-click Hunger** again.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.hunger` | **`1`** |

```lua
rollCancel("Brown")
```

#### K2e — Rouse bag left adds rouse

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2e rouse")
```

**Human:** **Left-click Rouse bag** once.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.rouse` | **`1`** |

```lua
rollCancel("Brown")
```

#### K2f — Rouse bag right with surge active deactivates surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f surge off")
```

**Human:** Left-click Hunger once (surge on), then **right-click Rouse bag**.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.meta.bloodSurgeActive` | **`false`** |
| Surge-spawned dice | **Destroyed** |

```lua
rollCancel("Brown")
```

---

### K3 — PRE_ROLL on dedicated ROUSE

#### K3a — Normal bag resets rouse check to 1 die

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3a")
```

**Human:** Left-click Rouse until pool has **2** rouse dice, then **left-click Normal bag**.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.rouse` | **`1`** |

```lua
rollCancel("Brown")
```

#### K3b — Rouse bag right removes last rouse

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3b")
```

**Human:** Left-click Rouse **twice**, then **right-click Rouse** once.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.rouse` | **`1`** |

```lua
rollCancel("Brown")
```

---

### K4 — Empty pool right-click cancels roll

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K4")
```

**Human:** Left-click Normal until pool has dice, then **right-click** Normal (or Hunger/Rouse) until pool is **empty**.

**Check:**

```lua
rollState("Brown")
print(GlobalGetRollPhase({ color = "Brown" }))
```

| Expect |
| --- |
| No active roll; phase idle / panel closed |

```lua
rollCancel("Brown")
```

---

## Suite L — Baton passing and permanent automation

### L1a — Setup: baton with storyteller

```lua
rollCancel("Brown")
RC.initiateRoll("Brown", { rollType = C.RollType.STANDARD, label = "E2E Baton" })
rollState("Brown")
```

**Check immediately:**

| Field | Expect |
| --- | --- |
| `active.phase` | **`setup`** |
| `active.batonHolder` | **`storyteller`** |

---

### L1b — Open roll: baton to player

**Human (ST):** Set difficulty on ST dashboard for Brown, then **Open roll** (or console):

```lua
RC.openRoll("Brown")
print(GlobalGetRollPhase({ color = "Brown" }))
rollState("Brown")
```

**Check:**

| Field | Expect |
| --- | --- |
| Phase | **`preRoll`** |
| `active.batonHolder` | **`player`** |

---

### L1c — Roll: phases through rolling → postRoll

**Human:** Click **Roll** → wait for settle.

**After settle — check:**

```lua
print(GlobalGetRollPhase({ color = "Brown" }))
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| Phase | **`postRoll`** |

```lua
rollCancel("Brown")
```

---

### L2a — `autoHunger` off: normal bag spawns normal

```lua
S.setStateVal("stRollSettings", "autoHunger", false)
rollTest("Brown", 2, C.RollType.STANDARD, "E2E L2a autoHunger off")
```

**Human:** **Left-click Normal bag** once (Brown below hunger cap).

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.pool.normal` | **`1`** |
| `active.pool.hunger` | **`0`** (no auto-redirect to hunger die) |

```lua
rollCancel("Brown")
S.setStateVal("stRollSettings", "autoHunger", true)
```

---

### L2b — `autoWp` off: WP spend does not auto-damage

```lua
S.setStateVal("stRollSettings", "autoWp", false)
```

Run **Suite I1** through **Spend WP**, then note Brown **superficial willpower** on tracker.

**Check:** Superficial willpower **unchanged** after Spend WP (no +1 damage).

```lua
S.setStateVal("stRollSettings", "autoWp", true)
```

---

### L2c — `autoApplyRouseOutcomes` off: confirm does not apply rouse hunger

```lua
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", false)
rollTest("Brown", 1, C.RollType.ROUSE, "E2E L2c rouse no auto")
```

**Human:** Roll rouse die → settle.

```lua
rollSetFaces("Brown", { rouse = { 3 } })
rollState("Brown")
```

Note Brown **hunger** on tracker, then **Confirm** (or auto-broadcast path).

**Check:** Hunger tracker **unchanged** after confirm (fail face ≤5 would normally +1).

```lua
rollCancel("Brown")
S.setStateVal("stRollSettings", "autoApplyRouseOutcomes", true)
```

---

## Suite M — Bestial Null via roll option (7 / 3 pool)

Distinct from **G7** (faces `10,10,3` + hunger `1`). Uses smaller faces so margin is unambiguous.

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E M1 bestialNull opt")
RC.setRollOptions("Brown", { bestialNull = true })
```

**Human:** Pool **2 normal + 1 hunger** (`7`, `3`, hunger `1`). **Roll** → settle.

```lua
rollSetFaces("Brown", { normal = {7, 3}, hunger = {1} })
rollState("Brown")
```

**Before Confirm — check:**

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **`failure`** (2 raw successes − bestial null on hunger 1 → 1 success vs diff 2) |
| `active.rollOptions.bestialNull` | **`true`** |

```lua
rollCancel("Brown")
```

---

## Suite N — Blood Surge (hunger bag)

### N1 — First hunger click activates surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N1 surge")
```

**Human:** **Left-click Hunger bag** once.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.meta.bloodSurgeActive` | **`true`** |
| `active.pool.rouse` | **≥ 1** |
| `active.pool.hunger` | **`0`** |

```lua
rollCancel("Brown")
```

---

### N2 — Second hunger click adds hunger die

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N2 hunger die")
```

**Human:** Left-click Hunger **twice**.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.meta.bloodSurgeActive` | **`true`** |
| `active.pool.hunger` | **`1`** |

```lua
rollCancel("Brown")
```

---

### N3 — Rouse bag right deactivates surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N3 surge cancel")
```

**Human:** Left-click Hunger once (surge on), then **right-click Rouse bag**.

**Check:**

```lua
rollState("Brown")
```

| Field | Expect |
| --- | --- |
| `active.meta.bloodSurgeActive` | **`false`** |

```lua
rollCancel("Brown")
```

---

## Suite O — Storyteller slots, Werewolf, brutal outcome

### O1a — One live ST slot

```lua
rollCancel("Black")
rollStTest("NPC One", C.RollType.STANDARD)
rollStSlots()
```

**Check:**

| Field | Expect |
| --- | --- |
| `liveSlotIndex` | **`1`**, **`2`**, or **`3`** |

```lua
rollStTest("NPC Two", C.RollType.STANDARD)
```

**Check:** Second initiate **blocked** (no second live slot).

```lua
rollCancel("Black")
```

---

### O1b — Slot persists until CLEAR

```lua
rollStTest("NPC One", C.RollType.STANDARD)
```

**Human:** Complete roll on ST dashboard → **Confirm**.

```lua
rollStSlots()
```

**Check:** Slot row still shows resolved roll until ST clicks **CLEAR**.

```lua
rollCancel("Black")
```

---

### O2 — Werewolf roll (no V5 bestial/messy classes)

```lua
rollStTest("Garou", C.RollType.WEREWOLF)
```

**Human:** ST **werewolf** / **rage** bags only — build pool, set difficulty, **Roll** → settle.

```lua
rollSetFaces("Black", { werewolf = {8, 6}, rage = {5, 7} })
rollState("Black")
```

**Before Confirm — check:**

| Field | Expect |
| --- | --- |
| `active.result.resultClass` | **Not** `messyCritical`, `bestialFailure`, or `totalBestialFailure` (werewolf classifier) |

```lua
rollCancel("Black")
```

---

### O3 — Brutal outcome (rage 1 or 2)

```lua
rollStTest("Garou Brutal", C.RollType.WEREWOLF)
```

**Human:** Pool **≥ 2 rage** dice only. **Roll** → settle.

```lua
rollSetFaces("Black", { rage = {1, 2} })
rollState("Black")
```

**Before Confirm — check:**

| Field | Expect |
| --- | --- |
| `active.pendingResolution` | **`brutalFailViolence`** |
| Confirm button | **Blocked** until Fail vs Violence choice |

```lua
rollCancel("Black")
```

---

## Suite P — Oblivion-Rouse multi-die (Purple)

Each case is a **dedicated** `ROUSE_OBLIVION` roll with **2** oblivion dice in pool unless noted.

---

### P-A — All 6s: success, no hunger/stain

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-A")
```

**Human:** Left-click **Obliv-Rouse bag** twice (2 dice). **Roll** → settle.

```lua
rollSetFaces("Purple", { oblivRouse = {6, 6} })
rollState("Purple")
```

**Check:**

| Field | Expect |
| --- | --- |
| Outcome | **Success**; **no** hunger +1, **no** stain |
| `active.pendingResolution` | **nil** |

```lua
rollCancel("Purple")
```

---

### P-B — All 3s: hunger +1

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-B")
```

**Human:** 2 oblivion dice. **Roll** → settle.

```lua
rollSetFaces("Purple", { oblivRouse = {3, 3} })
rollState("Purple")
```

**Check:** Hunger **+1** on confirm/auto-apply; **no** stain.

```lua
rollCancel("Purple")
```

---

### P-C — 3 and 10: pending Hunger vs Stain

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-C")
```

**Human:** 2 oblivion dice. **Roll** → settle.

```lua
rollSetFaces("Purple", { oblivRouse = {3, 10} })
rollState("Purple")
```

**Check:**

| Field | Expect |
| --- | --- |
| `active.pendingResolution` | Player must choose **Hunger** or **Stain** (not auto-resolved) |

```lua
rollCancel("Purple")
```

---

### P-D — 1 and 10 (mixed): stained

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-D")
```

**Human:** 2 oblivion dice. **Roll** → settle.

```lua
rollSetFaces("Purple", { oblivRouse = {1, 10} })
rollState("Purple")
```

**Check:** **+1 stain** applied (no pending choice).

```lua
rollCancel("Purple")
```

---

### P-E — 3 and 7: success (6–9 present)

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-E")
```

**Human:** 2 oblivion dice. **Roll** → settle.

```lua
rollSetFaces("Purple", { oblivRouse = {3, 7} })
rollState("Purple")
```

**Check:** **Success** despite low `3` (because `7` is 6–9).

```lua
rollCancel("Purple")
```

---

### P-F — Oblivion in STANDARD compound (Purple)

```lua
rollTest("Purple", 2, C.RollType.STANDARD, "E2E P-F compound")
```

**Human:** Pool **2 normal** + **2 oblivRouse** (Obliv bag left-click twice). **Roll** → settle.

```lua
rollSetFaces("Purple", { normal = {7, 7}, oblivRouse = {3, 10} })
rollState("Purple")
```

**Before Confirm — check:**

| Field | Expect |
| --- | --- |
| `active.rouseOutcomeStrips` | Oblivion strip present |
| `active.pendingResolution` | **Hunger vs Stain** choice if faces `3` + `10` on obliv dice |

```lua
rollCancel("Purple")
```

---

## Sign-off


| Suite | Pass | Notes |
| --- | --- | --- |
| 0 Cleanup | ☐ | |
| A Standard smoke | ☐ | A1–A3 |
| B Cancel | ☐ | |
| C Rouse dedicated | ☐ | |
| D Oblivion dedicated (Purple) | ☐ | |
| E ST standard | ☐ | |
| F Conditions (`e2eBestialNull`) | ☐ | F1–F2 |
| G Classification | ☐ | G1–G7 |
| H Take Half | ☐ | H1–H2 |
| I Spend WP | ☐ | I1–I4 |
| J Compound rouse | ☐ | J1–J2 |
| K Bag clicks | ☐ | K1a–K4 |
| L Baton + automation | ☐ | L1a–L2c |
| M Bestial Null (opt) | ☐ | M1 |
| N Blood Surge | ☐ | N1–N3 |
| O ST / Werewolf / Brutal | ☐ | O1a–O3 |
| P Oblivion multi-die | ☐ | P-A–P-F, Purple |


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
