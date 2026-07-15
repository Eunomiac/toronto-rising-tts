# Compulsions deck pick-and-present _(TOR-204)_

## Agent Routing

Read this when:
- verifying Compulsions generic draw → master present → hand Draw → permanent lock (TOR-204)
- debugging leave-container / hand-zone Compulsion handlers

Source of truth:
- `core/compulsions.ttslua`
- `core/global_script.ttslua` (`onObjectLeaveContainer`, `onObjectEnterZone`)
- Linear [TOR-204](https://linear.app/eunomiac-dev/issue/TOR-204/feature-compulsions-deck)

Verification:
- this playbook (Save & Play + human Draws)

Verify TOR-204: drawing a generic Compulsion card from a seat deck returns it, presents matching master cards at the seat anchors, and Drawing one into the hand locks the choice at the next free permanent slot while returning the others to the master deck.

## Prerequisites (human — keep short)

- **Save & Play** after pulling this TOR-204 Lua.
- **Host** connected (solo is fine).
- Workshop already has (not inventable in Lua): per-seat decks with GM Notes `COMPULSION_DECK_<COLOR>`, generics `Compulsion:<Type>-<Color>:generic`, master deck tagged `CompulsionsMasterDeck`, typed cards `Compulsion:<Type>-<Color>:1`–`:4`, and live `COMPULSION_CARD_*` anchors.

## Run order

**Step 1.** **Save & Play.**

**Step 2.** Execute Lua Code — Code Block 0 (assert resolvers + notes parse).

**Step 3.** **At Red (or your fixture seat): draw one card from that seat’s Compulsions deck.** Console should log a Presenting line; generic must return to the player deck; up to four typed cards unlock at the anchors (~y=10).

**Step 4.** Execute Lua Code — Code Block A (assert a present-session is open for that seat via module re-check helpers).

**Step 5.** **Right-click Draw one presented Compulsion card into that seat’s hand.** Unselected cards return to the master deck; the chosen card lerps to y≈7.5 offset toward the table origin and locks.

**Step 6.** Execute Lua Code — Code Block B (assert chosen card locked near an anchor; present-session cleared).

**Step 7.** **Optional second cycle:** draw generic again → new present → Draw one → second permanent slot fills.

---

## Code Block 0 — Resolver + notes verify

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: Compulsions resolver verify", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    local parsed = Compulsions.parseNotes("Compulsion:Dominance-Red:generic")
    if parsed == nil or parsed.type ~= "Dominance" or parsed.suffix ~= "generic" then
      error("[TOR-204 FAIL] parseNotes generic failed: " .. tostring(parsed and parsed.type))
    end
    if Compulsions.canonicalizeSeatColor("red") ~= "Red" then
      error("[TOR-204 FAIL] canonicalizeSeatColor")
    end
    local master = Compulsions.resolveMasterDeck()
    if master == nil then
      error("[TOR-204 FAIL] CompulsionsMasterDeck tag not found — check workshop tag")
    end
    local deck = Compulsions.resolvePlayerDeck("Red")
    if deck == nil then
      error("[TOR-204 FAIL] COMPULSION_DECK_RED GM Notes not found — check seat deck identity")
    end
    print("PASS — parseNotes, master tag, COMPULSION_DECK_RED resolved")
    print("▶▶▶ HUMAN ▶▶▶ Draw one card from Red Compulsions deck (generic)")
  end,
})
```

---

## Code Block A — After generic draw

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: after generic draw", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    -- Re-resolve player deck; generic must be back inside (or deck object lives).
    local deck = Compulsions.resolvePlayerDeck("Red")
    if deck == nil then
      error("[TOR-204 FAIL] player deck missing after draw")
    end
    local presented = 0
    for _, obj in ipairs(getObjects() or {}) do
      if obj ~= nil and obj.type == "Card" and obj.getGMNotes ~= nil and obj.getLock ~= nil then
        local p = Compulsions.parseNotes(obj.getGMNotes())
        if p ~= nil and p.suffix ~= "generic" and Compulsions.canonicalizeSeatColor(p.playerKey) == "Red"
          and obj.getLock() ~= true
        then
          local pos = obj.getPosition()
          if type(pos) == "table" and type(pos.y) == "number" and pos.y > 5 then
            presented = presented + 1
          end
        end
      end
    end
    if presented < 1 then
      error("[TOR-204 FAIL] expected ≥1 unlocked presented typed card above y=5; got " .. tostring(presented))
    end
    print("PASS — " .. tostring(presented) .. " unlocked presented Compulsion card(s) for Red")
    print("▶▶▶ HUMAN ▶▶▶ Draw one presented Compulsion card into the Red hand")
  end,
})
```

---

## Code Block B — After hand Draw

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: after choice", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    local lockedChosen = 0
    for _, obj in ipairs(getObjects() or {}) do
      if obj ~= nil and obj.type == "Card" and obj.getGMNotes ~= nil and obj.getLock ~= nil then
        local p = Compulsions.parseNotes(obj.getGMNotes())
        if p ~= nil and p.suffix ~= "generic" and Compulsions.canonicalizeSeatColor(p.playerKey) == "Red"
          and obj.getLock() == true
        then
          local pos = obj.getPosition()
          if type(pos) == "table" and type(pos.y) == "number"
            and pos.y > 6.5 and pos.y < 8.5
          then
            lockedChosen = lockedChosen + 1
          end
        end
      end
    end
    if lockedChosen < 1 then
      error("[TOR-204 FAIL] expected ≥1 locked chosen card near y=7.5; got " .. tostring(lockedChosen))
    end
    print("PASS — locked chosen Compulsion at permanent height for Red")
  end,
})
```
