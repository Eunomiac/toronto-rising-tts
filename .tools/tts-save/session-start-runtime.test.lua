package.path = "./?.ttslua;" .. package.path

local controls = {
    joinColdPoolsActive = true,
    joinColdPoolsBackup = { version = 1, entries = {
        { guid = "abcdef", kind = "soundscape_emitter", data = { GUID = "abcdef" } },
        { guid = "012345", kind = "asset_bundle", data = { GUID = "012345" } },
    } },
}
local objects = {}
local spawnCount = 0
local silenced = false
package.loaded["lib.util"] = { clone = function(data) return { GUID = data.GUID } end }
package.loaded["lib.guids"] = {}
package.loaded["lib.soundscape_catalog"] = {}
package.loaded["core.state"] = {
    getStateVal = function(_, key) return controls[key] end,
    setStateVal = function(value, _, key) controls[key] = value end,
}
package.loaded["core.soundscape"] = { bootstrapSilenceStrayEmitterLoops = function() silenced = true end }
getObjectFromGUID = function(guid) return objects[guid] end
spawnObjectData = function(params)
    local guid = params.data.GUID
    assert(objects[guid] == nil, "duplicate GUID")
    local obj = { getGUID = function() return guid end, loading_custom = true }
    objects[guid] = obj
    spawnCount = spawnCount + 1
    params.callback_function(obj)
    return obj
end

local pools = require("core.join_cold_pools")
assert(pools.isActive() and pools.hasColdEmitters())
local ready = pools.beginWarm()
assert(spawnCount == 2)
assert(not ready() and not silenced and pools.isActive())
objects.abcdef.loading_custom = false
assert(not ready() and pools.isActive())
objects["012345"].loading_custom = false
assert(ready() and silenced and not pools.isActive())
assert(pools.beginWarm()() and spawnCount == 2)
print("PASS staged restore preserves GUIDs and waits for both kinds of bundle")
