package.path='./?.ttslua;'..package.path
local state,objects,queue={}, {}, {}
local function clone(v) if type(v)~='table' then return v end local o={} for k,x in pairs(v) do o[k]=clone(x) end return o end
local function drain(n) local count=0;while #queue>0 and count<(n or 100) do count=count+1;table.remove(queue,1)() end end
local S={getPlayerID=function() return 'pc' end}
S.getStateVal=function(...) local v=state;for _,k in ipairs({...}) do v=v and v[k] end return v end
S.setStateVal=function(v,...) local ks={...};local t=state;for i=1,#ks-1 do t[ks[i]]=t[ks[i]] or {};t=t[ks[i]] end;t[ks[#ks]]=v end
local C={PlayerColors={'Red'},PlayerData={pc={color='Red',charKey='owner'}},ObjectPositions={}}
for _,suffix in ipairs({'DRAWN','SELECTED','1','2','3','4'}) do C.ObjectPositions['COMPULSION_CARD_'..suffix..'_RED']={on={duration=0}} end
local function card(id,suffix)
 local o={type='Card',tag='Card',tags={},interactable=true};objects[id]=o
 o.getGUID=function() return id end;o.getGMNotes=function() return 'Compulsion:Clan-owner:'..suffix end
 o.addTag=function(t) o.tags[t]=true end;o.removeTag=function(t) o.tags[t]=nil end;o.hasTag=function(t) return o.tags[t] end
 o.setLock=function() end;o.setScale=function() end
 return o
end
local generic=card('generic','generic');local deck,master
local function container(id,notes,contained)
 local o={type='Deck',tag='Deck',contained=contained};objects[id]=o
 o.getGUID=function() return id end;o.getGMNotes=function() return notes end;o.getPosition=function() return {x=0,y=0,z=0} end
 o.getObjects=function() local a={} for guid,c in pairs(o.contained) do a[#a+1]={guid=guid,gm_notes=c.getGMNotes()} end return a end
 o.putObject=function(c) o.contained[c.getGUID()]=c;objects[c.getGUID()]=nil end
 o.takeObject=function(p) local c=assert(o.contained[p.guid]);o.contained[p.guid]=nil;objects[p.guid]=c
  if p.callback_function then p.callback_function(c) end
  if o==deck then queue[#queue+1]=function() require('core.compulsions').onGenericDrawn(deck,c) end end
 end
 o.shuffle=function() end;o.reset=function() if objects.generic then o.putObject(objects.generic) end end
 return o
end
local variants={};for i=1,4 do variants['variant'..i]=card('variant'..i,tostring(i));objects['variant'..i]=nil end
deck=container('deck','COMPULSION_DECK_RED',{generic=generic});objects.generic=nil
master=container('master','',variants)
function getObjectsWithTag(t) if t=='CompulsionsMasterDeck' then return {master} end local a={} for _,o in pairs(objects) do if o.tags and o.tags[t] then a[#a+1]=o end end return a end
function getObjects() local a={} for _,o in pairs(objects) do a[#a+1]=o end return a end
function getObjectFromGUID(id) return objects[id] end
function Vector(t) return t end
Player={Red={clearSelectedObjects=function() end}}
package.loaded['core.state']=S;package.loaded['lib.constants']=C;package.loaded['lib.guids']={}
package.loaded['lib.util']={trim=function(s) return tostring(s or ''):gsub('^%s+',''):gsub('%s+$','') end,AlertGM=function() end,Alert=function() end,chain=function(fs) for _,f in ipairs(fs) do queue[#queue+1]=f end end}
package.loaded['lib.seat-role-identity']={findObjectByRoleIdentity=function(role) if role=='COMPULSION_DECK_RED' then return deck end end}
package.loaded['lib.csheet_identity']={seatColorObjectTag=function(c) return 'seat_'..c end,pageRoleGmNotes=function() return 'page' end}
package.loaded['lib.object_positions']={resolveStatePose=function() return {position={x=1,y=1,z=1}} end,applyResolvedPose=function() return 0 end}
package.loaded['core.main']={setCamera=function() end};package.loaded['core.lighting']={SetLightMode=function() end};package.loaded['dashboard.push']={seat=function() end}
local Comp=require('core.compulsions')
assert(Comp.canStartClan('Red'));Comp.startClanSource('Red','source1');drain()
assert(state.complicationCompulsions.Red.session and #state.complicationCompulsions.Red.session.cardGuids==4)
assert(not Comp.canStartClan('Red'))
-- Save/reload an open four-card choice, then cancel exactly that source.
state=clone(state);queue={};package.loaded['core.compulsions']=nil;Comp=require('core.compulsions');Comp.restoreClanSources();drain()
Comp.reverseClanSource('Red','unrelated');assert(state.complicationCompulsions.Red)
Comp.reverseClanSource('Red','source1');drain();assert(not state.complicationCompulsions.Red and #master.getObjects()==4 and deck.contained.generic)
-- Reverse before the object-leave event starts the presentation.
Comp.startClanSource('Red','source2');Comp.reverseClanSource('Red','source2');drain();assert(not state.complicationCompulsions.Red and deck.contained.generic)
-- Save after choosing but before its animation; recovery does not increment the tally twice.
Comp.startClanSource('Red','source3');drain()
local zone={getData=function() return {FogColor='Red'} end}
assert(Comp.onPresentedEnteredHand(zone,objects.variant1));queue={};state=clone(state)
package.loaded['core.compulsions']=nil;Comp=require('core.compulsions');Comp.restoreClanSources();drain()
assert(Comp.activeForColor('Red').type=='Clan' and state.playerData.pc.compulsionsTally.Clan[1]==1)
Comp.reverseClanSource('Red','source3');drain();assert(not Comp.hasActiveSelectionForColor('Red') and #master.getObjects()==4)
print('Blood Rush: Clan-only draw, pending reversal, source isolation, saved choice recovery and one-time tally passed.')
