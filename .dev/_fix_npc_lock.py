from pathlib import Path

p = Path("core/npcs.ttslua")
s = p.read_text(encoding="utf-8")

# Comment on applyNpcPairPhysicalPresentation
old = """--- Figurine scale + tooltip and paired spotlight scale (under-table pool uses small objects, no figurine tooltips).
--- @param fig Object|nil
--- @param lit Object|nil
--- @param areaKey string
local function applyNpcPairPhysicalPresentation(fig, lit, areaKey)"""
new = """--- NPC figurines stay TTS-locked at all times (players cannot drag); `rec.locked` is Storyteller "pin" for script moves only.
--- @param fig Object|nil
local function ensureNpcFigurinePhysicsLocked(fig)
    if U.isGameObject(fig) and fig.setLock ~= nil then
        fig.setLock(true)
    end
end

--- Figurine scale + tooltip and paired spotlight scale (preload = small, tooltips off; active areas/seats = full, tooltips on).
--- @param fig Object|nil
--- @param lit Object|nil
--- @param areaKey string
local function applyNpcPairPhysicalPresentation(fig, lit, areaKey)"""
if old not in s:
    raise SystemExit("applyNpcPairPhysicalPresentation header missing")
s = s.replace(old, new, 1)

old = """    if U.isGameObject(lit) and lit.setScale ~= nil then
        lit.setScale(Vector(ls, ls, ls))
    end
end

--- @param rec table|nil
--- @return boolean
local function npcInstanceIsParkedInPreload(rec)"""
new = """    if U.isGameObject(lit) and lit.setScale ~= nil then
        lit.setScale(Vector(ls, ls, ls))
    end
    ensureNpcFigurinePhysicsLocked(fig)
end

--- @param rec table|nil
--- @return boolean
local function npcInstanceIsParkedInPreload(rec)"""
if old not in s:
    raise SystemExit("applyNpcPair end missing")
s = s.replace(old, new, 1)

old = """    figurine.setRotation(Vector(0, yawDeg, 0))
end

--- @param npcName string
--- @param modeKey string"""
new = """    figurine.setRotation(Vector(0, yawDeg, 0))
    ensureNpcFigurinePhysicsLocked(figurine)
end

--- @param npcName string
--- @param modeKey string"""
if old not in s:
    raise SystemExit("applyFigurinePlacement end missing")
s = s.replace(old, new, 1)

old = """                fig.setLock(true)

                --- Light: `spawnObjectData` from embedded save-shape defaults"""
new = """                ensureNpcFigurinePhysicsLocked(fig)

                --- Light: `spawnObjectData` from embedded save-shape defaults"""
if old not in s:
    raise SystemExit("spawn setLock missing")
s = s.replace(old, new, 1)

old = """                    npcLightMode = effectiveNpcLightModeForAreaPlacement(areaForSpawn, opts),
                    locked = false,
                }"""
new = """                    npcLightMode = effectiveNpcLightModeForAreaPlacement(areaForSpawn, opts),
                    --- Storyteller panel "lock in place" (blocks script moves); not TTS object lock (always locked).
                    locked = false,
                }"""
if old not in s:
    raise SystemExit("rec locked missing")
s = s.replace(old, new, 1)

old = """function NPCS.onObjectDropped(obj)
    local npcName = NPCS.resolveNpcNameFromFigurine(obj)
    if npcName then
        NPCS.applyCurrentLightMode(npcName, 0)
    end
end"""
new = """function NPCS.onObjectDropped(obj)
    local npcName = NPCS.resolveNpcNameFromFigurine(obj)
    if npcName then
        ensureNpcFigurinePhysicsLocked(obj)
        NPCS.applyCurrentLightMode(npcName, 0)
    end
end"""
if old not in s:
    raise SystemExit("onObjectDropped missing")
s = s.replace(old, new, 1)

old = """isNpcLocked = function(rec)
    if U.Type(rec) ~= "table" then
        return false
    end
    return rec and rec.locked == true or tostring(rec and rec.locked) == "true"
end"""
new = """--- Storyteller "pin in place" for script-driven moves (`moveNpcToArea`, etc.). Independent of TTS `setLock` (always on).
isNpcLocked = function(rec)
    if U.Type(rec) ~= "table" then
        return false
    end
    return rec.locked == true or tostring(rec.locked) == "true"
end"""
if old not in s:
    raise SystemExit("isNpcLocked missing")
s = s.replace(old, new, 1)

old = """            if fig ~= nil and lit ~= nil then
                ensureSpotlightTag(lit)
                L.registerNpcSpotlightModes(name, rec.lightGuid)
            end"""
new = """            if fig ~= nil and lit ~= nil then
                ensureNpcFigurinePhysicsLocked(fig)
                ensureSpotlightTag(lit)
                L.registerNpcSpotlightModes(name, rec.lightGuid)
            end"""
if old not in s:
    raise SystemExit("restore fig block missing")
s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")
print("ok")
