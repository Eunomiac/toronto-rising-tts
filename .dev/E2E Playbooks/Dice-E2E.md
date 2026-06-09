# Dice — manual E2E playbook

## Step 0 - Cleanup

```lua
rollCancelAll()
rollConfirm("Brown", { noActive = true })
rollConfirm("Purple", { noActive = true })
rollConfirm("Black", { noActive = true })
```

**Pass if:** All three rollConfirm calls print PASS.

## Suite A — Standard roll (PRE_ROLL → roll → confirm)

#### Step A1 — Arm roll

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E Standard")
    rollConfirm("Brown", {
      phase = "preRoll",
      active = { difficulty = 3, rollType = C.RollType.STANDARD },
    })
  end
})
```

**Pass if:** `rollConfirm` prints PASS.

#### Step A2 — Build pool (bags)

```lua
U.RunSequence({
  rollCancelAll,
  function() rollTest("Brown", 3, C.RollType.STANDARD, "E2E A2 pool", 0) end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Left-click Normal bag 5 times.

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 5, hunger = 0 } } }) end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Right-click Normal bag 1 time.

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 4, hunger = 0 } } }) end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Left-click Normal bag 1 time.

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 5, hunger = 0 } } }) end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** All three `rollConfirm` calls print PASS.

#### Step A3 — Roll and confirm

Human: Click Roll → Roll the dice → wait for settle (POST_ROLL).

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    result = { present = true, resultClass = { present = true } },
  },
})
```

**Pass if:** rollConfirm prints PASS.

## Suite B — Cancel and reset

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E B cancel", 0)
    rollCancel("Brown")
    rollConfirm("Brown", { noActive = true })
    rollCancelAll()
    rollConfirm("Brown", { noActive = true })
  end,
  rollCancelAll
})
```

**Pass if:** Both `noActive` checks print PASS.

## Suite C — Dedicated rouse check

#### C1 — autoApplyRouseOutcomes on (hunger +1)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
    setHunger("Brown", 2)
    rollConfirmTracker("Brown", { hunger = 2 })
    rollTest("Brown", 1, C.RollType.ROUSE, "E2E C1 rouse auto on")
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

```lua
U.RunSequence({
  function()
    rollE2eSettlePresetCheck("Brown", { rouse = { 4 } })
    rollConfirm("Brown", { noActive = true })
    rollConfirmTracker("Brown", { hunger = 3 })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm and rollConfirmTracker print PASS.

#### C2 — autoApplyRouseOutcomes off (hunger unchanged)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    S.setStateVal(false, "stRollSettings", "autoApplyRouseOutcomes")
    setHunger("Brown", 2)
    rollConfirmTracker("Brown", { hunger = 2 })
    rollTest("Brown", 1, C.RollType.ROUSE, "E2E C2 rouse auto off")
    rollE2eSettlePresetCheck("Brown", { rouse = { 4 } })
    rollConfirm("Brown", { noActive = true })
    rollConfirmTracker("Brown", { hunger = 2 })
    S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm and rollConfirmTracker print PASS.

## Suite D — Oblivion rouse dedicated (Purple)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E D obliv face 3")
    rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3 } })
    rollConfirm("Purple", { noActive = true })
    rollConfirmTracker("Purple", { hunger = 2, stains = 2 })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm and rollConfirmTracker print PASS.

## Suite E — Storyteller NPC roll (standard)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollStTest("E2E ST", C.RollType.STANDARD)
    rollStConfirm({ liveSlotIndex = 1 })
  end
})
```

Human: ST dashboard roll label reads E2E ST.

Human: Left-click Normal bag 1 time in the ST drawer (drawer opens on first spawn).

```lua
rollStConfirm({
  initiateBlocked = true,
  initiateLabel = "NPC Two",
  initiateRollType = C.RollType.STANDARD,
})
rollCancel("Black")
```

**Pass if:** rollStConfirm prints PASS.

## Suite E2 — Optional difficulty (TOR-163)

### E2a — Physical roll, no ST difficulty

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTestNoDiff("Brown", C.RollType.STANDARD, "E2E E2a no diff", 0)
    rollE2eSetPoolAndSpawn("Brown", 3, 0)
    rollE2eSettlePresetCheck("Brown", { normal = { 7, 4, 3 } })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        difficulty = { present = false },
        result = { resultClass = "win", successes = 1, marginAbsent = true },
      },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: ST clicks Confirm on Brown (or `rollForceConfirm("Brown")`).

```lua
rollE2eExpectBroadcast({
  visible = true,
  resultClass = "Win",
  successes = 1,
  marginAbsent = true,
})
```

**Pass if:** rollConfirm and rollE2eExpectBroadcast print PASS.

### E2b — Post-hoc ST difficulty adds margin

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTestNoDiff("Brown", C.RollType.STANDARD, "E2E E2b post hoc", 0)
    rollE2eSetPoolAndSpawn("Brown", 3, 0)
    rollE2eSettlePresetCheck("Brown", { normal = { 7, 4, 3 } })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { result = { successes = 1, marginAbsent = true } },
    })
    RC.setDifficulty("Brown", 3)
    RC.recalculate("Brown")
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { difficulty = 3, result = { resultClass = "failure", successes = 1, margin = -2 } },
    })
  end
})
```

**Pass if:** rollConfirm prints PASS.

### E2c — Werewolf, no ST difficulty

Run Suite O O2b.

## Suite F — Conditions roll policy (e2eBestialNull)

#### F1 — Baseline (no condition)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollE2eClearConditions("Brown", { "e2eBestialNull" })
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E F baseline", 1)
    rollE2eSetPoolAndSpawn("Brown", 3, 1)
    rollConfirm("Brown", { pool = { normal = 3, hunger = 1, rouse = 0 } })
    rollE2eSettlePresetCheck("Brown", { normal = {10, 10, 3}, hunger = {10} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { resultClass = "messyCritical", successes = 5 },
        rollPolicy = { bestialNull = false },
      },
    })
  end
})
```

**Pass if:** rollConfirm prints PASS.

#### F2 — With e2eBestialNull

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollE2eApplyConditions("Brown", { "e2eBestialNull" })
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E F bestialNull", 1)
    rollE2eSetPoolAndSpawn("Brown", 3, 1)
    rollConfirm("Brown", { pool = { normal = 3, hunger = 1, rouse = 0 } })
    rollE2eSettlePresetCheck("Brown", { normal = {10, 10, 3}, hunger = {1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { resultClass = "bestialFailure", successes = 1, margin = -1 },
        rollPolicy = { bestialNull = true },
      },
      contributingIncludes = { "e2eBestialNull" },
    })
  end,
  function() rollE2eClearConditions("Brown", { "e2eBestialNull" }) end
})
```

**Pass if:** rollConfirm prints PASS.

## Suite G — Result calculation accuracy

### G1 — Win at diff 2

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G1", 0)
    rollE2eSetPoolAutoHunger("Brown", 2)
    rollE2eSettlePresetCheck("Brown", { normal = {7, 7} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { result = { resultClass = "win", successes = 2, margin = 0 } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

### G2 — Critical at diff 3

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E Classify G2", 2)
    rollE2eSetPoolAutoHunger("Brown", 4)
    rollE2eSettlePresetCheck("Brown", { normal = {10, 10}, hunger = {9, 1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { result = { resultClass = "criticalWin", margin = 2 } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

### G3 — Messy critical at diff 3

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E Classify G3", 2)
    rollE2eSetPoolAutoHunger("Brown", 4)
    rollE2eSettlePresetCheck("Brown", { normal = {10, 10}, hunger = {10, 1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { result = { resultClass = "messyCritical" } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

### G4 — Bestial failure at diff 7

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 7, C.RollType.STANDARD, "E2E Classify G4", 2)
    rollE2eSetPoolAutoHunger("Brown", 4)
    rollE2eSettlePresetCheck("Brown", { normal = {10, 10}, hunger = {10, 1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { result = { resultClass = "bestialFailure", margin = -2 } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

### G5 — Total bestial failure at diff 2

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G5", 1)
    rollE2eSetPoolAutoHunger("Brown", 3)
    rollE2eSettlePresetCheck("Brown", { normal = {4, 4}, hunger = {1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { result = { resultClass = "totalBestialFailure" } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

### G6 — Win with crits off (no 10-pair bonus)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 4, C.RollType.STANDARD, "E2E Classify G6", 1)
    RC.setRollOptions("Brown", { crits = false })
    rollE2eSetPoolAutoHunger("Brown", 5)
    rollE2eSettlePresetCheck("Brown", { normal = {10, 8, 7, 6}, hunger = {10} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { resultClass = "win" },
        rollOptions = { crits = false },
      },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

### G7 — Bestial Failure with bestial null

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E Classify G7", 1)
    RC.setRollOptions("Brown", { bestialNull = true })
    rollE2eSetPoolAutoHunger("Brown", 4)
    rollE2eSettlePresetCheck("Brown", { normal = {10, 10, 3}, hunger = {1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { resultClass = "bestialFailure", successes = 1, margin = -1 },
        rollOptions = { bestialNull = true },
      },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm prints PASS.

## Suite H — Take Half (TOR-73)

### H1 — Take Half with ST difficulty (explicit margin)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 4, C.RollType.STANDARD, "E2E Take Half", 0)
    rollE2eSetPoolAndSpawn("Brown", 4, 0)
    RC.takeHalf("Brown")
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        tookHalf = true,
        result = { resultClass = "failure", successes = 2, margin = -2 },
        batonHolder = "storyteller",
      },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})

```

**Pass if:** rollConfirm prints PASS.

### H1b — Take Half, no ST difficulty

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTestNoDiff("Brown", C.RollType.STANDARD, "E2E H1b no diff", 0)
    rollE2eSetPoolAndSpawn("Brown", 4, 0)
    RC.takeHalf("Brown")
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        tookHalf = true,
        result = { resultClass = "win", successes = 2, marginAbsent = true },
      },
    })
    rollForceConfirm("Brown")
    rollE2eExpectBroadcast({
      visible = true,
      resultClass = "Win",
      successes = 2,
      marginAbsent = true,
    })
  end
})
```

Human: Broadcast shows 4 normal die slots — 2 success (ankh), 2 blank.

**Pass if:** `rollConfirm` and `rollE2eExpectBroadcast` print PASS.

### H1c — Take Half, zero successes (pool 1)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTestNoDiff("Brown", C.RollType.STANDARD, "E2E H1c zero half", 0)
    rollE2eSetPoolAndSpawn("Brown", 1, 0)
    RC.takeHalf("Brown")
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        tookHalf = true,
        result = { resultClass = "totalFailure", successes = 0, marginAbsent = true },
      },
    })
  end
})
```

**Pass if:** rollConfirm prints PASS.

### H2 — Take Half + rouse dice (ST difficulty)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E Take Half Rouse", 0)
    rollE2eSetPoolAndSpawn("Brown", 4, 0)
    rollE2eAddPoolKindSpawn("Brown", "rouse", 1)
    RC.takeHalf("Brown")
    rollConfirm("Brown", {
      phase = "rolling",
      active = { takeHalfAwaitingRouse = true },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Throw Rouse dice (or preset + settle):

```lua
rollSetFaces("Brown", { rouse = { 4 } })
RC.onDiceSettled("Brown")
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    tookHalf = true,
    result = { resultClass = "failure", successes = 2, margin = -1 },
  },
  rouseStrip = { label = "Rouse", narrative = "Hunger Roused" },
})
```

Human: ST clicks Confirm on the Brown roll (or console `rollForceConfirm("Brown")`).

```lua
rollE2eExpectBroadcast({
  visible = true,
  resultClass = "Failure",
  successes = 2,
  margin = -1,
})
```

**Pass if:** rollConfirm and rollE2eExpectBroadcast print PASS.

### H2b — Take Half + rouse, no ST difficulty

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTestNoDiff("Brown", C.RollType.STANDARD, "E2E H2b no diff rouse", 0)
    rollE2eSetPoolAndSpawn("Brown", 4, 0)
    rollE2eAddPoolKindSpawn("Brown", "rouse", 1)
    RC.takeHalf("Brown")
    rollConfirm("Brown", { phase = "rolling", active = { takeHalfAwaitingRouse = true } })
    rollSetFaces("Brown", { rouse = { 4 } })
    RC.onDiceSettled("Brown")
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        tookHalf = true,
        result = { resultClass = "win", successes = 2, marginAbsent = true },
      },
    })
    rollForceConfirm("Brown")
    rollE2eExpectBroadcast({
      visible = true,
      resultClass = "Win",
      successes = 2,
      marginAbsent = true,
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirm and rollE2eExpectBroadcast print PASS.

## Suite I — Spend Willpower

```lua
U.RunSequence({
  rollCancelAll,
  function()
    setWillpowerSuperficial("Brown", 3)
    rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

**Pass if:** rollConfirmTracker prints PASS.

### I1 — Default WP reroll (3 dice, hunger locked)

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E I1 WP default", 0)
    setWillpowerSuperficial("Brown", 3)
    RC.setRollOptions("Brown", {
      wpReroll = true,
      numberOfRerolls = 1,
      numberOfDiceRerolled = 3,
      canRerollHunger = false,
    })
    rollE2eSetPoolAndSpawn("Brown", 3, 0)
    rollE2eSettlePresetCheck("Brown", { normal = {4, 4, 4} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { resultClass = "totalFailure" },
        willpower = { available = true },
        rollOptions = { numberOfDiceRerolled = 3, canRerollHunger = false },
      },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Click Spend WP. For each of the 3 normal dice: hover the die on the tray and press R once (do not left-click). Wait until all rerolled dice have settled (or use Confirm when TOR-165 is fixed).

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    willpower = { wpRerollWave = false, rerollsRemaining = 0 },
  },
})
```

**Pass if:** rollConfirm prints PASS.

### I2 — WP reroll cap: 1 die only

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E I2 WP cap 1", 0)
    setWillpowerSuperficial("Brown", 3)
    RC.setRollOptions("Brown", {
      wpReroll = true,
      numberOfRerolls = 1,
      numberOfDiceRerolled = 1,
      canRerollHunger = false,
    })
    rollE2eSetPoolAndSpawn("Brown", 3, 0)
    rollE2eSettlePresetCheck("Brown", { normal = {4, 4, 4} })
    rollConfirm("Brown", { phase = "postRoll", active = { result = { resultClass = "totalFailure" } } })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Click Spend WP. Hover any one normal die and press R (first reroll). Visual check: hover a second normal die and press R — it must not randomize after the cap locks the tray. Wait for the one rerolled die to settle.

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = { willpower = { wpRerollWave = false } },
  wpRerollChosenCount = 1,
})
```

**Pass if:** rollConfirm prints PASS.

### I3 — Can reroll hunger

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E I3 WP hunger", 1)
    setWillpowerSuperficial("Brown", 3)
    RC.setRollOptions("Brown", {
      wpReroll = true,
      numberOfRerolls = 1,
      numberOfDiceRerolled = 3,
      canRerollHunger = true,
    })
    rollE2eSetPoolAutoHunger("Brown", 3)
    rollE2eSettlePresetCheck("Brown", { normal = {4, 4}, hunger = {4} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { rollOptions = { canRerollHunger = true } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})

```

Human: Click Spend WP, then hover the hunger die and press R once only (do not reroll normal dice). Wait for reroll settle.

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    willpower = { wpRerollWave = false },
    rollOptions = { canRerollHunger = true },
  },
  wpRerollChosenCount = 1,
})
```

**Pass if:** rollConfirm prints PASS.

### I4 — Rouse die not WP-rerollable

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E I4 WP rouse lock", 0)
    setWillpowerSuperficial("Brown", 3)
    RC.setRollOptions("Brown", {
      wpReroll = true,
      numberOfRerolls = 1,
      numberOfDiceRerolled = 3,
      canRerollHunger = false,
    })
    rollE2eSetPoolAndSpawn("Brown", 2, 0)
    rollE2eAddPoolKindSpawn("Brown", "rouse", 1)
    rollE2eSettlePresetCheck("Brown", { normal = {4, 4}, rouse = {6} })
    rollConfirm("Brown", { phase = "postRoll" })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Click Spend WP. Visual check: hover the rouse die and press R — it must stay locked. Hover each normal die and press R once, then wait for reroll settle.

```lua
rollConfirm("Brown", {
  phase = "postRoll",
  active = {
    willpower = { wpRerollWave = false },
    rollOptions = { numberOfDiceRerolled = 3 },
  },
  wpRerollChosenCount = 2,
})
```

**Pass if:** rollConfirm prints PASS.

## Suite J — Compound roll (rouse in standard pool)

### J1 — One rouse in standard pool

```lua
U.RunSequence({
  rollCancelAll,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E J1 Compound", 0)
    rollE2eSetPoolAndSpawn("Brown", 2, 0)
    rollE2eAddPoolKindSpawn("Brown", "rouse", 1)
    rollE2eSettlePresetCheck("Brown", { normal = {7, 3}, rouse = {4} })
    rollConfirm("Brown", {
      phase = "postRoll",
      rouseOutcomeStripsMin = 1,
      active = { result = { resultClass = "win", successes = 2 } },
    })
  end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Click Confirm once.

**Pass if:** rollConfirm prints PASS.

### J2 — Blood surge + compound (same roll)

```lua
U.RunSequence({
  rollCancelAll,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E J2 Surge compound", 0) end,
  function() M.setCamera("ALL", "rollBrown") end
})
```

Human: Left-click Hunger bag 1 time.

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { bloodSurgeRouse = 1, normal = 2, hunger = 0 },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollE2eSettlePresetCheck("Brown", { normal = { 7, 3 }, rouse = { 4 } })
rollConfirm("Brown", {
  phase = "postRoll",
  rouseOutcomeStripsMin = 1,
  active = { result = { resultClass = "win", successes = 2 } },
  rouseStripLabel = "Rouse",
})
```

**Pass if:** rollConfirm prints PASS.

Human: Click Confirm once.

## Suite K — Dice bag clicks (left vs right)

```lua
rollCancelAll()
```

### K1 — No active roll: bag starts a roll

#### K1a — Hunger bag → STANDARD

```lua
rollCancelAll()
```

Human: Left-click Hunger bag 1 time (no roll active).

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { rollType = C.RollType.STANDARD },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K1b — Rouse bag → ROUSE + 1 die

```lua
rollCancelAll()
```

Human: Left-click Rouse bag 1 time.

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { rollType = C.RollType.ROUSE, pool = { rouse = 1 } },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K1c — Normal bag → STANDARD

```lua
rollCancelAll()
```

Human: Left-click Normal bag 1 time.

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { rollType = C.RollType.STANDARD },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

### K2 — PRE_ROLL on STANDARD roll

#### K2a — Normal bag left adds die

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2a", 0)
```

Human: Left-click Normal bag 2 times.

```lua
rollConfirm("Brown", { active = { pool = { normal = 2 } } })
```

**Pass if:** rollConfirm prints PASS.

#### K2b — Normal bag right removes last normal/hunger

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2b", 0)
```

Human: Left-click Normal bag 2 times, then right-click Normal bag 1 time.

```lua
rollConfirm("Brown", { active = { pool = { normal = 1 } } })
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2c — Hunger bag left (surge off) → Blood Surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2c surge", 0)
```

Human: Left-click Hunger bag 1 time (surge not active).

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { hunger = 0, bloodSurgeRouse = 1, normal = 2 },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2d — Hunger bag left (surge on) adds Blood Surge rouse

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2d surge rouse", 0)
```

Human: Left-click Hunger bag 1 time (surge on), then left-click Hunger bag 1 time again (adds surge rouse, not hunger).

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { hunger = 0, bloodSurgeRouse = 2, normal = 2 },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2e — Rouse bag left adds rouse

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2e rouse", 0)
```

Human: Left-click Rouse bag 1 time.

```lua
rollConfirm("Brown", { active = { pool = { rouse = 1 } } })
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2f — Hunger bag right with surge active (full undo when last surge rouse removed)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f surge off", 0)
```

Human: Left-click Hunger bag 1 time (surge on), then right-click Hunger bag 1 time (removes the one surge rouse → full undo including surge normal dice).

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = false },
  pool = { bloodSurgeRouse = 0, rouse = 0, normal = 0, hunger = 0 },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2f2 — Hunger bag right (surge off) is no-op

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f2 hunger right noop", 0)
```

Human: Left-click Normal bag 1 time (no surge), then right-click Hunger bag 1 time (must not remove dice).

```lua
rollConfirm("Brown", { active = { pool = { normal = 1 } } })
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2h — Blood Surge rouse + manual rouse coexist

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2h compound rouse", 0)
```

Human: Left-click Hunger bag 1 time (activate surge), then left-click Rouse bag 1 time.

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { bloodSurgeRouse = 1, rouse = 1, normal = 2 },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K2i — Hunger bag disabled until open (visual)

```lua
rollCancel("Brown")
```

Human: Hunger bag at y ≈ -200 / locked before `rollTest` + ST Open. After `rollTest` + ST opens roll, Hunger bag enabled at seat.

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2i bag vis", 0)
```

Human: ST Open Roll if needed; confirm Hunger bag is reachable; left-click Hunger once for surge.

```lua
rollCancel("Brown")
```

#### K2g-Brown — Rouse blocks Oblivion-Rouse (silent fail)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2g Brown", 0)
```

Human: Left-click Rouse bag 1 time, then left-click Oblivion-Rouse bag 1 time (must fail silently on Brown).

```lua
rollConfirm("Brown", { pool = { rouse = 1, oblivRouse = 0 } })
rollCancel("Brown")
```

**Pass if:** rollConfirm prints PASS.

#### K2g-Purple — Oblivion-Rouse blocks Rouse (silent fail)

```lua
rollTest("Purple", 2, C.RollType.STANDARD, "E2E K2g Purple", 0)
```

Human: Left-click Oblivion-Rouse bag 1 time, then left-click Rouse bag 1 time (must fail silently on Purple).

```lua
rollConfirm("Purple", { pool = { rouse = 0, oblivRouse = 1 } })
rollCancel("Purple")
```

**Pass if:** rollConfirm prints PASS.

### K3 — PRE_ROLL on dedicated ROUSE

#### K3a — Normal bag promotes to compound standard roll

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3a")
```

Human: Left-click Rouse bag 2 times, then left-click Normal bag 1 time.

```lua
rollConfirm("Brown", {
  active = {
    rollType = C.RollType.STANDARD,
    batonHolder = "player",
    pool = { rouse = 3, normal = 1 },
  },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Brown")
```

#### K3b — Rouse bag right removes last rouse

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3b")
```

Human: Left-click Rouse bag 2 times, then right-click Rouse bag 1 time.

```lua
rollConfirm("Brown", { active = { pool = { rouse = 2 } } })
rollCancel("Brown")
```

**Pass if:** rollConfirm prints PASS.

#### K3c — Oblivion dedicated: Normal promotes (Purple)

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E K3c")
```

Human: Left-click Oblivion-Rouse bag 1 time, then left-click Normal bag 1 time.

```lua
rollConfirm("Purple", {
  active = {
    rollType = C.RollType.STANDARD,
    batonHolder = "player",
    pool = { oblivRouse = 2, normal = 1 },
  },
})
```

**Pass if:** rollConfirm prints PASS.

```lua
rollCancel("Purple")
```

### K4 — Empty pool right-click cancels roll

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E K4", 0)
```

Human: Left-click Normal bag 2 times, then right-click Normal bag 2 times (pool empty → roll cancels).

```lua
rollConfirm("Brown", { noActive = true })
```

**Pass if:** rollConfirm prints PASS.

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

### L1b — Open roll: baton to player

Human (ST): Set difficulty 2 on ST dashboard for Brown, then click Open roll.

```lua
rollConfirm("Brown", {
  phase = "preRoll",
  active = { batonHolder = "player", difficulty = 2 },
})
```

### L1c — Roll: phases through rolling → postRoll

Human: Left-click Normal bag 2 times, click Roll → wait for settle.

After settle — check:

```lua
rollConfirm("Brown", { phase = "postRoll" })
rollCancel("Brown")
```

### L2a — autoHunger off: normal bag spawns normal

```lua
S.setStateVal(false, "stRollSettings", "autoHunger")
rollTest("Brown", 2, C.RollType.STANDARD, "E2E L2a autoHunger off")
```

Human: Left-click Normal bag 1 time (Brown below hunger cap).

```lua
rollConfirm("Brown", { pool = { normal = 1, hunger = 0 } })
rollCancel("Brown")
S.setStateVal(true, "stRollSettings", "autoHunger")
```

### L2b — autoWp off: WP spend does not auto-damage

```lua
S.setStateVal(false, "stRollSettings", "autoWp")
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

Human: Left-click Normal bag 3 times, Roll → settle, click Spend WP, then hover each of 3 normal dice and press R once, wait for reroll settle.

```lua
rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
rollCancel("Brown")
S.setStateVal(true, "stRollSettings", "autoWp")
```

### L2c — autoApplyRouseOutcomes off: confirm does not apply rouse hunger

```lua
S.setStateVal(false, "stRollSettings", "autoApplyRouseOutcomes")
setHunger("Brown", 2)
rollConfirmTracker("Brown", { hunger = 2 })
rollTest("Brown", 1, C.RollType.ROUSE, "E2E L2c rouse no auto")
rollE2eSettlePresetCheck("Brown", { rouse = { 3 } })
rollConfirm("Brown", { noActive = true })
rollConfirmTracker("Brown", { hunger = 2 })
S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
rollCancel("Brown")
```

## Suite M — Bestial Null via roll option (7 / 3 pool)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E M1 bestialNull opt", 1)
RC.setRollOptions("Brown", { bestialNull = true })
```

Human: Left-click Normal bag 3 times (`rollTest` hunger 1; pool 2N+1H). Roll → settle.

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

## Suite N — Blood Surge (hunger bag)

### N1 — First hunger click activates surge

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N1 surge", 0)
```

Human: Left-click Hunger bag 1 time.

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { bloodSurgeRouse = 1, normal = 2, hunger = 0 },
})
```

```lua
rollCancel("Brown")
```

### N2 — Second hunger click adds Blood Surge rouse (surge already on)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N2 surge rouse add", 0)
```

Human: Left-click Hunger bag 1 time (surge on), then left-click Hunger bag 1 time again (adds surge rouse, not hunger).

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = true },
  pool = { bloodSurgeRouse = 2, normal = 2, hunger = 0 },
})
```

```lua
rollCancel("Brown")
```

### N3 — Hunger bag right removes surge rouse (full undo when last)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E N3 surge cancel", 0)
```

Human: Left-click Hunger bag 1 time (surge on), then right-click Hunger bag 1 time (full undo when only one surge rouse).

```lua
rollConfirm("Brown", {
  meta = { bloodSurgeActive = false },
  pool = { bloodSurgeRouse = 0, rouse = 0, normal = 0, hunger = 0 },
})
```

```lua
rollCancel("Brown")
```

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

### O1b — Slot persists until CLEAR

```lua
rollCancel("Black")
rollStTest("NPC One", C.RollType.STANDARD)
rollStConfirm({ liveSlotIndex = 1 })
```

Human: Left-click Normal bag 2 times in ST drawer, set difficulty 2, Roll → settle, click Confirm on ST dashboard.

```lua
rollStConfirm({ liveSlotIndex = 1 })
```

Human: Click CLEAR on slot 1 in ST dashboard.

```lua
rollStConfirm({ liveSlotIndexAbsent = true })
rollCancel("Black")
```

### O2a — Werewolf roll with ST difficulty

```lua
rollStTest("Garou", C.RollType.WEREWOLF)
```

Human: Left-click Werewolf bag 2 times, left-click Rage bag 2 times. Set difficulty 3 on ST dashboard, click Roll → wait for settle.

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

### O2b — Werewolf roll, no ST difficulty (Suite E2c)

```lua
rollCancel("Black")
rollStTest("Garou E2E", C.RollType.WEREWOLF)
```

Human: Left-click Werewolf bag 2 times, left-click Rage bag 2 times. Do not set dashboard difficulty. Click Roll → wait for settle.

```lua
rollSetFaces("Black", { werewolf = { 8, 6 }, rage = { 5, 7 } })
RC.startRolling("Black")
RC.onDiceSettled("Black")
rollConfirm("Black", {
  phase = "postRoll",
  active = {
    difficulty = { present = false },
    result = { resultClass = "win", successes = 3, marginAbsent = true },
  },
})
rollForceConfirm("Black")
rollE2eExpectBroadcast({
  visible = true,
  resultClass = "Win",
  successes = 3,
  marginAbsent = true,
})
rollCancel("Black")
```

**Pass if:** rollConfirm and rollE2eExpectBroadcast print PASS.

### O3 — Brutal outcome (rage 1 or 2)

```lua
rollStTest("Garou Brutal", C.RollType.WEREWOLF)
```

Human: Left-click Rage bag 2 times (no werewolf dice). Set difficulty 2 on ST dashboard, click Roll → wait for settle.

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

## Suite P — Oblivion-Rouse multi-die (Purple)

### P-A — All 6s: success, no hunger/stain

```lua
rollCancel("Purple")
S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-A")
```

Human: Left-click Oblivion-Rouse bag 2 times.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 6, 6 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollCancel("Purple")
```

### P-B — All 3s: hunger +1

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-B")
```

Human: Left-click Oblivion-Rouse bag 2 times.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3, 3 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 2, stains = 2 })
rollCancel("Purple")
```

### P-C — 3 and 10: pending Hunger vs Stain

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-C")
```

Human: Left-click Oblivion-Rouse bag 2 times.

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

### P-D — 1 and 10 (mixed): stained

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-D")
```

Human: Left-click Oblivion-Rouse bag 2 times.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 1, 10 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 1, stains = 3 })
rollCancel("Purple")
```

### P-E — 3 and 7: success (6–9 present)

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-E")
```

Human: Left-click Oblivion-Rouse bag 2 times.

```lua
rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3, 7 } })
rollConfirm("Purple", { noActive = true })
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollCancel("Purple")
```

### P-F — Oblivion in STANDARD compound (Purple)

```lua
rollCancel("Purple")
setHunger("Purple", 1)
setHumanityStains("Purple", 2)
rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
rollTest("Purple", 2, C.RollType.STANDARD, "E2E P-F compound", 0)
```

Human: Left-click Normal bag 2 times, left-click Oblivion-Rouse bag 2 times. Click Roll → wait for settle.

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
