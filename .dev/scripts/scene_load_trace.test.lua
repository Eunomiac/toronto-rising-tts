package.path = "./?.ttslua;" .. package.path

local Trace = require("core.scene_load_trace")

local now = 0
local gameNow = 0
Trace._setClock(function()
    return now
end)
Trace._setGameClock(function()
    return gameNow
end)
Trace._reset()

Trace.start("preload", {
    label = "Grand Audience (2 NPCs)",
    note = "Budget note.",
})
local preloadId = Trace.currentId()
now = 0.2
gameNow = 0.2
Trace.mark("batch 1-2")
Trace.noteNpc("alpha", { ms = 180, created = true, loading = true, action = "preload", imageScalar = 12, targetScalar = 53 })
Trace.noteNpc("beta", { ms = 20, liveBefore = true, parked = true, loading = false, action = "preload" })
Trace.noteNpc("alpha", { loading = false })
now = 1.5
gameNow = 0.5
Trace.mark("image wait", { budgetSec = 0 })
local report = Trace.finish({ ok = true })
local text = Trace.format(report)

assert(report.id == preloadId, "finished report keeps its id")
assert(Trace.isRecording() == false, "finish closes the report")
assert(report.npcs.alpha.calls == 1, "a flag refresh must not count as another call")
assert(report.npcs.alpha.loading == false, "the later image state replaces the earlier one")
assert(report.npcs.alpha.created == true, "created stays set")
assert(math.abs(report.marks[2].schedulerDriftMs - 1000) < 0.01, "host/game-time split exposes scheduler drift")
assert(string.find(text, "Grand Audience (2 NPCs)", 1, true), "header names the scene")
assert(string.find(text, "image-wait budget already expired", 1, true), "an exhausted wait budget is called out")
assert(string.find(text, "created this action 1", 1, true), "summary counts created figurines")
assert(string.find(text, "scheduler drift 1000 ms", 1, true), "slow marks print scheduler drift")
assert(string.find(text, "alpha", 1, true), "a slow or reloaded NPC is listed")
assert(not string.find(text, "beta", 1, true), "a fast reused NPC stays in the summary only")

local printed = {}
local realPrint = print
print = function(line)
    printed[#printed + 1] = line
end
Trace.start("scatter-group", { label = "Red → group 2" })
local scatterId = Trace.currentId()
now = now + 3
local interrupted = Trace.start("scene-transition", { label = "district / site" })
assert(interrupted ~= nil and interrupted.interrupted == true, "a new report closes the previous one")
assert(interrupted.kind == "scatter-group", "the closed report is the scatter move")
assert(Trace.currentId() ~= scatterId, "the new report has its own id")
assert(#printed == 1, "the interrupted report prints once")
Trace.finish({ ok = true })
print = realPrint

print("scene_load_trace.test.lua: OK")
