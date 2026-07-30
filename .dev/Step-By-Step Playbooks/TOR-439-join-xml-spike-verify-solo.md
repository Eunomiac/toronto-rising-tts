# Join-stress minimal Global XmlUI — solo Host remount smoke *(TOR-439)*

## Agent Routing

Read this when:

- smoking TOR-439 Arm + staged restore **1–4** (and optional Disarm) **without** a second join client
- Host-only confirmation that remount works before multiclient Experiment #0

Source of truth:

- Full join experiment: [TOR-439-join-xml-spike-verify.md](TOR-439-join-xml-spike-verify.md)
- `core/global_script.ttslua` (`HUD_phaseArmJoinXml`, staged restore `HUD_phaseRestoreJoin*`)
- Linear [TOR-439](https://linear.app/eunomiac-dev/issue/TOR-439/players-join-stress-minimal-global-xmlui-spike-armrefresh)

Verification:

- this playbook (Save & Play + Host alone)

Confirm Host-side Arm Join XML remounts the minimal document, Phases chrome stays usable, and staged restore **1 Assets → 2 HUD → 3 Emitters → 4 Figurines** restores full HUD / pools and clears `joinXmlArmed`. This does **not** measure join-client connection timeouts — that still needs [the full playbook](TOR-439-join-xml-spike-verify.md) with a second client.

## Save / Load (read once)

| When | Action |
| --- | --- |
| **Before this smoke** | **Save & Play** once, then load multiplayer Host alone |
| **During Steps 2–11** | Stay in-session — **no** File Save / File Load |
| **Do not** | File Save / Load after Disarm or after restore **1–4** |
| **Separate Loading test only** | After Arm, **while still armed**: **File → Save** (not Save & Play) → **File → Load** — see [Join-Load Inventory § Armed-save load](../Multiplayer%20Functionality/Join-Load%20Inventory.md#armed-save-load-customuiassets-q1--host-alone). Not part of the Steps below. |

## Session mode (pick this)

**Use multiplayer with only your client connected (Host alone).**

Do **not** use hotseat for this smoke. Hotseat shares one Steam identity across seats and skips some join/resync paths; multiplayer Host-alone matches the Host XmlUI remount surface you will use when a real joiner arrives later.

## What this covers / skips


| Covered (solo)                                      | Not covered (needs joiner)                   |
| --------------------------------------------------- | -------------------------------------------- |
| Arm remount → minimal XmlUI + slim assets + cold pools | Join timeout on Loading / post-table      |
| Defer setXML forced on by Arm                       | Grey settle / Auto-Seat / Connect under load |
| Staged restore **1–4** → full HUD + warm pools      | Treatment “survive join on armed Host”       |
| Optional Disarm all-at-once remount                 | Control vs treatment timeout comparison      |
| Host visual: slim chrome ↔ full HUD                 | Join-client HUD after restore                |




## Prerequisites (human — keep short)

- **Save & Play** after TOR-439 Lua (includes `lib/ui_global_xml_docs.ttslua`).
- **Host** loads the chronicle in **multiplayer**, alone (one connected player).
- Phase is **Intermission**. If not, Advance to Intermission before Code Block 0.



## Run order

**Step 1.** **Save & Play**, then load as **multiplayer Host alone**. Confirm Intermission.

**Step 2.** Execute Lua Code — Code Block 0 (prep + open Phases + fade global blindfold for table visibility).

**Step 3.** **Confirm Phases shows Defer setXML on and status** `Join XML: full`**.** Leave Phases open. Table should show through a near-transparent Intermission blindfold (`rgba(1,1,1,0.1)` — smoke only).

**Step 4.** **Click Arm Join XML once.** Wait for console `[JoinXmlAssets] setCustomAssets slim`, `[JoinColdPools]` cold, and `[SeatUI] Full UI resync sent (Arm Join XML)`. Remount resets blindfold opacity; Code Block A re-fades it. After remount, Host should show **slim Phases chrome upper-left in front of** the Intermission blindfold (restore **1–4** / Disarm live there).

**Step 5.** Execute Lua Code — Code Block A (wait remount idle; assert armed; re-fade blindfold).

**Step 6.** **Confirm Host UI is slim join chrome** (Phases panel upper-left; normal player/ST HUD gone; table visible through faded blindfold). Record: Arm remount OK Y/N. If chrome is missing but `SeatUI` logged success, use the Recovery block below (staged restore via Lua) — do not re-Arm.

**Step 7.** **Press restore `1 Assets`, wait; then `2 HUD`, wait** for full HUD / `joinXmlArmed` clear.

**Step 8.** Execute Lua Code — Code Block B (assert Assets+HUD; re-fade blindfold).

**Step 9.** **Press restore `3 Emitters`, wait; then `4 Figurines`, wait** until pools warm.

**Step 10.** Execute Lua Code — Code Block C (assert staged restore complete).

**Step 11.** **Optional Disarm smoke:** **Click Arm Join XML once**, wait until SeatUI remount sent, then **click Disarm Join XML once**, wait until SeatUI remount sent again. Record: Disarm remount OK Y/N. No File Save/Load.

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



## Recovery — staged restore / re-fade blindfold (Lua)

If Arm remounted but Host chrome is still hidden, do **not** re-Arm. Use staged restore (or Phases buttons **1–4**):

```lua
HUD_phaseRestoreJoinAssets(Player["Black"])
-- wait for [JoinControls] CustomUIAssets restored
HUD_phaseRestoreJoinHud(Player["Black"])
-- wait for [SeatUI] Full UI resync sent
HUD_phaseRestoreJoinEmitters(Player["Black"])
-- wait for emitters restored
HUD_phaseRestoreJoinFigurines(Player["Black"])
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
    print("▶▶▶ HUMAN ▶▶▶ Confirm slim Host chrome. Press restore **1 Assets**, wait; **2 HUD**, wait for full HUD. Then paste Code Block B.")
  end,
}, { maxWait = 60 })
```

---



## Code Block B — After 1 Assets + 2 HUD

```lua
U.chain({
  function()
    printHeader("TOR-439 solo: After Assets+HUD", 1)
  end,
  function()
    return function()
      return UI == nil or UI.loading ~= true
    end
  end,
  function()
    if S.getStateVal("connectionControls", "joinXmlArmed") == true then
      error("[FAIL] joinXmlArmed still true after Restore HUD")
    end
    local assetsBackup = S.getStateVal("connectionControls", "joinXmlCustomAssetsBackup")
    if type(assetsBackup) == "table" and #assetsBackup > 0 then
      error("[FAIL] CustomUIAssets backup still present — press 1 Assets first")
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
    print("PASS — assets restored + joinXmlArmed cleared; blindfold re-faded")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Press **3 Emitters**, wait; **4 Figurines**, wait. Then paste Code Block C.")
  end,
}, { maxWait = 60 })
```

---



## Code Block C — After full staged restore

```lua
U.chain({
  function()
    printHeader("TOR-439 solo: After staged restore", 1)
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
    UI.setAttribute("overlay_globalBlindfold", "color", "rgba(1, 1, 1, 0.1)")
    UI.setAttribute("overlay_globalBlindfold", "raycastTarget", "false")
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
    print("Solo smoke answers for chat:")
  end,
  function()
    print("  Arm remount OK Y/N = ?")
  end,
  function()
    print("  Restore 1-4 OK Y/N = ?")
  end,
  function()
    print("  Host slim to full visuals OK Y/N = ?")
  end,
  function()
    print("▶▶▶ HUMAN ▶▶▶ Staged restore complete. Optional: Arm then Disarm once (no File Save). Join timeouts still need the full TOR-439 playbook with a second client.")
  end,
}, { maxWait = 60 })
```
