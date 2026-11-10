package.path = package.path .. ";./?.ttslua;./?/init.ttslua"

local PC = require("lib.personal_conditions")

local function card(fields)
  local row = {
    id = fields.id or "pc-1",
    seq = fields.seq or 1,
    appliedOn = fields.appliedOn or 1,
    displayOnSheet = fields.displayOnSheet ~= false,
    displayType = fields.displayType or "general",
    removalTrigger = fields.removalTrigger or "Manual",
    title = fields.title or "",
  }
  for key, value in pairs(fields) do
    row[key] = value
  end
  return row
end

assert(PC.resonanceImage("fleetingly", "Choleric") == "resonance_fleetinglyCholeric", "resonance image")
assert(PC.backgroundImage("theBeast") == "bg_condition_theBeast", "beast background")
assert(PC.durationForTrigger("EndOfScene") == "This Condition persists until the end of the current scene.", "scene duration")
assert(PC.durationForTrigger("EndOfSession4") == "This Condition persists until the end of Session 4.", "session duration")
assert(PC.durationForTrigger("Clock:2026-09-04") == "This Condition persists until nightfall on Sept 4th, 2026.", "date duration")
assert(PC.durationForTrigger("Manual") == "", "manual duration")
assert(PC.durationForTrigger("ChangeOfBlood"):find("Hunger reaches 5", 1, true) ~= nil, "blood duration")

local list = {
  card({ id = "late", seq = 2, appliedOn = 5, title = "Late" }),
  card({ id = "early", seq = 1, appliedOn = 1, title = "Early" }),
  card({ id = "hidden", displayOnSheet = false, title = "Hidden" }),
  card({
    id = "res",
    displayType = "resonance",
    temperament = "acutely",
    resonanceType = "Sanguine",
    dyscrasiaTitle = "Thin blood",
    dyscrasiaDescription = "It clots.",
  }),
}
assert(#PC.sheetCards(list) == 2, "hidden and resonance stay off the eight slots")
assert(PC.sheetCards(list)[1].id == "early", "older card fills the first slot")
assert(PC.sheetSlotCount(list) == 2, "slot count")

local page1 = PC.sheetUpdates(1, list)
local function attr(updates, id, key)
  for i = 1, #updates do
    if updates[i].id == id then
      return updates[i].attributes[key]
    end
  end
  return nil
end
assert(attr(page1, "resonance_tag", "image") == "resonance_acutelySanguine", "resonance art")
assert(attr(page1, "dyscrasia_title", "text") == "Thin blood", "dyscrasia title")

list[4].dyscrasiaTitle = ""
assert(attr(PC.sheetUpdates(1, list), "dyscrasia_title", "text") == "Dyscrasia Title", "blank dyscrasia keeps the sample title")
assert(attr(PC.sheetUpdates(1, list), "resonance_tag", "image") == "resonance_acutelySanguine", "resonance art stays")

local page2 = PC.sheetUpdates(2, list)
assert(attr(page2, "condition_container_1_title", "text") == "Early", "first title")
assert(attr(page2, "condition_container_2_background", "image") == "bg_condition_general", "second background")
assert(attr(page2, "condition_container_3_background", "image") == nil, "an empty slot is not drawn")

local scene = { card({ removalTrigger = "EndOfScene" }) }
assert(PC.markSceneLeave(scene, 1) == true, "scene leave marks the card")
assert(scene[1].pending == "EndOfScene", "scene pending")
assert(PC.markSceneLeave(scene, 1) == false, "the same leave does not ask twice")
PC.skipCard(scene[1])
assert(scene[1].pending == nil, "skip clears the ask")
assert(scene[1].removalTrigger == "EndOfScene", "skip keeps an end-of-scene trigger")
assert(PC.markSceneLeave(scene, 1) == false, "skip waits for a later leave")
assert(PC.markSceneLeave(scene, 2) == true, "the next leave asks again")

local blood = { card({ removalTrigger = "ChangeOfBlood" }) }
assert(PC.markHunger(blood, 2, 2) == false, "unchanged hunger is ignored")
assert(PC.markHunger(blood, 2, 3) == false, "a climb that is not into 5 is ignored")
assert(PC.markHunger(blood, 4, 5) == true, "climbing into 5 asks")
PC.skipCard(blood[1])
assert(PC.markHunger(blood, 4, 5) == false, "the same climb does not ask again")
assert(PC.markHunger(blood, 5, 3) == true, "a later drop asks")

local session = { card({ removalTrigger = "EndOfSession3" }) }
assert(PC.markSessionEnd(session, 2) == false, "an earlier session does not ask")
assert(PC.markSessionEnd(session, 3) == true, "the stored session asks")
PC.skipCard(session[1])
assert(session[1].removalTrigger == "Manual", "skipping a session makes it manual")

local dated = { card({ removalTrigger = "Clock:2026-09-04" }) }
local before = { year = 2026, month = 9, day = 4, hour = 18, minute = 0 }
local after = { year = 2026, month = 9, day = 4, hour = 19, minute = 30 }
local dusk = function()
  return 19, 15
end
assert(PC.markClock(dated, before, dusk) == false, "before dusk does not ask")
assert(PC.markClock(dated, after, dusk) == true, "after dusk asks")
PC.skipCard(dated[1])
assert(dated[1].removalTrigger == "Manual", "skipping a date makes it manual")

assert(PC.hungerChangeQualifies(5, 4) == true, "a drop qualifies")
assert(PC.hungerChangeQualifies(5, 5) == false, "staying at 5 does not")

print("personal conditions ok")
