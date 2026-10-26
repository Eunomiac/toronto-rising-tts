package.path='./?.ttslua;'..package.path
local function clone(v) if type(v)~='table' then return v end local o={} for k,x in pairs(v) do o[k]=clone(x) end return o end
local state={playerData={pc={conditions={}},other={conditions={}}},projects={own={id='own',owner='owner',phase='inProgress',projectDieMod=0},other={id='other',owner='other',phase='inProgress',projectDieMod=0}}}
local S={getPlayerID=function() return 'pc' end}
S.getStateVal=function(...) local v=state;for _,k in ipairs({...}) do v=v and v[k] end return v end
S.setStateVal=function(v,...) local keys={...};local t=state;for i=1,#keys-1 do t[keys[i]]=t[keys[i]] or {};t=t[keys[i]] end;t[keys[#keys]]=v end
local C={PlayerData={pc={charKey='owner'},other={charKey='other'}},RollType={},RollTypesNoTakeHalf={},RollTypesNoWillpower={},RollTypesWithoutHunger={},RollTypesNoCriticals={},DICE_CRITICAL_SUCCESS_VALUE=10,DICE_SUCCESS_THRESHOLD=6,ResultClass={WIN='win',CRITICAL_WIN='crit',MESSY_CRITICAL='messy',FAILURE='fail',BESTIAL_FAILURE='bestial',TOTAL_FAILURE='total',TOTAL_BESTIAL_FAILURE='totalBestial'}}
package.loaded['core.state']=S;package.loaded['lib.constants']=C
package.loaded['lib.util']={clone=clone,Type=type,Val=function(_,_,valid,msg) assert(valid,msg) end,AlertGM=function() end}
package.loaded['lib.pc_sheet_collect']={}
package.loaded['core.projects']={PHASE={IN_PROGRESS='inProgress'},getProject=function(id) return state.projects[id] end,deriveDieAndEnd=function(p) return math.max(0,5+p.projectDieMod) end,saveProject=function(p) state.projects[p.id]=clone(p) end,refreshAfterMutation=function() end}
package.loaded['core.conditions']={setManual=function(pid,id,v) state.playerData[pid].conditions[id]=v end,clear=function(pid,id) state.playerData[pid].conditions[id]=nil end,afterChange=function() end}
local Model=require('lib.complications_model');local A=require('lib.complications_automations');local E=require('core.complications_effects');E.register()
local function drain(g) for _,op in ipairs(g.operations) do E.execute(op) end;g.operations={} end
local g=Model.new({color='Red',result={margin=-2}},{a={index=11,zone='slot',up=true}})
assert(A.run(g,'a'));drain(g);assert(state.playerData.pc.conditions.WPRerollLimit2)
g.cards.a.enhanced=true
assert(A.run(g,'a'));drain(g);assert(not state.playerData.pc.conditions.WPRerollLimit2 and not state.playerData.pc.conditions.WPRerollLimit1)
assert(A.run(g,'a'));drain(g);assert(state.playerData.pc.conditions.WPRerollLimit1)
assert(A.run(g,'a'));drain(g);assert(not state.playerData.pc.conditions.WPRerollLimit1)
g.cards.a.index=52;assert(A.run(g,'a'));drain(g);assert(state.playerData.pc.conditions.BestialNullBasicSuccess and state.playerData.pc.conditions.BestialNullCrit);assert(A.run(g,'a'));drain(g)
g.cards.a.index=6;assert(A.run(g,'a'));drain(g);assert(state.projects.other.projectDieMod==-4 and state.projects.own.projectDieMod==0)
state.projects.other.projectDieMod=-5 -- unrelated later change is retained by reversal
assert(A.run(g,'a'));drain(g);assert(state.projects.other.projectDieMod==-1)
state.projects.other.phase='complete';assert(not A.run(g,'a'))
local Policies=require('lib.condition_roll_policies')
local policy=Policies.mergeForPlayer({WPRerollLimit2=true,WPRerollLimit1=true,NoMessyReroll=true,BestialNullCrit=true})
assert(policy.wpDiceLimit==1 and policy.features.noMessyReroll and policy.features.bestialNullCrit)
local RO=require('lib.roll_options')
local active={rollType='standard',rollOptions={wpReroll=true,numberOfRerolls=1,numberOfDiceRerolled=0},rollPolicy=policy,result={resultClass='messy'}}
assert(RO.getNumberForActive(active,RO.ROLL_NUMBER_OF_DICE_REROLLED)==1)
assert(not RO.isWillpowerSpendAllowedByOptions(active));active.result.resultClass='win';assert(RO.isWillpowerSpendAllowedByOptions(active))
local Dice=require('core.dice')
local n,h={10,10,6},{1,7}
local basic=Dice.classifyRoll(n,h,1,{bestialNullBasic=true});assert(basic.successes==5 and basic.pairs==1)
local both=Dice.classifyRoll(n,h,1,{bestialNullBasic=true,bestialNullCrit=true});assert(both.successes==2 and both.pairs==0)
assert(n[1]==10 and n[3]==6 and h[2]==7)
local fallback=Dice.classifyRoll({10},{1,8},1,{bestialNullBasic=true});assert(fallback.successes==1)
local noBasic=Dice.classifyRoll({10},{1,10},1,{bestialNullBasic=true});assert(noBasic.successes==4)
g=Model.new({result={margin=-2}},{buzz={index=9,value=1,zone='slot',up=true},other={index=1,value=4,zone='slot',up=true}});g.slots={'buzz','other'}
local total,margin=Model.totals(g);assert(total==5 and margin==0)
g.cards.buzz.negated=true;total,margin=Model.totals(g);assert(total==5 and margin==3)
g.cards.buzz.negated=false;g.adjust=-10;total,margin=Model.totals(g);assert(margin==-7)
print('Complications effects: toggle variants, project identity/reversal, condition caps, both Beast cancellations, unchanged dice and Buzzkill passed.')
