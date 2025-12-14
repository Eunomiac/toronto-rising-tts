--[[
    Example TTS Script Template
    This is a basic template for Tabletop Simulator scripting
--]]

-- Global variables (accessible throughout the script)
local scriptName = "Example Script"
local version = "1.0.0"

--[[
    Called when the script loads or when the object is spawned
    This is where you initialize your script
--]]
function onLoad()
    print(string.format("%s v%s loaded!", scriptName, version))

    -- Example: Set up a button
    -- self.createButton({
    --     click_function = "buttonClick",
    --     function_owner = self,
    --     label = "Click Me",
    --     position = {0, 0.5, 0},
    --     rotation = {0, 0, 0},
    --     width = 500,
    --     height = 200,
    --     font_size = 100
    -- })
end

--[[
    Called when an object enters a scripting zone
    @param zone - The scripting zone object
    @param object - The object that entered the zone
--]]
function onObjectEnterScriptingZone(zone, object)
    print(string.format("Object %s entered zone %s", object.getName(), zone.getName()))
end

--[[
    Called when an object leaves a scripting zone
    @param zone - The scripting zone object
    @param object - The object that left the zone
--]]
function onObjectLeaveScriptingZone(zone, object)
    print(string.format("Object %s left zone %s", object.getName(), zone.getName()))
end

--[[
    Example button click function
    Note: Function name must match the click_function in createButton
--]]
function buttonClick(obj, color, alt_click)
    print("Button clicked!")
    -- Your button logic here
end

--[[
    Called when an object is clicked
    @param clicked_object - The object that was clicked
    @param player_color - The color of the player who clicked
--]]
function onObjectEnterContainer(container, object)
    print(string.format("Object %s entered container %s", object.getName(), container.getName()))
end
