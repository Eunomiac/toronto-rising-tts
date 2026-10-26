package.path='./?.ttslua;'..package.path
local Model=require('lib.complications_model')
local catalog=require('lib.complications_catalog')
local function clone(v) if type(v)~='table' then return v end local o={} for k,x in pairs(v) do o[k]=clone(x) end return o end
local state,scheduled,objects,seq={}, {}, {}, 0
local function drain(limit)
 local n=0
 while #scheduled>0 and n<(limit or 2000) do n=n+1; table.remove(scheduled,1)() end
 assert(n<(limit or 2000) or limit, 'queue did not settle')
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
 o.addTag=function(t) o.tags[#o.tags+1]=t end
 o.setLock=function(v) o.locked=v end
 o.setInvisibleTo=function(v) o.invisible=v end
 o.highlightOn=function(v) o.highlight=v end
 o.highlightOff=function() o.highlight=nil end
 o.shuffle=function() end
 o.destruct=function() objects[id]=nil end
 o.getObjects=function()
  local a={} for _,v in ipairs(o.children or {}) do a[#a+1]={guid=v.id,gm_notes=v.notes} end return a
 end
 o.getData=function()
  local a={} for _,v in ipairs(o.children or {}) do a[#a+1]={GUID=v.id,GMNotes=v.notes,Tags=v.tags} end return {ContainedObjects=a}
 end
 o.takeObject=function(p)
  for i,v in ipairs(o.children) do if v.id==p.guid then
   table.remove(o.children,i)
   local c=make(v.id,'Card',v.notes,v.tags); c.setPosition(p.position)
   if #o.children==1 then
    local last=o.children[1];local single=make(last.id,'Card',last.notes,last.tags);single.position=clone(o.position);objects[id]=nil
   elseif #o.children==0 then objects[id]=nil end
   p.callback_function(c);return c
  end end
  error('take missing '..p.guid)
 end
 o.putObject=function(other)
  assert(other~=o,'self merge')
  local dest=o
  if o.tag~='Deck' then
   dest=make(nextGuid(),'Deck','',{'deckOfComplications'},{{id=id,notes=notes,tags=o.tags}})
   dest.position=clone(o.position);objects[id]=nil
  end
  dest.children[#dest.children+1]={id=other.getGUID(),notes=other.getGMNotes(),tags=other.tags};objects[other.getGUID()]=nil
  return dest
 end
 local uiTree={{tag='HorizontalLayout',attributes={id='controlsPanel'},children={}}}
 o.UI={setAttribute=function() end,setAttributes=function() end,
 getXmlTable=function() return uiTree end,setXmlTable=function(t) uiTree=t end}
 o.positionToWorld=function(p) return {x=o.position.x+p.x*10,y=o.position.y+p.y,z=o.position.z+p.z*10} end
 return o
end
function getObjectFromGUID(id) return objects[id] end
function getObjectsWithTag(t) local a={} for _,o in pairs(objects) do if o.hasTag(t) then a[#a+1]=o end end return a end
function spawnObjectData(p) local o=make(nextGuid(),'Card',p.data.GMNotes,p.data.Tags);o.setPosition(p.position);p.callback_function(o);return o end
UI={setAttributes=function() end}
Player={Action={FlipOver='flip'},getAvailableColors=function() return {'Black','Red','Pink'} end,getPlayers=function() return {} end}
local S={getStateVal=function(k) return state[k] end,setStateVal=function(v,k) state[k]=v end}
local U={clone=clone,await=function(f) scheduled[#scheduled+1]=f end,chain=function(fs) for _,f in ipairs(fs) do scheduled[#scheduled+1]=f end end,isStorytellerSteamPlayer=function(p) return (type(p)=='table' and p.color or p)=='Black' end,AlertGM=function(s) error(s) end}
local O={isHiddenObject=function(o) return o.hidden end,hideObject=function(o) if not o.hidden then o.previous={p=o.getPosition(),r=o.getRotation(),l=o.locked};o.hidden=true;o.position.y=-200 end end,restoreObject=function(o,p)
 p=p or {}; if o.hidden then o.position=o.previous.p;o.rotation=o.previous.r;o.locked=o.previous.l;o.hidden=false end
 if p.position then o.setPosition(p.position) end;if p.rotation then o.setRotation(p.rotation) end;if p.locked~=nil then o.setLock(p.locked) end
end}
package.loaded['core.state']=S;package.loaded['lib.util']=U;package.loaded['lib.constants']={};package.loaded['core.objects']=O
package.loaded['lib.guids']={GUIDS={COMPLICATIONS_BOARD='board',CSHEET_DICE_DRAWER_ANCHOR_ON_RED='anchor'}}
package.loaded['dashboard.push']={markWorldDirty=function() end}
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
make('base','Deck','',{'deckOfComplications'},base);make('source','Deck','',{'deckOfComplications','enhancedComplication'},enh)
local D=require('core.complications');assert(not D.start('Red','roll1'));drain()
local g=state.complications;assert(g and not g.error)
local count=0;for _,id in pairs(g.slots) do count=count+1;assert(objects[id]);assert(Model.available(g,g.cards[id]));assert(not objects[id].locked) end;assert(count==10)
local id=g.slots[1]
assert(not D.onPlayerAction({color='Pink'},'flip',{objects[id]}));assert(D.onPlayerAction({color='Red'},'flip',{objects[id]}));drain();assert(g.cards[id].up and objects[id].locked)
local total=Model.totals(g)
D.button({color='Black'},'-1','button_Negate');drain();assert(g.cards[id].negated);assert(Model.totals(g)==total);assert(#Model.candidates(g,'all')==0)
D.button({color='Black'},'-1','button_Negate');D.button({color='Black'},'-1','button_Enhance');drain();assert(objects[g.cards[id].clone]);assert(Model.totals(g)==total)
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
