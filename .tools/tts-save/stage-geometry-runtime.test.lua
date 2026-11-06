package.path = "./?.ttslua;" .. package.path
function Vector(a, b, c)
    if type(a) == "table" then return { x = a.x or a[1], y = a.y or a[2], z = a.z or a[3] } end
    return { x = a, y = b, z = c }
end
package.loaded["lib.util"] = { isGameObject = function(obj) return type(obj) == "table" end }
local active
package.loaded["lib.guids"] = { GUIDS = { STAGE_BOARD = "3d2aef" }, getObject = function() return active end }
local function board(scaleX, scaleZ, modelHalf)
    return {
        getGUID = function() return "3d2aef" end,
        getBounds = function() return { center = Vector(0, -200, 62.0977), size = Vector(2 * modelHalf * scaleX, 1, 2 * modelHalf * scaleZ) } end,
        getRotation = function() return Vector(0, 0, 0) end,
        positionToLocal = function(p) return Vector(p.x / scaleX, p.y + 200, (p.z - 62.0977) / scaleZ) end,
        positionToWorld = function(p) return Vector(p.x * scaleX, p.y - 200, p.z * scaleZ + 62.0977) end,
    }
end
active = board(800, 288.904846, 1)
local original = assert(loadfile("core/npc_gameboard_board.ttslua"))()
local expected = {}
local points = { { 0.5, 0.5 }, { 0.3, 0.4 }, { 0.75, 0.6 }, { 0.6, 0.8 } }
for i, p in ipairs(points) do expected[i] = original.worldFromUv(p[1], p[2], { groundLevel = -60 }) end
active = board(1600, 577.809692, 0.5)
local replacement = assert(loadfile("core/npc_gameboard_board.ttslua"))()
for i, p in ipairs(points) do
    local actual = replacement.worldFromUv(p[1], p[2], { groundLevel = -60 })
    for _, axis in ipairs({ "x", "y", "z" }) do assert(math.abs(actual[axis] - expected[i][axis]) < 0.000001, axis .. " stage mapping drift") end
end
print("PASS native stage block preserves center and far-group figurine world positions")
