-- Run from the repository root with Lua 5.2+ (or texlua).
package.path = "./?.ttslua;" .. package.path
local passed = 0
local function test(name, fn)
  local ok, err = pcall(fn)
  if not ok then error(name .. ": " .. tostring(err)) end
  passed = passed + 1
  print("ok " .. name)
end
local function eq(actual, expected)
  assert(actual == expected, tostring(actual) .. " ~= " .. tostring(expected))
end

local data, queued, messages, damages, dice, draws, syncs
local S = {}
function S.getStateVal(...)
  local value = data
  for _, key in ipairs({...}) do
    if type(value) ~= "table" then return nil end
    value = value[key]
  end
  return value
end
function S.setStateVal(value, ...)
  local keys, target = {...}, data
  for i = 1, #keys - 1 do
    target[keys[i]] = target[keys[i]] or {}
    target = target[keys[i]]
  end
  target[keys[#keys]] = value
end
function S.getPlayerID(color) return color == "Black" and "st" or color end
function S.getPlayerData(playerID) return data.playerData[playerID] end
function S.getPlayerVal(color, key)
  return (S.getStateVal("playerData", color, "stats") or {})[key]
end
function S.setPlayerVal(color, key, value) S.setStateVal(value, "playerData", color, "stats", key) end
local C = {
  StorytellerID = "st", BlindfoldVariantCount = 6, MAX_HUNGER = 5,
  RollType = { STANDARD="standard", DISCIPLINE="discipline", LAUNCH="launch", REMORSE="remorse",
    FRENZY="frenzy", ROUSE="rouse", ROUSE_OBLIVION="rouseOblivion" },
  ResultClass = { WIN="win", CRITICAL_WIN="criticalWin", MESSY_CRITICAL="messyCritical",
    FAILURE="failure", TOTAL_FAILURE="totalFailure", BESTIAL_FAILURE="bestialFailure",
    TOTAL_BESTIAL_FAILURE="totalBestialFailure" },
  RollPhase={POST_ROLL="postRoll", ROLLING="rolling"}, PlaySubPhases={MEMORIAM="Memoriam"},
  DICE_CRITICAL_SUCCESS_VALUE=10,
  Districts={}, Sites={},
}
local RC = {}
function RC.queueRoll(color, config) queued[#queued+1] = {color=color,config=config} end
function RC.initiateRoll(color, config) RC.queueRoll(color, config) end
function RC._getDiceObjectsByKindForRoll() return dice end
function RC.recalculate() end
local P = {}
function P.applyDamageOrHeal(color, which, superficial, aggravated)
  damages[#damages+1] = { which=which, superficial=superficial, aggravated=aggravated }
end
package.loaded["core.state"] = S
package.loaded["lib.constants"] = C
package.loaded["lib.util"] = {
  AlertGM=function(text) messages[#messages+1]=text end,
  Val=function(_,_,ok,msg) assert(ok,msg) end,
  Type=type,
}
package.loaded["core.roll_controller"] = RC
package.loaded["lib.pc_stats"] = P
package.loaded["core.sync"] = {player=function() syncs=syncs+1 end}
package.loaded["core.wp_reroll_glow"] = {clear=function() end}
package.loaded["core.lighting"] = {isPlayerPresentInActiveSeatLayout=function(color)
  return S.getStateVal("presence",color) == true
end}
package.loaded["lib.pc_roll_tray_lower"] = {isInitiateBlocked=function() return false end}
package.loaded["core.compulsions"] = {drawForCondition=function() draws=draws+1 end}
package.loaded["lib.die_face"] = {
  read=function(o) return o.face end,
  set=function(o,v) o.face=v return true end,
}
local CD = require("lib.condition_defs")
local Policies = require("lib.condition_roll_policies")
local Effects = require("lib.condition_effects")
local Conditions = require("core.conditions")
local DK = require("lib.dice_kinds")
local Rouse = require("lib.rouse_outcomes")
local LC = require("core.location_conditions")
local Handlers = require("core.roll_condition_handlers")
local PSC = require("lib.pc_sheet_collect")
package.loaded["lib.effective_stats"] = {
  forSeat=function(color)
    local stats=S.getStateVal("playerData",color,"stats")
    local changes=Conditions.resolveForPlayer(color).statChanges
    return {stats=stats,
      dotRating=function(k) return PSC.dotRatingFromStats(stats,changes,k) end,
      trackerMax=function(k) return PSC.trackerMaxFromStats(stats,changes,k) end}
  end,
}
local function reset()
  data={playerData={Brown={color="Brown",conditions={},stats={
    attributes={resolve={base=5}},skills={survival={base=2}},
    willpower={base=8,superficial=0,aggravated=0},hunger=2,
  }},Orange={color="Orange",conditions={},stats={}}}, sessionScene={}, presence={Brown=true,Orange=false}}
  queued,messages,damages,dice,draws,syncs={},{},{},{},0,0
  C.Districts={}
  C.Sites={}
end
local function active(ids, rt)
  local conditions={}
  for _,id in ipairs(ids) do conditions[id]=true end
  return {id="roll1",meta={},pool={normal=4,hunger=2},rollType=rt or "standard",
    rollPolicy=Policies.mergeForPlayer(conditions,data.playerData.Brown.stats)}
end
local function object(face)
  local o={face=face,locked=true,rerolls=0}
  o.setLock=function(v) o.locked=v end
  o.randomize=function() o.rerolls=o.rerolls+1 o.face=2 end
  return o
end

test("all requested keys can be hosted and have working policies",function()
  reset()
  local ids={"launchBonus2","memoriamBonus2","messyRouseTallyBonus","messyCompulsion","fullWPReroll",
    "surviveFailure","doubleBloodSurge","noFrenzy","noBloodSurge","upgradeStandardSuccess",
    "rerollSuccessfulRouse","setHungerWPReroll","scaryWPReroll","resolveHalved","remorseBonus2",
    "toxicRouse","scaryStain","noObvRouseDice","bestialReset","woundToCompulsion"}
  for _,id in ipairs(ids) do
    eq(CD.canListInSceneOrLocation(CD.getDef(id)),true)
    eq(CD.isSessionHostedCondition(CD.getDef(id)),true)
    eq(active({id}).rollPolicy.features[id],true)
  end
end)
test("hosted effects apply only to present PCs and clear on absence",function()
  reset()
  C.Districts.X={conditions={"noBloodSurge","launchBonus2","resolveHalved"}}
  data.sessionScene.districtKey="X"
  Conditions.reconcileHostedForSession({skipPresentation=true})
  eq(data.playerData.Brown.conditions.noBloodSurge,true)
  eq(data.playerData.Orange.conditions.noBloodSurge,nil)
  data.presence.Brown=false
  Conditions.reconcileHostedForSession({skipPresentation=true})
  eq(next(data.playerData.Brown.conditions),nil)
end)
test("switching location removes prior effects and applies the next ones",function()
  reset()
  C.Sites.A={conditions={"noBloodSurge"}}
  C.Sites.B={conditions={"remorseBonus2"}}
  data.sessionScene.siteKey="A"
  Conditions.reconcileHostedForSession({skipPresentation=true})
  data.sessionScene.siteKey="B"
  Conditions.reconcileHostedForSession({skipPresentation=true})
  eq(data.playerData.Brown.conditions.noBloodSurge,nil)
  eq(data.playerData.Brown.conditions.remorseBonus2,true)
end)
test("Resolve and Willpower halve only the Resolve contribution and restore cleanly",function()
  reset()
  local stats=data.playerData.Brown.stats
  local changes=Effects.resolveForPlayer({resolveHalved=true},stats,"Brown").statChanges
  eq(PSC.dotRatingFromStats(stats,changes,"resolve"),2)
  eq(PSC.trackerMaxFromStats(stats,changes,"willpower"),5)
  eq(stats.attributes.resolve.base,5)
  eq(PSC.trackerMaxFromStats(stats,Effects.resolveForPlayer({},stats,"Brown").statChanges,"willpower"),8)
end)
test("Resolve halving follows other stat penalties",function()
  reset()
  local changes=Effects.resolveForPlayer({resolveHalved=true,impairedWillpower=true},data.playerData.Brown.stats,"Brown").statChanges
  eq(PSC.dotRatingFromStats(data.playerData.Brown.stats,changes,"resolve"),1)
  eq(changes.willpower,-2)
end)
test("Launch bonus is scoped to Launch and never accumulates on refresh",function()
  reset()
  local a=active({"launchBonus2"},"launch")
  LC.applyPoolBonus("Brown",a);LC.applyPoolBonus("Brown",a)
  eq(a.pool.normal,6)
  a.rollType="standard";LC.applyPoolBonus("Brown",a);eq(a.pool.normal,4)
end)
test("Memoriam and criminal Launch bonuses do not double count",function()
  reset()
  local a=active({"memoriamBonus2","criminalLaunchBonus2"},"launch")
  eq(LC.poolBonus("Brown",a),2)
  data.memoriam={active=true}
  eq(LC.poolBonus("Brown",a),2)
  a.rollType="standard";eq(LC.poolBonus("Brown",a),2)
  data.memoriam.active=false;eq(LC.poolBonus("Brown",a),0)
end)
test("criminal Launch toggle needs its district and roll type",function()
  reset()
  local a=active({},"launch")
  eq(Conditions.canUseRollCondition("Brown",a,"criminalLaunchBonus2"),false)
  data.playerData.Brown.conditions.memoriamBonus2=true
  eq(Conditions.canUseRollCondition("Brown",a,"criminalLaunchBonus2"),true)
  a.rollType="standard";eq(Conditions.canUseRollCondition("Brown",a,"criminalLaunchBonus2"),false)
end)
test("Remorse bonus adds two standard dice",function()
  reset();eq(LC.poolBonus("Brown",active({"remorseBonus2"},"remorse")),2)
  eq(LC.poolBonus("Brown",active({"remorseBonus2"})),0)
end)
test("double surge multiplies and no surge vetoes activation",function()
  reset();eq(active({"doubleBloodSurge"}).rollPolicy.bloodSurgeDiceMultiplier,2)
  eq(LC.onBloodSurgeActivate("Brown",active({"noBloodSurge"})),false)
end)
test("Streets upgrades one successful non-Hunger die once, including repeated reads",function()
  reset()
  local a=active({"upgradeStandardSuccess"})
  local one,two=object(7),object(8)
  local values={[DK.KIND_NORMAL]={7,8},[DK.KIND_HUNGER]={6}}
  local objects={[DK.KIND_NORMAL]={one,two}}
  LC.onBeforeDiceRead("Brown",a,values,objects)
  eq(one.face,10);eq(two.face,8)
  LC.onBeforeDiceRead("Brown",a,values,objects);eq(two.face,8)
end)
test("successful Rouse check rerolls once, including all dice in the check",function()
  reset()
  local a=active({"rerollSuccessfulRouse"},"rouse")
  local one,two=object(9),object(2)
  local values={[DK.KIND_ROUSE]={9,2}}
  local objects={[DK.KIND_ROUSE]={one,two}}
  eq(LC.onBeforeDiceRead("Brown",a,values,objects),false)
  eq(one.rerolls,1);eq(two.rerolls,1)
  LC.onBeforeDiceRead("Brown",a,values,objects);eq(one.rerolls,1)
end)
test("failed Rouse check is not rerolled",function()
  reset();local o=object(2)
  LC.onBeforeDiceRead("Brown",active({"rerollSuccessfulRouse"}),{[DK.KIND_ROUSE]={2}},{[DK.KIND_ROUSE]={o}})
  eq(o.rerolls,0)
end)
test("Cemetery suppresses Oblivion stains and removes mixed-result choices",function()
  reset()
  for _,values in ipairs({{1},{10},{1,10},{2,10}}) do
    local result=Rouse.resolveOblivRouseDice(values,true)
    eq(result.stainDelta,0);eq(result.pendingChoice,false)
  end
  eq(Rouse.resolveOblivRouseDice({1},true).hungerDelta,1)
  eq(Rouse.resolveOblivRouseDice({10},true).hungerDelta,0)
  eq(Rouse.resolveOblivRouseDice({10}).stainDelta,1)
end)
test("full Willpower reroll requires every eligible die",function()
  reset()
  local a=active({"fullWPReroll"})
  a.willpower={waveEligibleGuids={a=true,b=true},rerollRandomizedGuids={a=true}}
  Handlers.run("onWpRerollWaveStart","Brown",a)
  eq(Handlers.run("onConfirmRoll","Brown",a),false)
  a.willpower.rerollRandomizedGuids.b=true
  eq(Handlers.run("onConfirmRoll","Brown",a),true)
  eq(a.rollPolicy.wpCanRerollHunger,true)
end)
test("Docks replaces the wave, sets one Hunger die and locks all dice",function()
  reset()
  local a=active({"setHungerWPReroll"});a.willpower={wpRerollWave=true}
  local one,two,normal=object(1),object(7),object(6)
  dice={[DK.KIND_HUNGER]={one,two},[DK.KIND_NORMAL]={normal}}
  LC.onWillpowerSpent("Brown",a)
  eq(one.face,10);eq(two.face,7);eq(normal.face,6)
  eq(a.willpower.wpRerollWave,false);eq(a.phase,"postRoll");eq(normal.locked,true)
end)
test("Docks cannot charge Willpower without an eligible Hunger die",function()
  reset();dice={[DK.KIND_HUNGER]={object(10)}}
  eq(LC.onBeforeWillpowerSpend("Brown",active({"setHungerWPReroll"})),false)
end)
test("Willpower fear checks only trigger on the specified outcomes",function()
  reset()
  for _,rc in ipairs({"messyCritical","bestialFailure","totalFailure","win"}) do
    local a=active({"scaryWPReroll"});a.meta.wpPreviousResult={resultClass=rc}
    LC.onWillpowerSpent("Brown",a)
  end
  eq(#queued,3);eq(queued[1].config.difficulty,3)
end)
test("frenzy replacement vetoes loss of control and requests corrupt Ambition",function()
  reset();eq(LC.onFrenzyFailed("Brown",active({"noFrenzy"})),false)
  eq(#messages,1)
end)
test("Messy Critical grants a Compulsion only on confirmation, once",function()
  reset();local a=active({"messyCompulsion"});a.result={resultClass="messyCritical"}
  LC.onRollConsequences("Brown",a);LC.onRollConsequences("Brown",a);eq(draws,1)
end)
test("Bestial Reset heals only Superficial Willpower and requests a Desire",function()
  reset();data.playerData.Brown.stats.willpower.superficial=3
  local a=active({"bestialReset"});a.result={resultClass="totalBestialFailure"}
  LC.onRollConsequences("Brown",a)
  eq(damages[1].superficial,-3);eq(damages[1].aggravated,0);eq(#messages,1)
end)
test("Toxic Rouse adds aggravated Health damage for a failed check",function()
  reset();local a=active({"toxicRouse"})
  a.rouseOutcomeStrips={{values={1,2}},{values={8}}}
  LC.onRouseConsequences("Brown",a);eq(damages[1].aggravated,1)
end)
test("scene tally counts completed checks, not individual dice or repeated confirmation",function()
  reset();local a=active({"messyRouseTallyBonus"});a.result={resultClass="messyCritical"}
  a.rouseOutcomeStrips={{values={2,6}},{values={7}}}
  LC.onRollConsequences("Brown",a);LC.onRollConsequences("Brown",a)
  eq(LC.poolBonus("Brown",active({"messyRouseTallyBonus"})),3)
  data.locationConditionState=nil
  eq(LC.poolBonus("Brown",active({"messyRouseTallyBonus"})),0)
end)
test("Drowning triggers only on first ordinary Failure and checks Resolve plus Survival",function()
  reset()
  for i=1,2 do
    local a=active({"surviveFailure"});a.result={resultClass="failure"}
    LC.onRollConsequences("Brown",a)
  end
  eq(#queued,1);eq(queued[1].config.difficulty,4)
  eq(queued[1].config.pool.normal+queued[1].config.pool.hunger,7)
end)
test("failed Drowning save changes the result to Total Failure",function()
  reset();local a=active({});a.result={resultClass="failure"}
  a.meta.conditionFollowup={kind="drowning"}
  LC.onRollConsequences("Brown",a);eq(a.result.resultClass,"totalFailure")
end)
test("wounded arrival checks strictly more than half and does not repeat on reconcile",function()
  reset();data.playerData.Brown.conditions.woundToCompulsion=true
  local a=active({"woundToCompulsion"})
  data.playerData.Brown.stats.willpower.superficial=4
  LC.onHostedEnter("Brown",a,{woundToCompulsion=true});eq(draws,0)
  data.playerData.Brown.stats.willpower.superficial=5
  LC.onHostedEnter("Brown",a,{});eq(draws,0)
  LC.onHostedEnter("Brown",a,{woundToCompulsion=true});eq(draws,1)
end)
test("gaining a Stain queues the difficulty-four fury check",function()
  reset();LC.onStainsGained("Brown",active({"scaryStain"}))
  eq(#queued,1);eq(queued[1].config.difficulty,4)
end)
test("Rouse bonuses add Rouse dice instead of invalid standard dice",function()
  reset();data.memoriam={active=true}
  local a=active({"memoriamBonus2"},"rouse");a.pool={normal=0,hunger=0,rouse=1}
  LC.applyPoolBonus("Brown",a)
  eq(a.pool.normal,0);eq(a.pool.rouse,3)
end)
test("Oblivion Stain-only results are not retried as successful checks",function()
  reset();local o=object(10)
  local a=active({"rerollSuccessfulRouse"},"rouseOblivion")
  LC.onBeforeDiceRead("Brown",a,{[DK.KIND_OBLIV_ROUSE]={10}},{[DK.KIND_OBLIV_ROUSE]={o}})
  eq(o.rerolls,0)
end)
test("Stain gain dispatch works through the actual tracker mutator",function()
  reset()
  C.PlayerData={}
  data.playerData.Brown.stats.humanity={base=7,stains=0}
  data.playerData.Brown.conditions.scaryStain=true
  local realP=assert(loadfile("lib/pc_stats.ttslua"))()
  realP.applyHumanityStainDelta("Brown",1)
  eq(#queued,1)
  realP.applyHumanityStainDelta("Brown",-1)
  eq(#queued,1)
end)
test("controller applies the policy bonus without accumulating it",function()
  reset()
  package.loaded["lib.guids"]={getObject=function() end}
  package.loaded["lib.pc_roll_tray_lower"]={isInitiateBlocked=function() return false end}
  local realRC=assert(loadfile("core/roll_controller.ttslua"))()
  C.RollTypesNoTakeHalf={};C.RollTypesWithoutHunger={};C.RollTypesNoCriticals={}
  C.RollTypesNoWillpower={}
  data.playerData.Brown.conditions.launchBonus2=true
  local a=active({},"launch")
  realRC.computeEffectiveRollState("Brown",a)
  realRC.computeEffectiveRollState("Brown",a)
  eq(a.pool.normal,6)
end)
test("repeated controller policy refresh does not grant extra Willpower rerolls",function()
  reset()
  local realRC=assert(loadfile("core/roll_controller.ttslua"))()
  data.playerData.Brown.conditions.bonusWPReroll=true
  local a=active({},"standard")
  realRC.computeEffectiveRollState("Brown",a)
  eq(a.rollOptions.numberOfRerolls,2)
  realRC.computeEffectiveRollState("Brown",a)
  eq(a.rollOptions.numberOfRerolls,2)
  data.playerData.Brown.conditions.bonusWPReroll=nil
  realRC.computeEffectiveRollState("Brown",a)
  eq(a.rollOptions.numberOfRerolls,1)
end)
test("dashboard writes contextual condition overlays rather than two hardcoded toggles",function()
  reset()
  C.PlayerColors={"Brown","Orange"}
  C.RollTypeLabel={}
  local U=package.loaded["lib.util"]
  U.clone=function(value)
    if type(value)~="table" then return value end
    local out={} for k,v in pairs(value) do out[k]=U.clone(v) end return out
  end
  U.isIn=function(value,list) for _,v in ipairs(list) do if v==value then return true end end return false end
  local a=active({"memoriamBonus2"},"launch")
  data.playerData.Brown.conditions.memoriamBonus2=true
  S.setStateVal(a,"playerData","Brown","hud","rollData","active")
  local written
  RC.setRollOptions=function() return true end
  RC.setRollConditionOverlay=function(_,patch) written=patch return true end
  RC.computeEffectiveRollState=function() end
  package.loaded["core.roll_ui"]={refreshAll=function() end}
  package.loaded["dashboard.push"]={markWorldDirty=function() end}
  package.loaded["lib.guids"].GetDiceOblivRouseGUID=function() return nil end
  local command={op="options",color="Brown",conditions={criminalLaunchBonus2=true},rerolls=1,diceRerolled=3}
  JSON={decode=function() return command end,encode=function(value) return value end}
  local Rolls=require("dashboard.rolls")
  eq(Rolls.apply("request").ok,true)
  eq(written.forceOn.criminalLaunchBonus2,true)
  local view=Rolls.options("Brown")
  local found=false
  for _,row in ipairs(view.conditions) do if row.id=="criminalLaunchBonus2" then found=true end end
  eq(found,true)
  local activeFound=false
  for _,row in ipairs(view.activeConditions) do if row.id=="memoriamBonus2" then activeFound=true end end
  eq(activeFound,true)
  a.rollType="standard"
  local unavailable=Rolls.options("Brown")
  for _,row in ipairs(unavailable.conditions) do assert(row.id~="criminalLaunchBonus2") end
  eq(Rolls.apply("request").ok,false)
end)
print(passed .. " location condition tests passed")
