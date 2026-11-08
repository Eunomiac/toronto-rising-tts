package.path = "./?.ttslua;" .. package.path

package.preload["lib.constants"] = function() return { NPCSeats = {} } end
package.preload["core.npc_gameboard_snaps"] = function() return {} end

local StageApply = require("core.npc_stage_apply")

local function placement(u, v, mode)
    return { u = u, v = v, yaw = 0, npcLightMode = mode or "STANDARD" }
end

local function assertTrue(value, message)
    if value ~= true then error(message) end
end

local function assertNil(value, message)
    if value ~= nil then error(message) end
end

local before = { a = placement(1, 1), b = placement(2, 2) }
local moved = { a = placement(3, 3), b = placement(2, 2) }
local keys = StageApply.narrowReconcileKeys(moved, before, { a = { u = 3, v = 3 } }, {})
assertTrue(type(keys) == "table" and keys.a == true and keys.b == nil,
    "an existing-stage move should target only the changed NPC")

local added = { a = placement(1, 1), b = placement(2, 2), c = placement(3, 3) }
assertNil(StageApply.narrowReconcileKeys(added, before, { c = { u = 3, v = 3 } }, {}),
    "adding stage membership must use the complete reconcile")

local removed = { a = placement(1, 1) }
assertNil(StageApply.narrowReconcileKeys(removed, before, { b = { remove = true } }, {}),
    "removing stage membership must use the complete reconcile")

assertNil(StageApply.narrowReconcileKeys(moved, before, { a = { u = 3, v = 3 } }, { base = moved }),
    "a base replacement must use the complete reconcile")

local prewarm = function(key) return key == "b" or key == "c" end
local ordinaryKeys = StageApply.prewarmCharacterKeys(moved, before, { a = { u = 3, v = 3 } }, {}, prewarm)
assertTrue(#ordinaryKeys == 0,
    "an ordinary move must not wait on an unrelated parked placement")

local replacedKeys = StageApply.prewarmCharacterKeys(moved, before, { b = { u = 2, v = 2 } }, {}, prewarm)
assertTrue(#replacedKeys == 1 and replacedKeys[1] == "b",
    "an edited parked placement should still prewarm")

local addedKeys = StageApply.prewarmCharacterKeys(added, before, { c = { u = 3, v = 3 } }, {}, prewarm)
assertTrue(#addedKeys == 1 and addedKeys[1] == "c",
    "a newly added placement should prewarm")

local baseKeys = StageApply.prewarmCharacterKeys(moved, before, {}, { base = moved }, prewarm)
assertTrue(#baseKeys == 1 and baseKeys[1] == "b",
    "a base replacement should prewarm every resulting parked placement")

print("npc_stage_apply_policy.test.lua: OK")
