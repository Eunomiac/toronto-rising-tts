# Join-stress minimal Global XmlUI — solo Host remount smoke _(TOR-439)_

## Agent Routing

Read this when:
- smoking TOR-439 Arm / Refresh / Disarm **without** a second join client
- Host-only confirmation that remount works before multiclient Experiment #0

Source of truth:
- Full join experiment: [TOR-439-join-xml-spike-verify.md](TOR-439-join-xml-spike-verify.md)
- `core/global_script.ttslua` (`HUD_phaseArmJoinXml`, `HUD_phaseRefreshXml`, `HUD_phaseDisarmJoinXml`)
- Linear [TOR-439](https://linear.app/eunomiac-dev/issue/TOR-439/players-join-stress-minimal-global-xmlui-spike-armrefresh)

Verification:
- this playbook (Save & Play + Host alone)

Confirm Host-side Arm Join XML remounts the minimal document, Phases chrome stays usable, and Refresh remounts the full HUD and clears `joinXmlArmed`. This does **not** measure join-client connection timeouts — that still needs [the full playbook](TOR-439-join-xml-spike-verify.md) with a second client.

## Session mode (pick this)

**Use multiplayer with only your client connected (Host alone).**

Do **not** use hotseat for this smoke. Hotseat shares one Steam identity across seats and skips some join/resync paths; multiplayer Host-alone matches the Host XmlUI remount surface you will use when a real joiner arrives later.

## What this covers / skips

| Covered (solo) | Not covered (needs joiner) |
| --- | --- |
| Arm remount → minimal XmlUI | Join timeout on Loading / post-table |
| Defer setXML forced on by Arm | Grey settle / Auto-Seat / Connect under load |
| Refresh remount → full XmlUI + `joinXmlArmed` clear | Treatment “survive join on minimal” |
| Disarm remount → full XmlUI | Control vs treatment timeout comparison |
| Host visual: slim chrome ↔ full HUD | Join-client HUD after Refresh |

## Prerequisites (human — keep short)

- **Save & Play** after TOR-439 Lua (includes `lib/ui_global_xml_docs.ttslua`).
- **Host** loads the chronicle in **multiplayer**, alone (one connected player).
- Phase is **Intermission**. If not, Advance to Intermission before Code Block 0.

## Run order

**Step 1.** **Save & Play**, then load as **multiplayer Host alone**. Confirm Intermission.

**Step 2.** Execute Lua Code — Code Block 0 (prep + open Phases).

**Step 3.** **Confirm Phases shows Defer setXML on and status `Join XML: full`.** Leave Phases open.

**Step 4.** **Click Arm Join XML once.** Wait until console shows the Arm remount line and status becomes `Join XML: ARMED (minimal)`.

**Step 5.** Execute Lua Code — Code Block A (wait remount idle; assert armed).

**Step 6.** **Confirm Host UI is slim join chrome** (Phases usable; normal player/ST HUD gone or stripped). Record: Arm remount OK Y/N.

**Step 7.** **Click Refresh XML once.** Wait until status returns to `Join XML: full` and console logs remount complete.

**Step 8.** Execute Lua Code — Code Block B (assert disarmed after Refresh).

**Step 9.** **Confirm full Host HUD is restored.** Record: Refresh remount OK Y/N.

**Step 10.** **Click Arm Join XML once**, wait until ARMED, then **click Disarm Join XML once**, wait until status is `Join XML: full` again.

**Step 11.** Execute Lua Code — Code Block C (assert disarmed after Disarm; complete).

---

## Code Block 0 — Prep + open Phases

```lua
U.chain({
  function()
    printHeader("TOR-439 solo: Prep", 1)
  end,
  function()
    if #(Player.getPlayers() or {}) < 1 then
      error("[Setup FAIL] Host not connected")
    end
    if #(Player.getPlayers() or {}) > 1 then
      error("[Setup FAIL] More than one player — disconnect others (Host alone)")
    end
    rollE2eSeatPrep("Black")
    local phase = S.getStateVal("currentPhase")
    if phase ~= C.Phases.INTERMISSION then
      error("[Setup FAIL] currentPhase=" .. tostring(phase) .. " — Advance to Intermission, then re-paste Code Block 0")
    end
    S.setStateVal(true, "connectionControls", "deferSetXml")
    S.setStateVal(false, "connectionControls", "joinXmlArmed")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases")
    U.setAttributes("phase_deferSetXml", { isOn = true })
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("phase_joinXmlStatus", "text", "Join XML: full")
    end
    if UI ~= nil and UI.setValue ~= nil then
      UI.setValue("phase_joinXmlStatus", "Join XML: full")
    end
    print("PASS — Host alone, Intermission, unarmed, Phases opened")
    print("▶▶▶ HUMAN ▶▶▶ Confirm Defer setXML on + status 'Join XML: full'. Click Arm Join XML once; wait for ARMED. Then paste Code Block A.")
  end,
}, { maxWait = 30 })
```

---

## Code Block A — After Arm

```lua
U.chain({
  function()
    printHeader("TOR-439 solo: After Arm", 1)
  end,
  function()
    -- Remount is async; wait until UI is idle (armed flag is set before remount finishes).
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") ~= true then
      error("[FAIL] joinXmlArmed false — Arm did not stick")
    end
    if S.getStateVal("connectionControls", "deferSetXml") ~= true then
      error("[FAIL] deferSetXml should be true after Arm")
    end
    print("PASS — armed + Defer setXML + UI idle")
    print("▶▶▶ HUMAN ▶▶▶ Confirm slim Host chrome. Click Refresh XML once; wait for status 'Join XML: full'. Then paste Code Block B.")
  end,
}, { maxWait = 60 })
```

---

## Code Block B — After Refresh

```lua
U.chain({
  function()
    printHeader("TOR-439 solo: After Refresh", 1)
  end,
  function()
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed still true after Refresh")
    end
    print("PASS — joinXmlArmed cleared after Refresh")
    print("▶▶▶ HUMAN ▶▶▶ Confirm full Host HUD restored. Then Arm once, wait ARMED, Disarm once, wait full status. Then paste Code Block C.")
  end,
}, { maxWait = 60 })
```

---

## Code Block C — After Disarm + complete

```lua
U.chain({
  function()
    printHeader("TOR-439 solo: After Disarm", 1)
  end,
  function()
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed still true after Disarm")
    end
    print("PASS — Disarm cleared joinXmlArmed")
    print("Solo smoke answers for chat:")
    print("  Arm remount OK Y/N = ?")
    print("  Refresh remount OK Y/N = ?")
    print("  Disarm remount OK Y/N = ?")
    print("  Host slim→full visuals OK Y/N = ?")
    print("▶▶▶ HUMAN ▶▶▶ Verification complete. No further action. (Join timeouts still need the full TOR-439 playbook with a second client.)")
  end,
}, { maxWait = 60 })
```
