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

**Armed-save load (CustomUIAssets):** After Arm (which now also slims CustomUIAssets via `UI.setCustomAssets`), use TTS **File → Save** (not Save & Play), then **File → Load** so Loading can see a slim registry. Details: [Join-Load Inventory § Armed-save load](../Multiplayer%20Functionality/Join-Load%20Inventory.md#armed-save-load-customuiassets-q1--host-alone).

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

**Step 2.** Execute Lua Code — Code Block 0 (prep + open Phases + fade global blindfold for table visibility).

**Step 3.** **Confirm Phases shows Defer setXML on and status `Join XML: full`.** Leave Phases open. Table should show through a near-transparent Intermission blindfold (`rgba(1,1,1,0.1)` — smoke only).

**Step 4.** **Click Arm Join XML once.** Wait for console `[SeatUI] Full UI resync sent (Arm Join XML).` (that is the remount-done cue — not a Phases status label). Remount resets blindfold opacity; Code Block A re-fades it. After remount, Host should show **slim Phases chrome upper-left in front of** the Intermission blindfold (Refresh / Disarm live there).

**Step 5.** Execute Lua Code — Code Block A (wait remount idle; assert armed; re-fade blindfold).

**Step 6.** **Confirm Host UI is slim join chrome** (Phases panel upper-left; normal player/ST HUD gone; table visible through faded blindfold). Record: Arm remount OK Y/N. If chrome is missing but `SeatUI` logged success, paste the Recovery block below instead of clicking Refresh.

**Step 7.** **Click Refresh XML once.** Wait until status returns to `Join XML: full` and console logs remount complete.

**Step 8.** Execute Lua Code — Code Block B (assert disarmed after Refresh; re-fade blindfold).

**Step 9.** **Confirm full Host HUD is restored.** Record: Refresh remount OK Y/N.

**Step 10.** **Click Arm Join XML once**, wait until SeatUI remount sent, then **click Disarm Join XML once**, wait until SeatUI remount sent again.

**Step 11.** Execute Lua Code — Code Block C (assert disarmed after Disarm; re-fade; complete).

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
    -- Solo smoke only: keep Intermission blindfold up but nearly transparent so Host sees the table.
    -- Remount resets Image attrs — Code Blocks A/B/C re-apply after each remount.
    UI.setAttribute("overlay_globalBlindfold", "color", "rgba(1, 1, 1, 0.1)")
    UI.setAttribute("overlay_globalBlindfold", "raycastTarget", "false")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
    U.setAttributes("phase_deferSetXml", { isOn = true })
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("phase_joinXmlStatus", "text", "Join XML: full")
    end
    if UI ~= nil and UI.setValue ~= nil then
      UI.setValue("phase_joinXmlStatus", "Join XML: full")
    end
  end,
  function()
    print("PASS — Host alone, Intermission, unarmed, Phases opened, global blindfold faded for smoke")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Confirm Defer setXML on + status 'Join XML: full' + table visible through faded blindfold. Click Arm Join XML once; wait for [JoinXmlAssets] slim + [JoinColdPools] cold + [SeatUI] Full UI resync sent. Then paste Code Block A.")
  end,
}, { maxWait = 30 })
```

---

## Recovery — Refresh / Disarm / re-fade blindfold (Lua)

If Arm remounted but Host chrome is still hidden (e.g. old embed with blindfold on top), do **not** re-Arm. After Code Block A, use these instead of clicking Refresh / Disarm:

```lua
-- Refresh XML (full remount + clear joinXmlArmed)
HUD_phaseRefreshXml(Player["Black"])
```

```lua
-- Disarm Join XML (full remount + clear joinXmlArmed)
HUD_phaseDisarmJoinXml(Player["Black"])
```

Any remount resets the Intermission blindfold. Re-fade mid-sequence if needed:

```lua
UI.setAttribute("overlay_globalBlindfold", "color", "rgba(1, 1, 1, 0.1)")
UI.setAttribute("overlay_globalBlindfold", "raycastTarget", "false")
```

After a **Save & Play** with the blindfold-before-chrome fix, slim Phases should appear upper-left after Arm and you can click the buttons again.

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
    UI.setAttribute("overlay_globalBlindfold", "color", "rgba(1, 1, 1, 0.1)")
    UI.setAttribute("overlay_globalBlindfold", "raycastTarget", "false")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    -- forceOpen: remount resets panels; do not toggle-close if already active
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — armed + Defer setXML + UI idle + blindfold re-faded")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Confirm slim Host chrome upper-left + table visible (or use Recovery Lua). Click Refresh XML once; wait for [SeatUI] Full UI resync sent + full HUD. Then paste Code Block B.")
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
    UI.setAttribute("overlay_globalBlindfold", "color", "rgba(1, 1, 1, 0.1)")
    UI.setAttribute("overlay_globalBlindfold", "raycastTarget", "false")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — joinXmlArmed cleared after Refresh; blindfold re-faded")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Confirm full Host HUD restored + table visible. Then Arm once (wait SeatUI), Disarm once (wait SeatUI). Then paste Code Block C.")
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
    UI.setAttribute("overlay_globalBlindfold", "color", "rgba(1, 1, 1, 0.1)")
    UI.setAttribute("overlay_globalBlindfold", "raycastTarget", "false")
    if UI ~= nil and UI.setAttribute ~= nil then
      UI.setAttribute("storytellerToolbarBody", "active", "true")
      UI.setAttribute("storytellerContentArea", "active", "true")
    end
    HUD_selectStorytellerPanel(Player["Black"], nil, "toggle_phases", true)
  end,
  function()
    print("PASS — Disarm cleared joinXmlArmed; blindfold re-faded")
  end,
  function()
    print("Solo smoke answers for chat:")
  end,
  function()
    print("  Arm remount OK Y/N = ?")
  end,
  function()
    print("  Refresh remount OK Y/N = ?")
  end,
  function()
    print("  Disarm remount OK Y/N = ?")
  end,
  function()
    print("  Host slim→full visuals OK Y/N = ?")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Verification complete. No further action. (Join timeouts still need the full TOR-439 playbook with a second client.)")
  end,
}, { maxWait = 60 })
```
