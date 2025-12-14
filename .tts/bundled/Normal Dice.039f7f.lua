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
--[[ Normal Dice Roller Instance --]]

local diceRoller = require("Scripts.dice-roller-shared")

--Initialize the dice roller as a NORMAL dice roller
diceRoller.initDiceRoller(self, {
    isHunger = false  -- This is a normal dice roller
})
end)
__bundle_register("Scripts.dice-roller-shared", function(require, _LOADED, __bundle_register, __bundle_modules)
--[[
    Shared Dice Roller Code - Complete Implementation
    This file contains ALL dice roller functionality.
    Instance scripts only need to require this and set isHunger flag.

    The TTS Lua extension will automatically bundle this file when you use require().
    Enable "TTSLua: Include Other Files" in settings for this to work.
--]]

local DiceUtil = {}

--[[
    Initialize the dice roller
    @param rollerSelf - The self object (passed from instance script)
    @param config - Configuration table: {isHunger = true/false, customSettings = {...}}
--]]
function DiceUtil.initDiceRoller(rollerSelf, config)
    -- Store self reference (will be used in closures)
    local rollerSelfRef = rollerSelf
    local isHunger = config.isHunger or false

    -- Declare all functions as local first (for scope access within this function)
    -- Then assign to global variables for TTS callbacks
    local createButtons, getLocalPointOnArc, randomRotation, wait
    local updateGlobalTable, updateRollTimers, anyRollInProgress
    local monitorDice, displayResults, areOtherRollersRolling
    local finalizeCoopRolls, addAllSpawnedDice, clearResultsFlag

    print("V:tM V5 Dice System Loaded for " .. (isHunger and "Hunger" or "Normal") .. " dice roller")
    print("[DEBUG] Initialization complete. rollerSelfRef GUID: " .. tostring(rollerSelfRef.getGUID()))

    -- Default settings
    -- NOTE: Must be global - accessed via closures in multiple functions
    setting = {print={}}
    setting.setup = false
    setting.radius = 4
    setting.arc = 180
    setting.rotation = 180
    setting.height = 1.5
    setting.scale = 1.7
    setting.maxCount = 15
    setting.rollDelay = 1.2
    setting.cleanupDelay = -1
    setting.colorDie = false
    setting.print.player = false
    setting.print.individual = false
    setting.print.total = true  -- Default to showing results
    setting.print.playerColor = true
    setting.coop = false

    -- Override with custom settings if provided
    if config.customSettings then
        for k, v in pairs(config.customSettings) do
            if type(v) == "table" and setting[k] and type(setting[k]) == "table" then
                for k2, v2 in pairs(v) do
                    setting[k][k2] = v2
                end
            else
                setting[k] = v
            end
        end
    end

    -- Initialize dice tracking - store per instance to avoid conflicts between normal/hunger rollers
    -- Use a helper function to get/set the instance-specific spawnedDice
    local function getSpawnedDice()
        local dice = rollerSelfRef.getTable("spawnedDice")
        if dice == nil then
            dice = {}
            rollerSelfRef.setTable("spawnedDice", dice)
        end
        return dice
    end

    local function setSpawnedDice(dice)
        rollerSelfRef.setTable("spawnedDice", dice)
    end

    -- Initialize empty array for this instance
    setSpawnedDice({})

    -- Save function (triggered when adding a die or clearing the dice)
    -- NOTE: Must be global - this is a TTS callback function
    onSave = function()
        local spawnedDice = getSpawnedDice()
        local tableToSave = {}
        for _, die in ipairs(spawnedDice) do
            if die ~= nil then
                table.insert(tableToSave, die.getGUID())
            end
        end
        local saved_data = JSON.encode(tableToSave)
        return saved_data
    end

    -- NOTE: Must be global - this is a TTS callback function
    onLoad = function(saved_data)
        print("[DEBUG] onLoad called. saved_data length: " .. tostring(saved_data and #saved_data or 0))
        if saved_data ~= "" then
            --Remove any old dice from the table
            local loaded_data = JSON.decode(saved_data)
            print("[DEBUG] onLoad: Cleaning up " .. tostring(#loaded_data) .. " old dice")
            for _, dieGUID in ipairs(loaded_data) do
                local die = getObjectFromGUID(dieGUID)
                if die ~= nil then
                    destroyObject(die)
                end
            end
        end
        setSpawnedDice({})

        math.randomseed(os.time())
        print("[DEBUG] onLoad: Calling createButtons()")
        createButtons()
        print("[DEBUG] onLoad: Complete")
    end

    -- Spawn dice for rolling
    -- NOTE: Must be global - referenced in createButton as click_function="click_roll"
    click_roll = function(_, color)
        local spawnedDice = getSpawnedDice()
        --Dice spam protection check
        local denyRoll = false
        if setting.maxCount > 0 and #spawnedDice >= setting.maxCount then
            denyRoll = true
        end
        local anyRoll = anyRollInProgress(color)
        if rollInProgress==nil and denyRoll==false and anyRoll==false then
            --Find dice positions, moving previously spawned dice if needed
            for i, die in ipairs(spawnedDice) do
                local pos_local = getLocalPointOnArc(i, #spawnedDice+1)
                local pos = rollerSelfRef.positionToWorld(pos_local)
                die.setPositionSmooth(pos)
            end

            --Spawns dice
            local pos_local = getLocalPointOnArc(#spawnedDice+1, #spawnedDice+1)
            print("[DEBUG] click_roll: Spawning die at position " .. tostring(pos_local.x) .. ", " .. tostring(pos_local.y) .. ", " .. tostring(pos_local.z))
            local spawnedDie = rollerSelfRef.takeObject({
                position = rollerSelfRef.positionToWorld(pos_local),
                rotation = randomRotation(),
            })

            if spawnedDie == nil then
                print("[ERROR] click_roll: Failed to spawn die! takeObject returned nil")
                return
            end

            print("[DEBUG] click_roll: Die spawned successfully. GUID: " .. tostring(spawnedDie.getGUID()))

            --Setup die that was just spawned
            spawnedDie.setScale({setting.scale,setting.scale,setting.scale})
            spawnedDie.setLock(true)
            if setting.colorDie == true then
                spawnedDie.setColorTint(stringColorToRGB(color))
            end
            --Mark as hunger or normal die
            spawnedDie.script_state = isHunger and "hunger" or "normal"
            print("[DEBUG] click_roll: Die marked as " .. tostring(spawnedDie.script_state))

            print("[DEBUG] click_roll: Calling rollTimerUpdate")
            rollTimerUpdate({color=color})

            --Update data
            table.insert(spawnedDice, spawnedDie)
            setSpawnedDice(spawnedDice)
            updateGlobalTable(color)
            updateRollTimers(color)

        elseif rollInProgress == false then
            --If after roll but before cleanup
            print("[DEBUG] click_roll: Roll in progress is false, cleaning up and retrying")
            cleanupDice()
            click_roll(_, color)
        else
            --If button click is denied due to roll (or 2 many dice)
            print("[DEBUG] click_roll: Roll denied - rollInProgress is " .. tostring(rollInProgress))
            Player[color].broadcast("Roll in progress.", {0.8, 0.2, 0.2})
        end
    end

    -- NOTE: Must be global - called via who.call("rollTimerUpdate", ...) in updateRollTimers
    rollTimerUpdate = function(param)
        print("[DEBUG] rollTimerUpdate called. delay: " .. tostring(setting.rollDelay) .. ", color: " .. tostring(param and param.color or "nil"))
        --Timer starting
        Timer.destroy("clickRoller_"..rollerSelfRef.getGUID())
        Timer.create({
            identifier="clickRoller_"..rollerSelfRef.getGUID(), delay=setting.rollDelay,
            function_name="timer_rollDice", function_owner=rollerSelfRef,
            parameters = param
        })
    end

    --Rolls all the dice and then launches monitoring
    -- NOTE: Must be global - referenced in Timer.create as function_name="timer_rollDice"
    timer_rollDice = function(p)
        -- NOTE: Must be global - accessed via who.getVar("rollInProgress") in anyRollInProgress
        rollInProgress = true
        local spawnedDice = getSpawnedDice()
        -- NOTE: Must be global - called via startLuaCoroutine with string name "coroutine_rollDice"
        coroutine_rollDice = function()
            local spawnedDice = getSpawnedDice()
            for _, die in ipairs(spawnedDice) do
                die.setLock(false)
                die.randomize()
                wait(0.1)
            end
            monitorDice(p.color)

            return 1
        end
        startLuaCoroutine(rollerSelfRef, "coroutine_rollDice")
    end

    --Monitors dice to come to rest
    monitorDice = function(color)
        -- NOTE: Must be global - called via startLuaCoroutine with string name "coroutine_monitorDice"
        coroutine_monitorDice = function()
            repeat
                -- Check ALL dice from ALL rollers (normal and hunger) for this color
                local allRest = true
                local allDice = {}

                -- Get dice from this instance
                local spawnedDice = getSpawnedDice()
                for _, die in ipairs(spawnedDice) do
                    table.insert(allDice, die)
                end

                -- Get dice from all other rollers for this color
                local currentTable = Global.getTable("UCR_communication")
                if currentTable ~= nil then
                    for who, c in pairs(currentTable) do
                        if who ~= rollerSelfRef and c == color then
                            local theirSpawnedDice = who.getTable("spawnedDice")
                            if theirSpawnedDice ~= nil then
                                for _, die in ipairs(theirSpawnedDice) do
                                    table.insert(allDice, die)
                                end
                            end
                        end
                    end
                end

                -- Check if ALL dice from ALL rollers are at rest
                for _, die in ipairs(allDice) do
                    if die ~= nil and die.resting == false then
                        allRest = false
                        break
                    end
                end

                coroutine.yield(0)
            until allRest == true

            -- Use a global flag to ensure only one instance displays results
            local resultsKey = "dice_results_displayed_" .. tostring(color)
            local resultsDisplayed = Global.getVar(resultsKey)

            if resultsDisplayed == nil or resultsDisplayed == false then
                -- Mark that results are being displayed
                Global.setVar(resultsKey, true)

                -- Collect all dice from all rollers
                local allDice = {}
                local spawnedDice = getSpawnedDice()
                for _, die in ipairs(spawnedDice) do
                    table.insert(allDice, die)
                end

                local currentTable = Global.getTable("UCR_communication")
                if currentTable ~= nil then
                    for who, c in pairs(currentTable) do
                        if who ~= rollerSelfRef and c == color then
                            local theirSpawnedDice = who.getTable("spawnedDice")
                            if theirSpawnedDice ~= nil then
                                for _, die in ipairs(theirSpawnedDice) do
                                    table.insert(allDice, die)
                                end
                            end
                        end
                    end
                end

                -- Display results once with all combined dice
                if #allDice > 0 then
                    if setting.print.individual==true or setting.print.total==true then
                        displayResults(color)
                    end
                end

                -- Clear the flag after a short delay to allow other rollers to finalize
                Timer.create({
                    identifier="clear_results_flag_"..tostring(color),
                    delay=0.5,
                    function_name="clearResultsFlag",
                    function_owner=rollerSelfRef,
                    parameters={key=resultsKey}
                })
            end

            finalizeRoll({color=color})
            if setting.coop == true then finalizeCoopRolls(color) end

            return 1
        end
        startLuaCoroutine(self, "coroutine_monitorDice")
    end

    -- Helper function to clear the results flag
    clearResultsFlag = function(p)
        if p and p.key then
            Global.setVar(p.key, false)
        end
    end

    -- NOTE: Must be global - called via who.call("finalizeRoll", ...) in finalizeCoopRolls
    finalizeRoll = function(p)
        local color = p.color
        -- NOTE: Must be global - accessed via who.getVar("rollingHasStopped") in areOtherRollersRolling
        -- Using nil (not false) to indicate "not set" - checked with ~= true in areOtherRollersRolling
---@diagnostic disable-next-line: assign-type-mismatch
        rollingHasStopped = nil --Used for coop communication
        -- NOTE: Must be global - accessed via who.getVar("rollInProgress") in anyRollInProgress
        rollInProgress = false --Used for button lockout
        updateGlobalTable(nil)

        --Auto die removal
        if setting.cleanupDelay > -1 then
            Timer.destroy("clickRoller_cleanup_"..rollerSelfRef.getGUID())
            Timer.create({
                identifier="clickRoller_cleanup_"..rollerSelfRef.getGUID(),
                function_name="cleanupDice", function_owner=rollerSelfRef,
                delay=setting.cleanupDelay,
            })
        end
    end

    --Removes the dice
    -- NOTE: Must be global - referenced in Timer.create as function_name="cleanupDice"
    cleanupDice = function()
        local spawnedDice = getSpawnedDice()
        for _, die in ipairs(spawnedDice) do
            if die ~= nil then
                destroyObject(die)
            end
        end

        -- Using nil (not false) to indicate "not initialized" - checked with == nil in click_roll
---@diagnostic disable-next-line: assign-type-mismatch
        rollInProgress = nil
        setSpawnedDice({})

        Timer.destroy("clickRoller_cleanup_"..rollerSelfRef.getGUID())
    end

    displayResults = function(color)
        -- Combine dice from all rollers (normal and hunger) for this player color
        local allDice = {}
        local spawnedDice = getSpawnedDice()

        -- Add dice from this instance
        for _, die in ipairs(spawnedDice) do
            table.insert(allDice, die)
        end

        -- Combine dice from all other rollers of the same color (normal and hunger dice)
        addAllSpawnedDice(color, allDice)

        --Use Global script for V5 calculations
        local s = ""

        --Player name
        if setting.print.player == true then
            s = Player[color].steam_name
            if setting.print.individual==true or setting.print.total==true then
                s = s .. "    " .. string.char(9679) .. "    "
            end
        end

        --Collect dice data with hunger tracking from combined dice pool
        local diceData = {}
        for _, die in ipairs(allDice) do
            if die ~= nil then
                local value = tonumber(die.getRotationValue())
                local isHungerDie = (die.script_state == "hunger")
                table.insert(diceData, {value=value, isHunger=isHungerDie})
            end
        end

        --Individual values display
        if setting.print.individual == true then
            local formatted = Global.call("formatDiceValues", diceData)
            s = s .. formatted
            if setting.print.total == true then
                s = s .. "    " .. string.char(9679) .. "    "
            end
        end

        --Calculate results using Global script
        local results = nil
        if setting.print.total == true then
            results = Global.call("calculateV5DiceResults", diceData)
            s = s .. results.message

            -- Summary debug message for testing messy critical logic
            local summary = string.format(
                "[DICE SUMMARY] Total: %d dice | Successes: %d | Messy Critical: %s | Total Failure: %s | Bestial Failure: %s | Result: %s",
                #diceData,
                results.totalSuccesses,
                tostring(results.hasMessyCritical),
                tostring(results.isTotalFailure),
                tostring(results.hasBestialFailure),
                results.message
            )
            print(summary)
        end

        -- Send results to UI for GSAP animation instead of print/broadcast
        if results then
            local playerName = ""
            if setting.print.player == true then
                playerName = Player[color].steam_name
            end

            local diceValuesStr = ""
            if setting.print.individual == true then
                diceValuesStr = Global.call("formatDiceValues", diceData)
            end

            -- Prepare UI data
            local uiData = {
                type = "diceResults",
                playerName = playerName,
                diceValues = diceValuesStr,
                resultMessage = results.message,
                totalSuccesses = results.totalSuccesses,
                hasMessyCritical = results.hasMessyCritical,
                isTotalFailure = results.isTotalFailure,
                hasBestialFailure = results.hasBestialFailure
            }

            -- Send to UI via Global script (which has the Custom UI attached)
            -- Global.call() will execute the function in Global's script context where UI is available
            Global.call("sendDiceResultsToUI", uiData)
        else
            -- Fallback to old method if results not calculated
            local stringColor = {1,1,1}
            if setting.print.playerColor == true then
                stringColor = stringColorToRGB(color)
            end
            printToAll(' ', stringColor)
            broadcastToAll(s, stringColor)
        end
    end

    --Updates global rolling table with its information
    -- Always register rollers (not just in coop mode) so we can combine normal and hunger dice
    updateGlobalTable = function(color)
        local currentTable = Global.getTable("UCR_communication")
        if currentTable == nil then
            Global.setTable("UCR_communication", {[rollerSelfRef]=color})
        else
            currentTable[rollerSelfRef] = color
            Global.setTable("UCR_communication", currentTable)
        end
    end

    --Updates roll timers for all devices currently rolling
    updateRollTimers = function(color)
        if setting.coop==true then
            local currentTable = Global.getTable("UCR_communication")
            if currentTable ~= nil then
                for who, c in pairs(currentTable) do
                    if who~=rollerSelfRef and c==color then
                        who.call("rollTimerUpdate", {color=color})
                    end
                end
            end
        end
    end

    --Check if any other roller is rolling
    areOtherRollersRolling = function(color)
        if setting.coop==true then
            local currentTable = Global.getTable("UCR_communication")
            if currentTable == nil then
                return false
            else
                for who, c in pairs(currentTable) do
                    if who~=rollerSelfRef and c==color then
                        if who.getVar("rollingHasStopped") ~= true then
                            return true
                        end
                    end
                end
            end
            return false
        else
            return false
        end
    end

    --Check if any other roller is rolling
    anyRollInProgress = function(color)
        if setting.coop==true then
            local currentTable = Global.getTable("UCR_communication")
            if currentTable == nil then
                return false
            else
                for who, c in pairs(currentTable) do
                    if who~=rollerSelfRef and c==color then
                        if who.getVar("rollInProgress") ~= nil then
                            return true
                        end
                    end
                end
            end
            return false
        else
            return false
        end
    end

    --Activate the finalize step on all dice of this color
    finalizeCoopRolls = function(color)
        if setting.coop==true then
            local currentTable = Global.getTable("UCR_communication")
            if currentTable ~= nil then
                for who, c in pairs(currentTable) do
                    if c==color then
                        who.call("finalizeRoll", {color=color})
                    end
                end
            end
        end
    end

    --Combines all spawnedDice tables from all rollers (normal and hunger) for the same player color
    -- Always combines dice, not just in coop mode, so normal and hunger dice are combined
    addAllSpawnedDice = function(color, targetArray)
        targetArray = targetArray or {}
        -- Get all rollers for this color from the communication table
        local currentTable = Global.getTable("UCR_communication")
        if currentTable ~= nil then
            for who, c in pairs(currentTable) do
                if who ~= rollerSelfRef and c == color then
                    local theirSpawnedDice = who.getTable("spawnedDice")
                    if theirSpawnedDice ~= nil then
                        for _, die in ipairs(theirSpawnedDice) do
                            table.insert(targetArray, die)
                        end
                    end
                end
            end
        end
        return targetArray
    end

    --Finds a local point an an arc, given which point and the total # of points
    getLocalPointOnArc = function(i, points)
        i = i - 0.5
        local angle = setting.arc/(points)
        local offset = -setting.arc/2 + setting.rotation
        local x = math.sin( math.rad(angle*i+offset) ) * setting.radius
        local y = setting.height
        local z = math.cos( math.rad(angle*i+offset) ) * setting.radius
        return {x=x,y=y,z=z}
    end

    --Gets a random rotation vector
    randomRotation = function()
        --Credit for this function goes to Revinor (forums)
        local u1 = math.random();
        local u2 = math.random();
        local u3 = math.random();
        local u1sqrt = math.sqrt(u1);
        local u1m1sqrt = math.sqrt(1-u1);
        local qx = u1m1sqrt *math.sin(2*math.pi*u2);
        local qy = u1m1sqrt *math.cos(2*math.pi*u2);
        local qz = u1sqrt *math.sin(2*math.pi*u3);
        local qw = u1sqrt *math.cos(2*math.pi*u3);
        local ysqr = qy * qy;
        local t0 = -2.0 * (ysqr + qz * qz) + 1.0;
        local t1 = 2.0 * (qx * qy - qw * qz);
        local t2 = -2.0 * (qx * qz + qw * qy);
        local t3 = 2.0 * (qy * qz - qw * qx);
        local t4 = -2.0 * (qx * qx + ysqr) + 1.0;
        if t2 > 1.0 then t2 = 1.0 end
        if t2 < -1.0 then t2 = -1.0 end
        local xr = math.asin(t2);
        local yr = math.atan2(t3, t4);
        local zr = math.atan2(t1, t0);
        return {math.deg(xr),math.deg(yr),math.deg(zr)}
    end

    --Coroutine delay, in seconds
    wait = function(time)
        local start = os.time()
        repeat coroutine.yield(0) until os.time() > start + time
    end

    --Spawns the roll button or the "display roll locations" for setup mode
    createButtons = function()
        print("[DEBUG] createButtons called. setup mode: " .. tostring(setting.setup))
        if setting.setup ~= true then
            print("[DEBUG] createButtons: Creating roll button")
            rollerSelfRef.createButton({
                click_function="click_roll", function_owner=rollerSelfRef,
                position={0,0.05,0}, height=650, width=650, color={1,1,1,0}
            })
            print("[DEBUG] createButtons: Roll button created")
        else
            for i=1, math.ceil(setting.arc/30) do
                local pos_local = getLocalPointOnArc(i, math.ceil(setting.arc/30))
                rollerSelfRef.createButton({
                    click_function="none", function_owner=rollerSelfRef,
                    position=pos_local, height=0, width=0, label=string.char(9673),
                    font_size=1000, font_color={0.5,0.5,0.5}
                })
            end
        end
    end

    -- Assign local functions to global variables for TTS callbacks
    -- This allows them to be called from global callbacks while keeping them accessible within the function scope
    -- Using _G explicitly to assign to global scope (avoids shadowing the local variables)
    _G.createButtons = createButtons
    _G.getLocalPointOnArc = getLocalPointOnArc
    _G.randomRotation = randomRotation
    _G.wait = wait
    _G.updateGlobalTable = updateGlobalTable
    _G.updateRollTimers = updateRollTimers
    _G.anyRollInProgress = anyRollInProgress
    _G.monitorDice = monitorDice
    _G.displayResults = displayResults
    _G.areOtherRollersRolling = areOtherRollersRolling
    _G.finalizeCoopRolls = finalizeCoopRolls
    _G.addAllSpawnedDice = addAllSpawnedDice
    _G.clearResultsFlag = clearResultsFlag
end

return DiceUtil

end)
return __bundle_require("__root")