# Dice — manual E2E playbook

This has been wired into RunTest. Initialize with `RunTest("Dice")`, then `RunTest()` after each step.

RunTest("Dice")
RunTest()


```lua
U.RunSequence({
  function()
    printHeader("Dice E2E: SUITE 0 - Cleanup", 1)
  end,
  rollCancelAll,
  function()
    rollConfirm("Brown", { noActive = true })
    rollConfirm("Purple", { noActive = true })
    rollConfirm("Black", { noActive = true })
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end,
  function()
    printHeader("Dice E2E: SUITE A - Standard roll", 1)
  end,
  function()
    printHeader("A1 - Arm roll", 2)
  end,
  rollCancelAll,
  function()
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E Standard")
    rollConfirm("Brown", {
      phase = "preRoll",
      active = { difficulty = 3, rollType = C.RollType.STANDARD },
    })
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("A2 - Build pool (bags)", 2)
  end,
  rollCancelAll,
  function() rollTest("Brown", 3, C.RollType.STANDARD, "E2E A2 pool", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 5 times", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 5, hunger = 0 } } }) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Right-click Normal bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 4, hunger = 0 } } }) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 5, hunger = 0 } } }) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("", 2)
  end,
  function()
    printHeader("A3 - Roll and confirm", 2)
  end,
  function()
    printHeader("[HUMAN] Click Roll → Roll the dice → wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { present = true, resultClass = { present = true } },
      },
    })
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end,
  function()
    printHeader("Dice E2E: SUITE B: Cancel and reset", 1)
  end,
  rollCancelAll,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E B cancel", 0)
    rollCancel("Brown")
    rollConfirm("Brown", { noActive = true })
    rollCancelAll()
    rollConfirm("Brown", { noActive = true })
  end,
  rollCancelAll,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end,
  function() printHeader("Dice E2E: SUITE C - Dedicated rouse check", 1) end,
  function() printHeader("C1 - autoApplyRouseOutcomes on (hunger +1)", 2) end,
  rollCancelAll,
  function()
    S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
    setHunger("Brown", 2)
    rollConfirmTracker("Brown", { hunger = 2 })
    rollTest("Brown", 1, C.RollType.ROUSE, "E2E C1 rouse auto on")
  end,
  function() M.setCamera("ALL", "rollBrown") end,
  function()
    rollE2eSettlePresetCheck("Brown", { rouse = { 4 } })
    rollConfirm("Brown", { noActive = true })
    rollConfirmTracker("Brown", { hunger = 3 })
  end,
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("C2 - autoApplyRouseOutcomes off (hunger unchanged)", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE D - Oblivion rouse dedicated (Purple)", 1) end,
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
  function() M.setCamera("ALL", "rollPurple") end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE E - Storyteller NPC roll (standard)", 1) end,
  rollCancelAll,
  function()
    rollStTest("E2E ST", C.RollType.STANDARD)
    rollStConfirm({ liveSlotIndex = 1 })
  end,
  function()
    printHeader("[HUMAN] ST dashboard roll label reads E2E ST", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    M.setCamera("ALL", "rollBlack")
    printHeader("[HUMAN] Left-click Normal bag 1 time in ST drawer", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollStConfirm({
      initiateBlocked = true,
      initiateLabel = "NPC Two",
      initiateRollType = C.RollType.STANDARD,
    })
    rollCancel("Black")
  end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE E2 - Optional difficulty", 1) end,
  function() printHeader("E2a - Physical roll, no ST difficulty", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] ST clicks Confirm on Brown (or rollForceConfirm)", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollE2eExpectBroadcast({
      visible = true,
      resultClass = "Win",
      successes = 1,
      marginAbsent = true,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("E2b - Post-hoc ST difficulty adds margin", 2) end,
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
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE F - Conditions roll policy (e2eBestialNull)", 1) end,
  function() printHeader("F1 - Baseline (no condition)", 2) end,
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
  end,
  function() printHeader("", 2) end,
  function() printHeader("F2 - With e2eBestialNull", 2) end,
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
  function() rollE2eClearConditions("Brown", { "e2eBestialNull" }) end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE G - Result calculation accuracy", 1) end,
  function() printHeader("G1 - Win at diff 2", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("G2 - Critical at diff 3", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("G3 - Messy critical at diff 3", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("G4 - Bestial failure at diff 7", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("G5 - Total bestial failure at diff 2", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("G6 - Win with crits off (no 10-pair bonus)", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("G7 - Bestial Failure with bestial null", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE H - Take Half", 1) end,
  function() printHeader("H1 - Take Half with ST difficulty (explicit margin)", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("H1b - Take Half, no ST difficulty", 2) end,
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
  end,
  function()
    printHeader("[HUMAN] Broadcast shows 4 normal die slots — 2 success (ankh), 2 blank", 3)
  end
})
```

```lua
U.RunSequence({
  function() printHeader("", 2) end,
  function() printHeader("H1c - Take Half, zero successes (pool 1)", 2) end,
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
  end,
  function() printHeader("", 2) end,
  function() printHeader("H2 - Take Half + rouse dice (ST difficulty)", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Throw Rouse dice (or preset + settle)", 3)
  end
})
```

```lua
U.RunSequence({
  function()
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
  end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] ST clicks Confirm on Brown (or rollForceConfirm)", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollE2eExpectBroadcast({
      visible = true,
      resultClass = "Failure",
      successes = 2,
      margin = -1,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("H2b - Take Half + rouse, no ST difficulty", 2) end,
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
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE I - Spend Willpower", 1) end,
  function() printHeader("Setup - seed Brown superficial willpower", 2) end,
  rollCancelAll,
  function()
    setWillpowerSuperficial("Brown", 3)
    rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
  end,
  function() M.setCamera("ALL", "rollBrown") end,
  function() printHeader("", 2) end,
  function() printHeader("I1 - Default WP reroll (3 dice, hunger locked)", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Click Spend WP; hover each of 3 normal dice and press R once; wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        willpower = { wpRerollWave = false, rerollsRemaining = 0 },
      },
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("I2 - WP reroll cap: 1 die only", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Spend WP; reroll one die; verify second die does not reroll; wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "postRoll",
      active = { willpower = { wpRerollWave = false } },
      wpRerollChosenCount = 1,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("I3 - Can reroll hunger", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Spend WP; hover hunger die and press R once; wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        willpower = { wpRerollWave = false },
        rollOptions = { canRerollHunger = true },
      },
      wpRerollChosenCount = 1,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("I4 - Rouse die not WP-rerollable", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Spend WP; rouse die must stay locked; reroll each normal die once", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        willpower = { wpRerollWave = false },
        rollOptions = { numberOfDiceRerolled = 3 },
      },
      wpRerollChosenCount = 2,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE J - Compound roll (rouse in standard pool)", 1) end,
  function() printHeader("J1 - One rouse in standard pool", 2) end,
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
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Click Confirm once", 3)
  end
})
```

```lua
U.RunSequence({
  function() printHeader("", 2) end,
  function() printHeader("J2 - Blood surge + compound (same roll)", 2) end,
  rollCancelAll,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E J2 Surge compound", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { bloodSurgeRouse = 1, normal = 2, hunger = 0 },
    })
    rollE2eSettlePresetCheck("Brown", { normal = { 7, 3 }, rouse = { 4 } })
    rollConfirm("Brown", {
      phase = "postRoll",
      rouseOutcomeStripsMin = 1,
      active = { result = { resultClass = "win", successes = 2 } },
      rouseStripLabel = "Rouse",
    })
  end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Click Confirm once", 3)
  end
})
```

```lua
U.RunSequence({
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE K - Dice bag clicks (left vs right)", 1) end,
  function() printHeader("K1a - Hunger bag to STANDARD (no active roll)", 2) end,
  rollCancelAll,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (no roll active)", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "preRoll",
      active = { rollType = C.RollType.STANDARD },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K1b - Rouse bag to ROUSE + 1 die", 2) end,
  rollCancelAll,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Rouse bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "preRoll",
      active = { rollType = C.RollType.ROUSE, pool = { rouse = 1 } },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K1c - Normal bag to STANDARD", 2) end,
  rollCancelAll,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "preRoll",
      active = { rollType = C.RollType.STANDARD },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2a - Normal bag left adds die", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2a", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollConfirm("Brown", { active = { pool = { normal = 2 } } }) end,
  function() printHeader("", 2) end,
  function() printHeader("K2b - Normal bag right removes last normal/hunger", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2b", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 2 times, then right-click Normal bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { active = { pool = { normal = 1 } } })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2c - Hunger bag left (surge off) to Blood Surge", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2c surge", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (surge not active)", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { hunger = 0, bloodSurgeRouse = 1, normal = 2 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2d - Hunger bag left (surge on) adds Blood Surge rouse", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2d surge rouse", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (surge on), then left-click Hunger bag 1 time again", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { hunger = 0, bloodSurgeRouse = 2, normal = 2 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2e - Rouse bag left adds rouse", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2e rouse", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Rouse bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { active = { pool = { rouse = 1 } } })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2f - Hunger bag right with surge active (full undo)", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f surge off", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (surge on), then right-click Hunger bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = false },
      pool = { bloodSurgeRouse = 0, rouse = 0, normal = 0, hunger = 0 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2f2 - Hunger bag right (surge off) is no-op", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f2 hunger right noop", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 1 time, then right-click Hunger bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { active = { pool = { normal = 1 } } })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2h - Blood Surge rouse + manual rouse coexist", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2h compound rouse", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (activate surge), then left-click Rouse bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { bloodSurgeRouse = 1, rouse = 1, normal = 2 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2i - Hunger bag disabled until open (visual)", 2) end,
  function() rollCancel("Brown") end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Visual: Hunger bag locked before rollTest + ST Open; after rollTest + Open, bag enabled", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2i bag vis", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] ST Open Roll if needed; confirm Hunger bag reachable; left-click Hunger once for surge", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollCancel("Brown") end,
  function() printHeader("", 2) end,
  function() printHeader("K2g-Brown - Rouse blocks Oblivion-Rouse (silent fail)", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2g Brown", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Rouse bag 1 time, then left-click Oblivion-Rouse bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { pool = { rouse = 1, oblivRouse = 0 } })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K2g-Purple - Oblivion-Rouse blocks Rouse (silent fail)", 2) end,
  function() rollTest("Purple", 2, C.RollType.STANDARD, "E2E K2g Purple", 0) end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 1 time, then left-click Rouse bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Purple", { pool = { rouse = 0, oblivRouse = 1 } })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K3a - Normal bag promotes to compound standard roll", 2) end,
  function() rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3a") end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Rouse bag 2 times, then left-click Normal bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      active = {
        rollType = C.RollType.STANDARD,
        batonHolder = "player",
        pool = { rouse = 3, normal = 1 },
      },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K3b - Rouse bag right removes last rouse", 2) end,
  function() rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3b") end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Rouse bag 2 times, then right-click Rouse bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { active = { pool = { rouse = 2 } } })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K3c - Oblivion dedicated: Normal promotes (Purple)", 2) end,
  function() rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E K3c") end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 1 time, then left-click Normal bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Purple", {
      active = {
        rollType = C.RollType.STANDARD,
        batonHolder = "player",
        pool = { oblivRouse = 2, normal = 1 },
      },
    })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("K4 - Empty pool right-click cancels roll", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E K4", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 2 times, then right-click Normal bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollConfirm("Brown", { noActive = true }) end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE L - Baton passing and permanent automation", 1) end,
  function() printHeader("L1a - Setup: baton with storyteller", 2) end,
  function() rollCancel("Brown") end,
  function()
    RC.initiateRoll("Brown", { rollType = C.RollType.STANDARD, label = "E2E Baton" })
    rollConfirm("Brown", {
      phase = "setup",
      active = { batonHolder = "storyteller" },
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("L1b - Open roll: baton to player", 2) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] ST: Set difficulty 2 on dashboard for Brown, then click Open roll", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      phase = "preRoll",
      active = { batonHolder = "player", difficulty = 2 },
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("L1c - Roll: phases through rolling to postRoll", 2) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 2 times, click Roll, wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { phase = "postRoll" })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("L2a - autoHunger off: normal bag spawns normal", 2) end,
  function()
    S.setStateVal(false, "stRollSettings", "autoHunger")
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E L2a autoHunger off")
  end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 1 time (Brown below hunger cap)", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", { pool = { normal = 1, hunger = 0 } })
    rollCancel("Brown")
    S.setStateVal(true, "stRollSettings", "autoHunger")
  end,
  function() printHeader("", 2) end,
  function() printHeader("L2b - autoWp off: WP spend does not auto-damage", 2) end,
  function()
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
  end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 3 times, Roll, settle, Spend WP, hover 3 normal dice and press R once each", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirmTracker("Brown", { willpowerSuperficial = 3 })
    rollCancel("Brown")
    S.setStateVal(true, "stRollSettings", "autoWp")
  end,
  function() printHeader("", 2) end,
  function() printHeader("L2c - autoApplyRouseOutcomes off: confirm does not apply rouse hunger", 2) end,
  function()
    S.setStateVal(false, "stRollSettings", "autoApplyRouseOutcomes")
    setHunger("Brown", 2)
    rollConfirmTracker("Brown", { hunger = 2 })
    rollTest("Brown", 1, C.RollType.ROUSE, "E2E L2c rouse no auto")
    rollE2eSettlePresetCheck("Brown", { rouse = { 3 } })
    rollConfirm("Brown", { noActive = true })
    rollConfirmTracker("Brown", { hunger = 2 })
    S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE M - Bestial Null via roll option (7 / 3 pool)", 1) end,
  function() printHeader("M1 - Bestial Null roll option", 2) end,
  function()
    rollTest("Brown", 2, C.RollType.STANDARD, "E2E M1 bestialNull opt", 1)
    RC.setRollOptions("Brown", { bestialNull = true })
  end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Normal bag 3 times; Roll and wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollSetFaces("Brown", { normal = {7, 3}, hunger = {1} })
    rollConfirm("Brown", {
      phase = "postRoll",
      active = {
        result = { resultClass = "failure" },
        rollOptions = { bestialNull = true },
      },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE N - Blood Surge (hunger bag)", 1) end,
  function() printHeader("N1 - First hunger click activates surge", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E N1 surge", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { bloodSurgeRouse = 1, normal = 2, hunger = 0 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("N2 - Second hunger click adds Blood Surge rouse", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E N2 surge rouse add", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (surge on), then left-click Hunger bag 1 time again", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { bloodSurgeRouse = 2, normal = 2, hunger = 0 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("N3 - Hunger bag right removes surge rouse (full undo when last)", 2) end,
  function() rollTest("Brown", 2, C.RollType.STANDARD, "E2E N3 surge cancel", 0) end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Left-click Hunger bag 1 time (surge on), then right-click Hunger bag 1 time", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = false },
      pool = { bloodSurgeRouse = 0, rouse = 0, normal = 0, hunger = 0 },
    })
    rollCancel("Brown")
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE O - Storyteller slots, Werewolf, brutal outcome", 1) end,
  function() printHeader("O1a - One live ST slot", 2) end,
  function() rollCancel("Black") end,
  function()
    rollStTest("NPC One", C.RollType.STANDARD)
    rollStConfirm({ liveSlotIndex = 1 })
    rollStTest("NPC Two", C.RollType.STANDARD)
    rollStConfirm({
      initiateBlocked = true,
      initiateLabel = "NPC Two",
      initiateRollType = C.RollType.STANDARD,
    })
    rollCancel("Black")
  end,
  function() printHeader("", 2) end,
  function() printHeader("O1b - Slot persists until CLEAR", 2) end,
  function() rollCancel("Black") end,
  function()
    rollStTest("NPC One", C.RollType.STANDARD)
    rollStConfirm({ liveSlotIndex = 1 })
  end,
  function()
    M.setCamera("ALL", "rollBlack")
    printHeader("[HUMAN] Left-click Normal bag 2 times in ST drawer; set difficulty 2; Roll, settle, Confirm on ST dashboard", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollStConfirm({ liveSlotIndex = 1 }) end,
  function()
    M.setCamera("ALL", "rollBlack")
    printHeader("[HUMAN] Click CLEAR on slot 1 in ST dashboard", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollStConfirm({ liveSlotIndexAbsent = true })
    rollCancel("Black")
  end,
  function() printHeader("", 2) end,
  function() printHeader("O2a - Werewolf roll with ST difficulty", 2) end,
  function() rollStTest("Garou", C.RollType.WEREWOLF) end,
  function()
    M.setCamera("ALL", "rollBlack")
    printHeader("[HUMAN] Left-click Werewolf bag 2 times, Rage bag 2 times; set difficulty 3; Roll and wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollSetFaces("Black", { werewolf = { 8, 6 }, rage = { 5, 7 } })
    RC.startRolling("Black")
    RC.onDiceSettled("Black")
    rollConfirm("Black", {
      phase = "postRoll",
      active = { result = { resultClass = "win", successes = 3, margin = 1 } },
    })
    rollCancel("Black")
  end,
  function() printHeader("", 2) end,
  function() printHeader("O2b - Werewolf roll, no ST difficulty (Suite E2c)", 2) end,
  function() rollCancel("Black") end,
  function() rollStTest("Garou E2E", C.RollType.WEREWOLF) end,
  function()
    M.setCamera("ALL", "rollBlack")
    printHeader("[HUMAN] Left-click Werewolf bag 2 times, Rage bag 2 times; do not set difficulty; Roll and wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
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
  end,
  function() printHeader("", 2) end,
  function() printHeader("O3 - Brutal outcome (rage 1 or 2)", 2) end,
  function() rollStTest("Garou Brutal", C.RollType.WEREWOLF) end,
  function()
    M.setCamera("ALL", "rollBlack")
    printHeader("[HUMAN] Left-click Rage bag 2 times; set difficulty 2; Roll and wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollSetFaces("Black", { rage = { 1, 2 } })
    RC.startRolling("Black")
    RC.onDiceSettled("Black")
    rollConfirm("Black", {
      phase = "postRoll",
      active = { pendingResolution = "brutalFailViolence" },
    })
    rollCancel("Black")
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end,
  function() printHeader("Dice E2E: SUITE P - Oblivion-Rouse multi-die (Purple)", 1) end,
  function() printHeader("P-A - All 6s: success, no hunger/stain", 2) end,
  function() rollCancel("Purple") end,
  function()
    S.setStateVal(true, "stRollSettings", "autoApplyRouseOutcomes")
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-A")
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollE2eSettlePresetCheck("Purple", { oblivRouse = { 6, 6 } })
    rollConfirm("Purple", { noActive = true })
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("P-B - All 3s: hunger +1", 2) end,
  function() rollCancel("Purple") end,
  function()
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-B")
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3, 3 } })
    rollConfirm("Purple", { noActive = true })
    rollConfirmTracker("Purple", { hunger = 2, stains = 2 })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("P-C - 3 and 10: pending Hunger vs Stain", 2) end,
  function() rollCancel("Purple") end,
  function()
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-C")
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollSetFaces("Purple", { oblivRouse = { 3, 10 } })
    RC.startRolling("Purple")
    RC.onDiceSettled("Purple")
    rollConfirm("Purple", {
      phase = "postRoll",
      active = { pendingResolution = "oblivHungerStain" },
    })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("P-D - 1 and 10 (mixed): stained", 2) end,
  function() rollCancel("Purple") end,
  function()
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-D")
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollE2eSettlePresetCheck("Purple", { oblivRouse = { 1, 10 } })
    rollConfirm("Purple", { noActive = true })
    rollConfirmTracker("Purple", { hunger = 1, stains = 3 })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("P-E - 3 and 7: success (6-9 present)", 2) end,
  function() rollCancel("Purple") end,
  function()
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E P-E")
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Oblivion-Rouse bag 2 times", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    rollE2eSettlePresetCheck("Purple", { oblivRouse = { 3, 7 } })
    rollConfirm("Purple", { noActive = true })
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollCancel("Purple")
  end,
  function() printHeader("", 2) end,
  function() printHeader("P-F - Oblivion in STANDARD compound (Purple)", 2) end,
  function() rollCancel("Purple") end,
  function()
    setHunger("Purple", 1)
    setHumanityStains("Purple", 2)
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollTest("Purple", 2, C.RollType.STANDARD, "E2E P-F compound", 0)
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Left-click Normal bag 2 times, Oblivion-Rouse bag 2 times; Roll and wait for settle", 3)
  end
})
```

```lua
U.RunSequence({
  function()
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
  end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end
})
```
