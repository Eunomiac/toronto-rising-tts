package.path = "./?.ttslua;" .. package.path

local controls = {
    joinColdPoolsActive = true,
    joinColdPoolsBackup = { version = 1, entries = {
        { guid = "abcdef", kind = "soundscape_emitter", data = { GUID = "abcdef" } },
        { guid = "012345", kind = "asset_bundle" },
    } },
}
local objects = {}
local spawnCount = 0
local silenced = false
local providerCalls = 0
local hiddenObjects = {}
local G = require("lib.guids")
local normalGuid = G.GetDiceNormalGUID("Orange")
local candleGuid = G.GUIDS.SIGNAL_CANDLE_ORANGE
package.loaded["lib.util"] = {
    Type = type,
    clone = function(data) return { GUID = data.GUID } end,
    isGameObject = function(obj) return type(obj) == "table" end,
}
package.loaded["lib.constants"] = {
    HIDDEN_OBJECT_WORLD_Y = -200,
    LockedObjects = { "012345", "fedcba" },
    ClickableSeatControls = { [normalGuid] = true, [candleGuid] = true },
    PlayerColors = { "Orange" },
}
package.loaded["lib.seat-role-identity"] = {}
package.loaded["lib.soundscape_catalog"] = {}
package.loaded["core.state"] = {
    getStateVal = function(field, key)
        if field == "hiddenObjects" then return hiddenObjects end
        return controls[key]
    end,
    setStateVal = function(value, _, key) controls[key] = value end,
}
package.loaded["core.soundscape"] = { bootstrapSilenceStrayEmitterLoops = function() silenced = true end }
getObjectFromGUID = function(guid) return objects[guid] end
function GlobalSessionStartRestoreData(guid)
    assert(guid == "012345")
    providerCalls = providerCalls + 1
    return { GUID = guid, LuaScript = "restored script" }
end
spawnObjectData = function(params)
    local guid = params.data.GUID
    assert(objects[guid] == nil, "duplicate GUID")
    if guid == "012345" then assert(params.data.LuaScript == "restored script") end
    local obj = { getGUID = function() return guid end, loading_custom = true }
    objects[guid] = obj
    spawnCount = spawnCount + 1
    params.callback_function(obj)
    return obj
end

local pools = require("core.join_cold_pools")
local objectRules = require("core.objects")
local deferred = pools.deferredGuids()
assert(deferred.abcdef and deferred["012345"] and not deferred.fedcba)
assert(objectRules.areLockedObjectsReadyForInteractableLock(deferred), "missing objects are reported without blocking startup")
assert(objectRules.classifyUnresolvedLockedObjectRefs(deferred).missing[1] == "fedcba")
objects.fedcba = {}
assert(objectRules.areLockedObjectsReadyForInteractableLock(deferred), "deferred missing lock must not block startup")
assert(pools.isActive() and pools.hasColdEmitters())
assert(providerCalls == 0, "checking startup readiness must not decode object data")
local ready = pools.beginWarm()
assert(spawnCount == 2 and providerCalls == 1)
assert(not ready() and not silenced and pools.isActive())
assert(not objectRules.areLockedObjectsReadyForInteractableLock(deferred), "spawned but loading lock must block readiness")
objects.abcdef.loading_custom = false
assert(not ready() and pools.isActive())
objects["012345"].loading_custom = false
assert(ready() and silenced and not pools.isActive())
assert(objectRules.areLockedObjectsReadyForInteractableLock())
assert(pools.beginWarm()() and spawnCount == 2)
print("PASS staged restore preserves GUIDs and waits for both kinds of bundle")

local function prop(guid, y, locked)
    local pos = { x = 0, y = y, z = 0 }
    local tags = {}
    return {
        interactable = true,
        getGUID = function() return guid end,
        getPosition = function() return pos end,
        setPosition = function(value) pos = value end,
        getLock = function() return locked end,
        setLock = function(value) locked = value end,
        hasTag = function(tag) return tags[tag] == true end,
        addTag = function(tag) tags[tag] = true end,
        removeTag = function(tag) tags[tag] = nil end,
        setInvisibleTo = function() end,
    }
end

local ordinaryProp = prop("aaaaaa", 6, false)
objectRules.hideObject(ordinaryProp)
objectRules.hideObject(ordinaryProp)
assert(not ordinaryProp.interactable and ordinaryProp.getLock())
objectRules.restoreObject(ordinaryProp)
assert(ordinaryProp.interactable and not ordinaryProp.getLock() and ordinaryProp.getPosition().y == 6,
    "a second parking pass must preserve the active lock and click flags")

for _, guid in ipairs({ normalGuid, candleGuid }) do
    local control = prop(guid, -200, true)
    control.interactable = false
    control.addTag("HiddenObject")
    hiddenObjects[guid] = { position = { x = 0, y = 6, z = 0 }, locked = true, interactable = false }
    objectRules.restoreObject(control)
    assert(control.interactable and control.getLock() and control.getPosition().y == 6,
        "restoring a seat control must repair click access from an older save")
end
print("PASS repeated parks preserve active interaction and restored seat controls accept clicks")
