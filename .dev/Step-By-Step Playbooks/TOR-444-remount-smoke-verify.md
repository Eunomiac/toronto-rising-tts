# Global XmlUI remount smoke _(TOR-444)_

## Agent Routing

Read this when:

- smoking shipped TOR-444 remount cuts after Save & Play (shared refs / Court / blindfold, location dock, sidebar tint)
- checking that remount-weight work still opens player HUD panels correctly (solo Host)

Source of truth:

- `.dev/HUDs & Overlays/Global-UI-Image-Stacks.md`
- `core/hud_player.ttslua`, `core/hud_overlays.ttslua`
- `ui/shared/panel_ref_panels_nestedless.xml`, `ui/shared/panel_ref_princes_court.xml`, `ui/shared/panel_overlay_transition_blindfold.xml`

Verification:

- this playbook (Save & Play + solo Host)

Confirm remount-weight cuts still open nestedless refs, Prince’s Court, the shared transition blindfold, and the location-dock district Image correctly after Save & Play. This does **not** cover map Option B / district Strategy 1 (not shipped yet), Court pip meters, hunger stack collapse, or TOR-439 Arm/join timeouts.

**Linear:** [TOR-444 — Global XmlUI remount weight](https://linear.app/eunomiac-dev/issue/TOR-444/global-xmlui-remount-weight-stacks-chrome-tint-shared-visibility)
**Background:** [Global-UI-Image-Stacks](../HUDs%20&%20Overlays/Global-UI-Image-Stacks.md)

## What this playbook checks

1. **Structural remount** — shared element ids exist; old per-seat / stack sibling ids are gone.
2. **Nestedless Rolls** — open via state; audience includes Red; you confirm the shared popup looks right.
3. **Prince’s Court** — shared tree + single tracker Images; you flip to page 2; Lua asserts page audience.
4. **Shared blindfold** — arm shared panel via `U`/`UI` (mirrors `HO.applyBlindfoldVariantForSeatedPlayers`); you confirm FadeIn; Lua hides and continues.
5. **Location dock + sidebar tint** — district `image=` on the single per-seat Image; hover sibling chrome absent.

## Prerequisites (human — keep short)

- **Save & Play** — required (TOR-444 Lua/XML remount work).
- **Host** connected (solo is fine).

Everything else — Red seat, Table A, HUD state — is automated in **Code Block 0**.

Test constants (shared via `_G.TOR444`):

| What | Value |
| --- | --- |
| Test seat | `Red` |
| Nestedless ref | `rolls` |
| Court pages | 1 → 2 (you click next) |
| Blindfold variant | `3` |
| Location district | `Annex` → `districtCard_Annex` |

## Run order

**Step 1.** **Save & Play**.

**Step 1b (optional).** If a prior run left the shared blindfold (or refs) up — Execute Lua Code — **Code Block Cleanup**, then continue from **Step 2** (0 → A → B). Cleanup resets Court to page 1 and closes refs — **do not** jump to Block B after Cleanup alone (B expects page 2 from A’s navigate click).

**Step 2.** Execute Lua Code — **Code Block 0**. Watch for `▶▶▶ HUMAN ▶▶▶` — confirm the Rolls reference popup looks correct (shared image, not a blank/broken panel).

**Step 3.** Execute Lua Code — **Code Block A**. When prompted: **confirm Court page 1 looks correct**, then **click the Court navigate-right control once** (to page 2).

**Step 4.** Execute Lua Code — **Code Block B** (only after A + navigate). When prompted: **confirm the shared transition blindfold FadeIn** (full-screen blindfold art). The sequence pauses briefly, then hides the blindfold and finishes location/sidebar asserts.

**Step 5.** When the console prints **Verification complete**, you are done.

---

## Code Block Cleanup — restore starting UI (safe to re-run anytime)

Use after an interrupted Block B (stuck shared blindfold), or before re-pasting Block 0/A/B. Does not require a prior successful Block 0; uses `_G.TOR444` when present, else Red defaults. After Cleanup, resume at **Code Block 0** (or at least **A** if you only need Court→B); Cleanup sets `princesCourtPage = 1`, so Block B’s page-2 assert will fail if you skip A + the navigate click.

```lua
-- Execute Lua cannot require(); use globals (S/U/C/Sync) only.
if type(_G.TOR444) ~= "table" then
  _G.TOR444 = {
    seat = "Red",
    tableKey = "Table A",
    refKey = "rolls",
    districtKey = "Annex",
    blindfoldVariant = 3,
  }
end

local F = _G.TOR444
local seat = F.seat or "Red"

local function tor444HudPid()
  local p = Player[seat]
  if not U.isPlayer(p) then
    return nil
  end
  local sid = S.getStorageID(p)
  if type(sid) ~= "string" or sid == "" then
    return nil
  end
  return sid
end

printHeader("TOR-444: Cleanup", 1)

-- Shared transition blindfold → hidden + XML defaults
UI.hide("playerHud_overlay_blindfold")
U.setAttribute("playerHud_overlay_blindfold", "active", "false")
U.setVisibleTo("playerHud_overlay_blindfold", {})
U.setAttributes("overlay_blindfold_display", {
  image = "overlay_blindfold_1",
  active = "true",
  color = "White",
})
U.setAttributes("overlay_district_card_display", {
  active = "false",
  color = "Clear",
  image = "",
})
U.setAttributes("overlay_site_card_display", {
  active = "false",
  color = "Clear",
  image = "",
})
print("PASS — shared transition blindfold hidden + display defaults")

-- Nestedless + Court shared refs → closed (visibility None, active false)
local refIds = {
  "playerHud_refPanel_rolls",
  "playerHud_refPanel_chronicleTenets",
  "playerHud_refPanel_socialCombat",
  "playerHud_refPanel_physicalCombat",
  "playerHud_refPanel_frenzy",
  "playerHud_refPanel_memoriam",
  "playerHud_refPanel_projects",
  "playerHud_refPanel_experience",
  "playerHud_refPanel_princesCourt",
  "playerHud_refPanel_PrincesCourt_page1",
  "playerHud_refPanel_PrincesCourt_page2",
  "playerHud_refPanel_PrincesCourt_page3",
}
for _, id in ipairs(refIds) do
  U.setVisibleTo(id, {})
  U.setAttribute(id, "active", "false")
  if type(UI.hide) == "function" and string.find(id, "PrincesCourt_page", 1, true) then
    UI.hide(id)
  end
end
print("PASS — shared ref / Court panels closed")

-- HUD state for seated Player (Host hotseat → storage id)
local pid = tor444HudPid()
if type(pid) == "string" then
  if type(S.getStateVal("playerData", pid, "hud")) ~= "table" then
    S.setStateVal({}, "playerData", pid, "hud")
  end
  if type(S.getStateVal("playerData", pid, "hud", "reference")) ~= "table" then
    S.setStateVal({}, "playerData", pid, "hud", "reference")
  end
  local nestedless = {
    "chronicleTenets",
    "socialCombat",
    "physicalCombat",
    "frenzy",
    "rolls",
    "memoriam",
    "projects",
    "experience",
  }
  for _, k in ipairs(nestedless) do
    S.setStateVal(false, "playerData", pid, "hud", "reference", k)
  end
  S.setStateVal(nil, "playerData", pid, "hud", "reference", "coteries")
  S.setStateVal(nil, "playerData", pid, "hud", "reference", "princesCourt")
  S.setStateVal(1, "playerData", pid, "hud", "reference", "princesCourtPage")
  Sync.player(seat)
  print("PASS — hud.reference cleared + Sync.player (" .. pid .. ")")
else
  print("PASS — skipped hud.reference clear (Player." .. seat .. " / storage id unavailable)")
end

print("PASS — TOR-444 cleanup complete. Safe to re-run Code Block 0, A, or B.")
```

---

## Code Block 0 — Setup, structural asserts, open Rolls

```lua
_G.TOR444 = {
  seat = "Red",
  tableKey = "Table A",
  refKey = "rolls",
  districtKey = "Annex",
  blindfoldVariant = 3,
}

-- Execute Lua cannot require(); use globals (S/U/C/Sync/DEBUG) only.
-- HUDP.updatePlayerUI keys off S.getStorageID(Player[seat]) (Host hotseat ≠ steam/ST id,
-- not chronicle getPlayerID(seat)). All hud.reference writes must use that same id.

local function tor444Fixture()
  local F = _G.TOR444
  if type(F) ~= "table" then
    error("[FAIL] _G.TOR444 missing — paste Code Block 0 from the playbook first")
  end
  return F
end

--- Storage id HUDP.updatePlayerUI reads for the seated Player (Host-on-Red → ST/steam id).
local function tor444HudPid(F)
  local p = Player[F.seat]
  if not U.isPlayer(p) then
    error("[FAIL] Player." .. F.seat .. " nil")
  end
  local sid = S.getStorageID(p)
  if type(sid) ~= "string" or sid == "" then
    error("[FAIL] S.getStorageID nil for seated " .. F.seat)
  end
  return sid
end

--- Ensure playerData[hudPid].hud.reference exists so updatePlayerUI does not early-return.
local function tor444EnsureHudReference(F)
  local pid = tor444HudPid(F)
  if type(S.getStateVal("playerData", pid)) ~= "table" then
    S.setStateVal({ color = F.seat }, "playerData", pid)
  end
  if type(S.getStateVal("playerData", pid, "hud")) ~= "table" then
    S.setStateVal({}, "playerData", pid, "hud")
  end
  if type(S.getStateVal("playerData", pid, "hud", "reference")) ~= "table" then
    S.setStateVal({}, "playerData", pid, "hud", "reference")
  end
  return pid
end

local function tor444AssertHasAttr(id, attr)
  local val = UI.getAttribute(id, attr)
  if val == nil then
    error("[FAIL] missing attribute " .. tostring(attr) .. " on " .. tostring(id))
  end
  return val
end

local function tor444AssertMissing(id)
  local ok, active = pcall(function()
    return UI.getAttribute(id, "active")
  end)
  if ok and active ~= nil then
    error("[FAIL] remount leftover still present: " .. id .. " active=" .. tostring(active))
  end
  print("PASS — absent " .. id)
end

local function tor444AssertAudienceContains(id, color)
  local aud = U.getVisibilityAudience(id)
  for _, tok in ipairs(aud or {}) do
    if tok == color then
      print("PASS — audience " .. id .. " includes " .. color)
      return
    end
  end
  error(
    "[FAIL] audience of "
      .. id
      .. " missing "
      .. color
      .. " got "
      .. tostring(U.serializeVisibilityAudience(aud))
  )
end

local function tor444ClearRefs(F)
  local pid = tor444EnsureHudReference(F)
  local nestedless = {
    "chronicleTenets",
    "socialCombat",
    "physicalCombat",
    "frenzy",
    "rolls",
    "memoriam",
    "projects",
    "experience",
  }
  for _, k in ipairs(nestedless) do
    S.setStateVal(false, "playerData", pid, "hud", "reference", k)
  end
  S.setStateVal(nil, "playerData", pid, "hud", "reference", "coteries")
  S.setStateVal(nil, "playerData", pid, "hud", "reference", "princesCourt")
end

--- Sync.player → HUDP.updatePlayerUI (HUDP is a Global local; not visible here).
local function tor444UpdateHud(F)
  Sync.player(F.seat)
end

U.chain({
  function()
    printHeader("TOR-444: Session setup", 1)
  end,
  function()
    if #(Player.getPlayers() or {}) < 1 then
      error("[Setup FAIL] Host not connected")
    end
    rollE2eSeatPrep(_G.TOR444.seat)
    DEBUG.syncTableSimplified(_G.TOR444.tableKey)
    print("PASS — session prepared (Red seat, Table A)")
  end,
  function()
    printHeader("TOR-444: Verify ready", 1)
  end,
  function()
    local F = tor444Fixture()
    if Player[F.seat] == nil then
      error("[Verify FAIL] Host not on " .. F.seat .. " after rollE2eSeatPrep")
    end
    if S.getStateVal("seatLayout", "currentTableKey") ~= F.tableKey then
      error("[Verify FAIL] table key not " .. F.tableKey)
    end
    local hudPid = tor444EnsureHudReference(F)
    print("PASS — prerequisites satisfied (hudPid=" .. hudPid .. ")")
  end,
  function()
    printHeader("TOR-444: Structural remount ids", 1)
  end,
  function()
    local F = tor444Fixture()
    tor444AssertHasAttr("playerHud_refPanel_rolls", "image")
    tor444AssertHasAttr("playerHud_refPanel_princesCourt", "active")
    tor444AssertHasAttr("playerHud_overlay_blindfold", "active")
    tor444AssertHasAttr("overlay_blindfold_display", "image")
    tor444AssertHasAttr("box_health_1_Red", "image")
    tor444AssertHasAttr("gameStateOverlay_districtCard_current_" .. F.seat, "image")
    tor444AssertHasAttr("playerHud_RSidebarBtn_ref_rolls_" .. F.seat, "color")
    print("PASS — shared / collapsed ids present")
  end,
  function()
    local F = tor444Fixture()
    tor444AssertMissing("playerHud_refPanel_rolls_" .. F.seat)
    tor444AssertMissing("playerHud_overlay_blindfold_" .. F.seat)
    tor444AssertMissing("playerHud_RSidebarBtn_ref_rolls_" .. F.seat .. "_hover")
    tor444AssertMissing("playerHud_RSidebarBtn_ref_rolls_" .. F.seat .. "_active")
    tor444AssertMissing("box_health_1_Red_hover")
    tor444AssertMissing("box_health_1_Red_active")
    print("PASS — old per-seat / stack siblings absent")
  end,
  function()
    printHeader("TOR-444: Open shared Rolls", 1)
  end,
  function()
    local F = tor444Fixture()
    local pid = tor444EnsureHudReference(F)
    tor444ClearRefs(F)
    S.setStateVal(true, "playerData", pid, "hud", "reference", F.refKey)
    tor444UpdateHud(F)
    print("PASS — Rolls opened via state + Sync.player (pid=" .. pid .. ")")
  end,
  function()
    local F = tor444Fixture()
    local id = "playerHud_refPanel_" .. F.refKey
    local active = tor444AssertHasAttr(id, "active")
    if active ~= "true" and active ~= true then
      error("[FAIL] " .. id .. " active expected true, got " .. tostring(active))
    end
    tor444AssertAudienceContains(id, F.seat)
  end,
  function()
    print(
      "   ▶▶▶ HUMAN ▶▶▶ Confirm the Rolls popup shows its reference image (not blank/broken), then run Code Block A."
    )
  end,
})
```

---

## Code Block A — Court open + page flip gate

```lua
-- Execute Lua cannot require(); use globals (S/U/C/Sync) only.
-- HUD state must use S.getStorageID(Player[seat]) — same id HUDP.updatePlayerUI reads.

local function tor444Fixture()
  local F = _G.TOR444
  if type(F) ~= "table" then
    error("[FAIL] _G.TOR444 missing — paste Code Block 0 first")
  end
  return F
end

local function tor444HudPid(F)
  local p = Player[F.seat]
  if not U.isPlayer(p) then
    error("[FAIL] Player." .. F.seat .. " nil")
  end
  local sid = S.getStorageID(p)
  if type(sid) ~= "string" or sid == "" then
    error("[FAIL] S.getStorageID nil for seated " .. F.seat)
  end
  return sid
end

local function tor444EnsureHudReference(F)
  local pid = tor444HudPid(F)
  if type(S.getStateVal("playerData", pid)) ~= "table" then
    S.setStateVal({ color = F.seat }, "playerData", pid)
  end
  if type(S.getStateVal("playerData", pid, "hud")) ~= "table" then
    S.setStateVal({}, "playerData", pid, "hud")
  end
  if type(S.getStateVal("playerData", pid, "hud", "reference")) ~= "table" then
    S.setStateVal({}, "playerData", pid, "hud", "reference")
  end
  return pid
end

local function tor444AssertHasAttr(id, attr)
  local val = UI.getAttribute(id, attr)
  if val == nil then
    error("[FAIL] missing attribute " .. tostring(attr) .. " on " .. tostring(id))
  end
  return val
end

local function tor444AssertAudienceContains(id, color)
  local aud = U.getVisibilityAudience(id)
  for _, tok in ipairs(aud or {}) do
    if tok == color then
      print("PASS — audience " .. id .. " includes " .. color)
      return
    end
  end
  error(
    "[FAIL] audience of "
      .. id
      .. " missing "
      .. color
      .. " got "
      .. tostring(U.serializeVisibilityAudience(aud))
  )
end

local function tor444ClearRefs(F)
  local pid = tor444EnsureHudReference(F)
  local nestedless = {
    "chronicleTenets",
    "socialCombat",
    "physicalCombat",
    "frenzy",
    "rolls",
    "memoriam",
    "projects",
    "experience",
  }
  for _, k in ipairs(nestedless) do
    S.setStateVal(false, "playerData", pid, "hud", "reference", k)
  end
  S.setStateVal(nil, "playerData", pid, "hud", "reference", "coteries")
  S.setStateVal(nil, "playerData", pid, "hud", "reference", "princesCourt")
end

local function tor444UpdateHud(F)
  Sync.player(F.seat)
end

U.chain({
  function()
    printHeader("TOR-444: Open shared Court", 1)
  end,
  function()
    local F = tor444Fixture()
    local pid = tor444EnsureHudReference(F)
    tor444ClearRefs(F)
    S.setStateVal({}, "playerData", pid, "hud", "reference", "princesCourt")
    S.setStateVal(1, "playerData", pid, "hud", "reference", "princesCourtPage")
    tor444UpdateHud(F)
    print("PASS — Court opened on page 1 (pid=" .. pid .. ")")
  end,
  function()
    local F = tor444Fixture()
    tor444AssertAudienceContains("playerHud_refPanel_princesCourt", F.seat)
    tor444AssertAudienceContains("playerHud_refPanel_PrincesCourt_page1", F.seat)
    local img = tor444AssertHasAttr("box_health_1_Red", "image")
    if type(img) ~= "string" or img == "" then
      error("[FAIL] box_health_1_Red image empty")
    end
    print("PASS — Court root/page1 audience + tracker Image ok (" .. img .. ")")
  end,
  function()
    print(
      "   ▶▶▶ HUMAN ▶▶▶ Confirm Court page 1 looks correct, then click navigate-right once (to page 2), then run Code Block B."
    )
  end,
})
```

---

## Code Block B — Page 2 assert, blindfold, location dock, done

```lua
-- Execute Lua cannot require(); use globals (S/U/C/Sync) only.
-- HUD state must use S.getStorageID(Player[seat]) — same id HUDP.updatePlayerUI reads.

local function tor444Fixture()
  local F = _G.TOR444
  if type(F) ~= "table" then
    error("[FAIL] _G.TOR444 missing — paste Code Block 0 first")
  end
  return F
end

local function tor444HudPid(F)
  local p = Player[F.seat]
  if not U.isPlayer(p) then
    error("[FAIL] Player." .. F.seat .. " nil")
  end
  local sid = S.getStorageID(p)
  if type(sid) ~= "string" or sid == "" then
    error("[FAIL] S.getStorageID nil for seated " .. F.seat)
  end
  return sid
end

local function tor444AssertHasAttr(id, attr)
  local val = UI.getAttribute(id, attr)
  if val == nil then
    error("[FAIL] missing attribute " .. tostring(attr) .. " on " .. tostring(id))
  end
  return val
end

local function tor444AssertAudienceContains(id, color)
  local aud = U.getVisibilityAudience(id)
  for _, tok in ipairs(aud or {}) do
    if tok == color then
      print("PASS — audience " .. id .. " includes " .. color)
      return
    end
  end
  error(
    "[FAIL] audience of "
      .. id
      .. " missing "
      .. color
      .. " got "
      .. tostring(U.serializeVisibilityAudience(aud))
  )
end

local function tor444UpdateHud(F)
  Sync.player(F.seat)
end

--- Inline HO.applyBlindfoldVariantForSeatedPlayers (HO is a Global local).
--- Set display image *after* UI.show — parent show re-applies XML default image=overlay_blindfold_1.
local function tor444ArmSharedBlindfold(F)
  local panelId = "playerHud_overlay_blindfold"
  local displayId = "overlay_blindfold_display"
  local v = tonumber(F.blindfoldVariant) or 3
  U.setAttribute(panelId, "active", "false")
  local tokens = {}
  local seen = {}
  for _, player in ipairs(Player.getPlayers() or {}) do
    local color = player and player.color or nil
    if type(color) == "string" and seen[color] ~= true and U.isIn(color, C.PlayerColors) then
      seen[color] = true
      tokens[#tokens + 1] = color
    end
  end
  U.setVisibleTo(panelId, tokens)
  UI.show(panelId)
  U.setAttribute(displayId, "image", "overlay_blindfold_" .. tostring(v))
  U.setAttribute(displayId, "active", "true")
  U.setAttribute(displayId, "color", "White")
end

U.chain({
  function()
    printHeader("TOR-444: Court page 2 after navigate", 1)
  end,
  function()
    local F = tor444Fixture()
    local pid = tor444HudPid(F)
    local page = tonumber(S.getStateVal("playerData", pid, "hud", "reference", "princesCourtPage"))
    if page ~= 2 then
      error("[FAIL] princesCourtPage expected 2 after navigate click, got " .. tostring(page) .. " (pid=" .. pid .. ")")
    end
    tor444AssertAudienceContains("playerHud_refPanel_PrincesCourt_page2", F.seat)
    print("PASS — Court page 2 state + audience")
  end,
  function()
    printHeader("TOR-444: Shared transition blindfold", 1)
  end,
  function()
    local F = tor444Fixture()
    tor444ArmSharedBlindfold(F)
    local want = "overlay_blindfold_" .. tostring(F.blindfoldVariant)
    local got = tor444AssertHasAttr("overlay_blindfold_display", "image")
    if got ~= want then
      error("[FAIL] overlay_blindfold_display image expected " .. want .. " got " .. tostring(got))
    end
    tor444AssertAudienceContains("playerHud_overlay_blindfold", F.seat)
    print("PASS — shared blindfold variant " .. tostring(F.blindfoldVariant) .. " armed")
  end,
  function()
    print(
      "   ▶▶▶ HUMAN ▶▶▶ Confirm the shared transition blindfold FadeIn looks correct — sequence continues automatically after a short pause."
    )
    return 3.5
  end,
  function()
    UI.hide("playerHud_overlay_blindfold")
    print("PASS — shared blindfold hidden after visual check")
  end,
  function()
    printHeader("TOR-444: Location dock + sidebar tint", 1)
  end,
  function()
    local F = tor444Fixture()
    S.setStateVal(F.districtKey, "sessionScene", "districtKey")
    tor444UpdateHud(F)
    local dockId = "gameStateOverlay_districtCard_current_" .. F.seat
    local want = "districtCard_" .. F.districtKey
    local got = tor444AssertHasAttr(dockId, "image")
    if got ~= want then
      error("[FAIL] " .. dockId .. " image expected " .. want .. " got " .. tostring(got))
    end
    print("PASS — location dock district image=" .. got)
  end,
  function()
    local F = tor444Fixture()
    local chromeId = "playerHud_RSidebarBtn_ref_princesCourt_" .. F.seat
    local color = tor444AssertHasAttr(chromeId, "color")
    if type(color) ~= "string" or color == "" then
      error("[FAIL] sidebar chrome color empty on " .. chromeId)
    end
    print("PASS — sidebar Option A tint color present (" .. color .. ")")
  end,
  function()
    print("PASS — TOR-444 remount smoke complete. Verification complete. No further action.")
  end,
})
```
