# Compulsions deck pick-and-present _(TOR-204)_

## Agent Routing

Read this when:
- verifying Compulsions generic draw → DRAWN pose → staggered present → SELECTED + light → removal (TOR-204)
- debugging leave-container / hand-zone Compulsion handlers

Source of truth:
- `core/compulsions.ttslua`
- `core/global_script.ttslua` (`onObjectLeaveContainer`, `onObjectEnterZone`)
- Linear [TOR-204](https://linear.app/eunomiac-dev/issue/TOR-204/feature-compulsions-deck)

Verification:
- this playbook (Save & Play + human Draws)

Verify TOR-204: drawing a generic Compulsion from a seat deck locks the deck, lerps the generic to DRAWN, switches to `compulsions` camera, staggers four master matches to anchors, Drawing one into the hand moves it to SELECTED with `<Color>Object` + compulsion light ON, and Drawing the selected card into the hand returns it to master, turns the light OFF, and sets the seat deck `interactable = true` again.

GM Notes use **charKey** (e.g. `blackCaesar`), not seat color. Color for anchors/decks comes from `C.PlayerData[steam].charKey` → `.color`.

## Prerequisites (human — keep short)

- **Save & Play** after pulling this TOR-204 Lua.
- **Host** connected (solo is fine).
- Workshop already has (not inventable in Lua): per-seat decks with GM Notes `COMPULSION_DECK_<COLOR>`, generics `Compulsion:<Type>-<charKey>:generic`, master deck tagged `CompulsionsMasterDeck`, typed cards `Compulsion:<Type>-<charKey>:1`–`:4`, DRAWN/SELECTED anchors, and compulsion lights.

Fixture used below: **Purple** / `blackCaesar` (Roarshack). Change only if you smoke another seat.

## Run order

**Step 1.** **Save & Play.**

**Step 2.** Execute Lua Code — Code Block 0 (assert resolvers + notes parse).

**Step 3.** **At Purple: draw one card from that seat’s Compulsions deck.** Console should log `RunSequence present`; generic should lerp to DRAWN (~y=10, scaled); camera switches to `compulsions`; seat deck `interactable = false`; up to four typed cards stagger-lerp to anchors (not instant stack).

**Step 4.** Execute Lua Code — Code Block A (assert deck locked + presented cards).

**Step 5.** **Right-click Draw one presented Compulsion card into the Purple hand.** Unselected cards return to master instantly; chosen card lerps to SELECTED (~y=8.43, scaled); gains `PurpleObject` tag; compulsion light fades STANDARD over ~1s; deck stays `interactable = false`.

**Step 6.** Execute Lua Code — Code Block B (assert SELECTED card + light).

**Step 7.** **Optional:** switch table layout (scene Apply or table change) — confirm SELECTED card moves with Purple hand zone (`PurpleObject` rigid follow).

**Step 8.** **Right-click Draw the selected Compulsion into the Purple hand again (removal).** Card returns to master; `PurpleObject` tag removed; compulsion light OFF over ~0.5s; seat deck `interactable = true`.

**Step 9.** Execute Lua Code — Code Block C (assert deck unlocked after removal).

---

## Code Block 0 — Resolver + notes verify

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: Compulsions resolver verify", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    local parsed = Compulsions.parseNotes("Compulsion:Clan-blackCaesar:generic")
    if parsed == nil or parsed.type ~= "Clan" or parsed.playerKey ~= "blackCaesar" or parsed.suffix ~= "generic" then
      error("[TOR-204 FAIL] parseNotes generic failed")
    end
    if Compulsions.colorFromCharKey("blackCaesar") ~= "Purple" then
      error("[TOR-204 FAIL] colorFromCharKey(blackCaesar) expected Purple")
    end
    local master = Compulsions.resolveMasterDeck()
    if master == nil then
      error("[TOR-204 FAIL] CompulsionsMasterDeck tag not found — check workshop tag")
    end
    local deck = Compulsions.resolvePlayerDeck("Purple")
    if deck == nil then
      error("[TOR-204 FAIL] COMPULSION_DECK_PURPLE GM Notes not found — check seat deck identity")
    end
    print("PASS — parseNotes (charKey), master tag, COMPULSION_DECK_PURPLE resolved")
    print("▶▶▶ HUMAN ▶▶▶ Draw one card from Purple Compulsions deck (generic)")
  end,
})
```

---

## Code Block A — After generic draw + present

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: after generic draw", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    local deck = Compulsions.resolvePlayerDeck("Purple")
    if deck == nil then
      error("[TOR-204 FAIL] player deck missing after draw")
    end
    if deck.interactable == true then
      error("[TOR-204 FAIL] COMPULSION_DECK_PURPLE should be interactable=false during present")
    end
    local presented = 0
    for _, obj in ipairs(getObjects() or {}) do
      if obj ~= nil and (obj.type == "Card" or obj.tag == "Card") and obj.getGMNotes ~= nil and obj.getLock ~= nil then
        local p = Compulsions.parseNotes(obj.getGMNotes())
        if p ~= nil and p.suffix ~= "generic" and Compulsions.colorFromCharKey(p.playerKey) == "Purple"
          and obj.getLock() == true
        then
          local pos = obj.getPosition()
          if type(pos) == "table" and type(pos.y) == "number" and pos.y > 5 then
            presented = presented + 1
          end
        end
      end
    end
    if presented < 1 then
      error("[TOR-204 FAIL] expected ≥1 locked floating presented typed card above y=5; got " .. tostring(presented))
    end
    print("PASS — deck locked; " .. tostring(presented) .. " presented Compulsion card(s) for Purple")
    print("▶▶▶ HUMAN ▶▶▶ Draw one presented Compulsion card into the Purple hand")
  end,
})
```

---

## Code Block B — After selection (SELECTED + light)

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: after selection", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    local deck = Compulsions.resolvePlayerDeck("Purple")
    if deck ~= nil and deck.interactable == true then
      error("[TOR-204 FAIL] deck should stay locked while selected Compulsion is active")
    end
    local selected = 0
    for _, obj in ipairs(getObjects() or {}) do
      if obj ~= nil and (obj.type == "Card" or obj.tag == "Card") and obj.getGMNotes ~= nil and obj.getLock ~= nil then
        local p = Compulsions.parseNotes(obj.getGMNotes())
        if p ~= nil and p.suffix ~= "generic" and Compulsions.colorFromCharKey(p.playerKey) == "Purple"
          and obj.hasTag ~= nil and obj.hasTag("PurpleObject") == true
        then
          local pos = obj.getPosition()
          if type(pos) == "table" and type(pos.y) == "number" and pos.y > 6 and pos.y < 10 then
            selected = selected + 1
          end
        end
      end
    end
    if selected < 1 then
      error("[TOR-204 FAIL] expected ≥1 PurpleObject-tagged selected card near SELECTED height; got " .. tostring(selected))
    end
    print("PASS — selected Compulsion at SELECTED pose with PurpleObject tag")
    print("▶▶▶ HUMAN ▶▶▶ Optional table switch — card follows hand zone; then Draw selected into hand to remove")
  end,
})
```

---

## Code Block C — After removal (deck unlocked)

```lua
U.RunSequence({
  function()
    printHeader("TOR-204: after removal", 1)
  end,
  function()
    local Compulsions = require("core.compulsions")
    local deck = Compulsions.resolvePlayerDeck("Purple")
    if deck == nil then
      error("[TOR-204 FAIL] player deck missing after removal")
    end
    if deck.interactable ~= true then
      error("[TOR-204 FAIL] COMPULSION_DECK_PURPLE should be interactable=true after removal")
    end
    local tagged = 0
    for _, obj in ipairs(getObjects() or {}) do
      if obj ~= nil and (obj.type == "Card" or obj.tag == "Card") and obj.hasTag ~= nil and obj.hasTag("PurpleObject") == true then
        local p = Compulsions.parseNotes(obj.getGMNotes and obj.getGMNotes() or "")
        if p ~= nil and Compulsions.colorFromCharKey(p.playerKey) == "Purple" then
          tagged = tagged + 1
        end
      end
    end
    if tagged > 0 then
      error("[TOR-204 FAIL] expected no loose PurpleObject Compulsion cards after removal; got " .. tostring(tagged))
    end
    print("PASS — deck interactable; no active Purple Compulsion in world")
  end,
})
```
