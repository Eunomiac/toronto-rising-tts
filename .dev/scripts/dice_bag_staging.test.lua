package.path = "./?.ttslua;" .. package.path

local G = require("lib.guids")
local bagOrigin = { x = 20, y = 5.98, z = -45 }
local normalBag = {
    getPosition = function() return bagOrigin end,
    positionToWorld = function(pos)
        return { x = bagOrigin.x + pos.x, y = bagOrigin.y + pos.y, z = bagOrigin.z + pos.z }
    end,
}

local color, dieKind, takeCount, registeredCount
getObjectFromGUID = function(guid)
    if guid == G.GetDiceNormalGUID(color) then return normalBag end
end
Global = { call = function(name, args)
    if name == "GlobalGetPcRollTrayYOffset" then return 0 end
    if name == "GlobalTagDieForActiveRoll" then return end
    assert(name == "GlobalOnBagDieSpawned", name)
    registeredCount = registeredCount + 1
    assert(args.color == color and args.dieType == dieKind and args.stagedCount == registeredCount)
end }
dofile("objects/dice_bag.ttslua")
randomRotation = function() return { 0, 0, 0 } end

local function testPool(seatColor, kind, tag, radius)
    color, dieKind, takeCount, registeredCount = seatColor, kind, 0, 0
    spawnedDice = {}
    self = {
        getTags = function() return { color .. "Object", tag } end,
        takeObject = function(args)
            takeCount = takeCount + 1
            -- The spawn position itself must clear the bag even if TTS cannot
            -- move a newly spawned die until a later frame.
            local dx = args.position.x - bagOrigin.x
            local dz = args.position.z - bagOrigin.z
            local layer = math.floor((takeCount - 1) / MAX_DICE_PER_ARC)
            local wantedRadius = radius + layer * ARC_LAYER_RADIUS_STEP
            assert(math.abs(dx * dx + dz * dz - wantedRadius * wantedRadius) < 0.001,
                color .. " " .. kind .. " die spawned outside the staging ring")
            assert(args.position.y == STAGING_WORLD_Y + layer * ARC_LAYER_Y_STEP)
            local guid = string.format("%06x", takeCount)
            return {
                getGUID = function() return guid end,
                getLock = function() return true end,
                setScale = function() end,
                setLock = function() end,
                setPositionSmooth = function() end,
            }
        end,
    }
    for _ = 1, 12 do
        spawnDieRedirect({ bagColor = color, dieType = kind })
    end
    assert(#spawnedDice == 12 and takeCount == 12 and registeredCount == 12)
end

for _, seatColor in ipairs({ "Brown", "Orange", "Red", "Pink", "Purple" }) do
    testPool(seatColor, "normal", "NormalDie", RADIUS)
    testPool(seatColor, "hunger", "HungerDie", RADIUS - RING_STEP)
end
print("PASS Standard and Hunger dice spawn in the arc and register successive additions on all five seats")
