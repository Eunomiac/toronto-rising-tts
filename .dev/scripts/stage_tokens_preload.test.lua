package.path = "./?.ttslua;" .. package.path

local objects, tokens, instances, placements = {}, {}, {}, {}
local spawns, boundsReads, restores, lightWrites = 0, 0, 0, 0
local nextPoll
local hiddenFrom = { "Orange", "White", "Grey" }
local board = {
    getBounds = function()
        boundsReads = boundsReads + 1
        return { center = { x = 0, z = 0 }, size = { x = 40, z = 20 } }
    end,
}
objects.board = board
function Vector(x, y, z) return { x = x, y = y, z = z } end
getObjectsWithTag = function() return {} end
package.loaded["lib.constants"] = { HIDDEN_OBJECT_WORLD_Y = -200, HideFromPcSeatsAndSpectators = hiddenFrom }
package.loaded["lib.guids"] = { GUIDS = { CONTROL_BOARD = "board" }, getObject = function(guid) return objects[guid] end }
package.loaded["lib.util"] = {
    isGameObject = function(obj) return type(obj) == "table" end,
    await = function(fn) nextPoll = fn end,
}
package.loaded["core.state"] = {
    getStateVal = function(root)
        if root == "npcs" then return instances end
        return placements
    end,
}
package.loaded["core.objects"] = { restoreObject = function() restores = restores + 1 end }
package.loaded["core.lighting"] = {
    LIGHTMODES = {},
    GetLight = function() return nil end,
    applyTransientLightMode = function() lightWrites = lightWrites + 1 end,
}
package.loaded["core.npcs"] = {
    characters = { actor = { fullName = "Actor" }, guest = { fullName = "Guest" } },
    getInstanceRecord = function(key) return instances[key] end,
    buildResolvedLightModeTable = function() return {} end,
    lightRegistryName = function(guid) return guid end,
}
package.loaded["core.npc_gameboard_board"] = { worldOnControlBoard = function() return { y = 5 } end }
package.loaded["lib.scatter_occupancy"] = { polarAreaNameAt = function() return nil end }
local art = { token = { front = "front", back = "back" } }
package.loaded["lib.npc_art_urls"] = { actor = art, guest = art }

spawnObject = function(args)
    spawns = spawns + 1
    local guid, tags = tostring(spawns), {}
    local obj = { position = args.position, rotation = args.rotation }
    obj.getGUID = function() return guid end
    obj.getScale = function() return { x = args.scale[1] } end
    obj.getPosition = function() return obj.position end
    obj.setPosition = function(pos) obj.position = pos end
    obj.setRotationSmooth = function(rot) obj.rotation = rot end
    obj.setCustomObject = function(custom) obj.custom = custom end
    obj.getCustomObject = function() return obj.custom end
    obj.setName = function(name) obj.name = name end
    obj.setGMNotes = function(notes) obj.notes = notes; tokens[notes] = obj end
    obj.getGMNotes = function() return obj.notes end
    obj.addTag = function(tag) tags[tag] = true end
    obj.removeTag = function(tag) tags[tag] = nil end
    obj.hasTag = function(tag) return tags[tag] == true end
    obj.setLock = function(locked) obj.locked = locked end
    obj.setInvisibleTo = function(colors) assert(colors == hiddenFrom) end
    obj.destruct = function() objects[guid] = nil end
    objects[guid] = obj
    return obj
end

local Pool = require("core.npc_preload_pool")
local StageTokens = require("core.stage_tokens")
local Spotlight = require("core.npc_gameboard_spotlight")
local hovered
Player = { Black = { getHoverObject = function() return hovered end } }
placements.actor = { u = 0.5, v = 0.5, npcLightMode = "STANDARD" }
instances.actor = { lightGuid = "actorLight" }
objects.actorLight = {}
instances.guest = { preloadSlot = 1, areaKey = Pool.AREA_KEY, lightGuid = "guestLight" }
objects.guestLight = {}

StageTokens.reconcileFromState()
assert(spawns == 1, "the cold pool must not add board tokens")
Pool.enable()
StageTokens.reconcileFromState()
local actor, guest = tokens["npcToken:actor"], tokens["npcToken:guest"]
assert(spawns == 2 and guest.locked and guest.name == "Guest (Offstage)" and guest.position.x < actor.position.x)
assert(StageTokens.characterKeyForSpotlight(guest) == nil)
local guestPosition, before = guest.position, boundsReads
StageTokens.reconcileFromState()
assert(spawns == 2 and boundsReads == before and guest.position == guestPosition)

hovered = guest
Spotlight.onControlBoardSpotlightHotkey("Black", guest, false)
Spotlight.onControlBoardSpotlightHotkey("Black", guest, true)
assert(restores == 0 and lightWrites == 0, "offstage hover must leave both lights alone")

hovered = actor
Spotlight.onControlBoardSpotlightHotkey("Black", actor, false)
assert(restores == 1 and lightWrites == 2)
hovered = guest
nextPoll()
assert(restores == 1 and lightWrites == 3, "sweeping onto an offstage token must clear the preview")
nextPoll()
Spotlight.onControlBoardSpotlightHotkey("Black", guest, true)
assert(lightWrites == 3, "remaining offstage or releasing the hotkey must not write the lights again")

placements.guest = { u = 0.4, v = 0.4, npcLightMode = "OFF" }
instances.guest.areaKey = "__stage_board__"
StageTokens.reconcileFromState()
assert(spawns == 2 and guest.name == "Guest" and not guest.locked and guest.rotation.z == 180)
assert(guest.position.x > guestPosition.x, "entering the stage must move the same token into the stage rows")
assert(StageTokens.characterKeyForSpotlight(guest) == "guest")
Spotlight.onControlBoardSpotlightHotkey("Black", guest, false)
assert(restores == 2 and lightWrites == 5)

-- A park can precede the board reconcile. Stale placement/token state must
-- still refuse a Spotlight and clear the previous indicator.
instances.guest.areaKey = Pool.AREA_KEY
nextPoll()
assert(restores == 2 and lightWrites == 6, "a parked instance with an old stage token must refuse Spotlight")
placements.guest = nil
StageTokens.reconcileFromState()
assert(spawns == 2 and guest.locked and guest.name == "Guest (Offstage)" and guest.rotation.z == 0)
Pool.disable("test reset")
StageTokens.reconcileFromState()
assert(objects[guest.getGUID()] == nil and objects[actor.getGUID()] == actor)

print("stage_tokens_preload.test.lua: OK")
