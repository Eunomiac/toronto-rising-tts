# Stage Clear seat activation + library persistence _(TOR-281)_

Verify **TOR-281 (Stage Clear seat activation + live scene-library seat persistence)**: Clear-from-stage homeland seat rules (disabled + visible stage light → activate; enabled seat unchanged) and `seatSlots.isPresent` write-back into the linked scene library row.

**Linear:** [TOR-281](https://linear.app/eunomiac-dev/issue/TOR-281/npc-stage-clear-seat-activation-rules-live-scene-library-seat)  
**Domain docs:** [Storyteller Gameboard Control](../NPC%20Object%20Spawning%20%26%20Spotlighting/Storyteller%20Gameboard%20Control.md) · [Scene Constructor Overview](../Scene%20Constructor/Scene%20Constructor%20Overview.md) (TOR-250 / TOR-281 homeland rules)  
**Harness reference:** [Gameboard-E2E.md](../E2E%20Playbooks/Gameboard-E2E.md) (H281 probes in `gbE2eRunFull`)

## Prerequisites (defaults)

- **Host** (solo OK), seated **Black** (Storyteller).
- Active table **Table A**.
- Workshop: `CONTROL_BOARD`, `CONTROL_BOARD_PALETTE`, `STAGE_BOARD`, ≥2 `npc_control_token` with fixture GM Notes (`myleneHamelin`, `adrianVarga`).
- Scene library row **`scenes_lib_slot_03`** populated (index 3 in `sceneLibrary.order`).
- **Save & Play** required — repo Lua changed (`5b2a3c7`, `3d49296`).

Constants used below (match `E2E_GB.FIXTURE`):

| Key | Value |
| --- | --- |
| `NPC_A` | `myleneHamelin` |
| `SEAT` | `NPC1` |
| `UV_A` | `u=0.18`, `v=0.72` |
| `SCENE_SLOT_INDEX` | `3` (`scenes_lib_slot_03`) |

## Run order

**Step 1.** **Save & Play** — bundled scripts must include TOR-281 Clear logic + H281 harness.

**Step 2.** Execute Lua Code — Code Block 0 (prerequisites).

**Step 3.** Execute Lua Code — Code Block A.1 (automated H281 state tests + library mirror).

**Step 4.** Execute Lua Code — Code Block B.1 (seed manual Clear scenario: disabled seat, visible stage).

**Step 5.** **On the CONTROL_BOARD toolbar, click Clear once, wait five seconds, click Clear again.**

**Step 6.** Execute Lua Code — Code Block B.2 (post–manual Clear asserts).

**Step 7.** Execute Lua Code — Code Block C.1 (seed scene library link for seat toggle).

**Step 8.** **Open Storyteller Scenes panel → deactivate the NPC1 seat row (toggle off) → close panel.**

**Step 9.** Execute Lua Code — Code Block C.2 (assert live + library mirror after toggle).

**Step 10.** **Open Storyteller Scenes panel → Apply library row `scenes_lib_slot_03` → wait 12 seconds for blindfold/settle.**

**Step 11.** Execute Lua Code — Code Block C.3 (assert deactivated seat restored after re-Apply).

---

## Code Block 0 — Prerequisites

```lua
U.RunSequence({
  function()
    printHeader("TOR-281: Prerequisites", 1)
  end,
  function()
    local lines = {}
    local function check(label, ok, detail)
      local suffix = ok and "PASS" or ("FAIL — " .. tostring(detail))
      table.insert(lines, ">> " .. label .. ": " .. suffix)
      return ok
    end
    local allOk = true
    allOk = check("Host connected (solo OK)", #(Player.getPlayers() or {}) >= 1, "no players") and allOk
    allOk = check("Storyteller seat (Black)", U.isStorytellerSteamPlayer("Black"), "sit in Black") and allOk
    local tableKey = S.getStateVal("seatLayout", "currentTableKey")
    allOk = check("Current table is Table A", tableKey == "Table A", "got " .. tostring(tableKey)) and allOk
    print(table.concat(lines, "\n"))
    if not allOk then
      error("[Prereq FAIL] fix prerequisites before continuing")
    end
  end,
  function()
    printHeader("PHASE 0.2 — Gameboard harness prereq", 1)
  end,
  function()
    if not gbE2ePrereqCheck() then
      error("[Prereq FAIL] gbE2ePrereqCheck — see console [gbConfirm] FAIL lines")
    end
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Run Code Block A.1.")
  end,
})
```

---

## Code Block A.1 — Automated H281 (state-only Clear rules + library mirror)

```lua
local TOR281 = {
  npcA = "myleneHamelin",
  seat = "NPC1",
  u = 0.18,
  v = 0.72,
  sceneIndex = 3,
}

local function tor281AssertPresence(want, label)
  local got = NPCS.resolveSeatNarrativePresence(TOR281.seat)
  if got ~= want then
    error("[H281 FAIL] " .. label .. " — expected isPresent=" .. tostring(want) .. " got " .. tostring(got))
  end
  print("PASS — " .. label)
end

local function tor281AssignSeat(isPresent)
  local seatSlots = S.getStateVal("sessionScene", "seatSlots") or {}
  seatSlots[TOR281.seat] = {
    characterKey = TOR281.npcA,
    slotEmpty = false,
    isPresent = isPresent == true,
  }
  S.setStateVal(seatSlots, "sessionScene", "seatSlots")
  S.setStateVal(TOR281.npcA, "seatLayout", "occupiedNPCSlots", TOR281.seat)
  S.validateState()
end

local function tor281SetPlacement(npcLightMode)
  local placements = {}
  placements[TOR281.npcA] = {
    u = TOR281.u,
    v = TOR281.v,
    npcLightMode = npcLightMode,
  }
  S.setStateVal(placements, "sessionScene", "npcWorld", "placements")
  S.validateState()
end

local function tor281ClearPlacementsAndSeats()
  S.setStateVal({}, "sessionScene", "npcWorld", "placements")
  for _, sk in ipairs(C.NPCSeats or {}) do
    S.setStateVal(false, "seatLayout", "occupiedNPCSlots", sk)
  end
  S.setStateVal({}, "sessionScene", "seatSlots")
  S.validateState()
end

local function tor281ResolveSceneKey()
  local order = S.getStateVal("sceneLibrary", "order") or {}
  local key = order[TOR281.sceneIndex]
  if type(key) ~= "string" or key == "" then
    error("[H281 FAIL] sceneLibrary.order[" .. tostring(TOR281.sceneIndex) .. "] missing (scenes_lib_slot_03)")
  end
  return key
end

U.RunSequence({
  function()
    printHeader("PHASE 1.1 — Reset baseline", 1)
  end,
  function()
    gbE2eReset()
  end,
  function()
    printHeader("PHASE 1.2 — H281a disabled + STANDARD → active on Clear", 1)
  end,
  function()
    tor281ClearPlacementsAndSeats()
    tor281AssignSeat(false)
    tor281SetPlacement("STANDARD")
    GlobalGameboardClear({})
    tor281AssertPresence(true, "H281a disabled+STANDARD clears to active")
  end,
  function()
    printHeader("PHASE 1.3 — H281b disabled + OFF → stay inactive", 1)
  end,
  function()
    tor281ClearPlacementsAndSeats()
    tor281AssignSeat(false)
    tor281SetPlacement("OFF")
    GlobalGameboardClear({})
    tor281AssertPresence(false, "H281b disabled+OFF clears to inactive")
  end,
  function()
    printHeader("PHASE 1.4 — H281c enabled + OFF → stay active", 1)
  end,
  function()
    tor281ClearPlacementsAndSeats()
    tor281AssignSeat(true)
    tor281SetPlacement("OFF")
    GlobalGameboardClear({})
    tor281AssertPresence(true, "H281c enabled+OFF clears to still active")
  end,
  function()
    printHeader("PHASE 1.5 — H281d library seatSlots mirror on presence write", 1)
  end,
  function()
    local sceneKey = tor281ResolveSceneKey()
    tor281ClearPlacementsAndSeats()
    tor281AssignSeat(true)
    S.setStateVal(true, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
    S.setStateVal(sceneKey, "sceneLibrary", "lastAppliedKey")
    NPCS.setNpcSeatNarrativePresence(TOR281.seat, false)
    local libRow = S.getStateVal("sceneLibrary", "scenes", sceneKey, "sessionScene", "seatSlots", TOR281.seat)
    if type(libRow) ~= "table" or libRow.isPresent ~= false then
      error("[H281 FAIL] H281d library seatSlots.NPC1.isPresent should mirror false")
    end
    print("PASS — H281d library mirror wrote isPresent=false")
    S.setStateVal(false, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Run Code Block B.1.")
  end,
})
```

---

## Code Block B.1 — Manual Clear setup (disabled seat, visible stage)

```lua
U.RunSequence({
  function()
    printHeader("PHASE 2.1 — Seed stage-bound NPC with disabled homeland", 1)
  end,
  function()
    gbE2eReset()
    local npcA = "myleneHamelin"
    local seat = "NPC1"
    local seatSlots = {}
    seatSlots[seat] = { characterKey = npcA, slotEmpty = false, isPresent = false }
    S.setStateVal(seatSlots, "sessionScene", "seatSlots")
    S.setStateVal(npcA, "seatLayout", "occupiedNPCSlots", seat)
    S.setStateVal({
      [npcA] = { u = 0.18, v = 0.72, npcLightMode = "STANDARD" },
    }, "sessionScene", "npcWorld", "placements")
    Sync.npcs({ force = true, reason = "tor281_manual_clear_setup" })
    if NPCS.resolveSeatNarrativePresence(seat) ~= false then
      error("[B.1 FAIL] setup — NPC1 should be disabled before manual Clear")
    end
    print("PASS — setup: disabled homeland + STANDARD stage placement")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ On CONTROL_BOARD toolbar: click Clear once, wait five seconds, click Clear again. Then run Code Block B.2.")
  end,
})
```

---

## Code Block B.2 — Post–manual Clear asserts

```lua
U.RunSequence({
  function()
    printHeader("PHASE 2.2 — Post–manual Clear asserts", 1)
  end,
  function()
    local seat = "NPC1"
    local npcA = "myleneHamelin"
    local placements = S.getStateVal("sessionScene", "npcWorld", "placements") or {}
    if next(placements) ~= nil then
      error("[B.2 FAIL] placements should be empty after Clear")
    end
    print("PASS — placements empty after Clear")
    if NPCS.resolveSeatNarrativePresence(seat) ~= true then
      error("[B.2 FAIL] NPC1 seat should be active after Clear (visible stage)")
    end
    print("PASS — NPC1 seat active after Clear")
    local occupied = S.getStateVal("seatLayout", "occupiedNPCSlots", seat)
    if occupied ~= npcA then
      error("[B.2 FAIL] homeland seat assignment lost — expected " .. npcA .. " got " .. tostring(occupied))
    end
    print("PASS — homeland seat assignment retained")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Run Code Block C.1.")
  end,
})
```

---

## Code Block C.1 — Scene library link for seat-toggle persistence

```lua
U.RunSequence({
  function()
    printHeader("PHASE 3.1 — Link live table to library row", 1)
  end,
  function()
    local order = S.getStateVal("sceneLibrary", "order") or {}
    local sceneKey = order[3]
    if type(sceneKey) ~= "string" or sceneKey == "" then
      error("[C.1 FAIL] sceneLibrary.order[3] missing")
    end
    _G.tor281SceneKey = sceneKey
    S.setStateVal(true, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
    S.setStateVal(sceneKey, "sceneLibrary", "lastAppliedKey")
    S.setStateVal(sceneKey, "sceneLibrary", "activeKey")
    local npcA = "myleneHamelin"
    local seat = "NPC1"
    local seatSlots = S.getStateVal("sessionScene", "seatSlots") or {}
    seatSlots[seat] = { characterKey = npcA, slotEmpty = false, isPresent = true }
    S.setStateVal(seatSlots, "sessionScene", "seatSlots")
    S.setStateVal(npcA, "seatLayout", "occupiedNPCSlots", seat)
    S.setStateVal({}, "sessionScene", "npcWorld", "placements")
    Sync.npcs({ force = true, reason = "tor281_library_setup" })
    print("PASS — linked scene " .. sceneKey .. " with NPC1 active at table")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Open Storyteller Scenes panel → deactivate NPC1 seat (toggle off) → close panel. Then run Code Block C.2.")
  end,
})
```

---

## Code Block C.2 — Assert mirror after Scenes panel toggle

```lua
U.RunSequence({
  function()
    printHeader("PHASE 3.2 — Live + library mirror after seat deactivate", 1)
  end,
  function()
    local sceneKey = _G.tor281SceneKey
    if type(sceneKey) ~= "string" or sceneKey == "" then
      error("[C.2 FAIL] missing _G.tor281SceneKey — re-run Code Block C.1")
    end
    if NPCS.resolveSeatNarrativePresence("NPC1") ~= false then
      error("[C.2 FAIL] live NPC1 seat should be deactivated after Scenes toggle")
    end
    print("PASS — live NPC1 seat deactivated")
    local libRow = S.getStateVal("sceneLibrary", "scenes", sceneKey, "sessionScene", "seatSlots", "NPC1")
    if type(libRow) ~= "table" or libRow.isPresent ~= false then
      error("[C.2 FAIL] library seatSlots.NPC1.isPresent should mirror false")
    end
    print("PASS — library row mirrored isPresent=false")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Open Storyteller Scenes panel → Apply library row scenes_lib_slot_03 → wait 12 seconds for blindfold/settle. Then run Code Block C.3.")
  end,
})
```

---

## Code Block C.3 — Assert persistence after re-Apply

```lua
U.RunSequence({
  function()
    printHeader("PHASE 3.3 — Seat presence restored after scene re-Apply", 1)
  end,
  function()
    if NPCS.resolveSeatNarrativePresence("NPC1") ~= false then
      error("[C.3 FAIL] NPC1 seat should remain deactivated after re-Apply (as left during play)")
    end
    print("PASS — NPC1 seat still deactivated after re-Apply")
  end,
  function()
    local sceneKey = _G.tor281SceneKey
    if type(sceneKey) == "string" and sceneKey ~= "" then
      S.setStateVal(false, "sceneLibrary", "scenes", sceneKey, "receivesLiveWrites")
    end
    _G.tor281SceneKey = nil
  end,
  function()
    printHeader("", 1)
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Verification complete. No further action.")
  end,
})
```
