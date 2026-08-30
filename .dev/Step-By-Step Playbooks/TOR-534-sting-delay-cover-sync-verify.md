# Opening drum waits 0.5s so it hits with the cover explode _(TOR-534)_

## Agent Routing

Read this when:
- verifying Intermission→Play Music C sting is delayed 0.5s after the cover explode starts

Source of truth:
- `core/phases.ttslua` (Play enter: `SE.play()` then `return C.SessionStartIntroDelaySec` then `fireSessionIntro`)
- `lib/constants.ttslua` (`C.SessionStartIntroDelaySec = 0.5`)

Verification:
- this playbook after Save & Play

Confirm that Advance from Intermission into Play starts the cover scale-and-fade first, then the session-start song’s opening drum about half a second later, on that first visible scale.

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
    printHeader("TOR-534: Sting delay vs cover explode", 1)
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
    print("   ▶▶▶ HUMAN ▶▶▶ The cover should start scaling first. About half a second later, the session-start song’s opening drum should hit with that first visible scale — not before it. The looping Intermission theme should be fading during that half second.")
  end,
})
```
