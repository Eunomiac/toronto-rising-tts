package.path = package.path .. ";./?.ttslua;./?/init.ttslua"

package.preload["lib.constants"] = function() return { NPCSeats = {} } end
package.preload["core.npc_gameboard_snaps"] = function() return {} end
package.preload["core.hud_blindfold"] = function()
    return {
        estimateStagedTransitionSec = function(opts)
            return opts.leadInDelaySec + opts.fadeOutSec + opts.fadeInSec
                + math.max(0, opts.settleDelaySec - opts.workSettleSec - opts.fadeInSec)
        end,
    }
end
package.preload["core.npc_preload_pool"] = function() return { GRID_CAPACITY = 1024 } end
package.preload["core.npcs"] = function()
    return { inspectPreloadPool = function() return { capacity = 1024, reserved = 3, ready = 3 } end }
end
package.preload["core.soundscape"] = function()
    return { validateEmitterHealth = function() return { ok = true, expected = 12, usable = 12 } end }
end

local traceSnapshot = { rows = {}, events = {}, droppedEvents = 0 }
local traceActive = false
package.preload["lib.sync_trace"] = function()
    return {
        beginTransientCapture = function() traceActive = true end,
        finishTransientCapture = function()
            assert(traceActive, "capture should be active")
            traceActive = false
            return traceSnapshot
        end,
        cancelTransientCapture = function()
            local wasActive = traceActive
            traceActive = false
            return wasActive
        end,
    }
end

UI = {
    loading = false,
    getAttribute = function(id, attr) return id .. ":" .. attr end,
    getValue = function(id) return "value:" .. id end,
    getXml = function() return "<Panel />" end,
}

local PAV = require("core.pav_verification")
assert(#PAV.list() == 5, "initial registry should expose five checks")
assert(PAV.run("TOR-755").status == "pass", "stage narrowing contract should pass")
assert(PAV.run("TOR-756").status == "pass", "portrait conditional contract should pass")
assert(PAV.run("TOR-758").status == "pass", "Rouse policy contract should pass")
assert(PAV.run("TOR-760").status == "pass", "game-night transition contract should pass")

traceSnapshot = {
    rows = {
        { label = "NPCS.moveNpcToStagePlacement", calls = 1 },
    },
    events = {},
    droppedEvents = 0,
}
PAV.startCapture("TOR-755")
assert(PAV.finishCapture().status == "pass", "one staged NPC move with no broad reconcile should pass")

traceSnapshot = {
    rows = {},
    events = {
        { label = "GlobalUI.fullRemount", fields = { mode = "full" } },
    },
    droppedEvents = 0,
}
PAV.startCapture("TOR-757")
assert(PAV.finishCapture().status == "pass", "full remount event should pass")

local uiProbe = PAV.probe("ui", {
    includeXmlLength = true,
    elements = { { id = "sample", value = true, attributes = { "active" } } },
})
assert(uiProbe.xmlLength == 9, "UI probe should report XML length only when requested")
assert(uiProbe.rows[1].attributes.active == "sample:active", "UI probe should return requested attributes")
assert(PAV.stopCapture().status == "idle", "stop should be harmless while idle")

print("pav_verification.test.lua: PASS")
