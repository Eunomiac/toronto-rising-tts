--[[    Character Sheet Template    by: MrStump

You can set up your own character sheet if you follow these steps.

Step 1) Change the character sheet image
    -Right click on the character sheet, click Custom
    -Replace the image URL with one for your character sheet
    -Click import, make sure your sheet loads
    -SAVE THE GAME (the table setup)
    -LOAD FROM THAT SAVE YOU JUST MADE

Step 2) Edit script to fit your character sheet
    -Below you will see some general options, and then the big data table
    -The data table is what determines how many of which buttons are made
        -Checkboxes
        -Counters
        -Textboxes
    -By default, there are 3 of each. You can add more or remove entries
    -If you intend to add/remove, be sure only to add/remove ENTRIES
        -This is what an entry looks like:
            {
                pos   = {-0.977,0.1,-0.589},
                size  = 800,
                state = false
            },
        -Deleting the whole thing would remove that specific item on the sheet
        -Copy and pasting it after another entry would create another
    -Each entry type has unique data points (pos, size, state, etc)
        -Do not try to add in your own data points or remove them individually
        -There is a summary of what each point does at the top of its category

Step 3) Save and check script changes
    -Hit Save & Apply in the script window to save your code
    -You can edit your code as needed and Save+Apply as often as needed
    -When you are finished, make disableSave = false below then Save+apply
        -This enables saving, so your sheet will remember whats on it.

Bonus) Finding/Editing Positions for elements
    I have included a tool to get positions for buttons in {x,y,z} form
    Place it where you want the center of your element to be
    Then copy the table from the notes (lower right of screen)
        You can highlight it and CTRL+C
    Paste it into the data table where needed (pos=)
    If you want to manually tweek the values:
        {0,0,0} is the center of the character sheet
        {1,0,0} is right, {-1,0,0} is left
        {0,0,-1} is up, {0,0,1} is down
        0.1 for Y is the height off of the page.
            If it was 0, it would be down inside the model of the sheet

Begin editing below:    ]]

--Set this to true if you do not want Blood Potency related values to
--update automatically (if you are using homebrew or custom values for example)
disablePotencyUpdate = false

--Set this to true while editing and false when you have finished
disableSave = false
--Remember to set this to false once you are done making changes
--Then, after you save & apply it, save your game too

--Color information for button text (r,g,b, values of 0-1)
buttonFontColor = {0,0,0}
--Color information for button background
buttonColor = {1,1,1}
--Change scale of button (Avoid changing if possible)
buttonScale = {0.1,0.1,0.1}

--This is the button placement information
defaultButtonData = {
    --Add checkboxes
    checkbox = {
        --[[
        pos   = the position (pasted from the helper tool)
        size  = height/width/font_size for checkbox
        state = default starting value for checkbox (true=checked, false=not)
        ]]

        --Advantages & Flaws
        {pos   = {-0.288,0.1,-0.7}, size  = 160, state = false, tag = "adv1"},
        {pos   = {-0.2345,0.1,-0.7}, size  = 160, state = false, tag = "adv1"},
        {pos   = {-0.181,0.1,-0.7}, size  = 160, state = false, tag = "adv1"},
        {pos   = {-0.1275,0.1,-0.7}, size  = 160, state = false, tag = "adv1"},
        {pos   = {-0.074,0.1,-0.7}, size  = 160, state = false, tag = "adv1"},

        {pos   = {-0.288,0.1,-0.5782}, size  = 160, state = false, tag = "adv2"},
        {pos   = {-0.2345,0.1,-0.5782}, size  = 160, state = false, tag = "adv2"},
        {pos   = {-0.181,0.1,-0.5782}, size  = 160, state = false, tag = "adv2"},
        {pos   = {-0.1275,0.1,-0.5782}, size  = 160, state = false, tag = "adv2"},
        {pos   = {-0.074,0.1,-0.5782}, size  = 160, state = false, tag = "adv2"},

        {pos   = {-0.288,0.1,-0.4564}, size  = 160, state = false, tag = "adv3"},
        {pos   = {-0.2345,0.1,-0.4564}, size  = 160, state = false, tag = "adv3"},
        {pos   = {-0.181,0.1,-0.4564}, size  = 160, state = false, tag = "adv3"},
        {pos   = {-0.1275,0.1,-0.4564}, size  = 160, state = false, tag = "adv3"},
        {pos   = {-0.074,0.1,-0.4564}, size  = 160, state = false, tag = "adv3"},

        {pos   = {-0.288,0.1,-0.3346}, size  = 160, state = false, tag = "adv4"},
        {pos   = {-0.2345,0.1,-0.3346}, size  = 160, state = false, tag = "adv4"},
        {pos   = {-0.181,0.1,-0.3346}, size  = 160, state = false, tag = "adv4"},
        {pos   = {-0.1275,0.1,-0.3346}, size  = 160, state = false, tag = "adv4"},
        {pos   = {-0.074,0.1,-0.3346}, size  = 160, state = false, tag = "adv4"},

        {pos   = {-0.288,0.1,-0.2128}, size  = 160, state = false, tag = "adv5"},
        {pos   = {-0.2345,0.1,-0.2128}, size  = 160, state = false, tag = "adv5"},
        {pos   = {-0.181,0.1,-0.2128}, size  = 160, state = false, tag = "adv5"},
        {pos   = {-0.1275,0.1,-0.2128}, size  = 160, state = false, tag = "adv5"},
        {pos   = {-0.074,0.1,-0.2128}, size  = 160, state = false, tag = "adv5"},

        {pos   = {-0.288,0.1,-0.091}, size  = 160, state = false, tag = "adv6"},
        {pos   = {-0.2345,0.1,-0.091}, size  = 160, state = false, tag = "adv6"},
        {pos   = {-0.181,0.1,-0.091}, size  = 160, state = false, tag = "adv6"},
        {pos   = {-0.1275,0.1,-0.091}, size  = 160, state = false, tag = "adv6"},
        {pos   = {-0.074,0.1,-0.091}, size  = 160, state = false, tag = "adv6"},

        {pos   = {-0.288,0.1,0.0308}, size  = 160, state = false, tag = "adv7"},
        {pos   = {-0.2345,0.1,0.0308}, size  = 160, state = false, tag = "adv7"},
        {pos   = {-0.181,0.1,0.0308}, size  = 160, state = false, tag = "adv7"},
        {pos   = {-0.1275,0.1,0.0308}, size  = 160, state = false, tag = "adv7"},
        {pos   = {-0.074,0.1,0.0308}, size  = 160, state = false, tag = "adv7"},

        {pos   = {-0.288,0.1,0.1526}, size  = 160, state = false, tag = "adv8"},
        {pos   = {-0.2345,0.1,0.1526}, size  = 160, state = false, tag = "adv8"},
        {pos   = {-0.181,0.1,0.1526}, size  = 160, state = false, tag = "adv8"},
        {pos   = {-0.1275,0.1,0.1526}, size  = 160, state = false, tag = "adv8"},
        {pos   = {-0.074,0.1,0.1526}, size  = 160, state = false, tag = "adv8"},

        {pos   = {-0.288,0.1,0.2744}, size  = 160, state = false, tag = "adv9"},
        {pos   = {-0.2345,0.1,0.2744}, size  = 160, state = false, tag = "adv9"},
        {pos   = {-0.181,0.1,0.2744}, size  = 160, state = false, tag = "adv9"},
        {pos   = {-0.1275,0.1,0.2744}, size  = 160, state = false, tag = "adv9"},
        {pos   = {-0.074,0.1,0.2744}, size  = 160, state = false, tag = "adv9"},

        {pos   = {-0.288,0.1,0.3962}, size  = 160, state = false, tag = "adv10"},
        {pos   = {-0.2345,0.1,0.3962}, size  = 160, state = false, tag = "adv10"},
        {pos   = {-0.181,0.1,0.3962}, size  = 160, state = false, tag = "adv10"},
        {pos   = {-0.1275,0.1,0.3962}, size  = 160, state = false, tag = "adv10"},
        {pos   = {-0.074,0.1,0.3962}, size  = 160, state = false, tag = "adv10"},

        {pos   = {-0.288,0.1,0.518}, size  = 160, state = false, tag = "adv11"},
        {pos   = {-0.2345,0.1,0.518}, size  = 160, state = false, tag = "adv11"},
        {pos   = {-0.181,0.1,0.518}, size  = 160, state = false, tag = "adv11"},
        {pos   = {-0.1275,0.1,0.518}, size  = 160, state = false, tag = "adv11"},
        {pos   = {-0.074,0.1,0.518}, size  = 160, state = false, tag = "adv11"},


        --Blood Potency
        {pos   = {0.642,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {0.6955,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {0.749,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {0.8025,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {0.856,0.1,-0.81}, size  = 160, state = false, tag = "potency"},

        {pos   = {0.925,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {0.9785,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {1.032,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {1.0855,0.1,-0.81}, size  = 160, state = false, tag = "potency"},
        {pos   = {1.139,0.1,-0.81}, size  = 160, state = false, tag = "potency"},


        --Play Mode
        {pos   = {1.5,0.1,2}, size  = 800, state = false, tag = "edit"},
        {pos   = {0,0,0}, size  = 0, state = false, tag = "dummy"},


        --End of checkboxes
    },

   
    --Add counters that have a + and - button
    counter = {
        --[[
        pos    = the position (pasted from the helper tool)
        size   = height/width/font_size for counter
        value  = default starting value for counter
        hideBG = if background of counter is hidden (true=hidden, false=not)
        ]]

        --End of counters
    },
    --Add editable text boxes
    textbox = {
        --[[
        pos       = the position (pasted from the helper tool)
        rows      = how many lines of text you want for this box
        width     = how wide the text box is
        font_size = size of text. This and "rows" effect overall height
        label     = what is shown when there is no text. "" = nothing
        value     = text entered into box. "" = nothing
        alignment = Number to indicate how you want text aligned
                    (1=Automatic, 2=Left, 3=Center, 4=Right, 5=Justified)
        ]]
        --Tenets
        {   pos       = {-0.885,0.1,-1.26},
            rows      = 16, width = 4000, font_size = 200,
            label     = "", value     = "", alignment = 2},
        --Touchstones
        {   pos       = {0.01,0.1,-1.26},
            rows      = 16, width = 4000, font_size = 200,
            label     = "", value     = "", alignment = 2},
        --Clan Bane
        {   pos       = {0.9,0.1,-1.26},
            rows      = 16, width = 4000, font_size = 200,
            label     = "", value     = "", alignment = 2},

        --Blood Surge
        {   pos       = {0.36,0.1,-0.63},
            rows      = 2, width = 2800, font_size = 200,
            label     = "Blood Surge", value     = "", alignment = 3},
        --Mend Amount
        {   pos       = {1,0.1,-0.63},
            rows      = 2, width = 2800, font_size = 200,
            label     = "Mend Amount", value     = "", alignment = 3},
        --Power Bonus
        {   pos       = {0.36,0.1,-0.41},
            rows      = 2, width = 2800, font_size = 200,
            label     = "Power Bonus", value     = "", alignment = 3},
        --Rouse Re-Roll
        {   pos       = {1,0.1,-0.41},
            rows      = 2, width = 2800, font_size = 200,
            label     = "Rouse Re-Roll", value     = "", alignment = 3},
        --Feeding Penalty
        {   pos       = {0.36,0.1,-0.19},
            rows      = 3, width = 2800, font_size = 200,
            label     = "Feeding Penalty", value     = "", alignment = 3},
        --Bane Severity
        {   pos       = {1,0.1,-0.2},
            rows      = 2, width = 2800, font_size = 200,
            label     = "Bane Severity", value     = "", alignment = 3},

        --Advantages & Flaws
        {   pos       = {-0.8,0.1,-0.7},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,-0.578},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,-0.456},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,-0.334},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,-0.212},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,-0.09},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,0.032},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,0.154},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,0.276},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,0.398},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.8,0.1,0.52},
            rows      = 1, width = 4400, font_size = 300,
            label     = "", value     = "", alignment = 2},

        --XP
        {   pos       = {0.91,0.1,-0.025},
            rows      = 1, width = 3400, font_size = 300,
            label     = "", value     = "", alignment = 3},
        {   pos       = {0.91,0.1,0.1},
            rows      = 1, width = 3400, font_size = 300,
            label     = "", value     = "", alignment = 3},

        --Details
        {   pos       = {0.8,0.1,0.27},
            rows      = 1, width = 4500, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.8,0.1,0.377},
            rows      = 1, width = 4500, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.8,0.1,0.483},
            rows      = 1, width = 4500, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.8,0.1,0.59},
            rows      = 1, width = 4500, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.67,0.1,0.78},
            rows      = 2, width = 5800, font_size = 200,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.67,0.1,1},
            rows      = 2, width = 5800, font_size = 200,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.67,0.1,1.48},
            rows      = 16, width = 5800, font_size = 200,
            label     = "", value     = "", alignment = 2},

        --Notes
        {   pos       = {-0.68,0.1,1.25},
            rows      = 26, width = 5800, font_size = 200,
            label     = "", value     = "", alignment = 2},

        --End of textboxes
    }
}



--Lua beyond this point, I recommend doing something more fun with your life



--Save function
function updateSave()
    saved_data = JSON.encode(ref_buttonData)
    if disableSave==true then saved_data="" end
    self.script_state = saved_data
end

--Startup procedure
function onload(saved_data)
    if disableSave==true then saved_data="" end
    if saved_data ~= "" then
        local loaded_data = JSON.decode(saved_data)
        ref_buttonData = loaded_data
    else
        ref_buttonData = defaultButtonData
    end

    spawnedButtonCount = 0
    createCheckbox()
    createCounter()
    createTextbox()
    updateBloodPotencyValues()
end



--Click functions for buttons



--Checks or unchecks the given box (change colour)
function click_checkbox(tableIndex, buttonIndex)

if ref_buttonData.checkbox[tableIndex].tag == "edit" then
    if ref_buttonData.checkbox[tableIndex].state == true then
        ref_buttonData.checkbox[tableIndex].state = false
        self.editButton({index=buttonIndex, color="White"})
    else
        ref_buttonData.checkbox[tableIndex].state = true
        self.editButton({index=buttonIndex, color="Black"})
    end
else
for i, data in ipairs(ref_buttonData.checkbox) do
if data.tag == "edit" then
if data.state == false then
    if ref_buttonData.checkbox[tableIndex].state == true then
        if ref_buttonData.checkbox[tableIndex+1].tag == ref_buttonData.checkbox[tableIndex].tag then
            if ref_buttonData.checkbox[tableIndex+1].state == true then
                for i, data in ipairs(ref_buttonData.checkbox) do
                    if data.tag == ref_buttonData.checkbox[tableIndex].tag then
                        if i > tableIndex then
                            ref_buttonData.checkbox[i].state = false
                            self.editButton({index=buttonIndex+i-tableIndex, color="White"})
                        end
                    end
                end
            else
                ref_buttonData.checkbox[tableIndex].state = false
                self.editButton({index=buttonIndex, color="White"})
            end
        else
            ref_buttonData.checkbox[tableIndex].state = false
            self.editButton({index=buttonIndex, color="White"})
        end
    else
        for i, data in ipairs(ref_buttonData.checkbox) do
            if data.tag == ref_buttonData.checkbox[tableIndex].tag then
                if i <= tableIndex then
                    ref_buttonData.checkbox[i].state = true
                    self.editButton({index=buttonIndex+i-tableIndex, color="Black"})
                end
            end
        end
    end

    if ref_buttonData.checkbox[tableIndex].tag == "potency" then
        updateBloodPotencyValues()
    end
elseif data.state == true then
        local dheight = 5
        for i, data in ipairs(ref_buttonData.checkbox) do
            if data.tag == ref_buttonData.checkbox[tableIndex].tag and data.state == true then
                local dice = spawnObject({type = "Custom_Dice", position = {0,dheight,0}})
                dice.setCustomObject({type = 3, image = "https://steamusercontent-a.akamaihd.net/ugc/957476100395980607/FBE78762303A5315D6FB0697D051C7B49D955054/"})
                dice.setName(ref_buttonData.checkbox[tableIndex].tag)
                dice.setLuaScript("local isRolling = false\nhighlightDuration = 30\n\nfunction onUpdate()\n    if not self.resting then \n        self.highlightOff()\n        isRolling = true\n    elseif isRolling and self.resting then\n        isRolling = false\n        local value = self.getValue()\n        if value == 1 then\n            self.highlightOn({0.856, 0.1, 0.094}, highlightDuration)\n        elseif value == 10 then\n            self.highlightOn({0.192, 0.701, 0.168}, highlightDuration)\n        elseif value >= 6 then \n            self.highlightOn({1, 1, 1}, highlightDuration) \n        else\n            self.highlightOff()\n        end\n    end\nend")
                dice.use_hands = true
                dheight = dheight + 1
            end
        end
end
end
end
end
    updateSave()
end


-- Update values dependent on Blood Potency (according to basic rules)
function updateBloodPotencyValues()
    if disablePotencyUpdate == false then
        bp = 0
        for i, data in ipairs(ref_buttonData.checkbox) do
            if data.tag == "potency" then
                if data.state == true then
                    bp = bp + 1
                end
            end
        end
        for i, data in ipairs(self.getInputs()) do
            if data.label == "Blood Surge" then
                self.editInput({index = data.index,
                value = "Add "..(math.ceil(bp / 2)).." die"})
            end
            if data.label == "Mend Amount" then
                self.editInput({index = data.index,
                value = (math.ceil(bp / 2 + 0.5) - math.floor(math.max(bp,5)/6)).." point of"..
                "\nsuperficial damage"})
            end
            if data.label == "Power Bonus" then
                self.editInput({index = data.index,
                value = "Add "..(math.floor(bp / 2)).." die"})
            end
            if data.label == "Rouse Re-Roll" then
                self.editInput({index = data.index,
                value = "Level "..(math.ceil(bp / 2))..
                "\n and below"})
            end
            if data.label == "Feeding Penalty" then
                self.editInput({index = data.index,
                value = "Animal / bag blood slake "..(math.max(0,math.min(100,(150-bp*50)))).."%"..
                "\nSlake "..(math.max(0,math.ceil(bp / 4 - 1.25) + math.floor(math.min(bp,4)/4))).." less Hunger per human"..
                "\nMust kill for Hunger below "..(math.max(1,math.floor(bp / 3 + 0.5)))})
            end
            if data.label == "Bane Severity" then
                self.editInput({index = data.index,
                value = (math.ceil(bp / 2))})
            end
        end
    end
end


--Applies value to given counter display
function click_counter(tableIndex, buttonIndex, amount)
    ref_buttonData.counter[tableIndex].value = ref_buttonData.counter[tableIndex].value + amount
    self.editButton({index=buttonIndex, label=ref_buttonData.counter[tableIndex].value})
    updateSave()
end

--Updates saved value for given text box
function click_textbox(i, value, selected)
    if selected == false then
        ref_buttonData.textbox[i].value = value
        updateSave()
    end
end

--Dud function for if you have a background on a counter
function click_none() end



--Button creation



--Makes checkboxes
function createCheckbox()
    for i, data in ipairs(ref_buttonData.checkbox) do
        --Sets up reference function
        local buttonNumber = spawnedButtonCount
        local funcName = "checkbox"..i
        local func = function() click_checkbox(i, buttonNumber) end
        self.setVar(funcName, func)
        --Sets up label
        local label = ""
        local bc="White"
        if data.state==true then bc="Black" end
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=data.pos, height=data.size, width=data.size,
            font_size=data.size, scale=buttonScale,
            color=bc, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1
    end
end

--Makes counters
function createCounter()
    for i, data in ipairs(ref_buttonData.counter) do
        --Sets up display
        local displayNumber = spawnedButtonCount
        --Sets up label
        local label = data.value
        --Sets height/width for display
        local size = data.size
        if data.hideBG == true then size = 0 end
        --Creates button and counts it
        self.createButton({
            label=label, click_function="click_none", function_owner=self,
            position=data.pos, height=size, width=size,
            font_size=data.size, scale=buttonScale,
            color=buttonColor, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1

        --Sets up add 1
        local funcName = "counterAdd"..i
        local func = function() click_counter(i, displayNumber, 1) end
        self.setVar(funcName, func)
        --Sets up label
        local label = "+"
        --Sets up position
        local offsetDistance = (data.size/2 + data.size/4) * (buttonScale[1] * 0.002)
        local pos = {data.pos[1] + offsetDistance, data.pos[2], data.pos[3]}
        --Sets up size
        local size = data.size / 2
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=pos, height=size, width=size,
            font_size=size, scale=buttonScale,
            color=buttonColor, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1

        --Sets up subtract 1
        local funcName = "counterSub"..i
        local func = function() click_counter(i, displayNumber, -1) end
        self.setVar(funcName, func)
        --Sets up label
        local label = "-"
        --Set up position
        local pos = {data.pos[1] - offsetDistance, data.pos[2], data.pos[3]}
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=pos, height=size, width=size,
            font_size=size, scale=buttonScale,
            color=buttonColor, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1
    end
end

function createTextbox()
    for i, data in ipairs(ref_buttonData.textbox) do
        --Sets up reference function
        local funcName = "textbox"..i
        local func = function(_,_,val,sel) click_textbox(i,val,sel) end
        self.setVar(funcName, func)

        self.createInput({
            input_function = funcName,
            function_owner = self,
            label          = data.label,
            alignment      = data.alignment,
            position       = data.pos,
            scale          = buttonScale,
            width          = data.width,
            height         = (data.font_size*data.rows)+24,
            font_size      = data.font_size,
            color          = buttonColor,
            font_color     = buttonFontColor,
            value          = data.value,
        })
    end
end