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

    -- Test if UI is available
    if UI then
        print("[DEBUG] Global: UI object is available")
        print("[DEBUG] Global: Testing UI connection...")

        -- Try to set a test attribute to verify UI is working
        local testSuccess, errorMsg = pcall(function()
            -- Try to access a test element (will fail if UI not loaded, but that's ok)
            UI.setAttribute("ui-test-status", "text", "UI Connected!")
        end)

        if testSuccess then
            print("[DEBUG] Global: UI connection test PASSED - UI is working!")
        else
            print("[WARNING] Global: UI connection test FAILED")
            print("[WARNING] Global: Error: " .. tostring(errorMsg))
            print("[WARNING] Global: UI may not be fully loaded yet, or element 'ui-test-status' not found")
            print("[WARNING] Global: This is normal if the UI hasn't finished loading")
        end
    else
        print("[ERROR] Global: UI object is NOT available")
        print("[ERROR] Global: Check that Global.xml has the correct URL")
        print("[ERROR] Global: Current URL should be: https://eunomiac.github.io/toronto-rising-tts/index.html")
    end
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

--[[
    ============================================================================
    UI Communication Functions
    ============================================================================
    All overlays are preloaded in index.html for instant display.
    No page switching needed - just send data to the appropriate hidden input.
    ============================================================================
--]]

--[[
    Send dice results to the Custom UI
    Called from dice roller scripts via Global.call()
    @param uiData - Table with dice results data:
        - playerName: string
        - diceValues: string
        - resultMessage: string
        - totalSuccesses: number
        - hasMessyCritical: boolean
        - isTotalFailure: boolean
        - hasBestialFailure: boolean
--]]
function sendDiceResultsToUI(uiData)
    if not UI then
        print("[ERROR] Global: UI not available - check Global.xml has correct URL")
        return
    end

    print("[DEBUG] Global: Sending dice results to UI")

    -- Encode data as JSON and send to the hidden input field
    -- The JavaScript will detect this change and trigger GSAP animations
    local jsonData = JSON.encode(uiData)

    local success = pcall(function()
        UI.setAttribute("dice-results-data", "value", jsonData)
    end)

    if success then
        print("[DEBUG] Global: Sent dice results to UI: " .. jsonData)
    else
        print("[ERROR] Global: Failed to send data to UI - element 'dice-results-data' not found")
        print("[ERROR] Global: Make sure index.html has: <input type=\"hidden\" id=\"dice-results-data\" value=\"\" />")
    end
end

--[[
    Send a notification to the Custom UI
    @param notificationData - Table with notification data:
        - title: string (required)
        - message: string (required)
        - type: "info" | "success" | "warning" | "error" (default: "info")
--]]
function sendNotificationToUI(notificationData)
    if not UI then
        print("[ERROR] Global: UI not available - check Global.xml has correct URL")
        return
    end

    print("[DEBUG] Global: Sending notification to UI")

    -- Prepare data with type
    local uiData = {
        type = "notification",
        notificationTitle = notificationData.title or "Notification",
        notificationMessage = notificationData.message or "",
        notificationType = notificationData.type or "info"
    }

    local jsonData = JSON.encode(uiData)

    local success = pcall(function()
        UI.setAttribute("notification-data", "value", jsonData)
    end)

    if success then
        print("[DEBUG] Global: Sent notification to UI: " .. jsonData)
    else
        print("[ERROR] Global: Failed to send notification - element 'notification-data' not found")
    end
end

--[[
    Send a message to the Custom UI
    @param messageData - Table with message data:
        - header: string (optional)
        - body: string (required)
        - footer: string (optional)
        - style: "default" | "alert" | "confirm" | "prompt" (default: "default")
--]]
function sendMessageToUI(messageData)
    if not UI then
        print("[ERROR] Global: UI not available - check Global.xml has correct URL")
        return
    end

    print("[DEBUG] Global: Sending message to UI")

    -- Prepare data with type
    local uiData = {
        type = "message",
        messageHeader = messageData.header or "",
        messageBody = messageData.body or "",
        messageFooter = messageData.footer or "",
        messageStyle = messageData.style or "default"
    }

    local jsonData = JSON.encode(uiData)

    local success = pcall(function()
        UI.setAttribute("message-data", "value", jsonData)
    end)

    if success then
        print("[DEBUG] Global: Sent message to UI: " .. jsonData)
    else
        print("[ERROR] Global: Failed to send message - element 'message-data' not found")
    end
end

--[[
    Test function to verify UI is working
    Call this from TTS console: Global.call("testUI")
--]]
function testUI()
    if not UI then
        print("[ERROR] Global: UI not available")
        return
    end

    print("[TEST] Global: Testing UI connection...")

    -- Try to send a test notification
    sendNotificationToUI({
        title = "UI Test",
        message = "If you see this notification, the UI is working!",
        type = "success"
    })

    print("[TEST] Global: Test notification sent. Check if it appears on screen.")
end