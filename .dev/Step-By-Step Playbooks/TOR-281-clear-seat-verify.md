# Clear stage → return NPC to seat _(TOR-281)_

Verify TOR-281: when you clear NPC figurines from the stage and those NPCs still occupy table seats, they should return to their chair at the table. If the NPC was lit on stage, their seat should become active again; if they were dark on stage, the seat should stay inactive. If the seat was already active before Clear, it should stay active. Seat on/off changes you make during play should also be saved into the scene library so they survive when you re-apply that scene later.

**Linear:** [TOR-281 — Stage Clear seat activation + library persistence](https://linear.app/eunomiac-dev/issue/TOR-281/npc-stage-clear-seat-activation-rules-live-scene-library-seat)
**Background:** [Storyteller Gameboard Control](../NPC%20Object%20Spawning%20%26%20Spotlighting/Storyteller%20Gameboard%20Control.md) · [Scene Constructor Overview](../Scene%20Constructor/Scene%20Constructor%20Overview.md)
**Automated harness (optional deep pass):** [Gameboard-E2E.md](../E2E%20Playbooks/Gameboard-E2E.md)

## What this playbook checks

1. **Automated Clear rules** — Lua simulates Clear with different seat and stage-light combinations and checks the seat ends up active or inactive as expected.
2. **Real Clear button** — you click Clear on the control board twice (with the five-second confirm); Lua polls until placements clear and the seat activates.
3. **Scene library persistence** — you toggle an NPC seat off in the Scenes panel, then re-apply the scene; the seat should still be off, not revert to how the scene was originally authored.

## Prerequisites (human — keep short)

- **Save & Play** — only if repo Lua changed since last load (includes `ensureSceneLibraryStub` helper).
- **Host** connected (solo is fine).

Everything else — Black seat, Table A, NPC tokens, scene library stub — is automated in **Code Block 1**.

Test constants (shared via `_G.TOR281`):

| What | Value |
| --- | --- |
| Test NPC | `myleneHamelin` |
| Test seat | `NPC1` |
| Stage placement on board | `u=0.18`, `v=0.72` |
| Scene library slot | index **3** (`scenes_lib_slot_03` in the Scenes panel UI) |
| Stub scene key | `tor281_verify` |

## Run order

**Step 1.** **Save & Play** — only if repo Lua changed since last load.

**Step 2.** Execute Lua Code — **Code Block 1** (full verification). Watch the console for `▶▶▶ HUMAN ▶▶▶` cues — perform each action before the sequence continues:

1. On **CONTROL_BOARD** toolbar: click **Clear** once, wait five seconds, click **Clear** again to confirm.
2. Open **Storyteller Scenes** panel → deactivate **NPC1** seat (toggle off) → close panel.
3. Open **Storyteller Scenes** panel → **Apply** library row `scenes_lib_slot_03` → wait for blindfold/settle (~12 seconds; sequence waits automatically).

**Step 3.** When the sequence prints **Verification complete**, you are done.

---

## Code Block 1 — Full TOR-281 verification

One `U.RunSequence` with inter-step waits: human gates print `▶▶▶ HUMAN ▶▶▶` and **return** a poll or delay; asserts run in the following step(s) without a separate paste.

```lua
local function tor281Fixture()
  local F = _G.TOR281
  if type(F) ~= "table" then
    error("[FAIL] _G.TOR281 missing — paste the full Code Block 1 from the playbook")
  end
  return F
end

local function tor281AssertPresence(F, want, label)
  local got = NPCS.resolveSeatNarrativePresence(F.seat)
  if got ~= want then
    error("[H281 FAIL] " .. label .. " — expected isPresent=" .. tostring(want) .. " got " .. tostring(got))
  end
  print("PASS — " .. label)
end

local function tor281AssignSeat(F, isPresent)
  local seatSlots = S.getStateVal("sessionScene", "seatSlots") or {}
  seatSlots[F.seat] = {
    characterKey = F.npcA,
    slotEmpty = false,
    isPresent = isPresent == true,
  }
  S.setStateVal(seatSlots, "sessionScene", "seatSlots")
  S.setStateVal(F.npcA, "seatLayout", "occupiedNPCSlots", F.seat)
  S.validateState()
end

local function tor281SetPlacement(F, npcLightMode)
  S.setStateVal({
    [F.npcA] = { u = F.u, v = F.v, npcLightMode = npcLightMode },
  }, "sessionScene", "npcWorld", "placements")
  S.validateState()
end

local function tor281ClearPlacementsAndSeats(F)
  S.setStateVal({}, "sessionScene", "npcWorld", "placements")
  for _, sk in ipairs(C.NPCSeats or {}) do
    S.setStateVal(false, "seatLayout", "occupiedNPCSlots", sk)
  end
  S.setStateVal({}, "sessionScene", "seatSlots")
  S.validateState()
end

local function tor281ResolveSceneKey(F)
  local key = F.sceneKey
  if type(key) ~= "string" or key == "" then
    error("[FAIL] TOR281.sceneKey missing — re-run from session setup step")
  end
  return key
end

U.RunSequence({
  function()
    printHeader("TOR-281: Session setup", 1)
  end,
  function()
    _G.TOR281 = {
      tableKey = "Table A",
      sceneSlotIndex = 3,
      sceneKey = "tor281_verify",
      sceneSlotUi = "scenes_lib_slot_03",
      npcA = "myleneHamelin",
      seat = "NPC1",
      u = 0.18,
      v = 0.72,
    }
    print("PASS — TOR281 fixture registered")
  end,
  function()
    if #(Player.getPlayers() or {}) < 1 then
      error("[Setup FAIL] Host not connected")
    end
    rollE2eSeatPrep("Black")
    DEBUG.syncTableSimplified(_G.TOR281.tableKey)
    print("PASS — seat + table")
  end,
  function()
    local F = tor281Fixture()
    local stubFn = type(DEBUG) == "table" and DEBUG.ensureSceneLibraryStub or ensureSceneLibraryStub
    if type(stubFn) ~= "function" then
      error("[Setup FAIL] DEBUG.ensureSceneLibraryStub missing — Save & Play after pulling latest repo Lua")
    end
    F.sceneKey = stubFn(F.sceneSlotIndex, F.sceneKey, {
      title = "TOR-281 verify",
      tableKey = F.tableKey,
      overwrite = true,
      placements = {
        [F.npcA] = { u = F.u, v = F.v, npcLightMode = "STANDARD" },
      },
    })
    print("PASS — scene library stub")
  end,
  function()
    DEBUG.spawnNpcControlBoardTokens({ destroyExisting = false })
    gbE2eReset()
    print("PASS — tokens + gameboard reset")
  end,
  function()
    printHeader("TOR-281: Verify ready", 1)
  end,
  function()
    local F = tor281Fixture()
    if not U.isStorytellerSteamPlayer("Black") then
      error("[Verify FAIL] Host not on Black after rollE2eSeatPrep")
    end
    if S.getStateVal("seatLayout", "currentTableKey") ~= F.tableKey then
      error("[Verify FAIL] table key not " .. F.tableKey)
    end
    if not gbE2ePrereqCheck() then
      error("[Verify FAIL] gbE2ePrereqCheck — see console [gbConfirm] FAIL lines")
    end
    print("PASS — prerequisites satisfied")
  end,

  function()
    printHeader("PHASE 1 — Automated Clear seat rules", 1)
  end,
  function()
    gbE2eReset()
  end,
  function()
    printHeader("PHASE 1.2 — Disabled seat, lit on stage: should activate on Clear", 2)
  end,
  function()
    local F = tor281Fixture()
    tor281ClearPlacementsAndSeats(F)
    tor281AssignSeat(F, false)
    tor281SetPlacement(F, "STANDARD")
    GlobalGameboardClear({})
    tor281AssertPresence(F, true, "H281a disabled+STANDARD clears to active")
  end,
  function()
    printHeader("PHASE 1.3 — Disabled seat, dark on stage: should stay inactive on Clear", 2)
  end,
  function()
    local F = tor281Fixture()
    tor281ClearPlacementsAndSeats(F)
    tor281AssignSeat(F, false)
    tor281SetPlacement(F, "OFF")
    GlobalGameboardClear({})
    tor281AssertPresence(F, false, "H281b disabled+OFF clears to inactive")
  end,
  function()
    printHeader("PHASE 1.4 — Already-active seat: should stay active on Clear", 2)
  end,
  function()
    local F = tor281Fixture()
    tor281ClearPlacementsAndSeats(F)
    tor281AssignSeat(F, true)
    tor281SetPlacement(F, "OFF")
    GlobalGameboardClear({})
    tor281AssertPresence(F, true, "H281c enabled+OFF clears to still active")
  end,
  function()
    printHeader("PHASE 1.5 — Seat toggle should copy into scene library row", 2)
  end,
  function()
    local F = tor281Fixture()
    local sceneKey = tor281ResolveSceneKey(F)
    tor281ClearPlacementsAndSeats(F)
    tor281AssignSeat(F, true)
    S.setStateVal(true, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
    S.setStateVal(sceneKey, "sceneLibrary", "lastAppliedKey")
    NPCS.setNpcSeatNarrativePresence(F.seat, false)
    local libRow = S.getStateVal("sceneLibrary", "scenes", sceneKey, "sessionScene", "seatSlots", F.seat)
    if type(libRow) ~= "table" or libRow.isPresent ~= false then
      error("[H281 FAIL] H281d library seatSlots.NPC1.isPresent should mirror false")
    end
    print("PASS — H281d library mirror wrote isPresent=false")
    S.setStateVal(false, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
  end,

  function()
    printHeader("PHASE 2 — Real Clear button", 1)
  end,
  function()
    printHeader("PHASE 2.1 — NPC on stage, table seat off, stage light on", 2)
  end,
  function()
    local F = tor281Fixture()
    gbE2eReset()
    local seatSlots = {}
    seatSlots[F.seat] = { characterKey = F.npcA, slotEmpty = false, isPresent = false }
    S.setStateVal(seatSlots, "sessionScene", "seatSlots")
    S.setStateVal(F.npcA, "seatLayout", "occupiedNPCSlots", F.seat)
    S.setStateVal({
      [F.npcA] = { u = F.u, v = F.v, npcLightMode = "STANDARD" },
    }, "sessionScene", "npcWorld", "placements")
    Sync.npcs({ force = true, reason = "tor281_manual_clear_setup" })
    if NPCS.resolveSeatNarrativePresence(F.seat) ~= false then
      error("[B.1 FAIL] setup — NPC1 should be disabled before manual Clear")
    end
    print("PASS — setup: disabled homeland + STANDARD stage placement")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ On CONTROL_BOARD toolbar: click Clear once, wait five seconds, click Clear again to confirm.")
    return function()
      local F = tor281Fixture()
      local placements = S.getStateVal("sessionScene", "npcWorld", "placements") or {}
      if next(placements) ~= nil then
        return false
      end
      return NPCS.resolveSeatNarrativePresence(F.seat) == true
    end
  end,
  function()
    printHeader("PHASE 2.2 — Check seat activated after Clear", 2)
  end,
  function()
    local F = tor281Fixture()
    local placements = S.getStateVal("sessionScene", "npcWorld", "placements") or {}
    if next(placements) ~= nil then
      error("[B.2 FAIL] placements should be empty after Clear")
    end
    print("PASS — placements empty after Clear")
    if NPCS.resolveSeatNarrativePresence(F.seat) ~= true then
      error("[B.2 FAIL] NPC1 seat should be active after Clear (visible stage)")
    end
    print("PASS — NPC1 seat active after Clear")
    local occupied = S.getStateVal("seatLayout", "occupiedNPCSlots", F.seat)
    if occupied ~= F.npcA then
      error("[B.2 FAIL] homeland seat assignment lost — expected " .. F.npcA .. " got " .. tostring(occupied))
    end
    print("PASS — homeland seat assignment retained")
  end,

  function()
    printHeader("PHASE 3 — Scene library persistence", 1)
  end,
  function()
    printHeader("PHASE 3.1 — Connect live table to scene library row", 2)
  end,
  function()
    local F = tor281Fixture()
    local sceneKey = tor281ResolveSceneKey(F)
    S.setStateVal(true, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
    S.setStateVal(sceneKey, "sceneLibrary", "lastAppliedKey")
    S.setStateVal(sceneKey, "sceneLibrary", "activeKey")
    local seatSlots = S.getStateVal("sessionScene", "seatSlots") or {}
    seatSlots[F.seat] = { characterKey = F.npcA, slotEmpty = false, isPresent = true }
    S.setStateVal(seatSlots, "sessionScene", "seatSlots")
    S.setStateVal(F.npcA, "seatLayout", "occupiedNPCSlots", F.seat)
    S.setStateVal({}, "sessionScene", "npcWorld", "placements")
    Sync.npcs({ force = true, reason = "tor281_library_setup" })
    print("PASS — linked scene " .. sceneKey .. " with NPC1 active at table")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Open Storyteller Scenes panel → deactivate NPC1 seat (toggle off) → close panel.")
    return function()
      local F = tor281Fixture()
      return NPCS.resolveSeatNarrativePresence(F.seat) == false
    end
  end,
  function()
    printHeader("PHASE 3.2 — Check live game and library both show seat off", 2)
  end,
  function()
    local F = tor281Fixture()
    local sceneKey = tor281ResolveSceneKey(F)
    if NPCS.resolveSeatNarrativePresence(F.seat) ~= false then
      error("[C.2 FAIL] live " .. F.seat .. " seat should be deactivated after Scenes toggle")
    end
    print("PASS — live " .. F.seat .. " seat deactivated")
    local libRow = S.getStateVal("sceneLibrary", "scenes", sceneKey, "sessionScene", "seatSlots", F.seat)
    if type(libRow) ~= "table" or libRow.isPresent ~= false then
      error("[C.2 FAIL] library seatSlots.NPC1.isPresent should mirror false")
    end
    print("PASS — library row mirrored isPresent=false")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Open Storyteller Scenes panel → Apply library row scenes_lib_slot_03 → wait for blindfold/settle.")
    return 12
  end,
  function()
    printHeader("PHASE 3.3 — Check seat still off after re-Apply", 2)
  end,
  function()
    local F = tor281Fixture()
    if NPCS.resolveSeatNarrativePresence(F.seat) ~= false then
      error("[C.3 FAIL] " .. F.seat .. " seat should remain deactivated after re-Apply (as left during play)")
    end
    print("PASS — " .. F.seat .. " seat still deactivated after re-Apply")
  end,
  function()
    local F = tor281Fixture()
    local sceneKey = tor281ResolveSceneKey(F)
    S.setStateVal(false, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
    print("PASS — receivesLiveWrites cleared")
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Verification complete. No further action.")
  end,
}, 120)
```
