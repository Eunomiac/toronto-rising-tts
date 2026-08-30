# Clock overlay already painted when the session-start cover lifts _(TOR-532)_

## Agent Routing

Read this when:
- verifying Intermission→Play no longer blinks the game-state overlay after the global cover hides

Source of truth:
- `core/phases.ttslua` (`Phases.armPlayHudBehindCover`, Play enter)
- `core/game_state_overlay.ttslua` (`pushOverlayActive` skip-if-unchanged)

Verification:
- this playbook after Save & Play

Confirm that Advance from Intermission into Play turns the clock/location overlay on **behind** the stacked cover, so the cover lift reveals a finished HUD instead of the overlay popping in afterward.

## Prerequisites (human — keep short)

- **Save & Play** so the new Lua is loaded.
- **Host** connected (solo is fine).

## What Code Block 0 automates

| Setup | Helper |
| --- | --- |
| Snap back to Intermission | `DEBUG.resetToIntermission()` |
| Start Intermission→Play | `Phases.advanceTo(C.Phases.PLAY)` |

## Run order

**Step 1.** **Save & Play** — repo Lua changed.

**Step 2.** Execute Lua Code — Code Block 0 (snaps to Intermission, starts Advance, asserts the overlay is on while the cover is still up, then asks you to watch the lift).

**Step 3.** Watch until the stacked cover hides near the end of the song.

---

## Code Block 0 — Snap, Advance, assert overlay behind cover

```lua
local function xmlIsActive(id)
  local v = UI.getAttribute(id, "active")
  if v == nil then
    return true
  end
  local s = string.lower(tostring(v))
  return s == "true" or s == "1"
end

U.chain({
  function()
    printHeader("TOR-532: HUD behind cover", 1)
  end,
  function()
    DEBUG.resetToIntermission()
  end,
  function()
    print("PASS — snapped to Intermission (session cover + TR_Loop)")
  end,
  function()
    if xmlIsActive("gameStateOverlay_timeAndLocation") then
      error("[TOR-532 FAIL] clock overlay should be hidden in Intermission, active="
        .. tostring(UI.getAttribute("gameStateOverlay_timeAndLocation", "active")))
    end
  end,
  function()
    print("PASS — clock overlay is hidden in Intermission")
  end,
  function()
    local Phases = require("core.phases")
    Phases.advanceTo(C.Phases.PLAY)
    return 2
  end,
  function()
    if xmlIsActive("gameStateOverlay_timeAndLocation") ~= true then
      error("[TOR-532 FAIL] clock overlay should already be on behind the cover, active="
        .. tostring(UI.getAttribute("gameStateOverlay_timeAndLocation", "active")))
    end
    if xmlIsActive("overlay_globalBlindfold_panel") ~= true then
      error("[TOR-532 FAIL] global cover should still be up 2s into Play enter, active="
        .. tostring(UI.getAttribute("overlay_globalBlindfold_panel", "active")))
    end
  end,
  function()
    print("PASS — clock overlay is on while the global cover is still up")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Keep watching until the stacked cover hides near the end of the song. The first cover image should start scaling with the opening drum (TOR-533), not a moment after. The clock/location overlay (and the rest of the HUD) should already be there when the cover lifts — it should not pop in after.")
  end,
})
```
