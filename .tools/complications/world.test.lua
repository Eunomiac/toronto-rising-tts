package.path='./?.ttslua;'..package.path
local Model=require('lib.complications_model')
local catalog=require('lib.complications_catalog')
local realUtil=require('lib.util')
local function clone(v) if type(v)~='table' then return v end local o={} for k,x in pairs(v) do o[k]=clone(x) end return o end
local state,scheduled,objects,seq={}, {}, {}, 0
local takeCount,spawnCount=0,0
local warnings,deferSpawn,allowMasterMutation={},false,false
local deferDestroy,dropTakeCallbacks,holdTaken=false,true,false
-- Use the production timing helpers, with a frame-driven engine underneath.
-- Numeric waits scheduled from condition callbacks are an unsafe TTS pattern.
Time={time=0}
local inCondition=false
Wait={time=function(f,seconds)
 assert(not inCondition,'numeric wait nested in engine condition callback')
 scheduled[#scheduled+1]=function() Time.time=Time.time+seconds;f() end
end,condition=function(f,pred)
 local poll;poll=function()
  Time.time=Time.time+0.03
  if pred() then inCondition=true;f();inCondition=false else scheduled[#scheduled+1]=poll end
 end
 scheduled[#scheduled+1]=poll
end}
function startLuaCoroutine(_,name)
 local co=coroutine.create(_G[name]);local resume
 resume=function()
  Time.time=Time.time+0.03
  local ok,err=coroutine.resume(co);assert(ok,err)
  if coroutine.status(co)~='dead' then scheduled[#scheduled+1]=resume end
 end
 resume()
end
local function drain(limit)
 local n=0
 while #scheduled>0 and n<(limit or 2000) do n=n+1; table.remove(scheduled,1)() end
 assert(n<(limit or 2000) or limit, 'queue did not settle')
end
local stagedChecks=0
local function assertStaged(p)
 local g=assert(state.complications)
 for _,slot in pairs(g.positions) do
  assert(p.x>=slot.x+10 and p.z>=slot.z+10 and p.y>=slot.y+10,'temporary card overlaps board staging area')
 end
 stagedChecks=stagedChecks+1
end
local function nextGuid() seq=seq+1; return 'new'..seq end
local make
make=function(id,tag,notes,tags,children)
 local o={tag=tag,children=children,position={x=0,y=100,z=100},rotation={x=0,y=0,z=0},tags=tags or {},locked=false}
 objects[id]=o
 o.getGUID=function() return id end
 o.getPosition=function() return clone(o.position) end
 o.getRotation=function() return clone(o.rotation) end
 o.setPosition=function(p) o.position=clone(p) end
 o.setRotation=function(r) o.rotation={x=r.x or r[1],y=r.y or r[2],z=r.z or r[3]} end
 o.getGMNotes=function() return notes end
 o.hasTag=function(t) for _,v in ipairs(o.tags) do if v==t then return true end end return false end
 o.addTag=function(t) if not o.hasTag(t) then o.tags[#o.tags+1]=t end end
 o.removeTag=function(t) for i=#o.tags,1,-1 do if o.tags[i]==t then table.remove(o.tags,i) end end end
 o.getInvisibleTo=function() return clone(o.invisible or {}) end
 o.setLock=function(v) assert(type(v)=='boolean','TTS SetLock requires a boolean');o.locked=v end
 o.setInvisibleTo=function(v) o.invisible=v end
 o.highlightOn=function(v) o.highlight=v end
 o.highlightOff=function() o.highlight=nil end
 o.shuffle=function() assert(not o.hasTag('masterDeck'),'master shuffled');local reversed={} for i=#o.children,1,-1 do reversed[#reversed+1]=o.children[i] end;o.children=reversed end
 o.destruct=function() assert(allowMasterMutation or not o.hasTag('masterDeck'),'master destroyed by gameplay');if deferDestroy then scheduled[#scheduled+1]=function() objects[id]=nil end else objects[id]=nil end end
 o.getObjects=function()
  local a={} for _,v in ipairs(o.children or {}) do a[#a+1]={guid=v.id,gm_notes=v.notes,tags=v.tags,index=#a} end return a
 end
 o.getData=function()
  local a={} for _,v in ipairs(o.children or {}) do a[#a+1]={GUID=v.id,Name='CardCustom',GMNotes=v.notes,Tags=clone(v.tags),CardID=v.cardId or 100,CustomDeck={['1']={FaceURL='fixture'}},Transform={}} end return {GUID=id,Name=tag=='Deck' and 'DeckCustom' or 'CardCustom',GMNotes=notes,Tags=clone(o.tags),ContainedObjects=tag=='Deck' and a or nil,CardID=tag~='Deck' and 100 or nil,CustomDeck={['1']={FaceURL='fixture'}},Locked=o.locked,Transform={posX=o.position.x,posY=o.position.y,posZ=o.position.z,rotX=o.rotation.x,rotY=o.rotation.y,rotZ=o.rotation.z}}
 end
 o.takeObject=function(p)
  takeCount=takeCount+1;assert(not o.hasTag('masterDeck'),'master drawn from')
  local live=state.complications;local op=live and live.operations[live.operationIndex]
  if op and op.kind=='drawTop' then assert(p.guid==o.children[1].id,'replacement must come from the physical top')
  elseif op then assertStaged(p.position) end
  for i,v in ipairs(o.children) do if v.id==p.guid or (not p.guid and i==1) then
   table.remove(o.children,i)
   -- An unlocked gameplay deck can snap/slide away from its authored position.
   -- Its identity must survive that movement, including subsequent transfers.
   if op and op.kind=='drawTop' then o.position.x=o.position.x+2;o.position.z=o.position.z+3 end
   local c=make(v.id,'Card',v.notes,v.tags); c.setPosition(p.position)
   if #o.children==1 then
    local last=o.children[1];local single=make(last.id,'Card',last.notes,last.tags);single.position=clone(o.position);objects[id]=nil
   elseif #o.children==0 then objects[id]=nil end
   c.spawning=true;c.loading_custom=true
   scheduled[#scheduled+1]=function()
    if not holdTaken then c.spawning=false end
    -- Custom art can keep loading after the physical card is usable. Also
    -- model an unlocked card falling/merging before the next script frame.
    if not p.callback_function then assert(c.locked,'dealt card was left loose while waiting') end
    if p.callback_function and not dropTakeCallbacks then p.callback_function(c) end
   end
   return c
  end end
  error('take missing '..p.guid)
 end
 o.putObject=function(other)
  assert(other~=o,'self merge');assert(not o.hasTag('masterDeck'),'master received a card')
  local dest=o
  if o.tag~='Deck' then
   dest=make(nextGuid(),'Deck','',{'deckOfComplications'},{{id=id,notes=notes,tags=o.tags}})
   dest.position=clone(o.position);objects[id]=nil
  end
  local incoming=other.tag=='Deck' and clone(other.children) or {{id=other.getGUID(),notes=other.getGMNotes(),tags=other.tags}}
  for i=#incoming,1,-1 do table.insert(dest.children,1,incoming[i]) end;objects[other.getGUID()]=nil
  return dest
 end
 local uiTree={{tag='HorizontalLayout',attributes={id='controlsPanel'},children={}}}
 o.UI={setAttribute=function() end,setAttributes=function() end,
 getXmlTable=function() return uiTree end,setXmlTable=function(t) uiTree=t end}
 o.positionToWorld=function(p) return {x=o.position.x+p.x*10,y=o.position.y+p.y,z=o.position.z+p.z*10} end
 o.clone=function(p)
  local data=o.getData();data.GUID=''
  for _,row in ipairs(data.ContainedObjects or {}) do row.GUID='' end
  return spawnObjectData({data=data,position=p.position})
 end
 return o
end
function getObjectFromGUID(id) return objects[id] end
function getAllObjects() local a={} for _,o in pairs(objects) do a[#a+1]=o end;return a end
function getObjectsWithTag(t) local a={} for _,o in pairs(objects) do if o.hasTag(t) then a[#a+1]=o end end return a end
function spawnObjectData(p)
 local live=state.complications;local op=live and live.operations[live.operationIndex]
 if op and (op.kind=='enhance' or op.kind=='doomBatch' or op.kind=='doomClone') then
  local t=p.data.Transform or {};assertStaged(p.position or {x=t.posX,y=t.posY,z=t.posZ})
 end
 spawnCount=spawnCount+1
 local data=clone(p.data);local children
 if data.ContainedObjects then children={} for _,row in ipairs(data.ContainedObjects) do
  -- TTS preserves explicit empty GUIDs in contained card data. Do not silently
  -- repair them here: that assumption hid the live ten-slots/one-record bug.
  children[#children+1]={id=row.GUID or nextGuid(),notes=row.GMNotes,tags=row.Tags,cardId=row.CardID}
 end end
 local id=data.GUID and data.GUID~='' and data.GUID or nextGuid()
 assert(not objects[id],'spawn GUID collision '..id)
 local o=make(id,children and 'Deck' or 'Card',data.GMNotes,data.Tags,children)
 local t=data.Transform or {};o.setPosition(p.position or {x=t.posX or 0,y=t.posY or 10,z=t.posZ or 0})
 o.setRotation(p.rotation or {x=t.rotX or 0,y=t.rotY or 0,z=t.rotZ or 0});o.locked=data.Locked==true
 if p.callback_function then if deferSpawn then scheduled[#scheduled+1]=function() p.callback_function(o) end else p.callback_function(o) end end;return o
end
UI={setAttributes=function() end}
local cameras={}
Player={Action={FlipOver='flip'},getAvailableColors=function() return {'Black','Red','Pink'} end,getPlayers=function()
 local players={};for _,color in ipairs({'Black','Red','Pink'}) do
  players[#players+1]={color=color,lookAt=function(preset) cameras[color]=preset end}
 end;return players
end}
package.loaded['core.main']={resolveCameraPreset=function(player,key)
 assert(key=='diceTrayRed','camera must use the participating seat diceTray preset')
 return {position={x=20,y=18,z=20},pitch=58,distance=11}
end}
local U=setmetatable({isStorytellerSteamPlayer=function(p) return (type(p)=='table' and p.color or p)=='Black' end,AlertGM=function(s) warnings[#warnings+1]=s end,
 logCoroutineIssue=function(tag,err) warnings[#warnings+1]=tag..': '..tostring(err) end},{__index=realUtil})
-- Timing helpers close over the real utility table.
realUtil.AlertGM=U.AlertGM;realUtil.logCoroutineIssue=U.logCoroutineIssue
local O={isHiddenObject=function(o) return o.hidden end,hideObject=function(o) if not o.hidden then o.previous={p=o.getPosition(),r=o.getRotation(),l=o.locked};o.hidden=true;o.position.y=-200 end end,restoreObject=function(o,p)
 p=p or {}; if o.hidden then o.position=o.previous.p;o.rotation=o.previous.r;o.locked=o.previous.l;o.hidden=false end
 if p.position then o.setPosition(p.position) end
 if p.rotation then assert(p.rotation.x and p.rotation.y and p.rotation.z,'restoreObject requires named rotation coordinates');o.setRotation(p.rotation) end
 if p.locked~=nil then o.setLock(p.locked) end
end}
package.loaded['lib.util']=U;package.loaded['lib.constants']={};package.loaded['core.objects']=O
for _,name in ipairs({'lib.pc_bootstrap','lib.pc_relationships_data','core.scene_library','lib.npc_placements_convert'}) do package.loaded[name]={} end
local S=require('core.state') -- actual recursive validation and nested setters
local rootWrites=0
local setStateVal=S.setStateVal
S.setStateVal=function(value,...)
 local keys={...}
 if #keys==1 and keys[1]=='complications' then rootWrites=rootWrites+1 end
 return setStateVal(value,...)
end
state=setmetatable({},{__index=function(_,k) return S.getStateVal(k) end,__newindex=function(_,k,v) S.setStateVal(v,k) end})
package.loaded['lib.guids']={GUIDS={COMPLICATIONS_BOARD='board',CSHEET_DICE_DRAWER_ANCHOR_ON_RED='anchor'}}
package.loaded['dashboard.push']={markWorldDirty=function() end}
local panelRefreshes={}
package.loaded['core.roll_ui']={refreshPlayerRollPanel=function(color)
 panelRefreshes[#panelRefreshes+1]={color=color,live=state.complications~=nil}
end}
package.loaded['core.compulsions']={restoreClanSources=function() end}
local target={color='Red',rollId='roll1',rollType='standard',result={margin=-5}}
local finishes=0
package.loaded['core.complications_rolls']={capture=function() return clone(target) end,finish=function(t,total) finishes=finishes+1;eqTotal=total;return nil end}
local b=make('board','Tile');b.getSnapPoints=function()
 local a={{position={x=-1,y=.2,z=-1},tags={'deckOfComplications'}},{position={x=1,y=.2,z=-1},tags={'deckOfComplications'}}}
 for i=1,10 do a[#a+1]={position={x=i*.2,y=.2,z=1}} end return a
end
local anchor=make('anchor','Tile');anchor.position={x=20,y=0,z=20}
local base,enh={},{}
for i=1,100 do local n=(i-1)%66+1;base[#base+1]={id='c'..i,notes=n..':'..catalog[n].name,tags={'deckOfComplications'}} end
for i=1,66 do enh[#enh+1]={id='e'..i,notes=i..':'..catalog[i].name..':Enhanced',tags={'deckOfComplications','enhancedComplication'}} end
table.sort(base,function(a,b) return tonumber(a.notes:match('^%d+'))<tonumber(b.notes:match('^%d+')) end)
make('base','Deck','',{'deckOfComplications','masterDeck'},base);make('source','Deck','',{'deckOfComplications','masterDeck','enhancedComplication'},enh)
local Decks=require('core.complications_decks')
assert(Decks.verify())
objects.source.children[1],objects.source.children[2]=objects.source.children[2],objects.source.children[1]
assert(not Decks.verify());assert(warnings[#warnings]:find('DEBUG.SortMasterDecks',1,true))
objects.base.removeTag('masterDeck');assert(not Decks.verify());objects.base.addTag('masterDeck')
make('extra','Deck','',{'deckOfComplications','masterDeck'},clone(base))
assert(not Decks.verify());allowMasterMutation=true;objects.extra.destruct()
assert(Decks.sortMasters());allowMasterMutation=false;assert(Decks.verify())
local mastersBefore={base=objects.base.getData(),source=objects.source.getData()}
local function same(a,b)
 if type(a)~=type(b) then return false end
 if type(a)~='table' then return a==b end
 for k,v in pairs(a) do if not same(v,b[k]) then return false end end
 for k in pairs(b) do if a[k]==nil then return false end end;return true
end
local D=require('core.complications')
spawnCount,takeCount=0,0;deferSpawn=true
assert(not D.start('Red','roll1'))
assert(panelRefreshes[#panelRefreshes].color=='Red' and panelRefreshes[#panelRefreshes].live)
-- Saving between spawn and its callback must recover the existing clone.
scheduled={};state.complications=clone(state.complications);deferSpawn=false
package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain()
assert(spawnCount==3,'setup must clone twice and filter once, not respawn a recovered clone')
assert(takeCount==10,'setup must extract ten cards; got '..takeCount)
dropTakeCallbacks=false

local g=state.complications;assert(g and not g.error)
assert(not g.cards[''],'empty GUID collapsed the card catalog')
local unique={}
for _,guid in pairs(g.slots) do
 assert(guid:match('^%x%x%x%x%x%x$') and not unique[guid],'slot GUID is invalid or duplicated')
 unique[guid]=true
end
for _,color in ipairs({'Black','Red','Pink'}) do
 assert(cameras[color] and math.abs(cameras[color].position.x-(20-7/math.sqrt(2)))<0.001)
 assert(cameras[color].pitch==58 and cameras[color].distance==11)
end
local count=0;for _,id in pairs(g.slots) do count=count+1;assert(objects[id]);assert(Model.available(g,g.cards[id]));assert(not objects[id].locked) end;assert(count==10)
local id=g.slots[1]
assert(not D.onPlayerAction({color='Pink'},'flip',{objects[id]}));assert(D.onPlayerAction({color='Red'},'flip',{objects[id]}));drain();assert(g.cards[id].up and objects[id].locked)
local total=Model.totals(g)
D.button({color='Black'},'-1','button_Negate');drain();assert(g.cards[id].negated);assert(Model.totals(g)==total);assert(#Model.candidates(g,'all')==0)
D.button({color='Black'},'-1','button_Negate');D.button({color='Black'},'-1','button_Enhance')
assert(not objects[id].highlight and objects[g.cards[id].clone].highlight[2]==1,'highlight must transfer before the next refresh')
drain();assert(objects[g.cards[id].clone]);assert(Model.totals(g)==total)
D.button({color='Black'},'-1','button_Negate');drain()
assert(not objects[id].highlight and objects[g.cards[id].clone].highlight[1]==1)
D.button({color='Black'},'-1','button_Negate');drain()
D.toggle({color='Black'});assert(g.hidden and b.hidden)
-- Reload, including sparse JSON-like slot keys, while hidden.
scheduled={};state.complications=clone(g);local textSlots={};for k,v in pairs(g.slots) do textSlots[tostring(k)]=v end;state.complications.slots=textSlots
package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain();g=state.complications
D.toggle({color='Black'});assert(not g.hidden and not b.hidden)
D.button({color='Black'},'-2','button_Negate');drain();assert(g.cards[id].zone=='discard' and not g.cards[id].clone);assert(Model.totals(g)==0);assert(objects[g.slots[1]].locked)
D.button({color='Black'},'-2','button_StopSelect');drain();assert(g.mode=='stop' and not objects[g.slots[1]].locked)
-- Save/reload in the middle of a discard/redeal journal, then finish exactly once.
id=g.slots[1];assert(D.onPlayerAction({color='Red'},'flip',{objects[id]}));drain();D.button({color='Black'},'-2','button_Negate')
scheduled={};state.complications=clone(g);package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain();g=state.complications
D.button({color='Black'},'-2','button_StopSelect');drain()
D.button({color='Black'},'-1','button_Adjust');drain();assert(Model.totals(g)==1)
D.button({color='Black'},'-1','button_StopSelect');D.button({color='Black'},'-1','button_StopSelect');drain();assert(not state.complications and finishes==1 and eqTotal==1)
print('Complications world: startup, permissions, locks, enhance/negate/discard, hidden reload, operation recovery, and cleanup passed.')
-- A fresh game exercises real tagged Rare duplication, partial reversal and external enhancement.
assert(not D.start('Red','roll1'));drain();g=state.complications
local function placeIndex(index,slot)
 local chosen;for guid,c in pairs(g.cards) do if c.index==index and c.zone=='deck' then chosen=guid;break end end
 assert(chosen,'missing index '..index)
 if g.slots[slot] then Model.move(g,g.slots[slot],'deck') end
 g.cards[chosen].zone='slot';g.slots[slot]=chosen;Model.queue(g,{kind='place',guid=chosen,slot=slot})
 D.restore();drain();return chosen
end
local doom=placeIndex(28,1)
assert(D.onPlayerAction({color='Red'},'flip',{objects[doom]}));drain()
local rare=0;for _,c in pairs(g.cards) do if c.rarity=='Rare' and c.zone~='excluded' then rare=rare+1 end end
D.button({color='Black'},'-1','button_Automate');drain()
local copies=0;for _,c in pairs(g.cards) do if c.doomSource==doom then copies=copies+1 end end;assert(copies==rare*2)
-- Reveal one generated copy, then return selection to Doom and reverse.
local kept;for guid,c in pairs(g.cards) do if c.doomSource==doom and c.zone=='deck' then kept=guid;break end end
assert(kept)
Model.move(g,g.slots[2],'deck');g.cards[kept].zone='slot';g.slots[2]=kept;Model.queue(g,{kind='place',guid=kept,slot=2});D.restore();drain()
g.cards[kept].up=true;g.selected=doom
D.button({color='Black'},'-1','button_Automate');drain()
copies=0;for _,c in pairs(g.cards) do if c.doomSource==doom then copies=copies+1 end end;assert(copies==1 and g.cards[kept].up)
D.button({color='Black'},'-1','button_Enhance');drain()
D.button({color='Black'},'-1','button_Automate')
-- Reload with duplication queued; it must not plan or spawn the same batch twice.
scheduled={};state.complications=clone(g);package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain();g=state.complications
copies=0;for _,c in pairs(g.cards) do if c.doomSource==doom then copies=copies+1 end end;assert(copies==rare*4)
-- A retained copy discarded after reversal must not become an extra fifth copy.
D.button({color='Black'},'-1','button_Automate');drain()
g.selected=kept;D.button({color='Black'},'-2','button_Negate');drain()
assert(g.cards[kept] and g.cards[kept].zone=='discard')
g.selected=doom;D.button({color='Black'},'-1','button_Automate');drain()
copies=0;for _,c in pairs(g.cards) do if c.doomSource==doom then copies=copies+1 end end
assert(copies==rare*4 and not g.cards[kept])
local outside=make('outside','Card','1:'..catalog[1].name,{'deckOfComplications'});outside.position={x=60,y=10,z=60};outside.is_face_down=false
D.button({color='Black'},'-1','button_StopSelect');D.hotkey('Black',outside,false);drain();assert(g.selected=='outside' and g.cards.outside.zone=='external')
local before=Model.totals(g);D.button({color='Black'},'-1','button_Enhance')
assert(not outside.highlight and objects[g.cards.outside.clone].highlight[2]==1,'external original must lose its highlight immediately')
drain();assert(g.cards.outside.clone and Model.totals(g)==before)
local externalClone=objects[g.cards.outside.clone];assert(externalClone.position.x==60 and outside.position.y==9.5)
D.button({color='Black'},'-1','button_Enhance');drain();assert(not g.cards.outside.clone and outside.position.y==10 and outside.highlight[2]==1)
D.button({color='Black'},'-2','button_StopSelect');drain();D.button({color='Black'},'-1','button_StopSelect');D.button({color='Black'},'-1','button_StopSelect');drain()
assert(not state.complications and not objects.outside)
assert(panelRefreshes[#panelRefreshes].color=='Red' and not panelRefreshes[#panelRefreshes].live)
assert(objects.base and #objects.base.children==100 and objects.source and #objects.source.children==66)
for _,o in pairs(objects) do for _,tag in ipairs(o.tags) do assert(not tag:match('^complicationsDoom_')) end end
print('Complications world: Rare cloning, retained face-up copies, enhanced count, mid-batch reload, clone cleanup and external enhancement passed.')

assert(same(mastersBefore.base,objects.base.getData()) and same(mastersBefore.source,objects.source.getData()),'gameplay changed a master deck')
print('Master decks: missing/duplicate/order warnings, sorting, unchanged templates, top-ten-only extraction and interrupted clone recovery passed.')

-- Category transfers recover halfway through spawning two replacement piles and
-- never extract piled cards individually. Only board replacements use takeObject.
assert(not D.start('Red','roll1'));drain();g=state.complications
local categorized=placeIndex(11,1);placeIndex(17,2)
local category=g.cards[categorized].category
local replaced=0;for _,guid in pairs(g.slots) do
 if guid~=categorized and g.cards[guid].category==category then replaced=replaced+1 end
end
local beforeTakes=takeCount;deferDestroy=true
assert(D.onPlayerAction({color='Red'},'flip',{objects[categorized]}))
deferSpawn=true;drain(1)
assert(g.operations[g.operationIndex].kind=='batchMove' and g.operations[g.operationIndex].job)
scheduled={};state.complications=clone(g);deferSpawn=false
package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain();g=state.complications
assert(takeCount-beforeTakes==replaced,'pile restriction must not extract individual cards')
for guid,c in pairs(g.cards) do
 if guid~=categorized and c.category==category then assert(c.zone=='discard') end
end
beforeTakes=takeCount;D.button({color='Black'},'-1','button_ToggleCategoryDiscard');drain()
assert(takeCount-beforeTakes==9,'restoration must redeal all nine face-down cards from the top')
assert(g.slots[1]==categorized and g.cards[categorized].up)
D.button({color='Black'},'-2','button_StopSelect');drain()
D.button({color='Black'},'-1','button_StopSelect');D.button({color='Black'},'-1','button_StopSelect');drain()
-- Filtering to one card (then to none) must survive deck collapse and allow Stop.
local flags={};for index,def in pairs(catalog) do flags[index]=def.rollTypes.standard;def.rollTypes.standard=index==40 end
for _,cardCount in ipairs({2,1,0}) do
 catalog[40].rollTypes.standard=cardCount>=1
 catalog[41].rollTypes.standard=cardCount==2
 assert(not D.start('Red','roll1'));drain();g=state.complications
 local slots=0;for _ in pairs(g.slots) do slots=slots+1 end
 assert(slots==cardCount and g.exhausted)
 D.button({color='Black'},'-1','button_StopSelect');D.button({color='Black'},'-1','button_StopSelect');drain()
 assert(not state.complications)
end
for index,flag in pairs(flags) do catalog[index].rollTypes.standard=flag end
assert(same(mastersBefore.base,objects.base.getData()) and same(mastersBefore.source,objects.source.getData()))
print('Bulk piles: interrupted replacement recovery, no per-card pile extraction, top-card redeals, one-card and empty pools passed.')

assert(stagedChecks>0)
print("Presentation: off-board temporary staging and immediate board/external enhancement highlights passed.")

-- Full-size gameplay fixture, real state validation and real timing helpers.
-- Drop every take callback: a spawned card must still complete its saved deal.
objects.base.children={}
for i=1,254 do local row=clone(base[(i-1)%#base+1]);row.id='large'..i;objects.base.children[i]=row end
dropTakeCallbacks=true;takeCount=0
assert(not D.start('Red','roll1'))
local steps=0
while takeCount==0 and steps<200 do drain(1);steps=steps+1 end
assert(takeCount==1,'first deal never started')
g=state.complications
assert(not g.deckTemplate.ContainedObjects and not g.deckTemplate.DeckIDs,'retained a redundant full-deck template')
for i=1,g.operationIndex-1 do assert(not g.operations[i].job,'completed deck snapshot survived into dealing') end
local beforeDealWrites=rootWrites
drain()
assert(takeCount==10 and rootWrites-beforeDealWrites==1,'deals must not revalidate the entire game state')
for _,guid in pairs(g.slots) do assert(not objects[guid].locked) end
print('Setup: 254-card master, missing take callbacks, all ten deals, unlocked cards and bounded state writes passed.')
local function stopGame()
 D.button({color='Black'},'-1','button_StopSelect');D.button({color='Black'},'-1','button_StopSelect');drain()
 assert(not state.complications)
end
stopGame()

-- Permanently true engine readiness flags must not gate any of the ten deals.
-- Save after the first extraction, replaying its recorded intent as an older
-- stalled save would, and ensure the remaining nine are dealt exactly once.
holdTaken=true;takeCount=0
assert(not D.start('Red','roll1'))
steps=0
while takeCount==0 and steps<200 do drain(1);steps=steps+1 end
assert(takeCount==1)
g=state.complications
local first=g.operations[g.operationIndex-1]
assert(first.kind=='drawTop' and first.guid)
g.operationIndex=g.operationIndex-1
scheduled={};state.complications=clone(g)
state.complications.deckTemplate.ContainedObjects={{GUID='obsolete'}}
package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain();g=state.complications
assert(not g.error and takeCount==10,'reload duplicated the first card or failed to resume the remaining nine')
assert(not g.deckTemplate.ContainedObjects)
for _,guid in pairs(g.slots) do
 assert(objects[guid].spawning and objects[guid].loading_custom,'fixture must retain true readiness flags')
 assert(not objects[guid].locked)
end
stopGame()
print('Staggered dealing: persistent readiness flags do not block ten deals; interrupted first deal resumes without duplication.')
-- Reproduce the author's saved state: one card, empty queue, false exhaustion.
takeCount=0;assert(not D.start('Red','roll1'));steps=0
while takeCount==0 and steps<200 do drain(1);steps=steps+1 end
g=state.complications;g.operations={};g.operationIndex=1;g.exhausted=true
scheduled={};state.complications=clone(g)
package.loaded['core.complications']=nil;D=require('core.complications');D.restore();drain();g=state.complications
assert(takeCount==10 and not g.exhausted and not g.error)
for _,guid in pairs(g.slots) do assert(not objects[guid].locked) end
stopGame()
print('Pile identity: moved decks still deal/transfer; reload repairs a completed queue with false exhaustion.')
-- Do not silently resume a legacy save whose ten records overwrote the empty key.
local broken=Model.new(clone(target),{['']={zone='slot',up=false}})
state.complications=broken;D.restore()
assert(broken.error:find('empty card GUIDs',1,true))
assert(state.complications==broken and broken.cards[''],'corrupt save must not be silently rewritten')
assert(not warnings[#warnings]:find('Reload to retry',1,true))
print('Legacy empty-GUID corruption is reported without attempting unsafe recovery.')
