# Join-stress minimal Global XmlUI — control vs treatment _(TOR-439)_

## Agent Routing

Read this when:
- verifying TOR-439 Arm Join XML + staged restore in multiclient
- recording whether post-Loading join timeouts track heavy Global XmlUI / CustomUIAssets / cold pools at connect

Source of truth:
- `ui/Global.join_minimal.xml`
- `core/global_script.ttslua` (`HUD_phaseArmJoinXml`, `HUD_phaseRestoreJoinAssets` / `Hud` / `Emitters` / `Figurines`)
- `core/join_cold_pools.ttslua`
- [Join-Load Inventory](../Multiplayer%20Functionality/Join-Load%20Inventory.md) Experiment #0
- Linear [TOR-439](https://linear.app/eunomiac-dev/issue/TOR-439/players-join-stress-minimal-global-xmlui-spike-armrefresh)

Verification:
- this playbook (Save & Play + Host-alone start + one join client)
- Host-only remount smoke (no joiner): [TOR-439-join-xml-spike-verify-solo.md](TOR-439-join-xml-spike-verify-solo.md)

Prove whether joining into an **armed** Host (minimal Global XmlUI + slim CustomUIAssets + cold preload pools), then restoring in stages, changes post-Loading connection timeouts versus the normal full HUD with Defer triad on.

Fixture seat below: **Purple**. Edit `FIXTURE.joinColor` in Code Block 0 if the joining player’s chronicle seat is a different PC color.

## Save / Load (read once — do not mix into restore)

| When | Action | Purpose |
| --- | --- | --- |
| **Before this experiment** | **Save & Play** once (current TOR-439 Lua), then **File → Load** as multiplayer Host alone | Puts scripts into TTS. Start the control/treatment run from that load. |
| **During control → treatment** | Stay in the same Host session. **No** File Save / File Load / Save & Play mid-run | Arm live → joiner connects → Auto-Seat/Connect → staged restore **1–4**. |
| **Do not** | File Save / Load **after Disarm** or after staged restore | Disarm and buttons **1–4** are in-session restore paths, not save cues. |
| **Separate Host-alone Loading test only** | After Arm, **while still armed**: **File → Save** (not Save & Play) → **File → Load** | Measures Loading N/M with slim CustomUIAssets. Not part of this multiclient control/treatment sequence. Details: [Join-Load Inventory § Armed-save load](../Multiplayer%20Functionality/Join-Load%20Inventory.md#armed-save-load-customuiassets-q1--host-alone). |
| **Host session died** | Reload multiplayer Host alone; Save & Play only if scripts drifted | Recovery; re-run from Code Block 0 / Step 2. |

## Prerequisites (human — keep short)

- **Save & Play** after TOR-439 Lua (includes `lib/ui_global_xml_docs.ttslua`, `core/join_cold_pools.ttslua`).
- **Host** loads the chronicle into a **multiplayer** game and is the **only** connected player (joiner waits until the playbook says to connect).
- Phase is **Intermission** (global blindfold up). If not, Advance until Intermission before Code Block 0.

## What Code Block 0 automates

| Setup | How |
| --- | --- |
| Black / Storyteller | `rollE2eSeatPrep("Black")` |
| Defer triad for join color | `connectionControls.deferSetXml` + `deferAutoSeatByColor` + `deferConnectByColor` |
| Clear join-XML arm | `joinXmlArmed = false` |
| Open Phases chrome | Toolbar body + `HUD_selectStorytellerPanel` → phases |
| PCs row toggles | `PCST.refreshAllRows()` |

## Run order

**Step 1.** **Save & Play**, then load the save as **multiplayer Host alone** (no join client yet). Confirm phase is Intermission.

**Step 2.** Execute Lua Code — Code Block 0 (control prep + verify).

**Step 3.** **On Host: confirm Phases shows Defer setXML on and status text `Join XML: full`.** Leave the Phases panel open for the rest of the run.

**Step 4.** **Have the join client connect now.** Wait until they finish Loading, appear as Grey, **or** connection-timeout. Do not Auto-Seat yet. Record: timeout during Loading Y/N; timeout after table visible Y/N; survived to Grey Y/N.

**Step 5.** Execute Lua Code — Code Block A (prints control checklist; asserts still unarmed).

**Step 6.** **If the joiner is Grey: on PCs panel for the fixture color, click Auto-Seat, then Connect.** Wait ~10s. Do **not** press restore **1–4** and do **not** click Disarm. Record: timeout after Auto-Seat/Connect Y/N.

**Step 7.** **Kick or disconnect the join client.** Host alone again. If the Host session died, reload multiplayer Host alone (Save & Play only if scripts drifted), then re-run from Step 2 before treatment.

**Step 8.** Execute Lua Code — Code Block B (treatment prep: keep defer triad; ensure unarmed).

**Step 9.** **On Phases: click Arm Join XML once.** Wait for console `[JoinXmlAssets] setCustomAssets slim`, `[JoinColdPools]` cold, and `[SeatUI] Full UI resync sent (Arm Join XML)`. Host HUD should shrink to slim join chrome (Phases still usable; restore buttons **1–4** live there).

**Step 10.** Execute Lua Code — Code Block C (assert armed + Defer setXML on).

**Step 11.** **Have the same join client connect again.** Wait for Loading / Grey / timeout. Record: survive join on armed Host Y/N (same timeout questions as Step 4).

**Step 12.** **If Grey: Auto-Seat then Connect for the fixture color.** Wait ~10s. Record timeout Y/N.

**Step 13.** **On Phases: press restore `1 Assets` once.** Wait for console CustomUIAssets restored. Record: joiner/Host survive step 1 Y/N.

**Step 14.** **Press restore `2 HUD` once.** Wait for `[SeatUI] Full UI resync sent`. Status should clear `joinXmlArmed` / move toward `hud:full`. Record: survive step 2 Y/N; Host full HUD Y/N.

**Step 15.** Execute Lua Code — Code Block D (assert disarmed after Assets+HUD).

**Step 16.** **Press restore `3 Emitters` once.** Wait for emitters restored. Record: survive step 3 Y/N.

**Step 17.** **Press restore `4 Figurines` once.** Wait for figurines/lights restored / pools warm. Record: survive step 4 Y/N.

**Step 18.** Execute Lua Code — Code Block E (assert pools warm; dump results reminder).

---

## Code Block 0 — Control prep + verify

```lua
FIXTURE = {
  joinColor = "Purple", -- chronicle seat of the joining player
}

U.chain({
  function()
    printHeader("TOR-439: Control prep", 1)
  end,
  function()
    if #(Player.getPlayers() or {}) < 1 then
      error("[Setup FAIL] Host not connected")
    end
    if #(Player.getPlayers() or {}) > 1 then
      error("[Setup FAIL] More than one player connected — disconnect joiners first (Host alone)")
    end
    rollE2eSeatPrep("Black")
    local phase = S.getStateVal("currentPhase")
    if phase ~= C.Phases.INTERMISSION then
      error("[Setup FAIL] currentPhase=" .. tostring(phase) .. " — Advance to Intermission, then re-paste Code Block 0")
    end
    local color = FIXTURE.joinColor
    if not U.isIn(color, C.PlayerColors) then
      error("[Setup FAIL] FIXTURE.joinColor invalid: " .. tostring(color))
    end
    S.setStateVal(true, "connectionControls", "deferSetXml")
    S.setStateVal(true, "connectionControls", "deferAutoSeatByColor", color)
    S.setStateVal(true, "connectionControls", "deferConnectByColor", color)
    S.setStateVal(false, "connectionControls", "joinXmlArmed")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
    if PCST ~= nil and type(PCST.refreshAllRows) == "function" then
      PCST.refreshAllRows()
    end
    U.setAttributes("phase_deferSetXml", { isOn = true })
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("phase_joinXmlStatus", "text", "Join XML: full")
    end
    if UI ~= nil and UI.setValue ~= nil then
      UI.setValue("phase_joinXmlStatus", "Join XML: full")
    end
  end,
  function()
    print("PASS — Host alone, Intermission, defer triad on for " .. FIXTURE.joinColor .. ", joinXmlArmed=false")
  end,
  function()
    printHeader("TOR-439: Control verify", 1)
  end,
  function()
    local color = FIXTURE.joinColor
    if S.getStateVal("connectionControls", "deferSetXml") ~= true then
      error("[Verify FAIL] deferSetXml should be true")
    end
    if S.getStateVal("connectionControls", "deferAutoSeatByColor", color) ~= true then
      error("[Verify FAIL] deferAutoSeatByColor[" .. color .. "] should be true")
    end
    if S.getStateVal("connectionControls", "deferConnectByColor", color) ~= true then
      error("[Verify FAIL] deferConnectByColor[" .. color .. "] should be true")
    end
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[Verify FAIL] joinXmlArmed should be false for control run")
    end
    print("PASS — control state ready (full XmlUI expected)")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Confirm Phases: Defer setXML on + status 'Join XML: full'. Then have joiner connect; record Loading/post-table/Grey timeout Y/N. Do not Auto-Seat yet.")
  end,
}, { maxWait = 30 })
```

---

## Code Block A — After control join attempt

```lua
U.chain({
  function()
    printHeader("TOR-439: After control join", 1)
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed flipped during control — expected still false")
    end
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — still unarmed (control)")
  end,
  function()
    print("Record now:")
  end,
  function()
    print("  CONTROL timeout Loading Y/N = ?")
  end,
  function()
    print("  CONTROL timeout after table visible Y/N = ?")
  end,
  function()
    print("  CONTROL survived to Grey Y/N = ?")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ If joiner is Grey: Auto-Seat then Connect for " .. tostring(FIXTURE.joinColor) .. ". Do NOT press restore 1-4 or Disarm. Record timeout after seat/connect. Then disconnect joiner so Host is alone again.")
  end,
}, { maxWait = 30 })
```

---

## Code Block B — Treatment prep (Host alone again)

```lua
U.chain({
  function()
    printHeader("TOR-439: Treatment prep", 1)
  end,
  function()
    if #(Player.getPlayers() or {}) > 1 then
      error("[Setup FAIL] Still have joiners — disconnect until Host alone")
    end
    rollE2eSeatPrep("Black")
    local color = FIXTURE.joinColor
    S.setStateVal(true, "connectionControls", "deferSetXml")
    S.setStateVal(true, "connectionControls", "deferAutoSeatByColor", color)
    S.setStateVal(true, "connectionControls", "deferConnectByColor", color)
    S.setStateVal(false, "connectionControls", "joinXmlArmed")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
    if PCST ~= nil and type(PCST.refreshAllRows) == "function" then
      PCST.refreshAllRows()
    end
    U.setAttributes("phase_deferSetXml", { isOn = true })
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("phase_joinXmlStatus", "text", "Join XML: full")
    end
    if UI ~= nil and UI.setValue ~= nil then
      UI.setValue("phase_joinXmlStatus", "Join XML: full")
    end
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[Verify FAIL] expected joinXmlArmed false before Arm click")
    end
  end,
  function()
    print("PASS — ready to Arm Join XML")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Click Arm Join XML once; wait for [JoinXmlAssets] slim + [JoinColdPools] cold + [SeatUI] Full UI resync sent. Then paste Code Block C.")
  end,
}, { maxWait = 30 })
```

---

## Code Block C — Assert armed before treatment join

```lua
U.chain({
  function()
    printHeader("TOR-439: Armed verify", 1)
  end,
  function()
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") ~= true then
      error("[FAIL] joinXmlArmed false — Arm Join XML did not stick (or remount still in flight; wait and re-paste)")
    end
    if S.getStateVal("connectionControls", "deferSetXml") ~= true then
      error("[FAIL] deferSetXml should stay true after Arm")
    end
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — joinXmlArmed + Defer setXML + UI idle")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Joiner connects again. Record survive join Y/N. If Grey: Auto-Seat then Connect. Then press restore 1 Assets (wait), 2 HUD (wait). Then paste Code Block D.")
  end,
}, { maxWait = 60 })
```

---

## Code Block D — After restore 1 Assets + 2 HUD

```lua
U.chain({
  function()
    printHeader("TOR-439: After Assets+HUD", 1)
  end,
  function()
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed still true after Restore HUD — expected cleared")
    end
    local assetsBackup = S.getStateVal("connectionControls", "joinXmlCustomAssetsBackup")
    if type(assetsBackup) == "table" and #assetsBackup > 0 then
      error("[FAIL] CustomUIAssets backup still present — press 1 Assets first")
    end
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — assets restored + joinXmlArmed cleared")
  end,
  function()
    print("Record now:")
  end,
  function()
    print("  TREATMENT survive restore 1 Assets Y/N = ?")
  end,
  function()
    print("  TREATMENT survive restore 2 HUD Y/N = ?")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Press restore 3 Emitters (wait), then 4 Figurines (wait). Record survive each. Then paste Code Block E.")
  end,
}, { maxWait = 60 })
```

---

## Code Block E — After staged restore complete

```lua
U.chain({
  function()
    printHeader("TOR-439: After staged restore", 1)
  end,
  function()
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    local JoinColdPools = require("core.join_cold_pools")
    if JoinColdPools.isActive() == true then
      error("[FAIL] cold pools still active — finish 3 Emitters + 4 Figurines")
    end
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed still true")
    end
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — staged restore complete; pools warm")
  end,
  function()
    print("Paste your Y/N answers in chat:")
  end,
  function()
    print("  CONTROL Loading / post-table / Grey / after Auto-Seat")
  end,
  function()
    print("  TREATMENT join / after Auto-Seat / restore 1-4 / Host HUD restored")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Verification complete. No File Save/Load needed. (Armed-save Loading test is a separate Host-alone procedure.)")
  end,
}, { maxWait = 60 })
```
