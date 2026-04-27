# Dice System Modifications

1. A new constant has been added: `C.RollTypesAutoBroadcast`. Roll types in this table should not wait for the ST to click "Confirm" after the player has finished rolling, but immediately broadcast the result to all players.

2. Before proceeding, ensure that there exists a fairly robust system for handling a variety of "custom roll modes" -- we don't want to have to reinvent the wheel every time we want to add a new varation or optional mechanic to the roll system.  Currently, we have a single custom roll mode: "Bestial Null", which is a very specific rule that occurs at a single in-game location, and results in Bestial Dice (i.e. Hunger dice that roll a 1) nullifying successful Normal dice, starting with criticals. So the first step is making sure that the Bestial Null rule isn't hard-coded as a unique code path, but rather as part of a scalable modular system that can be easily extended to support other custom roll modes -- of which we're about to add a few.

  2.a **Custom Roll Mode: "CanRerollHunger"** — `[Type: Toggle, Default: False]` If true, players can reroll Hunger dice when spending Willpower.

  2.b **Custom Roll Mode: "NumberOfRerolls"** — `[Type: InputField:Number, Default: 1]` This determines the number of times a player can spend Willpower to reroll dice after rolling. If `0`, the "Spend Willpower" button should not be shown to the player. If greater than `1`, the player should be given repeated opportunities to spend Willpower to reroll dice.

  2.c **Custom Roll Mode: "NumberOfDiceRerolled"** — `[Type: InputField:Number, Default: 3]` This determines the number of dice that can be rerolled when spending Willpower. If set to `0` or a negative number, the player can reroll _any number_ of dice, excluding Hunger dice unless the "CanRerollHunger" custom roll mode is also enabled.

3. We're running into problems where a player rerolls some dice after spending Willpower, and those dice tumble back onto the dice tray and knock other dice around, changing their values. So, when a player clicks "Spend Willpower", all Hunger dice should be locked immediately (unless "CanRerollHunger" is enabled). Then, monitor the number of times the player randomizes a die on the dice tray. As soon as they have randomized the maximum number of dice they can reroll, immediately lock all other dice (hopefully preventing them from being bumped around). If "NumberOfRerolls" is greater than 1, once the dice have settled, rerollable dice should be unlocked again and the option to spend Willpower should be shown again.

4. When a roll is opened for a player OR when a player clicks either of their dice bags, their camera mode should be immediately set to "roll".

5. When a player clicks "Roll Dice" OR "Spend Willpower", their camera mode should be immediately set to "diceTray". Once the dice have settled, their camera mode should be immediately set back to "roll".

6. When the results of a player's roll are broadcast OR if the player/ST cancels the roll, their camera mode should be immediately set to "default".
