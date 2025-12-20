--[[
    V:tM V5 Dice Calculation - Global Script
    Shared dice calculation logic for all dice roller instances
    This script handles Vampire: The Masquerade 5th Edition dice mechanics
--]]

--[[ The onLoad event is called after the game save finishes loading. --]]
function onLoad()
    print("V:tM V5 Dice System loaded")

    -- Ensure hand zone calculator functions are available globally
    _G.printHandZonePositions = printHandZonePositions
    _G.calculateHandZonePositions = calculateHandZonePositions

    -- Set up the dice results UI
    -- This creates a full-screen overlay panel for displaying dice results
    local diceResultsXml = [[
        <!-- Hidden input for data communication -->
        <InputField id="dice-results-data" width="1" height="1" position="-1000,-1000,0" active="false" />

        <!-- Full-screen overlay for dice results (initially hidden) -->
        <Panel id="dice-results-overlay" width="1920" height="1080" color="#000000" position="0,0,0" opacity="0" active="false">
            <!-- Results container panel -->
            <Panel id="dice-results-container" width="600" height="400" color="#1a1a2e" position="0,0,0" opacity="0">
                <!-- Header text -->
                <Text id="dice-results-header" fontSize="20" color="#ecf0f1" alignment="UpperCenter" position="0,-150,0" text="" />
                <!-- Dice values text -->
                <Text id="dice-values" fontSize="18" color="#bdc3c7" alignment="MiddleCenter" position="0,-50,0" text="" />
                <!-- Results text (main display) -->
                <Text id="dice-results" fontSize="32" color="#3498db" alignment="MiddleCenter" position="0,50,0" text="" />
            </Panel>
        </Panel>
    ]]

    if UI then
        UI.setXml(diceResultsXml)
        print("[DEBUG] Global: Dice results UI set via UI.setXml()")
    else
        print("[ERROR] Global: UI object not available in onLoad")
    end
end

--[[
    Send dice results to the Custom UI
    Called from dice roller scripts via Global.call()
    @param uiData - Table with dice results data
--]]
function sendDiceResultsToUI(uiData)
    if not UI then
        print("[ERROR] Global: UI not available")
        return
    end

    print("[DEBUG] Global: Sending dice results to UI")

    -- Extract data
    local playerName = uiData.playerName or ""
    local diceValues = uiData.diceValues or ""
    local resultMessage = uiData.resultMessage or "No results"
    local totalSuccesses = uiData.totalSuccesses or 0
    local hasMessyCritical = uiData.hasMessyCritical or false
    local isTotalFailure = uiData.isTotalFailure or false

    -- Determine text color based on results
    local resultColor = "#3498db"  -- Default blue
    if hasMessyCritical then
        resultColor = "#e74c3c"  -- Red for messy critical
    elseif isTotalFailure then
        resultColor = "#95a5a6"  -- Gray for failure
    elseif totalSuccesses > 1 then
        resultColor = "#f39c12"  -- Orange for critical
    elseif totalSuccesses == 1 then
        resultColor = "#2ecc71"  -- Green for success
    end

    -- Set header
    local headerText = playerName ~= "" and (playerName .. "'s Roll") or "Dice Roll"
    UI.setAttribute("dice-results-header", "text", headerText)

    -- Set dice values (if provided)
    if diceValues ~= "" then
        UI.setAttribute("dice-values", "text", diceValues)
    else
        UI.setAttribute("dice-values", "text", "")
    end

    -- Set results
    UI.setAttribute("dice-results", "text", resultMessage)
    UI.setAttribute("dice-results", "color", resultColor)

    -- Animate in: Show overlay, then animate container
    -- Step 1: Activate and fade in overlay
    UI.setAttribute("dice-results-overlay", "active", "true")
    UI.setAttribute("dice-results-overlay", "opacity", "0")

    -- Fade in overlay smoothly
    Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.2") end, 0.1)
    Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.4") end, 0.2)
    Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.6") end, 0.3)
    Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.7") end, 0.4)

    -- Step 2: Show and animate container (fade in)
    Wait.time(function()
        UI.setAttribute("dice-results-container", "opacity", "0")
        Wait.time(function() UI.setAttribute("dice-results-container", "opacity", "0.5") end, 0.1)
        Wait.time(function() UI.setAttribute("dice-results-container", "opacity", "1") end, 0.2)
        print("[DEBUG] Global: Dice results displayed: " .. resultMessage)
    end, 0.5)

    -- Step 3: After 5 seconds, fade out
    Wait.time(function()
        -- Fade out container
        UI.setAttribute("dice-results-container", "opacity", "0.5")
        Wait.time(function()
            UI.setAttribute("dice-results-container", "opacity", "0")
            -- Fade out overlay
            Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.5") end, 0.1)
            Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.3") end, 0.2)
            Wait.time(function() UI.setAttribute("dice-results-overlay", "opacity", "0.1") end, 0.3)
            Wait.time(function()
                UI.setAttribute("dice-results-overlay", "opacity", "0")
                UI.setAttribute("dice-results-overlay", "active", "false")
            end, 0.4)
        end, 0.2)
    end, 5.0)
end

--[[
    Calculate V:tM V5 dice results
    @param diceData - Table of dice values with metadata: {value=number, isHunger=boolean}
    @return Table with results: {successes, totalSuccesses, hasMessyCritical, isTotalFailure, hasBestialFailure, message}
--]]
function calculateV5DiceResults(diceData)
    local successes = 0
    local tens = {}
    local hungerOnes = false
    local totalSuccesses = 0

    -- First pass: count successes and identify 10s and hunger 1s
    for _, die in ipairs(diceData) do
        local value = tonumber(die.value)
        local isHunger = die.isHunger or false

        if value >= 6 and value <= 10 then
            successes = successes + 1
            if value == 10 then
                table.insert(tens, {value=value, isHunger=isHunger})
            end
        end

        -- Check for bestial failure (hunger die showing 1)
        if isHunger and value == 1 then
            hungerOnes = true
        end
    end

    -- Calculate paired 10s (criticals)
    local pairedTens = 0
    local hasHungerInPair = false

    -- Count pairs of 10s
    if #tens >= 2 then
        -- Group 10s into pairs
        local tensCount = #tens
        pairedTens = math.floor(tensCount / 2)

        -- Check if any pair includes a hunger die
        -- Check all tens that are part of pairs
        for i = 1, pairedTens * 2 do
            if tens[i] and tens[i].isHunger then
                hasHungerInPair = true
                break
            end
        end

        -- Each pair grants +2 bonus successes
        -- The 10s are already counted as successes (6-10 = success)
        -- So total = base successes + (pairs * 2 bonus)
        totalSuccesses = successes + (pairedTens * 2)
    else
        totalSuccesses = successes
    end

    -- Determine special conditions
    local hasMessyCritical = pairedTens > 0 and hasHungerInPair
    local isTotalFailure = totalSuccesses == 0
    local hasBestialFailure = hungerOnes and isTotalFailure

    -- Build result message
    local message = ""
    if totalSuccesses > 1 then
        message = message .. tostring(totalSuccesses) .. " Successes"
    elseif totalSuccesses == 1 then
        message = message .. "1 Success"
    else
        message = message .. "Total Failure"
    end

    if pairedTens > 0 then
        if hasMessyCritical then
            message = message .. " • Messy Critical!"
        else
            message = message .. " • Critical!"
        end
    end

    if hasBestialFailure then
        message = message .. " • POSSIBLE Bestial Failure (check if roll succeeded)"
    elseif hungerOnes and not isTotalFailure then
        message = message .. " • Hunger die showed 1 (check for bestial failure)"
    end

    return {
        successes = successes,
        totalSuccesses = totalSuccesses,
        pairedTens = pairedTens,
        hasMessyCritical = hasMessyCritical,
        isTotalFailure = isTotalFailure,
        hasBestialFailure = hasBestialFailure,
        hungerOnes = hungerOnes,
        message = message
    }
end

--[[
    Format dice values for display
    @param diceData - Table of dice values: {value=number, isHunger=boolean}
    @return Formatted string of dice values
--]]
function formatDiceValues(diceData)
    local values = {}
    for _, die in ipairs(diceData) do
        local value = tonumber(die.value)
        local display = tostring(value)
        if die.isHunger then
            display = display .. "H"  -- Mark hunger dice
        end
        table.insert(values, display)
    end
    return table.concat(values, ", ")
end

--[[ The onUpdate event is called once per frame. --]]
function onUpdate()
    --[[ Not used for dice calculations --]]
end

--[[
    Hand Zone Position Calculator Functions
    Usage in Lua Scripting window: printHandZonePositions()
]]

function calculateHandZonePositions(numZones, radius, tableCenter)
    numZones = numZones or 5
    radius = radius or 50
    tableCenter = tableCenter or {x = 0, y = 1.5, z = 0}

    local startAngle = 180
    local arcSpan = 180
    -- Divide arc into (numZones - 1) segments to span from 180° to 360°
    -- First zone at 180°, last zone at 360°
    local angleStep = arcSpan / (numZones - 1)
    local positions = {}

    for i = 1, numZones do
        -- First zone at 180°, last zone at 360°
        local angleDeg = startAngle + (angleStep * (i - 1))
        local angleRad = math.rad(angleDeg)
        local x = math.sin(angleRad) * radius
        local z = math.cos(angleRad) * radius

        table.insert(positions, {
            x = tableCenter.x + x,
            y = tableCenter.y,
            z = tableCenter.z + z
        })
    end

    return positions
end

function printHandZonePositions(numZones, radius, tableCenter)
    numZones = numZones or 5
    radius = radius or 50
    tableCenter = tableCenter or {x = 0, y = 1.5, z = 0}

    local positions = calculateHandZonePositions(numZones, radius, tableCenter)

    print("=== Hand Zone Positions ===")
    print("Number of zones: " .. numZones)
    print("Radius: " .. radius)
    print("Table center: {x=" .. tableCenter.x .. ", y=" .. tableCenter.y .. ", z=" .. tableCenter.z .. "}")
    print("")

    for i, pos in ipairs(positions) do
        -- Calculate angle for display (matches the calculation above)
        local angleStep = 180 / (numZones - 1)
        local angleDeg = 180 + (angleStep * (i - 1))
        print("Zone " .. i .. " (angle: " .. string.format("%.1f", angleDeg) .. "°):")
        print("  Position: {x=" .. string.format("%.2f", pos.x) .. ", y=" .. string.format("%.2f", pos.y) .. ", z=" .. string.format("%.2f", pos.z) .. "}")
        print("")
    end

    print("=== Copy-paste friendly format ===")
    for i, pos in ipairs(positions) do
        print("Zone " .. i .. ": {x=" .. string.format("%.2f", pos.x) .. ", y=" .. string.format("%.2f", pos.y) .. ", z=" .. string.format("%.2f", pos.z) .. "}")
    end

    return positions
end

-- Explicitly assign to global scope for console++ and other systems
_G.printHandZonePositions = printHandZonePositions
_G.calculateHandZonePositions = calculateHandZonePositions