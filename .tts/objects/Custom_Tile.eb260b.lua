--I should like to thank MrStump, who has already done all the legwork which I shamefully steal.
--Set this to true while editing and false when you have finished
disableSave = false
buttonFontColor = {-1,-1,-1,255}
buttonColor = {1,1,1,0.0}
buttonScale = {0.2,0.2,0.2}

defaultButtonData = {
    textbox = {
                	{
          pos       = {0.0,0.1,0},
          rows      = 50,
          width     = 2500,
          font_size = 75,
          label     = "Notes",
          value     = "",
          alignment = 2
	                },
            	{
          pos       = {0.0,0.1,-0.9},
          rows      = 1,
          width     = 2500,
          font_size = 340,
          label     = "Click me to edit!",
          value     = "",
          alignment = 3
	                }
        }
}

--[[buttonScale = {0.4,0.4,0.4}
    
        }
]]

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
    createTextbox()
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