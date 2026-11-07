package.path = package.path .. ";./?.ttslua;./?/init.ttslua"

package.preload["lib.constants"] = function() return { NPCSeats = {} } end
package.preload["core.npc_gameboard_snaps"] = function() return {} end

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
assert(#PAV.list() == 4, "initial registry should expose four checks")
assert(PAV.run("TOR-755").status == "pass", "stage narrowing contract should pass")
assert(PAV.run("TOR-756").status == "pass", "portrait conditional contract should pass")
assert(PAV.run("TOR-758").status == "pass", "Rouse policy contract should pass")

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
