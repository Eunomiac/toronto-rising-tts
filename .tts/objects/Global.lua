--[[
    V:tM V5 Dice Calculation - Global Script
    Shared dice calculation logic for all dice roller instances
    This script handles Vampire: The Masquerade 5th Edition dice mechanics
--]]

--[[
    The onLoad event is called after the game save finishes loading.
    NOTE: Must be global (not local) - this is a TTS callback function.
--]]
function onLoad()
    print("V:tM V5 Dice System loaded")
end

--[[
    Calculate V:tM V5 dice results
    @param diceData - Table of dice values with metadata: {value=number, isHunger=boolean}
    @return Table with results: {successes, totalSuccesses, hasMessyCritical, isTotalFailure, hasBestialFailure, message}
    NOTE: Must be global (not local) - called via Global.call() from other scripts.
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
    NOTE: Must be global (not local) - called via Global.call() from other scripts.
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

--[[
    The onUpdate event is called once per frame.
    NOTE: Must be global (not local) - this is a TTS callback function.
--]]
function onUpdate()
    --[[ Not used for dice calculations --]]
end