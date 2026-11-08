package.path = package.path .. ";./?.ttslua;./?/init.ttslua"

local state = { debug = {} }
package.preload["core.state"] = function()
    return {
        getStateVal = function(key) return state[key] end,
        setStateVal = function(value, key, child)
            state[key] = state[key] or {}
            state[key][child] = value
        end,
    }
end

local modules = {
    "core.sync", "core.scenes", "core.soundscape", "core.lighting", "core.hud_overlays",
    "core.hud_player", "core.npcs", "core.stage_tokens", "lib.rotational-seat-layout",
    "core.spotlight", "core.coterie", "core.projects", "core.scene_library", "core.phases",
    "core.character_sheets", "core.csheet_slices", "core.conditions", "lib.dice_bag_visibility",
    "core.storyteller_stats_panel", "core.storyteller_projects_panel", "core.storyteller_scenes_panel",
    "core.objects", "lib.figurine_seat_layout", "lib.seat-role-identity", "core.compulsions",
}
local shared = {}
local function noop() return "ok" end
for _, name in ipairs(modules) do
    package.preload[name] = function() return shared end
end
for _, field in ipairs({
    "full", "player", "npcs", "soundscape", "ui", "reconcileFromState", "reconcileTopFogFromState",
    "reconcileSkyboxFromState", "applyDefaultNoSceneEnvironment", "restoreActiveSceneWorld", "InitLights",
    "reconcileAllPlayers", "reconcileForPlayer", "syncAll", "updatePlayerUI", "reconcileAllFromState",
    "moveNpcToStagePlacement", "reconcileFamilyOffSpotlight", "reconcilePcSeatHiddenObjectsFromState",
    "applyOccupantRigs", "reconcileSelectedCardsToAnchors", "reconcileYStateSeatObjectVisibilityFromWorld",
    "findObjectByRoleIdentity", "reconcileForSeat", "computePcSeatPresentationInputFingerprint", "computeOverlayInputFingerprint",
    "SetTableTo", "SyncTable", "resolveSeatObjectsFromTable", "reconcileAll", "reconcileCourtProjectsAll",
    "mirrorActiveLibrarySessionSceneFromLiveIfLinked", "reconcileParticleEmitterFromPhase",
    "refreshCharacterSheetsForColor", "refreshAllCharacterSheets", "compute", "afterChange", "refresh",
}) do
    shared[field] = noop
end
UpdateUIDisplays = noop
GlobalOnBagDieSpawned = noop
GlobalSpawnDieFromBag = function() return GlobalOnBagDieSpawned() end
GlobalDiceBagClick = function() return GlobalSpawnDieFromBag() end

local Trace = require("lib.sync_trace")
local originalFull = shared.full
local originalBagClick = GlobalDiceBagClick
Trace.beginTransientCapture("test")
assert(Trace.isEnabled() == true, "capture should enable tracing in memory")
assert(shared.full ~= originalFull, "capture should install wrappers")
shared.full()
assert(GlobalDiceBagClick() == "ok", "tracing must preserve the dice bag call's result")
Trace.report("verification.event", { outcome = "ran", mode = "full", nested = {} })
local snapshot = Trace.finishTransientCapture()
assert(Trace.isEnabled() == false, "finishing should disable transient tracing")
assert(shared.full == originalFull, "finishing should restore original functions")
assert(GlobalDiceBagClick == originalBagClick, "finishing should restore the dice bag click handler")
assert(snapshot.active == false, "returned snapshot should be closed")
assert(#snapshot.rows >= 2, "snapshot should contain the wrapped call and explicit event")
assert(#snapshot.events >= 2, "capture should retain bounded structured events")
assert(snapshot.events[#snapshot.events].fields.mode == "full", "simple event fields should survive")
assert(snapshot.events[#snapshot.events].fields.nested == nil, "nested fields should be excluded from JSON evidence")
local captured = {}
for _, event in ipairs(snapshot.events) do captured[event.label] = true end
assert(captured.GlobalDiceBagClick and captured.GlobalSpawnDieFromBag and captured.GlobalOnBagDieSpawned,
    "the capture must distinguish click delivery, spawn request, and spawn registration")
assert(Trace.cancelTransientCapture() == false, "stopping while idle should be harmless")

print("sync_trace_transient.test.lua: PASS")
