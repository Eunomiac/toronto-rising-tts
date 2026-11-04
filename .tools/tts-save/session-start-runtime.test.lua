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
package.loaded["lib.util"] = { Type = type, clone = function(data) return { GUID = data.GUID } end }
package.loaded["lib.guids"] = { getObject = function(guid) return objects[guid] end }
package.loaded["lib.constants"] = { HIDDEN_OBJECT_WORLD_Y = -200, LockedObjects = { "012345", "fedcba" } }
package.loaded["lib.seat-role-identity"] = {}
package.loaded["lib.soundscape_catalog"] = {}
package.loaded["core.state"] = {
    getStateVal = function(_, key) return controls[key] end,
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
assert(not objectRules.areLockedObjectsReadyForInteractableLock(deferred), "unexpected missing lock must still block startup")
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
