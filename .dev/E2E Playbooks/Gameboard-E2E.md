# Gameboard E2E

```lua
U.RunSequence({
  function()
    printHeader("Gameboard E2E: SUITE 0 - Prereq and reset", 1)
  end,
  function()
    printHeader("0.1 - Harness prerequisites", 2)
  end,
  function()
    if rollE2eSeatPrep then rollE2eSeatPrep("Black") end
    gbE2ePrereqCheck()
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("0.2 - Reset baseline", 2)
  end,
  function()
    gbE2eReset()
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end
})
```

```lua
U.RunSequence({
  function()
    printHeader("Gameboard E2E: SUITE A - Smoke apply and scene gate", 1)
  end,
  function()
    printHeader("A1 - Automated control-board smoke", 2)
  end,
  function()
    gbE2eRunSmoke()
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("A2 - Scene Apply gate", 2)
  end,
  function()
    M.setCamera("ALL", "wide")
    printHeader("[HUMAN] Open Storyteller Scenes, apply the Gameboard fixture row, then wait 12 seconds", 3)
  end
})
```

```lua
U.RunSequence({
  function()
    printHeader("A3 - Verify scene Apply gate", 2)
  end,
  function()
    gbE2eContinue()
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end
})
```

```lua
U.RunSequence({
  function()
    printHeader("Gameboard E2E: SUITE B - Full reconcile suites", 1)
  end,
  function()
    printHeader("B1 - Automated full gameboard checks", 2)
  end,
  function()
    gbE2eRunFull()
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end
})
```

```lua
U.RunSequence({
  function()
    printHeader("Gameboard E2E: SUITE C - PC control tokens", 1)
  end,
  function()
    printHeader("C1 - Seat-row token mirror", 2)
  end,
  function()
    gbE2eVerifyPcTokens()
  end,
  function()
    printHeader("", 2)
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("")
  end
})
```
