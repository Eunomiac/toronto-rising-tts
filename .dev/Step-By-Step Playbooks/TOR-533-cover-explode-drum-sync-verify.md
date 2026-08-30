# First cover explode hits with the session-start drum _(TOR-533)_

## Agent Routing

Read this when:
- verifying Intermission→Play cover scale-and-fade lines up with the intro track's opening drum

Source of truth:
- `core/phases.ttslua` (Play enter: `SE.play()` then `fireSessionIntro`)
- `core/session_explode.ttslua` (cover lerp starts inside `play()`, not after a `return 0` chain wait)

Verification:
- this playbook after Save & Play

Confirm that Advance from Intermission into Play starts the front cover's scale-and-fade on the session-start song's opening drum, not a moment later.

## Prerequisites (human — keep short)

- **Save & Play** so the new Lua is loaded.
- **Host** connected (solo is fine).

## What Code Block 0 automates

| Setup | Helper |
| --- | --- |
| Snap back to Intermission | `DEBUG.resetToIntermission()` |
| Start Intermission→Play | `Phases.advanceTo(C.Phases.PLAY)` |

This is the same Advance as [TOR-532-hud-behind-cover-verify.md](TOR-532-hud-behind-cover-verify.md). You can paste that block instead if you are already checking the overlay.

## Run order

**Step 1.** **Save & Play** — repo Lua changed.

**Step 2.** Execute Lua Code — Code Block 0 (snaps to Intermission, starts Advance).

**Step 3.** Listen for the opening drum as the cover starts to scale.

---

## Code Block 0 — Snap and Advance

```lua
U.chain({
  function()
    printHeader("TOR-533: Cover explode on the drum", 1)
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
    print("   ▶▶▶ HUMAN ▶▶▶ Listen for the opening drum of the session-start song. It should wait about half a second after the cover starts scaling, then hit with that first visible scale (TOR-534).")
  end,
})
```
