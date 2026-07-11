# Toronto Rising — testing guide

## Agent Routing

Read this when:
- running or writing TTS verification
- changing DEBUG console helpers, E2E playbooks, or `RunTest`

Source of truth:
- `core/debug.ttslua`
- `.dev/E2E Playbooks/`
- `.dev/Step-By-Step Playbooks/`

Verification:
- `npm run e2e-playbook:generate:test`
- `npm run e2e-playbook:generate`
- Save & Play before in-TTS verification

Status: current workflow index; verify specific playbook claims against code.

Manual verification lives in **[E2E Playbooks](E2E%20Playbooks/README.md)** (TOR-141). This file indexes **remaining** console helpers in [`core/debug.ttslua`](../core/debug.ttslua).

## Quick start

1. Load mod → **Save & Play** (bundled Lua must match repo). If you see **`attempt to call a nil value`** right after Lua changes, check [`docs/solutions/lua-local-function-order.md`](../docs/solutions/lua-local-function-order.md) first (local defined below caller).
2. You are table **Host** (solo is fine — only one client). Seat **Black** for Scenes/DEBUG/ST; for Dice, use `rollTest` and change seat to the target color when bag/camera steps require it (no TTS View command).
3. `lua debugHelp()` — list current commands.
4. Run a playbook: [Scenes-E2E](E2E%20Playbooks/Scenes-E2E.md) (+ [Scenes-E2E-Guide](E2E%20Playbooks/Scenes-E2E-Guide.md)), [Dice-E2E](E2E%20Playbooks/Dice-E2E.md) (+ [Dice-E2E-Guide](E2E%20Playbooks/Dice-E2E-Guide.md)), or [Gameboard-E2E](E2E%20Playbooks/Gameboard-E2E.md). Dice and Scenes steps are deterministic; their guides carry prerequisites and sign-off.

## Step-by-step playbooks (preferred for new verification)

For **new** bug repro, feature sign-off, and agent-generated runbooks, use the Step-by-step methodology:

- **Index:** [Step-By-Step Playbooks/README.md](Step-By-Step%20Playbooks/README.md)
- **Template:** [Step-By-Step Playbooks/.Step-By-Step Template.md](Step-By-Step%20Playbooks/.Step-By-Step%20Template.md)
- **Agent skill:** [`.cursor/skills/step-by-step-guidance/SKILL.md`](../.cursor/skills/step-by-step-guidance/SKILL.md)

Human gates use `print("   ▶▶▶ HUMAN ▶▶▶ …")`. **Save & Play** is required only when repo Lua changed — not for doc-only edits.

E2E playbooks still use `printHeader("[HUMAN] …", 3)` for `RunTest` compatibility until the full **TOR-141** migration to Step-by-step `▶▶▶ HUMAN ▶▶▶` cues.

## E2E playbooks (primary)

| Playbook | When to run |
| --- | --- |
| [Scenes-E2E](E2E%20Playbooks/Scenes-E2E.md) + [Guide](E2E%20Playbooks/Scenes-E2E-Guide.md) | After scene/library/clock/map changes — smoke ~35 min (0–D), full ~100 min (location, present day, RT ticker, pending rows, seats, map pins E–M) |
| [Dice-E2E](E2E%20Playbooks/Dice-E2E.md) | After roll pipeline changes — smoke ~30 min (A–E), full ~90 min (G–P: Take Half, WP, compound rouse, bags, baton, Blood Surge, Werewolf, Oblivion corners) |
| [Gameboard-E2E](E2E%20Playbooks/Gameboard-E2E.md) | After gameboard Apply/Clear, token mirror, or NPC stage reconcile — smoke ~25 min + scene Apply gate; full ~60 min |

## E2E console output conventions

Manual playbooks use **`U.RunSequence`** + **`printHeader`** so TTS console output stays ordered and scannable. **Dice-E2E.md** is the canonical example; new or revised playbooks should follow the same pattern.

### Playbook file split

| File | Contents |
| --- | --- |
| `*-E2E.md` | Title line + **only** fenced `U.RunSequence` Lua blocks — no markdown suite/step headers, no inline **Human:** / **Pass if:** prose |
| `*-E2E-Guide.md` (when needed) | How to run blocks, helpers, prerequisites, deterministic rules, sign-off, known failures |

Keep reference tables and long prose out of the lean test file. Suite and step names live in **`printHeader`** banners inside Lua (levels 1 and 2), not as markdown headings.

### Streamlined block workflow

**Dice-E2E.md** and **Scenes-E2E.md** are references for the collapsed format. Steps are also available as generated modules (`lib/e2e_playbook_dice.ttslua`, `lib/e2e_playbook_scenes.ttslua`, built from markdown) and runnable via **`RunTest`** in the TTS console:

```lua
lua RunTest("Dice")        -- [RunTest] Initialized 'Dice' (next RunTest runs step 1)
lua RunTest("Dice", 8)     -- arm at step 8/56; RunTest("Dice", "H") at suite H
lua RunTest("Scenes")      -- arm Scenes E2E; RunTest("Scenes", "F") jumps to suite F
lua RunTest()              -- [RunTest] <Campaign> step N/total, then U.RunSequence (repeat after each [HUMAN] gate)
```

Re-arming with `RunTest("<Campaign>")` resets index and cancels any in-flight step. Step index is 1-based; suite second arg uses top-level ids (`0`, `A`–`P`, `E2` when present). **Save & Play** after updating harness code so playbook step tables are fresh.

**Stop rule:** After a step prints a **level-1** `printHeader` (suite banner: line begins with ten `*`), `RunTest` arms FAIL-abort for that step only. While armed, any console line containing the case-sensitive substring `FAIL` (e.g. `[rollConfirm] FAIL`) cancels the in-flight `U.RunSequence` and prints `[RunTest] Stopped at step N/total: FAIL detected in output`. Lines before the suite banner (or mid-playbook `RunTest("<Campaign>", N)` jumps without a fresh suite header) do **not** abort — prerequisite checks may FAIL without stopping the harness. Re-arm at the same step after fixing.

Regenerate after editing `Dice-E2E.md` or `Scenes-E2E.md`: `npm run e2e-playbook:generate` (included in `npm run build`), then **Save & Play**.

Manual paste workflow (same blocks):

1. **Paste one `lua` block** into TTS console / External Editor and execute.
2. When a block ends with **`printHeader("[HUMAN] …", 3)`**, perform that action in TTS before running the **next** block.
3. **Merge** automated setup, spawns, and `rollConfirm` / `rollE2eExpectBroadcast` into the same block when no human action sits between them.
4. **Split** only on human gates — **one `[HUMAN]` cue per block** (two level-3 headers in one `U.RunSequence` print back-to-back and skip the pause).
5. **Last step of each block** — `[HUMAN]` for every block that needs tester input; automated-only blocks may end with assertions then suite/step close (`printHeader("", 2)` / `printHeader("", 1)` + `print("")`). The **final block** of the playbook closes the run only (`printHeader("", 1)` + `print("")`), with no `[HUMAN]`.

### `printHeader(text, level)`

Implemented in [`core/debug.ttslua`](../core/debug.ttslua) as `DEBUG.printHeader`; global alias `printHeader`.

| Level | Char | Use |
| --- | --- | --- |
| **1** | `*` | **Suite** open (`Dice E2E: SUITE A - …`) and **close** (`printHeader("", 1)`) |
| **2** | `=` | **Step/substep** open (`Step A1 - …`, `K2a - …`) and **close** (`printHeader("", 2)`) when that step ends |
| **3** | `-` | **Human instructions** (`[HUMAN] Left-click Normal bag 5 times`) — **do not** close with a later `printHeader` |

**Layout:** When the label fits in 100 chars: `10×padChar` + `" " + text + " "` + `padChar` fill. Empty `text` (`printHeader("", level)`) prints a pad-only line (suite/step “close” banner). When the label is too long for that layout, the line is `10×padChar` + `" "` + **full text** (no trailing pad).

After each **suite** ends (level-1 close), add `print("")` in its own `U.RunSequence` step for a blank line in the log.

### `U.RunSequence` ordering rules

1. **Wrap every playbook Lua block** in `U.RunSequence({ … })` — no bare top-level `rollTest` / `rollConfirm` in the markdown.
2. **Isolate prints** — each `printHeader` and each `print` call lives in its **own** `function() … end` step so coroutine sequencing preserves console order.
3. **Group logic** — setup (`rollTest`, `rollCancelAll`, state seeding) and assertions (`rollConfirm`, `rollConfirmTracker`) may share a step when no human action sits between them.
4. **Split on human gates** — when the tester must act between setup and assertion, end one `U.RunSequence` with a level-3 `[HUMAN]` header (+ `M.setCamera` when needed), then start a **new** block for post-action `rollConfirm` / `rollE2eExpectBroadcast`. **Never** put two level-3 `[HUMAN]` steps in the same block.
5. **Function references** — pass harness helpers directly when they are single-call steps, e.g. `rollCancelAll` (no parentheses) as a sequence entry.
6. **Suite close** — last step(s) of each suite: `printHeader("", 1)` then `print("")`. Mid-suite steps close with `printHeader("", 2)` only when that step/substep is finished (not between substeps that continue the same suite section).

### Camera before human interaction

When a step requires bag clicks, tray dice, or roll-panel UI, include **`M.setCamera("ALL", "roll<Color>")`** in the same sequence step as the level-3 `[HUMAN]` header (e.g. `rollBrown`, `rollPurple`, `rollBlack`).

### Minimal template (copy for new suites)

```lua
U.RunSequence({
  function() printHeader("<Playbook>: SUITE X - Title", 1) end,
  function() printHeader("Step X1 - Short name", 2) end,
  rollCancelAll,
  function()
    -- setup + assertions when no human gate between
    rollTest("Brown", 3, C.RollType.STANDARD, "E2E X1", 0)
    rollConfirm("Brown", { phase = "preRoll" })
  end,
  function()
    M.setCamera("ALL", "rollBrown")
    printHeader("[HUMAN] Describe exact clicks/actions", 3)
  end
})
```

```lua
U.RunSequence({
  function() rollConfirm("Brown", { /* post-human expected */ }) end,
  function() printHeader("", 2) end,
  function() printHeader("", 1) end,
  function() print("") end
})
```

Pass criteria and sign-off live in the companion **Guide** (e.g. [Dice-E2E-Guide.md](E2E%20Playbooks/Dice-E2E-Guide.md) § Sign-off), not in the lean playbook file.

See [Dice-E2E-Guide.md](E2E%20Playbooks/Dice-E2E-Guide.md) § Running the playbook + § Console output for Dice-specific notes and [E2E Playbooks README](E2E%20Playbooks/README.md) § Conventions.

## Console helpers (inspection)

```lua
lua debugHelp()
lua showState()
lua showScene()
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
lua rollE2eSettlePresetCheck("Brown", { rouse = { 4 } }, { skipSpawn = true })
lua rollStConfirm({ liveSlotIndex = 1 })
lua rollStConfirm({ liveSlotIndexAbsent = true })
lua setHumanityStains("Purple", 2)
lua setWillpowerSuperficial("Brown", 3)
lua rollState("Brown")         -- ad-hoc inspection only (not a pass/fail gate)
lua rollCancel("Brown")      -- returns Host to Black; Black also clears ST slots
lua rollCancelAll()
lua printHeader("Suite 0: Cleanup", 1)   -- 100-char E2E banner (*, =, - by level; spaces around text)
lua printHeader("", 1)                     -- pad-only separator line
lua rollE2eExpectBroadcast({ color = "Brown", visible = true, resultClass = "Win", successes = 1 })  -- Win matches panel WIN
lua rollForceConfirm("Brown")   -- automation only; human E2E steps use panel Confirm
lua rollStTest("E2E", C.RollType.STANDARD)
lua rollStSlots()
lua rollE2eApplyConditions("Brown", { "bestialNull" })
lua rollE2eClearConditions("Brown")
```

See [Dice-E2E-Guide.md](E2E%20Playbooks/Dice-E2E-Guide.md) § Solo Host for the full harness table.

## Gameboard E2E (solo Host)

Macros assert state + world probes; scene library Apply uses a **human gate** (same 12s settle as Scenes-E2E).

```lua
lua gbE2ePrereqCheck()
lua gbE2eReset()
lua gbE2eRunSmoke()      -- then human scene Apply + gbE2eContinue()
lua gbE2eRunFull()
lua gbE2eRunDeferred()   -- expected FAIL until TOR-172/173/175/174
lua gbE2eVerifyPcTokens() -- PC seat-row tokens vs seatSlots (TOR-152 / TOR-236; Scenes-E2E D2)
lua gbConfirm("probe", { placementRow = { characterKey = "myleneHamelin", row = { u = 0.18 } } })
lua DEBUG.dumpNpcPlacements()
lua GlobalGameboardApply()
lua GlobalGameboardClear()
```

See [Gameboard-E2E.md](E2E%20Playbooks/Gameboard-E2E.md) for fixture constants and failure tables.

## Quick setters (prefer Scenes / Sound panels for narrative)

```lua
lua setHunger("Red", 3)
lua soundscapeMusic("main")
lua soundscapeWeather("lightRain", true)
lua soundscapeLocation("sewers")
lua soundscapeStopAll()
```

Use the Storyteller **Sound** panel or Scenes **Apply location** to audition catalog tracks during play.

## File logging

See [DEBUG_FILE_LOGGING.md](DEBUG_FILE_LOGGING.md). Examples:

```lua
lua logStateToFile()
lua logNpcPlacementIntentToFile()
lua logAllToFiles()
```

## DEBUG panel (in-game)

Storyteller **== DEBUG ==** column (no automated test suites):

- Print State, Sync All (force)
- **Debug Camera**, **Debug Light** (+ GUID field)

Automated test-suite buttons are not part of the current DEBUG panel.

## MCP / agents

- [TTS_MCP.md](TTS_MCP.md) — `tts_execute_lua`, `TR_AGENT_V1` lines, timeouts
- Prefer `U.mcpEmitResult` / `U.emitForAgent` for structured execute output
