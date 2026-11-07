package.path = "./?.ttslua;" .. package.path

local DK = require("lib.dice_kinds")

local function assertEqual(actual, expected, message)
    if actual ~= expected then
        error(string.format("%s: expected %s, got %s", message, tostring(expected), tostring(actual)))
    end
end

-- Blood Surge Rouse is independent from both manual and Oblivion-Rouse checks.
assertEqual(DK.isVoluntaryRouseBlocked(4), false, "Hunger 4 voluntary Rouse")
assertEqual(DK.rouseKindBlockedByPool({ bloodSurgeRouse = 1 }, DK.KIND_ROUSE), false,
    "Blood Surge Rouse must not block manual Rouse")
assertEqual(DK.rouseKindBlockedByPool({ bloodSurgeRouse = 1 }, DK.KIND_OBLIV_ROUSE), false,
    "Blood Surge Rouse must not block Oblivion-Rouse")

-- Manual and Oblivion-Rouse are still mutually exclusive with each other.
assertEqual(DK.rouseKindBlockedByPool({ oblivRouse = 1 }, DK.KIND_ROUSE), true,
    "Oblivion-Rouse blocks manual Rouse")
assertEqual(DK.rouseKindBlockedByPool({ rouse = 1 }, DK.KIND_OBLIV_ROUSE), true,
    "Manual Rouse blocks Oblivion-Rouse")

assertEqual(DK.isVoluntaryRouseBlocked(5), true, "Hunger 5 voluntary Rouse")

print("dice_kinds_rouse_policy.test.lua: OK")
