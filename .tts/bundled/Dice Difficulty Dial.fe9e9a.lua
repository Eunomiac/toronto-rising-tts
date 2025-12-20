diffNumLabel = "Set Difficulty to "

function onSave()
    local data_to_save = {da=diceActive, wd=watchingDice}
    saved_data = JSON.encode(data_to_save)
    return saved_data
end

function onLoad(saved_data)
    if saved_data ~= "" then
        --Set up information off of loaded_data
        local loaded_data = JSON.decode(saved_data)
    end

    createButtons()
end

function deleteDice(obj, color)
    if color == Player.Black.color then
        for i, obj in ipairs(getAllObjects()) do
            if obj.name == "Die_10" then
              obj.destroy()
            end
        end

        setD10Diff(6, color)
    end
end

function setD10Diff(num, color) 
    if color == Player.Black.color then
        self.editButton({index=0, label=""..num})
        Global.setVar("d10Difficulty", num)
    end
end

--Button creation
function createButtons()
    self.createButton({click_function="click_none", function_owner=self, position={0.005,0.05,0.05}, height=0, width=0, font_size=375, label="6", font_color={1,1,1}})

    --Spawns number buttons and assigns a function trigger for each
    for i, pos in ipairs(buttonPositionList) do
        self.createButton({
            click_function="but"..i, function_owner=self,
            position=pos, height=150, width=150, tooltip = diffNumLabel..(i + 1)
        })
        local func = function(_,color) setD10Diff(i + 1, color) end
        self.setVar("but"..i, func)
    end

    --Spawns deleteCurrentDice button
    self.createButton({
        click_function="deleteDice", function_owner=self,
        position={0,0,0.73}, height=150, width=150, tooltip = "Clear and Reset"
    })

    
end

--Data table of positions for number buttons 1-9, in order
buttonPositionList = {
    {-0.435,0,0.59}, {-0.693,0,0.22}, {-0.693,0,-0.22}, {-0.435,0,-0.59},
    {0,0,-0.73}, {0.435,0,-0.59}, {0.693,0,-0.22}, {0.693,0,0.22}, {0.435,0,0.59}
}
