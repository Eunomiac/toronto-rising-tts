## Table of Contents

* Member Variables
* Function Summary
  * Functions
    * getTurnOrder()
    * getPreviousTurnColor()
    * getNextTurnColor()

# Turns

Turns, a static global class, is the in-game turns system. It allows you to modify the player turns in the same way that the in-game Turns menu does.
Example usage: `Turns.reverse_order = true`.

## Member Variables {#member-variables}

|Variable|Description|Type|
|---|---|---|
|enable|Enable/disable the turns system.|` boolean `|
|type|If the turn order is automatic or custom. 1=auto, 2=custom.|` int `|
|order|A table of strings, representing the player turn order.|` table `|
|reverse_order|Enable/disable reversing turn rotation direction.|` boolean `|
|skip_empty_hands|Enable/disable skipping empty hands.|` boolean `|
|disable_interactations|Enable/disable the blocking of players ability to interact with Objects when it is not their turn.|` boolean `|
|pass_turns|Enable/disable a player's ability to pass their turn to another.|` boolean `|
|turn_color|The color of the Player whose turn it is.|` string `|

## Function Summary {#function-summary}

### Functions {#functions}

|Function Name|Description|Return|
|---|---|---|
|getNextTurnColor()|Returns the Player Color string of the next player in the turn order.|return ` string `|
|getPreviousTurnColor()|Returns the Player Color string of the previous player in the turn order.|return ` string `|
|getTurnOrder()|Returns the current turn order.|return `table`|
