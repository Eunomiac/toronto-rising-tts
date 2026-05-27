# Toronto Rising — testing guide

Manual verification lives in **[E2E Playbooks](E2E%20Playbooks/README.md)** (TOR-141). This file indexes **remaining** console helpers in [`core/debug.ttslua`](../core/debug.ttslua).

## Quick start

1. Load mod → **Save & Play** (bundled Lua must match repo).
2. You are table **Host** (solo is fine — only one client). Seat **Black** for Scenes/DEBUG/ST; for Dice, use `rollTest` and change seat to the target color when bag/camera steps require it (no TTS View command).
3. `lua debugHelp()` — list current commands.
4. Run a playbook: [Scenes-E2E](E2E%20Playbooks/Scenes-E2E.md) or [Dice-E2E](E2E%20Playbooks/Dice-E2E.md). Dice steps are **deterministic** (exact click counts and `rollConfirm` literals — see Dice-E2E § Deterministic test conventions).

## E2E playbooks (primary)

| Playbook | When to run |
| --- | --- |
| [Scenes-E2E](E2E%20Playbooks/Scenes-E2E.md) | After scene/library/clock/map changes — smoke ~35 min (A–E), full ~100 min (present day, RT ticker, seat absence + map pins F–N) |
| [Dice-E2E](E2E%20Playbooks/Dice-E2E.md) | After roll pipeline changes — smoke ~30 min (A–E), full ~90 min (G–P: Take Half, WP, compound rouse, bags, baton, Blood Surge, Werewolf, Oblivion corners) |

## Console helpers (inspection)

```lua
lua debugHelp()
lua showState()
lua showScene()
lua showZones()
lua inspectSoundscapeAudio()
lua DEBUG.dumpConditions("Brown")
lua DEBUG.dumpRollPolicy("Brown")
```

`showScene()` prints `sessionScene` + `sceneLibrary` keys (not legacy preset names).

## Dice debug (solo Host — no second client)

`rollTest` arms rolls using persisted character ids; you do not need another player seated.

```lua
lua rollTest("Brown", 3)   -- auto: changeColor + overlay + camera spoof
lua rollTest("Brown", 3, C.RollType.STANDARD, "E2E G2", 2)   -- 5th arg = hunger level
lua rollSetFaces("Brown", { normal = {4, 4}, hunger = {10, 1} })
lua rollConfirm("Brown", { phase = "preRoll", active = { difficulty = 3 } })  -- E2E assertions (PASS/FAIL)
lua rollConfirmTracker("Brown", { hunger = 2, stains = 1 })
lua rollE2eSettlePresetCheck("Brown", { rouse = { 4 } })
lua rollStConfirm({ liveSlotIndex = 1 })
lua rollStConfirm({ liveSlotIndexAbsent = true })
lua setHumanityStains("Purple", 2)
lua setWillpowerSuperficial("Brown", 3)
lua rollState("Brown")         -- ad-hoc inspection only (not a pass/fail gate)
lua rollCancel("Brown")      -- returns Host to Black; Black also clears ST slots
lua rollCancelAll()
lua rollForceConfirm("Brown")   -- automation only; human E2E steps use panel Confirm
lua rollStTest("E2E", C.RollType.STANDARD)
lua rollStSlots()
lua rollE2eApplyConditions("Brown", { "e2eBestialNull" })
lua rollE2eClearConditions("Brown")
```

See [Dice-E2E.md](E2E%20Playbooks/Dice-E2E.md) § Solo Host for the full harness table.

## Quick setters (prefer Scenes / Sound panels for narrative)

```lua
lua setHunger("Red", 3)
lua soundscapeMusic("main")
lua soundscapeWeather("lightRain", true)
lua soundscapeLocation("sewers")
lua soundscapeStopAll()
```

Use **Debug Soundscape** (Storyteller DEBUG panel) to audition catalog tracks with per-lane volume sliders.

## File logging

See [DEBUG_FILE_LOGGING.md](DEBUG_FILE_LOGGING.md). Examples:

```lua
lua logStateToFile()
lua logNpcPlacementIntentToFile()
lua logAllToFiles()
```

## DEBUG panel (in-game)

Storyteller **== DEBUG ==** column (no automated test suites):

- Print State, Debug Seat Lights, Sync incremental / Sync All (force)
- **Debug Soundscape**, **Debug Camera**, **Debug Light** (+ GUID field)

Legacy **Testing Suites** (Run All Tests, Lighting & Signals, Easing) were removed in TOR-141.

## MCP / agents

- [TTS_MCP.md](TTS_MCP.md) — `tts_execute_lua`, `TR_AGENT_V1` lines, timeouts
- Prefer `U.mcpEmitResult` / `U.emitForAgent` for structured execute output

## Removed (do not document)

Automated suites (`testState`, `testScenes`, `runTests`, `testEasing`, `changeScene`, `testSoundscape`, etc.) were removed as obsolete. Use E2E playbooks instead.
