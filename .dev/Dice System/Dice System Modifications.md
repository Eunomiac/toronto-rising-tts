# Dice System Modifications

1. A new constant has been added: `C.RollTypesAutoBroadcast`. Roll types in this table should not wait for the ST to click "Confirm" after the player has finished rolling, but immediately broadcast the result to all players.

2. Add a new toggleable custom modification to rolls: "CanRerollHunger". Defaulting to false, if true, players can reroll Hunger dice when spending Willpower.

3. Add a new input custom modification to rolls: "NumberOfRerolls". Defaulting to 1, this determines the number of times a player can spend Willpower to reroll dice after rolling.

4. Add a paired input + toggle custom modification to rolls: "NumberOfDiceRerolled". Defaulting to 3 and off, this determines the number of dice that will be rerolled when spending Willpower. If the toggle is enabled, the player will be able to reroll any number of dice they want, up to the number of dice rolled, excluding Hunger dice unless the "CanRerollHunger" toggle is also enabled.

5. When a player clicks "Spend Willpower", hunger dice should be locked unless "CanRerollHunger" is enabled. After a number of dice have been randomized/rerolled equal to "NumberOfDiceRerolled", all other dice should be immediately locked to prevent them from being knocked around by the newly rolled dice. If "NumberOfRerolls" is greater than 1, once the dice have settled, rerollable dice should be unlocked again.

6. When a roll is opened for a player OR when a player clicks either of their dice bags, their camera mode should be immediately set to "roll".

7. When a player clicks "Roll Dice", their camera mode should be immediately set to "diceTray". Once the dice have settled, their camera mode should be immediately set back to "roll".

8. When the results of a player's roll are broadcast OR if the player/ST cancels the roll, their camera mode should be immediately set to "default".
