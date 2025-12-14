--[[ Hunger Dice Roller Instance --]]

local diceRoller = require("Scripts.dice-roller-shared")

--Initialize the dice roller as a HUNGER dice roller
diceRoller.initDiceRoller(self, {
    isHunger = true  -- This is a hunger dice roller
})