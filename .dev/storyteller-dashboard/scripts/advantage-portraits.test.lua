package.path = "./?.ttslua;" .. package.path

local function clone(value)
  if type(value) ~= "table" then return value end
  local out = {}
  for key, item in pairs(value) do out[key] = clone(item) end
  return out
end
local state = { playerData = { pc = { stats = { backgrounds = {}, merits = {}, flaws = {} } } } }
local S = {}
function S.getStateVal(...)
  local value = state
  for _, key in ipairs({...}) do value = type(value) == "table" and value[key] or nil end
  return value
end
function S.setStateVal(value, ...)
  local keys, parent = {...}, state
  for i = 1, #keys - 1 do parent = parent[keys[i]] end
  parent[keys[#keys]] = value
end
package.loaded["core.state"] = S
package.loaded["lib.util"] = { clone = clone, Type = type, setAttribute = function() end }
package.loaded["lib.constants"] = { PlayerData = { pc = { charKey = "rashid" } } }
package.loaded["lib.pc_sheet_collect"] = {}
package.loaded["core.projects"] = { stakeQtyForAdvantage = function() return 0 end }
package.loaded["lib.coterie_data"] = { getDecoded = function() return {} end }
package.loaded["lib.npc_portrait_assets"] = {
  theAristocrat = { coterie = "npcPortrait_theAristocrat" },
  lalehBintSaif = { rashid = "npcPortrait_lalehBintSaif" },
}
package.loaded["lib.unique_character_catalog"] = {
  theAristocrat = { fullName = "The Aristocrat" }, lalehBintSaif = { fullName = "Laleh" },
}
local hydrate = require("lib.coterie_hydrate")
state.coterieData = hydrate.hydrateCoterieData({coterieFlaws = {
  {name = "First", max = 1, base = 1}, {name = "Second", max = 2, base = 2},
}})
local bridge = require("dashboard.pc_sheet_traits")
local function entry(name, portrait)
  return {name = name, max = 6, base = 3, temp = 1, disabled = 1,
    description = {"Description"}, rules = {"Rules"}, portrait = portrait}
end
assert(bridge.portraitOptions("coterie")[1].value == "npcPortrait_theAristocrat")
assert(bridge.ops.advantageUpsert("Purple", "pc", {type = "merits", entry = entry("PC", "npcPortrait_theAristocrat")}))
assert(#state.playerData.pc.stats.merits == 0)
assert(not bridge.ops.advantageUpsert("Purple", "pc", {type = "merits", entry = entry("PC", "npcPortrait_lalehBintSaif")}))
assert(state.playerData.pc.stats.merits[1].portrait == "npcPortrait_lalehBintSaif")
assert(not bridge.ops.advantageUpsert("Purple", "pc", {type = "merits", index = 1, expectName = "PC", entry = entry("PC", "")}))
assert(state.playerData.pc.stats.merits[1].portrait == nil)

assert(not bridge.ops.courtAdvantageUpsert("Purple", "pc", {
  scope = "coterie", type = "flaws", entry = entry("Court", "npcPortrait_theAristocrat"),
}))
assert(state.coterieData.coterieFlaws[3].portrait == "npcPortrait_theAristocrat")
assert(state.coterieData.coterieFlaws[3].max == 6)
assert(not bridge.ops.courtAdvantageDelete("Purple", "pc", {
  scope = "coterie", type = "flaws", index = 1, expectName = "First",
}))
assert(state.coterieData.coterieFlaws[2].name == "Second", "deletion shifted baked XML IDs")
assert(state.coterieData.coterieFlaws[3].name == "Court")
assert(bridge.ops.courtAdvantageDelete("Purple", "pc", {
  scope = "coterie", type = "flaws", index = 2, expectName = "Stale",
}))
for _, row in ipairs(state.coterieData.coterieMerits) do row.active = true end
assert(bridge.ops.courtAdvantageUpsert("Purple", "pc", {
  scope = "coterie", type = "merits", fromType = "flaws", index = 3,
  expectName = "Court", entry = entry("Court", "npcPortrait_theAristocrat"),
}))
assert(state.coterieData.coterieFlaws[3].name == "Court", "full destination removed the source")
state.coterieData.coterieMerits[1].active = false
assert(not bridge.ops.courtAdvantageUpsert("Purple", "pc", {
  scope = "coterie", type = "merits", fromType = "flaws", index = 3,
  expectName = "Court", entry = entry("Court", "npcPortrait_theAristocrat"),
}))
assert(state.coterieData.coterieFlaws[3].active == false)
assert(state.coterieData.coterieMerits[1].portrait == "npcPortrait_theAristocrat")
assert(not bridge.ops.courtAdvantageUpsert("Purple", "pc", {
  scope = "coterie", type = "merits", index = 1, expectName = "Court", entry = entry("Court", ""),
}))
assert(state.coterieData.coterieMerits[1].portrait == nil)
local template = require("lib.trait_sheet_xml")
local params = template.buildTraitBlockParams(entry("PC", "npcPortrait_lalehBintSaif"), "bg", 0, false, {})
assert(params.IMAGE_REF == "npcPortrait_lalehBintSaif")
local tpl = require("lib.ui_xml_template")
tpl.registerPack(require("lib.ui_xml_templates_csheet_page3"))
assert(tpl.apply("csheet/partials/bg_block", params):find("npcPortrait_lalehBintSaif", 1, true))
local fixed = template.buildTraitBlockParams({name = "One", base = 1, max = 1}, "bg", 0, false, {fixedDotSlots = 6})
assert(fixed.DOT_ACTIVE_1 == "true" and fixed.DOT_ACTIVE_6 == "false")
print("PC and Court portrait persistence, recipient validation, fixed slots, and failed-move safety passed.")
