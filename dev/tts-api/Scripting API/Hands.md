## Table of Contents

* Member Variables
  * Member Variable Summary
* Member Variable Details
  * hiding
* Function Summary

# Hands

The static global `Hands` class allows you to control the behavior of Hand Zones.

## Member Variables {#member-variables}

### Member Variable Summary {#member-variable-summary}

|Variable|Description|Type| |
|---|---|---|---|
|enable|Whether hand zones are enabled i.e. hold objects.|` boolean `| |
|disable_unused|Whether hands zones belonging to a color without a seated player should be disabled.|` boolean `| |
|hiding|Determines which hand contents are hidden from which players.|` int `|[#hiding](#hiding)|

## Member Variable Details {#member-variable-details}

### hiding {#hiding}

[../types/](../types/)Determines which hands are hidden from which players.

|Value|Description|
|---|---|
|1|Default. The contents of a player's hands are only visible to the owner.|
|2|Reverse. The contents of a player's hands are visible to all other players, but not the owner.|
|3|Disable. Contents of all player hands are visible to all players.|

> **Example: Example**
> Make all hand contents visible to everyone.
>
> ```lua
> Hands.hiding = 3
> ```
>
> ```lua
> Hands.hiding = 3
> ```
>
## Function Summary {#function-summary}

|Function Name|Description|Return| |
|---|---|---|---|
|getHands()|Returns a table of all Hand Zone Objects in the game.|return `table`| |

---
