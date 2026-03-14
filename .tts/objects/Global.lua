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
    -- LightDebug panel removed during Heritage migration
    -- LightDebug.refreshLightDebugPanel()

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
    Heritage admin panel migration -- see dev/HUD_FUNCTIONS.md for pre-migration reference.
]]

-- =====================================================================
-- Admin Panel: Game Phase Controls (left-side button column)
-- =====================================================================

--- Phase 0: Setup game board and components
function HUD_setupGame(player, value, id)
    broadcastToColor("HUD_setupGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- Phase 1: Initialize game state and deal starting hands
function HUD_initGame(player, value, id)
    broadcastToColor("HUD_initGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- Phase 2: Start gameplay (begin round 1)
function HUD_startGame(player, value, id)
    broadcastToColor("HUD_startGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- End an active court vote on battleground G
function HUD_endCourtVote(player, value, id)
    broadcastToColor("HUD_endCourtVote: Not yet implemented.", player.color, {1, 0, 0})
end

--- Override the first player selection
function HUD_overrideFirstPlayer(player, value, id)
    broadcastToColor("HUD_overrideFirstPlayer: Not yet implemented.", player.color, {1, 0, 0})
end

--- Prompt to manually set round and turn numbers
function HUD_askRoundAndTurn(player, value, id)
    broadcastToColor("HUD_askRoundAndTurn: Not yet implemented.", player.color, {1, 0, 0})
end

--- Toggle haven and pouch visibility
function HUD_toggleHavens(player, value, id)
    broadcastToColor("HUD_toggleHavens: Not yet implemented.", player.color, {1, 0, 0})
end

--- Phase 3: Enter scoring phase
function HUD_scoreGame(player, value, id)
    broadcastToColor("HUD_scoreGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- Refresh/update scoreboard display
function HUD_updateScore(player, value, id)
    broadcastToColor("HUD_updateScore: Not yet implemented.", player.color, {1, 0, 0})
end

--- Phase 4: Enter missions phase
function HUD_missionsGame(player, value, id)
    broadcastToColor("HUD_missionsGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- Prompt to add/update a trait for a player
function HUD_updateTraits(player, value, id)
    broadcastToColor("HUD_updateTraits: Not yet implemented.", player.color, {1, 0, 0})
end

--- Phase 5: Enter aftermath phase
function HUD_afterGame(player, value, id)
    broadcastToColor("HUD_afterGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- Prompt to add/update a sticker for a player
function HUD_updateSticker(player, value, id)
    broadcastToColor("HUD_updateSticker: Not yet implemented.", player.color, {1, 0, 0})
end

--- Toggle between sticker and trait views
function HUD_switchStickerTraits(player, value, id)
    broadcastToColor("HUD_switchStickerTraits: Not yet implemented.", player.color, {1, 0, 0})
end

--- Process card spots during aftermath
function HUD_processCardSpots(player, value, id)
    broadcastToColor("HUD_processCardSpots: Not yet implemented.", player.color, {1, 0, 0})
end

--- Phase 6: End game and finalize
function HUD_endGame(player, value, id)
    broadcastToColor("HUD_endGame: Not yet implemented.", player.color, {1, 0, 0})
end

-- =====================================================================
-- Admin Panel: UI Toggle Controls
-- =====================================================================

--- Toggle debug panel and debug controls visibility
function HUD_toggleDebug(player, value, id)
    local isHidden = UI.getAttribute("debugStatePanel", "active") == "False"
        or UI.getAttribute("debugStatePanel", "active") == "false"
    UI.setAttribute("debugStatePanel", "active", isHidden)
    UI.setAttribute("debugControls", "active", isHidden)
end

--- Toggle the reference sidebar HUD visibility
function HUD_toggleHUD(player, value, id)
    local isHidden = UI.getAttribute("hudSidebarHost", "active") == "False"
        or UI.getAttribute("hudSidebarHost", "active") == "false"
    UI.setAttribute("hudSidebarHost", "active", isHidden)
end

-- =====================================================================
-- Admin Panel: Debug Sub-Panel Controls
-- =====================================================================

--- Toggle zone activation (enable/disable zone event handlers)
function HUD_toggleZonesActive(player, value, id)
    if onObjectEnterZone == nil then
        Z.activateZones()
        broadcastToColor("Zones activated.", player.color, {0, 1, 0})
    else
        Z.deactivateZones()
        broadcastToColor("Zones deactivated.", player.color, {1, 0, 0})
    end
end

--- Toggle score overlay visibility
function HUD_toggleScores(player, value, id)
    broadcastToColor("HUD_toggleScores: Not yet implemented.", player.color, {1, 0, 0})
end

--- Show/hide updated traits display
function HUD_showTraits(player, value, id)
    broadcastToColor("HUD_showTraits: Not yet implemented.", player.color, {1, 0, 0})
end

--- Show/hide sticker unlocks display
function HUD_showStickers(player, value, id)
    broadcastToColor("HUD_showStickers: Not yet implemented.", player.color, {1, 0, 0})
end

--- Prompt to set chapter data text
function HUD_setChapterData(player, value, id)
    broadcastToColor("HUD_setChapterData: Not yet implemented.", player.color, {1, 0, 0})
end

--- Process character deck cards
function HUD_processCharacterDeck(player, value, id)
    broadcastToColor("HUD_processCharacterDeck: Not yet implemented.", player.color, {1, 0, 0})
end

--- Sort character deck by decal presence
function HUD_sortCharacterDeck(player, value, id)
    broadcastToColor("HUD_sortCharacterDeck: Not yet implemented.", player.color, {1, 0, 0})
end

--- Toggle debug traits panel visibility (only if debug panel is open)
function HUD_toggleTraitDebug(player, value, id)
    local debugOpen = UI.getAttribute("debugStatePanel", "active")
    if debugOpen == "False" or debugOpen == "false" then
        return
    end
    local isHidden = UI.getAttribute("debugTraitsPanel", "active") == "False"
        or UI.getAttribute("debugTraitsPanel", "active") == "false"
    UI.setAttribute("debugTraitsPanel", "active", isHidden)
end

--- Toggle zone visual overlay visibility
function HUD_toggleZoneVisibility(player, value, id)
    broadcastToColor("HUD_toggleZoneVisibility: Not yet implemented.", player.color, {1, 0, 0})
end

--- Force end game (set round 9, turn 3 and advance)
function HUD_debugEndGame(player, value, id)
    broadcastToColor("HUD_debugEndGame: Not yet implemented.", player.color, {1, 0, 0})
end

--- Refresh game state and UI
function HUD_refreshState(player, value, id)
    broadcastToColor("HUD_refreshState: Not yet implemented.", player.color, {1, 0, 0})
end

--- Debug: zoom camera to a card
function HUD_debugCardZoom(player, value, id)
    broadcastToColor("HUD_debugCardZoom: Not yet implemented.", player.color, {1, 0, 0})
end

--- Debug: clear card zoom
function HUD_debugClearZoom(player, value, id)
    broadcastToColor("HUD_debugClearZoom: Not yet implemented.", player.color, {1, 0, 0})
end

--- Reset all game state to defaults
function HUD_resetGameState(player, value, id)
    S.resetGameState()
    broadcastToAll("Game state has been reset.", {1, 0, 0})
end

--- Test function slot 1 (development use)
function HUD_testFunc1(player, value, id)
    broadcastToColor("HUD_testFunc1: Not yet implemented.", player.color, {1, 0, 0})
end

--- Test function slot 2 (development use)
function HUD_testFunc2(player, value, id)
    broadcastToColor("HUD_testFunc2: Not yet implemented.", player.color, {1, 0, 0})
end

--- Test function slot 3 (development use)
function HUD_testFunc3(player, value, id)
    broadcastToColor("HUD_testFunc3: Not yet implemented.", player.color, {1, 0, 0})
end

-- =====================================================================
-- Sidebar: Reference Image Toggle Handlers
-- =====================================================================

--- Show reference image on mouse-down; right-click (value "-2") toggles it on
-- Heritage pattern: strips "hud" prefix from button ID to derive the popup image ID
function HUD_show(player, value, id)
    local imageID = string.gsub(id, "hud", "")

    -- Check if currently toggled on
    if UI.getValue(id) == "ON" then
        UI.setValue(id, "")
        UI.hide(imageID)
        UI.setAttribute(id .. "Overlay", "color", "clear")
        return
    end

    -- Right-click: toggle on (stays visible after mouse-up)
    if value == "-2" then
        UI.setValue(id, "ON")
    end

    UI.show(imageID)
end

--- Hide reference image on mouse-up (unless toggled on via right-click)
function HUD_hide(player, value, id)
    if UI.getValue(id) ~= "ON" then
        UI.hide(string.gsub(id, "hud", ""))
    end
end

--- Highlight sidebar button overlay on hover (set to white)
function HUD_highlight(player, value, id)
    UI.setAttribute(id .. "Overlay", "color", "#FFFFFF")
end

--- Dim sidebar button overlay on hover-exit (reset to clear, unless toggled on)
function HUD_dim(player, value, id)
    if UI.getValue(id) ~= "ON" then
        UI.setAttribute(id .. "Overlay", "color", "clear")
    end
end

-- =====================================================================
-- Camera Controls
-- =====================================================================

--- Set camera to a predefined angle; right-click uses wide variant
-- Strips "camera" prefix from button ID to derive the camera target key
function HUD_cameraSet(player, value, id)
    local zoomTarget = string.gsub(id, "camera", "")
    if value == "-2" and C.CameraAngles and C.CameraAngles[zoomTarget .. "Wide"] then
        M.setCamera(player, zoomTarget .. "Wide")
    else
        M.setCamera(player, zoomTarget)
    end
end

--[[
    UI Display Update Functions
    These functions update UI elements to reflect current game state.
]]

--- Updates all UI displays with current game state
-- Called after state changes (phase, scene, etc.)
-- Exposed globally for testing/debugging
function updateUIDisplays()
    -- Update debug state display if visible
    local debugState = S.getGameState()
    if debugState then
        local stateStr = JSON.encode_pretty(debugState)
        if stateStr then
            UI.setValue("debugState", stateStr)
        end
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
