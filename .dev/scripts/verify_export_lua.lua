-- Execute the generated modules through their actual runtime entry points.
-- No TTS objects or saved game state are needed for these data contracts.
package.path = "./?.ttslua;./?.lua;" .. package.path
package.loaded["lib.util"] = { trim = function(value) return value:match("^%s*(.-)%s*$") end }
Color = function() return {} end
local function count(rows)
  local n = 0
  for _ in pairs(rows) do n = n + 1 end
  return n
end
local D = require("lib.npcs_data")
local unique = require("lib.unique_character_catalog")
local generic = require("lib.generic_character_catalog")
local art = require("lib.npc_art_urls")
assert(count(unique) > 0)
for key, row in pairs(unique) do
  assert(D.characters[key] == row, "Missing runtime character " .. key)
  if row.canonicalKey then
    assert(D.characters[row.canonicalKey], "Missing canonical identity " .. key)
  end
  local assetKey = row.filename:match("^npc_(.+)%.webp$")
  if art[assetKey] then assert(art[key] == art[assetKey], "Filename association lost for " .. key) end
end
for _, key in ipairs({ "lordLucien", "rashid", "aishe", "fomorach", "blackCaesar" }) do
  assert(D.characters[key].isPC == true)
  assert(D.getNpcCharacters()[key] == nil, "PC leaked into NPC runtime view")
end
for _, key in ipairs({ "chokesOnMoonlightGarou", "fangsAtTheCradleGarou", "moltsInShadowGarou", "rotInTheRiverGarou", "stalksTheTangleGarou" }) do
  assert(D.characters[key].werewolf == true, "Garou form lost Werewolf rolls")
end
D.initGenericNPCs()
assert(count(D.genericNpcs) == count(generic), "Generic figures lost or duplicated by tiers")
for key in pairs(generic) do assert(D.resolveGenericNpcEntry(key), "Generic absent from runtime: " .. key) end
for key, row in pairs(require("lib.memoriam_npc_catalog")) do
  assert((row.isGeneric and D.genericNpcs[key]) or D.characters[key], "Memoriam character absent: " .. key)
end
local locations = require("lib.locations_catalog")
local skyboxes = require("lib.skyboxes_catalog")
for key, row in pairs(locations.Sites) do
  if row.skybox then assert(skyboxes.Skyboxes[row.skybox], "Site skybox absent: " .. key) end
end
local schedule = require("lib.tr_weather_schedule")
assert(schedule.ROW_COUNT == 8784)
local cards = require("lib.complications_catalog")
assert(count(cards) > 0)
print("Lua export routing passed: " .. count(unique) .. " character keys, " .. count(generic) .. " generic figures, " .. count(locations.Sites) .. " sites, " .. schedule.ROW_COUNT .. " weather hours.")
