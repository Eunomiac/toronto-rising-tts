--[[
    Custom UI/HUD Example for Tabletop Simulator
    This script demonstrates how to create and interact with custom HTML UI
--]]

-- Global variables
local uiID = "torontoRisingHUD"
local uiURL = "file:///" .. self.getScriptingGlobalValue("UI_PATH") .. "/index.html"

--[[
    Called when the script loads
    Sets up the custom UI
--]]
function onLoad()
    print("Custom UI script loaded")
    
    -- Get the absolute path to the UI folder
    -- Note: You'll need to set this path in your TTS mod
    local uiPath = self.getCustomObject().getCustomAsset("UI/index.html")
    
    if uiPath then
        -- Create the custom UI
        createCustomUI()
    else
        print("Warning: UI path not found. Make sure to include UI files in your mod.")
    end
end

--[[
    Creates the custom HTML UI
    This displays the HTML page as an overlay in TTS
--]]
function createCustomUI()
    -- Create a custom asset bundle or use the HTML directly
    -- Method 1: Using createButton with HTML content (for simple UIs)
    -- Method 2: Using custom assets (for complex UIs with external files)
    
    -- For this example, we'll use the UI.createButton approach
    -- which allows embedding HTML directly
    
    -- Note: TTS requires the HTML to be hosted or embedded
    -- You can use a local web server or embed the HTML as a string
    
    print("Custom UI created with ID: " .. uiID)
    
    -- Example: Create a button that opens the UI
    self.createButton({
        click_function = "openCustomUI",
        function_owner = self,
        label = "Open HUD",
        position = {0, 0.5, 0},
        rotation = {0, 0, 0},
        width = 400,
        height = 100,
        font_size = 50
    })
end

--[[
    Opens the custom UI
    This function is called when the button is clicked
--]]
function openCustomUI(obj, color, alt_click)
    print("Opening custom UI...")
    
    -- In TTS, you typically use UI.show() to display custom HTML
    -- The HTML file needs to be accessible via URL or embedded
    
    -- Example: Show a custom HTML panel
    -- UI.show("customHTML")
    
    -- For file-based UI, you would use:
    -- UI.show("file:///path/to/UI/index.html")
    
    -- Update the UI with current game state
    updateUI()
end

--[[
    Updates the custom UI with current game state
    This sends data to the JavaScript in the HTML page
--]]
function updateUI()
    -- Get current player information
    local playerColor = "White" -- Example: get current player
    local playerStatus = "Active"
    
    -- Send message to the UI JavaScript
    -- This uses the UI.setAttribute or similar method
    -- UI.setAttribute("player-name", "text", playerColor)
    -- UI.setAttribute("player-status", "text", playerStatus)
    
    print(string.format("UI updated: Player=%s, Status=%s", playerColor, playerStatus))
end

--[[
    Receives messages from the custom UI
    This is called when JavaScript in the HTML sends data back to TTS
    @param player - The player who triggered the action
    @param data - Data sent from the UI
--]]
function onCustomMessage(player, data)
    print(string.format("Received message from %s: %s", player.color, data))
    
    if data.action == "buttonClick" then
        if data.buttonId == "action-btn" then
            handleActionButton(player)
        elseif data.buttonId == "reset-btn" then
            handleResetButton(player)
        end
    end
end

--[[
    Handles action button click from UI
    @param player - The player who clicked the button
--]]
function handleActionButton(player)
    print(string.format("Action button clicked by %s", player.color))
    
    -- Your game logic here
    -- Example: Trigger a game action
    broadcastToAll(string.format("%s performed an action!", player.color), {1, 1, 1})
end

--[[
    Handles reset button click from UI
    @param player - The player who clicked the button
--]]
function handleResetButton(player)
    print(string.format("Reset button clicked by %s", player.color))
    
    -- Your reset logic here
    broadcastToAll(string.format("%s reset the game!", player.color), {1, 0, 0})
end

--[[
    Example: Update UI when game state changes
    Call this function whenever you need to refresh the UI
--]]
function refreshUI()
    updateUI()
end

