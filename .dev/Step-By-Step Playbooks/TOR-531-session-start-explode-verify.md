# Wire TEST BED session-start explode + per-session intro data _(TOR-531)_

## Agent Routing

Read this when:
- verifying Intermission→Play cover explode after TEST BED timings were ported
- checking that `C.SessionStartAnimationData` is chosen from `sessionNum`

Source of truth:
- `core/session_explode.ttslua`
- `core/phases.ttslua` (`fireSessionIntro`, Play enter)
- `lib/constants.ttslua` (`C.SessionStartAnimationData`, `C.SessionStartBaseDuration`)

Verification:
- this playbook after Save & Play

Confirm that Advance from Intermission into Play uses the TEST BED explode (cover, delayed text, wavering art, session number and title together) and picks the intro track for the current session number.

## Prerequisites (human — keep short)

- **Save & Play** so the new Lua is loaded.
- **Host** connected (solo is fine).

## What Code Block 0 automates

| Setup | Helper |
| --- | --- |
| Session number 1 vs missing index | `S.setSessionNum` + `SessionExplode.resolveAnimationData` |
| Snap back to Intermission | `DEBUG.resetToIntermission()` |

## Run order

**Step 1.** **Save & Play** — repo Lua changed.

**Step 2.** Execute Lua Code — Code Block 0 (asserts lookup, snaps to Intermission, then asks you to Advance).

**Step 3.** **Click Advance →** on the Phases panel (Intermission → Play) and watch the cover explode through to the session number and title.

---

## Code Block 0 — Lookup asserts + snap to Intermission

```lua
U.chain({
  function()
    printHeader("TOR-531: Session-start explode", 1)
  end,
  function()
    local SE = require("core.session_explode")
    local original = tonumber(S.getStateVal("sessionNum")) or 1
    S.setSessionNum(1)
    local a1 = SE.resolveAnimationData()
    if a1.usedIndex ~= 1 then
      error("[TOR-531 FAIL] session 1 should use index 1, got " .. tostring(a1.usedIndex))
    end
    if a1.introKey ~= C.SessionStartAnimationData[1].introKey then
      error("[TOR-531 FAIL] session 1 introKey mismatch")
    end
    if a1.songDuration ~= C.SessionStartAnimationData[1].songDuration then
      error("[TOR-531 FAIL] session 1 songDuration mismatch")
    end
    S.setSessionNum(99)
    local a99 = SE.resolveAnimationData()
    if a99.usedIndex ~= 1 then
      error("[TOR-531 FAIL] missing session 99 should fall back to index 1, got " .. tostring(a99.usedIndex))
    end
    S.setSessionNum(original)
  end,
  function()
    print("PASS — session 1 lookup and missing-index fallback both use the expected intro data")
  end,
  function()
    DEBUG.resetToIntermission()
  end,
  function()
    print("PASS — snapped to Intermission (session cover + TR_Loop)")
  end,
  function()
    print("   ▶▶▶ HUMAN ▶▶▶ Click Advance on the Phases panel (Intermission → Play). The looping Intermission theme should fade, the session-start song should start immediately, and the stacked cover should explode: front cover first, then five character pairs (art drifts; name text fades in a moment later), then the session number and title grow together. The global cover should hide near the end of the song. Main music can start after that.")
  end,
})
```
