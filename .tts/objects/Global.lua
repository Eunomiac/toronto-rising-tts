--[[
    Global Script Entry Point (global.ttslua)
    This is the main entry point for the TTS module.
    It bootstraps the module by requiring core libraries and initializing the game state.
]]

-- Load shared utilities and constants
local U = require("lib.util")
local C = require("lib.constants")

-- Load core modules
local S = require("core.state")
local M = require("core.main")
local Z = require("core.zones")
local Scenes = require("core.scenes")
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
    NOTE: TTS requires XML to be loaded as a string via UI.setXml().

    The UI XML is split into modular components using XML bundling:
    - ui/hud.xml (main file with <Include> tags)
    - ui/defaults.xml, ui/admin.xml, ui/player_hud.xml, ui/shared.xml

    When you use "Save and Play", the TTS Tools extension:
    1. Reads .tts/objects/Global.xml (which includes all components)
    2. Bundles all <Include> tags into a single XML string
    3. Saves the bundled result to .tts/bundled/Global.xml

    TODO: After using "Save and Play", check .tts/bundled/Global.xml and embed
    the bundled XML content as a string constant below, or find a way to load it automatically.
]]
local HUD_XML_PLACEHOLDER = [[<Panel><Text text='VTM5E Module Loaded - Use "Save and Play" to bundle XML, then embed bundled content from .tts/bundled/Global.xml'/></Panel>]]

--[[
    onLoad - Called when the game loads or is reset
    @param saved_data - JSON string containing saved game state
]]
function onLoad(saved_data)
    print("--- VTM5E Module Loaded ---")

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

    -- Load and display UI
    -- TODO: Replace HUD_XML_PLACEHOLDER with actual XML content from ui/hud.xml
    UI.setXml(HUD_XML_PLACEHOLDER)

    -- Update UI displays with current state
    updateUIDisplays()

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
    updateUIDisplays()

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
    updateUIDisplays()

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
    updateUIDisplays()

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
    broadcastToColor("Game state saved successfully.", {0, 1, 0}, player.color)
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
        broadcastToColor("Zones activated.", {0, 1, 0}, player.color)
    else
        Z.deactivateZones()
        broadcastToColor("Zones deactivated.", {1, 0, 0}, player.color)
    end

    print("HUD: Zones toggled by " .. player.color)
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
    broadcastToColor("Game state logged to console.", {0, 1, 1}, player.color)
end

--[[
    UI Display Update Functions
    These functions update UI elements to reflect current game state.
]]

--- Updates all UI displays with current game state
-- Called after state changes (phase, scene, etc.)
-- Exposed globally for testing/debugging
function updateUIDisplays()
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
