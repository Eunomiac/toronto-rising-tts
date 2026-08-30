# Play-enter work finishes behind the cover before explode/sting _(TOR-535)_

## Agent Routing

Read this when:
- verifying Intermission→Play OutdoorDim lighting and HUD arm happen behind the cover before explode/sting
- verifying the session-start sting delay is 0.25s after the cover explode starts

Source of truth:
- `core/phases.ttslua` (Play enter: lights then `SE.play()` then `return C.SessionStartIntroDelaySec` then `fireSessionIntro`)
- `lib/constants.ttslua` (`C.SessionStartIntroDelaySec = 0.25`)

Verification:
- this playbook after Save & Play

Confirm that Advance from Intermission into Play finishes lighting (and HUD) behind the cover first, then the cover starts scaling with the Intermission loop fading, then the session-start song’s opening drum about a quarter-second later — with no hitch in the middle of that first cover scale.

Linear: https://linear.app/eunomiac-dev/issue/TOR-535/bug-finish-play-enter-work-behind-the-cover-before-explodesting-sting

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

**Step 2.** Execute Lua Code — Code Block 0 (snaps to Intermission, starts Advance).

**Step 3.** Watch the cover and listen for the opening drum.

---

## Code Block 0 — Snap and Advance

```lua
U.chain({
  function()
    printHeader("TOR-535: Work behind cover, then explode/sting", 1)
  end,
  function()
    DEBUG.resetToIntermission()
  end,
  function()
    print("PASS — snapped to Intermission (session cover + TR_Loop)")
  end,
  function()
    local Phases = require("core.phases")
    Phases.advanceTo(C.Phases.PLAY)
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ After you click Advance, the table should stay covered while lights finish. Then the cover starts scaling and the Intermission loop fades. About a quarter-second later, the session-start song’s opening drum should hit with that first visible scale. That first cover scale should not hitch or freeze in the middle.")
  end,
})
```
