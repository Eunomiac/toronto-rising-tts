package.path = './?.ttslua;' .. package.path
local M = require('lib.complications_model')
local function eq(a,b) assert(a==b, tostring(a)..' ~= '..tostring(b)) end
local function game(kind)
 local cards={}
 for i=1,30 do cards['c'..i]={value=i==1 and -3 or 2, category=i%3==0 and 'Project' or (i%2==0 and 'Beast' or ''),zone='deck'} end
 local g=M.new({rollType=kind or 'launch',result={margin=-4}},cards)
 for i=1,10 do M.draw(g,i,function() return 1 end) end
 return g
end
local g=game(); local guid=g.slots[1]; eq(M.reveal(g,guid),true); local c=g.cards[guid]
eq(M.totals(g), c.value); c.negated=true; eq(M.totals(g),c.value); eq(#M.candidates(g,'all'),0)
c.enhanced=true; c.negated=false; eq(M.totals(g),c.value); eq(#M.candidates(g,'normal'),0)
g.adjust=5; M.discard(g); eq(M.totals(g),5); eq(c.zone,'discard'); eq(c.enhanced,false)
local saw=false; for _,op in ipairs(g.operations) do if op.kind=='unenhance' then saw=true end end; assert(saw)
g=game('standard'); for _,v in pairs(g.slots) do assert(g.cards[v].category~='Project') end
-- Category restoration returns matching discards except the discarded instance, redeals hidden slots.
g=game(); g.autoDiscard=false
local chosen
for _,v in pairs(g.slots) do if g.cards[v].category=='Beast' then chosen=v end end
assert(chosen); M.reveal(g,chosen); g.autoDiscard=true; M.restrict(g,'Beast')
for _,c2 in pairs(g.cards) do assert(not(c2.category=='Beast' and c2.zone=='slot' and not c2.up)) end
M.discard(g); eq(g.cards[chosen].zone,'discard')
for k,v in pairs(g.cards) do if k~=chosen and v.category=='Beast' then assert(v.zone~='discard') end end
local total,margin=M.totals(g); eq(margin,-4+total)
-- Exhaustion leaves a hole instead of inventing cards.
g=M.new({rollType='launch',result={margin=0}},{}); eq(M.draw(g,1),nil); eq(g.exhausted,true)
local C={WIN='win',MESSY_CRITICAL='messy',CRITICAL_WIN='critical',FAILURE='failure',TOTAL_FAILURE='total',BESTIAL_FAILURE='bestial',TOTAL_BESTIAL_FAILURE='totalBestial'}
local r={margin=-2,successes=4,pairs=1,hungerTens=true,hungerOnes=false}
local adjusted=M.adjustResult(r,3,C,'standard'); eq(adjusted.margin,1); eq(adjusted.resultClass,'messy'); eq(adjusted.successes,4); eq(r.margin,-2)
eq(M.adjustResult(r,3,C,'goal').resultClass,'win')
for _,kind in ipairs({'launch','goal','standard','willpowerRoll','discipline'}) do assert(M.eligible({rollType=kind,result={margin=0}})) end
for _,kind in ipairs({'rouse','remorse','frenzy','werewolf'}) do assert(not M.eligible({rollType=kind,result={margin=0}})) end
local id,name,enh=M.identity('40:Powderkeg:Enhanced'); eq(id,40); eq(name,'Powderkeg'); eq(enh,true)
print('Complications model: totals, categories, enhanced discards, eligibility, exhaustion, and result classification passed.')
-- A receipt is source-specific, survives serialization, and preserves the applied variant.
local A=require('lib.complications_automations')
assert(not A.has(28)) -- proposals are not enabled before author review
A.register(999,{apply=function(state,guid,enhanced)
 local amount=enhanced and 2 or 1;state.adjust=state.adjust+amount;return {amount=amount}
end,reverse=function(state,guid,receipt) state.adjust=state.adjust-receipt.amount end})
g=M.new({result={margin=0}},{a={index=999,zone='slot',up=true}})
assert(A.run(g,'a',false));assert(not A.run(g,'a',false));eq(g.adjust,1)
g.cards.a.enhanced=true;g.adjust=g.adjust+7
assert(A.run(g,'a',true));eq(g.adjust,7);assert(not A.run(g,'a',true))
print('Automation registry: unavailable cards, duplicate clicks, variant changes and source-specific reversal passed.')

g=M.new({rollType='goal',result={margin=0}},{})
assert(M.available(g,{category='Project',rollTypes={goal=true}}))
assert(not M.available(g,{category='',rollTypes={goal=false,launch=true}}))
print('Per-roll checkbox eligibility overrides the legacy Project-only rule.')
