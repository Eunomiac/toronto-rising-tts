# Play-enter settle before explode/sting _(TOR-536)_

## Agent Routing

Read this when:
- verifying Intermission→Play waits behind the cover after lighting before fade/explode/sting
- diagnosing a stuttering first cover explode

Source of truth:
- `core/phases.ttslua` (Play enter: lights then `return C.SessionStartPlayEnterSettleSec` then `SE.play()`)
- `lib/constants.ttslua` (`C.SessionStartPlayEnterSettleSec = 0.5`)

Verification:
- this playbook after Save & Play

Confirm that Advance from Intermission into Play keeps the table fully covered for about half a second after lighting, then the cover starts scaling smoothly (no stutter) with the Intermission loop fading, then the session-start opening drum about a quarter-second after that first visible scale.

Linear: https://linear.app/eunomiac-dev/issue/TOR-536/bug-lengthen-play-enter-settle-so-explode-does-not-start-while

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

**Step 3.** Watch the cover: it should stay still for a beat, then scale smoothly.

---

## Code Block 0 — Snap and Advance

```lua
U.chain({
  function()
    printHeader("TOR-536: Settle behind cover before explode", 1)
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
    print("   ▶▶▶ HUMAN ▶▶▶ After Advance, the cover should stay still for about half a second while lights finish. Then it should start scaling smoothly — no stutter or freeze — and the Intermission loop should fade. About a quarter-second after that first visible scale, the session-start song’s opening drum should hit.")
  end,
})
```
