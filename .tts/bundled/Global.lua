-- Bundled by luabundle {"version":"1.7.0"}
local __bundle_require, __bundle_loaded, __bundle_register, __bundle_modules = (function(superRequire)
	local loadingPlaceholder = {[{}] = true}

	local register
	local modules = {}

	local require
	local loaded = {}

	register = function(name, body)
		if not modules[name] then
			modules[name] = body
		end
	end

	require = function(name)
		local loadedModule = loaded[name]

		if loadedModule then
			if loadedModule == loadingPlaceholder then
				return nil
			end
		else
			if not modules[name] then
				if not superRequire then
					local identifier = type(name) == 'string' and '\"' .. name .. '\"' or tostring(name)
					error('Tried to require ' .. identifier .. ', but no such module has been registered')
				else
					return superRequire(name)
				end
			end

			loaded[name] = loadingPlaceholder
			loadedModule = modules[name](require, loaded, register, modules)
			loaded[name] = loadedModule
		end

		return loadedModule
	end

	return require, loaded, register, modules
end)(nil)
__bundle_register("__root", function(require, _LOADED, __bundle_register, __bundle_modules)
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

end)
__bundle_register("lib.console", function(require, _LOADED, __bundle_register, __bundle_modules)
require("lib.Console.console++")

-- function prototype
function onExternalCommand(command) end

-- Overwrite onChat function if you rather be handled by onExternalMessage
-- function onChat(message, player) end

function onExternalMessage(data)
  if data.input ~= nil then onExternalCommand(data.input) end
  if data.command ~= nil then
    local hostPlayer
    local players = getSeatedPlayers()
    for key, value in pairs(players) do
      if Player[value].host then
        hostPlayer = Player[value]
      end
    end
    if data.command ~= '' then
      local command = ''
      local command_function = nil
      local parameters = {hostPlayer}
      local requires_admin = false
      local command_mode = console.in_command_mode[hostPlayer.steam_id]
      if command_mode and console.active then
          command, command_function, parameters, requires_admin = console.get_command(data.command, hostPlayer)
      elseif data.command:sub(1, 1) == console.command_char and console.active then
          if data.command:len() > 1 then
              command, command_function, parameters, requires_admin = console.get_command(data.command:sub(2), hostPlayer)
          else
              command, command_function, parameters, requires_admin = console.get_command(console.command_char, hostPlayer)
          end
      else
          for i, f in ipairs(console.validation_functions) do
              local valid, response = f(data.command)
              if response == nil then response = '' end
              if not valid then
                  printToColor(response, hostPlayer.color, console.invalid_color)
                  return false
              end
          end
          return true
      end
      if console.active then
          if command_function and (hostPlayer.admin or not requires_admin) then
              if command_mode then
                  data.command = console.command_char .. console.command_char .. data.command
              end
              local response, mute = command_function(unpack(parameters))
              if response ~= nil or mute ~= nil then
                  if not mute then
                      printToColor('\n'..data.command, hostPlayer.color, console.command_color)
                  end
                  if response then
                      printToColor(response, hostPlayer.color, console.output_color)
                  end
              end
              if console.in_command_mode[hostPlayer.steam_id] then console.display_prompt(hostPlayer) end
              return false
          else
              printToColor('\n'..data.command, hostPlayer.color, console.command_color)
              printToColor(console.error_bb .. "<command '" .. command .. "' not found>[-]", hostPlayer.color, console.output_color)
              return false
          end
      end
    end
  end
end

end)
__bundle_register("lib.Console.console++", function(require, _LOADED, __bundle_register, __bundle_modules)
require("lib.Console.console")

if not console.plusplus then
    console.plusplus = true

    -- Change these values as you wish
    console.seperator         = '/'
    console.wildcard          = '*'
    console.literal           = '`'  -- string parameters will be treated as paths where apt unless prefixed with this
    console.result            = '~'  -- refers to the most recently returned result from a call
    console.command_seperator = ';'  -- used in batch files to seperate commands
    console.indent            = '  '
    console.crop_string_at = 20
    console.builtin_path = 'sys'
    console.table_bb    = '[EEDD88]'
    console.hidden_bb   = '[DDAAAA]'
    console.function_bb = '[AADDAA]'
    console.value_bb    = '[88EE88]'
    console.boolean_bb  = '[CCCCFF]'
    console.object_bb   = '[CCBBCC]'
    console.guid_bb     = '[BBBBBB]'

    console.autoexec         = ''
    console.autoexec_options = '-s'

    -- Exposed methods:

    function console.hide_globals(label)
        -- all globals present when you call this will be hidden under <label> (unless built-in or already hidden)
        local hidden = {}
        for global, _ in pairs(_G) do
            local found = false
            for _, globals in pairs(console.hidden_globals) do
                if globals[global] then
                    found = true
                    break
                end
            end
            if not found then
                table.insert(hidden, global)
            end
        end
        if console.hidden_globals[label] == nil then
            console.hidden_globals[label] = {}
        end
        for _, global in ipairs(hidden) do
            console.hidden_globals[label][global] = true
        end
    end

    function console.load()
        -- call this function in an onLoad event to enable the autoexec
        console.cd = console.seperator
        for _, player in pairs(getSeatedPlayers()) do
            if Player[player].admin then
                console.commands['exec'].command_function(Player[player], console.seperator..'console'..console.seperator..'autoexec', console.autoexec_options)
                break
            end
        end
    end

    function console.update()
        -- call this function in an onUpdate event to enable the watch list
        if console.watch_list and not console.watch_list_paused then
            for variable, watch in pairs(console.watch_list) do
                if watch.throttle == 0 or watch.last_check + watch.throttle < os.clock() then
                    watch.last_check = os.clock()
                    local node, id, parent, found
                    if watch.is_guid then
                        node = getObjectFromGUID(variable)
                        found = tostring(node) ~= 'null'
                    else
                        node, id, parent, found = console.node_from_path(variable)
                    end
                    if node ~= nil and found then
                        if type(node) == 'userdata' then
                            if tostring(node) ~= 'null' then
                                local p = function (x) return math.floor(x * 100) * 0.01 end
                                local r = function (x) return math.floor(x + 0.5) end
                                local position = node.getPosition()
                                local rotation = node.getRotation()
                                if p(position.x) ~= p(watch.position.x) or r(rotation.x) ~= r(watch.rotation.x) or
                                   p(position.y) ~= p(watch.position.y) or r(rotation.y) ~= r(watch.rotation.y) or
                                   p(position.z) ~= p(watch.position.z) or r(rotation.z) ~= r(watch.rotation.z) then
                                   watch.position = position
                                   watch.rotation = rotation
                                   node = ' ∡ '..r(rotation.x)..' '..r(rotation.y)..' '..r(rotation.z) ..
                                        console.boolean_bb..'   ⊞  '..p(position.x)..'   '..p(position.y)..'   '..p(position.z)
                                   if watch.is_guid then
                                       variable = console.format_guid(variable)
                                   else
                                       variable = console.object_bb .. variable .. '[-]'
                                   end
                                   printToColor(variable .. console.value_bb .. node .. '[-]', watch.player, console.output_color)
                                end
                            end
                        elseif type(node) == 'function' then
                            local result = node(unpack(watch.parameters))
                            if watch.property and (type(result) == 'table' or type(result) == 'userdata') then
                                result = result[watch.property]
                                if type(result) == 'function' then
                                    result = result()
                                end
                            end
                            if result ~= watch.value then
                                watch.value = result
                                result = tostring(result)
                                if result:len() > console.crop_string_at then result = result:sub(1, console.crop_string_at) .. '...' end
                                if result:len() == 6 and watch.label:lower():find('guid') then result = console.format_guid(result) end
                                printToColor(watch.label .. console.value_bb .. result .. '[-]', watch.player, console.output_color)
                            end
                        else
                            if node ~= watch.value then
                                watch.value = node
                                if type(node) == 'boolean' then
                                    if node then
                                        node = 'true'
                                    else
                                        node = 'false'
                                    end
                                elseif type(node) == 'string' then
                                    if node:len() > console.crop_string_at then node = node:sub(1, console.crop_string_at):gsub('\n', ' ') .. '...' end
                                end
                                printToColor(variable .. ': ' .. console.value_bb .. node .. '[-]', watch.player, console.output_color)
                            end
                        end
                    end
                end
            end
        end
    end

    -- simple swear-blocking validation
    console.add_validation_function(
        function (message)
            local message = message:lower()
            for i, bad_word in pairs({'fuck', 'cunt'}) do
                if message:find(bad_word) then
                    return false, "No swearing!"
                end
            end
            return true
        end
    )

    -- End of exposed methods.  You shouldn't need to interact with anything below (under normal circumstances)


    -- override default prompt with one which displays current table
    function console.display_prompt(player)
        printToColor(console.cd .. ' ' .. console.command_char..console.command_char, player.color, console.prompt_color)
    end


    -- console++ follows

    console.cd = console.seperator
    console.hidden_globals = {}
    console.hide_globals(console.builtin_path)

    function console.is_hidden(label)
        for _, globals in pairs(console.hidden_globals) do
            if globals[label] then
                return true
            end
        end
        return false
    end

    function console.escape_bb(s)
        local s = tostring(s)
        if s == '' then
            return ''
        else
            local r = ''
            for c = 1, s:len() do
                local char = s:sub(c, c)
                if char == '[' then
                    r = r .. '[' .. string.char(0x200B)
                elseif char == ']' then
                    r = r .. string.char(0x200B) .. ']'
                else
                    r = r .. char
                end
            end
            return r
        end
    end

    function console.format_guid(guid)
        return console.guid_bb .. '⁅' .. guid .. '⁆[-]'
    end

    function console.fill_path(path)
        local path = path
        local filter = nil
        if path == nil then
            return console.cd, filter
        end
        local c = path:len()
        if path:sub(c) ~= console.seperator then
            local found = false
            while c > 0 do
                local char = path:sub(c, c)
                if char == console.wildcard then
                    found = true
                elseif char == console.seperator then
                    break
                end
                c = c - 1
            end
            if found then
                filter = '^'
                for i = c + 1, path:len() do
                    local char = path:sub(i, i)
                    if char == console.wildcard then
                        filter = filter .. '.*'
                    else
                        filter = filter .. char
                    end
                end
                filter = filter .. '$'
                path = path:sub(1, c)
            end
        end
        if path:sub(1,1) == console.seperator then
            return path, filter
        else
            return console.cd .. path, filter
        end
    end

    function console.node_from_path(path)
        local node = _G
        local id = {''}
        local parent = {nil}
        local found = true
        local depth = 0
        local stack = {}
        local hidden = nil
        local ends_with_table = {true}
        if path == 'true' then
            node = true
        elseif path == 'false' then
            node = false
        elseif path ~= console.seperator then
            for i, part in ipairs(console.split(path, console.seperator)) do
                if part == '..' then
                    if depth > 0 then
                        node = table.remove(parent)
                        table.remove(id)
                        table.remove(stack)
                        table.remove(ends_with_table)
                        depth = depth - 1
                    end
                elseif part == '.' then
                    ; -- do nothing, . = where we are
                elseif part == console.result then
                    table.insert(parent, node)
                    table.insert(id, part)
                    table.insert(stack, part)
                    node = console.returned_value
                    table.insert(ends_with_table, type(node) == 'table')
                    depth = depth + 1
                elseif node[part] ~= nil then
                    table.insert(parent, node)
                    table.insert(id, part)
                    table.insert(stack, part)
                    node = node[part]
                    table.insert(ends_with_table, type(node) == 'table')
                    depth = depth + 1
                elseif node == _G and console.hidden_globals[part] then
                    hidden = console.hidden_globals[part]
                else
                    table.insert(id, part)
                    found = false
                    break
                end
            end
        end
        path = ''
        for i, part in ipairs(stack) do
            path = path .. console.seperator .. part
        end
        if table.remove(ends_with_table) then
            path = path .. console.seperator
        end
        return node, table.remove(id), table.remove(parent), found, path, hidden
    end


    -- commands

    console.add_admin_command('cd', '[<table>]',
        'Display current table or change current table',
        function (player, path)
            if path == nil then
                return console.cd
            else
                path = tostring(path)
            end
            local location = console.fill_path(path)
            local node, id, parent, found, location = console.node_from_path(location)
            local text = nil
            if node ~= nil and found and type(node) == 'table' then
                console.cd = location
                if not console.in_command_mode[player.steam_id] then text = console.cd end
            else
                text = console.error_bb .. '<not found>[-]'
            end
            return text, false
        end
    )
    console.add_admin_command('cd..', '', 'Change current table to parent table.', 'cd', {'..'})

    console.add_admin_command('ls', '[' .. console.option .. '?afotv] [' .. console.option .. 'r[#]] [<table>]',
        'Display variables in current table or specified table',
        function (player, ...)
            local help_details = console.header_bb .. 'Options[-]\n' ..
                'Show:\n '..console.option..'f functions\n '..console.option..'o objects\n '..
                console.option..'v variables (defaults to on)\n '..console.option..'t tables (defaults to on)\n '..
                console.option..'a all\n\n' ..console.option..'r[#] recurse [# layers if specified]'
            local path = console.cd
            local display_functions = false
            local display_objects = false
            local display_variables = false
            local display_tables = false
            local display_all = false
            local recursions_left = 0
            for i, arg in ipairs({...}) do
                arg = tostring(arg)
                if arg:len() > 1 and arg:sub(1,1) == console.option then
                    local c = 2
                    while c <= arg:len() do
                        local option = arg:sub(c,c)
                        if option == 'f' then
                            display_functions = not display_functions
                        elseif option == 'o' then
                            display_objects = not display_objects
                        elseif option == 'v' then
                            display_variables = not display_variables
                        elseif option == 't' then
                            display_tables = not display_tables
                        elseif option == 'a' then
                            display_all = not display_all
                        elseif option == 'r' then
                            local n = ''
                            local j = c + 1
                            while j <= arg:len() do
                                local char = arg:sub(j, j)
                                if char:match('%d') then
                                    n = n .. char
                                else
                                    break
                                end
                                j = j + 1
                            end
                            c = j - 1
                            if n == '' then
                                recursions_left = 20
                            else
                                recursions_left = tonumber(n)
                            end
                        elseif option == '?' or option == 'h' then
                            return help_details
                        else
                            return console.error_bb .. "<option '" .. console.option .. option .. "' not recognized>[-]\n"
                        end
                        c = c + 1
                    end
                else
                    path = arg
                end
            end
            local default_variables = not (display_tables or display_objects or display_functions or display_variables)
            if display_functions or display_objects or display_variables then
                display_tables = not display_tables
            end
            if display_all then
                display_functions = true
                display_objects = true
                display_variables = true
                display_tables = true
            elseif default_variables then
                display_functions = false
                display_objects = false
                display_variables = true
                display_tables = true
            end
            local location, filter = console.fill_path(path)
            return console.ls(player, location, filter, display_functions, display_objects, display_variables, display_tables, recursions_left)
        end
    )
    console.add_admin_command('dir', nil, nil, 'ls')
    console.add_admin_command(console.result, '', "Calls 'ls "..console.option.."a "..console.result.."'", 'ls', {console.option..'a', console.result})

    function console.ls(player, path, filter, display_functions, display_objects, display_variables, display_tables, recursions_left, indent)
        local text = ''
        local indent = indent or ''
        local node, id, parent, found, location, hidden = console.node_from_path(path)
        local paths = {}
        if node ~= nil and (found or hidden) then
            if type(node) == 'table' then
                local tables = {}
                local entries = {}
                for k, v in pairs(node) do
                    if (node ~= _G or (not hidden and not console.is_hidden(k)) or (hidden and hidden[k])) and (filter == nil or k:match(filter)) then
                        if type(v) == 'table' then
                            local t = console.table_bb .. k .. '[-]'
                            table.insert(tables, t)
                            paths[t] = path .. console.seperator .. k
                        else
                            if type(v) == 'function' then
                                if display_functions then
                                    table.insert(entries, console.function_bb .. k .. '[-]()')
                                end
                            elseif type(v) == 'userdata' then
                                if display_objects then
                                    local tag = tostring(v)
                                    if tag:find('(LuaGameObjectScript)') and not tag:gsub('(LuaGameObjectScript)',''):find('Script ') then
                                        tag = v.tag .. ' ' .. console.format_guid(v.getGUID())
                                    end
                                    if type(k) == 'number' and math.floor(k) == k then k = string.format('%04d', k) end
                                    table.insert(entries, console.object_bb .. k .. '[-]: '  .. tag)
                                end
                            elseif display_variables then
                                if type(v) == 'boolean' then
                                    if v then
                                        v = 'true'
                                    else
                                        v = 'false'
                                    end
                                    table.insert(entries, k .. ': ' .. console.boolean_bb .. v .. '[-]')
                                else
                                    local is_guid = false
                                    if type(v) == 'string' then
                                        if v:len()> console.crop_string_at then v = v:sub(1, console.crop_string_at):gsub('\n', ' ') .. '...' end
                                        if type(k) == 'string' and k:lower():find('guid') and v:len() == 6 then
                                            is_guid = true
                                        end
                                    end
                                    if is_guid then
                                        table.insert(entries, k .. ': ' .. console.format_guid(v) .. '[-]')
                                    else
                                        table.insert(entries, k .. ': ' .. console.value_bb .. console.escape_bb(v) .. '[-]')
                                    end
                                end
                            end
                        end
                    end
                end
                local cmp = function (a, b)
                    if not a then
                        return true
                    elseif not b then
                        return false
                    else
                        local la = a:len()
                        local lb = b:len()
                        local c = 1
                        repeat
                            if c > la and c <= lb then
                                return true
                            elseif c > lb and c <= la then
                                return false
                            elseif c > la then
                                return false
                            else
                                local ba = a:sub(c, c):byte()
                                local bb = b:sub(c, c):byte()
                                if ba < bb then
                                    return true
                                elseif bb < ba then
                                    return false
                                end
                            end
                            c = c + 1
                        until false
                    end
                end
                table.sort(tables, cmp)
                table.sort(entries, cmp)
                local cr = ''
                if display_tables then
                    for i, t in ipairs(tables) do
                        text = text .. cr .. indent .. t .. console.seperator
                        if recursions_left ~= 0 then
                            text = text .. '\n' .. console.ls(player, paths[t], filter,
                                display_functions, display_objects, display_variables, display_tables,
                                recursions_left-1, indent..console.indent)
                        end
                        cr = '\n'
                    end
                    if node == _G and not hidden then
                        for label, _ in pairs(console.hidden_globals) do
                            if (filter == nil or label:match(filter)) then -- and label ~= console.builtin_path
                                text = text .. cr .. indent .. console.hidden_bb .. label .. console.seperator .. '[-]'
                                cr = '\n'
                            end
                        end
                    end
                end
                for _, entry in ipairs(entries) do
                    text = text .. cr .. indent .. entry
                    cr = '\n'
                end
            elseif type(node) == 'userdata' then
                local tag = tostring(node)
                if tag ~= 'null' and tag:find('(LuaGameObjectScript)') and not tag:gsub('(LuaGameObjectScript)',''):find('Script ') then
                    tag = node.tag .. ' ' .. console.format_guid(node.getGUID())
                end
                text = indent .. console.object_bb .. id .. '[-]: ' .. tag
            elseif type(node) == 'function' then
                text = indent .. console.function_bb .. id .. '[-]()'
            elseif type(node) == 'boolean' then
                if node then
                    text = indent .. id .. ': ' .. console.boolean_bb .. 'true[-]'
                else
                    text = indent .. id .. ': ' .. console.boolean_bb .. 'false[-]'
                end
            else
                if type(id) == 'string' and id:lower():find('guid') and type(node) == 'string' and node:len() == 6 then
                    text = indent .. id .. ': ' .. console.format_guid(node) .. '[-]'
                else
                    text = indent .. id .. ': ' .. console.value_bb .. console.escape_bb(node) .. '[-]'
                end
            end
        else
            text = indent .. console.error_bb .. '<not found>[-]'
        end
        return text
    end

    console.add_admin_command('call', '<function> [<parameter>...]',
        'Call function with parameters and display result.',
        function (player, ...)
            local path = nil
            local parameters = {}
            for i, arg in ipairs({...}) do
                if i == 1 then
                    path = tostring(arg)
                else
                    if type(arg) == 'string' then
                        if arg:len() > 2 and arg:sub(1,1) == console.literal then
                            arg = arg:sub(2)
                        else
                            local node, id, parent, found = console.node_from_path(console.fill_path(arg))
                            if node ~= nil and found then
                                arg = node
                            end
                        end
                    end
                    table.insert(parameters, arg)
                end
            end
            if path == nil then
                return console.error_bb .. '<you must supply a function>[-]'
            end
            local location = console.fill_path(path)
            local node, id, parent, found, location = console.node_from_path(location)
            local text = nil
            if node ~= nil and found and type(node) == 'function' then
                console.returned_value = node(unpack(parameters))
                text = tostring(console.returned_value)
                if console.deferred_assignment then
                    local da = console.deferred_assignment
                    if da.command == 'set' then
                        if da.parent[da.id] ~= nil then
                            if da.force or type(console.returned_value) == type(da.parent[da.id]) then
                                da.parent[da.id] = console.returned_value
                                text = text .. '\n' .. console.header_bb .. "<set '" .. da.id .. "'>[-]"
                            else
                                text = text .. '\n' .. console.error_bb .. "<cannot set '" .. da.id .. "': it is of type '" .. type(da.parent[da.id]) .. "'>[-]"
                            end
                        else
                            text = text .. '\n' .. console.error_bb .. "<cannot set '" .. da.id .. "': it does not exist>[-]"
                        end
                    elseif da.command == 'add' then
                        if da.parent[da.id] == nil then
                            da.parent[da.id] = console.returned_value
                            text = text .. '\n' .. console.header_bb .. "<added '" .. da.id .. "'>[-]"
                        else
                            text = text .. '\n' .. "<cannot add '" .. da.id .. "': it already exists>[-]"
                        end
                    end
                    console.deferred_assignment = nil
                end
            else
                text = console.error_bb .. '<not found>[-]'
            end
            return text, false
        end
    )

    console.add_admin_command('set', '['..console.option..'f] <variable> [<value>]',
        "Set variable to value.  If no value specified then the next value returned from 'call' is used.\n" ..
            console.option ..'f  force overwrite ignoring type',
        function (player, ...)
            local variable = nil
            local value = nil
            local force = false
            for _, arg in ipairs({...}) do
                if type(arg) == 'string' and arg:len() > 1 and arg:sub(1, 1) == console.option then
                    local c = 2
                    while c <= arg:len() do
                        local option = arg:sub(c, c)
                        if option == "f" then
                            force = not force
                        else
                            return console.error_bb .. "<option '" .. option .. "' not recognized>[-]"
                        end
                        c = c + 1
                    end
                elseif variable == nil then
                    variable = tostring(arg)
                else
                    value = arg
                end
            end
            if variable == nil then
                return console.error_bb .. '<you must supply a variable>[-]'
            end
            variable = console.fill_path(variable)
            local node, id, parent, found = console.node_from_path(variable)
            local text = ''
            if node ~= nil and found then
                if value == nil then
                    console.deferred_assignment = {command = 'set', parent = parent, id = id, force = force}
                    text = id .. ': ' .. console.header_bb .. "<awaiting 'call'>[-]"
                else
                    console.deferred_assignment = nil
                    if type(value) == 'string' and value:len() > 0  then
                        if value:sub(1, 1) == console.literal then
                            value = value:sub(2)
                        else
                            local value_node, value_id, value_parent, value_found = console.node_from_path(value)
                            if value_node ~= nil and value_found then
                                value = value_node
                            else
                                return console.error_bb .. '<not found>[-]'
                            end
                        end
                    end
                    if type(node) == 'boolean' then
                        if not value or tostring(value):lower() == 'false' then
                            value = false
                        else
                            value = true
                        end
                    end
                    if type(node) == type(value) or force then
                        parent[id] = value
                        text = id .. ': ' .. console.value_bb .. tostring(parent[id]) .. '[-]'
                    else
                        return console.error_bb .. "<cannot set '" .. id .. "': it is of type '" .. type(node) .. "'>[-]"
                    end
                end
            else
                text = console.error_bb .. '<not found>[-]'
            end
            return text
        end
    )

    console.add_admin_command('toggle', '<boolean>',
        'Toggle specified boolean variable',
        function (player, variable)
            if variable == nil then
                return console.error_bb .. '<you must supply variable>'
            else
                variable = tostring(variable)
            end
            local variable = console.fill_path(variable)
            local node, id, parent, found = console.node_from_path(variable)
            local text = ''
            if node ~= nil and found then
                if type(node) == 'boolean' then
                    if node then
                        parent[id] = false
                        text = id .. ': ' .. console.value_bb .. 'false[-]'
                    else
                        parent[id] = true
                        text = id .. ': ' .. console.value_bb .. 'true[-]'
                    end
                else
                    text = console.error_bb .. '<can only toggle a boolean>[-]'
                end
            else
                text = console.error_bb .. '<not found>[-]'
            end
            return text
        end
    )
    console.add_admin_command('tgl', nil, nil, 'toggle')

    console.add_admin_command('rm', '<variable>',
        'Remove specified variable',
        function (player, variable)
            if variable == nil then
                return console.error_bb .. '<you must supply variable>'
            else
                variable = tostring(variable)
            end
            local variable = console.fill_path(variable)
            local node, id, parent, found = console.node_from_path(variable)
            local text = ''
            if node ~= nil and found then
                parent[id] = nil
                text = id .. " removed!"
            else
                text = console.error_bb .. '<not found>[-]'
            end
            return text
        end
    )
    console.add_admin_command('del', nil, nil, 'rm')

    console.add_admin_command('add', '<variable> [<value>]',
        "Create a variable set to value.   If no value specified then the next value returned from 'call' is used.",
        function (player, variable, value)
            if variable == nil then
                return console.error_bb .. '<you must supply variable>[-]'
            else
                variable = tostring(variable)
            end
            local variable = console.fill_path(variable)
            local node, id, parent, found = console.node_from_path(variable)
            local text = ''
            if found then
                return console.error_bb .. '<already exists>[-]'
            elseif node == nil or id == '' then
                return console.error_bb .. '<not found>[-]'
            else
                if value == nil then
                    console.deferred_assignment = {command = 'add', parent = node, id = id}
                    text = id .. ': ' .. console.header_bb .. "<awaiting 'call'>[-]"
                else
                    console.deferred_assignment = nil
                    if type(value) == 'string' and value:len() > 0  then
                        if value:sub(1, 1) == console.literal then
                            value = value:sub(2)
                        else
                            local value_node, value_id, value_parent, value_found = console.node_from_path(value)
                            if value_node ~= nil and value_found then
                                value = value_node
                            else
                                return console.error_bb .. '<not found>[-]'
                            end
                        end
                    end
                    node[id] = value
                    text = id .. ': ' .. console.value_bb .. tostring(value) .. '[-]'
                end
            end
            return text
        end
    )

    console.add_admin_command('exec', '['..console.option..'?qsv] <commands>',
        'Execute a series of commands held in a string: commands are seperated by a new line or '..console.command_seperator,
        function (player, ...)
            local help_details = console.option..'q    quiet: will not output anything except final output\n' ..
                                 console.option..'s    silent: will not output anything at all\n'..
                                 console.option..'v    verbose: will output commands as they execute\n'
            local commands = nil
            local verbose = false
            local quiet = false
            local silent = false
            for _, arg in ipairs({...}) do
                if type(arg) == 'string' and arg:len() > 1 and arg:sub(1,1) == console.option then
                    local c = 2
                    while c <= arg:len() do
                        local option = arg:sub(c,c)
                        if option == '?' then
                            return help_details
                        elseif option == 'q' then
                            quiet = not quiet
                        elseif option == 's' then
                            silent = not silent
                        elseif option == 'v' then
                            verbose = not verbose
                        else
                            return console.error_bb .. "<option '" .. option .. "' not recognized>"
                        end
                        c = c + 1
                    end
                elseif commands == nil then
                    commands = tostring(arg)
                end
            end
            if silent then quiet = true end
            if commands:len() > 1 and commands:sub(1, 1) == console.literal then
                commands = commands:sub(2)
            else
                local variable = console.fill_path(commands)
                local node, id, parent, found = console.node_from_path(variable)
                if node ~= nil and found then
                    commands = node
                else
                    return console.error_bb .. '<not found>[-]'
                end
            end
            if commands:find('\n') then
                commands = console.split(commands, '\n')
            else
                commands = console.split(commands, console.command_seperator)
            end
            local end_result = nil
            for _, command_text in ipairs(commands) do
                local command = ''
                local command_function = nil
                local parameters = {player}
                local requires_admin = false
                command, command_function, parameters, requires_admin = console.get_command(command_text, player)
                if command ~= '' then
                    if command_function and (player.admin or not requires_admin) then
                        local response, mute = command_function(unpack(parameters))
                        if response ~= nil or mute ~= nil then
                            if not mute and verbose and not quiet then
                                printToColor('\n'..command_text, player.color, console.command_color)
                            end
                            if response then
                                end_result = response
                                if not quiet then
                                    printToColor(response, player.color, console.output_color)
                                end
                            end
                        end
                    elseif not quiet then
                        if verbose then printToColor('\n'..command_text, player.color, console.command_color) end
                        printToColor(console.error_bb .. "<command '" .. command .. "' not found>[-]", player.color, console.output_color)
                    end
                end
            end
            if end_result and not silent then
                printToColor(end_result, player.color, console.output_color)
            end
        end
    )

    console.add_admin_command('watch', '['..console.option..'?cgp] ['..console.option..'t#] ['..console.option..console.seperator..'<property>] [<variable>]',
        'Watch a variable or object and display it whenever it changes.\n' .. console.hidden_bb ..
        'Requires you to add a '..console.function_bb..'console.update()[-] call to an ' ..
        console.function_bb .. 'onUpdate[-] event in your code.[-]\n',
        function (player, ...)
            local help_details = 'Call without a parameter to display watched items, or with a variable to add it to watch list.\n' ..
                                console.option..'c will clear variable if specified, or all.\n' ..
                                console.option..'g will let you specify an object by its GUID.\n' ..
                                console.option..'t# will throttle output to # seconds.\n' ..
                                console.option..console.seperator..'<property> will watch the property of the variable.\n' ..
                                console.option..'p will pause or unpause watching.\n'
            local path = nil
            local clearing = false
            local throttle = nil
            local pause_changed = false
            local by_guid = false
            local parameters = {}
            local labels = {}
            local property = nil
            for _, arg in ipairs({...}) do
                if type(arg) == 'string' and arg:len() > 1 and arg:sub(1,1) == console.option then
                    local c = 2
                    while c <= arg:len() do
                        local option = arg:sub(c,c)
                        if option == '?' then
                            return help_details
                        elseif option == 'c' then
                            clearing = not clearing
                        elseif option == 'p' then
                            pause_changed = not pause_changed
                        elseif option == 'g' then
                            by_guid = not by_guid
                        elseif option == console.seperator then
                            if arg:len() > c then
                                property = arg:sub(c + 1)
                                c = arg:len() + 1
                            end
                        elseif option == 't' then
                            local n = ''
                            local j = c + 1
                            while j <= arg:len() do
                                local char = arg:sub(j, j)
                                if char:match('[0-9.]') then
                                    n = n .. char
                                else
                                    break
                                end
                                j = j + 1
                            end
                            c = j - 1
                            if n == '' then
                                return console.error_bb .. '<you must provide a throttle duration (in seconds)>[-]'
                            else
                                throttle = tonumber(n)
                            end
                        else
                            return console.error_bb .. "<option '" .. option .. "' not recognized>"
                        end
                        c = c + 1
                    end
                else
                    if path == nil then
                        path = tostring(arg)
                    else
                        local label = tostring(arg)
                        if type(arg) == 'string' then
                            if arg:len() > 2 and arg:sub(1,1) == console.literal then
                                arg = arg:sub(2)
                                label = arg
                            else
                                local node, id, parent, found = console.node_from_path(console.fill_path(arg))
                                if node ~= nil and found then
                                    arg = node
                                end
                            end
                        end
                        table.insert(labels, label)
                        table.insert(parameters, arg)
                    end
                end
            end
            local text = ''
            if pause_changed then
                if console.watch_list_paused then
                    console.watch_list_paused = nil
                    text = text .. console.header_bb .. '<unpaused>[-]'
                else
                    console.watch_list_paused = true
                    text = text .. console.header_bb .. '<paused>[-]'
                end
            end
            if path == nil then
                if throttle ~= nil then
                    text = text .. '\n' .. console.error_bb .. '<you must provide a variable or object>[-]'
                elseif by_guid then
                    text = text .. '\n' .. console.error_bb .. '<you must provide a GUID>[-]'
                elseif clearing then
                    console.watch_list = nil
                    console.watch_list_paused = nil
                    text = text .. '\nWatch list cleared!'
                elseif not pause_changed then
                    if console.watch_list then
                        local watched = {}
                        for label, watch in pairs(console.watch_list) do
                            if watch.player == player.color then
                                table.insert(watched, label)
                            end
                        end
                        table.sort(watched)
                        text = text .. '\n'..console.header_bb..'Watching:[-]'
                        for _, label in ipairs(watched) do
                            local watch = console.watch_list[label]
                            local is_guid = (label:len() == 6 and label:sub(1,1) ~= console.seperator)
                            local node, id, parent, found
                            local prefix
                            text = text .. '\n'
                            if is_guid then
                                prefix =  console.format_guid(label)
                                node = getObjectFromGUID(label)
                                found = tostring(node) ~= 'null'
                            else
                                prefix = label
                                node, id, parent, found = console.node_from_path(label)
                            end
                            if node ~= nil and found then
                                if type(node) == 'userdata' then
                                    prefix = console.object_bb .. prefix .. '[-]'
                                    local position = node.getPosition()
                                    local rotation = node.getRotation()
                                    local p = function (x) return math.floor(x * 100) * 0.01 end
                                    local r = function (x) return math.floor(x + 0.5) end
                                    text = text .. prefix .. console.value_bb .. ' ∡ '..r(rotation.x)..' '..r(rotation.y)..' '..r(rotation.z) .. '[-]'..
                                            console.boolean_bb..'   ⊞  '..p(position.x)..'   '..p(position.y)..'   '..p(position.z)
                                elseif type(node) == 'function' then
                                    local result = node(unpack(console.watch_list[label].parameters))
                                    if watch.property and (type(result) == 'table' or type(result) == 'userdata') then
                                        result = result[watch.property]
                                        if type(result) == 'function' then
                                            result = result()
                                        end
                                    end
                                    result = tostring(result)
                                    if watch.propery and watch.property:lower():find('guid') then
                                        result = console.format_guid(result)
                                    end
                                    if result:len() > console.crop_string_at then result = result:sub(1, console.crop_string_at) .. '...' end
                                    text = text .. watch.label .. console.value_bb .. result .. '[-]'
                                else
                                    if type(node) == 'boolean' then
                                        if node then
                                            node = 'true'
                                        else
                                            node = 'false'
                                        end
                                    elseif type(node) == 'string' then
                                        if node:len() > console.crop_string_at then node = node:sub(1, console.crop_string_at):gsub('\n', ' ') .. '...' end
                                    end
                                    text = text .. prefix .. ': ' .. console.value_bb .. node .. '[-]'
                                end
                            end
                        end
                    else
                        text = text .. "\nWatch list is empty."
                    end
                end
            else
                if not by_guid then
                    path = console.fill_path(path)
                end
                if clearing then
                    local node, id, parent, found
                    if not by_guid then
                        node, id, parent, found, path = console.node_from_path(path)
                    end
                    if console.watch_list[path] then
                        console.watch_list[path] = nil
                        if next(console.watch_list) == nil then
                            console.watch_list = nil
                        end
                        text = text .. '\n' .. console.header_bb.. 'No longer watching:[-] ' .. path
                    else
                        text = text .. '\n' .. console.error_bb .. '<not found>[-]'
                    end
                else
                    local node, id, parent, found
                    if by_guid then
                        node = getObjectFromGUID(path)
                        found = tostring(node) ~= 'null'
                    else
                        node, id, parent, found, path = console.node_from_path(path)
                    end
                    if node ~= nil and found then
                        if console.watch_list == nil then console.watch_list = {} end
                        if throttle == nil then throttle = 0 end
                        console.watch_list[path] = {player=player.color, throttle=throttle, last_check=0, property=property}
                        if type(node) == 'userdata' then
                            console.watch_list[path].position = node.getPosition()
                            console.watch_list[path].rotation = node.getRotation()
                            console.watch_list[path].is_guid  = by_guid
                        elseif type(node) == 'function' then
                            console.watch_list[path].parameters = parameters
                            console.watch_list[path].value = node
                            console.watch_list[path].label = console.function_bb .. path .. '[-]'
                            if property then
                                console.watch_list[path].label = console.watch_list[path].label .. console.seperator .. property
                            end
                            for _, label in ipairs(labels) do
                                console.watch_list[path].label = console.watch_list[path].label .. ' ' .. console.hidden_bb .. label .. '[-]'
                            end
                            console.watch_list[path].label = console.watch_list[path].label .. ': '
                        else
                            console.watch_list[path].value = node
                        end
                        if by_guid then
                            path = console.format_guid(path)
                        end
                        text = text .. '\n' .. console.header_bb .. 'Watching:[-] ' .. path
                    else
                        text = text .. '\n' .. console.error_bb .. '<not found>[-]'
                    end
                end
            end
            if text:len() > 1 and text:sub(1, 1) == '\n' then
                text = text:sub(2)
            end
            return text
        end
    )

    console.add_player_command('shout', '<text>',
        'Broadcast <text> to all players. Colour a section with {RRGGBB}section{-}.',
        function (player, ...)
            local text = player.steam_name .. ': '
            local space = ''
            for _, word in ipairs({...}) do
                text = text .. space .. tostring(word)
                space = ' '
            end
            text = text:gsub('{','[')
            text = text:gsub('}',']')
            broadcastToAll(text, stringColorToRGB(player.color))
            return nil, false
        end
    )

    -- change the command help color so client added commands appear different to console++
    console.set_command_listing_bb('[A0F0C0]')
end

end)
__bundle_register("lib.Console.console", function(require, _LOADED, __bundle_register, __bundle_modules)
if not console then
    console = {}

    -- Change these values as you wish
    console.command_char = '>'
    console.option       = '-'
    console.prompt_color  = {r = 0.8,  g = 1.0,  b = 0.8 }
    console.command_color = {r = 0.8,  g = 0.6,  b = 0.8 }
    console.output_color  = {r = 0.88, g = 0.88, b = 0.88}
    console.invalid_color = {r = 1.0,  g = 0.2,  b = 0.2 }
    console.header_bb       = '[EECCAA]'
    console.error_bb        = '[FF9999]'
    console.inbuilt_help_bb = '[E0E0E0]'
    console.client_help_bb  = '[C0C0FF]'

    -- Exposed methods:

    function console.add_validation_function(validation_function)
        -- Adds a validation function all chat will be checked against:
        -- function(string message) which returns (boolean valid, string response)
        -- If all validation functions return <valid> as true the message will be displayed.
        -- If one returns <valid> as false then its <response> will be displayed to that player instead.
        table.insert(console.validation_functions, validation_function)
    end

    function console.add_player_command(command, parameter_text, help_text, command_function, default_parameters)
        -- Adds a command anyone can use, see below for details
        console.add_command(command, false, parameter_text, help_text, command_function, default_parameters)
    end

    function console.add_admin_command(command, parameter_text, help_text, command_function, default_parameters)
        -- Adds a command only admins can use, see below for details
        console.add_command(command, true, parameter_text, help_text, command_function, default_parameters)
    end

    function console.add_command(command, requires_admin, parameter_text, help_text, command_function, default_parameters)
        -- Adds a command to the console.
        -- command_function must take <player> as its first argument, and then any
        --   subsequent arguments you wish which will be provided by the player.
        -- You may alias an already-present command by calling this with command_function set to
        --   the command string instead of a function.  default_parameters can be set for the alias.
        -- See basic built-in commands at the bottom of this file for examples.
        local commands = console.commands
        local command_function = command_function
        local help_text = help_text
        local parameter_text = parameter_text
        if type(command_function) == 'string' then --alias
            if help_text == nil then
                help_text = commands[command_function].help_text
            end
            if parameter_text == nil then
                parameter_text = commands[command_function].parameter_text
            end
            command_function = commands[command_function].command_function
        end
        console.commands[command] = {
            command_function   = command_function,
            requires_admin     = requires_admin,
            parameter_text     = parameter_text,
            help_text          = help_text,
            help_bb            = console.command_help_bb,
            default_parameters = default_parameters,
        }
    end

    function console.set_command_listing_bb(bb)
        -- Tags commands added after with a bb color for when they are displayed (i.e. with 'help')
        console.command_help_bb = bb
    end

    function console.disable()
        -- Disables console for command purposes, but leaves validation functions running
        console.active = false
    end

    function console.enable()
        -- Enables console commands (console commands are on by default)
        console.active = true
    end

    -- End of exposed methods.  You shouldn't need to interact with anything below (under normal circumstances)


    console.active = true
    console.in_command_mode = {}
    console.commands = {}
    console.validation_functions = {}
    console.set_command_listing_bb(console.inbuilt_help_bb)

    function onChat(message, player)
        if message ~= '' then
            local command = ''
            local command_function = nil
            local parameters = {player}
            local requires_admin = false
            local command_mode = console.in_command_mode[player.steam_id]
            if command_mode and console.active then
                command, command_function, parameters, requires_admin = console.get_command(message, player)
            elseif message:sub(1, 1) == console.command_char and console.active then
                if message:len() > 1 then
                    command, command_function, parameters, requires_admin = console.get_command(message:sub(2), player)
                else
                    command, command_function, parameters, requires_admin = console.get_command(console.command_char, player)
                end
            else
                for i, f in ipairs(console.validation_functions) do
                    local valid, response = f(message)
                    if response == nil then response = '' end
                    if not valid then
                        printToColor(response, player.color, console.invalid_color)
                        return false
                    end
                end
                return true
            end
            if console.active then
                if command_function and (player.admin or not requires_admin) then
                    if command_mode then
                        message = console.command_char .. console.command_char .. message
                    end
                    local response, mute = command_function(unpack(parameters))
                    if response ~= nil or mute ~= nil then
                        if not mute then
                            printToColor('\n'..message, player.color, console.command_color)
                        end
                        if response then
                            printToColor(response, player.color, console.output_color)
                        end
                    end
                    if console.in_command_mode[player.steam_id] then console.display_prompt(player) end
                    return false
                else
                    printToColor('\n'..message, player.color, console.command_color)
                    printToColor(console.error_bb .. "<command '" .. command .. "' not found>[-]", player.color, console.output_color)
                    return false
                end
            end
        end
    end

    function console.get_command(message, player)
        local command_name = ''
        local command_function = nil
        local requires_admin = false
        local parameters = {player}
        for i, part in ipairs(console.split(message)) do
            if i == 1 then
                command_name = part
                local command = console.commands[command_name]
                if command then
                    command_function = command.command_function
                    requires_admin = command.requires_admin
                    if command.default_parameters then
                        for _, parameter in ipairs(command.default_parameters) do
                            table.insert(parameters, parameter)
                        end
                    end
                end
            else
                table.insert(parameters, part)
            end
        end
        return command_name, command_function, parameters, requires_admin
    end

    function console.display_prompt(player)
        printToColor(console.command_char..console.command_char, player.color, console.prompt_color)
    end

    function console.split(text, split_on)
        local split_on = split_on or ' '
        if type(split_on) == 'string' then
            local s = {}
            for c = 1, split_on:len() do
                s[split_on:sub(c,c)] = true
            end
            split_on = s
        end
        local parts = {}
        if text ~= '' then
            local make_table = function(s)
                local entries = console.split(s, ' ,')
                local t = {}
                for _, entry in ipairs(entries) do
                    if type(entry) == 'string' and entry:find('=') then
                        e = console.split(entry, '=')
                        t[e[1]] = e[2]
                    else
                        table.insert(t, entry)
                    end
                end
                return t
            end
            local current_split_on = split_on
            local adding = false
            local part = ""
            local totype = tonumber
            for c = 1, text:len() do
                local char = text:sub(c, c)
                if adding then
                    if current_split_on[char] then -- ended current part
                        if totype(part) ~= nil then
                            table.insert(parts, totype(part))
                        else
                            table.insert(parts, part)
                        end
                        adding = false
                        current_split_on = split_on
                        totype = tonumber
                    else
                        part = part .. char
                    end
                else
                    if not current_split_on[char] then -- found start of part
                        if char == "'" then
                            current_split_on = {["'"] = true}
                            totype = tostring
                            part = ''
                        elseif char == '"' then
                            current_split_on = {['"'] = true}
                            totype = tostring
                            part = ''
                        elseif char == '{' then
                            current_split_on = {['}'] = true}
                            totype = make_table
                            part = ''
                        else
                            part = char
                        end
                        adding = true
                    end
                end
            end
            if adding then
                if totype(part) ~= nil then
                    table.insert(parts, totype(part))
                else
                    table.insert(parts, part)
                end
            end
        end
        return parts
    end


    -- Add basic built-in console commands

    console.add_player_command('help', '[' .. console.option .. 'all|<command>]',
        'Display available commands or help on all commands or help on a specific command.',
        function (player, command)
            if command ~= nil then
                command = tostring(command)
            end
            local make_help = function (command)
                return console.header_bb .. command .. ' ' .. console.commands[command].parameter_text ..
                        '[-]\n' .. console.commands[command].help_text
            end
            local info_mode = false
            if command == console.option..'all' then
                info_mode = true
            end
            if command and console.commands[command] then
                return make_help(command)
            elseif command and not info_mode then
                return console.error_bb .. "<command '" .. command .. "' not found>[-]"
            else
                local msg = console.header_bb .. 'Available commands:[-]'
                local command_list = {}
                for c, _ in pairs(console.commands) do
                    if player.admin or not console.commands[c].requires_admin then
                        if info_mode then
                            table.insert(command_list, make_help(c))
                        else
                            table.insert(command_list, c)
                        end
                    end
                end
                table.sort(command_list)
                local sep
                if info_mode then
                    sep = '\n\n'
                else
                    sep = '\n'
                end
                for _, c in ipairs(command_list) do
                    local cmd = console.commands[c]
                    if cmd then
                        msg = msg .. sep .. cmd.help_bb .. c .. '[-]'
                    else
                        msg = msg .. sep .. c
                    end
                    if not info_mode then sep = ', ' end
                end
                return msg
            end
        end
    )
    console.add_player_command('?', nil, nil, 'help')
    console.add_player_command('info', '', 'Display help on all available commands.', 'help', {console.option..'all'})

    console.add_player_command('exit', '',
        "Leave <command mode> ('" .. console.command_char .. "' does the same).",
        function (player)
            console.in_command_mode[player.steam_id] = nil
            return console.header_bb .. '<command mode: off>[-]'
        end
    )

    console.add_player_command('cmd', '',
        "Enter <command mode> ('" .. console.command_char .. "' does the same).",
        function (player)
            console.in_command_mode[player.steam_id] = true
            return console.header_bb .. '<command mode: on>[-]'
        end
    )

    console.add_player_command(console.command_char, '',
        'Toggle <command mode>',
        function (player)
            console.in_command_mode[player.steam_id] = not console.in_command_mode[player.steam_id]
            if console.in_command_mode[player.steam_id] then
                return console.header_bb .. '<command mode: on>[-]', true
            else
                return console.header_bb .. '<command mode: off>[-]', true
            end
        end
    )

    console.add_player_command('=', '<expression>',
        'Evaluate an expression',
        function (player, ...)
            local expression = ''
            for _, arg in ipairs({...}) do
                expression = expression .. ' ' .. tostring(arg)
            end
            if not player.admin then
                expression = expression:gasub('[a-zA-Z~]', '')
            end
            console.returned_value = dynamic.eval(expression)
            return console.returned_value
        end
    )

    console.add_player_command('echo', '<text>',
        'Display text on screen',
        function (player, ...)
            local text = ''
            for _, arg in ipairs({...}) do
                text = text .. ' ' .. tostring(arg)
            end
            printToColor(text, player.color, console.output_color)
            return false
        end
    )

    console.add_player_command('cls', '',
        'Clear console text',
        function (player)
            return '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' ..
                   '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n'
        end
    )

    console.add_player_command('alias', '<alias> <command> [<parameter>...]',
        'Create a command alias.',
        function (player, ...)
            local alias
            local command
            local parameters = {}
            for i, arg in ipairs({...}) do
                if i == 1 then
                    alias = tostring(arg)
                elseif i == 2 then
                    command = tostring(arg)
                else
                    table.insert(parameters, arg)
                end
            end
            if not alias then
                return console.error_bb .. '<must provide an alias>[-]'
            --elseif console.commands[alias] ~= nil then
            --    return console.error_bb .. "<command '" .. alias .. "' already exists!>[-]"
            elseif command == nil then
                return console.error_bb .. "<must provide a command>[-]"
            elseif console.commands[command] == nil then
                return console.error_bb .. "<command '" .. command .. "' does not exist>[-]"
            else
                local text = console.header_bb .. alias .. '[-] = ' .. command
                local help_text = console.commands[command].help_text
                if not help_text:find('\nAliased to: ') then
                    help_text = help_text .. '\nAliased to: ' .. command
                end
                local combined_parameters = {}
                if console.commands[command].default_parameters then
                    for _, parameter in ipairs(console.commands[command].default_parameters) do
                        table.insert(combined_parameters, parameter)
                    end
                end
                for _, parameter in ipairs(parameters) do
                    table.insert(combined_parameters, parameter)
                    text = text .. ' ' .. parameter
                    help_text = help_text .. ' ' .. parameter
                end
                console.add_command(alias, console.commands[command].requires_admin, console.commands[command].parameter_text, help_text, command, combined_parameters)
                return text
            end
        end
    )

    -- change the command help color so client added commands appear different to in-built
    console.set_command_listing_bb(console.client_help_bb)
end

end)
__bundle_register("core.debug", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Debug/Testing Module (core/debug.ttslua)

    Provides testing and debugging utilities for the VTM5E module.
    Functions are exposed globally (assigned without 'local') so they can be called
    from the TTS console using the `lua` command (e.g., `lua testState()`).

    Usage in TTS Console:
        lua testState()              -- Test state management
        lua testScenes()             -- Test scene presets
        lua testUI()                 -- Test UI updates
        lua debugHelp()              -- Show all available debug commands

    NOTE: This module is for development/testing only.
    Consider disabling or restricting access in production builds.
]]

local DEBUG = {}
local U = require("lib.util")
local S = require("core.state")
local M = require("core.main")
local Z = require("core.zones")
local Scenes = require("core.scenes")
local C = require("lib.constants")
local L = require("core.lighting")

--[[
    File Logging Configuration
    Uses TTS Tools extension's sendExternalMessage to write debug logs to files
]]
local LOG_DIR = "debug_logs"
local LOG_EXTENSION = "txt"

-- Cache for log file contents (to support append mode)
-- Key: filename (without extension), Value: accumulated content string
local logCache = {}

--[[
    Helper Functions
]]

--- Gets current timestamp as a formatted string
-- @return string Timestamp in format "YYYY-MM-DD HH:MM:SS"
local function getTimestamp()
    local time = os.time()
    -- Lua 5.1 doesn't have os.date with format strings, so we use a workaround
    -- For TTS, we'll use a simpler format
    return tostring(time)
end

--- Writes content to a file in the workspace using TTS Tools extension
-- Supports append mode by maintaining an in-memory cache of file contents
-- @param filename string Name of the file (without extension)
-- @param content string Content to write
-- @param format string Optional format: "auto" (for JSON) or "none" (default: "none")
-- @param append boolean If true, appends to existing cached content (default: true for logs, false for dumps)
local function writeToFile(filename, content, format, append)
    format = format or "none"
    append = append ~= false  -- Default to true (append mode) unless explicitly set to false

    -- Use sendExternalMessage to write to file
    -- Don't set 'object' - that would write to .tts/objects/ directory
    -- Without 'object', files are written to workspace directory
    local fullName = LOG_DIR .. "/" .. filename .. "." .. LOG_EXTENSION

    -- For append mode, maintain cache and accumulate content
    if append then
        if not logCache[filename] then
            logCache[filename] = ""
        end
        logCache[filename] = logCache[filename] .. content
        content = logCache[filename]  -- Write accumulated content
    else
        -- Overwrite mode: clear cache and write new content
        logCache[filename] = content
    end

    -- Check if sendExternalMessage exists (TTS Tools extension)
    ---@diagnostic disable-next-line: undefined-global
    if sendExternalMessage then
        ---@diagnostic disable-next-line: undefined-global
        sendExternalMessage({
            type = "write",
            content = content,
            name = fullName,
            format = format
        })
        print("DEBUG: Log written to " .. fullName)
    else
        -- Fallback: just print if extension not available
        print("DEBUG (file logging not available): " .. filename)
        print(content)
    end
end

--- Prints a formatted test header
-- @param testName string Name of the test
local function printTestHeader(testName)
    print("\n" .. string.rep("=", 60))
    print("TEST: " .. testName)
    print(string.rep("=", 60))
end

--- Prints a formatted test result and logs to file
-- @param testName string Name of the test
-- @param passed boolean Whether the test passed
-- @param details string Optional details about the test
local function printTestResult(testName, passed, details)
    local status = passed and "✓ PASS" or "✗ FAIL"
    local color = passed and {0, 1, 0} or {1, 0, 0}
    print(status .. ": " .. testName)
    if details then
        print("  Details: " .. details)
    end

    -- Also log to file
    DEBUG.logTestToFile(testName, passed, details, "test_results")
end

--[[
    State Management Tests
]]

--- Helper: Get the first seated player color
-- Returns the color of the first player that is actually seated/connected
-- Returns nil if no players are seated
-- @return string|nil Player color or nil if no players seated
local function getFirstSeatedPlayerColor()
    for _, color in ipairs(C.PlayerColors) do
        local player = Player[color]
        if player and player.seated then
            return color
        end
    end
    return nil
end

--- Test basic state get/set operations
-- Tests: S.getStateVal, S.setStateVal, nested access
function DEBUG.testState()
    printTestHeader("State Management - Basic Operations")

    -- Reset state to clean defaults before testing
    -- This ensures old saved data doesn't contaminate the tests
    print("Resetting game state to clean defaults...")
    S.resetGameState()

    local passed = 0
    local failed = 0

    -- Test 1: Set and get simple value
    do
        S.setStateVal("test_value", "testKey")
        local result = S.getStateVal("testKey")
        if result == "test_value" then
            printTestResult("Set/Get simple value", true)
            passed = passed + 1
        else
            printTestResult("Set/Get simple value", false, "Expected 'test_value', got '" .. tostring(result) .. "'")
            failed = failed + 1
        end
    end

    -- Test 2: Nested state access
    do
        local testColor = getFirstSeatedPlayerColor()
        if testColor then
            local playerID = S.getPlayerID(testColor)
            if playerID then
                S.setPlayerVal(testColor, "hunger", 5)
                local result = S.getPlayerVal(testColor, "hunger")
                if result == 5 then
                    printTestResult("Nested state access", true, "Using player: " .. testColor .. " (ID: " .. playerID .. ")")
                    passed = passed + 1
                else
                    printTestResult("Nested state access", false, "Expected 5, got " .. tostring(result))
                    failed = failed + 1
                end
            else
                printTestResult("Nested state access", false, "Could not find player ID for color: " .. testColor)
                failed = failed + 1
            end
        else
            printTestResult("Nested state access", false, "No seated players found for test")
            failed = failed + 1
        end
    end

    -- Test 3: Get non-existent value (should return nil)
    do
        local result = S.getStateVal("nonExistent", "key")
        if result == nil then
            printTestResult("Get non-existent value returns nil", true)
            passed = passed + 1
        else
            printTestResult("Get non-existent value returns nil", false, "Expected nil, got " .. tostring(result))
            failed = failed + 1
        end
    end

    -- Test 4: Current phase access
    do
        local phase = S.getStateVal("currentPhase")
        printTestResult("Get current phase", phase ~= nil, "Current phase: " .. tostring(phase))
        if phase ~= nil then passed = passed + 1 else failed = failed + 1 end
    end

    -- Test 5: mergeDefaults function
    do
        local target = {a = 1, b = {x = 10}}
        local defaults = {b = {y = 20}, c = 3}
        S.mergeDefaults(target, defaults)

        local pass = (target.a == 1 and target.b.x == 10 and target.b.y == 20 and target.c == 3)
        printTestResult("mergeDefaults", pass, pass and "Merged correctly" or "Merge failed")
        if pass then passed = passed + 1 else failed = failed + 1 end
    end

    -- Test 6: resetGameState function
    do
        -- Set some values
        S.setStateVal("test", "testKey")
        S.setStateVal(999, "testNumber")

        -- Reset
        S.resetGameState()

        -- Check that test values are gone and defaults are present
        local testValue = S.getStateVal("testKey")
        local defaultPhase = S.getStateVal("currentPhase")

        local pass = (testValue == nil and defaultPhase == C.Phases.SESSION_START)
        printTestResult("resetGameState", pass, pass and "Reset to defaults correctly" or "Reset failed")
        if pass then passed = passed + 1 else failed = failed + 1 end
    end

    -- Test 7: Player data merging (mergePlayerData)
    do
        -- This test verifies that static player data from C.PlayerData merges correctly
        local testColor = getFirstSeatedPlayerColor()
        if testColor then
            local playerID = S.getPlayerID(testColor)
            if playerID then
                local playerData = S.getPlayerData(testColor)
                -- Player data should have both static (from C.PlayerData) and dynamic (from state) fields
                local hasStatic = playerData and (playerData.color ~= nil or playerData.clan ~= nil)
                local hasDynamic = playerData and playerData.hunger ~= nil

                local pass = (hasStatic and hasDynamic)
                printTestResult("Player data merging", pass, pass and "Static and dynamic data merged" or "Merge failed")
                if pass then passed = passed + 1 else failed = failed + 1 end
            else
                printTestResult("Player data merging", false, "Could not find player ID")
                failed = failed + 1
            end
        else
            printTestResult("Player data merging", false, "No seated players for test")
            failed = failed + 1
        end
    end

    -- Summary
    print("\n" .. string.rep("-", 60))
    print("State Tests: " .. passed .. " passed, " .. failed .. " failed")
    print(string.rep("-", 60))

    -- Log summary to file
    local summary = string.format("State Tests: %d passed, %d failed", passed, failed)
    DEBUG.logToFile("INFO", summary, "debug_log")
    DEBUG.logTestToFile("State Management - Basic Operations", failed == 0, summary, "test_results")
end

--- Test state persistence (save/load)
-- Tests: onSave, JSON encoding/decoding, state restoration
function DEBUG.testStatePersistence()
    printTestHeader("State Management - Persistence")
    DEBUG.logToFile("INFO", "Starting testStatePersistence()", "debug_log")

    -- Reset state to clean defaults before testing
    print("Resetting game state to clean defaults...")
    S.resetGameState()

    -- Set some test values
    local testColor = getFirstSeatedPlayerColor()
    if not testColor then
        print("ERROR: No seated players found for persistence test")
        return
    end

    local playerID = S.getPlayerID(testColor)
    if not playerID then
        print("ERROR: Could not find player ID for color: " .. testColor)
        return
    end

    S.setPlayerVal(testColor, "hunger", 3)
    S.setStateVal("PLAY", "currentPhase")
    S.setStateVal("tension", "currentScene")

    -- Get current state
    local stateBefore = S.getGameState()
    print("State before save (using player: " .. testColor .. ", ID: " .. playerID .. "):")
    local playerData = stateBefore.playerData and stateBefore.playerData[playerID]
    print("  " .. testColor .. " hunger: " .. tostring(playerData and playerData.hunger or "nil"))
    print("  Phase: " .. tostring(stateBefore.currentPhase))
    print("  Scene: " .. tostring(stateBefore.currentScene))

    -- Simulate save (encode to JSON)
    local savedData = JSON.encode(stateBefore)
    print("\nSaved data length: " .. #savedData .. " characters")

    -- Simulate load (decode and restore)
    local loadedState = JSON.decode(savedData)
    if loadedState then
        print("\nState after load:")
        local loadedPlayerData = loadedState.playerData and loadedState.playerData[playerID]
        print("  " .. testColor .. " hunger: " .. tostring(loadedPlayerData and loadedPlayerData.hunger or "nil"))
        print("  Phase: " .. tostring(loadedState.currentPhase))
        print("  Scene: " .. tostring(loadedState.currentScene))

        if loadedPlayerData and loadedPlayerData.hunger == 3 and loadedState.currentPhase == "PLAY" then
            printTestResult("State persistence", true, "Values preserved correctly")
        else
            printTestResult("State persistence", false, "Values did not match")
        end
    else
        printTestResult("State persistence", false, "Failed to decode JSON")
    end

    DEBUG.logToFile("INFO", "Completed testStatePersistence()", "debug_log")
end

--[[
    Scene Management Tests
]]

--- Test scene loading and transitions
-- Tests: Scenes.loadScene, Scenes.fadeToScene, Scenes.getCurrentScene
function DEBUG.testScenes()
    printTestHeader("Scene Management")
    DEBUG.logToFile("INFO", "Starting testScenes()", "debug_log")

    -- Test 1: List available scenes
    do
        local scenes = Scenes.listScenes()
        print("Available scenes: " .. table.concat(scenes, ", "))
        printTestResult("List scenes", #scenes > 0, #scenes .. " scenes found")
    end

    -- Test 2: Load a scene
    do
        local success = Scenes.loadScene("elysium")
        printTestResult("Load scene (elysium)", success, success and "Scene loaded" or "Failed to load")
    end

    -- Test 3: Get current scene
    do
        local currentScene = Scenes.getCurrentScene()
        printTestResult("Get current scene", currentScene == "elysium", "Current: " .. tostring(currentScene))
    end

    -- Test 4: Test invalid scene
    do
        local success = Scenes.loadScene("invalid_scene_name")
        printTestResult("Load invalid scene (should fail)", not success, success and "Unexpectedly succeeded" or "Correctly failed")
    end

    -- Test 5: Fade to scene
    do
        print("\nFading to 'alley' scene (2 second transition)...")
        local success = Scenes.fadeToScene("alley", 2.0)
        printTestResult("Fade to scene", success, "Transition started")
    end

    -- Wait a moment and check
    Wait.time(function()
        local currentScene = Scenes.getCurrentScene()
        print("Current scene after fade: " .. tostring(currentScene))
    end, 2.5)

    DEBUG.logToFile("INFO", "Completed testScenes()", "debug_log")
end

--- Test all scene presets
-- Loads each scene preset to verify they work
function DEBUG.testAllScenes()
    printTestHeader("Scene Management - All Presets")
    DEBUG.logToFile("INFO", "Starting testAllScenes()", "debug_log")

    local scenes = Scenes.listScenes()
    local successCount = 0

    for _, sceneName in ipairs(scenes) do
        print("\nTesting scene: " .. sceneName)
        local success = Scenes.loadScene(sceneName)
        if success then
            successCount = successCount + 1
            print("  ✓ Loaded successfully")
            Wait.time(function() end, 0.5)  -- Brief delay between scenes
        else
            print("  ✗ Failed to load")
        end
    end

    print("\n" .. string.rep("-", 60))
    print("Scene Tests: " .. successCount .. "/" .. #scenes .. " scenes loaded successfully")
    print(string.rep("-", 60))

    local summary = string.format("Scene Tests: %d/%d scenes loaded successfully", successCount, #scenes)
    DEBUG.logToFile("INFO", summary, "debug_log")
    DEBUG.logToFile("INFO", "Completed testAllScenes()", "debug_log")
end

--[[
    Zone Management Tests
]]

--- Test zone activation/deactivation
-- Tests: Z.activateZones, Z.deactivateZones, zone state
function DEBUG.testZones()
    printTestHeader("Zone Management")
    DEBUG.logToFile("INFO", "Starting testZones()", "debug_log")

    -- Test 1: Check current zone state
    do
        local zonesLocked = S.getStateVal("zones", "allZonesLocked")
        print("Current zone state (locked): " .. tostring(zonesLocked))
        printTestResult("Get zone state", zonesLocked ~= nil, "State: " .. tostring(zonesLocked))
    end

    -- Test 2: Toggle zones
    do
        local initialState = S.getStateVal("zones", "allZonesLocked")
        if initialState == true then
            print("\nZones are currently locked. Activating...")
            Z.activateZones()
        else
            print("\nZones are currently active. Deactivating...")
            Z.deactivateZones()
        end

        Wait.time(function()
            local newState = S.getStateVal("zones", "allZonesLocked")
            print("New zone state (locked): " .. tostring(newState))
            printTestResult("Toggle zones", newState ~= initialState, "Changed from " .. tostring(initialState) .. " to " .. tostring(newState))
        end, 0.1)
    end

    -- Test 3: Show/hide zones (visual test)
    do
        print("\nHiding zones (moving below table)...")
        Z.hideZones()
        Wait.time(function()
            print("Showing zones (moving above table)...")
            Z.showZones()
        end, 1.0)
    end
end

--[[
    Main Module Tests
]]

--- Test main module functions
-- Tests: M.forPlayers, M.setupPlayers, M.advancePhase
function DEBUG.testMain()
    printTestHeader("Main Module")
    DEBUG.logToFile("INFO", "Starting testMain()", "debug_log")

    -- Test 1: forPlayers iteration
    do
        local playerCount = 0
        M.forPlayers(function(player, color)
            playerCount = playerCount + 1
            print("  Found player: " .. color)
        end)
        printTestResult("M.forPlayers iteration", playerCount > 0, playerCount .. " players iterated")
    end

    -- Test 2: Get current phase
    do
        local currentPhase = S.getStateVal("currentPhase")
        print("Current phase: " .. tostring(currentPhase))
        printTestResult("Get current phase", currentPhase ~= nil, "Phase: " .. tostring(currentPhase))
    end

    -- Test 3: Advance phase (if valid)
    do
        local initialPhase = S.getStateVal("currentPhase")
        print("\nCurrent phase: " .. tostring(initialPhase))
        print("Attempting to advance to SCENE phase...")
        M.advancePhase(C.Phases.SCENE)

        Wait.time(function()
            local newPhase = S.getStateVal("currentPhase")
            print("New phase: " .. tostring(newPhase))
            printTestResult("Advance phase", newPhase == C.Phases.SCENE, "Changed to: " .. tostring(newPhase))
        end, 0.1)
    end
end

--[[
    UI Tests
]]

--- Test UI display updates
-- Tests: updateUIDisplays, UI.setValue
function DEBUG.testUI()
    printTestHeader("UI Display Updates")
    DEBUG.logToFile("INFO", "Starting testUI()", "debug_log")

    -- Note: This requires the UI to be loaded and updateUIDisplays to be defined globally

    -- Test 1: Update phase display
    do
        S.setStateVal("PLAY", "currentPhase")
        updateUIDisplays()  -- Call the global function directly
        printTestResult("Update UI phase display", true, "Should update currentPhaseDisplay")
    end

    -- Test 2: Update scene display
    do
        Scenes.loadScene("tension")
        updateUIDisplays()
        printTestResult("Update UI scene display", true, "Should update currentSceneDisplay")
    end

    -- Test 3: Update player stats
    do
        local testColor = getFirstSeatedPlayerColor()
        if testColor then
            S.setPlayerVal(testColor, "hunger", 2)
            -- Note: willpower and health are static data in C.PlayerData, not dynamic state
            -- Only hunger is currently saved as dynamic state
            updateUIDisplays()
            printTestResult("Update player stats", true, "Should update " .. testColor .. " player's hunger")
        else
            printTestResult("Update player stats", false, "No seated players found for test")
        end
    end

    print("\nNOTE: Visual verification required - check UI elements in game.")
    DEBUG.logToFile("INFO", "Completed testUI()", "debug_log")
end

--[[
    Constants Module Tests (TOR-3)
]]

--- Test constants module structure and values
-- Tests: C.PlayerColors, C.Phases, C.GUIDS, C.GetHandZoneGUID
function DEBUG.testConstants()
    printTestHeader("Constants Module")
    DEBUG.logToFile("INFO", "Starting testConstants()", "debug_log")

    local passed = 0
    local failed = 0

    -- Test 1: Player Colors
    do
        local expectedColors = {"Brown", "Orange", "Red", "Pink", "Purple"}
        local allPresent = true
        local missingColors = {}

        for _, expectedColor in ipairs(expectedColors) do
            local found = false
            for _, actualColor in ipairs(C.PlayerColors) do
                if actualColor == expectedColor then
                    found = true
                    break
                end
            end
            if not found then
                allPresent = false
                table.insert(missingColors, expectedColor)
            end
        end

        if allPresent and #C.PlayerColors == #expectedColors then
            print("C.PlayerColors: {" .. table.concat(C.PlayerColors, ", ") .. "}")
            printTestResult("Player Colors", true, "All " .. #expectedColors .. " colors present")
            passed = passed + 1
        else
            local details = "Expected: {" .. table.concat(expectedColors, ", ") .. "}, Got: {" .. table.concat(C.PlayerColors, ", ") .. "}"
            if #missingColors > 0 then
                details = details .. ", Missing: {" .. table.concat(missingColors, ", ") .. "}"
            end
            printTestResult("Player Colors", false, details)
            failed = failed + 1
        end
    end

    -- Test 2: Storyteller Color
    do
        if C.STORYTELLER_COLOR == "Black" then
            print("C.STORYTELLER_COLOR: " .. C.STORYTELLER_COLOR)
            printTestResult("Storyteller Color", true, "Correctly set to Black")
            passed = passed + 1
        else
            printTestResult("Storyteller Color", false, "Expected 'Black', got '" .. tostring(C.STORYTELLER_COLOR) .. "'")
            failed = failed + 1
        end
    end

    -- Test 3: Game Phases
    do
        local expectedPhases = {
            "SessionStart", "Scene", "Downtime", "Combat", "Memoriam", "SessionEnd"
        }
        local allPhasesPresent = true
        local missingPhases = {}

        for _, expectedPhase in ipairs(expectedPhases) do
            local found = false
            for _, actualPhase in pairs(C.Phases) do
                if actualPhase == expectedPhase then
                    found = true
                    break
                end
            end
            if not found then
                allPhasesPresent = false
                table.insert(missingPhases, expectedPhase)
            end
        end

        if allPhasesPresent then
            print("C.Phases: " .. JSON.encode(C.Phases))
            printTestResult("Game Phases", true, "All " .. #expectedPhases .. " phases present")
            passed = passed + 1
        else
            printTestResult("Game Phases", false, "Missing phases: {" .. table.concat(missingPhases, ", ") .. "}")
            failed = failed + 1
        end
    end

    -- Test 4: HAND Zone GUIDs Structure
    do
        local expectedHandKeys = {"HAND_BLACK", "HAND_BROWN", "HAND_ORANGE", "HAND_RED", "HAND_PINK", "HAND_PURPLE"}
        local allKeysPresent = true
        local missingKeys = {}
        local placeholderCount = 0

        for _, key in ipairs(expectedHandKeys) do
            if C.GUIDS[key] == nil then
                allKeysPresent = false
                table.insert(missingKeys, key)
            elseif string.find(C.GUIDS[key], "@@@@@@") then
                placeholderCount = placeholderCount + 1
            end
        end

        if allKeysPresent then
            local status = placeholderCount > 0 and " (" .. placeholderCount .. " placeholders need GUIDs)" or " (all GUIDs filled)"
            print("HAND Zone GUIDs: All keys present" .. status)
            printTestResult("HAND Zone GUIDs Structure", true, #expectedHandKeys .. " keys present" .. status)
            passed = passed + 1
        else
            printTestResult("HAND Zone GUIDs Structure", false, "Missing keys: {" .. table.concat(missingKeys, ", ") .. "}")
            failed = failed + 1
        end
    end

    -- Test 5: GetHandZoneGUID Function
    do
        local testColors = {"Brown", "Orange", "Red", "Pink", "Purple", "Black"}
        local allWork = true
        local failedColors = {}

        for _, color in ipairs(testColors) do
            local guid = C.GetHandZoneGUID(color)
            if guid == nil then
                allWork = false
                table.insert(failedColors, color .. " (returned nil)")
            elseif string.find(guid, "@@@@@@") then
                -- This is okay - it's a placeholder that needs to be filled
                print("  " .. color .. ": " .. guid .. " (placeholder - needs GUID)")
            else
                print("  " .. color .. ": " .. guid .. " (GUID filled)")
            end
        end

        if allWork then
            printTestResult("GetHandZoneGUID Function", true, "All colors return valid GUIDs or placeholders")
            passed = passed + 1
        else
            printTestResult("GetHandZoneGUID Function", false, "Failed for: {" .. table.concat(failedColors, ", ") .. "}")
            failed = failed + 1
        end
    end

    -- Test 6: Constants Structure (UI IDs, Dice Settings, etc.)
    do
        local checks = {
            {name = "DICE_SUCCESS_THRESHOLD", value = C.DICE_SUCCESS_THRESHOLD, expected = 6},
            {name = "DICE_CRITICAL_SUCCESS_VALUE", value = C.DICE_CRITICAL_SUCCESS_VALUE, expected = 10},
            {name = "MAX_HUNGER", value = C.MAX_HUNGER, expected = 5},
            {name = "UI_IDS table", value = C.UI_IDS, expected = "table"},
        }

        local allPass = true
        for _, check in ipairs(checks) do
            local pass = false
            if check.expected == "table" then
                pass = type(check.value) == "table"
            else
                pass = check.value == check.expected
            end

            if pass then
                print("  " .. check.name .. ": " .. tostring(check.value))
            else
                print("  " .. check.name .. ": FAILED (expected " .. tostring(check.expected) .. ", got " .. tostring(check.value) .. ")")
                allPass = false
            end
        end

        if allPass then
            printTestResult("Constants Structure", true, "All game settings present")
            passed = passed + 1
        else
            printTestResult("Constants Structure", false, "Some constants missing or incorrect")
            failed = failed + 1
        end
    end

    -- Summary
    print("\n" .. string.rep("-", 60))
    print("Constants Tests: " .. passed .. " passed, " .. failed .. " failed")
    print(string.rep("-", 60))

    local summary = string.format("Constants Tests: %d passed, %d failed", passed, failed)
    DEBUG.logToFile("INFO", summary, "debug_log")
    DEBUG.logTestToFile("Constants Module", failed == 0, summary, "test_results")
end

--[[
    Utility Tests
]]

--- Test utility functions
-- Tests: Basic U.* functions
function DEBUG.testUtilities()
    printTestHeader("Utility Functions")
    DEBUG.logToFile("INFO", "Starting testUtilities()", "debug_log")

    -- Test 1: U.Type
    do
        local result1 = U.Type({})
        local result2 = U.Type("string")
        local result3 = U.Type(123)
        print("U.Type({}): " .. tostring(result1))
        print("U.Type('string'): " .. tostring(result2))
        print("U.Type(123): " .. tostring(result3))
        printTestResult("U.Type", result1 == "table" and result2 == "string" and result3 == "number", "All types correct")
    end

    -- Test 2: U.map
    do
        local input = {1, 2, 3}
        local result = U.map(input, function(x) return x * 2 end)
        local expected = {2, 4, 6}
        local match = result[1] == expected[1] and result[2] == expected[2] and result[3] == expected[3]
        print("U.map({1,2,3}, x*2): {" .. table.concat(result, ",") .. "}")
        printTestResult("U.map", match, "Transformed correctly")
    end

    -- Test 3: U.filter
    do
        local input = {1, 2, 3, 4, 5}
        local result = U.filter(input, function(x) return x % 2 == 0 end)
        print("U.filter({1,2,3,4,5}, even): {" .. table.concat(result, ",") .. "}")
        printTestResult("U.filter", #result == 2 and result[1] == 2 and result[2] == 4, "Filtered correctly")
    end

    DEBUG.logToFile("INFO", "Completed testUtilities()", "debug_log")
end

--[[
    Lighting & Signal Fire Tests (Sequencing & Animation)
]]

--- Initializes all lighting and signal objects to OFF state
-- Sets all signal fires, RING_FLARE, and player lights to OFF instantly
-- Also sets ambient lighting to DARK mode
-- Exposed globally as initLightingAndSignals()
-- @usage initLightingAndSignals() -- Call from TTS console
function DEBUG.initLightingAndSignals()
    print("⚙️  Initializing: Setting all signal fires, RING_FLARE, player lights to OFF, and ambient to DARK")

    -- Helper: Get signal fire object by color
    local function getSignalFire(color)
        local guid = C.GetSignalFireGUID(color)
        if not guid then
            return nil
        end
        return getObjectFromGUID(guid)
    end

    -- Helper: Get RING_FLARE object
    local function getRingFlare()
        local guid = C.GUIDS.RING_FLARE
        if not guid then
            return nil
        end
        return getObjectFromGUID(guid)
    end

    -- Helper: Get player light object by color
    local function getPlayerLight(color)
        local guid = C.GetPlayerLightGUID(color)
        if not guid then
            return nil
        end
        return getObjectFromGUID(guid)
    end

    -- Helper: Merge partial position with current position
    local function mergePosition(obj, partialPos)
        local currentPos = obj.getPosition()
        local newPos = {
            x = partialPos.x or currentPos.x,
            y = partialPos.y or currentPos.y,
            z = partialPos.z or currentPos.z
        }
        return Vector(newPos.x, newPos.y, newPos.z)
    end

    -- Helper: Set signal fire state (on/off) with optional animation
    local function setSignalFireState(color, state, duration)
        duration = duration or 0.0  -- Default to instant
        local fire = getSignalFire(color)
        if not fire then
            print("⚠️  Signal fire not found for color: " .. tostring(color))
            return false
        end

        local posData = C.ObjectPositions.SIGNAL_FIRE[state]
        if not posData then
            print("⚠️  Invalid signal fire state: " .. tostring(state))
            return false
        end

        -- Merge partial position with current position
        local targetPos = mergePosition(fire, posData.position)

        if duration > 0 then
            -- Use lerp for smooth animation
            U.setPositionSlow(fire, targetPos, duration, nil, false)
        else
            -- Instant (no lerping)
            fire.setPosition(targetPos)
        end
        return true
    end

    -- Helper: Set RING_FLARE state (on/off) with optional animation
    local function setRingFlareState(state, duration)
        duration = duration or 0.0  -- Default to instant
        local flare = getRingFlare()
        if not flare then
            print("⚠️  RING_FLARE not found")
            return false
        end

        local posData = C.ObjectPositions.RING_FLARE[state]
        if not posData then
            print("⚠️  Invalid RING_FLARE state: " .. tostring(state))
            return false
        end

        -- Merge partial position with current position
        local currentPos = flare.getPosition()
        local targetPos = {
            x = posData.position.x or currentPos.x,
            y = posData.position.y or currentPos.y,
            z = posData.position.z or currentPos.z
        }
        targetPos = Vector(targetPos.x, targetPos.y, targetPos.z)

        if duration > 0 then
            -- Use lerp for smooth animation
            U.setPositionSlow(flare, targetPos, duration, nil, false)
        else
            -- Instant (no lerping)
            flare.setPosition(targetPos)
        end
        return true
    end

    -- Helper: Convert player color to lighting module light name
    -- Maps "Brown" -> "playerLightBrown", "Orange" -> "playerLightOrange", etc.
    local function getPlayerLightName(color)
        -- Capitalize first letter, lowercase rest
        local first = string.upper(string.sub(color, 1, 1))
        local rest = string.lower(string.sub(color, 2))
        return "playerLight" .. first .. rest
    end

    -- Helper: Set player light mode using lighting module
    -- Uses L.SetLightMode() which handles all properties (position, rotation, range, angle, intensity, enabled)
    local function setPlayerLightMode(color, mode, duration)
        duration = duration or 0.0  -- Default to instant
        local lightName = getPlayerLightName(color)

        if not L or not L.SetLightMode then
            print("⚠️  Lighting module (L) or SetLightMode not available")
            return false
        end

        if not L.LIGHTMODES[lightName] then
            print("⚠️  Light mode not found for: " .. lightName)
            return false
        end

        -- Use lighting module to set the mode
        local success, result = pcall(function()
            return L.SetLightMode(lightName, mode, color, duration)
        end)

        if not success then
            print("⚠️  Error setting player light mode: " .. tostring(result))
            return false
        end

        return true
    end

    local allSuccess = true

    -- Set all signal fires to OFF (instant)
    for _, color in ipairs(C.PlayerColors) do
        local success = setSignalFireState(color, "off", 0.0)  -- 0 = instant
        if not success then
            allSuccess = false
        end
    end

    -- Set RING_FLARE to OFF (instant)
    local flareSuccess = setRingFlareState("off", 0.0)  -- 0 = instant
    if not flareSuccess then
        allSuccess = false
    end

    -- Set all player lights to OFF (instant)
    for _, color in ipairs(C.PlayerColors) do
        local success = setPlayerLightMode(color, "OFF", 0.0)  -- 0 = instant
        if not success then
            allSuccess = false
        end
    end

    -- Set ambient lighting to DARK mode (instant)
    if C.LightModes.DARK then
        U.changeLighting(C.LightModes.DARK)
        print("✅ Ambient lighting set to DARK mode")
    else
        print("⚠️  DARK mode not found in C.LightModes")
        allSuccess = false
    end

    if allSuccess and flareSuccess then
        print("✅ Initialization complete: All objects set to OFF state, ambient lighting set to DARK")
    else
        print("⚠️  Initialization completed with some errors")
    end
end

--- Helper: Merge partial position with current position
-- Handles partial position updates (e.g., {y=2.5} only changes Y axis)
-- @param obj Object The object to get current position from
-- @param partialPos table Partial position data (e.g., {y=2.5} or {x=1, z=3})
-- @return Vector Complete position with partial values merged
local function mergePosition(obj, partialPos)
    local currentPos = obj.getPosition()
    local newPos = {
        x = partialPos.x or currentPos.x,
        y = partialPos.y or currentPos.y,
        z = partialPos.z or currentPos.z
    }
    return Vector(newPos.x, newPos.y, newPos.z)
end

--- Test lighting and signal fire manipulation with sequencing
-- Tests: Signal fire positioning, lighting changes, U.RunSequence, U.Lerp, broadcasts
function DEBUG.testLightingAndSignals()
    printTestHeader("Lighting & Signal Fire Sequencing Test")
    DEBUG.logToFile("INFO", "Starting testLightingAndSignals()", "debug_log")

    local passed = 0
    local failed = 0

    -- Helper: Broadcast message to all players
    local function broadcast(message, color)
        color = color or {1, 1, 1}  -- Default white
        broadcastToAll(message, color)
        print("📢 " .. message)
    end

    -- Helper: Wait step with broadcast message
    local function waitStep(message, waitTime)
        waitTime = waitTime or 3.0
        return function()
            broadcast(message, {0.7, 0.7, 0.7})
            return waitTime
        end
    end

    -- Helper: Get signal fire object by color
    local function getSignalFire(color)
        local guid = C.GetSignalFireGUID(color)
        if not guid then
            return nil
        end
        return getObjectFromGUID(guid)
    end

    -- Helper: Get RING_FLARE object
    local function getRingFlare()
        local guid = C.GUIDS.RING_FLARE
        if not guid then
            return nil
        end
        return getObjectFromGUID(guid)
    end

    -- Helper: Get player light object by color
    local function getPlayerLight(color)
        local guid = C.GetPlayerLightGUID(color)
        if not guid then
            return nil
        end
        return getObjectFromGUID(guid)
    end

    -- Helper: Set signal fire state (on/off) with optional animation
    local function setSignalFireState(color, state, duration)
        duration = duration or 1.0
        local fire = getSignalFire(color)
        if not fire then
            print("⚠️  Signal fire not found for color: " .. tostring(color))
            return false
        end

        local posData = C.ObjectPositions.SIGNAL_FIRE[state]
        if not posData then
            print("⚠️  Invalid signal fire state: " .. tostring(state))
            return false
        end

        -- Merge partial position with current position
        local targetPos = mergePosition(fire, posData.position)

        if duration > 0 then
            -- Use lerp for smooth animation
            U.setPositionSlow(fire, targetPos, duration, nil, false)
        else
            -- Instant (no lerping)
            fire.setPosition(targetPos)
        end
        return true
    end

    -- Helper: Set RING_FLARE state (on/off) with optional animation
    local function setRingFlareState(state, duration)
        duration = duration or 0.0  -- Default to instant
        local flare = getRingFlare()
        if not flare then
            print("⚠️  RING_FLARE not found")
            return false
        end

        local posData = C.ObjectPositions.RING_FLARE[state]
        if not posData then
            print("⚠️  Invalid RING_FLARE state: " .. tostring(state))
            return false
        end

        -- Merge partial position with current position
        local currentPos = flare.getPosition()
        local targetPos = {
            x = posData.position.x or currentPos.x,
            y = posData.position.y or currentPos.y,
            z = posData.position.z or currentPos.z
        }
        targetPos = Vector(targetPos.x, targetPos.y, targetPos.z)

        if duration > 0 then
            -- Use lerp for smooth animation
            U.setPositionSlow(flare, targetPos, duration, nil, false)
        else
            -- Instant (no lerping)
            flare.setPosition(targetPos)
        end
        return true
    end

    -- Helper: Convert player color to lighting module light name
    -- Maps "Brown" -> "playerLightBrown", "Orange" -> "playerLightOrange", etc.
    local function getPlayerLightName(color)
        -- Capitalize first letter, lowercase rest
        local first = string.upper(string.sub(color, 1, 1))
        local rest = string.lower(string.sub(color, 2))
        return "playerLight" .. first .. rest
    end

    -- Helper: Set player light mode using lighting module
    -- Uses L.SetLightMode() which handles all properties (position, rotation, range, angle, intensity, enabled)
    local function setPlayerLightMode(color, mode, duration)
        duration = duration or 0.0  -- Default to instant
        local lightName = getPlayerLightName(color)

        if not L or not L.SetLightMode then
            print("⚠️  Lighting module (L) or SetLightMode not available")
            return false
        end

        if not L.LIGHTMODES[lightName] then
            print("⚠️  Light mode not found for: " .. lightName)
            return false
        end

        -- Use lighting module to set the mode
        local success, result = pcall(function()
            return L.SetLightMode(lightName, mode, color, duration)
        end)

        if not success then
            print("⚠️  Error setting player light mode: " .. tostring(result))
            return false
        end

        return true
    end

    -- Test sequence using U.RunSequence
    local sequenceFunctions = {}

    -- Step 1: Initial broadcast
    table.insert(sequenceFunctions, function()
        broadcast("🔦 Starting Lighting & Signal Fire Test", {1, 1, 0.5})
        return 2.0
    end)

    -- Step 2: INITIALIZATION - Use the extracted initialization function
    table.insert(sequenceFunctions, function()
        broadcast("⚙️  Initializing: Setting all signal fires, RING_FLARE, player lights to OFF, and ambient to DARK", {0.8, 0.8, 1})

        -- Call the extracted initialization function
        DEBUG.initLightingAndSignals()

        printTestResult("Initialization", true, "All objects set to OFF state, ambient set to DARK")
        passed = passed + 1

        return 1.0  -- Brief pause after initialization
    end)

    -- Step 3: Wait after initialization
    table.insert(sequenceFunctions, waitStep("Initialization complete, waiting 3 seconds...", 3.0))

    -- Step 4: Test signal fire ON (Brown player)
    table.insert(sequenceFunctions, function()
        broadcast("🔥 Testing Signal Fire ON (Brown player)", {1, 0.5, 0})
        local success = setSignalFireState("Brown", "on", 0.5)  -- 0.5 seconds for faster motion
        if success then
            printTestResult("Signal Fire ON (Brown)", true, "Fire moved to y=2.5")
            passed = passed + 1
        else
            printTestResult("Signal Fire ON (Brown)", false, "Failed to move fire")
            failed = failed + 1
        end
        return 4.0  -- Wait for animation
    end)

    -- Step 5: Wait after signal fire ON
    table.insert(sequenceFunctions, waitStep("Signal Fire finished raising, waiting 3 seconds...", 3.0))

    -- Step 6: Test signal fire OFF (Brown player)
    table.insert(sequenceFunctions, function()
        broadcast("💤 Testing Signal Fire OFF (Brown player)", {0.5, 0.5, 0.5})
        local success = setSignalFireState("Brown", "off", 0.5)  -- 0.5 seconds for faster motion
        if success then
            printTestResult("Signal Fire OFF (Brown)", true, "Fire moved to y=-25")
            passed = passed + 1
        else
            printTestResult("Signal Fire OFF (Brown)", false, "Failed to move fire")
            failed = failed + 1
        end
        return 4.0  -- Wait for animation
    end)

    -- Step 7: Wait after signal fire OFF
    table.insert(sequenceFunctions, waitStep("Signal Fire finished lowering, waiting 3 seconds...", 3.0))

    -- Step 8: Test multiple signal fires ON (all player colors)
    table.insert(sequenceFunctions, function()
        broadcast("🔥 Testing All Signal Fires ON", {1, 0.5, 0})
        local allSuccess = true
        for _, color in ipairs(C.PlayerColors) do
            local success = setSignalFireState(color, "on", 0.5)  -- 0.5 seconds for faster motion
            if not success then
                allSuccess = false
            end
        end
        if allSuccess then
            printTestResult("All Signal Fires ON", true, "All " .. #C.PlayerColors .. " fires activated")
            passed = passed + 1
        else
            printTestResult("All Signal Fires ON", false, "Some fires failed")
            failed = failed + 1
        end
        return 5.0  -- Wait for animations
    end)

    -- Step 9: Wait after all signal fires ON
    table.insert(sequenceFunctions, waitStep("All Signal Fires finished raising, waiting 3 seconds...", 3.0))

    -- Step 10: Lerp each player light from OFF to STANDARD (one after another)
    table.insert(sequenceFunctions, function()
        broadcast("💡 Testing Player Lights: OFF → STANDARD (sequential)", {1, 1, 0.5})
        local allSuccess = true
        local lerpDuration = 2.0

        -- Create sequence for each player light
        local lightSequence = {}
        for _, color in ipairs(C.PlayerColors) do
            table.insert(lightSequence, function()
                broadcast("  → " .. color .. " light transitioning...", {0.8, 0.8, 1})
                local success = setPlayerLightMode(color, "STANDARD", lerpDuration)
                if not success then
                    allSuccess = false
                end
                return lerpDuration + 0.5  -- Wait for animation + brief pause
            end)
        end

        -- Run the sequence of light transitions
        U.RunSequence(lightSequence)

        if allSuccess then
            printTestResult("Player Lights OFF→STANDARD", true, "All " .. #C.PlayerColors .. " lights transitioned")
            passed = passed + 1
        else
            printTestResult("Player Lights OFF→STANDARD", false, "Some lights failed")
            failed = failed + 1
        end

        -- Return total time for all lights (approximate)
        return (lerpDuration + 0.5) * #C.PlayerColors
    end)

    -- Step 11: Wait after player lights transition
    table.insert(sequenceFunctions, waitStep("All Player Lights finished transitioning, waiting 3 seconds...", 3.0))

    -- Step 12: Instantly switch RING_FLARE to ON
    table.insert(sequenceFunctions, function()
        broadcast("✨ Testing RING_FLARE: Switching to ON (instant)", {1, 1, 0})
        local success = setRingFlareState("on", 0.0)  -- 0 = instant
        if success then
            printTestResult("RING_FLARE ON", true, "RING_FLARE moved to y=-0.08")
            passed = passed + 1
        else
            printTestResult("RING_FLARE ON", false, "Failed to move RING_FLARE")
            failed = failed + 1
        end
        return 2.0  -- Brief pause to observe
    end)

    -- Step 13: Wait after RING_FLARE ON
    table.insert(sequenceFunctions, waitStep("RING_FLARE switched ON, waiting 3 seconds...", 3.0))

    -- Step 14: Instantly switch RING_FLARE to OFF
    table.insert(sequenceFunctions, function()
        broadcast("💤 Testing RING_FLARE: Switching to OFF (instant)", {0.5, 0.5, 0.5})
        local success = setRingFlareState("off", 0.0)  -- 0 = instant
        if success then
            printTestResult("RING_FLARE OFF", true, "RING_FLARE moved to y=-60")
            passed = passed + 1
        else
            printTestResult("RING_FLARE OFF", false, "Failed to move RING_FLARE")
            failed = failed + 1
        end
        return 2.0  -- Brief pause to observe
    end)

    -- Step 15: Wait after RING_FLARE OFF
    table.insert(sequenceFunctions, waitStep("RING_FLARE switched OFF, waiting 3 seconds...", 3.0))

    -- Step 16: Simultaneously lerp all player lights from STANDARD to OFF
    table.insert(sequenceFunctions, function()
        broadcast("💤 Testing Player Lights: STANDARD → OFF (simultaneous)", {0.5, 0.5, 0.5})
        local allSuccess = true
        local lerpDuration = 2.0

        -- Start all transitions simultaneously
        for _, color in ipairs(C.PlayerColors) do
            local success = setPlayerLightMode(color, "OFF", lerpDuration)
            if not success then
                allSuccess = false
            end
        end

        if allSuccess then
            printTestResult("Player Lights STANDARD→OFF", true, "All " .. #C.PlayerColors .. " lights transitioned simultaneously")
            passed = passed + 1
        else
            printTestResult("Player Lights STANDARD→OFF", false, "Some lights failed")
            failed = failed + 1
        end

        return lerpDuration + 1.0  -- Wait for animation to complete
    end)

    -- Step 17: Wait after simultaneous player lights OFF
    table.insert(sequenceFunctions, waitStep("All Player Lights finished transitioning to OFF, waiting 3 seconds...", 3.0))

    -- Step 18: Turn off all signal fires
    table.insert(sequenceFunctions, function()
        broadcast("💤 Turning Off All Signal Fires", {0.5, 0.5, 0.5})
        local allSuccess = true
        for _, color in ipairs(C.PlayerColors) do
            local success = setSignalFireState(color, "off", 0.5)  -- 0.5 seconds for faster motion
            if not success then
                allSuccess = false
            end
        end
        if allSuccess then
            printTestResult("All Signal Fires OFF", true, "All fires deactivated")
            passed = passed + 1
        else
            printTestResult("All Signal Fires OFF", false, "Some fires failed")
            failed = failed + 1
        end
        return 4.0  -- Wait for animations
    end)

    -- Step 19: Final summary
    table.insert(sequenceFunctions, function()
        broadcast("✅ Lighting & Signal Fire Test Complete!", {0, 1, 0})
        print("\n" .. string.rep("-", 60))
        print("Lighting & Signal Fire Tests: " .. passed .. " passed, " .. failed .. " failed")
        print(string.rep("-", 60))

        local summary = string.format("Lighting & Signal Fire Tests: %d passed, %d failed", passed, failed)
        DEBUG.logToFile("INFO", summary, "debug_log")
        DEBUG.logTestToFile("Lighting & Signal Fire Sequencing", failed == 0, summary, "test_results")
        return 0  -- No wait needed
    end)

    -- Execute the sequence
    print("Starting sequence test with " .. #sequenceFunctions .. " steps...")
    print("This will take approximately 2-3 minutes to complete.")
    print("Watch for broadcast messages and visual changes.\n")

    -- Use U.RunSequence to execute all steps
    U.RunSequence(sequenceFunctions)
end

--[[
    Integration Tests
]]

--- Test full module integration
-- Tests that all modules work together
function DEBUG.testIntegration()
    printTestHeader("Full Integration Test")
    DEBUG.logToFile("INFO", "Starting testIntegration() - Running all tests", "debug_log")

    -- Reset state to clean defaults before testing
    print("Resetting game state to clean defaults...")
    S.resetGameState()

    print("Running integration test sequence...")

    -- Step 1: Set game state
    print("\n1. Setting game state...")
    local testColor = getFirstSeatedPlayerColor()
    if not testColor then
        print("   ✗ ERROR: No seated players found for integration test")
        return
    end
    local playerID = S.getPlayerID(testColor)
    if not playerID then
        print("   ✗ ERROR: Could not find player ID for color: " .. testColor)
        return
    end
    S.setPlayerVal(testColor, "hunger", 3)
    S.setStateVal(C.Phases.SCENE, "currentPhase")
    print("   ✓ State set (using player: " .. testColor .. ", ID: " .. playerID .. ")")

    -- Step 2: Load scene
    print("\n2. Loading scene...")
    local sceneSuccess = Scenes.loadScene("elysium")
    print("   " .. (sceneSuccess and "✓" or "✗") .. " Scene loaded")

    -- Step 3: Advance phase
    print("\n3. Advancing phase...")
    M.advancePhase(C.Phases.COMBAT)
    print("   ✓ Phase advanced")

    -- Step 4: Update UI
    print("\n4. Updating UI...")
    updateUIDisplays()
    print("   ✓ UI updated")

    -- Step 5: Verify state
    print("\n5. Verifying final state...")
    local finalHunger = S.getPlayerVal(testColor, "hunger")
    local finalPhase = S.getStateVal("currentPhase")
    local finalScene = Scenes.getCurrentScene()

    print("   Final hunger (" .. testColor .. "): " .. tostring(finalHunger))
    print("   Final phase: " .. tostring(finalPhase))
    print("   Final scene: " .. tostring(finalScene))

    local allGood = (finalHunger == 3 and finalPhase == C.Phases.COMBAT and finalScene == "elysium")
    printTestResult("Integration test", allGood, allGood and "All checks passed" or "Some checks failed")
end

--[[
    State Inspection Functions
]]

--- Display current game state (readable format)
function DEBUG.showState()
    printTestHeader("Current Game State")
    local state = S.getGameState()
    print(JSON.encode_pretty(state))
end

--- Logs complete gameState to a file before save
-- Writes both raw and sanitized versions for comparison
-- @param label string Optional label for the dump (default: "gameState_dump")
function DEBUG.logStateToFile(label)
    label = label or "gameState_dump"
    local timestamp = getTimestamp()

    -- Get both raw and sanitized states
    local rawState = S.getGameState(false)
    local sanitizedState = S.getGameState(true)

    -- Build the dump content
    local dumpContent = string.format(
        "=== GAME STATE DUMP: %s ===\nTimestamp: %s\n\n",
        label,
        timestamp
    )

    -- Raw state
    dumpContent = dumpContent .. "--- RAW STATE (gameState) ---\n"
    local rawSuccess, rawJson = pcall(function()
        return JSON.encode_pretty(rawState)
    end)
    if rawSuccess then
        dumpContent = dumpContent .. rawJson .. "\n\n"
    else
        dumpContent = dumpContent .. "ERROR encoding raw state: " .. tostring(rawJson) .. "\n\n"
    end

    -- Sanitized state (what will be saved)
    dumpContent = dumpContent .. "--- SANITIZED STATE (for save) ---\n"
    local sanitizedSuccess, sanitizedJson = pcall(function()
        return JSON.encode_pretty(sanitizedState)
    end)
    if sanitizedSuccess then
        dumpContent = dumpContent .. sanitizedJson .. "\n\n"
    else
        dumpContent = dumpContent .. "ERROR encoding sanitized state: " .. tostring(sanitizedJson) .. "\n\n"
    end

    -- PlayerData structure details
    dumpContent = dumpContent .. "--- PLAYERDATA STRUCTURE DETAILS ---\n"
    if rawState.playerData then
        dumpContent = dumpContent .. "Raw playerData type: " .. type(rawState.playerData) .. "\n"
        dumpContent = dumpContent .. "Raw playerData key count: " .. #U.getKeys(rawState.playerData) .. "\n"
        dumpContent = dumpContent .. "Raw playerData keys: " .. table.concat(U.getKeys(rawState.playerData), ", ") .. "\n\n"

        for playerID, playerData in pairs(rawState.playerData) do
            dumpContent = dumpContent .. string.format("Player[%s]: type=%s\n", tostring(playerID), type(playerData))
            if type(playerData) == "table" then
                dumpContent = dumpContent .. string.format("  Keys: %s\n", table.concat(U.getKeys(playerData), ", "))
                for k, v in pairs(playerData) do
                    dumpContent = dumpContent .. string.format("  [%s] = %s (type: %s)\n", tostring(k), tostring(v), type(v))
                end
            end
            dumpContent = dumpContent .. "\n"
        end
    else
        dumpContent = dumpContent .. "No playerData in raw state\n\n"
    end

    dumpContent = dumpContent .. string.rep("=", 60) .. "\n\n"

    -- Write to file
    DEBUG.logToFile("INFO", dumpContent, "gameState_dump")
end

--- Display current scene info
function DEBUG.showScene()
    printTestHeader("Current Scene Info")
    local currentScene = Scenes.getCurrentScene()
    if currentScene then
        local sceneData = Scenes.getScene(currentScene)
        print("Current Scene: " .. currentScene)
        print("Description: " .. (sceneData.description or "N/A"))
        print("\nScene Data:")
        print(JSON.encode_pretty(sceneData))
    else
        print("No scene currently set.")
    end
end

--- Display zone status
function DEBUG.showZones()
    printTestHeader("Zone Status")
    local zonesLocked = S.getStateVal("zones", "allZonesLocked")
    print("Zones Locked: " .. tostring(zonesLocked))
    print("Zone Events Active: " .. tostring(not zonesLocked))
end

--[[
    Quick Test Functions (Single Commands)
]]

--- Quick test: Set player hunger
-- @param color string Player color
-- @param value number Hunger value (0-5)
function DEBUG.setHunger(color, value)
    if not color or not value then
        print("Usage: setHunger(color, value)")
        print("Example: setHunger('Red', 3)")
        return
    end

    local playerID = S.getPlayerID(color)
    if not playerID then
        print("ERROR: Could not find player ID for color: " .. color)
        return
    end

    S.setPlayerVal(color, "hunger", value)
    print("Set " .. color .. " player (ID: " .. playerID .. ") hunger to " .. tostring(value))

    updateUIDisplays()
end

--- Quick test: Change scene
-- @param sceneName string Scene name
function DEBUG.changeScene(sceneName)
    if not sceneName then
        print("Usage: changeScene(sceneName)")
        print("Available scenes: " .. table.concat(Scenes.listScenes(), ", "))
        return
    end

    Scenes.loadScene(sceneName)
    print("Changed scene to: " .. sceneName)
end

--- Quick test: Set phase
-- @param phaseName string Phase name (e.g., "PLAY", "COMBAT")
function DEBUG.setPhase(phaseName)
    if not phaseName then
        print("Usage: setPhase(phaseName)")
        print("Available phases: " .. table.concat(U.getValues(C.Phases), ", "))
        return
    end

    -- Find matching phase constant
    local targetPhase = nil
    for _, phase in pairs(C.Phases) do
        if string.upper(phaseName) == string.upper(phase) or string.upper(phaseName) == string.upper(string.match(phase, "(%w+)$")) then
            targetPhase = phase
            break
        end
    end

    if targetPhase then
        M.advancePhase(targetPhase)
        print("Changed phase to: " .. targetPhase)
    else
        print("Invalid phase name. Available: " .. table.concat(U.getValues(C.Phases), ", "))
    end
end

--[[
    File Logging Functions
    These functions write debug information to files in the workspace using
    the TTS Tools extension's sendExternalMessage API.
]]

--- Logs a message to a file with timestamp
-- @param level string Log level: "INFO", "WARN", "ERROR", "DEBUG"
-- @param message string Message to log
-- @param filename string Optional filename (default: "debug_log")
function DEBUG.logToFile(level, message, filename)
    filename = filename or "debug_log"
    local timestamp = getTimestamp()
    local logEntry = string.format("[%s] [%s] %s\n", timestamp, level, message)

    -- Append to existing cached content
    writeToFile(filename, logEntry, "none", true)
end

--- Logs current game state to a file as JSON
-- @param filename string Optional filename (default: "game_state")
function DEBUG.logStateToFile(filename)
    filename = filename or "game_state"
    local state = S.getGameState()
    local stateJson = JSON.encode_pretty(state)
    local timestamp = getTimestamp()
    local content = string.format("Game State Dump - %s\n%s\n", timestamp, stateJson)

    -- State dumps are overwritten (not appended) - each dump is a complete snapshot
    writeToFile(filename, content, "auto", false)
    print("DEBUG: Game state logged to " .. filename .. "." .. LOG_EXTENSION)
end

--- Logs current scene information to a file
-- @param filename string Optional filename (default: "scene_info")
function DEBUG.logSceneToFile(filename)
    filename = filename or "scene_info"
    local currentScene = Scenes.getCurrentScene()
    local scene = Scenes.getScene(currentScene)
    local timestamp = getTimestamp()

    local content = string.format("Scene Information - %s\n", timestamp)
    content = content .. string.format("Current Scene: %s\n", currentScene or "nil")
    if scene then
        content = content .. string.format("Scene Data:\n")
        content = content .. JSON.encode_pretty(scene)
    else
        content = content .. "Scene data not found\n"
    end
    content = content .. "\n"

    -- Scene dumps are overwritten (not appended) - each dump is a complete snapshot
    writeToFile(filename, content, "auto", false)
    print("DEBUG: Scene info logged to " .. filename .. "." .. LOG_EXTENSION)
end

--- Logs zone information to a file
-- @param filename string Optional filename (default: "zone_info")
function DEBUG.logZonesToFile(filename)
    filename = filename or "zone_info"
    local zonesState = S.getStateVal("zones")
    local timestamp = getTimestamp()

    local content = string.format("Zone Information - %s\n", timestamp)
    if zonesState then
        content = content .. JSON.encode_pretty(zonesState)
    else
        content = content .. "No zone state found\n"
    end
    content = content .. "\n"

    -- Zone dumps are overwritten (not appended) - each dump is a complete snapshot
    writeToFile(filename, content, "auto", false)
    print("DEBUG: Zone info logged to " .. filename .. "." .. LOG_EXTENSION)
end

--- Logs a test result to a file
-- @param testName string Name of the test
-- @param passed boolean Whether the test passed
-- @param details string Optional details
-- @param filename string Optional filename (default: "test_results")
function DEBUG.logTestToFile(testName, passed, details, filename)
    filename = filename or "test_results"
    local timestamp = getTimestamp()
    local status = passed and "PASS" or "FAIL"

    local content = string.format("[%s] %s: %s\n", timestamp, status, testName)
    if details then
        content = content .. string.format("  Details: %s\n", details)
    end
    content = content .. "\n"

    -- Append to existing cached content
    writeToFile(filename, content, "none", true)
end

--- Logs all debug information to separate files
-- Creates: game_state, scene_info, zone_info, and a general debug log
function DEBUG.logAllToFiles()
    print("DEBUG: Logging all information to files...")
    DEBUG.logStateToFile("game_state")
    DEBUG.logSceneToFile("scene_info")
    DEBUG.logZonesToFile("zone_info")
    DEBUG.logToFile("INFO", "Full debug dump completed", "debug_log")
    print("DEBUG: All logs written to " .. LOG_DIR .. "/ directory")
end

--- Clears all log files (writes empty/header content to reset them)
-- Called automatically on game load to start fresh logs
-- Also clears the in-memory cache
function DEBUG.clearAllLogs()
    local timestamp = getTimestamp()
    local sessionHeader = string.format("=== DEBUG LOG SESSION STARTED - %s ===\n\n", timestamp)

    -- Clear the cache
    logCache = {}

    -- Clear each log file by writing session header (overwrite mode)
    writeToFile("debug_log", sessionHeader, "none", false)
    writeToFile("game_state", sessionHeader, "none", false)
    writeToFile("scene_info", sessionHeader, "none", false)
    writeToFile("zone_info", sessionHeader, "none", false)
    writeToFile("test_results", sessionHeader, "none", false)

    print("DEBUG: All log files cleared (new session started)")
end

--[[
    Help/Documentation
]]

--- Display help for all debug functions
function DEBUG.help()
    print("\n" .. string.rep("=", 70))
    print("VTM5E MODULE - DEBUG/TESTING COMMANDS")
    print(string.rep("=", 70))
    print("\nUse these commands in the TTS console with: lua <command>()")
    print("\nTESTING FUNCTIONS:")
    print("  testConstants()          - Test constants module (TOR-3)")
    print("  testState()              - Test state get/set operations (TOR-5)")
    print("  testStatePersistence()   - Test state save/load")
    print("  testScenes()             - Test scene loading and transitions")
    print("  testAllScenes()          - Test all scene presets")
    print("  testZones()              - Test zone activation/deactivation")
    print("  testMain()               - Test main module functions")
    print("  testUI()                 - Test UI display updates")
    print("  testUtilities()          - Test utility functions")
    print("  testLightingAndSignals() - Test lighting & signal fires with sequencing")
    print("  testIntegration()        - Full integration test")
    print("\nINSPECTION FUNCTIONS:")
    print("  showState()              - Display current game state (JSON)")
    print("  showScene()              - Display current scene info")
    print("  showZones()              - Display zone status")
    print("\nFILE LOGGING FUNCTIONS:")
    print("  logToFile(level, msg, filename?) - Log a message to file")
    print("  logStateToFile(filename?)       - Log game state to file (JSON)")
    print("  logSceneToFile(filename?)       - Log scene info to file")
    print("  logZonesToFile(filename?)       - Log zone info to file")
    print("  logTestToFile(name, passed, details?, filename?) - Log test result")
    print("  logAllToFiles()                   - Log all debug info to files")
    print("  clearAllLogs()                    - Clear all log files (starts new session)")
    print("\nQUICK SETTERS:")
    print("  setHunger(color, value)  - Set player hunger (e.g., setHunger('Red', 3))")
    print("  changeScene(sceneName)   - Change scene (e.g., changeScene('elysium'))")
    print("  setPhase(phaseName)      - Change phase (e.g., setPhase('PLAY'))")
    print("\nHELP:")
    print("  debugHelp()              - Show this help message")
    print("\n" .. string.rep("=", 70))
end

--[[
    Expose Functions Globally
    These functions can be called from the TTS console via: lua functionName()
    NOTE: In TTS Lua, assigning without 'local' makes variables global.
    No need for _G syntax - just assign directly.
]]

-- Expose all test functions
testConstants = DEBUG.testConstants
testState = DEBUG.testState
testStatePersistence = DEBUG.testStatePersistence
testScenes = DEBUG.testScenes
testAllScenes = DEBUG.testAllScenes
testZones = DEBUG.testZones
testMain = DEBUG.testMain
testUI = DEBUG.testUI
testUtilities = DEBUG.testUtilities
testLightingAndSignals = DEBUG.testLightingAndSignals
testIntegration = DEBUG.testIntegration

-- Expose inspection functions
showState = DEBUG.showState
showScene = DEBUG.showScene
showZones = DEBUG.showZones

-- Expose quick setters
setHunger = DEBUG.setHunger
changeScene = DEBUG.changeScene
setPhase = DEBUG.setPhase

-- Expose file logging functions
logToFile = DEBUG.logToFile
logStateToFile = DEBUG.logStateToFile
logSceneToFile = DEBUG.logSceneToFile
logZonesToFile = DEBUG.logZonesToFile
logTestToFile = DEBUG.logTestToFile
logAllToFiles = DEBUG.logAllToFiles

-- Expose help
debugHelp = DEBUG.help

-- Expose initialization function
initLightingAndSignals = DEBUG.initLightingAndSignals

-- Auto-show help on load (optional - comment out if not desired)
-- DEBUG.help()

return DEBUG

end)
__bundle_register("core.lighting", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Lighting Control Module (core/lighting.ttslua)

    Handles dynamic lighting control for TTS light objects with smooth transitions.
    Extracted and adapted from Kings Dilemma lighting module patterns.

    This module provides:
    - Light mode system (predefined lighting configurations)
    - Smooth transitions using coroutine-based interpolation
    - State persistence (saves current light modes)
    - Light object lookup and component access
    - Batch operations (apply modes to multiple lights)

    Light modes are stored in L.LIGHTMODES table and can be defined per-light.
    Each mode specifies: enabled, color, range, angle, intensity, rotation, position.
]]

local L = {}
local U = require("lib.util")
local S = require("core.state")
local C = require("lib.constants")

-- ============================================================================
-- CONFIGURATION
-- ============================================================================

-- Default transition time for light mode changes (in seconds)
local DefaultTransitionTime = 0.5

-- ============================================================================
-- LIGHT MODE DEFINITIONS
-- ============================================================================

--- Light Mode Definitions Table
--
-- Each light can have multiple modes (e.g., "OFF", "STANDARD", "ambient", "bright", "tension").
-- Modes can be:
--   - Tables: Static mode data {enabled=true, color=Color.White, ...}
--   - Functions: Dynamic modes that calculate values at runtime: function() return {...} end
--   - Strings: Default mode key (e.g., default = "ambient")
--
-- Mode properties:
--   - enabled (boolean): Whether light is on/off
--   - color (Color): Light color (Color object or table {r,g,b})
--   - range (number): Light range/radius
--   - angle (number): Spotlight angle (degrees)
--   - intensity (number): Light intensity/brightness
--   - rotation (Vector): Light rotation {x,y,z}
--   - position (Vector): Light position {x,y,z}
--
-- Special properties (at light definition level, not mode level):
--   - default (string): Default mode to use when mode is "default"
--   - isPlayerLight (boolean): If true, supports per-player modes
--   - isSpawned (boolean): If true, waits for light to spawn before applying
--   - loadRotation (Vector): Initial rotation when light loads
--   - guid (string): If provided, uses GUID lookup instead of tag lookup (for lights without tags)
--
-- @usage L.LIGHTMODES.playerLightBrown = {
--     guid = "f251e0",  -- Use GUID lookup instead of tags
--     isPlayerLight = true,
--     default = "OFF",
--     OFF = {enabled=false, rotation=Vector(0,-72,0), position=Vector(-36.12,0,-110), ...},
--     STANDARD = {enabled=true, rotation=Vector(0,-72,60), position=Vector(-29.75,22.6,-90), ...}
-- }
L.LIGHTMODES = {
    -- Player lights (per-player spotlights)
    -- These lights are found by GUID, not by tag
    -- Each light has OFF and STANDARD modes
    playerLightBrown = {
        guid = C.GUIDS.PLAYER_LIGHT_BROWN,
        isPlayerLight = true,
        default = "OFF",
        OFF = {
            enabled = false,
            rotation = Vector(0, -72, 0),
            position = Vector(-36.12, 0, -110),
            range = 40,
            angle = 0,
            intensity = 0
        },
        STANDARD = {
            enabled = true,
            rotation = Vector(0, -72, 60),
            position = Vector(-29.75, 22.6, -90),
            range = 40,
            angle = 90,
            intensity = 10
        }
    },
    playerLightOrange = {
        guid = C.GUIDS.PLAYER_LIGHT_ORANGE,
        isPlayerLight = true,
        default = "OFF",
        OFF = {
            enabled = false,
            rotation = Vector(0.00, -36.00, 0.00),
            position = Vector(-80.70, 0.00, -61.95),
            range = 40,
            angle = 0,
            intensity = 0
        },
        STANDARD = {
            enabled = true,
            rotation = Vector(0.00, -36.00, 59.46),
            position = Vector(-71.14, 22.60, -55.00),
            range = 40,
            angle = 90,
            intensity = 10
        }
    },
    playerLightRed = {
        guid = C.GUIDS.PLAYER_LIGHT_RED,
        isPlayerLight = true,
        default = "OFF",
        OFF = {
            enabled = false,
            rotation = Vector(0.00, 0.00, 0.00),
            position = Vector(-106.17, 0.00, 0.00),
            range = 40,
            angle = 0,
            intensity = 0
        },
        STANDARD = {
            enabled = true,
            rotation = Vector(0.00, 0.00, 59.46),
            position = Vector(-86.17, 22.60, 0.00),
            range = 40,
            angle = 90,
            intensity = 10
        }
    },
    playerLightPink = {
        guid = C.GUIDS.PLAYER_LIGHT_PINK,
        isPlayerLight = true,
        default = "OFF",
        OFF = {
            enabled = false,
            rotation = Vector(0.00, 36.00, 0.00),
            position = Vector(-80.70, 0.00, 61.95),
            range = 40,
            angle = 0,
            intensity = 0
        },
        STANDARD = {
            enabled = true,
            rotation = Vector(0.00, 36.00, 59.46),
            position = Vector(-71.14, 22.60, 55.00),
            range = 40,
            angle = 90,
            intensity = 10
        }
    },
    playerLightPurple = {
        guid = C.GUIDS.PLAYER_LIGHT_PURPLE,
        isPlayerLight = true,
        default = "OFF",
        OFF = {
            enabled = false,
            rotation = Vector(0.00, 72.00, 0.00),
            position = Vector(-36.12, 0.00, 110),
            range = 40,
            angle = 0,
            intensity = 0
        },
        STANDARD = {
            enabled = true,
            rotation = Vector(0.00, 72.00, 60),
            position = Vector(-29.75, 22.60, 90),
            range = 40,
            angle = 90,
            intensity = 10
        }
    }
}

-- ============================================================================
-- INTERNAL HELPER FUNCTIONS
-- ============================================================================

--- Gets the Light component from a TTS light object
-- TTS lights have a nested structure: object -> child -> grandchild -> Light component
-- This function navigates that structure to access the Light component.
-- @param light Object The light object
-- @param isSilent boolean If true, returns nil on error instead of throwing
-- @return Component|nil The Light component, or nil if not found/error
local function getLightComponent(light, isSilent)
    local lComp
    local success, err = pcall(function()
        lComp = light.getChildren()[1].getChildren()[2].getComponents()[2]
    end)

    if success and lComp then
        return lComp
    elseif isSilent then
        return nil
    end

    -- Detailed error checking if silent mode off
    U.Val("getLightComponent", light, U.isGameObject(light), "Invalid Light Object")
    local children = light.getChildren()
    U.Val("getLightComponent", {light = light, children = children}, #children > 0, "Light has no Children")
    local grandchildren = children[1].getChildren()
    U.Val("getLightComponent", {light = light, grandchildren = grandchildren}, #grandchildren > 1,
        "Light has too few Grandchildren")
    local components = grandchildren[2].getComponents()
    U.Val("getLightComponent", {light = light, components = components}, #components > 1,
        "Light has too few components")
    U.Val("getLightComponent", {light = light, comp = components[2]}, components[2].name == "Light",
        "Can't find 'Light' component")
    return components[2]
end

--- Finds a light object by name/tag or GUID
-- Searches for lights with matching tags, or uses GUID if specified in light mode definition.
-- Supports player-specific lights.
-- @param lightName string The light name/tag to search for (must exist in L.LIGHTMODES)
-- @param playerRef Player|string|nil Optional: Player object or color for player-specific lights
-- @param isSilent boolean If true, returns nil on error instead of throwing
-- @return Object|nil The light object, or nil if not found
local function getLight(lightName, playerRef, isSilent)
    local lData = L.LIGHTMODES[lightName]
    if not lData then
        if isSilent then
            return nil
        else
            U.Val("getLight", lightName, false, "Light mode not found: " .. tostring(lightName))
        end
    end

    -- If light mode has a GUID, use GUID lookup instead of tags
    if lData.guid then
        local light = getObjectFromGUID(lData.guid)
        if light == nil then
            if isSilent then
                return nil
            else
                U.Val("getLight", {lightName, guid = lData.guid}, false, "Light object not found for GUID: " .. tostring(lData.guid))
            end
        end
        return light
    end

    -- Otherwise, use tag-based lookup (original behavior)
    local tags = {lightName}

    if playerRef ~= nil then
        local player = U.isPlayer(playerRef) and playerRef or Player[playerRef]
        if player and player.color then
            table.insert(tags, player.color)
        end
    end

    local lights = getObjectsWithAllTags(tags)

    U.Val("getLight", {tags = tags, lights = lights}, #lights > 0, "No lights found", {isSilent = isSilent})
    U.Val("getLight", {tags = tags, lights = lights}, #lights < 2, "Multiple lights found",
        {isSilent = false, isThrowing = isSilent ~= true})

    return lights[1]
end

--- Gets all lights matching a tag (or all lights if no tag)
-- @param tag string|nil Optional tag to filter by
-- @return table Array of light objects
local function getAllLights(tag)
    local allObjects = getObjects()
    return U.filter(allObjects, function(obj)
        if obj.getChildren == nil then return false end
        local children = obj.getChildren()
        if #children == 0 then return false end
        if not string.match(children[1].name or "", "^spotlight") then return false end
        if getLightComponent(obj, true) == nil then return false end
        if tag and not obj.hasTag(tag) then return false end
        return true
    end)
end

--- Sets light component property directly (low-level)
local function setEnabled(light, enabled)
    local comp = getLightComponent(light, true)
    if comp then comp.set("enabled", enabled) end
end

local function setRange(light, range)
    local comp = getLightComponent(light, true)
    if comp then comp.set("range", range) end
end

local function setIntensity(light, intensity)
    local comp = getLightComponent(light, true)
    if comp then comp.set("intensity", intensity) end
end

local function setColor(light, color)
    local comp = getLightComponent(light, true)
    if comp then comp.set("color", Color(color)) end
end

local function setAngle(light, angle)
    local comp = getLightComponent(light, true)
    if comp then comp.set("spotAngle", angle) end
end

--- Gets light component property directly (low-level)
local function getEnabled(light)
    local comp = getLightComponent(light, true)
    return comp and comp.get("enabled") or false
end

local function getRange(light)
    local comp = getLightComponent(light, true)
    return comp and comp.get("range") or 0
end

local function getIntensity(light)
    local comp = getLightComponent(light, true)
    return comp and comp.get("intensity") or 0
end

local function getColor(light)
    local comp = getLightComponent(light, true)
    return comp and comp.get("color") or Color.White
end

local function getAngle(light)
    local comp = getLightComponent(light, true)
    return comp and comp.get("spotAngle") or 0
end

-- ============================================================================
-- CORE LIGHTING FUNCTIONS
-- ============================================================================

--- Sets a light to a specific mode with smooth transitions
--
-- This is the main function for controlling lights. It:
--   1. Looks up the light mode definition
--   2. Finds the light object by tag/name or GUID (if guid property is set)
--   3. Saves the mode to game state
--   4. Smoothly transitions all properties using U.Lerp
--
-- Supports per-player lights (if isPlayerLight=true in mode definition).
-- Modes can be static tables or dynamic functions that calculate values.
--
-- Light lookup methods:
--   - Tag-based: Light mode has no 'guid' property, uses getObjectsWithAllTags()
--   - GUID-based: Light mode has 'guid' property, uses getObjectFromGUID()
--
-- @param lightName string The name/tag of the light (must exist in L.LIGHTMODES)
-- @param mode string The mode name to apply (e.g., "OFF", "STANDARD", "ambient", "bright")
-- @param player Player|string|nil Optional: Player for player-specific lights
-- @param transitionTime number Optional: Transition duration in seconds (default: 0.5)
-- @return function|nil Returns completion function if using coroutines, or nil
--
-- @usage L.SetLightMode("playerLightBrown", "STANDARD", "Brown", 0.5) -- Player-specific light by GUID
-- @usage L.SetLightMode("playerLightBrown", "OFF", nil, 1.0) -- Turn off player light (player optional for GUID-based lights)
function L.SetLightMode(lightName, mode, player, transitionTime)
    if transitionTime == nil then
        transitionTime = DefaultTransitionTime
    end

    -- Support array of light names (batch operation)
    if U.Type(lightName) == "table" then
        return U.map(lightName, function(lName)
            return L.SetLightMode(lName, mode, player, transitionTime)
        end)
    end

    -- Validate light mode exists
    U.Val("SetLightMode", lightName,
        U.Type(lightName) == "string" and L.LIGHTMODES[lightName] ~= nil,
        "Mode Data Not Found for light: " .. U.ToString(lightName))

    local lData = L.LIGHTMODES[lightName]
    local isSpawned = lData.isSpawned or false

    -- Handle player-specific lights
    -- For GUID-based lights, we don't need player data - the GUID is enough
    -- The isPlayerLight flag is mainly for state saving purposes
    if lData.isPlayerLight then
        -- If using GUID lookup, player is optional (only needed for state saving)
        if lData.guid then
            -- GUID-based lookup: player is optional, only used for state saving
            if player then
                -- Try to resolve player object if provided (for state saving)
                local playerObj = nil
                if U.isPlayer(player) then
                    playerObj = player
                elseif type(player) == "string" then
                    playerObj = Player[player]  -- May be nil if player not seated
                end
                player = playerObj  -- Can be nil, that's okay for GUID-based lights
            end
        else
            -- Tag-based lookup: player is required
            if player == nil then
                -- Apply to all players if no player specified
                local players = Player.getPlayers()
                return U.map(players, function(p)
                    return L.SetLightMode(lightName, mode, p, transitionTime)
                end)
            end
            -- Validate player for tag-based lookup
            local playerObj = nil
            if U.isPlayer(player) then
                playerObj = player
            elseif type(player) == "string" then
                playerObj = Player[player]
            end

            if not playerObj or not U.isPlayer(playerObj) then
                error("SetLightMode: Invalid player reference for tag-based light '" .. tostring(lightName) .. "'. Player: " .. tostring(player) .. " (Player may not be seated)")
            end
            player = playerObj
        end
    else
        -- Non-player lights shouldn't have player parameter
        U.Val("SetLightMode", {lightName, player}, player == nil,
            "Player submitted to non-player light", {isThrowing = false})
        player = nil
    end

    -- Find the light object
    local light = getLight(lightName, player, true)
    if light == nil and isSpawned then
        -- Wait for light to spawn if it's a spawned light
        return U.waitUntil(function()
            return L.SetLightMode(lightName, mode, player, transitionTime)
        end, function()
            return getLight(lightName, player, true) ~= nil
        end, false)
    end

    U.Val("SetLightMode", {lightName, player},
        U.isGameObject(light), "No light found: " .. U.ToString(lightName))

    -- Save mode to state
    -- For player lights, save per-player if player object is available
    -- For GUID-based lights, player may be nil (that's okay)
    if player and U.isPlayer(player) and player.color then
        local sData = S.getStateVal("lights", lightName) or {}
        sData[player.color] = mode
        S.setStateVal(sData, "lights", lightName)
    else
        -- Save mode without player-specific data (works for both non-player lights and GUID-based player lights without player object)
        S.setStateVal(mode, "lights", lightName)
    end

    -- Resolve mode (could be function, string default, or table)
    local modeData = mode
    if U.Type(modeData) == "function" then
        modeData = modeData(player)
    elseif U.Type(modeData) == "string" and modeData == "default" then
        modeData = lData.default or "off"
    end

    -- Get mode definition
    U.Val("SetLightMode", modeData,
        U.Type(modeData) == "string" and lData[modeData] ~= nil,
        "No such mode '" .. U.ToString(modeData) .. "' for light '" .. U.ToString(lightName) .. "'")

    local modeDef = lData[modeData]
    if U.Type(modeDef) == "function" then
        modeDef = modeDef(player) -- Dynamic mode calculation
    end
    if U.Type(modeDef) == "table" then
        modeDef = U.clone(modeDef) -- Clone to avoid modifying original
    end

    -- Apply the light mode with smooth transitions
    local function activateLight()
        local afterVals = {}

        -- Handle enabled state (special case: animate on/off)
        if modeDef.enabled ~= nil then
            if modeDef.enabled == getEnabled(light) then
                modeDef.enabled = nil -- Skip if already in correct state
            elseif modeDef.enabled == true then
                -- Turn on: set intensity to 0 first, then fade in
                setIntensity(light, 0)
                setAngle(light, 0)
                setEnabled(light, true)
            else
                -- Turn off: fade out, then disable
                afterVals.intensity = getIntensity(light)
                afterVals.angle = getAngle(light)
                modeDef.intensity = 0
                modeDef.angle = 0
            end
        end

        -- Create lerp functions for each property that needs transitioning
        return U.RunSequence({
            function()
                local lerpFuncs = {}

                if modeDef.range ~= nil then
                    table.insert(lerpFuncs, U.Lerp(function(range)
                        setRange(light, range)
                    end, getRange(light), modeDef.range, transitionTime))
                end

                if modeDef.intensity ~= nil then
                    table.insert(lerpFuncs, U.Lerp(function(intensity)
                        setIntensity(light, intensity)
                    end, getIntensity(light), modeDef.intensity, transitionTime))
                end

                if modeDef.angle ~= nil then
                    table.insert(lerpFuncs, U.Lerp(function(angle)
                        setAngle(light, angle)
                    end, getAngle(light), modeDef.angle, transitionTime))
                end

                if modeDef.color ~= nil then
                    table.insert(lerpFuncs, U.Lerp(function(color)
                        setColor(light, color)
                    end, getColor(light), Color(modeDef.color), transitionTime))
                end

                if modeDef.rotation ~= nil then
                    table.insert(lerpFuncs, U.setRotationSlow(light, Vector(modeDef.rotation), transitionTime))
                end

                if modeDef.position ~= nil then
                    table.insert(lerpFuncs, U.setPositionSlow(light, Vector(modeDef.position), transitionTime))
                end

                return lerpFuncs
            end,
            function()
                -- Finalize enabled state if turning off
                if modeDef.enabled == false then
                    setEnabled(light, false)
                    setIntensity(light, afterVals.intensity)
                    setAngle(light, afterVals.angle)
                end
            end
        })
    end

    -- Wait for light component if needed
    if isSpawned and getLightComponent(light, true) == nil then
        return U.waitUntil(activateLight, function()
            return getLightComponent(light, true) ~= nil
        end, false)
    end

    return activateLight()
end

--- Loads saved light states from game state
-- Called during initialization to restore lights to their saved states.
-- @usage L.InitLights() -- Called in core/main.ttslua onLoad
function L.InitLights()
    local savedLights = S.getStateVal("lights") or {}

    U.forEach(savedLights, function(mData, lightName)
        if U.Type(mData) == "string" then
            -- Simple mode (single string)
            L.SetLightMode(lightName, mData, nil, 0.5)
        elseif U.Type(mData) == "table" then
            -- Per-player modes (table of color->mode)
            U.forEach(mData, function(mode, pColor)
                L.SetLightMode(lightName, mode, pColor, 0.5)
            end)
        end
    end)
end

--- Resets all lights to their default/off states
-- Useful for cleanup or game reset.
-- @usage L.ResetLights() -- Cleanup after game ends
function L.ResetLights()
    U.forEach(L.LIGHTMODES, function(modes, name)
        if modes.loadRotation then
            local light = getLight(name)
            if light then
                local comp = getLightComponent(light)
                if comp then
                    comp.set("enabled", false)
                    light.setRotation(Vector(180, 0, 0))
                end
            end
        end
    end)
end

--- Applies a mode to multiple lights at once
-- Convenience function for batch operations.
-- @param lightNames string|table Light name(s) to affect (string or array)
-- @param lightMode string Mode to apply (default: "default")
-- @param transitionTime number Transition duration (default: 3.0)
-- @param playerRef Player|string|nil Optional: Player for player-specific lights
-- @return number The transition time (for chaining)
-- @usage L.LoadLights({"playerLightBrown", "playerLightOrange"}, "STANDARD", 2.0)
function L.LoadLights(lightNames, lightMode, transitionTime, playerRef)
    if U.Type(lightNames) == "string" then
        lightNames = {lightNames}
    end
    if lightMode == nil then
        lightMode = "default"
    end
    if transitionTime == nil then
        transitionTime = 3.0
    end

    -- Filter to only lights that exist in LIGHTMODES
    local validLights = U.filter(L.LIGHTMODES, function(_, name)
        return U.isIn(name, lightNames)
    end)

    U.forEach(validLights, function(modes, name)
        if modes[lightMode] == nil then
            U.AlertGM("No Such Mode: " .. U.ToString(lightMode) .. " for light '" .. U.ToString(name) .. "'")
            return
        end

        if lightMode == "default" and U.Type(modes.default) == "string" then
            L.SetLightMode(name, modes.default, playerRef, transitionTime)
        else
            L.SetLightMode(name, lightMode, playerRef, transitionTime)
        end
    end)

    return transitionTime
end

-- ============================================================================
-- PUBLIC API EXPORTS
-- ============================================================================

--- Gets a light object by name/tag
-- @param lightName string The light name/tag
-- @param playerRef Player|string|nil Optional: Player for player-specific lights
-- @return Object|nil The light object
-- @usage local light = L.GetLight("playerLightBrown")
L.GetLight = getLight

--- Gets all lights (optionally filtered by tag)
-- @param tag string|nil Optional tag to filter by
-- @return table Array of light objects
-- @usage local allLights = L.GetAllLights()
L.GetAllLights = getAllLights

-- Low-level property setters (for direct control without modes)
L.SetIntensity = setIntensity
L.SetAngle = setAngle
L.SetColor = setColor
L.SetRange = setRange

return L

end)
__bundle_register("lib.constants", function(require, _LOADED, __bundle_register, __bundle_modules)
-- lib/constants.ttslua
-- Constants Library
-- Game constants, configuration values, and lookup tables for VTM5E module.
-- Extracted and adapted from Heritage and Kings Dilemma reference modules.

local C = {}

-- Player ID map, using real-life player names as keys; will be manually updated with actual IDs when players first join.
-- All state-based and other player data must be stored by player ID -- not color, or name.
C.PlayerIDs = {
  Storyteller = "@@@STORYTELLER_ID@@@",
  Pixel = "@@@PIXEL_ID@@@",
  Thaum = "@@@THAUM_ID@@@",
  Roar = "@@@ROAR_ID@@@",
  JRook = "@@@JRBOOK_ID@@@",
  Hastur = "@@@HASTUR_ID@@@"
}

-- Static Player Data
-- Player data manually updated by the Storyteller after each game. Does not need to be saved to state. When loaded, should be merged on top of state data into complete player data object.
C.PlayerData = {
		[C.PlayerIDs.Storyteller] = {
      color = "Black",
      playerName = "Storyteller",
      charName = "Storyteller"
		},
    [C.PlayerIDs.Pixel] = {
      color = "Brown",
      playerName = "Pixel",
      charName = "Lord Lucien",
      clan = "Toreador",
      generation = 9,
      blood_potency = 3,
      health = {
        boxes = 7,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      willpower = {
        boxes = 5,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      humanity = {
        boxes = 10,
        filled = 6,
        stains = 2
      },
      attributes = {
        Strength = {
          dots = 2
        },
        Dexterity = {
          dots = 2
        },
        Stamina = {
          dots = 3
        },
        Intelligence = {
          dots = 3
        },
        Wits = {
          dots = 4
        },
        Resolve = {
          dots = 2
        },
        Charisma = {
          dots = 3
        },
        Manipulation = {
          dots = 1
        },
        Composure = {
          dots = 2
        }
      },
      skills = {
        ["Animal Ken"] = {
          dots = 2,
          specialties = {
            "Dogs",
            "Cats"
          }
        },
        Bureaucracy = {
          dots = 2
        },
        Crafts = {
          dots = 2
        }
      },
      disciplines = {
        Oblivion = {
          dots = 4,
          powers = {
            "Shadow Sight",
            "Arms of Ahriman",
            "Stygian Shroud",
            "Shadow Perspective"
          },
          rites = {
            {
              level = 2,
              name = "Name of the Father"
            },
            {
              level = 4,
              name = "Pit of Contemplation"
            }
          }
        }
      },
      advantages = {
        {
          type = "background",
          dots = 3,
          tempDots = 2,
          name = "Status (Camarilla)",
          details = ""
        },
        {
          type = "flaw",
          dots = 2,
          name = "Adversary",
          details = "An angry justicar you wronged in the past"
        }
      },
      experience = {
        total = 0,
        spent = 0,
        purchaseLog = {
          {
            type = "discipline",
            name = "Oblivion",
            bought = 4,
            cost = 20,
            date = "2025-01-01"
          }
        }
      }
    },
    [C.PlayerIDs.Thaum] = {
      color = "Orange",
      playerName = "Thaumaterge",
      charName = "Aisling White",
      clan = "Nosferatu",
      generation = 9,
      blood_potency = 3,
      health = {
        boxes = 7,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      willpower = {
        boxes = 5,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      humanity = {
        boxes = 10,
        filled = 7,
        stains = 0
      },
      attributes = {
        Strength = {
          dots = 2
        },
        Dexterity = {
          dots = 2
        },
        Stamina = {
          dots = 3
        },
        Intelligence = {
          dots = 3
        },
        Wits = {
          dots = 4
        },
        Resolve = {
          dots = 2
        },
        Charisma = {
          dots = 3
        },
        Manipulation = {
          dots = 1
        },
        Composure = {
          dots = 2
        }
      },
      skills = {},
      disciplines = {},
      advantages = {},
      experience = {
        total = 0,
        spent = 0,
        purchaseLog = {}
      }
    },
    [C.PlayerIDs.Roar] = {
      color = "Red",
      playerName = "Roarshack",
      charName = "Arion McCall",
      clan = "Tremere",
      generation = 9,
      blood_potency = 3,
      health = {
        boxes = 7,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      willpower = {
        boxes = 5,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      humanity = {
        boxes = 10,
        filled = 7,
        stains = 0
      },
      attributes = {
        Strength = {
          dots = 2
        },
        Dexterity = {
          dots = 2
        },
        Stamina = {
          dots = 3
        },
        Intelligence = {
          dots = 3
        },
        Wits = {
          dots = 4
        },
        Resolve = {
          dots = 2
        },
        Charisma = {
          dots = 3
        },
        Manipulation = {
          dots = 1
        },
        Composure = {
          dots = 2
        }
      },
      skills = {},
      disciplines = {},
      advantages = {},
      experience = {
        total = 0,
        spent = 0,
        purchaseLog = {}
      }
    },
    [C.PlayerIDs.JRook] = {
      color = "Pink",
      playerName = "J. Rook",
      charName = "Aidan Farthing",
      clan = "Malkavian",
      generation = 9,
      blood_potency = 3,
      health = {
        boxes = 7,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      willpower = {
        boxes = 5,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      humanity = {
        boxes = 10,
        filled = 7,
        stains = 0
      },
      attributes = {
        Strength = {
          dots = 2
        },
        Dexterity = {
          dots = 2
        },
        Stamina = {
          dots = 3
        },
        Intelligence = {
          dots = 3
        },
        Wits = {
          dots = 4
        },
        Resolve = {
          dots = 2
        },
        Charisma = {
          dots = 3
        },
        Manipulation = {
          dots = 1
        },
        Composure = {
          dots = 2
        }
      },
      skills = {},
      disciplines = {},
      advantages = {},
      experience = {
        total = 0,
        spent = 0,
        purchaseLog = {}
      }
    },
    [C.PlayerIDs.Hastur] = {
      color = "Purple",
      playerName = "Hastur",
      charName = "Alyssa Farrell",
      clan = "Ventrue",
      generation = 9,
      blood_potency = 3,
      health = {
        boxes = 7,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      willpower = {
        boxes = 5,
        superficial_dmg = 0,
        aggravated_dmg = 0
      },
      humanity = {
        boxes = 10,
        filled = 7,
        stains = 0
      },
      attributes = {
        Strength = {
          dots = 2
        },
        Dexterity = {
          dots = 2
        },
        Stamina = {
          dots = 3
        },
        Intelligence = {
          dots = 3
        },
        Wits = {
          dots = 4
        },
        Resolve = {
          dots = 2
        },
        Charisma = {
          dots = 3
        },
        Manipulation = {
          dots = 1
        },
        Composure = {
          dots = 2
        }
      },
      skills = {},
      disciplines = {},
      advantages = {},
      experience = {
        total = 0,
        spent = 0,
        purchaseLog = {}
      }
    }
}


-- Player Colors (VTM5E-specific)
-- Storyteller is always Black. Player colors are: Brown, Orange, Red, Pink, Purple (in that order)
C.PlayerColors = {
    "Brown", "Orange", "Red", "Pink", "Purple"
}

-- VTM5E Clans (from Heritage module)
C.Clans = {
    "Banu Haqim", "Brujah", "Caitif", "Cappadocian", "Gangrel", "Giovanni", "Lasombra", "Malkavian", "Ministry", "Nosferatu", "Ravnos", "Salubri", "Thin-Blood", "Toreador", "Tremere", "Tzimisce", "Ventrue"
}

-- VTM5E Disciplines (from Heritage module)
C.Disciplines = {
    "Animalism", "Auspex", "Blood Sorcery", "Celerity", "Dominate", "Fortitude",
    "Obfuscate", "Oblivion", "Potence", "Presence", "Protean"
}

-- Game Phases (VTM5E-specific)
-- Phases represent different stages of a VTM5E session
C.Phases = {
    SESSION_START = "SessionStart",  -- Beginning of session, setup, introductions
    SCENE = "Scene",                  -- Active roleplay scenes
    DOWNTIME = "Downtime",            -- Between-scenes activities, planning
    COMBAT = "Combat",                -- Combat encounters
    MEMORIAM = "Memoriam",            -- End-of-session reflection and XP
    SESSION_END = "SessionEnd"        -- Session conclusion, cleanup
}

-- UI Element IDs (common or global UI elements)
C.UI_IDS = {
    GM_PANEL = "gmControlPanel",
    PLAYER_HUD_PREFIX = "playerHud_", -- e.g., playerHud_Red
    HUNGER_LABEL_PREFIX = "hungerVal_",
    WILLPOWER_LABEL_PREFIX = "willpowerVal_",
    HEALTH_LABEL_PREFIX = "healthVal_",
    SCENE_BUTTON_PREFIX = "sceneBtn_",
    DEBUG_PANEL = "debugStatePanel"
}

-- Default Game Settings (VTM5E rules)
C.DICE_SUCCESS_THRESHOLD = 6
C.DICE_CRITICAL_SUCCESS_VALUE = 10

-- Hunger Constants (VTM5E)
-- Note: Willpower and Health do not have default values under V5 rules
-- They are character-specific and stored in C.PlayerData
C.MAX_HUNGER = 5  -- Maximum hunger value (0-5 scale)

-- Storyteller Color (GM role)
-- Storyteller is always Black in VTM5E
C.STORYTELLER_COLOR = "Black"

-- Camera Angles (preset views for cinematic control)
C.CameraAngles = {
    OVERVIEW = {position = {x=0, y=10, z=-15}, pitch = 35, yaw = 0, distance = 50},
    GM_VIEW = {position = {x=-30, y=30, z=0}, pitch = 45, yaw = 90, distance = 40},
    -- Add more as needed for specific scenes
}

-- Object positions based on object state
-- Only listed values should be changed
C.ObjectPositions = {
  SIGNAL_FIRE = {
    on = {position = {y=2.5}},
    off = {position = {y=-40}}
  },
  RING_FLARE = {
    on = {position = {y=-0.08}},
    off = {position = {y=-60}}
  }
}

-- Light Presets (scene lighting configurations)
-- Note: Color is controlled via LUT (Look-Up Table) indices, not a direct color property
-- Use lut_index and lut_contribution for color grading effects
C.LightModes = {
    BRIGHT = {
        ambient_intensity = 1.0,
        light_intensity = 1.0,
        ambient_type = 1,
        lut_contribution = 0,
        lut_index = 1,
        reflection_intensity = 0
    },
    DIM = {
        ambient_intensity = 0.2,
        light_intensity = 0.5,
        ambient_type = 1,
        lut_contribution = 0,
        lut_index = 1,
        reflection_intensity = 0
    },
    DARK = {
        ambient_intensity = 0.0,
        light_intensity = 0.0,
        ambient_type = 1,
        lut_contribution = 0,
        lut_index = 1,
        reflection_intensity = 0
    },
    TENSION = {
        ambient_intensity = 0.3,
        light_intensity = 0.8,
        ambient_type = 1,
        lut_contribution = 0,
        lut_index = 1,
        reflection_intensity = 0
    },
    STANDARD = {
        ambient_intensity = 0.5546665,
        ambient_type = 1,
        light_intensity = 0.5333346,
        lut_contribution = 0,
        lut_index = 1,
        reflection_intensity = 0
    }
}

-- Placeholder GUIDs (replace with actual GUIDs from your TTS objects)
-- Search for "@@@@@@" to find and replace these placeholders
C.GUIDS = {
    -- Table object (if needed for reference)
    TABLE = "1a0c6d",
    -- Map object (for the map of the city)
    MAP = "996f38",

    -- STORYTELLER OBJECTS
    -- Storyteller Table (raised and behind players so they can't see it)
    STORYTELLER_TABLE = "c64fe0",
    -- Difficulty Dial (for setting difficulty of dice rolls
    DIFFICULTY_DIAL = "fe9e9a",

    -- Light objects (for scene lighting)
    MAIN_LIGHT = "7082b8",
    LARGE_MAP_LIGHT = "16a7b8",
    PLAYER_LIGHT_BROWN = "f251e0",
    PLAYER_LIGHT_ORANGE = "d3356d",
    PLAYER_LIGHT_RED = "0cd76a",
    PLAYER_LIGHT_PINK = "937fac",
    PLAYER_LIGHT_PURPLE = "b36dfe",

    -- Ambient Objects (for effects)
    AMBIENT_FOG = "fb25b1",
    RING_FLARE = "210fad", -- circular ring of rising light, used to highlight table drops

    -- Hand zones (player hand zones)
    -- Storyteller (Black) and player colors: Brown, Orange, Red, Pink, Purple
    HAND_BLACK = "8981a0",  -- Storyteller
    HAND_BROWN = "14b6cf",
    HAND_ORANGE = "b9d1d9",
    HAND_RED = "b13642",
    HAND_PINK = "926600",
    HAND_PURPLE = "e32d2c",

    -- Scripting Zones
    TABLE_DROP_ZONE = "af99b8", -- zone for table drops

    -- Tombstone objects (for character tombstones)
    TOMBSTONE_BROWN = "14b6cf",
    TOMBSTONE_ORANGE = "b9d1d9",
    TOMBSTONE_RED = "b13642",
    TOMBSTONE_PINK = "926600",
    TOMBSTONE_PURPLE = "e32d2c",

    -- Signal fires (for players to signal need for Storyteller attention)
    SIGNAL_FIRE_BROWN = "b0ffa8",
    SIGNAL_FIRE_ORANGE = "7aa4ed",
    SIGNAL_FIRE_RED = "cc2959",
    SIGNAL_FIRE_PINK = "f1b7af",
    SIGNAL_FIRE_PURPLE = "eac658",

    -- Add other object GUIDs as needed (zones, boards, etc.)
    -- Format: OBJECT_NAME = "@@@@@@OBJECT_NAME@@@@@@"
}

--- Gets the GUID string for a player's hand zone by color
-- Returns the GUID from C.GUIDS if it exists, or nil if not found.
-- Note: After placeholders are replaced with actual GUIDs, this will return real GUID strings.
-- If a GUID is not found, returns nil so callers can handle the error appropriately.
-- @param color string Player color (e.g., "Red", "Brown", "Orange", "Pink", "Purple", or "Black" for Storyteller)
-- @return string|nil GUID string if found, or nil if not found
-- @usage local handGUID = C.GetHandZoneGUID("Red")
-- @usage local handObj = getObjectFromGUID(C.GetHandZoneGUID("Red"))
function C.GetHandZoneGUID(color)
    if color == nil then
        return nil
    end
    local guidKey = "HAND_" .. string.upper(color)
    local guid = C.GUIDS[guidKey]

    -- If GUID is not found, return nil (don't create a placeholder - placeholders should only exist before GUIDs are set)
    if guid == nil then
        return nil
    end

    -- If GUID still contains placeholder markers, it hasn't been replaced yet
    -- Return it as-is (caller should handle placeholder case if needed)
    return guid
end

--- Gets the GUID string for a signal fire by color
-- Returns the GUID from C.GUIDS if it exists, or nil if not found.
-- Note: After placeholders are replaced with actual GUIDs, this will return real GUID strings.
-- If a GUID is not found, returns nil so callers can handle the error appropriately.
-- @param color string Player color (e.g., "Red", "Brown", "Orange", "Pink", "Purple", or "Black" for Storyteller)
-- @return string|nil GUID string if found, or nil if not found
-- @usage local signalFireGUID = C.GetSignalFireGUID("Red")
-- @usage local signalFireObj = getObjectFromGUID(C.GetSignalFireGUID("Red"))
function C.GetSignalFireGUID(color)
  if color == nil then
      return nil
  end
  local guidKey = "SIGNAL_FIRE_" .. string.upper(color)
  local guid = C.GUIDS[guidKey]

  -- If GUID is not found, return nil (don't create a placeholder - placeholders should only exist before GUIDs are set)
  if guid == nil then
      return nil
  end

  -- If GUID still contains placeholder markers, it hasn't been replaced yet
  -- Return it as-is (caller should handle placeholder case if needed)
  return guid
end

--- Gets the GUID string for a tombstone by color
-- Returns the GUID from C.GUIDS if it exists, or nil if not found.
-- Note: After placeholders are replaced with actual GUIDs, this will return real GUID strings.
-- If a GUID is not found, returns nil so callers can handle the error appropriately.
-- @param color string Player color (e.g., "Red", "Brown", "Orange", "Pink", "Purple", or "Black" for Storyteller)
-- @return string|nil GUID string if found, or nil if not found
-- @usage local tombstoneGUID = C.GetTombstoneGUID("Red")
-- @usage local tombstoneObj = getObjectFromGUID(C.GetTombstoneGUID("Red"))
function C.GetTombstoneGUID(color)
  if color == nil then
      return nil
  end
  local guidKey = "TOMBSTONE_" .. string.upper(color)
  local guid = C.GUIDS[guidKey]

  -- If GUID is not found, return nil (don't create a placeholder - placeholders should only exist before GUIDs are set)
  if guid == nil then
      return nil
  end

  -- If GUID still contains placeholder markers, it hasn't been replaced yet
  -- Return it as-is (caller should handle placeholder case if needed)
  return guid
end

function C.GetPlayerLightGUID(color)
  if color == nil then
      return nil
  end
  local guidKey = "PLAYER_LIGHT_" .. string.upper(color)
  local guid = C.GUIDS[guidKey]

  if guid == nil then
      return nil
  end

  -- If GUID still contains placeholder markers, it hasn't been replaced yet
  -- Return it as-is (caller should handle placeholder case if needed)
  return guid
end

return C

end)
__bundle_register("core.state", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Game State Management Module (core/state.ttslua)

    Handles persistent game data storage, retrieval, and state transitions.
    Pattern based on Kings Dilemma state module with nested state access support.

    This module provides:
    - Nested state access (get/set values at any depth)
    - State initialization with default merging
    - State validation and sanitization
    - Phase management helpers

    The global 'gameState' table is defined in global.ttslua and accessed here.
]]

local S = {}
local U = require("lib.util")
local C = require("lib.constants")

-- ============================================================================
-- INTERNAL HELPER FUNCTIONS (Nested State Access)
-- ============================================================================

--- Safely navigates through nested tables using variable arguments
-- @param tableData table The root table to navigate
-- @param ... string|number Variable number of keys to navigate through
-- @return any The value at the end of the path, or nil if path doesn't exist
-- @usage getFromTable(gameState, "playerData", playerID, "hunger") -- Returns hunger value for player
local function getFromTable(tableData, ...)
    local keys = {...}

    while #keys > 0 do
        U.Val("getFromTable()", tableData, tableData and U.Type(tableData) == "table",
            "Cannot navigate past non-table.")
        local thisKey = U.shift(keys)
        tableData = tableData[thisKey]
        if tableData == nil then return nil end
    end

    return tableData
end

--- Safely sets a value in a nested table, creating intermediate tables as needed
-- @param value any The value to set
-- @param tableData table The root table to modify
-- @param ... string|number Variable number of keys (last key is where value is set)
-- @return table The modified table (same reference as tableData)
-- @usage setInTable(3, gameState, "playerData", playerID, "hunger") -- Sets player's hunger to 3
local function setInTable(value, tableData, ...)
    -- Validate input
    if tableData == nil then
        error("setInTable() called with nil tableData")
    end
    if U.Type(tableData) ~= "table" then
        error("setInTable() called with non-table data: " .. U.ToString(tableData))
    end

    local keys = {...}
    if #keys == 0 then
        error("setInTable() called with no keys")
    end

    local finalKey = U.pop(keys)
    local tableRef = tableData
    local subTableKey, subTableData, subTableRef

    -- Navigate to the parent of the target key, creating intermediate tables if needed
    while #keys > 0 do
        local thisKey = U.shift(keys)

        -- Validate that current tableRef is a table
        if U.Type(tableRef) ~= "table" then
            error("setInTable() cannot navigate past non-table value at key: " .. U.ToString(thisKey))
        end

        if tableRef[thisKey] == nil then
            -- Need to create a new subtable path
            subTableKey = thisKey
            subTableData = {}
            subTableRef = subTableData
            break
        else
            -- Navigate deeper, but validate the value is a table
            local nextRef = tableRef[thisKey]
            if U.Type(nextRef) ~= "table" then
                -- Overwrite non-table value with a new table
                subTableKey = thisKey
                subTableData = {}
                subTableRef = subTableData
                break
            end
            tableRef = nextRef
        end
    end

    -- Create any remaining intermediate tables
    while #keys > 0 do
        local thisKey = U.shift(keys)
        if subTableRef == nil then
            subTableKey = thisKey
            subTableData = {}
            subTableRef = subTableData
        else
            subTableRef[thisKey] = {}
            subTableRef = subTableRef[thisKey]
        end
    end

    -- Validate tableRef is still a table before setting final value
    if U.Type(tableRef) ~= "table" then
        error("setInTable() final tableRef is not a table")
    end

    -- Set the final value, attaching newly created subtables if needed
    if subTableKey ~= nil then
        if subTableRef == nil then
            error("setInTable() subTableRef is nil but subTableKey is set")
        end
        subTableRef[finalKey] = value
        tableRef[subTableKey] = subTableData
    else
        tableRef[finalKey] = value
    end

    return tableData
end

-- ============================================================================
-- DEFAULT STATE DEFINITION
-- ============================================================================



--- Returns the default game state structure
-- This defines the initial state for a new game. Only dynamic values are stored here.
-- Static player data comes from C.PlayerData and is merged on load.
-- @return table Default game state structure
function S.GetDefaultGameState()
    -- Create playerData as a dictionary keyed by player ID (from C.PlayerIDs)
    -- Only dynamic values are stored here (values that change during gameplay)
    -- Static character data is in C.PlayerData and merged on load
    local playerData = {}
    for playerKey, playerID in pairs(C.PlayerIDs) do
        playerData[playerID] = {
            hunger = 0, -- Only dynamic values are stored in state
            -- Add other dynamic values here as needed (willpower current, health current, etc.)
        }
    end

    return {
        currentPhase = C.Phases.SESSION_START,
        playerData = playerData, -- Keyed by player ID, only dynamic values
        lights = {}, -- Light states will be stored here
        zones = {},  -- Zone-related data
        scene = {
            name = "",
            description = "",
            mood = "",
        },
        -- Add other top-level game state defaults
    }
end

--- Merges default values into a target table recursively
-- Ensures that new state keys are present in old saves (backward compatibility).
-- @param target table The target table to merge into (modified in place)
-- @param defaults table The default structure to merge from
function S.mergeDefaults(target, defaults)
    for k, v in pairs(defaults) do
        if target[k] == nil then
            target[k] = U.clone(v) -- Clone to avoid reference issues
        elseif type(v) == "table" and type(target[k]) == "table" then
            S.mergeDefaults(target[k], v) -- Recursively merge nested tables
        end
    end
end

--- Merges C.PlayerData on top of gameState.playerData with conflict detection
-- Static character data (from constants) is merged on top of dynamic state data.
-- Throws an error if there are conflicts (indicating dynamic data was incorrectly saved).
-- @param statePlayerData table The playerData from gameState (dynamic values only)
-- @return table Complete player data with static and dynamic merged
function S.mergePlayerData(statePlayerData)
    local merged = {}

    -- For each player ID in C.PlayerData
    for playerID, staticData in pairs(C.PlayerData) do
        -- Start with the static data (from constants)
        merged[playerID] = U.clone(staticData)

        -- Overlay dynamic data from state (if it exists)
        local dynamicData = statePlayerData and statePlayerData[playerID]
        if dynamicData then
            -- Check for conflicts (keys that exist in both but have different values)
            for key, dynamicValue in pairs(dynamicData) do
                if staticData[key] ~= nil then
                    -- This is a conflict - dynamic data shouldn't override static data
                    error(string.format(
                        "CONFLICT: Player ID '%s' has key '%s' in both C.PlayerData (static: %s) and gameState.playerData (dynamic: %s). " ..
                        "Dynamic values should only contain gameplay-state values, not character data.",
                        tostring(playerID), tostring(key), tostring(staticData[key]), tostring(dynamicValue)
                    ))
                end
                -- Safe to add - this is a dynamic value that doesn't exist in static data
                merged[playerID][key] = dynamicValue
            end
        end
    end

    return merged
end

-- ============================================================================
-- STATE INITIALIZATION & RESET
-- ============================================================================

--- Initializes game state from saved data or creates defaults
-- Merges loaded state with defaults to ensure all keys exist (backward compatibility).
-- Merges C.PlayerData (static) on top of gameState.playerData (dynamic).
-- @param saved_data string|table|nil JSON string containing saved state, table of saved state, or nil/empty for new game
-- @usage S.InitializeGameState(saved_data) -- Called in global.ttslua onLoad
function S.InitializeGameState(saved_data)
    if saved_data and saved_data ~= "" then
        -- Decode JSON string if needed
        if U.Type(saved_data) == "string" then
            saved_data = JSON.decode(saved_data)
        end

        print("State: Loading saved game state.")

        -- Start with defaults, then merge saved data (saved data takes precedence)
        gameState = U.clone(S.GetDefaultGameState())
        S.mergeDefaults(gameState, saved_data or {})

        -- Apply saved data on top of defaults (overwrites defaults)
        for k, v in pairs(saved_data or {}) do
            if k ~= "playerData" then
                gameState[k] = v
            else
                -- Special handling for playerData: merge with defaults first
                gameState.playerData = gameState.playerData or {}
                S.mergeDefaults(gameState.playerData, v or {})
            end
        end
    else
        print("State: Initializing new game state.")
        gameState = S.GetDefaultGameState()
    end

    -- Merge C.PlayerData (static) on top of gameState.playerData (dynamic)
    -- This creates the complete player data structure used at runtime
    -- gameState.playerData at this point contains only dynamic values (from save or defaults)
    print("State: Merging static player data from constants...")
    local completePlayerData = S.mergePlayerData(gameState.playerData)
    gameState.playerData = completePlayerData

    -- Ensure all required fields exist (validation/sanitization)
    S.validateState()

    print("State: Current phase is " .. S.getStateVal("currentPhase"))
end

--- Resets game state to defaults
-- @usage S.resetGameState() -- Start a new game
function S.resetGameState()
    print("State: Resetting game state to defaults.")
    gameState = S.GetDefaultGameState()
    S.validateState()
end

--- Validates and sanitizes game state
-- Ensures all required fields exist and have valid values.
-- Called automatically after initialization and reset.
function S.validateState()
    -- Ensure currentPhase exists and is valid
    if not gameState.currentPhase or not U.isIn(gameState.currentPhase, C.Phases) then
        gameState.currentPhase = C.Phases.SESSION_START
    end

    -- Ensure playerData table exists and has correct structure
    if not gameState.playerData then
        gameState.playerData = {}
    end

    -- Ensure other required top-level tables exist
    if not gameState.lights then gameState.lights = {} end
    if not gameState.zones then gameState.zones = {} end
    if not gameState.scene then gameState.scene = {} end
end

-- ============================================================================
-- STATE ACCESS (Basic Get/Set)
-- ============================================================================

--- Builds a save-safe state by explicitly copying only serializable fields
-- This is a whitelist approach - only includes fields we explicitly want to save
-- Much safer than trying to filter out non-serializable data
-- @return table A new table containing only serializable state data
local function buildSaveState()
    local saveState = {}

    -- Copy only the fields we want to save (whitelist approach)
    if gameState.currentPhase then
        saveState.currentPhase = gameState.currentPhase
    end

    if gameState.currentScene then
        saveState.currentScene = gameState.currentScene
    end

    -- Copy playerData (only dynamic values - static data comes from C.PlayerData)
    -- Extract only the dynamic gameplay-state values for each player ID
    -- Static character data should NOT be saved to state (it's in C.PlayerData constants)
    if gameState.playerData then
        saveState.playerData = {}
        for playerID, playerData in pairs(gameState.playerData) do
            -- Skip non-table entries (safety check)
            if type(playerData) ~= "table" then
                print("[WARNING] buildSaveState: Skipping player ID '" .. tostring(playerID) .. "' - not a table, type: " .. type(playerData))
                -- Skip this iteration
            -- Skip if the key itself is not serializable (should be a player ID string)
            elseif type(playerID) ~= "string" and type(playerID) ~= "number" then
                print("[WARNING] buildSaveState: Skipping player entry with non-serializable key type: " .. type(playerID))
                -- Skip this iteration
            else
                -- Extract only dynamic values from the complete merged playerData
                -- Static character data comes from C.PlayerData and should NOT be saved
                -- List of dynamic fields that should be saved (add more as needed)
                local dynamicFields = {"hunger"}  -- Currently only hunger is dynamic
                local dynamicPlayerData = {}

                for _, fieldName in ipairs(dynamicFields) do
                    local fieldSuccess, fieldVal = pcall(function() return playerData[fieldName] end)
                    if fieldSuccess and fieldVal ~= nil then
                        local fieldType = type(fieldVal)
                        if fieldType == "number" then
                            dynamicPlayerData[fieldName] = fieldVal
                        elseif fieldType == "string" then
                            -- Try to convert string numbers to actual numbers
                            local num = tonumber(fieldVal)
                            if num then
                                dynamicPlayerData[fieldName] = num
                            else
                                print("[WARNING] buildSaveState: Player ID '" .. tostring(playerID) .. "' " .. fieldName .. " is non-numeric string: " .. tostring(fieldVal))
                            end
                        elseif fieldType == "boolean" then
                            dynamicPlayerData[fieldName] = fieldVal
                        else
                            print("[WARNING] buildSaveState: Player ID '" .. tostring(playerID) .. "' has non-serializable " .. fieldName .. " type: " .. fieldType)
                        end
                    end
                end

                -- Only save if we have at least one dynamic field
                if next(dynamicPlayerData) ~= nil then
                    saveState.playerData[playerID] = dynamicPlayerData
                end
                -- Note: We don't warn if no dynamic fields - player might not have any dynamic state yet
            end
        end
    end

    -- Copy lights data (only serializable fields)
    if gameState.lights then
        saveState.lights = {}
        for lightName, lightData in pairs(gameState.lights) do
            if type(lightData) == "table" then
                -- Light data might be a mode string or a table of per-player modes
                if type(lightData) == "string" then
                    saveState.lights[lightName] = lightData
                else
                    -- Per-player modes - copy only serializable values
                    local cleanLightData = {}
                    for key, val in pairs(lightData) do
                        if type(key) == "string" and (type(val) == "string" or type(val) == "number" or type(val) == "boolean") then
                            cleanLightData[key] = val
                        end
                    end
                    if next(cleanLightData) ~= nil then
                        saveState.lights[lightName] = cleanLightData
                    end
                end
            elseif type(lightData) == "string" then
                saveState.lights[lightName] = lightData
            end
        end
    end

    -- Copy zones data (only serializable fields)
    if gameState.zones then
        saveState.zones = {}
        for zoneKey, zoneData in pairs(gameState.zones) do
            -- Skip non-serializable keys
            if type(zoneKey) ~= "string" and type(zoneKey) ~= "number" then
                -- Skip this key
            elseif type(zoneData) == "string" or type(zoneData) == "number" or type(zoneData) == "boolean" then
                saveState.zones[zoneKey] = zoneData
            elseif type(zoneData) == "table" then
                -- Recursively copy only serializable fields from zone data
                local cleanZoneData = {}
                for k, v in pairs(zoneData) do
                    local kType = type(k)
                    local vType = type(v)

                    -- Keys must be serializable
                    if (kType == "string" or kType == "number") then
                        -- Handle values
                        if vType == "string" or vType == "number" or vType == "boolean" or vType == "nil" then
                            cleanZoneData[k] = v
                        elseif vType == "table" then
                            -- Check if it's a Vector-like table (has x, y, z) and convert to plain table
                            if v.x ~= nil and v.y ~= nil and v.z ~= nil then
                                cleanZoneData[k] = {x = v.x, y = v.y, z = v.z}
                            else
                                -- Plain table - recursively copy (but skip Vector/Color userdata)
                                local nestedClean = {}
                                for nk, nv in pairs(v) do
                                    if (type(nk) == "string" or type(nk) == "number") and
                                       (type(nv) == "string" or type(nv) == "number" or type(nv) == "boolean" or type(nv) == "nil") then
                                        nestedClean[nk] = nv
                                    elseif type(nv) == "table" and nv.x and nv.y and nv.z then
                                        -- Nested Vector-like table
                                        nestedClean[nk] = {x = nv.x, y = nv.y, z = nv.z}
                                    end
                                end
                                if next(nestedClean) ~= nil then
                                    cleanZoneData[k] = nestedClean
                                end
                            end
                        end
                    end
                end
                if next(cleanZoneData) ~= nil then
                    saveState.zones[zoneKey] = cleanZoneData
                end
            end
        end
    end

    -- Copy scene data (only serializable fields)
    if gameState.scene then
        saveState.scene = {}
        if gameState.scene.name then saveState.scene.name = gameState.scene.name end
        if gameState.scene.description then saveState.scene.description = gameState.scene.description end
        if gameState.scene.mood then saveState.scene.mood = gameState.scene.mood end
    end

    return saveState
end

--- Gets the entire game state table (raw or save-safe)
-- @param shouldSanitize boolean Optional. If true, returns explicitly built save state (whitelist approach, default: false)
-- @return table The gameState table (or save-safe version)
-- @usage local state = S.getGameState() -- Get raw state
-- @usage local state = S.getGameState(true) -- Get save-safe state (whitelist approach)
function S.getGameState(shouldSanitize)
    if shouldSanitize then
        return buildSaveState()  -- Use whitelist approach instead of sanitization
    end
    return gameState
end

--- Sets the entire game state table
-- Use with caution - prefer nested get/set functions for individual values.
-- @param data table The new game state table
-- @usage S.setGameState(newState)
function S.setGameState(data)
    gameState = data
    S.validateState()
end

-- ============================================================================
-- STATE VALIDATION
-- ============================================================================

--- Validates that a value is safe to store in game state (JSON-serializable)
-- @param value any The value to validate
-- @param keyPath string Optional. Path for error messages
-- @return boolean True if value is safe to store
local function isValueSafeForState(value, keyPath)
    local valueType = type(value)

    -- Allow primitive types
    if valueType == "number" or valueType == "string" or valueType == "boolean" or valueType == "nil" then
        return true
    end

    -- Check tables recursively
    if valueType == "table" then
        for k, v in pairs(value) do
            local kType = type(k)
            local vType = type(v)

            -- Keys must be string or number
            if kType ~= "string" and kType ~= "number" then
                print("[WARNING] State: Unsafe key type '" .. kType .. "' at " .. (keyPath or "root"))
                return false
            end

            -- Recursively check values
            if not isValueSafeForState(v, (keyPath or "root") .. "." .. tostring(k)) then
                return false
            end
        end
        return true
    end

    -- Reject userdata, functions, threads
    print("[WARNING] State: Attempted to store unsafe type '" .. valueType .. "' at " .. (keyPath or "root") .. " - value will be skipped")
    return false
end

-- ============================================================================
-- PLAYER DATA HELPERS
-- ============================================================================

--- Gets the player ID for a player object or color string
-- Looks up the player ID from C.PlayerData based on the player's color
-- @param playerRef Player|string Player object or color string
-- @return string|nil Player ID if found, nil otherwise
-- @usage local playerID = S.getPlayerID(player) or S.getPlayerID("Red")
function S.getPlayerID(playerRef)
    local playerColor = nil

    -- Extract color from playerRef
    if type(playerRef) == "userdata" then
        -- Assume it's a Player object
        playerColor = playerRef.color
    elseif type(playerRef) == "string" then
        -- Assume it's a color string
        playerColor = playerRef
    else
        return nil
    end

    if not playerColor then
        return nil
    end

    -- Search C.PlayerData for a matching color
    for playerID, playerData in pairs(C.PlayerData) do
        if playerData.color == playerColor then
            return playerID
        end
    end

    return nil
end

--- Gets complete player data (static + dynamic merged) for a player
-- @param playerRef Player|string Player object, color string, or player ID
-- @return table|nil Complete player data if found, nil otherwise
function S.getPlayerData(playerRef)
    local playerID = nil

    -- If it's already a player ID string (exists in C.PlayerData), use it directly
    if type(playerRef) == "string" and C.PlayerData[playerRef] then
        playerID = playerRef
    else
        -- Otherwise, look it up by color
        playerID = S.getPlayerID(playerRef)
    end

    if not playerID then
        return nil
    end

    -- Return the merged player data from gameState
    return gameState.playerData and gameState.playerData[playerID] or nil
end

--- Sets a dynamic player value
-- @param playerRef Player|string Player object, color string, or player ID
-- @param key string The dynamic field name (e.g., "hunger")
-- @param value any The value to set
-- @usage S.setPlayerVal(player, "hunger", 3)
function S.setPlayerVal(playerRef, key, value)
    local playerID = S.getPlayerID(playerRef)

    -- If playerRef is already a player ID, use it directly
    if not playerID and type(playerRef) == "string" and C.PlayerData[playerRef] then
        playerID = playerRef
    end

    if not playerID then
        error("S.setPlayerVal: Could not determine player ID for playerRef: " .. tostring(playerRef))
    end

    S.setStateVal(value, "playerData", playerID, key)
end

--- Gets a dynamic player value
-- @param playerRef Player|string Player object, color string, or player ID
-- @param key string The dynamic field name (e.g., "hunger")
-- @return any The value, or nil if not found
-- @usage local hunger = S.getPlayerVal(player, "hunger")
function S.getPlayerVal(playerRef, key)
    local playerID = S.getPlayerID(playerRef)

    -- If playerRef is already a player ID, use it directly
    if not playerID and type(playerRef) == "string" and C.PlayerData[playerRef] then
        playerID = playerRef
    end

    if not playerID then
        return nil
    end

    return S.getStateVal("playerData", playerID, key)
end

-- ============================================================================
-- NESTED STATE ACCESS (Advanced Get/Set)
-- ============================================================================

--- Gets a nested state value using variable arguments
-- Safely navigates through nested tables. Returns nil if path doesn't exist.
-- @param ... string|number Variable number of keys to navigate through
-- @return any The value at the end of the path, or nil
-- @usage local hunger = S.getStateVal("playerData", playerID, "hunger")
-- @usage local phase = S.getStateVal("currentPhase")
function S.getStateVal(...)
    -- Ensure gameState is initialized
    if gameState == nil then
        print("[WARNING] State: gameState is nil, initializing with defaults")
        gameState = S.GetDefaultGameState()
    end
    return getFromTable(gameState, ...)
end

--- Sets a nested state value using variable arguments
-- Creates intermediate tables automatically if needed.
-- Validates that the value is JSON-serializable before storing.
-- @param value any The value to set (must be JSON-serializable: number, string, boolean, nil, or table of same)
-- @param ... string|number Variable number of keys (last key is where value is set)
-- @usage S.setStateVal(3, "playerData", playerID, "hunger")
-- @usage S.setStateVal("Scene", "currentPhase")
function S.setStateVal(value, ...)
    -- Ensure gameState is initialized
    if gameState == nil then
        print("[WARNING] State: gameState is nil, initializing with defaults")
        gameState = S.GetDefaultGameState()
    end

    -- Validate value is safe to store (JSON-serializable)
    local keys = {...}
    local keyPath = table.concat(keys, ".")
    if not isValueSafeForState(value, keyPath) then
        print("[ERROR] State: Cannot store non-serializable value at path: " .. keyPath)
        return  -- Don't store unsafe values
    end

    setInTable(value, gameState, ...)
end

-- ============================================================================
-- PHASE MANAGEMENT
-- ============================================================================

--- Sets the current game phase
-- Validates that the phase exists in C.Phases before setting.
-- @param phase string The phase to set (should match a value in C.Phases)
-- @usage S.setCurrentPhase(C.Phases.SCENE)
function S.setCurrentPhase(phase)
    -- Validate phase exists
    local isValid = false
    for _, validPhase in pairs(C.Phases) do
        if phase == validPhase then
            isValid = true
            break
        end
    end

    if isValid then
        S.setStateVal(phase, "currentPhase")
        print("State: Game phase set to " .. phase)
    else
        U.AlertGM("Warning: Attempted to set invalid phase: " .. U.ToString(phase))
    end
end

--- Checks if the game is currently in a specific phase
-- @param phase string The phase to check
-- @return boolean True if current phase matches
-- @usage if S.isInPhase(C.Phases.COMBAT) then ... end
function S.isInPhase(phase)
    return S.getStateVal("currentPhase") == phase
end

return S

end)
__bundle_register("lib.util", function(require, _LOADED, __bundle_register, __bundle_modules)
-- lib/util.ttslua
-- Utility Functions Library
-- Extracted from Heritage/Kings Dilemma reference modules
-- This file contains general-purpose utility functions for the VTM5E Tabletop Simulator module.
--
-- NOTE: TTS built-in globals are declared in .vscode/settings.json under Lua.diagnostics.globals
-- This ensures the Lua Language Server recognizes them and doesn't show warnings.
--
-- ORGANIZATION:
-- Functions are organized into logical sections:
--   1. Math & Numeric Utilities (rounding, precision)
--   2. Object & Physics Utilities (physics casts, object detection)
--   3. Snap Point Utilities (board alignment)
--   4. String & Data Utilities (hex conversion, splitting)
--   5. Error Handling & Validation (type checking, assertions)
--   6. Table Operations (functional programming helpers: map, filter, find, etc.)
--   7. Tag Utilities (object tag checking)
--   8. UI Utilities (UI element flashing)
--   9. Debug & Logging (alerts, GM messaging)
--  10. Player & Network Utilities (host detection, UID generation)
--  11. Zone Utilities (zone bounds, containment checks)
--  12. Lighting Utilities (global lighting changes)
--  13. Animation & Interpolation (smooth object movement, rotation, scaling)
--  14. Time & Sequence Utilities (coroutine-based async operations)
--  15. Clone & Copy Utilities (table copying)
--
-- USAGE:
--   local U = require("lib.util")
--   local doubled = U.map({1,2,3}, function(x) return x*2 end)
--   U.AlertGM("Warning message")
--   U.waitUntil(function() doSomething() end, 5) -- Wait 5 seconds
--
-- IMPORTANT NOTES:
--   - Coroutine functions (U.waitUntil, U.RunSequence, U.Lerp) require startLuaCoroutine(Global, "...")
--   - In Global context, 'self' refers to Global
--   - Many functions use U.Type() for enhanced type checking (handles TTS userdata types)

local U = {}

-- ============================================================================
-- MATH & NUMERIC UTILITIES
-- ============================================================================

--- Rounds a number to 2 decimal places (pFloat = "parse to float")
-- @param num number The number to round (can be nil)
-- @return number Rounded number, or 0 if num is nil
-- @usage local pos = U.pFloat(3.14159) -- returns 3.14
function U.pFloat(num)
    if (num) then
        return math.ceil(num * 100) / 100
    else
        return 0
    end
end

--- Rounds an angle to the nearest interval (useful for snapping rotations)
-- @param num number The angle value to round
-- @param interval number The interval to round to (default: 45 degrees)
-- @return number The rounded angle
-- @usage local snapped = U.pAngle(37, 45) -- returns 45
-- @usage local snapped = U.pAngle(23, 15) -- returns 15
function U.pAngle(num, interval)
  if not interval then interval = 45 end
  return math.floor((num / interval) + 0.5) * interval
end

--- Rounds all components of a rotation vector to the nearest interval
-- @param rot Vector Rotation vector {x, y, z} or table with numeric values
-- @param interval number The interval to round each component to (default: 45 degrees)
-- @return table Table with rounded rotation components
-- @usage local snapped = U.pRotation({x=37, y=23, z=89}, 45) -- returns {x=45, y=45, z=90}
function U.pRotation(rot, interval)
	return U.map(rot, function(rVal) return U.pAngle(rVal, interval) end)
end

-- ============================================================================
-- OBJECT & PHYSICS UTILITIES
-- ============================================================================

--- Performs a physics cast upward from an object to find objects above it
-- Uses TTS Physics.cast to detect objects positioned above the given object.
-- Can use either a ray cast (default) or box cast for detection.
-- @param obj Object The object to cast from
-- @param testFunc function|Object Optional: Filter function that returns true for valid objects, or an Object to find specifically
-- @param params table Optional parameters:
--   - invert (boolean): If true, casts downward instead of upward (default: false)
--   - box (boolean): If true, uses box cast instead of ray cast (default: false)
--   - far (boolean): If true, removes distance limit for box cast (default: false)
-- @return table Array of objects found above (or below if invert=true)
-- @usage local stackedCards = U.findAboveObject(card, function(obj) return obj.type == "Card" end)
-- @usage local specificCard = U.findAboveObject(card, targetCardObj)
-- @usage local objects = U.findAboveObject(card, nil, {box=true, far=true})
function U.findAboveObject(obj, testFunc, params)
	-- params:  invert = true/false
	-- 					box = true/false (defaults to ray)
	--					far = true/false (default limits distance to 5)
	local guidTest
	if params == nil then params = {} end
	if testFunc == nil then testFunc = function() return true end end
	if U.Type(testFunc) == "userdata" then
		guidTest = testFunc.guid
		testFunc = function(testObj) return testObj.guid == guidTest end
	end

	local castParams = {}

	if params.invert == true then
		castParams.direction = {0, -1, 0}
	else
		castParams.direction = {0, 1, 0}
	end

	local objBounds = obj.getBounds()
	if params.box == true then
    objBounds.center.y = objBounds.center.y + (0.5 * objBounds.size.y) + 2.5
		if params.invert == true then
			objBounds.center.y = objBounds.center.y - 5
		end
    objBounds.size.y = 5

		castParams.type = 3
		castParams.size = objBounds.size

		if params.far ~= true then
			castParams.max_distance = 0
		end
	end

	castParams.origin = objBounds.center

	if UI.getAttribute("debugStatePanel", "active") == "True" then
		castParams.debug = true
	end

	local hitList = Physics.cast(castParams)
	if not hitList then return {} end

	return U.map(
		U.filter(hitList, function(hitData)
			return hitData ~= nil and hitData.hit_object ~= nil and hitData.hit_object.guid ~= obj.guid and testFunc(hitData.hit_object)
		end), function(hitData)
			return hitData.hit_object
		end
	)
end

--- Performs a physics cast downward from an object to find objects below it
-- Convenience wrapper around U.findAboveObject with invert=true
-- @param obj Object The object to cast from
-- @param testFunc function|Object Optional: Filter function or target object
-- @param params table Optional parameters (invert defaults to true)
-- @return table Array of objects found below
-- @usage local baseCard = U.findBelowObject(card)[1]
function U.findBelowObject(obj, testFunc, params)
	if params == nil then params = {} end
	if params.invert == nil then params.invert = true end
	return U.findAboveObject(obj, testFunc, params)
end

--- Checks if one object is positioned above another
-- @param obj Object The base object
-- @param testObj Object The object to check if it's above obj
-- @param params table Optional parameters for the physics cast
-- @return boolean True if testObj is found above obj
-- @usage if U.isObjectAbove(baseCard, topCard) then print("Card is stacked") end
function U.isObjectAbove(obj, testObj, params)
	return #U.findAboveObject(obj, testObj, params) > 0
end

--- Calculates a random position within given bounds for scattering objects
-- Useful for randomly placing tokens, cards, or other objects within a defined area.
-- @param boundsOrPosOrObj table|Vector|Object Can be:
--   - A bounds table with {center={x,y,z}, size={x,y,z}}
--   - A position Vector {x, y, z}
--   - A TTS Object (will use getBounds() or getPosition/getScale for Scripting objects)
-- @param yShift number Vertical offset to add to Y position (default: 2)
-- @param padPercentOrDiameter number Percentage to pad inward (0-1) or diameter if pos provided (default: 0)
-- @return Vector Random position within the bounds, or nil on error
-- @usage local pos = U.getScatterPosition(zone, 2, 0.1) -- Random position in zone, 2 units up, 10% padding
-- @usage local pos = U.getScatterPosition({center={0,0,0}, size={10,0,10}}, 1) -- Random in 10x10 area
function U.getScatterPosition(boundsOrPosOrObj, yShift, padPercentOrDiameter)
	if yShift == nil then yShift = 2 end
	if padPercentOrDiameter == nil then padPercentOrDiameter = 0 end
	local center, size
	if U.Type(boundsOrPosOrObj) == "userdata" then
		if boundsOrPosOrObj.type == "Scripting" then
			boundsOrPosOrObj = {
				center = boundsOrPosOrObj.getPosition(),
				size = boundsOrPosOrObj.getScale()
			}
		else
			boundsOrPosOrObj = boundsOrPosOrObj.getBounds()
		end
	end
	if U.Type(boundsOrPosOrObj) == "table" and boundsOrPosOrObj.center ~= nil and boundsOrPosOrObj.size ~= nil then
		center = Vector(boundsOrPosOrObj.center):add(Vector(0, yShift, 0))
		size = boundsOrPosOrObj.size
	elseif U.Type(boundsOrPosOrObj) == "table" and boundsOrPosOrObj.x ~= nil and boundsOrPosOrObj.y ~= nil and boundsOrPosOrObj.z ~= nil then
		center = Vector(boundsOrPosOrObj)
		size = Vector(padPercentOrDiameter * 2, 0, padPercentOrDiameter * 2)
		padPercentOrDiameter = 0
	else
		U.AlertGM("[U.scatterObjects] Error: Must provide a position, an object, or a table with 'center' and 'size'.")
		return
	end
	local spanX = size.x * (1 - padPercentOrDiameter)
	local spanZ = size.z * (1 - padPercentOrDiameter)
	local mins = Vector(
		center.x - 0.5 * spanX,
		center.y,
		center.z - 0.5 * spanZ
	)
	local maxs = Vector(
		center.x + 0.5 * spanX,
		center.y,
		center.z + 0.5 * spanZ
	)
	local scatterVector = Vector(
		U.randBetween(mins.x, maxs.x),
		center.y,
		U.randBetween(mins.z, maxs.z)
	)
	return scatterVector
end

-- Helper function for U.getSnapPoints - checks if a snap point matches coordinate filter
local function checkSnapPoint(snapPoint, axis, coordsFilter)
    if (snapPoint and snapPoint.position) then
        if (axis and coordsFilter[axis]) then
            local snapPos = math.ceil(snapPoint.position[axis] * 10) / 10
            local testPos = math.ceil(coordsFilter[axis] * 10) / 10
            return snapPos == testPos
        end
        return true
    end
    return false
end

--- Gets snap points from a board, optionally filtered by coordinates and sorted
-- Snap points are predefined positions where objects can attach to boards.
-- @param board Object The board/object to get snap points from (must have getSnapPoints method)
-- @param coordsFilter table Optional: Filter by specific coordinates, e.g. {x=0, z=5}
-- @param sortAxis string Optional: Axis to sort by ("x", "y", or "z"), sorts descending
-- @return table Array of snap point data tables
-- @usage local allPoints = U.getSnapPoints(board)
-- @usage local xZeroPoints = U.getSnapPoints(board, {x=0})
-- @usage local sorted = U.getSnapPoints(board, nil, "z") -- Sort by Z axis
function U.getSnapPoints(board, coordsFilter, sortAxis)
    local snapPoints = {}
    for _, point in ipairs(board.getSnapPoints()) do
        local isValid = true
        if (coordsFilter) then
            for i, thisAxis in ipairs({"x", "y", "z"}) do
                isValid = isValid and checkSnapPoint(point, thisAxis, coordsFilter)
            end
        end
        if (isValid) then
            table.insert(snapPoints, point)
        end
    end

    if (sortAxis) then
        table.sort(snapPoints, function(a,b) return a.position[sortAxis] > b.position[sortAxis] end)
    end

    return snapPoints
end

--- Finds the nearest snap point to a given position
-- Useful for auto-aligning objects to snap points on boards.
-- @param snapPoints table|Object Either an array of snap point data, or an object with getSnapPoints method
-- @param pos Vector|Object Position to search from, or object with getPosition method
-- @param fuzziness number Tolerance for matching (default: 0.1)
-- @return number|nil The slot index of the matching snap point, or nil if none found
-- @usage local slot = U.findSnapPoint(board.getSnapPoints(), card.getPosition())
-- @usage local slot = U.findSnapPoint(board, card, 0.2) -- Using objects directly with higher tolerance
function U.findSnapPoint(snapPoints, pos, fuzziness)
	local baseObj, snapObj
		if U.Type(snapPoints) == "userdata" and snapPoints.getSnapPoints ~= nil then
			baseObj = snapPoints
			snapPoints = U.map(baseObj.getSnapPoints(), function(snapData)
				snapData.position = baseObj.positionToWorld(snapData.position)
				return snapData
			end)
		end
		if U.Type(pos) == "userdata" and pos.getSnapPoints ~= nil then
			snapObj = pos
			pos = snapObj.getPosition()
		end
    fuzziness = fuzziness or 0.1
    for slot, snap in ipairs(snapPoints) do
        if (snap.position) then
          snap = snap.position
        end
        local xPos = U.pFloat(pos.x)
        local zPos = U.pFloat(pos.z)
        local xSnap = U.pFloat(snap.x)
        local zSnap = U.pFloat(snap.z)
        local isXOkay = false
        local isZOkay = false
        if (pos.x == nil) then
            isXOkay = true
        elseif (xPos >= (xSnap - fuzziness) and xPos <= (xSnap + fuzziness)) then
            isXOkay = true
        end
        if (pos.z == nil) then
            isZOkay = true
        elseif (zPos >= (zSnap - fuzziness) and zPos <= (zSnap + fuzziness)) then
            isZOkay = true
        end
        if (isXOkay and isZOkay) then
            return slot
        end
    end
end

-- ============================================================================
-- STRING & DATA UTILITIES
-- ============================================================================

--- Converts a Color object to hexadecimal string format
-- Useful for UI XML color attributes or saving colors as strings.
-- @param color Color The TTS Color object to convert
-- @param newAlpha number Optional: Override alpha channel (0-1)
-- @return string Hex color string (e.g., "#FF0000FF")
-- @usage local hex = U.GetHex(Color.Red) -- returns "#FF0000FF"
-- @usage local hex = U.GetHex(Color.Blue, 0.5) -- returns "#0000FF80" (half transparent)
function U.GetHex(color, newAlpha)
	U.Val("U.GetHex()", color, color ~= nil, "Color is nil!")
	if newAlpha ~= nil then
		color = Color(color):setAt("a", newAlpha)
	end
	return "#" .. color:toHex(true)
end

--- Counts the number of elements in a table (handles nil values safely)
-- Works with both array-style and dictionary-style tables.
-- @param T table The table to count
-- @return number The number of key-value pairs in the table
-- @usage local len = U.count({a=1, b=2, c=3}) -- returns 3
-- @usage local len = U.count({1, 2, 3, nil, 5}) -- counts all elements including nil keys
function U.count(T)
  local count = 0
  for _ in pairs(T) do count = count + 1 end
  return count
end

--- Splits a string into an array by a delimiter
-- Similar to string.split() in other languages. Handles edge cases like leading delimiters.
-- @param inputstr string The string to split (can be nil, returns empty table)
-- @param sep string The delimiter to split on (default: whitespace "%s")
-- @return table Array of string segments
-- @usage local parts = U.split("Red,Orange,Purple", ",") -- returns {"Red", "Orange", "Purple"}
-- @usage local words = U.split("Hello World") -- returns {"Hello", "World"} (whitespace split)
function U.split(inputstr, sep)
	if inputstr == nil then return {} end
    if sep == nil then
      sep = "%s"
    else
      inputstr = string.gsub(inputstr, sep .. " ", sep)
    end
    local t={}
		if string.match(inputstr, "^" .. sep) then
			table.insert(t, "")
		end
    for str in string.gmatch(inputstr, "([^"..sep.."]+)") do
      table.insert(t, str)
    end
    return t
end

-- ============================================================================
-- ERROR HANDLING & VALIDATION
-- ============================================================================

--- Enhanced error reporting with context and value logging
-- Logs a full traceback and formats the error message with source context and value information.
-- @param source string The name/context of where the error occurred (e.g., function name)
-- @param message string The error message
-- @param val any Optional: Value to include in error (use "NOVAL" to skip value logging)
-- @return nil Always calls error(), never returns
-- @usage U.error("setupPlayer", "Invalid player color", playerColor)
function U.error(source, message, val)
	local errString = "[" .. source .. "] " .. message
	local valString

	if val ~= "NOVAL" then
		valString = nil
	elseif U.Type(val) == "userdata" then
		if U.isIn("getName", val) then
			valString = "<" .. val.getName() .. ">"
		else
			valString = "<" .. val.guid or "unknown" .. ">"
		end
	elseif U.Type(val) == "table" then
		valString = JSON.encode_pretty(val)
	else
		valString = U.ToString(val)
	end

	log({ErrorTraceback = debug.traceback()})

	error(errString .. (valString and (": " .. valString) or ""), 3)
end

--- Validates a value and handles errors with customizable behavior
-- Checks if a validation test passes, and either throws an error or alerts the GM based on params.
-- @param source string Context/function name for error reporting
-- @param checkVal any The value to validate
-- @param testResult boolean|any If true, validation passes. If false or other, validation fails.
-- @param errorMsg string Optional: Custom error message (default: "Validation Failed")
-- @param params table Optional: {isSilent=false, isThrowing=true}
--   - isSilent: If true, doesn't display error (just returns false)
--   - isThrowing: If true, throws error; if false, just alerts GM and returns false
-- @return boolean True if validation passed, false if failed
-- @usage U.Val("setHunger", hunger, hunger >= 0 and hunger <= 5, "Hunger out of range")
-- @usage if not U.Val("func", obj, obj ~= nil, "Object required", {isSilent=true}) then return end
function U.Val(source, checkVal, testResult, errorMsg, params)
	if testResult == true then return true end
	if errorMsg == nil then errorMsg = "Validation Failed" end
	if params == nil then params = {isSilent = false, isThrowing = true} end
	if testResult ~= false then errorMsg = errorMsg .. " (Test Result = " .. U.ToString(testResult) .. ")" end

	local errorMessage = "[" .. source .. "] " .. errorMsg
	local valType; valType = U.Type(checkVal)
	local valString; valString = U.ToString(checkVal)

	if valType == "userdata" then
		if U.isGameObject(checkVal) then
			valType = checkVal.type
		elseif U.isPlayer(checkVal) then
			if checkVal.steam_id then
				valType = "Player"
			else
				valType = "INVALID Player"
			end
		end
		valString = "'" .. valString .. "'"
	elseif valType == "table" then
		if U.isArray(checkVal) then
			valType = "array"
		end
		logStyle("validate", {0.8, 0.8, 0}, "\n\n{", "}")
		log(checkVal, nil, "validate")
		valString = "'" .. valString .. "' (SEE LOG)"
	end

	errorMessage = errorMessage .. " [VAL = " .. valString .. "] (" .. valType .. ")"

	if params.isSilent then return false end

	if params.isThrowing then
		log(debug.traceback())
		error(errorMessage, 2)
	end

	U.AlertGM(errorMessage, Color(1,0,0))
	return false
end

--- Safe string conversion - returns "NIL" for nil values
-- @param val any Value to convert
-- @return string String representation, or "NIL" if nil
-- @usage local str = U.ToString(obj) -- Returns object string or "NIL"
function U.ToString(val) return val ~= nil and tostring(val) or "NIL" end

--- Enhanced type checker - returns "nil" for nil values (standard Lua returns "nil" as string)
-- @param val any Value to check type of
-- @return string Type string ("table", "number", "userdata", "nil", etc.)
-- @usage local t = U.Type(obj) -- Returns type, handles nil safely
function U.Type(val) return val ~= nil and type(val) or "nil" end

--- Type and condition assertion with detailed error reporting
-- Validates that a value matches expected type or passes a test function.
-- Supports many validation modes: type checking, custom test functions, table element validation, etc.
-- @param source string Context for error reporting
-- @param val any Value to validate
-- @param typeOrTest string|function|"check" Validation mode:
--   - "check": Validates val is true (boolean check)
--   - "string": Type name to check against ("table", "number", "Player", "Object", etc.)
--   - function: Custom test function that should return true if valid
-- @param tableType string Optional: If val is a table, validate all elements are this type
-- @param isSilent boolean Optional: If true, doesn't throw/alert, just returns false
-- @return boolean True if assertion passes, false otherwise
-- @usage U.Assert("setupPlayer", playerColor, "PlayerColor") -- Validates valid player color
-- @usage U.Assert("processList", items, "table", "number") -- Validates array of numbers
-- @usage U.Assert("checkValue", x, function(v) return v > 0 end) -- Custom validation
function U.Assert(source, val, typeOrTest, tableType, isSilent)
	local errorMessage
	if typeOrTest == nil then typeOrTest = "check" end
	if typeOrTest == "check" then
		if val ~= true then
			errorMessage = "Failed boolean check"
		end
	elseif U.Type(typeOrTest) == "function" then
		local result = typeOrTest(val)
		if result ~= true then
			if result == false or result == nil then
				errorMessage = "Test Failed for param '" .. U.ToString(val) .. "'"
			else
				errorMessage = "Test Failed - '" .. U.ToString(result) .. "'"
			end
		end
	elseif U.Type(typeOrTest) == "string" then
		if val == nil and typeOrTest ~= "nil" then
			errorMessage = "Expected " .. typeOrTest .. ", got 'nil'"
		elseif U.Type(val) == "table" and tableType ~= nil then
			U.forEach(val, function(v)
				if not U.Assert(source, v, tableType, nil, true) then
					errorMessage = "Table elements must all be type '" .. tableType .. "' -- Check log for table output"
				end
			end)
			if errorMessage ~= nil then
				logStyle("assert", {0.8, 0.8, 0}, "\n\n{", "}")
				log(val, nil, "assert")
			end
		elseif U.Type(val) == typeOrTest then return true
		elseif typeOrTest == "Player" then
			if not U.isPlayer(val) then
				errorMessage = "Not a Valid Player: TOSTRING = '" .. U.ToString(val) .. "' TYPE = (" .. U.Type(val) .. "), STEAMID = '" .. U.ToString(val.steam_id) .. "'"
			end
		elseif typeOrTest == "PlayerColor" then
			if not U.isIn(val, Player.getAvailableColors()) then
				errorMessage = "Not a Valid Player Color: '" .. U.ToString(val) .. "' (" .. U.Type(val) .. ")"
			end
		elseif typeOrTest == "Object" then
			if not U.isGameObject(val) then
				errorMessage = "Not a Valid Game Object: TOSTRING = '" .. U.ToString(val) .. "' TYPE = (" .. U.Type(val) .. "), GUID = '" .. U.ToString(val.guid) .. "'"
			end
		elseif string.match(typeOrTest, "^%u") then
			if not U.isGameObject(val) then
				errorMessage = "Not a Valid Game Object: '" .. U.ToString(val) .. "' (" .. U.Type(val) .. ")"
			elseif typeOrTest ~= val.type then
				errorMessage = "Not a Valid " .. typeOrTest .. ": '" .. U.ToString(val) .. "' (" .. U.Type(val) .. ")"
			end
		else
			errorMessage = "Not a Valid " .. typeOrTest .. ": '" .. U.ToString(val) .."' (" .. U.Type(val) .. ")"
		end
	end

	if errorMessage ~= nil then
		if not isSilent then
			U.error(source, errorMessage, val)
		end
		return false
	end

	return true
end

-- ============================================================================
-- TABLE OPERATIONS (Functional Programming Helpers)
-- ============================================================================

--- Iterates over all key-value pairs in a table (unordered)
-- Executes a function for each element. Use for side effects, not transformation.
-- @param tbl table The table to iterate over
-- @param func function Function to call for each element: func(value, key)
-- @usage U.forEach({a=1, b=2}, function(val, key) print(key .. "=" .. val) end)
-- @usage U.forEach(players, function(player) player.promoted = true end)
function U.forEach(tbl, func)
	U.Assert("U.forEach", tbl, "table")
	U.Assert("U.forEach", func, "function")
	for key, val in pairs(tbl) do
		func(val, key)
	end
end

--- Iterates over array-style table in order (ipairs - integer indices only)
-- Similar to U.forEach but preserves order for array-style tables.
-- @param tbl table The array to iterate over
-- @param func function Function to call for each element: func(value, index)
-- @usage U.iForEach({10, 20, 30}, function(val, i) print(i .. ": " .. val) end)
function U.iForEach(tbl, func)
	U.Assert("U.iForEach", tbl, "table")
	U.Assert("U.iForEach", func, "function")
	for key, val in ipairs(tbl) do
		func(val, key)
	end
end

--- Executes a sequence of functions, waiting for objects to rest between each
-- Each function should return an object or table of objects. The sequence waits until all returned objects
-- have finished spawning and come to rest before executing the next function.
-- Uses Wait.condition internally (not coroutines).
-- @param funcs table Array of functions. Each function can optionally return an object/objects to wait for.
--   Functions can also return numbers to add delay.
-- @param maxTime number Optional: Maximum time to wait for objects to rest (default: nil, no timeout)
-- @param isLoose boolean Optional: If false, errors on timeout; if true, continues anyway
-- @usage U.waitRestingSequence({
--   function() return spawnCard() end,  -- Wait for card to rest
--   function() return spawnToken() end  -- Then wait for token to rest
-- })
function U.waitRestingSequence(funcs, maxTime, isLoose)
	-- funcs is a table of functions, each of which returns an object or a table of objects
	-- U.waitRestingSequence will wait until the object is resting, before
	-- calling the next function
		-- can set a timeout optionally
		-- can pass 'false' to have function error out rather than continue on timeout

	local delay = 0.5
	local objTargets

	local function callNext()
		if #funcs == 0 then return end
		local func = table.remove(funcs, 1)
		if U.Type(func) == "function" then
			if objTargets ~= nil then
				Wait.time(function()
					Wait.condition(function()
						objTargets = func(objTargets)
						if objTargets ~= nil and U.Type(objTargets) ~= "table" then
							objTargets = {objTargets}
						end
						callNext()
					end, function()
						if objTargets ~= nil and U.Type(objTargets) ~= "table" then
							objTargets = {objTargets}
						end
						for _, objTarget in pairs(objTargets) do
							if objTarget.loading_custom == true then return false end
							if objTarget.resting ~= true then return false end
						end
						return true
					end, maxTime)
				end, delay)
				delay = 0.5
			else
				objTargets = func(objTargets)
				callNext()
			end
		elseif U.Type(func) == "number" then
			delay = delay + func
		end
	end

	callNext()
end

--- Transforms a table by applying a function to each element
-- Creates a new table where each value is the result of func(value, key).
-- Preserves table structure (array vs dictionary).
-- @param tb table The input table
-- @param func function Transform function: newValue = func(value, key)
-- @return table New table with transformed values
-- @usage local doubled = U.map({1, 2, 3}, function(x) return x * 2 end) -- {2, 4, 6}
-- @usage local guids = U.map(objects, function(obj) return obj.guid end) -- Extract GUIDs
function U.map(tb, func)
	U.Assert("U.map", tb, "table")
	U.Assert("U.map", func, "function")
  local new_table = {}
  for k,v in pairs(tb) do
    new_table[k] = func(v,k)
  end
  return new_table
end

--- Transforms an array-style table in order (preserves indices)
-- Similar to U.map but uses ipairs for ordered iteration.
-- @param tb table The input array
-- @param func function Transform function: newValue = func(value, index)
-- @return table New array with transformed values
-- @usage local indexed = U.iMap({"a", "b"}, function(v, i) return i .. ":" .. v end) -- {"1:a", "2:b"}
function U.iMap(tb, func)
	U.Assert("U.iMap", tb, "table")
	U.Assert("U.iMap", func, "function")
  local new_table = {}
  for k,v in ipairs(tb) do
    new_table[k] = func(v,k)
  end
  return new_table
end

--- Transforms both keys and values of a table
-- Applies keyFunc to keys and valFunc to values, creating a new table structure.
-- @param tb table The input table
-- @param keyFunc function Transform keys: newKey = keyFunc(oldKey, oldValue)
-- @param valFunc function Transform values: newValue = valFunc(oldValue, oldKey)
-- @return table New table with transformed keys and values
-- @usage local reversed = U.keyMap({a=1, b=2}, function(k,v) return v end, function(v,k) return k end) -- {1="a", 2="b"}
function U.keyMap(tb, keyFunc, valFunc)
	U.Assert("U.keyMap", tb, "table")
	U.Assert("U.keyMap", keyFunc, "function")
	U.Assert("U.keyMap", valFunc, "function")
	local new_table = {}
	for k,v in pairs(tb) do
		new_table[keyFunc(k, v)] = valFunc(v,k)
	end
	return new_table
end

--- Filters a table, returning only elements where func returns true
-- Preserves table structure - arrays remain arrays, dictionaries remain dictionaries.
-- @param tb table The input table
-- @param func function Predicate function: keep element if func(value, key) returns true
-- @return table New table containing only elements that passed the filter
-- @usage local evens = U.filter({1,2,3,4,5}, function(x) return x % 2 == 0 end) -- {2, 4}
-- @usage local cards = U.filter(objects, function(obj) return obj.type == "Card" end)
function U.filter(tb, func)
	U.Assert("U.filter", tb, "table")
	U.Assert("U.filter", func, "function")
  local new_table = {}
  local index = 0
  for k,v in pairs(tb) do
    index = index + 1
    if (func(v, k)) then
      if (k == index) then
        table.insert(new_table, v)
      else
        new_table[k] = v
      end
    end
  end
  return new_table
end

--- Inverts a table: swaps keys and values
-- Creates a new table where old values become keys and old keys become values.
-- Note: Only works with string/number values. Complex values are JSON-encoded.
-- @param tb table The input table
-- @return table New table with inverted key-value pairs
-- @usage local reversed = U.invert({a=1, b=2}) -- {1="a", 2="b"}
function U.invert(tb)
	local new_table = {}
	for k,v in pairs(tb) do
		if U.isIn(v, {"string", "number"}) then
			new_table[v] = k
		elseif U.isIn(v, {"boolean", "nil", "table", "function"}) then
			new_table[JSON.encode(v)] = k
		else
			new_table.user_data = k
		end
	end
	return new_table
end

--- Randomly shuffles an array in-place (Fisher-Yates shuffle)
-- Modifies the original array and returns it.
-- @param arr table The array to shuffle
-- @return table The same array (now shuffled)
-- @usage U.shuffle({1, 2, 3, 4, 5}) -- Randomizes order
-- @usage local shuffled = U.shuffle(playerOrder) -- Randomize player turn order
function U.shuffle(arr)
	for i = #arr, 2, -1 do
		local j = math.random(i)
		arr[i], arr[j] = arr[j], arr[i]
	end
	return arr
end

--- Concatenates multiple tables or values into a single array
-- Flattens array arguments and adds non-table values directly.
-- @param ... any Variable number of tables or values to concatenate
-- @return table New array containing all elements
-- @usage local combined = U.concat({1,2}, {3,4}, 5) -- {1, 2, 3, 4, 5}
function U.concat(...)
	local args = {...}
	local tb = {}
	U.forEach(args, function(arg)
		if U.Type(arg) == "table" then
			for i = 1, #arg do
        tb[#tb+1] = arg[i]
    	end
		else
			table.insert(tb, arg)
		end
	end)
	return tb
end

--- Extracts a subarray (slice) from an array
-- Similar to string.sub() but for arrays. Returns a new array containing elements from iStart to iEnd.
-- @param arr table The input array
-- @param iStart number Start index (default: 1)
-- @param iEnd number End index (default: length of array)
-- @return table New array containing the slice
-- @usage local middle = U.slice({1,2,3,4,5}, 2, 4) -- {2, 3, 4}
function U.slice(arr, iStart, iEnd)
	U.Assert("U.Slice", arr, "table")
	if iStart == nil then iStart = 1 end
	if iEnd == nil then iEnd = #arr end
	U.Assert("U.Slice - Array start must be lower than end", iStart <= iEnd)
	local newArr = {}
	for i = iStart, iEnd do
		table.insert(newArr, arr[i])
	end
	return newArr
end

--- Deep merges multiple tables into a single table
-- Recursively merges nested tables. Later arguments override earlier ones for conflicting keys.
-- @param ... table Variable number of tables to merge
-- @return table New table containing merged values
-- @usage local merged = U.merge({a=1, b={x=1}}, {b={y=2}, c=3}) -- {a=1, b={x=1,y=2}, c=3}
function U.merge(...)
	local args = {...}
	U.Assert("U.merge", args[1], "table")
	local newTable = U.clone(U.shift(args))
	U.iForEach(args, function(nextTable)
		U.Assert("U.merge", nextTable, "table")
		nextTable = U.clone(nextTable)
		U.forEach(nextTable, function(val, key)
			if U.Type(val) == "table" then
				if U.Type(newTable[key]) == "table" then
					newTable[key] = U.merge(newTable[key], val)
				else
					newTable[key] = U.clone(val)
				end
			else
				newTable[key] = val
			end
		end)
	end)
	return newTable
end

--- Joins array values into a string with a delimiter
-- @param tb table Array to join
-- @param delim string Delimiter string (default: "|")
-- @return string Joined string
-- @usage local str = U.join({"a", "b", "c"}, ",") -- "a,b,c"
function U.join(tb, delim)
	if delim == nil then delim = "|" end
	local returnString = ""
	for _, val in ipairs(tb) do
		returnString = returnString .. delim .. val
	end
	return string.gsub(returnString, "^%s*" .. delim, "")
end

--- Removes and returns the last element of an array (stack pop)
-- @param arr table The array
-- @return any The removed element, or nil if array is empty
-- @usage local last = U.pop(myStack)
function U.pop(arr)
	if U.Type(arr) ~= "table" or #arr == 0 then return nil end
	return table.remove(arr)
end

--- Adds an element to the end of an array (stack push)
-- @param elem any Element to add
-- @param arr table The array
-- @usage U.push(newItem, myStack)
function U.push(elem, arr) table.insert(arr, elem) end

--- Removes and returns the first element of an array (queue dequeue)
-- @param arr table The array
-- @return any The removed element, or nil if array is empty
-- @usage local first = U.shift(myQueue)
function U.shift(arr)
	if U.Type(arr) ~= "table" or #arr == 0 then return nil end
	return table.remove(arr, 1)
end

--- Adds an element to the beginning of an array (queue enqueue)
-- @param elem any Element to add
-- @param arr table The array
-- @usage U.unshift(newItem, myQueue)
function U.unshift(elem, arr) table.insert(arr, 1, elem) end

--- Finds, removes, and returns an element from an array matching a predicate
-- @param arr table The array
-- @param func function Predicate function: func(value, index) -> boolean
-- @return any The removed element, or nil if not found
-- @usage local item = U.pluck(items, function(v) return v.id == targetId end)
function U.pluck(arr, func)
	local index = U.findIndex(arr, func)
	return table.remove(arr, index)
end

--- Flattens a nested table structure into a single-level array
-- Recursively extracts all non-table values from nested tables.
-- @param tb table Nested table structure
-- @return table Flat array containing all values
-- @usage local flat = U.flatten({{1,2}, {3, {4,5}}}) -- {1, 2, 3, 4, 5}
function U.flatten(tb)
	local newTable = {}
	for _, val in pairs(tb) do
		if U.Type(val) == "table" then
			newTable = U.concat(newTable, U.flatten(val))
		else
			table.insert(newTable, val)
		end
	end
	return newTable
end

--- Finds the first element in a table matching a predicate
-- @param tb table The table to search
-- @param func function Predicate function: func(value, key) -> boolean
-- @return any The first matching element, or nil if none found
-- @usage local card = U.find(cards, function(c) return c.guid == targetGuid end)
-- @usage local player = U.find(players, function(p) return p.color == "Red" end)
function U.find(tb, func)
	U.Assert("U.find", tb, "table")
	U.Assert("U.find", func, "function")
  for k,v in pairs(tb) do
    if (func(v,k)) then return v end
  end
  return nil
end

--- Sums all numeric values in a table
-- Extracts all values and sums them. Ignores non-numeric values.
-- @param tb table The table containing numeric values
-- @return number The sum of all numeric values
-- @usage local total = U.sumVals({a=10, b=20, c=30}) -- 60
function U.sumVals(tb)
	local total = 0
	U.forEach(U.getValues(tb), function(v) total = total + v end)
	return total
end

--- Finds the key/index of the first element matching a predicate
-- @param tb table The table to search
-- @param func function Predicate function: func(value, key) -> boolean
-- @return any The key/index of the first matching element, or nil
-- @usage local index = U.findIndex({10, 20, 30}, function(v) return v == 20 end) -- 2
function U.findIndex(tb, func)
	U.Assert("U.findIndex", tb, "table")
	U.Assert("U.findIndex", func, "function")
  for k,v in pairs(tb) do
    if (func(v,k)) then return k end
  end
	return nil
end

--- Removes nil and false values from a table
-- Creates a new table without nil or false values. Preserves table structure.
-- @param tb table The input table
-- @return table New table with nil/false values removed
-- @usage local cleaned = U.compact({1, nil, 2, false, 3}) -- {1, 2, 3}
function U.compact(tb)
	U.Assert("U.compact", tb, "table")
	local new_table = {}
	for k, v in pairs(tb) do
		if v ~= nil and v ~= false then
			if U.isArray(tb) then
				table.insert(new_table, v)
			else
				new_table[k] = v
			end
		end
	end
	return new_table
end

--- Reverses the order of an array
-- @param tb table The input array
-- @return table New array with elements in reverse order
-- @usage local reversed = U.reverse({1, 2, 3}) -- {3, 2, 1}
function U.reverse(tb)
    local rev = {}
    for i = #tb, 1, -1 do
    	rev[#rev+1] = tb[i]
    end
    return rev
end

--- Checks if an element exists in a table (as a value) or as a key
-- First checks if elem is a value in the table, then checks if it's a key.
-- @param elem any The element to search for
-- @param tb table|userdata The table to search in (can be TTS object for property check)
-- @return boolean True if element is found as value or key
-- @usage if U.isIn("Red", playerColors) then print("Red player found") end
-- @usage if U.isIn(guid, objectTable) then print("Object tracked") end
function U.isIn(elem, tb)
	U.Assert("U.isIn", U.Type(tb) == "table" or U.Type(tb) == "userdata")

	if U.Type(tb) == "table" then
		-- check values first, before checking keys
		for _, value in pairs(tb) do
			if value == elem then
				return true
			end
		end
	end

	-- check key
	local function hasProperty(object, prop)
			local t = object[prop]
			if t == nil then error("Bad Property") end
	end
	if pcall(function() hasProperty(tb, elem) end) then
		return true
	end

	return false
end

--- Checks if a value is a valid TTS game object
-- Validates that the value is userdata, has a guid, and is not a Player.
-- @param val any Value to check
-- @return boolean True if value is a TTS game object
-- @usage if U.isGameObject(obj) then obj.setPosition(Vector(0,0,0)) end
function U.isGameObject(val)
	return val
		and U.Type(val) == "userdata"
		and U.ToString(val) ~= "LuaPlayer"
		and val.guid ~= nil
end

--- Checks if a value is a valid TTS Player object
-- Validates that the value is userdata representing a Player with a steam_id.
-- @param val any Value to check
-- @return boolean True if value is a TTS Player
-- @usage if U.isPlayer(player) then player.promoted = true end
function U.isPlayer(val)
	return val
		and U.Type(val) == "userdata"
		and U.ToString(val) == "LuaPlayer"
		and val.steam_id ~= nil
end

--- Checks if a value is an instance of a given type (metatable check)
-- Traverses the metatable chain to check for type inheritance.
-- @param val any Value to check
-- @param super string|any The supertype to check for
-- @return boolean True if val is an instance of super
-- @usage if U.isInstance(vec, Vector) then print("It's a vector!") end
function U.isInstance(val, super)
	super = U.ToString(super)
	local mt = getmetatable(val)
	while true do
		if mt == nil then return false end
		if U.ToString(mt) == super then return true end
		mt = getmetatable(mt)
	end
end

--- Checks if a table is array-like (sequential integer indices starting at 1)
-- Returns false if table has non-sequential keys (even if length > 0).
-- @param val any Value to check
-- @return boolean True if table is array-like
-- @usage if U.isArray(myTable) then U.iForEach(myTable, func) end
function U.isArray(val)
	if U.Type(val) ~= "table" then return false end
	if #val == 0 and #U.getKeys(val) > 0 then return false end
	return true
end

--- Checks if an object is flipped (rotated 180 degrees on Z axis)
-- @param obj Object The TTS object to check
-- @return boolean True if object's Z rotation is approximately 180 degrees
-- @usage if U.isFlipped(card) then card.setRotation(Vector(0,0,0)) end
function U.isFlipped(obj)
  local zRot = U.pAngle(obj.getRotation().z, 90)
  return zRot == 180
end

-- ============================================================================
-- UI UTILITIES
-- ============================================================================

--- Temporarily shows a UI element then hides it (flash/splash effect)
-- Useful for drawing attention to UI elements or showing temporary notifications.
-- @param elemID string The UI element ID to show/hide
-- @param duration number How long to show the element in seconds (default: 5)
-- @param delay number Optional delay before showing (default: 0)
-- @usage U.splashUIElement("notificationPanel", 3) -- Show for 3 seconds
function U.splashUIElement(elemID, duration, delay)
  if (duration == nil) then duration = 5 end
  if (delay == nil or delay == 0) then
    UI.show(elemID)
    Wait.time(function() UI.hide(elemID) end, duration)
  else
    Wait.time(function() U.splashUIElement(elemID, duration, 0) end, delay)
  end
end

-- ============================================================================
-- DEBUG & LOGGING UTILITIES
-- ============================================================================

--- Alerts the game master (host) with a message
-- Sends a message only to the host player using broadcastToColor.
-- @param message string The message to send
-- @param color Color Optional: Message color (default: Yellow)
-- @usage U.AlertGM("Warning: Invalid state detected!")
function U.AlertGM(message, color)
	if color == nil then color = Color(1, 1, 0) end
	broadcastToColor(message, U.getHost().color, color)
end

--- Alerts all players with a message
-- Broadcasts a message to all connected players.
-- @param message string The message to send
-- @param color Color Optional: Message color (default: White)
-- @usage U.Alert("Game starting in 10 seconds!")
function U.Alert(message, color)
	if color == nil then color = Color(1, 1, 1) end
	broadcastToAll(message, color)
end

-- ============================================================================
-- TAG UTILITIES
-- ============================================================================

--- Checks if an object has any of the specified tags
-- @param obj Object The TTS object to check
-- @param tags table Array of tag strings to check for
-- @return boolean True if object has at least one of the tags
-- @usage if U.hasAnyTag(card, {"Card", "Deck"}) then print("Is a card or deck") end
function U.hasAnyTag(obj, tags)
	for _, tag in pairs(tags) do
		if obj.hasTag(tag) then return true end
	end
	return false
end

--- Finds the first tag from a list that the object has
-- @param obj Object The TTS object to check
-- @param tagList table Array of tag strings to check
-- @return string|boolean The first matching tag, or false if none found
-- @usage local typeTag = U.findTag(obj, {"Card", "Token", "Die"})
function U.findTag(obj, tagList)
	for _, tag in pairs(tagList) do
		if obj.hasTag(tag) then return tag end
	end
	return false
end

--- Finds which player color tag an object has
-- Checks if object has any tag matching a valid TTS player color.
-- @param obj Object The TTS object to check
-- @return string|nil The player color tag found, or nil if none
-- @usage local owner = U.findColorTag(card) -- Returns "Red", "Brown", "Orange", "Pink", "Purple", or "Black" (Storyteller)
function U.findColorTag(obj)
	U.Assert("U.findColorTag", obj, "userdata")
	U.Assert("U.findColorTag", obj.hasTag, "function")
	return U.find(Player.getAvailableColors(), function(color) return obj.hasTag(color) end)
end

local UIDS = {}
function U.getUID(length)
	if length == nil then length = 10 end
  local chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  local uid = ""
	while string.len(uid) < length do
		local randomNumber = math.random(1, #chars)
    uid = uid .. string.sub(chars, randomNumber, randomNumber)
  end
	if U.isIn(uid, UIDS) then
		return U.getUID()
	else
		table.insert(UIDS, uid)
		return uid
	end
end

function U.getHost()
	local hosts = U.filter(Player.getPlayers(), function(player) return player.host end)
	if #hosts == 1 then return hosts[1] end
	-- If there are multiple hosts, this is a hotseat game being debugged: Player.Brown is the assumed host.
	return Player.Brown
end

function U.getZoneBounds(zone)
	local zoneExtent = U.map(zone.getScale(), function(val) return 0.5 * val end)
	local zonePos = zone.getPosition()
	return U.map(zonePos, function(coord, axis) return {min = coord - zoneExtent[axis], max = coord + zoneExtent[axis]} end)
end

function U.isInside(zone, pos, ignoreY)
	if ignoreY == nil then ignoreY = true end
	local zoneBounds = U.getZoneBounds(zone)
	return pos.x >= zoneBounds.x.min and pos.x <= zoneBounds.x.max
		and (ignoreY or pos.y >= zoneBounds.y.min and pos.y <= zoneBounds.y.max)
		and pos.z >= zoneBounds.z.min and pos.z <= zoneBounds.z.max
end

function U.parsePosition(obj)
	local posVals, rotVals
	if U.Type(obj) ~= "userdata" then return end
	local desc = obj.getDescription()
	if U.Type(desc) ~= "string" or string.find(desc, "^{%d+.%d+, %d+.%d+, %d+.%d+}") == nil then return end
	local posRotSplit = U.split(desc, "|")
	local posString, rotString = posRotSplit[1], posRotSplit[2]
	if U.Type(posString) == "string" then
		posString = string.gsub(string.sub(posString, 2, #posString - 1), " ", "")
		posVals = U.map(U.split(posString, ","), function(strVal) return 1 * strVal end)
		if #posVals == 3 then
			posVals = {x = posVals[1], y = posVals[2], z = posVals[3]}
		end
	end
	if U.Type(rotString) == "string" then
		rotString = string.gsub(string.sub(rotString, 2, #rotString - 1), " ", "")
		rotVals = U.map(U.split(rotString, ","), function(strVal) return 1 * strVal end)
		if #rotVals == 3 then
			rotVals = {x = rotVals[1], y = rotVals[2], z = rotVals[3]}
		end
	end
	return posVals, rotVals
end

function U.getHandZone(color)
	return U.find(Hands.getHands(), function(hZone) return hZone.getData().FogColor == color end)
end

--- Rounds a number to a specified number of significant digits
-- @param num number The number to round
-- @param sigDigits number Number of decimal places (default: 1)
-- @return number Rounded number
-- @usage local rounded = U.round(3.14159, 2) -- 3.14
function U.round(num, sigDigits)
  if (sigDigits == nil) then sigDigits = 1 end
  local roundMult = 10 ^ sigDigits
	return (math.floor(num * roundMult + 0.5)) / roundMult
end

--- Rounds all numeric values in a table
-- @param tb table The table containing numeric values
-- @param sigDigits number Number of decimal places for rounding
-- @return table New table with rounded values
-- @usage local cleaned = U.roundTableVals({x=3.141, y=2.718}, 2) -- {x=3.14, y=2.72}
function U.roundTableVals(tb, sigDigits)
  local newTable = {}
  for key, val in pairs(tb) do
    newTable[key] = U.round(val, sigDigits)
  end
  return newTable
end

--- Wraps a value within a range (cycles around min/max)
-- If value exceeds max, wraps to min. If below min, wraps to max.
-- @param val number The value to wrap
-- @param min number Minimum value
-- @param max number Maximum value
-- @return number Wrapped value within range
-- @usage local wrapped = U.cycle(11, 0, 10) -- 1
-- @usage local wrapped = U.cycle(-1, 0, 10) -- 10
function U.cycle(val, min, max)
	local cycleRange = max - min
	while val > max do
		val = val - cycleRange
	end
	while val < min do
		val = val + cycleRange
	end
	return val
end

--- Extracts all values from a table into an array
-- @param tb table The input table
-- @return table Array containing all values (keys are lost)
-- @usage local values = U.getValues({a=1, b=2, c=3}) -- {1, 2, 3} (order may vary)
function U.getValues(tb)
	local values = {}
	for _, val in pairs(tb) do
		-- log({key = key, val = val})
		table.insert(values, val)
	end
	return values
end

--- Extracts all keys from a table into an array
-- @param tb table The input table
-- @return table Array containing all keys
-- @usage local keys = U.getKeys({a=1, b=2, c=3}) -- {"a", "b", "c"} (order may vary)
function U.getKeys(tb)
	local keys = {}
	for key in pairs(tb) do
		table.insert(keys, key)
	end
	return keys
end

-- ============================================================================
-- LIGHTING UTILITIES
-- ============================================================================

--- Changes global lighting with a delay
-- Applies lighting changes and calls Lighting.apply after a delay.
-- Parameters starting with "set" are treated as function calls (e.g., setLightColor).
-- @param params table Table of lighting properties to change, e.g. {ambient_intensity=1.0, light_intensity=0.8}
-- @return nil
-- @usage U.changeLighting({ambient_intensity=0.5, light_intensity=0.3})
function U.changeLighting(params)
	if params == nil then return nil end

	U.sequence({
		function()
			for param, val in pairs(params) do
				-- log("CHANGING " .. param .. " to " .. val)
				if string.match(param, "^set") then
					Lighting[param](val)
				else
					Lighting[param] = val
				end
			end
		end,
		Lighting.apply
	}, 0.5)
end

-- ============================================================================
-- ANIMATION & INTERPOLATION UTILITIES
-- ============================================================================

--- Smoothly animates an object's rotation over time
-- Uses U.Lerp internally to interpolate rotation values. Handles rotation wrapping (shortest path).
-- @param obj Object The object to rotate
-- @param rotation Vector Target rotation {x, y, z}
-- @param duration number Animation duration in seconds (default: 0.5)
-- @param easing string Optional easing mode: "speedUp" for acceleration, nil for linear
-- @param isColliding boolean Whether object should collide during movement (default: false)
-- @return number The duration (for chaining)
-- @usage U.setRotationSlow(card, Vector(0,0,180), 1.0) -- Rotate card over 1 second
function U.setRotationSlow(obj, rotation, duration, easing, isColliding)
	if duration == nil then duration = 0.5 end
	if isColliding == nil then isColliding = false end
	return U.Lerp(function(rotation) obj.setRotationSmooth(rotation, isColliding, false) end, obj.getRotation(), rotation, duration, true, easing)
end

--- Smoothly animates an object's position over time
-- Uses U.Lerp internally to interpolate position values.
-- @param obj Object The object to move
-- @param position Vector Target position {x, y, z}
-- @param duration number Animation duration in seconds (default: 0.5)
-- @param easing string Optional easing mode: "speedUp" for acceleration, nil for linear
-- @param isColliding boolean Whether object should collide during movement (default: false)
-- @return number The duration (for chaining)
-- @usage U.setPositionSlow(token, Vector(10, 2, 5), 2.0) -- Move token over 2 seconds
function U.setPositionSlow(obj, position, duration, easing, isColliding)
	if duration == nil then duration = 0.5 end
	if isColliding == nil then isColliding = false end
	return U.Lerp(function(pos) obj.setPositionSmooth(pos, isColliding, false) end, obj.getPosition(), position, duration, false, easing)
end

--- Smoothly animates an object's scale over time
-- Uses U.Lerp internally to interpolate scale values.
-- @param obj Object The object to scale
-- @param scale Vector Target scale {x, y, z}
-- @param duration number Animation duration in seconds (default: 0.5)
-- @param easing string Optional easing mode: "speedUp" for acceleration, nil for linear
-- @return number The duration (for chaining)
-- @usage U.setScaleSlow(object, Vector(2, 2, 2), 1.0) -- Double size over 1 second
function U.setScaleSlow(obj, scale, duration, easing)
	if duration == nil then duration = 0.5 end
	return U.Lerp(function(sc) obj.setScale(sc) end, obj.getScale(), scale, duration, false, easing)
end

-- ============================================================================
-- TIME & SEQUENCE UTILITIES (COROUTINE-BASED)
-- ============================================================================

--- Delays execution of a function until a condition is met (coroutine-based)
--
-- This is a powerful coroutine-based utility that waits until a condition is satisfied, then executes
-- a function. Supports multiple test types and can wait for objects, time delays, custom conditions, or
-- combinations thereof. Uses startLuaCoroutine internally, so must be called from Global context.
--
-- The testRef parameter determines what condition to wait for:
--   - function: Custom test function that must return true when condition is met
--   - number: Wait this many seconds before executing (0 = immediately)
--   - GameObject: Wait until object has finished spawning AND is at rest
--   - nil: Wait default 0.5 seconds
--   - table: Array of any above types - waits until ALL conditions are met (AND logic)
--
-- @param afterFunc function The function to execute when condition is met
-- @param testRef function|number|Object|table|nil Condition to wait for (see description above)
-- @param isForcing boolean Optional: If true, executes afterFunc even if timeout (default: false)
-- @param maxWait number Optional: Max frames to wait before timeout (default: 1000)
-- @param testFrequency number Optional: Frames between condition checks (default: 15)
-- @return function Returns a function that returns true when afterFunc has completed
--
-- @usage U.waitUntil(function() print("Done!") end, 5) -- Wait 5 seconds
-- @usage U.waitUntil(function() moveCard() end, cardObj) -- Wait for card to rest
-- @usage U.waitUntil(func, function() return condition == true end) -- Custom condition
-- @usage U.waitUntil(func, {cardObj, 2, customTest}) -- Wait for all conditions
--
-- NOTE: Requires startLuaCoroutine(Global, "CheckCoroutine") - self refers to Global in Global context
function U.waitUntil(afterFunc, testRef, isForcing, maxWait, testFrequency)
	if afterFunc == nil then return end
	if isForcing == nil then isForcing = false end
	if maxWait == nil then maxWait = 1000 end
	if testFrequency == nil then testFrequency = 15 end

	local frameCount = 0
	local hasWaited = false

	-- parseCheckFunc(testRef): Converts testRef into a test function (recursively, if testRef is a table)
	local function parseCheckFunc(tRef)
		if tRef == nil then tRef = 0.5 end
		if U.Type(tRef) == "function" then return tRef
		elseif U.Type(tRef) == "number" then
			testFrequency = math.max(1, math.min(testFrequency, tRef * 10))
			return function() return frameCount >= (tRef * 30) end
		elseif U.isGameObject(tRef) then
			return function() return tRef and tRef.resting and not tRef.loading_custom end
		elseif U.Type(tRef) == "table" then
			local checkFuncs = U.map(tRef, function(tr) return parseCheckFunc(tr) end)
			return function()
				checkFuncs = U.filter(checkFuncs, function(cf) return cf() == false end)
				return #checkFuncs == 0
			end
		end
	end

	local pCheckFunc = parseCheckFunc(testRef)

	local afterReturnVal

	function CheckCoroutine()
		if pCheckFunc ~= nil then
			while not pCheckFunc() do
				local waitFrames = testFrequency
				frameCount = frameCount + waitFrames
				if frameCount > maxWait and not hasWaited then
					log(debug.traceback())
					hasWaited = true
					if isForcing then
						U.AlertGM("Coroutine Timeout: Forcing ResultFunc")
						break
					end
					U.AlertGM("Coroutine Still Waiting! (See Log Traceback)")
				end

				while waitFrames > 0 do
					coroutine.yield(0)
					waitFrames = waitFrames - 1
				end
			end
		end

		if afterFunc ~= nil then
			afterReturnVal = afterFunc()
		end

		return 1
	end

	startLuaCoroutine(self, "CheckCoroutine")

	return function() return afterReturnVal ~= nil end
end

--- Executes a sequence of functions sequentially with conditional delays (coroutine-based)
--
-- Runs functions one after another, where each function's return value determines when the next executes.
-- The return value is used as testRef for U.waitUntil, so you can return:
--   - A number (seconds to wait)
--   - An object (wait until it rests)
--   - A function (wait until it returns true)
--   - A table (wait until all conditions met)
--   - nil (default 0.5s delay)
--
-- This enables complex multi-step sequences like scene transitions: fade lights -> wait -> display text -> wait -> play sound.
--
-- @param funcs table Array of functions to execute sequentially
-- @param maxWait number Optional: Maximum wait time per step (default: uses U.waitUntil default)
-- @param frequency number Optional: Test frequency per step (default: uses U.waitUntil default)
-- @return function Returns a function that returns true when sequence is complete
--
-- @usage U.RunSequence({
--   function() fadeLights() return 1 end,  -- Wait 1 second after fading
--   function() showText() return cardObj end,  -- Wait for card to rest after showing
--   function() playSound() end  -- Default delay, then complete
-- })
--
-- NOTE: Uses U.waitUntil internally, requires coroutine support in Global context
function U.RunSequence(funcs, maxWait, frequency)
	U.Assert("U.RunSequence", funcs, "table", "function")

	local isDone = false

	local function runNextFunc(lastFuncReturnTest)
		local thisFunc = U.shift(funcs)
		U.waitUntil(function()
			if thisFunc == nil then
				isDone = true
				return
			end
			runNextFunc(thisFunc())
		end, lastFuncReturnTest, false, maxWait, frequency)
	end

	local func = U.shift(funcs)
	if func == nil then
		isDone = true
	else
		runNextFunc(func())
	end
	return function() return isDone == true end
end

--- Executes a sequence of functions with fixed time delays (using Wait.time)
--
-- Simpler alternative to U.RunSequence that uses fixed delays between function calls.
-- Each function is scheduled with Wait.time. Functions can be numbers to add extra delay.
--
-- @param funcs table Array of functions (and optional numbers for extra delay)
-- @param timeDelay number Fixed delay in seconds between functions (default: 0.5)
-- @return number Total delay time accumulated
--
-- @usage U.sequence({
--   function() showUI() end,
--   2,  -- Extra 2 second pause
--   function() hideUI() end
-- }, 1.0)  -- 1 second between each
function U.sequence(funcs, timeDelay)
	timeDelay = timeDelay or 0.5 -- Set default value if none provided
	local delay = 0 -- Initialize delay to 0
	for i, func in ipairs(funcs) do
			if U.Type(func) == "function" then
				if delay == 0 then
					func()
				else
					Wait.time(function()
							func()
					end, delay)
				end
				delay = delay + timeDelay -- Increment delay by timeDelay
			elseif U.Type(func) == "number" then
				delay = delay + func + timeDelay -- Increment delay by func + timeDelay
			else
				error("Invalid element in funcs table")
			end
	end
	return delay
end

--- Rounds all components of a Vector to specified precision
-- @param vec Vector The vector to round
-- @param sigDigits number Number of decimal places (default: 2)
-- @return Vector New vector with rounded components
-- @usage local rounded = U.roundVector(Vector(3.141, 2.718, 1.414), 2) -- Vector(3.14, 2.72, 1.41)
function U.roundVector(vec, sigDigits)
	if sigDigits == nil then sigDigits = 2 end
	return Vector(
		U.round(vec[1], sigDigits),
		U.round(vec[2], sigDigits),
		U.round(vec[3], sigDigits)
	)
end

--- Interpolates a value over time using linear interpolation (coroutine-based)
--
-- Smoothly transitions a value from start to end over a duration by repeatedly calling a setter function.
-- Supports numbers, Vectors, and Colors. For rotations, automatically handles shortest path (wraps 360°).
--
-- Uses coroutines internally, so must be called from a context that supports startLuaCoroutine.
-- In Global context, use: startLuaCoroutine(Global, "LerpCoroutine")
--
-- Can be used in U.RunSequence by returning it from a function, or by returning a table of lerp
-- functions for parallel animation of multiple properties.
--
-- @param setFunc function Setter function that receives the interpolated value: setFunc(currentValue)
-- @param paramStart number|Vector|Color Starting value
-- @param paramEnd number|Vector|Color Ending value
-- @param duration number Duration in seconds (default: 0.5)
-- @param isRotationLerp boolean If true, handles rotation wrapping (shortest path around 360°)
-- @param easing string Optional: "speedUp" for acceleration, nil for linear
-- @return number The duration (for chaining)
--
-- @usage U.Lerp(function(v) obj.setPositionSmooth(v) end, startPos, endPos, 1.0)
-- @usage U.Lerp(function(r) light.setRotation(r) end, startRot, endRot, 0.5, true) -- Rotation lerp
-- @usage local lerps = {U.Lerp(setX, 0, 10, 1), U.Lerp(setY, 0, 20, 1)} -- Parallel animation
--
-- NOTE: Requires startLuaCoroutine(Global, "LerpCoroutine") - self refers to Global in Global context
function U.Lerp(setFunc, paramStart, paramEnd, duration, isRotationLerp, easing)
	if duration == nil then duration = 0.5 end
	if U.isInstance(paramStart, Vector) or U.isInstance(paramStart, Color) then
		if paramStart:equals(paramEnd) then return 0 end
	elseif U.Type(paramStart) == "number" then
		if paramStart == paramEnd then return 0 end
	end

	if isRotationLerp then
		local function parseAngleLerp(start, finish)
			-- 350 -> 10,  -10 -> 350
			if math.abs(finish - start) > math.abs(finish + 360 - start) then
				finish = finish + 360
			end
			if math.abs(finish - start) > math.abs(finish - 360 - start) then
				finish = finish - 360
			end
			return finish
		end
		paramEnd = Vector(
			parseAngleLerp(paramStart.x, paramEnd.x),
			parseAngleLerp(paramStart.y, paramEnd.y),
			parseAngleLerp(paramStart.z, paramEnd.z)
		)
	end

	local function getParam(t)
		if t == 1 then return paramEnd end
		if easing ~= nil then
			if easing == "speedUp" then
				t = t * t
			end
		end
		if U.isInstance(paramStart, Vector) or U.isInstance(paramStart, Color) then
			return paramStart:lerp(paramEnd, t)
		elseif U.Type(paramStart) == "number" then
			local deltaVal = paramEnd - paramStart
			return paramStart + (deltaVal * t)
		end
	end

	local startTime = os.time()

	function LerpCoroutine()
		local timeFrac = (os.time() - startTime)/duration
		while timeFrac < 1 do
			setFunc(getParam(timeFrac))
			coroutine.yield(0)
			timeFrac = (os.time() - startTime) / duration
		end
		setFunc(getParam(1))
		return 1
	end

	startLuaCoroutine(self, "LerpCoroutine")

	return duration
end

--- Generates a random number between min and max
-- @param min number Minimum value (inclusive)
-- @param max number Maximum value (inclusive)
-- @param isInt boolean Optional: If true, returns integer; if false/nil, returns float
-- @return number|nil Random number in range, or nil if invalid input
-- @usage local roll = U.randBetween(1, 10, true) -- Random integer 1-10
-- @usage local pos = U.randBetween(0.0, 1.0) -- Random float 0.0-1.0
function U.randBetween(min, max, isInt)
	if U.Type(min) ~= "number" or U.Type(max) ~= "number" then return end
	if min > max then return end
	if isInt == true then
		return U.round(min + math.random() * (max - min), 0)
	end
	return min + math.random() * (max - min)
end

-- ============================================================================
-- CLONE & COPY UTILITIES
-- ============================================================================

--- Creates a shallow copy of a table
-- Note: This is currently a shallow copy (nested tables are not deeply cloned).
-- The isDeepCloning parameter exists for future implementation but is not yet used.
-- For deep copying nested structures, use U.merge with empty table.
-- @param t table The table to clone
-- @param isDeepCloning boolean Currently unused (placeholder for future deep copy)
-- @return table New table with copied values (shallow copy)
-- @usage local copy = U.clone(originalTable)
-- @usage local deepCopy = U.merge({}, originalTable) -- Deep copy using merge
function U.clone(t, isDeepCloning)
	if U.Type(t) ~= "table" then return t end
  local t2 = {}
  for k,v in pairs(t) do
    t2[k] = v
  end
  return t2
end

return U

end)
__bundle_register("core.scenes", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Scene Preset System Module (core/scenes.ttslua)

    Manages scene presets for immersive VTM5E gameplay. Each scene preset defines:
    - Ambient lighting (global table lighting)
    - Individual light object modes (spotlights, etc.)
    - Optional background music
    - Scene-specific atmosphere settings

    Scene transitions can be instant or smooth (with fade/duration).

    Pattern: Combines lighting module patterns with ambient lighting control.
    Integration: Uses L.SetLightMode for individual lights, Lighting API for ambient.
]]

local Scenes = {}
local U = require("lib.util")
local S = require("core.state")
local C = require("lib.constants")
local L = require("core.lighting")

-- ============================================================================
-- CONFIGURATION
-- ============================================================================

-- Default transition time for scene changes (in seconds)
local DefaultTransitionTime = 2.0

-- ============================================================================
-- SCENE PRESET DEFINITIONS
-- ============================================================================

--- Scene Preset Structure
--
-- Each scene preset contains:
--   ambient: Table with ambient lighting settings (see TTS Lighting API)
--     - ambient_intensity (number): 0-4, brightness of ambient light
--     - ambient_type (number): 1 or 2, type of ambient lighting
--     - light_intensity (number): 0-4, brightness of directional light
--     - lut_contribution (number): 0-1, color grading lookup table contribution
--     - lut_index (number): 1-114, which LUT preset to use
--     - reflection_intensity (number): 0-1, surface reflection intensity
--   lights: Table of {name, mode} pairs for individual light objects
--     - name (string): Light name/tag matching L.LIGHTMODES key
--     - mode (string): Light mode name (e.g., "ambient", "bright", "dim")
--   musicTrack (number, optional): Music track index (1-10, if tracks are configured)
--   description (string, optional): Human-readable scene description

Scenes.SCENES = {
    -- Default/neutral scene (uses DARK mode)
    default = {
        ambient = C.LightModes.DARK,
        lights = {},
        description = "Default dark lighting"
    },

    -- Elysium: Formal gathering place, elegant and refined
    elysium = {
        ambient = {
            ambient_intensity = 1.2,
            ambient_type = 1,
            light_intensity = 1.0,
            lut_contribution = 0.3,
            lut_index = 108, -- Warm/amber tone
            reflection_intensity = 0.3
        },
        lights = {
            {name = "mainLight", mode = "bright"},
            -- TODO: Add chandelier light if available: {name = "chandelier", mode = "elegant"}
        },
        description = "Elysium - Formal gathering place, elegant and refined"
    },

    -- Alley: Dark, gritty urban setting
    alley = {
        ambient = {
            ambient_intensity = 0.15,
            ambient_type = 2,
            light_intensity = 0.2,
            lut_contribution = 0.8,
            lut_index = 36, -- Dark/blue tone
            reflection_intensity = 0.0
        },
        lights = {
            {name = "mainLight", mode = "dim"},
            -- TODO: Add streetlamp light if available: {name = "streetlamp", mode = "dim"}
        },
        description = "Alley - Dark, gritty urban setting"
    },

    -- Haven: Personal sanctuary, comfortable and safe
    haven = {
        ambient = {
            ambient_intensity = 0.8,
            ambient_type = 1,
            light_intensity = 0.7,
            lut_contribution = 0.2,
            lut_index = 105, -- Warm, cozy tone
            reflection_intensity = 0.1
        },
        lights = {
            {name = "mainLight", mode = "ambient"},
        },
        description = "Haven - Personal sanctuary, comfortable and safe"
    },

    -- Tension: Dramatic, suspenseful atmosphere
    tension = {
        ambient = {
            ambient_intensity = 0.3,
            ambient_type = 1,
            light_intensity = 0.4,
            lut_contribution = 0.6,
            lut_index = 77, -- Dramatic red/dark tone
            reflection_intensity = 0.0
        },
        lights = {
            {name = "mainLight", mode = "tension"},
            {name = "spotlightGM", mode = "on"},
        },
        description = "Tension - Dramatic, suspenseful atmosphere"
    },

    -- Combat: Intense, dynamic lighting
    combat = {
        ambient = {
            ambient_intensity = 0.4,
            ambient_type = 1,
            light_intensity = 0.6,
            lut_contribution = 0.5,
            lut_index = 79, -- High contrast, intense tone
            reflection_intensity = 0.1
        },
        lights = {
            {name = "mainLight", mode = "tension"},
        },
        description = "Combat - Intense, dynamic lighting"
    },

    -- Suspicion: Paranoia-inducing, shadowy
    suspicion = {
        ambient = {
            ambient_intensity = 0.0,
            ambient_type = 1,
            light_intensity = 0.0,
            lut_contribution = 1.0,
            lut_index = 92, -- Very dark, shadowy tone
            reflection_intensity = 0.0
        },
        lights = {
            {name = "mainLight", mode = "dim"},
        },
        description = "Suspicion - Paranoia-inducing, shadowy atmosphere"
    },

    -- Social: Normal social interaction, balanced
    social = {
        ambient = {
            ambient_intensity = 0.7,
            ambient_type = 1,
            light_intensity = 0.6,
            lut_contribution = 0.1,
            lut_index = 1,
            reflection_intensity = 0.2
        },
        lights = {
            {name = "mainLight", mode = "ambient"},
        },
        description = "Social - Normal social interaction, balanced lighting"
    }
}

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

--- Applies ambient lighting settings to TTS global lighting
-- Uses U.changeLighting utility function to set ambient lighting properties
-- @param ambientSettings table Table containing ambient lighting properties
-- @param transitionTime number Optional. Duration for smooth transition (0 = instant)
local function applyAmbientLighting(ambientSettings, transitionTime)
    if ambientSettings == nil then return end

    transitionTime = transitionTime or 0

    -- Use U.changeLighting utility function which handles Lighting API correctly
    -- It sets properties directly (e.g., Lighting.ambient_intensity = val) and calls Lighting.apply()
    -- For now, we apply instantly regardless of transitionTime
    -- TODO: Implement smooth transitions using U.Lerp if needed in the future
    U.changeLighting(ambientSettings)
end

--- Coroutine for smooth ambient lighting transitions (Global context only)
-- Interpolates intensity values while setting discrete properties
-- NOTE: This function must be defined in Global context to work properly.
-- If smooth transitions are needed, move this to global.ttslua.
-- @param ambientSettings table Target ambient settings
-- @param transitionTime number Duration of transition
-- @return number Always returns 1 (indicates completion)
--[[
function coroutine_ambientTransition(ambientSettings, transitionTime)
    if ambientSettings == nil then return 1 end

    local startIntensity = Lighting.get("AmbientIntensity")
    local targetIntensity = ambientSettings.ambient_intensity or startIntensity

    -- Set discrete properties immediately (no smooth transition available for these)
    if ambientSettings.ambient_type ~= nil then
        Lighting.set("AmbientType", ambientSettings.ambient_type)
    end
    if ambientSettings.lut_contribution ~= nil then
        Lighting.set("LutContribution", ambientSettings.lut_contribution)
    end
    if ambientSettings.lut_index ~= nil then
        Lighting.set("LutIndex", ambientSettings.lut_index)
    end
    if ambientSettings.reflection_intensity ~= nil then
        Lighting.set("ReflectionIntensity", ambientSettings.reflection_intensity)
    end

    -- Smooth transition for intensity values
    if targetIntensity ~= startIntensity then
        local lerpFunc = U.Lerp(function(val)
            Lighting.set("AmbientIntensity", val)
        end, startIntensity, targetIntensity, transitionTime)

        local startLightIntensity = Lighting.get("LightIntensity")
        local targetLightIntensity = ambientSettings.light_intensity or startLightIntensity
        local lerpLightFunc = U.Lerp(function(val)
            Lighting.set("LightIntensity", val)
        end, startLightIntensity, targetLightIntensity, transitionTime)

        -- Run both lerps in parallel
        U.RunSequence({lerpFunc, lerpLightFunc})
    end

    return 1
end
--]]

--- Applies individual light modes for a scene
-- Uses L.SetLightMode for each light specified in the scene preset
-- @param lights table Array of {name, mode} tables
-- @param transitionTime number Optional. Transition time for light changes
local function applySceneLights(lights, transitionTime)
    if lights == nil or #lights == 0 then return end

    transitionTime = transitionTime or DefaultTransitionTime

    for _, lightConfig in ipairs(lights) do
        if lightConfig.name and lightConfig.mode then
            L.SetLightMode(lightConfig.name, lightConfig.mode, nil, transitionTime)
        end
    end
end

--- Plays background music track (if configured)
-- Uses TTS MusicPlayer API to play a specific track
-- Note: TTS uses 0-based indexing for tracks (0 = first track, 9 = 10th track)
-- Note: Scene presets use 1-based indexing (1 = first track) for user-friendliness
-- @param trackIndex number Optional. Music track index (1-10, converted to 0-9). If nil, pauses music.
local function playSceneMusic(trackIndex)
    if trackIndex == nil then
        -- Pause music
        MusicPlayer.pause()
    else
        -- Convert 1-based (user-friendly) to 0-based (TTS API)
        -- Scene presets use 1-10, but TTS API uses 0-9
        local apiTrackIndex = trackIndex - 1

        if apiTrackIndex >= 0 and apiTrackIndex <= 9 then
            MusicPlayer.setCurrentTrack(apiTrackIndex)
            MusicPlayer.play()
        else
            print("Scenes: Warning - Invalid music track index: " .. tostring(trackIndex) .. " (must be 1-10)")
        end
    end
end

-- ============================================================================
-- PUBLIC API
-- ============================================================================

--- Loads a scene preset instantly (no transition)
-- Applies all scene settings immediately.
-- @param sceneName string Name of the scene preset (key in Scenes.SCENES)
-- @return boolean True if scene loaded successfully, false if scene not found
--
-- @usage Scenes.loadScene("elysium")
function Scenes.loadScene(sceneName)
    if type(sceneName) ~= "string" then
        U.AlertGM("Scenes.loadScene: sceneName must be a string")
        return false
    end

    local scene = Scenes.SCENES[sceneName]
    if scene == nil then
        U.AlertGM("Scenes.loadScene: Scene not found: " .. sceneName)
        print("Scenes: Available scenes: " .. table.concat(U.getKeys(Scenes.SCENES), ", "))
        return false
    end

    print("Scenes: Loading scene '" .. sceneName .. "' - " .. (scene.description or ""))

    -- Apply ambient lighting (instant)
    if scene.ambient then
        applyAmbientLighting(scene.ambient, 0)
    end

    -- Apply individual lights (instant)
    if scene.lights then
        applySceneLights(scene.lights, 0)
    end

    -- Play music (if specified)
    if scene.musicTrack ~= nil then
        playSceneMusic(scene.musicTrack)
    end

    -- Save current scene to state
    S.setStateVal(sceneName, "currentScene")

    print("Scenes: Scene loaded successfully.")
    return true
end

--- Smoothly transitions to a scene preset over a duration
-- Uses coroutines and lerp functions for smooth transitions.
-- @param sceneName string Name of the scene preset (key in Scenes.SCENES)
-- @param transitionTime number Optional. Duration of transition in seconds (default: DefaultTransitionTime)
-- @return boolean True if transition started successfully, false if scene not found
--
-- @usage Scenes.fadeToScene("tension", 3.0)
function Scenes.fadeToScene(sceneName, transitionTime)
    if type(sceneName) ~= "string" then
        U.AlertGM("Scenes.fadeToScene: sceneName must be a string")
        return false
    end

    local scene = Scenes.SCENES[sceneName]
    if scene == nil then
        U.AlertGM("Scenes.fadeToScene: Scene not found: " .. sceneName)
        print("Scenes: Available scenes: " .. table.concat(U.getKeys(Scenes.SCENES), ", "))
        return false
    end

    transitionTime = transitionTime or DefaultTransitionTime

    print("Scenes: Fading to scene '" .. sceneName .. "' over " .. transitionTime .. " seconds")

    -- Apply ambient lighting with transition
    if scene.ambient then
        applyAmbientLighting(scene.ambient, transitionTime)
    end

    -- Apply individual lights with transition (using lighting module's built-in transitions)
    if scene.lights then
        applySceneLights(scene.lights, transitionTime)
    end

    -- Play music immediately (no fade for music)
    if scene.musicTrack ~= nil then
        playSceneMusic(scene.musicTrack)
    end

    -- Save current scene to state
    S.setStateVal(sceneName, "currentScene")

    print("Scenes: Scene transition initiated.")
    return true
end

--- Gets the current scene name from game state
-- @return string|nil Current scene name, or nil if no scene is set
function Scenes.getCurrentScene()
    return S.getStateVal("currentScene")
end

--- Gets scene preset data by name
-- @param sceneName string Name of the scene preset
-- @return table|nil Scene preset data, or nil if not found
function Scenes.getScene(sceneName)
    if type(sceneName) ~= "string" then
        return nil
    end
    return Scenes.SCENES[sceneName]
end

--- Lists all available scene names
-- @return table Array of scene name strings
function Scenes.listScenes()
    return U.getKeys(Scenes.SCENES)
end

--- Initializes the scenes module
-- Called from global.ttslua onLoad().
-- Restores the last scene from saved state, or loads default scene.
function Scenes.onLoad()
    print("Scenes: Module loaded.")

    -- Try to restore last scene from state
    local savedScene = Scenes.getCurrentScene()
    if savedScene and Scenes.SCENES[savedScene] then
        print("Scenes: Restoring saved scene: " .. savedScene)
        Scenes.loadScene(savedScene)
    else
        print("Scenes: No saved scene found, using default.")
        Scenes.loadScene("default")
    end
end

--- Resets scene to default
-- Convenience function to return to default scene
-- @param transitionTime number Optional. Transition duration (0 = instant)
function Scenes.resetScene(transitionTime)
    if transitionTime and transitionTime > 0 then
        return Scenes.fadeToScene("default", transitionTime)
    else
        return Scenes.loadScene("default")
    end
end

return Scenes

end)
__bundle_register("core.zones", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Zone Management Module (core/zones.ttslua)

    Handles zone-related operations including object queries, snap point alignment,
    zone activation/deactivation, and state persistence patterns.
    Extracted and adapted from Heritage module patterns.

    This module provides:
    - Zone activation/deactivation (event handler management)
    - Object query functions (find objects in zones by tags)
    - Snap point filtering (get snap points within zone bounds)
    - State persistence helpers (save object positions)
    - Basic zone utilities (visual management, containment checks)

    NOTE: Many game-specific functions (scoring, status checking) are omitted and
    should be adapted for VTM5E needs. The core patterns are preserved.
]]

local Z = {}
local U = require("lib.util")
local S = require("core.state")
local C = require("lib.constants")

-- ============================================================================
-- INTERNAL STATE & HELPERS
-- ============================================================================

-- Throttling table to prevent rapid-fire zone events
local zoneThrottle = {}

--- Throttles zone events to prevent rapid repeated triggers
-- @param zone Object The zone triggering the event
-- @param func function The function to execute after delay
-- @param delay number Delay in seconds before executing (default: 0.4)
local function throttleZone(zone, func, delay)
    if delay == nil then delay = 0.4 end
    zoneThrottle[zone.guid] = true
    Wait.time(function()
        func()
        zoneThrottle[zone.guid] = nil
    end, delay)
end

--- Checks if a zone is currently throttled
-- @param zone Object The zone to check
-- @return boolean True if zone is throttled
local function isThrottled(zone)
    return zoneThrottle[zone.guid] == true
end

-- ============================================================================
-- ZONE ACTIVATION & DEACTIVATION
-- ============================================================================

--- Activates zone event handlers (enables onObjectEnterZone/onObjectLeaveZone)
-- Sets up global event handlers in Global context. Zones must be activated
-- before they will respond to objects entering or leaving.
-- @usage Z.activateZones() -- Called after game setup
function Z.activateZones()
    -- This assumes Global context has ActivateZones() function that sets:
    --   onObjectEnterZone = Z.onObjectEnterZone
    --   onObjectLeaveZone = Z.onObjectLeaveZone
    if Global and Global.call then
        Global.call("ActivateZones")
    end
    S.setStateVal(false, "zones", "allLocked")
    print("Zones: Activated zone event handlers")
end

--- Deactivates zone event handlers (disables onObjectEnterZone/onObjectLeaveZone)
-- Prevents zones from responding to object enter/leave events. Useful during
-- setup phases or when temporarily disabling zone interactions.
-- @usage Z.deactivateZones() -- Called during game reset
function Z.deactivateZones()
    -- This assumes Global context has DeactivateZones() function that sets:
    --   onObjectEnterZone = nil
    --   onObjectLeaveZone = nil
    if Global and Global.call then
        Global.call("DeactivateZones")
    end
    S.setStateVal(true, "zones", "allLocked")
    print("Zones: Deactivated zone event handlers")
end

--- Hides all zones by moving them below the table
-- Deactivates zones and moves all scripting zones (zones) downward to hide them visually.
-- Useful for cleanup or when zones shouldn't be visible.
-- @usage Z.hideZones() -- Cleanup after game ends
function Z.hideZones()
    Z.deactivateZones()
    local zones = U.filter(getObjects(), function(obj)
        return obj.type == "Scripting"
    end)

    if #zones == 0 then return end

    S.setStateVal(true, "zones", "allLocked")
    Wait.time(function()
        U.forEach(zones, function(zone)
            local zonePos = zone.getPosition()
            if zonePos.y > -30 then
                zonePos.y = zonePos.y - 50
                zone.setPosition(zonePos)
            end
        end)
    end, 0.25)
end

--- Shows all zones by moving them above the table
-- Moves all scripting zones upward and activates them. Use to restore zone visibility
-- after hiding them.
-- @usage Z.showZones() -- Restore zones after cleanup
function Z.showZones()
    local zones = U.filter(getObjects(), function(obj)
        return obj.type == "Scripting"
    end)

    if #zones > 0 and zones[1].getPosition().y < -30 then
        U.forEach(zones, function(zone)
            local zonePos = zone.getPosition()
            zonePos.y = zonePos.y + 50
            zone.setPosition(zonePos)
        end)
    end

    Wait.time(Z.activateZones, 0.25)
end

-- ============================================================================
-- OBJECT QUERY FUNCTIONS
-- ============================================================================

--- Gets objects in a zone that match specified tags
-- Core function for querying zone contents. Supports single tag, multiple tags
-- with AND/OR logic, or special "ALL"/"ANY" keywords.
-- @param zone Object The zone to search in
-- @param tags string|table Tag(s) to filter by:
--   - string: Single tag name, or "ALL"/"ANY" to return all objects
--   - table: Array of tags to match
-- @param requireAll boolean If true, object must have ALL tags (AND logic);
--   if false/nil, object needs ANY tag (OR logic). Only used when tags is a table.
-- @return table Array of matching objects
-- @usage local cards = Z.getTaggedZoneObjects(zone, "Card")
-- @usage local items = Z.getTaggedZoneObjects(zone, {"Token", "Power"}, true) -- Must have both tags
-- @usage local anyItems = Z.getTaggedZoneObjects(zone, {"Token", "Power"}, false) -- Has either tag
-- @usage local all = Z.getTaggedZoneObjects(zone, "ALL") -- Returns all objects in zone
function Z.getTaggedZoneObjects(zone, tags, requireAll)
    local zoneObjs = zone.getObjects()

    -- Handle string tags (single tag or special keywords)
    if U.Type(tags) == "string" then
        if tags == "ALL" or tags == "ANY" then
            return zoneObjs
        end
        return U.filter(zoneObjs, function(obj)
            return obj.hasTag(tags)
        end)
    end

    -- Handle table of tags
    if requireAll == true then
        -- AND logic: object must have ALL tags
        return U.filter(zoneObjs, function(obj)
            for _, tag in pairs(tags) do
                if not obj.hasTag(tag) then
                    return false
                end
            end
            return true
        end)
    else
        -- OR logic: object needs ANY tag
        return U.filter(zoneObjs, function(obj)
            for _, tag in pairs(tags) do
                if obj.hasTag(tag) then
                    return true
                end
            end
            return false
        end)
    end
end

--- Gets card objects in a zone, optionally filtered by tags
-- Convenience function for finding cards. Defaults to common card tags.
-- @param zone Object The zone to search in
-- @param tags table|nil Optional: Tags to filter cards by (default: {"Character", "ClanLeader"})
-- @return table Array of card objects
-- @usage local cards = Z.getCards(zone)
-- @usage local specificCards = Z.getCards(zone, {"Character", "Important"})
function Z.getCards(zone, tags)
    if tags == nil then
        tags = {"Character", "Card"} -- Default tags - adapt for VTM5E
    end
    return U.filter(Z.getTaggedZoneObjects(zone, tags, false), function(obj)
        return obj.type == "Card"
    end)
end

--- Gets a single card from a zone (the topmost card if multiple exist)
-- Returns the highest card (by Y position) if multiple cards are present.
-- @param zone Object The zone to get card from
-- @param tags table|nil Optional: Tags to filter cards by
-- @return Object|nil The card object, or nil if no card found
-- @usage local card = Z.getCard(zone)
-- @usage if Z.getCard(zone) then print("Zone has a card") end
function Z.getCard(zone, tags)
    local cards = Z.getCards(zone, tags)
    if #cards == 0 then
        return nil
    end
    if #cards == 1 then
        return cards[1]
    end

    -- Sort by Y position (highest first), return top card
    table.sort(cards, function(a, b)
        return b.getPosition().y < a.getPosition().y
    end)

    return cards[1]
end

--- Checks if a zone contains any cards
-- @param zone Object The zone to check
-- @return boolean True if zone has at least one card
-- @usage if Z.hasCard(zone) then Z.alignCard(zone) end
function Z.hasCard(zone)
    return Z.getCard(zone) ~= nil
end

-- ============================================================================
-- SNAP POINT UTILITIES
-- ============================================================================

--- Gets snap points from an object that fall within a zone's bounds
-- Filters snap points by checking if their world positions are inside the zone.
-- Useful for aligning objects to valid positions within zones.
-- @param zone Object The zone to check snap points against
-- @param object Object|nil The object with snap points (default: Global/table)
-- @return table Array of snap point data that are within zone bounds
-- @usage local validSnaps = Z.getSnapPointsInZone(zone, board)
-- @usage local snaps = Z.getSnapPointsInZone(zone) -- Uses Global snap points
function Z.getSnapPointsInZone(zone, object)
    if object == nil then
        object = Global -- Default to Global object's snap points
    end

    local snapPoints = object.getSnapPoints()
    local validSnapPoints = {}

    for _, point in pairs(snapPoints) do
        -- Convert snap point local position to world position
        local worldPos = object.positionToWorld(point.position)

        -- Check if world position is inside zone bounds
        if U.isInside(zone, worldPos) then
            table.insert(validSnapPoints, point)
        end
    end

    return validSnapPoints
end

-- ============================================================================
-- STATE PERSISTENCE
-- ============================================================================

--- Saves positions and rotations of tagged objects in a zone
-- Can save to object descriptions (for TTS persistence) or to game state.
-- Useful for saving object layouts that should be restored later.
-- @param zone Object The zone containing objects to save
-- @param tags string|table Tag(s) to filter objects (uses getTaggedZoneObjects logic)
-- @param mode string Save mode:
--   - "desc" (default): Save to object.getDescription() as "{x,y,z}|{x,y,z}" format
--   - "state": Save to game state at stateKey/stateSubKey
--   - "clear": Clear object descriptions
-- @param stateKey string Optional: State key for "state" mode (e.g., "zones", "savedPositions")
-- @param stateSubKey string Optional: State sub-key for "state" mode (e.g., zone GUID)
-- @usage Z.writePosToTaggedObjectsInZone(zone, "Card", "desc") -- Save to descriptions
-- @usage Z.writePosToTaggedObjectsInZone(zone, {"Token", "Power"}, "state", "zones", zone.guid)
function Z.writePosToTaggedObjectsInZone(zone, tags, mode, stateKey, stateSubKey)
    if mode == nil then
        mode = "desc"
    end

    U.forEach(Z.getTaggedZoneObjects(zone, tags), function(obj)
        if mode == "clear" then
            obj.setDescription("")
            return
        end

        local pos = obj.getPosition()
        pos.y = pos.y + 0.5 -- Slight offset for restoration
        local rot = obj.getRotation()

        if mode == "desc" then
            -- Save to object description as "{x,y,z}|{x,y,z}"
            local descString = string.format(
                "{%s, %s, %s}|{%s, %s, %s}",
                U.round(pos.x, 2),
                U.round(pos.y, 2),
                U.round(pos.z, 2),
                U.round(rot.x, 2),
                U.round(rot.y, 2),
                U.round(rot.z, 2)
            )
            obj.setDescription(descString)
        elseif mode == "state" and U.Type(stateKey) == "string" then
            -- Save to game state
            -- Convert Vector objects to tables (JSON can't encode userdata)
            local posRotData = {
                position = {x = pos.x, y = pos.y, z = pos.z},
                rotation = {x = rot.x, y = rot.y, z = rot.z}
            }
            if stateSubKey then
                S.setStateVal(posRotData, stateKey, stateSubKey, obj.guid)
            else
                S.setStateVal(posRotData, stateKey, obj.guid)
            end
        end
    end)
end

-- ============================================================================
-- ZONE EVENT HANDLERS (STUBS FOR CUSTOMIZATION)
-- ============================================================================

--- Event handler called when an object enters a zone
-- This is a stub function that should be customized for VTM5E-specific behavior.
-- Called automatically by TTS when zones are activated and objects enter.
--
-- Typical pattern:
--   1. Check if zones are locked (early return if locked)
--   2. Check zone type (skip if not relevant)
--   3. Check game phase (skip if wrong phase)
--   4. Perform zone-specific logic (align objects, update UI, etc.)
--   5. Use throttleZone() for operations that shouldn't fire too frequently
--
-- @param zone Object The zone the object entered
-- @param object Object The object that entered the zone
-- @usage -- Customize this function for VTM5E-specific zone behaviors
-- @usage -- Example: Auto-align cards, check for scene triggers, etc.
function Z.onObjectEnterZone(zone, object)
    -- Check if zones are globally locked
    if S.getStateVal("zones", "allLocked") == true then
        return
    end

    -- TODO: Add VTM5E-specific zone entry logic here
    -- Examples:
    --   - Auto-align character cards
    --   - Check for scene triggers
    --   - Update UI displays
    --   - Validate object placement

    -- Example pattern (commented out - customize as needed):
    -- if Z.hasCard(zone) and object.type == "Card" then
    --     throttleZone(zone, function()
    --         -- Align card, refresh UI, etc.
    --         Z.alignCard(zone)
    --         Wait.time(function()
    --             -- Update UI or perform follow-up actions
    --         end, 0.5)
    --     end)
    -- end
end

--- Event handler called when an object leaves a zone
-- This is a stub function that should be customized for VTM5E-specific behavior.
-- Called automatically by TTS when zones are activated and objects leave.
--
-- Typical pattern:
--   1. Check if zones are locked (early return if locked)
--   2. Check zone type (skip if not relevant)
--   3. Perform cleanup (restore object properties, update UI, etc.)
--
-- @param zone Object The zone the object left
-- @param object Object The object that left the zone
-- @usage -- Customize this function for VTM5E-specific zone exit behaviors
function Z.onObjectLeaveZone(zone, object)
    -- Check if zones are globally locked
    if S.getStateVal("zones", "allLocked") == true then
        return
    end

    -- TODO: Add VTM5E-specific zone exit logic here
    -- Examples:
    --   - Restore object properties (unlock, restore scale, etc.)
    --   - Update UI displays
    --   - Clean up zone state

    -- Example pattern (commented out - customize as needed):
    -- if object.type == "Card" then
    --     object.use_hands = true -- Restore hands usage
    --     object.sticky = true -- Restore sticky property
    -- end
    --
    -- Wait.time(function()
    --     -- Re-align remaining objects, refresh UI
    --     if Z.hasCard(zone) then
    --         Z.alignCard(zone)
    --     end
    -- end, 0.5)
end

-- ============================================================================
-- ZONE UTILITIES (ADDITIONAL HELPERS)
-- ============================================================================

--- Initializes the zones module (called during game setup)
-- Sets up zone-related state and prepares zones for use.
-- @usage Z.onLoad() -- Called from core/main.ttslua during initialization
function Z.onLoad()
    -- Initialize zone state if needed
    if S.getStateVal("zones") == nil then
        S.setStateVal({allLocked = false}, "zones")
    end

    print("Zones: Module initialized")
end

return Z

end)
__bundle_register("core.main", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Main Game Logic Module (core/main.ttslua)

    Orchestrates game flow, coordinates between modules, and handles high-level game logic.
    Pattern based on Heritage module's manual control approach (NOT automated director).

    This module provides:
    - Player iteration patterns (DRY principle)
    - Manual phase control (Storyteller-driven)
    - Event delegation to other modules
    - Camera and scene control utilities
    - Game initialization and setup sequences
]]

local M = {}
local U = require("lib.util")
local C = require("lib.constants")
local S = require("core.state")
-- Optional: Will be required when lighting/scene modules are integrated
-- local L = require("core.lighting")
-- local Scenes = require("core.scenes")

--[[
    Main initialization entry point
    Called from global.ttslua onLoad() after state is initialized.
    Sets up game systems and prepares for play.
]]
function M.onLoad()
    print("Main: Core module loaded.")
    -- Initialize systems
    M.setupPlayers()
    M.syncPhase() -- Sync UI/features based on current phase

    print("Main: Module initialization complete.")
end

--[[
    Setup player data structures and roles
    Promotes all players and initializes player-specific game state.
    Pattern from Heritage M.setupPlayers / initialization globals.
]]
function M.setupPlayers()
    print("Main: Setting up players.")

    -- Promote all players (give them full permissions)
    for _, player in ipairs(Player.getPlayers()) do
        player.promoted = true
        print("Main: Promoted player " .. player.color)
    end

    -- Set up tombstone visibility (each player's tombstone invisible to them)
    M.setupTombstoneVisibility()

    -- TODO: Assign Storyteller role (e.g., Black or Brown player)
    -- TODO: Initialize player-specific data in game state (hunger, willpower, health, etc.)
    -- TODO: Set up player-specific UI elements
end

--[[
    Sets up tombstone visibility so each player's tombstone is invisible to them
    This prevents tombstones from blocking a player's view of the table.
    Uses TTS setInvisibleTo() function to hide objects from specific players.
]]
function M.setupTombstoneVisibility()
    print("Main: Setting up tombstone visibility.")

    for _, color in ipairs(C.PlayerColors) do
        local guid = C.GetTombstoneGUID(color)
        if guid then
            local tombstone = getObjectFromGUID(guid)
            if tombstone then
                -- Make this tombstone invisible to the player of this color
                -- The tombstone will still be visible to other players and the Storyteller
                tombstone.setInvisibleTo({color})
                print("Main: Tombstone for " .. color .. " set invisible to " .. color .. " player")
            else
                print("Main: Warning - Tombstone object not found for " .. color .. " (GUID: " .. guid .. ")")
            end
        else
            print("Main: Warning - No tombstone GUID found for " .. color)
        end
    end

    print("Main: Tombstone visibility setup complete.")
end

--[[
    Execute a function for all players
    DRY pattern for applying logic to all players without code duplication.

    @param func function The function to execute for each player.
                 Signature: func(player, color) where:
                 - player: Player object (e.g., Player.Red)
                 - color: string Player color (e.g., "Red")

    @usage M.forPlayers(function(player, color)
               print("Player " .. color .. " is ready")
           end)

    Pattern from Heritage M.forPlayers
]]
function M.forPlayers(func)
    if type(func) ~= "function" then
        U.AlertGM("M.forPlayers: func parameter must be a function")
        return
    end

    -- Iterate over actually seated players, not all possible colors
    -- This avoids errors when trying to access Player[color] for colors with no seated players
    for _, player in ipairs(Player.getPlayers()) do
        func(player, player.color)
    end
end

--[[
    Sync UI and features based on current game phase
    Updates visibility, enables/disables features, and refreshes displays.
    Called on load and when phase changes.

    Pattern from Heritage M.syncPhase
]]
function M.syncPhase()
    local currentPhase = S.getStateVal("currentPhase")
    if currentPhase == nil then
        print("Main: Warning - Current phase is nil, using SESSION_START")
        currentPhase = C.Phases.SESSION_START
        S.setCurrentPhase(currentPhase)
    end

    print("Main: Syncing phase - " .. currentPhase)

    -- TODO: Phase-specific logic
    -- - Update UI visibility based on phase
    -- - Enable/disable zone event handlers
    -- - Update lighting for scene
    -- - Show/hide phase-specific UI elements

    -- Example: Hide/show zones based on phase
    -- if currentPhase == C.Phases.SETUP then
    --     -- Show setup zones
    -- else
    --     -- Hide setup zones
    -- end
end

--[[
    Manually advance to a new game phase
    Updates game state, triggers phase-specific setup, and syncs UI.
    This is the manual control pattern (Storyteller-driven, not automated).

    @param newPhase string The new phase to transition to (e.g., C.Phases.PLAY)

    @usage M.advancePhase(C.Phases.PLAY)

    Pattern from Heritage manual phase functions (gameSETUP, gameSTART, etc.)
]]
function M.advancePhase(newPhase)
    if type(newPhase) ~= "string" then
        U.AlertGM("M.advancePhase: newPhase must be a string")
        return
    end

    -- Validate phase against constants
    local isValidPhase = false
    for _, phase in pairs(C.Phases) do
        if phase == newPhase then
            isValidPhase = true
            break
        end
    end

    if not isValidPhase then
        U.AlertGM("M.advancePhase: Invalid phase '" .. tostring(newPhase) .. "'")
        return
    end

    local oldPhase = S.getStateVal("currentPhase")
    print("Main: Advancing phase from " .. tostring(oldPhase) .. " to " .. newPhase)

    -- Update state
    S.setCurrentPhase(newPhase)

    -- Trigger phase-specific setup
    -- TODO: Add phase transition logic (lighting changes, UI updates, etc.)
    -- Example:
    -- if newPhase == C.Phases.PLAY then
    --     -- Activate zones, update lighting, etc.
    -- end

    -- Sync UI and features
    M.syncPhase()

    print("Main: Phase advancement complete.")
end

--[[
    Set camera view for a player
    Provides cinematic camera control for dramatic effect.

    @param player Player|string The player object or color string (e.g., Player.Red or "Red")
    @param cameraMode string The camera preset name from C.CameraAngles (e.g., "OVERVIEW")
    @param lookAtPos Vector3 Optional. Specific position to look at. If nil, uses preset from constants.

    @usage M.setCamera(Player.Red, "OVERVIEW")
    @usage M.setCamera("ALL", "GM_VIEW") -- Set camera for all players
    @usage M.setCamera("Red", nil, Vector(0, 5, 0)) -- Custom look-at position

    Pattern from Heritage M.setCamera
]]
function M.setCamera(player, cameraMode, lookAtPos)
    -- Handle "ALL" case
    if player == nil or player == "ALL" then
        M.forPlayers(function(p, color)
            M.setCamera(p, cameraMode, lookAtPos)
        end)
        return
    end

    -- Convert string color to Player object
    if type(player) == "string" then
        local playerColor = player  -- Save original string for error message
        -- Safely check if player color exists before accessing
        if not U.isIn(playerColor, Player.getAvailableColors()) then
            U.AlertGM("M.setCamera: Invalid player color '" .. playerColor .. "'")
            return
        end
        player = Player[playerColor]
        if player == nil then
            U.AlertGM("M.setCamera: No player seated in color '" .. playerColor .. "'")
            return
        end
    end

    if not U.isPlayer(player) then
        U.AlertGM("M.setCamera: Invalid player object")
        return
    end

    -- Get camera preset from constants
    local cameraPreset = nil
    if cameraMode and C.CameraAngles[cameraMode] then
        cameraPreset = C.CameraAngles[cameraMode]
    end

    if cameraPreset == nil and lookAtPos == nil then
        U.AlertGM("M.setCamera: Invalid camera mode '" .. tostring(cameraMode) .. "' and no lookAtPos provided")
        return
    end

    -- Set camera mode to ThirdPerson for cinematic control
    player.setCameraMode("ThirdPerson")

    -- Look at preset position or custom position
    local targetPos = lookAtPos
    if targetPos == nil and cameraPreset ~= nil and cameraPreset.position ~= nil then
        targetPos = cameraPreset.position
    end

    if targetPos then
        player.lookAt(targetPos)
        -- Reset to ThirdPerson after brief delay (prevents camera snapping back)
        Wait.time(function()
            player.setCameraMode("ThirdPerson")
        end, 0.5)
    end
end

--[[
    Handle object drop events
    Delegates to appropriate modules based on object type and context.

    @param playerColor string The color of the player who dropped the object
    @param droppedObject Object The object that was dropped
    @param zone Object Optional. The scripting zone the object entered (if any)

    Pattern from Heritage event delegation (onObjectDrop, onObjectEnterContainer)
]]
function M.onObjectDrop(playerColor, droppedObject, zone)
    if droppedObject == nil then return end

    print("Main: Object dropped - " .. droppedObject.name ..
          (zone and (" in zone " .. zone.name) or "") ..
          " by player " .. tostring(playerColor))

    -- TODO: Add VTM5E-specific drop logic
    -- - Check if object has specific tags (e.g., "Dice", "Token", "Card")
    -- - Handle dice roller interactions
    -- - Handle token placement in zones
    -- - Update game state based on object placement

    -- Example:
    -- if droppedObject.hasTag("Dice") then
    --     -- Handle dice-specific logic
    -- elseif zone and zone.hasTag("PlayerZone") then
    --     -- Handle zone-specific logic via Z module
    -- end
end

--[[
    Handle player actions (custom hotkeys, button presses, etc.)
    Delegates to appropriate handlers based on action type.

    @param playerColor string The color of the player performing the action
    @param action string The action identifier (e.g., "rollDice", "useDiscipline")
    @param clickState table Optional. Additional context (object clicked, position, etc.)

    Pattern from Heritage M.onPlayerAction
]]
function M.onPlayerAction(playerColor, action, clickState)
    print("Main: Player action - " .. tostring(playerColor) .. ", " .. tostring(action))

    -- TODO: Add VTM5E-specific action handlers
    -- - Dice rolling
    -- - Discipline activation
    -- - Willpower/hunger management
    -- - Scene interaction

    -- Example:
    -- if action == "rollDice" then
    --     -- Trigger dice roller logic
    -- elseif action == "useDiscipline" then
    --     -- Handle discipline usage
    -- end
end

-- Legacy alias for backwards compatibility (if needed)
M.Initialize = M.onLoad

return M

end)
__bundle_register("lib.ui_helpers", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    UI Helper Functions Module (lib/ui_helpers.ttslua)

    Provides utility functions for common UI operations in TTS.
    These functions simplify UI manipulation and follow patterns from the reference modules.

    Functions included:
    - toggleXmlElement: Toggle panel visibility with collapse/expand indicators
    - UI.setAttributes: Batch set multiple UI attributes at once (wrapper if needed)
    - Additional UI utilities as needed

    Pattern extracted from Kings Dilemma hud.ttslua.
]]

local UIHelpers = {}

-- ============================================================================
-- UI ATTRIBUTE HELPERS
-- ============================================================================

--- Sets multiple UI attributes at once
-- If TTS provides UI.setAttributes natively, this wrapper ensures compatibility.
-- Otherwise, implements the functionality by iterating through attributes.
--
-- @param elementID string The ID of the UI element
-- @param attrs table Table of attribute name-value pairs: {attributeName = value, ...}
--
-- @usage UI.setAttributes("myButton", {text = "Click Me", color = "Red", fontSize = 20})
function UIHelpers.setAttributes(elementID, attrs)
    if type(elementID) ~= "string" then
        error("UIHelpers.setAttributes: elementID must be a string", 2)
    end
    if type(attrs) ~= "table" then
        error("UIHelpers.setAttributes: attrs must be a table", 2)
    end

    -- Check if TTS provides UI.setAttributes natively
    -- If it does, use it directly; otherwise, implement it
    if UI.setAttributes and type(UI.setAttributes) == "function" then
        -- TTS provides it natively
        UI.setAttributes(elementID, attrs)
    else
        -- Implement it by iterating through attributes
        for attrName, attrValue in pairs(attrs) do
            UI.setAttribute(elementID, attrName, tostring(attrValue))
        end
    end
end

-- Expose as UI.setAttributes if not already available
if not UI.setAttributes then
    UI.setAttributes = UIHelpers.setAttributes
end

-- ============================================================================
-- UI ELEMENT TOGGLE FUNCTIONS
-- ============================================================================

--- Toggles the visibility of a UI element using the "active" attribute
-- This function implements the collapse/expand pattern commonly used in TTS UI panels.
-- When an element is collapsed, it sets active="false". When expanded, active="true".
-- Also updates a toggle button's text to show ▼ (expanded) or ► (collapsed).
--
-- The toggle button should have the ID pattern: "toggleElem_" + elementID
-- The element being toggled should support the "active" attribute.
--
-- @param elemID string The ID of the UI element to toggle (without "toggleElem_" prefix)
-- @param button string|nil Optional. Button value/state. Can be used for conditional logic.
--                        Typically "-2" for double-click or other special actions.
--
-- @usage toggleXmlElement("debugControls", "-1")
-- @usage In XML: <Button id="toggleElem_debugControls">►</Button>
--        <VerticalLayout id="debugControls" active="False">...</VerticalLayout>
--
-- Pattern from Kings Dilemma hud.ttslua toggleXmlElement function
function UIHelpers.toggleXmlElement(elemID, button)
    if type(elemID) ~= "string" then
        error("UIHelpers.toggleXmlElement: elemID must be a string", 2)
    end

    -- Get current active state (defaults to "false" if not set)
    local currentActive = UI.getAttribute(elemID, "active")
    local isCurrentlyActive = string.lower(tostring(currentActive)) == "true"

    -- Toggle the active state
    if not isCurrentlyActive then
        -- Expand: set active to true
        UI.setAttribute(elemID, "active", "true")

        -- Update toggle button text to show expanded state (▼)
        local toggleButtonID = "toggleElem_" .. elemID
        UI.setAttribute(toggleButtonID, "text", "▼")
    else
        -- Collapse: set active to false
        UI.setAttribute(elemID, "active", "false")

        -- Update toggle button text to show collapsed state (►)
        local toggleButtonID = "toggleElem_" .. elemID
        UI.setAttribute(toggleButtonID, "text", "►")
    end

    -- Optional: Add conditional logic based on button parameter
    -- This can be customized for specific elements if needed
    if button and button == "-2" then
        -- Double-click or special action logic (if needed)
        -- Example: Additional behavior when double-clicking toggle
    end
end

--- Sets a UI element to expanded state (visible)
-- Convenience function to expand a panel without toggling.
--
-- @param elemID string The ID of the UI element to expand
function UIHelpers.showXmlElement(elemID)
    if type(elemID) ~= "string" then
        error("UIHelpers.showXmlElement: elemID must be a string", 2)
    end

    UI.setAttribute(elemID, "active", "true")
    local toggleButtonID = "toggleElem_" .. elemID
    UI.setAttribute(toggleButtonID, "text", "▼")
end

--- Sets a UI element to collapsed state (hidden)
-- Convenience function to collapse a panel without toggling.
--
-- @param elemID string The ID of the UI element to collapse
function UIHelpers.hideXmlElement(elemID)
    if type(elemID) ~= "string" then
        error("UIHelpers.hideXmlElement: elemID must be a string", 2)
    end

    UI.setAttribute(elemID, "active", "false")
    local toggleButtonID = "toggleElem_" .. elemID
    UI.setAttribute(toggleButtonID, "text", "►")
end

--- Checks if a UI element is currently expanded (active)
-- @param elemID string The ID of the UI element to check
-- @return boolean True if element is active/expanded, false otherwise
function UIHelpers.isXmlElementExpanded(elemID)
    if type(elemID) ~= "string" then
        error("UIHelpers.isXmlElementExpanded: elemID must be a string", 2)
    end

    local currentActive = UI.getAttribute(elemID, "active")
    return string.lower(tostring(currentActive)) == "true"
end

-- ============================================================================
-- UI VALUE HELPERS
-- ============================================================================

--- Safely sets a UI element's value, converting to string if needed
-- @param elementID string The ID of the UI element
-- @param value any The value to set (will be converted to string)
function UIHelpers.setValue(elementID, value)
    if type(elementID) ~= "string" then
        error("UIHelpers.setValue: elementID must be a string", 2)
    end

    UI.setValue(elementID, tostring(value))
end

--- Safely gets a UI element's value and converts to number if possible
-- @param elementID string The ID of the UI element
-- @return string|number The value as a string, or number if it's a valid number
function UIHelpers.getValue(elementID)
    if type(elementID) ~= "string" then
        error("UIHelpers.getValue: elementID must be a string", 2)
    end

    local value = UI.getValue(elementID)

    -- Try to convert to number if it looks like a number
    local numValue = tonumber(value)
    if numValue ~= nil then
        return numValue
    end

    return value
end

-- ============================================================================
-- MODULE EXPORTS
-- ============================================================================

-- Export functions for use with require()
return UIHelpers

end)
return __bundle_require("__root")