package.path = "./?.ttslua;" .. package.path

local objects = {}
local parked = {}

package.preload["lib.constants"] = function()
    return { HIDDEN_OBJECT_WORLD_Y = -200 }
end
package.preload["lib.guids"] = function()
    return { getObject = function(guid) return objects[guid] end }
end
package.preload["core.objects"] = function()
    return {
        hideObject = function(obj, opts)
            parked[obj.guid] = opts.parkPosition
            return true
        end,
    }
end
package.preload["lib.util"] = function()
    local function clone(value)
        if type(value) ~= "table" then return value end
        local out = {}
        for key, item in pairs(value) do out[key] = clone(item) end
        return out
    end
    return {
        clone = clone,
        isGameObject = function(obj) return type(obj) == "table" and obj.live == true end,
    }
end

local Pool = require("core.npc_preload_pool")

assert(Pool.GRID_SIDE == 32, "pool grid must be 32 x 32")
assert(Pool.GRID_CAPACITY == 1024, "pool grid must have 1,024 bounded pair slots")
assert(Pool.isEnabled() == false, "pool must start disabled")

local first = Pool.parkPosition(1, false)
local second = Pool.parkPosition(2, false)
local last = Pool.parkPosition(1024, false)
assert(first.y == -200 and last.y == -200, "figurines must use the canonical hidden Y")
assert(second.x - first.x == 3, "adjacent grid slots must be three world units apart")
assert(last.x > first.x and last.z > first.z, "last grid slot must be in the opposite grid corner")

local instances = { alpha = { preloadSlot = 1 }, beta = {} }
local betaSlot = assert(Pool.reserveSlot("beta", instances.beta, instances))
assert(betaSlot == 2, "slot reservation must skip occupied slots")

Pool.enable()
objects.fig = { guid = "fig", live = true }
objects.lit = { guid = "lit", live = true }
local rec = {
    figurineGuid = "fig",
    lightGuid = "lit",
    preloadSlot = betaSlot,
    areaKey = "__stage_board__",
    seatedSeatKey = "NPC1",
    stagePlacement = { u = 1, v = 2 },
    npcLightMode = "SPOTLIGHT",
}
local pooled, err = Pool.parkRecord(rec)
assert(err == nil and pooled ~= nil, "a complete reserved pair must park")
assert(pooled.areaKey == Pool.AREA_KEY and pooled.npcLightMode == "OFF", "parked pair must become an unlit pool record")
assert(pooled.seatedSeatKey == nil and pooled.stagePlacement == nil, "parked pair must drop live placement state")
assert(parked.fig.y == -200 and parked.lit.y == -196, "figurine and light must park together in their pair slot")

Pool.disable("injected failure")
assert(Pool.isEnabled() == false, "pool failure must disable reuse")
assert(Pool.shouldRetain(pooled) == false, "disabled pool must fall back to ordinary teardown")

print("npc_preload_pool.test.lua: OK")
