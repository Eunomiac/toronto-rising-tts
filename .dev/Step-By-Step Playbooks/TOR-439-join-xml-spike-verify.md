# Join-stress minimal Global XmlUI — control vs treatment _(TOR-439)_

## Agent Routing

Read this when:
- verifying TOR-439 Arm Join XML / Refresh remount experiment in multiclient
- recording whether post-Loading join timeouts track heavy Global XmlUI at connect

Source of truth:
- `ui/Global.join_minimal.xml`
- `core/global_script.ttslua` (`performFullUiResync`, `HUD_phaseArmJoinXml`, `HUD_phaseRefreshXml`)
- [Join-Load Inventory](../Multiplayer%20Functionality/Join-Load%20Inventory.md) Experiment #0
- Linear [TOR-439](https://linear.app/eunomiac-dev/issue/TOR-439/players-join-stress-minimal-global-xmlui-spike-armrefresh)

Verification:
- this playbook (Save & Play + Host-alone start + one join client)
- Host-only remount smoke (no joiner): [TOR-439-join-xml-spike-verify-solo.md](TOR-439-join-xml-spike-verify-solo.md)

Prove whether joining into a **minimal** Global XmlUI (then remounting full via Refresh) changes post-Loading connection timeouts versus the normal full HUD with Defer triad on.

Fixture seat below: **Purple**. Edit `FIXTURE.joinColor` in Code Block 0 if the joining player’s chronicle seat is a different PC color.

## Prerequisites (human — keep short)

- **Save & Play** after TOR-439 Lua (includes `lib/ui_global_xml_docs.ttslua`).
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

**Step 6.** **If the joiner is Grey: on PCs panel for the fixture color, click Auto-Seat, then Connect.** Wait ~10s. Do **not** click Refresh XML. Record: timeout after Auto-Seat/Connect Y/N.

**Step 7.** **Kick or disconnect the join client.** Host alone again. If the Host session died, reload multiplayer Host alone, Save & Play if needed, then re-run from Step 2 before treatment.

**Step 8.** Execute Lua Code — Code Block B (treatment prep: keep defer triad; ensure unarmed).

**Step 9.** **On Phases: click Arm Join XML once.** Wait until console logs Arm remount and status becomes `Join XML: ARMED (minimal)`. Host HUD should shrink to slim join chrome (Phases still usable).

**Step 10.** Execute Lua Code — Code Block C (assert armed + Defer setXML on).

**Step 11.** **Have the same join client connect again.** Wait for Loading / Grey / timeout. Record: survive join on minimal XmlUI Y/N (same timeout questions as Step 4).

**Step 12.** **If Grey: Auto-Seat then Connect for the fixture color.** Wait ~10s. Record timeout Y/N.

**Step 13.** **On Phases: click Refresh XML once.** Wait until console logs remount complete and status returns to `Join XML: full`. Record: survive Refresh Y/N; Host full HUD restored Y/N.

**Step 14.** Execute Lua Code — Code Block D (assert disarmed after Refresh; dump results reminder).

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
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases")
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
    print("▶▶▶ HUMAN ▶▶▶ If joiner is Grey: Auto-Seat then Connect for " .. tostring(FIXTURE.joinColor) .. ". Do NOT Refresh XML. Record timeout after seat/connect. Then disconnect joiner so Host is alone again.")
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
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases")
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
    print("▶▶▶ HUMAN ▶▶▶ Click Arm Join XML once; wait for ARMED status / slim HUD. Then paste Code Block C.")
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
    if S.getStateVal("connectionControls", "joinXmlArmed") ~= true then
      error("[FAIL] joinXmlArmed false — Arm Join XML did not stick (or remount still in flight; wait and re-paste)")
    end
    if S.getStateVal("connectionControls", "deferSetXml") ~= true then
      error("[FAIL] deferSetXml should stay true after Arm")
    end
  end,
  function()
    print("PASS — joinXmlArmed + Defer setXML")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Joiner connects again. Record survive join Y/N. If Grey: Auto-Seat then Connect. Then click Refresh XML; record survive Refresh + full HUD restored. Then paste Code Block D.")
  end,
}, { maxWait = 30 })
```

---

## Code Block D — After Refresh / complete

```lua
U.chain({
  function()
    printHeader("TOR-439: After Refresh", 1)
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed still true after Refresh — expected cleared")
    end
  end,
  function()
    print("PASS — joinXmlArmed cleared after Refresh")
  end,
  function()
    print("Paste your Y/N answers in chat:")
  end,
  function()
    print("  CONTROL Loading / post-table / Grey / after Auto-Seat")
  end,
  function()
    print("  TREATMENT join / after Auto-Seat / after Refresh / Host HUD restored")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Verification complete. No further action.")
  end,
}, { maxWait = 30 })
```
