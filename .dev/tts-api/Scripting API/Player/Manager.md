## Table of Contents

* Function Summary
* Actions
* Function Details
  * getAvailableColors()
  * getColors()
  * getPlayers()
  * getSpectators()

# Player Manager {#player-manager}

`Player` is a global which allows you to retrieve [Player instances](../instance/)and [Player colors](../colors/).

## Function Summary {#function-summary}

|Function Name|Return|Description| |
|---|---|---|---|
|getAvailableColors()|return ` table `|Returns a table of strings of every valid seat color at the current table. Returned colors are in the default order.| |
|getColors()|return ` table `|Returns a table of strings of every possible seat color. Returned colors are in the default order.| |
|getPlayers()|return ` table `|Returns a table of all [Player instances](../instance/).|[#getplayers](#getplayers)|
|getSpectators()|return ` table `|Returns a table of all spectator (Grey) [Player instances](../instance/).|[#getspectators](#getspectators)|

## Actions {#actions}

The [onPlayerAction](../../events/#onplayeraction)event allows you to handle player actions. A list of player actions
is available as ` Player.Action `.
> **Example: Example**
> Log all available player actions:
>
> ```lua
> log(Player.Action)
> ```
>
> ```lua
> log(Player.Action)
> ```
>
For more details about these actions, please refer to the documentation for [onPlayerAction](../../events/#onplayeraction).

---

## Function Details {#function-details}

### getPlayers() {#getplayers}

[../../types/](../../types/)Returns a table of all [Player instances](../instance/).
> **Example: Example**
> Blindfold all players.
>
> ```lua
> for _, player in ipairs(Player.getPlayers()) do
> player.blindfolded = true
> end
> ```
>
> ```lua
> for _, player in ipairs(Player.getPlayers()) do
> player.blindfolded = true
> end
> ```

---

### getSpectators() {#getspectators}

[../../types/](../../types/)Returns a table of all spectator (Grey) [Player instances](../instance/).
> **Example: Example**
> Print the steam name of all spectators.
>
> ```lua
> for _, spectator in ipairs(Player.getSpectators()) do
> print(spectator.steam_name)
> end
> ```
>
> ```lua
> for _, spectator in ipairs(Player.getSpectators()) do
> print(spectator.steam_name)
> end
> ```
