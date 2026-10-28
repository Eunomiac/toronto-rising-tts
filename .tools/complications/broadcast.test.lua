-- Exercise the actual result-banner rendering, including queued history snapshots.
package.path='./?.ttslua;'..package.path
local function clone(v) if type(v)~='table' then return v end local out={} for k,x in pairs(v) do out[k]=clone(x) end return out end
local function enum() return setmetatable({},{__index=function(t,k) rawset(t,k,k);return k end}) end
local values,attributes,scheduled,shown={},{},{},{}
UI={setClass=function() end,setValue=function(id,v) values[id]=v end,show=function() shown[#shown+1]=clone(values) end,hide=function() end}
local U={Type=type,clone=clone,Val=function(_,_,ok,msg) assert(ok,msg) end,
 setAttribute=function(id,k,v) attributes[id]=attributes[id] or {};attributes[id][k]=v end,
 setAttributes=function(id,attrs) for k,v in pairs(attrs) do if k=='text' then values[id]=v end;attributes[id]=attributes[id] or {};attributes[id][k]=v end end,
 setClass=function() end,cancel=function() end,await=function(f) scheduled[#scheduled+1]=f end}
local C={RollType=enum(),ResultClass=enum(),ResultClassLabel=enum(),RollTypeLabel=enum(),PlayerColors={'Red'}}
local history={}
local liveComplications,liveRoll
package.loaded['core.state']={getPlayerID=function() return 'pc' end,getStateVal=function(...)
 local keys={...};if keys[#keys]=='history' then return history end
 if keys[1]=='complications' then return liveComplications end
 if keys[#keys]=='active' then return liveRoll end
 if #keys==2 then return {charName='Test character',charKey='test'} end
end}
package.loaded['lib.constants']=C;package.loaded['lib.util']=U
package.loaded['lib.roll_options']=enum()
for _,name in ipairs({'lib.condition_defs','core.conditions','lib.pc_roll_tray_lower','lib.npcs_data','core.roll_controller','lib.guids','lib.secret_roll_dice'}) do package.loaded[name]={} end
package.loaded['lib.grid_strip']={register=function() end,registerFamily=function() end,registerContext=function() end}
package.loaded['lib.dice_kinds']=enum()
local RUI=require('core.roll_ui')
local function check(result,difficulty,expected,margin)
 values,attributes={},{}
 RUI.previewBroadcast({color='Red',pid='pc',rollerName='Test',rollTypeKey=C.RollType.STANDARD,result=result,difficulty=difficulty})
 assert(values.rollRes_successes==tostring(result.successes))
 assert(values.rollRes_difficulty==tostring(expected),tostring(values.rollRes_difficulty)..' ~= '..expected)
 assert(values.rollRes_resultDisplay=='WIN '..margin,values.rollRes_resultDisplay)
end
-- The author's exact example: 3 actual successes, original difficulty 7, +4 delta.
local result={successes=3,margin=0,complicationsDelta=4,resultClass=C.ResultClass.WIN}
check(result,7,7,'+0')
check(result,nil,7,'+0') -- older history without stored difficulty
check({successes=3,margin=2,complicationsDelta=6,resultClass=C.ResultClass.WIN},nil,7,'+2')
check({successes=8,margin=1,resultClass=C.ResultClass.WIN},nil,7,'+1')
-- A queued rebroadcast must retain the supplied history entry's difficulty even
-- after a later history update, rather than reconstructing it from the margin.
RUI.showResultBroadcast('Red',result,'First',{rollType=C.RollType.STANDARD,difficulty=7})
local entry={rollType=C.RollType.STANDARD,difficulty=9,result=result}
RUI.showResultBroadcastFromEntry('Red',entry)
entry.difficulty=2
while #scheduled>0 do table.remove(scheduled,1)() end
assert(shown[#shown-1].rollRes_difficulty=='7')
assert(shown[#shown].rollRes_difficulty=='9')
assert(shown[#shown].rollRes_resultDisplay=='WIN +0')
print('Broadcast: original difficulty, adjusted margin, unchanged successes and legacy fallback passed.')

-- The exact target is hidden before normal panel rendering; other rolls and
-- seats still reach the ordinary renderer, as does the target after cleanup.
local ordinaryRefreshes=0
package.loaded['lib.pc_roll_tray_lower'].isIdleBagAutoRouse=function()
 ordinaryRefreshes=ordinaryRefreshes+1;return true
end
liveRoll={id='target'}
liveComplications={target={color='Red',rollId='target'}}
RUI.refreshPlayerRollPanel('Red')
assert(ordinaryRefreshes==0 and attributes.rollControl_root_Red.active=='false')
liveComplications.hidden=true
RUI.refreshPlayerRollPanel('Red');assert(ordinaryRefreshes==0)
RUI.refreshPlayerRollPanel('Pink');assert(ordinaryRefreshes==1)
liveRoll.id='other';RUI.refreshPlayerRollPanel('Red');assert(ordinaryRefreshes==2)
liveRoll.id='target';liveComplications=nil
RUI.refreshPlayerRollPanel('Red');assert(ordinaryRefreshes==3)
print('Roll controls: exact Complications target hidden, other rolls unaffected, normal refresh restored afterward.')
