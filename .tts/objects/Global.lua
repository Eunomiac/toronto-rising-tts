--[[
    Global Script Entry Point (global.ttslua)
    This is the main entry point for the TTS module.
    It bootstraps the module by requiring core libraries and initializing the game state.
]]

-- Load shared utilities and constants
U = require("lib.util")
C = require("lib.constants")

-- Load core modules
S = require("core.state")
M = require("core.main")
Z = require("core.zones")
Scenes = require("core.scenes")
O = require("core.objects")
local UIH = require("lib.ui_helpers")

-- Load debug module (only in development - exposes test functions globally)
local DEBUG = require("core.debug")

-- Load Console++ integration (optional - enables external command support)
-- This allows external tools to send commands to the game via onExternalMessage
require("lib.console")

-- Initialize game state table
gameState = {}

--[[
    Load UI XML
    The UI XML uses TTS Tools bundling:
    - .tts/objects/Global.xml contains <Include src="ui/..." /> tags
    - ui/hud.xml is the source (sync to .tts/objects/Global.xml)
    - On "Save and Play", the extension bundles all Includes and sends to TTS
    - No hardcoded XML in Lua; the bundled XML comes from the extension
    - refreshLightDebugPanel() injects dynamic spotlight rows at <!-- LIGHT_TABLE_ROWS -->
]]

--[[
    onLoad - Called when the game loads or is reset
    @param saved_data - JSON string containing saved game state
]]
function onLoad(saved_data)
    print("--- VTM5E Module Loaded ---")

    -- Print host Steam ID for hardcoding into C.StorytellerID (lib/constants.ttslua)
    local host = U.getHost and U.getHost()
    if host and host.steam_id then
        print("Host Steam ID (use for C.StorytellerID in lib/constants.ttslua): " .. tostring(host.steam_id))
    end

    -- Clear all debug logs to start fresh for this session
    DEBUG.clearAllLogs()

    -- Initialize game state from saved data or defaults
    S.InitializeGameState(saved_data)

    -- Initialize zones module
    Z.onLoad()

    -- Initialize main module
    M.onLoad()

    -- Initialize scenes module (loads default or saved scene)
    Scenes.onLoad()

    -- UI XML is set by TTS Tools extension from bundled .tts/objects/Global.xml
    -- Inject dynamic spotlight rows into the LIGHT_TABLE_ROWS placeholder
    LightDebug.refreshLightDebugPanel()

    -- Update UI displays with current state
    UpdateUIDisplays()

    -- Debug module help (optional - shows available test commands)
    -- DEBUG.help()

    print("Module initialization complete.")
end

--[[
    onSave - Called when the game is saved
    @return JSON string containing game state to save
]]
function onSave()
    -- Wrap in pcall to catch any errors during save
    -- This prevents the save system from crashing and repeating errors
    local success, result = pcall(function()
        -- Get save-safe state (whitelist approach - only includes explicitly listed fields)
        local state = S.getGameState(true)

        if state == nil then
            return ""  -- Return empty string if state is nil
        end

        if type(state) ~= "table" then
            print("WARNING: onSave() - state is not a table, type: " .. type(state))
            return ""
        end

        -- Dump complete gameState to file before save
        -- DEBUG.logStateToFile("BEFORE_SAVE")

        -- Debug: Inspect players structure before encoding
        if state.players then
            print("DEBUG onSave: Inspecting players structure...")
            print("DEBUG onSave: players type: " .. type(state.players))
            print("DEBUG onSave: players keys count: " .. (state.players and #U.getKeys(state.players) or 0))

            -- First, check what's actually in the raw gameState.players (before buildSaveState)
            print("DEBUG onSave: Checking RAW gameState.players structure...")
            local rawPlayers = S.getGameState(false).players
            if rawPlayers then
                print("DEBUG onSave: Raw players type: " .. type(rawPlayers))
                print("DEBUG onSave: Raw players has " .. #U.getKeys(rawPlayers) .. " keys")

                -- Check the "Red" entry specifically
                if rawPlayers["Red"] then
                    print("DEBUG onSave: Raw players['Red'] exists, type: " .. type(rawPlayers["Red"]))
                    if type(rawPlayers["Red"]) == "table" then
                        print("DEBUG onSave: Raw players['Red'] is a table with keys: " .. table.concat(U.getKeys(rawPlayers["Red"]), ", "))
                        -- Check for metatable
                        local mt = getmetatable(rawPlayers["Red"])
                        if mt then
                            print("DEBUG onSave: WARNING - players['Red'] has a metatable!")
                            for k, v in pairs(mt) do
                                print("DEBUG onSave:   metatable[" .. tostring(k) .. "] = " .. tostring(v) .. " (type: " .. type(v) .. ")")
                            end
                        end
                        -- Try to access each field individually
                        for key, val in pairs(rawPlayers["Red"]) do
                            local keyType = type(key)
                            local valType = type(val)
                            print("DEBUG onSave:   Raw Red[" .. tostring(key) .. "] (key type: " .. keyType .. ") = " .. tostring(val) .. " (type: " .. valType .. ")")
                        end
                    else
                        print("DEBUG onSave: Raw players['Red'] is NOT a table, it's: " .. type(rawPlayers["Red"]))
                    end
                end
            end

            -- Now check the sanitized version
            print("DEBUG onSave: Checking SANITIZED state.players structure...")
            for color, playerData in pairs(state.players) do
                print("DEBUG onSave: Player " .. tostring(color) .. " type: " .. type(playerData))
                if type(playerData) == "table" then
                    print("DEBUG onSave: Player " .. tostring(color) .. " keys: " .. table.concat(U.getKeys(playerData), ", "))
                    for key, val in pairs(playerData) do
                        local valType = type(val)
                        print("DEBUG onSave:   " .. tostring(key) .. " = " .. tostring(val) .. " (type: " .. valType .. ")")
                    end
                end
            end

            -- Try encoding just the "Red" entry to isolate the problem
            if state.players["Red"] then
                print("DEBUG onSave: Testing encoding of just 'Red' entry...")
                local redSuccess, redResult = pcall(function()
                    return JSON.encode({Red = state.players["Red"]})
                end)
                if not redSuccess then
                    print("ERROR: onSave() - Failed to encode just 'Red' entry: " .. tostring(redResult))
                else
                    print("DEBUG onSave: Successfully encoded 'Red' entry")
                end
            end
        end

        -- Encode the save-safe state
        local encoded = JSON.encode(state)
        if encoded == nil then
            print("WARNING: onSave() - JSON.encode returned nil")
            return ""
        end

        return encoded
    end)

    if success then
        return result or ""  -- Ensure we always return a string
    else
        -- Log error but don't crash - return empty string to allow save to continue
        print("ERROR in onSave(): " .. tostring(result))
        log({onSaveError = result, traceback = debug.traceback()})
        DEBUG.logToFile("ERROR", "onSave() failed: " .. tostring(result), "debug_log")
        return ""  -- Return empty string on error (TTS will save empty state)
    end
end

--[[
    Zone Activation/Deactivation Functions
    These functions are called by the zones module to enable/disable zone event handlers.
]]
function ActivateZones()
    onObjectEnterZone = Z.onObjectEnterZone
    onObjectLeaveZone = Z.onObjectLeaveZone
end

function DeactivateZones()
    ---@diagnostic disable-next-line: assign-type-mismatch
    onObjectEnterZone = nil  -- TTS allows nil to disable zone handlers
    ---@diagnostic disable-next-line: assign-type-mismatch
    onObjectLeaveZone = nil  -- TTS allows nil to disable zone handlers
end

--[[
    UI Event Handlers
    These functions are called by UI buttons via onClick attributes in the XML.
]]

--- Select storyteller panel (mutually exclusive: one panel open at a time)
-- Used by toggle buttons (toggle_lighting, toggle_scenes, etc.) in bottom-right bar
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID (e.g., "toggle_lighting")
function HUD_selectStorytellerPanel(player, button, id)
    local panelKey = string.gsub(id, "^toggle_", "")
    UIH.selectStorytellerPanel(panelKey)
end

--- Toggle panel visibility (collapse/expand)
-- Used by toggle buttons (toggleElem_*) in the UI
-- @param player Player The player who clicked the button
-- @param button string Button value (typically "-1" for single click, "-2" for double click)
-- @param id string The UI element ID (e.g., "toggleElem_storytellerControls")
function HUD_togglePanel(player, button, id)
    -- Extract the element ID by removing "toggleElem_" prefix
    local elemID = string.gsub(id, "^toggleElem_", "")
    UIH.toggleXmlElement(elemID, button)
end

--- Change scene preset
-- Called when a scene button is clicked (e.g., "scene_elysium")
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID (e.g., "scene_elysium")
function HUD_changeScene(player, button, id)
    -- Extract scene name from ID (remove "scene_" prefix)
    local sceneName = string.gsub(id, "^scene_", "")

    -- Validate scene name
    local scene = Scenes.getScene(sceneName)
    if scene == nil then
        U.AlertGM("HUD_changeScene: Invalid scene name: " .. tostring(sceneName))
        return
    end

    -- Load scene with smooth transition (2 seconds)
    Scenes.fadeToScene(sceneName, 2.0)

    -- Update UI display
    UpdateUIDisplays()

    print("HUD: Scene changed to " .. sceneName .. " by " .. player.color)
end

--- Advance game phase
-- Called when a phase button is clicked (e.g., "phase_play")
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID (e.g., "phase_play")
function HUD_advancePhase(player, button, id)
    -- Extract phase name from ID (remove "phase_" prefix)
    local phaseName = string.gsub(id, "^phase_", "")

    -- Map UI button IDs to actual phase constants
    local phaseMap = {
        play = C.Phases.PLAY,
        combat = C.Phases.COMBAT,
        -- Add more phase mappings as needed
    }

    local targetPhase = phaseMap[phaseName]
    if targetPhase == nil then
        U.AlertGM("HUD_advancePhase: Invalid phase: " .. tostring(phaseName))
        return
    end

    -- Advance phase
    M.advancePhase(targetPhase)

    -- Update UI display
    UpdateUIDisplays()

    print("HUD: Phase advanced to " .. targetPhase .. " by " .. player.color)
end

--- Reset game state
-- Called when the "Reset Game" button is clicked
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID
function HUD_resetGame(player, button, id)
    -- Confirm reset (optional - you might want to add a confirmation dialog)
    S.resetGameState()

    -- Reset modules
    Scenes.resetScene(0)  -- Instant reset

    -- Update UI
    UpdateUIDisplays()

    print("HUD: Game reset by " .. player.color)
    broadcastToAll("Game has been reset.", {1, 0, 0})
end

--- Save game state explicitly
-- Called when the "Save State" button is clicked
-- Note: TTS also calls onSave() automatically, but this can be used for explicit saves
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID
function HUD_saveState(player, button, id)
    -- Trigger save (onSave will be called by TTS)
    -- This is mainly for UI feedback
    local state = S.getGameState()
    local stateStr = JSON.encode(state)

    print("HUD: Game state saved by " .. player.color)
    broadcastToColor("Game state saved successfully.", player.color, {0, 1, 0})
end

--- Toggle zones active/inactive
-- Called when the "Toggle Zones" debug button is clicked
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID
function HUD_toggleZones(player, button, id)
    -- Check current zone state
    local zonesActive = S.getStateVal("zones", "allZonesLocked")

    if zonesActive == true then
        Z.activateZones()
        broadcastToColor("Zones activated.", player.color, {0, 1, 0})
    else
        Z.deactivateZones()
        broadcastToColor("Zones deactivated.", player.color, {1, 0, 0})
    end

    print("HUD: Zones toggled by " .. player.color)
end

--- Update a spotlight's Color, Range, Angle, Intensity from the light debug panel
-- Called when the "Update" button is clicked for a specific light row
-- @param player Player The player who clicked the button
-- @param value string The GUID of the light object (passed from onClick)
-- @param id string The UI element ID (e.g., "lightUpdate_4148ba")
function HUD_lightUpdate(player, value, id)
    local guid = value
    if type(guid) ~= "string" or guid == "" then
        broadcastToColor("Light Debug: Invalid GUID.", player.color, {1, 0, 0})
        return
    end
    local colorVal = UI.getValue("lightColor_" .. guid) or ""
    local rangeVal = UI.getValue("lightRange_" .. guid) or ""
    local angleVal = UI.getValue("lightAngle_" .. guid) or ""
    local intensityVal = UI.getValue("lightIntensity_" .. guid) or ""
    local success = LightDebug.applyLightUpdate(guid, colorVal, rangeVal, angleVal, intensityVal)
    if success then
        broadcastToColor("Light updated.", player.color, {0, 1, 0})
    else
        broadcastToColor("Light Debug: Failed to update light.", player.color, {1, 0, 0})
    end
end

--- Refresh the light debug panel (repopulate the spotlight list)
-- Called when the "Refresh" button is clicked; rescans all objects for spotlights
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID (e.g., "lightDebugRefresh")
function HUD_lightRefresh(player, button, id)
    LightDebug.refreshLightDebugPanel()
    broadcastToColor("Light debug panel refreshed.", player.color, {0, 1, 0})
end

--- Log current game state to console (debug function)
-- Called when the "Log State" debug button is clicked
-- @param player Player The player who clicked the button
-- @param button string Button value
-- @param id string The UI element ID
function HUD_logState(player, button, id)
    local state = S.getGameState()
    print("=== GAME STATE ===")
    print(JSON.encode_pretty(state))
    print("==================")
    broadcastToColor("Game state logged to console.", player.color, {0, 1, 1})
end

--- Print entire game state to host console and to game chat (chunked).
-- Called when the Storyteller left-panel "Print State" button is clicked.
-- TTS Lua cannot write to files; full state is printed to console and broadcast to chat.
-- @param player Player The player who clicked (Host/Black)
-- @param button string Button value
-- @param id string The UI element ID
function HUD_printState(player, button, id)
    local state = S.getGameState()
    local jsonStr = JSON.encode_pretty(state)
    if not jsonStr or jsonStr == "" then
        broadcastToAll("Game state is empty.", {1, 0.5, 0})
        return
    end
    -- Always print full state to host console
    print("=== GAME STATE ===")
    print(jsonStr)
    print("==================")
    -- Broadcast to game chat in chunks (TTS chat has a message length limit)
    local chunkSize = 450
    local len = #jsonStr
    broadcastToAll("--- Game state (host console has full dump) ---", {0.7, 0.7, 1})
    for start = 1, len, chunkSize do
        local chunk = string.sub(jsonStr, start, start + chunkSize - 1)
        broadcastToAll(chunk, {0.85, 0.85, 0.9})
    end
    broadcastToAll("--- End state ---", {0.7, 0.7, 1})
end

--[[
    Sidebar reference popup handlers (Heritage-style)
    Called by storyteller sidebar Image buttons: onMouseDown/Up/Enter/Exit.
    id is the button element id (e.g. hudRefBattlegroundsHost); popup id is "Ref..." (strip "hud").
]]

--- Show reference popup for sidebar button. Right-click (value "-2") keeps it open via ON state.
function HUD_show(player, value, id)
    local imageID = string.gsub(id, "hud", "")
    -- If already toggled ON (right-click pin), turn off and return
    if UI.getValue(id) == "ON" then
        UI.setValue(id, "")
        UI.hide(imageID)
        UI.setAttribute(id .. "Overlay", "color", "clear")
        return
    end
    -- Right-click: mark as ON so HUD_hide does not close the popup
    if value == "-2" then
        UI.setValue(id, "ON")
    end
    UI.show(imageID)
end

--- Hide reference popup on mouse up unless it was right-click pinned (ON).
function HUD_hide(player, value, id)
    if UI.getValue(id) ~= "ON" then
        UI.hide(string.gsub(id, "hud", ""))
    end
end

--- Hover highlight: set overlay to white.
function HUD_highlight(player, value, id)
    local overlayID = id .. "Overlay"
    UI.setAttribute(overlayID, "color", "#FFFFFF")
end

--- Hover end: dim overlay back to clear unless popup is pinned ON.
function HUD_dim(player, value, id)
    if UI.getValue(id) ~= "ON" then
        local overlayID = id .. "Overlay"
        UI.setAttribute(overlayID, "color", "clear")
    end
end

--[[
    UI Display Update Functions
    These functions update UI elements to reflect current game state.
]]

--- Updates all UI displays with current game state
-- Called after state changes (phase, scene, etc.)
-- Exposed globally for testing/debugging
function UpdateUIDisplays()
    -- Update phase display
    local currentPhase = S.getStateVal("currentPhase")
    if currentPhase then
        UI.setValue("currentPhaseDisplay", currentPhase)
    end

    -- Update scene display
    local currentScene = Scenes.getCurrentScene()
    if currentScene then
        UI.setValue("currentSceneDisplay", currentScene)
    end

    -- Update player stat displays
    M.forPlayers(function(player, color)
        local hunger = S.getStateVal("players", color, "hunger") or 0
        local willpower = S.getStateVal("players", color, "willpower") or 5
        local health = S.getStateVal("players", color, "health") or 7

        UI.setValue("hungerVal_" .. color, tostring(hunger))
        UI.setValue("willpowerVal_" .. color, tostring(willpower))
        UI.setValue("healthVal_" .. color, tostring(health))
    end)
end

-- Load additional modules that need global exposure
G = require("lib.guids")
L = require("core.lighting")
LightDebug = require("core.light_debug")
