## Table of Contents

* Function Summary
  * Global Functions
    * Rewind State Functions
    * Hotkey Functions
  * Message Functions
* Function Details
  * Global Function Details
    * addContextMenuItem(...)
    * clearContextMenu()
    * copy(...)
    * destroyObject(...)
    * flipTable()
    * getAllObjects()
    * getObjectFromGUID(...)
    * getObjects()
    * getObjectsWithAllTags(...)
    * getObjectsWithAnyTags(...)
    * getObjectsWithTag(...)
    * getSeatedPlayers()
    * group(...)
    * paste(...)
    * setLookingForPlayers(...)
    * spawnObject(...)
    * spawnObjectData(...)
    * spawnObjectJSON(...)
    * startLuaCoroutine(...)
    * stringColorToRGB(...)
  * Rewind State Function Details
    * allowRewindStore()
    * storeRewindState(...)
  * Hotkey Function Details
    * addHotkey(...)
    * clearHotkeys()
    * showHotkeyConfig()
  * Message Function Details
    * broadcastToAll(...)
    * broadcastToColor(...)
    * log(...)
    * logString(...)
    * logStyle(...)
    * print(...)
    * printToAll(...)
    * printToColor(...)
    * sendExternalMessage(...)
  * Hand Select Mode Function Details
    * chooseInHand(...)
    * chooseInHandOrCancel(...)
    * clearChooseInHand(...)
    * currentChooseInHand(...)

# Base

These are a loose collection of functions which can be used to perform a variety of actions within Tabletop Simulator.
These functions can utilize in-game Objects, but none of them can be enacted on in-game Objects. They all deal with the game space.

## Function Summary {#function-summary}

### Global Functions {#global-functions}

General functions which work within any script.

|Function Name|Description|Return| |
|---|---|---|---|
|addContextMenuItem( `string` label, ` function ` toRunFunc, ` boolean ` keep_open, ` boolean ` require_table)|Adds a menu item to the Global right-click context menu. Global menu is shown when player right-clicks on empty space or table.|return ` boolean `|[#addcontextmenuitem](#addcontextmenuitem)|
|clearContextMenu()|Clears all menu items added by function [addContextMenuItem(...)](#addcontextmenuitem).|return ` boolean `| |
|chooseInHand( ` string ` label, ` int ` min_selected_count, ` int ` min_selected_count, ` string ` prompt, ` table ` player_colors)|Start hand select mode.|return ` table `|[#chooseinhand](#chooseinhand)|
|chooseInHandOrCancel( ` string ` label, ` int ` min_selected_count, ` int ` min_selected_count, ` string ` prompt, ` table ` player_colors)|Start hand select mode with additional Cancel button.|return ` table `|[#chooseinhandorcancel](#chooseinhandorcancel)|
|clearChooseInHand( ` table ` player_colors)|Clear hand select mode.|return ` table `|[#clearchooseinhand](#clearchooseinhand)|
|currentChooseInHand( ` string ` player_color)|Get label of current hand select mode for given player.|return ` string `|[#currentchooseinhand](#currentchooseinhand)|
|copy( ` table ` object_list)|Copy a list of Objects to the clipboard. Works with [paste(...)](#paste).|return ` boolean `|[#copy](#copy)|
|destroyObject( ` object ` obj)|Destroy an Object.|return ` boolean `|[#destroyobject](#destroyobject)|
|flipTable()|Flip the table.|return ` boolean `| |
|getAllObjects()|` deprecated ` Use [getObjects()](#getobjects). Returns a Table of all [Objects](../object/) in the game except hand zones.|return ` table `| |
|getObjectFromGUID( ` string ` guid)|Returns Object by its GUID. Will return ` nil ` if this GUID doesn't currently exist.|return ` object `|[#getobjectfromguid](#getobjectfromguid)|
|getObjects()|Returns a Table of all [Objects](../object/) in the game.|return ` table `|[#getobjects](#getobjects)|
|getObjectsWithTag( ` string ` tag)|Returns Table of all [Objects](../object/) which have the specified tag attached.|return ` table `|[#getobjectswithtag](#getobjectswithtag)|
|getObjectsWithAnyTags( ` table ` tags)|Returns Table of all [Objects](../object/) which have at least one of the specified tags attached.|return ` table `|[#getobjectswithanytags](#getobjectswithanytags)|
|getObjectsWithAllTags( ` table ` tags)|Returns Table of all [Objects](../object/) which have all of the specified tags attached.|return ` table `|[#getobjectswithalltags](#getobjectswithalltags)|
|getSeatedPlayers()|Returns a Table of the [Player Colors](../player/colors/) strings of seated players.|return ` table `| |
|group( ` table ` objects)|Groups objects together, like how the G key does for players.|return ` table `|[#group](#group)|
|paste( ` table ` parameters)|Pastes Objects in-game that were copied to the in-game clipboard. Works with [copy(...)](#copy).|return ` table `|[#paste](#paste)|
|setLookingForPlayers( ` boolean ` lfp)|Enables/disables looking for group. This is visible in the server browsers, indicating if you are recruiting for a game.|return ` boolean `| |
|spawnObject( ` table ` parameters)|Spawns an object.|return ` object `|[#spawnobject](#spawnobject)|
|spawnObjectData( ` table ` parameters)|Spawns an object from a data table.|return ` object `|[#spawnobjectdata](#spawnobjectdata)|
|spawnObjectJSON( ` table ` parameters)|Spawns an object from a JSON string.|return ` object `|[#spawnobjectjson](#spawnobjectjson)|
|startLuaCoroutine( ` object ` function_owner, ` string ` function_name)|Start a coroutine.|return ` boolean `|[#startluacoroutine](#startluacoroutine)|
|stringColorToRGB( ` string ` player_color)|Converts a [Player Color](../player/colors/) string into a Color Table for tinting.|return ` color `|[#stringcolortorgb](#stringcolortorgb)|

#### Rewind State Functions {#rewind-state-functions}

Rewind states are stored periodically. If a store happens **in the middle of a complex scripted change**, you can end up with bad intermediate states. These helpers let you control when rewinds are saved.

|Function Name|Description|Return| |
|---|---|---|---|
|storeRewindState( ` function ` and_then, ` boolean ` block_further_stores)|Stores a rewind state.|return ` boolean `|[#storerewindstate](#storerewindstate)|
|allowRewindStore()|Clears the block on storing rewind states.|return ` boolean `|[#allowrewindstore](#allowrewindstore)|

#### Hotkey Functions {#hotkey-functions}

|Function Name|Description|Return| |
|---|---|---|---|
|addHotkey( ` string ` label, ` function ` toRunFunc, ` boolean ` trigger_on_key_up)|Adds a bindable hotkey to the game.|return ` boolean `|[#addhotkey](#addhotkey)|
|clearHotkeys()|Clears all hotkeys previously added via [addHotkey(...)](#addhotkey).|return ` boolean `| |
|showHotkeyConfig()|Shows the hotkey configuration window under Options->Game Keys.|return ` boolean `| |

### Message Functions {#message-functions}

Functions which handle sending and displaying data.

|Function Name|Description|Return| |
|---|---|---|---|
|broadcastToAll( ` string ` message, ` color ` message_tint)|Print an on-screen message to all Players, as well as their in-game chat.|return ` boolean `|[#broadcasttoall](#broadcasttoall)|
|broadcastToColor( ` string ` message, ` string ` player_color, ` color ` message_tint)|Print an on-screen message to a specified Player, as well as their in-game chat.|return ` boolean `|[#broadcasttocolor](#broadcasttocolor)|
|log( ` variable ` value, ` string ` label, ` string ` tags)|Logs a message to the host's System Console. (Shortcut: ~)|return ` boolean `|[#log](#log)|
|logString( ` variable ` value, ` string ` label, ` string ` tags, ` boolean ` concise, ` boolean ` displayTag)|Returns a String formatted similarly to the output of [log(...)](#log).|return ` string `|[#logstring](#logstring)|
|logStyle( ` string ` tag, ` color ` tint, ` string ` prefix, ` string ` postfix)|Set style options for the specified tag type for the log.|return ` boolean `|[#logstyle](#logstyle)|
|print( ` string ` message)|Prints a string into chat that only the host is able to see. Used for debugging scripts.|return ` nil `|[#print](#print)|
|printToAll( ` string ` message, ` color ` message_tint)|Print a message into the chat of all connected players.|return ` boolean `|[#printtoall](#printtoall)|
|printToColor( ` string ` message, ` string ` player_color, ` color ` message_tint)|Print a message to a specific [Player Color](../player/colors/).|return ` boolean `|[#printtocolor](#printtocolor)|
|sendExternalMessage( ` table ` data)|Send a table to your external script editor, most likely Atom. This is for custom editor functionality.|return ` boolean `| |

## Function Details {#function-details}

### Global Function Details {#global-function-details}

#### addContextMenuItem(...) {#addcontextmenuitem}

[../types/](../types/)Adds a menu item to the Global right-click context menu. Global menu is shown when player right-clicks on empty space or table.
> **Info: addContextMenuItem(label, toRunFunc, keep_open, require_table)**
>
> * [../types/](../types/) **label**: Label for the menu item.
> * [../types/](../types/) **toRunFunc**: Execute if menu item is selected.
>
> * [../types/](../types/) **player_color** [Player Color](../player/colors/)who selected the menu item.
> * [../types/](../types/) **menu_position**Global position of the right-click context menu.
> * [../types/](../types/) **keep_open**: Keep context menu open after menu
> item was selected.
>
> * Optional, Default: keep_open = false. Close context menu after selection.
> * [../types/](../types/) **require_table**: Show added menu item when right-clicked on empty space or table.
>
> * Optional, Default: require_table = false. Show when right-clicked on empty space or table
> * [../types/](../types/) **player_color** [Player Color](../player/colors/)who selected the menu item.
> * [../types/](../types/) **menu_position**Global position of the right-click context menu.
> * Optional, Default: keep_open = false. Close context menu after selection.
> * Optional, Default: require_table = false. Show when right-clicked on empty space or table
>
```lua
function onLoad()
 addContextMenuItem("doStuff", itemAction)
end
function itemAction(player_color, menu_position)
 print(player_color)
end
```

---

#### copy(...) {#copy}

[../types/](../types/)Copy a list of Objects to the clipboard. Works with [paste(...)](#paste).
> **Info: copy(object_list)**
>
> * [../types/](../types/) **object_list**: A Table of in-game objects to be copied.
>
> * This is similar to highlighting the objects in-game and copying them.
> * This is similar to highlighting the objects in-game and copying them.
>
```lua
object_list = {
 getObjectFromGUID("######"),
 getObjectFromGUID("######"),
}
copy(object_list)
```

---

#### destroyObject(...) {#destroyobject}

[../types/](../types/)Destroy an Object.
> **Info: destroyObject(obj)**
>
> * [../types/](../types/) **obj**: The Object you wish to delete from the instance.

---

#### getObjectFromGUID(...) {#getobjectfromguid}

[../types/](../types/)Returns Object by its GUID. Will return ` nil ` if this GUID doesn't currently exist.
> **Info: getObjectFromGUID(guid)**
>
> * [../types/](../types/) **guid**: GUID of the Object to get a reference of.
>
> * GUID can be obtained by right clicking an object and going to Scripting.
> * In a script, it can be obtained from any Object by using.getGUID().
> * GUID can be obtained by right clicking an object and going to Scripting.
> * In a script, it can be obtained from any Object by using.getGUID().

---

#### getObjects() {#getobjects}

[../types/](../types/)Returns a table of all Objects.
> **Example: Example**
> This can be used to identify objects in any way, for example the name:
>
> ```lua
> -- Gets all Objects with the name "Apple"
> function getApples()
> local allApples = {}
> for i, object in ipairs(getObjects()) do
> if object.getName() == "Apple" then
> table.insert(allApples, object)
> end
> end
> return allApples
> end
> ```
>
> ```lua
> -- Gets all Objects with the name "Apple"
> function getApples()
> local allApples = {}
> for i, object in ipairs(getObjects()) do
> if object.getName() == "Apple" then
> table.insert(allApples, object)
> end
> end
> return allApples
> end
> ```

---

#### getObjectsWithTag(...) {#getobjectswithtag}

[../types/](../types/)Returns a table of all Objects which have the specified tag attached.
> **Info: getObjectsWithTag(tag)**
>
> * [../types/](../types/) **tag**: The tag to search for on Objects.
>
> * Tags can be added to objects via right-click -> Tags.
> * Tags can be added to objects via right-click -> Tags.
> **Example: Example**
>
> ```lua
> -- Gets all Objects with the tag "RedCube"
> function onLoad()
> local allRedCubes = getObjectsWithTag("RedCube")
> log(allRedCubes)
> end
> ```

---

#### getObjectsWithAnyTags(...) {#getobjectswithanytags}

[../types/](../types/)Returns a table of all Objects which have at least one of the specified tags attached.
> **Info: getObjectsWithAnyTags(tags)**
>
> * [../types/](../types/) **tags**: A table of tags to search for. An Object must have at least one of these tags to be returned.
>
> * Tags can be added to objects via right-click -> Tags.
> * Tags can be added to objects via right-click -> Tags.
> **Example: Example**
>
> ```lua
> -- Gets all Objects that have either the "Player1" or "Player2" tag
> function onLoad()
> local tags = { "Player1", "Player2" }
> local matchingObjects = getObjectsWithAnyTags(tags)
> log(matchingObjects)
> end
> ```

---

#### getObjectsWithAllTags(...) {#getobjectswithalltags}

[../types/](../types/)Returns a table of all Objects which have all of of the specified tags attached.
> **Info: getObjectsWithAllTags(tags)**
>
> * [../types/](../types/) **tags**: A table of tags to search for. An Object must have every tag in this table to be returned.
>
> * Tags can be added to objects via right-click -> Tags.
> * Tags can be added to objects via right-click -> Tags.
> **Example: Example**
>
> ```lua
> -- Gets all Objects that have either the "Player1" or "Player2" tag
> function onLoad()
> local tagList = { "Player1", "Player2" }
> local matchingObjects = getObjectsWithAnyTags(tagList)
> log(matchingObjects)
> end
> ```

---

#### group(...) {#group}

[../types/](../types/)Groups objects together, like how the ` G ` key does for players. It returns a table of object references to any decks/stacks formed.
Not all objects CAN be grouped. If the ` G ` key won't work on them, neither will this function.
> **Info: group(objects)**
>
> * [../types/](../types/) **objects**: A list of objects to be grouped together.
> **Info: Format of the returned table**
> * [../types/](../types/)A table containing the grouped objects, numerically indexed.
>
> * [../types/](../types/)Object(s)
>
> * Different types of object are grouped independently i.e. cards will form into a deck, each type of checker will form their own stack.
> * [../types/](../types/)Object(s)
>
> * Different types of object are grouped independently i.e. cards will form into a deck, each type of checker will form their own stack.
> * Different types of object are grouped independently i.e. cards will form into a deck, each type of checker will form their own stack.
> **Example: Example**
>
> ```lua
> function onLoad()
> local objects = {
> -- IMPORTANT: To get the example to work, you need to replace ###### with a real GUID of the object.
> getObjectFromGUID("######"), -- card
> getObjectFromGUID("######"), -- card
> getObjectFromGUID("######"), -- checker
> getObjectFromGUID("######"), -- checker
> }
> local objGroupedList = group(objects)
> log(objGroupedList)
> end
> ```
>
> ``` Lua
> -- Possible Output for objGroupedList
> {
> 1:2:}
> ```
>
> ```lua
> function onLoad()
> local objects = {
> -- IMPORTANT: To get the example to work, you need to replace ###### with a real GUID of the object.
> getObjectFromGUID("######"), -- card
> getObjectFromGUID("######"), -- card
> getObjectFromGUID("######"), -- checker
> getObjectFromGUID("######"), -- checker
> }
> local objGroupedList = group(objects)
> log(objGroupedList)
> end
> ```

---

#### paste(...) {#paste}

[../types/](../types/)Pastes Objects in-game that were copied to the in-game clipboard. Works with [copy(...)](#copy).
> **Info: paste(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing instructions of where to spawn the Objects.
>
> * [../types/#vector](../types/#vector) **parameters.position**: Position of the first object to paste.
>
> * Optional, defaults to {0, 3, 0}.
> * [../types/](../types/) **parameters.snap_to_grid**: If snap-to-grid is active on the spawned item/s.
>
> * Optional, defaults to false (off).
> * [../types/#vector](../types/#vector) **parameters.position**: Position of the first object to paste.
>
> * Optional, defaults to {0, 3, 0}.
> * [../types/](../types/) **parameters.snap_to_grid**: If snap-to-grid is active on the spawned item/s.
>
> * Optional, defaults to false (off).
> * Optional, defaults to {0, 3, 0}.
> * Optional, defaults to false (off).

---

#### spawnObject(...) {#spawnobject}

[../types/](../types/)Spawns an object.
Refer to the spawnable [Built-in Object](../built-in-object/)and [Custom Object](../custom-game-objects/)pages for
details about the types of objects that can be spawned.
If you are spawning a [Custom Object](../custom-game-objects/), you should immediately call [setCustomObject(...)](../object/#setcustomobject)on the object returned from `spawnObject(...)`.
> **Info: spawnObject(parameters)**
>
> * [../types/](../types/) **parameters**: A table of [spawn parameters](#spawnobject-spawn-parameters).
>
##### Spawn Parameters {#spawnobject-spawn-parameters}

` parameters ` must be provided as a table, which may have the following properties:

|Name|Type|Default|Description|
|---|---|---|---|
|type|` string `|Mandatory|[Built-in](../built-in-object/) or [Custom Game Object](../custom-game-objects/) name.|
|position|` vector `|`{0, 0, 0}`|Position where the object will be spawned.|
|rotation|` vector `|`{0, 0, 0}`|Rotation of the spawned object.|
|scale|` vector `|`{1, 1, 1}`|Scale of the spawned object.|
|sound|` boolean `|` true `|Whether a sound will be played as the object spawns.|
|snap_to_grid|` boolean `|` false `|Whether upon spawning, the object will snap to nearby grid lines (or snap points).|
|callback_function|` function `|` nil `|Called when the object has finished spawning. The spawned object will be passed as the first and only parameter.|

` type ` is mandatory, all other properties are optional. When a property is omitted, it will be given the corresponding
default value (above).
Objects take a moment to spawn. The purpose of ` callback_function ` is to allow you to execute additional code after
the object has finished spawning.
> **Example: Example**
> Spawn (with sound disabled) a 2x scale "RPG Bear" object in the center of the table and initiate a [smooth move](../object/#setpositionsmooth)on the object. Once the object has finished spawning, [log](#log)the
> object's [bounds](../object/#getbounds).
>
> ```lua
> local object = spawnObject({
> type = "rpg_BEAR",
> position = {0, 3, 0},
> scale = {2, 2, 2},
> sound = false,
> callback_function = function(spawned_object)
> log(spawned_object.getBounds())
> end
> })
> object.setPositionSmooth({10, 5, 10})
> ```
>
> ```lua
> local object = spawnObject({
> type = "rpg_BEAR",
> position = {0, 3, 0},
> scale = {2, 2, 2},
> sound = false,
> callback_function = function(spawned_object)
> log(spawned_object.getBounds())
> end
> })
> object.setPositionSmooth({10, 5, 10})
> ```

---

#### spawnObjectData(...) {#spawnobjectdata}

[../types/](../types/)Spawns an object from an object data table representation.
This API gives you complete control over all persistent properties that an object has.
> **Info: spawnObjectData(parameters)**
>
> * [../types/](../types/) **parameters**: A table of [spawn parameters](#spawnobjectdata-spawn-parameters).
>
##### Spawn Parameters {#spawnobjectdata-spawn-parameters}

` parameters ` must be provided as a table, which may have the following properties:

|Name|Type|Default|Description|
|---|---|---|---|
|data|` table `|Mandatory|Table with properties describing the object that will be spawned. Required content depends on the type of object being spawned.|
|position|` vector `|` nil `|Position where the object will be spawned. When specified, overrides the ` Transform ` position in ` data `.|
|rotation|` vector `|` nil `|Rotation of the spawned object. When specified, overrides the ` Transform ` rotation in ` data `.|
|scale|` vector `|` nil `|Scale of the spawned object. When specified, overrides the ` Transform ` scale in ` data `.|
|callback_function|` function `|` nil `|Called when the object has finished spawning. The spawned object will be passed as the first and only parameter.|

` data ` is mandatory, all other properties are optional. When a property is omitted, it will be given the corresponding
default value (above).
Objects take a moment to spawn. The purpose of ` callback_function ` is to allow you to execute additional code after
the object has finished spawning.
> **Tip: Tip**
> You can derive your ` data ` table from another object by calling [getData()](../object/#getdata)on it, and
> manipulating the resultant table as you see fit.
> **Example: Example**
> Spawn a 2x scale "RPG Bear" object with a blue base in the center of the table and initiate a [smooth move](../object/#setpositionsmooth)on the object. Once the object has finished spawning, [log](#log)the
> object's [bounds](../object/#getbounds).
>
> ```lua
> local object = spawnObjectData({
> data = {
> Name = "rpg_BEAR",
> Transform = {
> posX = 0,
> posY = 3,
> posZ = 0,
> rotX = 0,
> rotY = 180,
> rotZ = 0,
> scaleX = 2,
> scaleY = 2,
> scaleZ = 2
> },
> ColorDiffuse = {
> r = 0.3,
> g = 0.5,
> b = 0.8
> }
> },
> callback_function = function(spawned_object)
> log(spawned_object.getBounds())
> end
> })
> object.setPositionSmooth({10, 5, 10})
> ```
>
> ```lua
> local object = spawnObjectData({
> data = {
> Name = "rpg_BEAR",
> Transform = {
> posX = 0,
> posY = 3,
> posZ = 0,
> rotX = 0,
> rotY = 180,
> rotZ = 0,
> scaleX = 2,
> scaleY = 2,
> scaleZ = 2
> },
> ColorDiffuse = {
> r = 0.3,
> g = 0.5,
> b = 0.8
> }
> },
> callback_function = function(spawned_object)
> log(spawned_object.getBounds())
> end
> })
> object.setPositionSmooth({10, 5, 10})
> ```
>
> **Example: Advanced example**
> Spawn a copy of a card by name that is inside a deck.
>
> ```lua
> function spawnCardFromDeckByName(deck, nickname, spawnPosition)
> -- Obtain the data of the deck
> local deckData = deck.getData()
> -- Loop through the deck data to find the requested card
> for i, cardData in ipairs(deckData.ContainedObjects) do
> -- Check if the nickname matches
> if cardData["Nickname"] == nickname then
> -- Perform the card spawning with the data of the matching card
> spawnObjectData({
> data = cardData,
> position = spawnPosition
> })
> -- Stop the function here since we found a matching card
> return
> end
> end
> end
> ```
>
> ```lua
> function spawnCardFromDeckByName(deck, nickname, spawnPosition)
> -- Obtain the data of the deck
> local deckData = deck.getData()
> -- Loop through the deck data to find the requested card
> for i, cardData in ipairs(deckData.ContainedObjects) do
> -- Check if the nickname matches
> if cardData["Nickname"] == nickname then
> -- Perform the card spawning with the data of the matching card
> spawnObjectData({
> data = cardData,
> position = spawnPosition
> })
> -- Stop the function here since we found a matching card
> return
> end
> end
> end
> ```

---

#### spawnObjectJSON(...) {#spawnobjectjson}

[../types/](../types/)Spawns an object from a JSON string.
This API gives you complete control over all persistent properties that an object has.
> **Tip: Tip**
> Unless you've already got an object's JSON representation at your disposal then [spawnObjectData(...)](#spawnobjectdata)is the
> preferred API as it's less resource intensive.
> **Info: spawnObjectJSON(parameters)**
>
> * [../types/](../types/) **parameters**: A table of [spawn parameters](#spawnobjectjson-spawn-parameters).
>
##### Spawn Parameters {#spawnobjectjson-spawn-parameters}

` parameters ` must be provided as a table, which may have the following properties:

|Name|Type|Default|Description|
|---|---|---|---|
|json|` string `|Mandatory|JSON string describing the object that will be spawned. Required content depends on the type of object being spawned.|
|position|` vector `|` nil `|Position where the object will be spawned. When specified, overrides the ` Transform ` position in ` json `.|
|rotation|` vector `|` nil `|Rotation of the spawned object. When specified, overrides the ` Transform ` rotation in ` json `.|
|scale|` vector `|` nil `|Scale of the spawned object. When specified, overrides the ` Transform ` scale in ` json `.|
|callback_function|` function `|` nil `|Called when the object has finished spawning. The spawned object will be passed as the first and only parameter.|

` json ` is mandatory, all other properties are optional. When a property is omitted, it will be given the corresponding
default value (above).
Objects take a moment to spawn. The purpose of ` callback_function ` is to allow you to execute additional code after
the object has finished spawning.
> **Example: Example**
> Spawn a 2x scale "RPG Bear" object with a blue base in the center of the table and initiate a [smooth move](../object/#setpositionsmooth)on the object. Once the object has finished spawning, [log](#log)the
> object's [bounds](../object/#getbounds).
>
> ```lua
> local object = spawnObjectJSON({
> json = [[{
> "Name": "rpg_BEAR",
> "Transform": {
> "posX": 0,
> "posY": 3,
> "posZ": 0,
> "rotX": 0,
> "rotY": 180,
> "rotZ": 0,
> "scaleX": 2,
> "scaleY": 2,
> "scaleZ": 2
> },
> "ColorDiffuse": {
> "r": 0.3,
> "g": 0.5,
> "b": 0.8
> }
> }]],
> callback_function = function(spawned_object)
> log(spawned_object.getBounds())
> end
> })
> object.setPositionSmooth({10, 5, 10})
> ```
>
> The `[[`... `]]` syntax above [denotes a multi-line string](https://www.lua.org/pil/2.4.html).
>
> ```lua
> local object = spawnObjectJSON({
> json = [[{
> "Name": "rpg_BEAR",
> "Transform": {
> "posX": 0,
> "posY": 3,
> "posZ": 0,
> "rotX": 0,
> "rotY": 180,
> "rotZ": 0,
> "scaleX": 2,
> "scaleY": 2,
> "scaleZ": 2
> },
> "ColorDiffuse": {
> "r": 0.3,
> "g": 0.5,
> "b": 0.8
> }
> }]],
> callback_function = function(spawned_object)
> log(spawned_object.getBounds())
> end
> })
> object.setPositionSmooth({10, 5, 10})
> ```

---

#### startLuaCoroutine(...) {#startluacoroutine}

[../types/](../types/)Start a coroutine. A coroutine is similar to a function, but has the unique ability to have its run paused until the next frame of the game using `coroutine.yield(0)`.
> **Note: Attention**
> You MUST return a 1 at the end of any coroutine or it will throw an error.
> **Info: startLuaCoroutine(function_owner, function_name)**
>
> * [../types/](../types/) **function_owner**: The Object that the function being called is on. Global is a valid target.
> * [../types/](../types/) **function_name**: Name of the function being called as a coroutine.
>
```lua
function onLoad()
 startLuaCoroutine(Global, "print_coroutine")
end
-- Prints a message, waits 250 frames, prints another message
function print_coroutine()
 print("Routine has Started")
 count = 0
 while count < 250 do
 count = count + 1
 coroutine.yield(0)
 end
 print("Routine has Finished")
 return 1
end
```

---

#### stringColorToRGB(...) {#stringcolortorgb}

[../types/](../types/)Converts a [Player Color](../player/colors/)string into a Color Table for tinting.
> **Info: stringColorToRGB(player_color)**
>
> * [../types/](../types/) **player_color**A String of a [Player Color](../player/colors/).
>
```lua
printToAll("Blue message", stringColorToRGB("Blue"))
```

---

### Rewind State Function Details {#rewind-state-function-details}

#### storeRewindState(...) {#storerewindstate}

[../types/](../types/)Attempts to store a rewind state.
If the game has changed since the last rewind state was store, a new rewind state is stored. The ` and_then ` function is then called with `and_then(success, new_state_was_stored)`. ` success ` is true if a new state was successfully stored, or if no store was necessary. ` new_state_was_stored ` is true if a new state was stored.
> **Info: storeRewindState(and_then, block_further_stores)**
>
> * [../types/](../types/) **and_then**(success, new_state_was_stored): The function that will be executed after the attempt to store a rewind state.
> * [../types/](../types/) **block_further_stores**: If true then rewind states will not be automatically stored again until either **60s**has passed, or you call `allowRewindStore()`.
> **Example: Example**
>
> ```lua
> storeRewindState(
> function(success, did_store)
> if ~success then
> log("Failed to store a rewind state.", "storeRewindState", "error")
> return
> end
> clearCurrentLevel()
> spawnNextLevel()
> allowRewindStore()
> end, true) -- block_further_stores
> )
> ```

---

#### allowRewindStore() {#allowrewindstore}

[../types/](../types/)Clears the block on automatically storing rewind states. You should always call this after you call ` storeRewindState `, once you have completed whatever sweeping changes you are making.

---

### Hotkey Function Details {#hotkey-function-details}

#### addHotkey(...) {#addhotkey}

[../types/](../types/)Adds a bindable hotkey to the game.
Players can bind key to hotkeys from the ` Options `-> ` Game Keys ` UI after this function is called.
> **Note: Important**
> Added hotkeys are unable to persist between loads/rewinds, because the bound callback function may no longer exist.
> Therefore [addHotkey(...)](#addhotkey)needs to be called each time the game is loaded. As long as the same labels
> are used, then player hotkey bindings will persist.
> **Info: addHotkey(label, callback, triggerOnKeyUp)**
>
> * [../types/](../types/) **label**: A label displayed to users.
> * [../types/](../types/) **callback**(playerColor, hoveredObject, pointerPosition, isKeyUp): The function that will be executed whenever the hotkey is pressed, and *also*when released if `triggerOnKeyUp` is ` true `.
>
> * [../types/](../types/) **playerColor**: [Player Color](../player/colors/)of the player that pressed the hotkey.
> * [../types/](../types/) **hoveredObject**: The object that the Player's pointer was hovering over at the moment the key was pressed/released. ` nil ` if no object was under the Player's pointer at the time.
> * [../types/](../types/) **pointerPosition**: [World Position](../types/#position)of the Player's pointer at the moment the key was pressed/released.
> * [../types/](../types/) **isKeyUp**: Whether this callback is being triggered in response to a hotkey being released.
> * [../types/](../types/) **triggerOnKeyUp**: Whether the ` callback ` is *also*executed when the hotkey is released. The ` callback ` is always triggered when the hotkey is pressed.
>
> * Optional, defaults to false.
> * [../types/](../types/) **playerColor**: [Player Color](../player/colors/)of the player that pressed the hotkey.
> * [../types/](../types/) **hoveredObject**: The object that the Player's pointer was hovering over at the moment the key was pressed/released. ` nil ` if no object was under the Player's pointer at the time.
> * [../types/](../types/) **pointerPosition**: [World Position](../types/#position)of the Player's pointer at the moment the key was pressed/released.
> * [../types/](../types/) **isKeyUp**: Whether this callback is being triggered in response to a hotkey being released.
> * Optional, defaults to false.
Hotkey bindings do not prevent the behavior of Settings key bindings i.e. if ` R `(shuffle by default) is assigned as a
hotkey, the hotkey callback and the default shuffle behavior will both be executed whenever ` R ` is pressed.
> **Example: Example**
>
> ```lua
> addHotkey("My Hotkey", function(playerColor, object, pointerPosition, isKeyUp)
> local action = isKeyUp and "released" or "pressed"
> print(playerColor.. " ".. action.. " the hotkey")
> end, true)
> ```

---

### Message Function Details {#message-function-details}

#### broadcastToAll(...) {#broadcasttoall}

[../types/](../types/)Print an on-screen message to all Players.
> **Info: broadcastToAll(message, message_tint)**
>
> * [../types/](../types/) **message**: Message to display on-screen.
> * [../types/#color](../types/#color) **message_tint**: A Table containing the RGB color tint for the text.
>
```lua
msg = "Hello all."
rgb = {r=1, g=0, b=0}
broadcastToAll(msg, rgb)
```

---

#### broadcastToColor(...) {#broadcasttocolor}

[../types/](../types/)Print an on-screen message to a specified Player and their in-game chat.
> **Info: broadcastToColor(message, player_color, message_tint)**
>
> * [../types/](../types/) **message**: Message to display on-screen.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)to receive the message.
> * [../types/#color](../types/#color) **message_tint**: RGB color tint for the text.
>
```lua
msg = "Hello White."
color = "White"
rgb = {r=1, g=0, b=0}
broadcastToColor(msg, color, rgb)
```

---

#### log(...) {#log}

[../types/](../types/)Logs a message to the *host's*System Console (accessible from `~` pane of in-game chat window).
> **Info: log(value, label, tags)**
>
> * [../types/](../types/) **value**: The value you want to log.
> * [../types/](../types/) **label**: Text to be logged before ` value `.
>
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * [../types/](../types/) **tags**: The log tag/style *or*a space separated list of log tags/styles. (See: [logStyle(...)](#logstyle))
>
> * Optional, defaults to logging with the `<default>` log style.
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * Optional, defaults to logging with the `<default>` log style.
If ` value ` is not already a [../types/](../types/), then it will be converted to a human-readable representation.
If ` value ` is a [../types/](../types/), then the table's contents (keys & values) will be displayed. The contents of nested tables will also be displayed up to a user-configurable depth.
> **Tip: Tip**
> Table contents max depth is configurable via the ` log_max_table_depth ` System Console command.
As an advanced feature, multiple log tags may be provided by space-separating several tags (in the one String) provided as the ` tags ` parameter. The message style will be taken from the *first*tag that the user has not explicitly disabled.
> **Example: Example**
> Log a simple message:
>
> ```lua
> log("Something happened")
> ```
>
> ```lua
> log("Something happened")
> ```
>
> **Example: Example**
> Log a table (of objects):
>
> ```lua
> log(getObjects())
> ```
>
> ```lua
> log(getObjects())
> ```
>
> **Example: Example**
> Log a message with a label and using the `"error"` log style:
>
> ```lua
> log("Something unexpected happened.", "Oh no!", "error")
> ```
>
> ```lua
> log("Something unexpected happened.", "Oh no!", "error")
> ```

---

#### logString(...) {#logstring}

[../types/](../types/) *Returns*a String formatted similarly to the output of [log(...)](#log).
> **Info: logString(value, label, tags, concise, displayTag)**
>
> * [../types/](../types/) **value**: The value you want to log.
> * [../types/](../types/) **label**: Text to be logged before ` value `.
>
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * [../types/](../types/) **tags**: The log tag/style *or*a space separated list of log tags/styles.
>
> * Optional, defaults to logging without any tags.
> * [../types/](../types/) **concise**: Whether the resultant String should be generated in a more compact form (less newline characters).
>
> * Optional, defaults to ` false `.
> * [../types/](../types/) **displayTag**: Whether the specified tag(s) should be included as prefix of the resultant String.
>
> * Optional, defaults to ` false `.
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * Optional, defaults to logging without any tags.
> * Optional, defaults to ` false `.
> * Optional, defaults to ` false `.
If ` value ` is not already a [../types/](../types/), then it will be converted to a human-readable representation.
If ` value ` is a [../types/](../types/), then the table's contents (keys & values) will be included in the resultant String. The contents of nested tables will also be displayed up to a user-configurable depth.
> **Tip: Tip**
> Table contents max depth is configurable via the ` log_max_table_depth ` System Console command.
In some circumstances log strings have newlines inserted e.g. between the ` label ` and the textual representation of ` value `. Providing ` true ` as the value for ` concise ` will use space separators instead of newlines.
> **Example: Example**
> *Print*, as opposed to log, the contents of a table (of objects):
>
> ```lua
> print(logString(getObjects()))
> ```
>
> ```lua
> print(logString(getObjects()))
> ```

---

#### logStyle(...) {#logstyle}

[../types/](../types/)Configures style options for a [log(...)](#log)tag.
> **Tip: Tip**
> Tag log styles can also be set via the System Console with the ` log_style_tag ` command.
> **Info: logStyle(tag, tint, prefix, postfix)**
>
> * [../types/](../types/) **tag**: A String of the log's tag.
> * [../types/#color](../types/#color) **tint**: RGB value to tint the log entry's text.
>
> * String color will also work. Example: "Red"
> * [../types/](../types/) **prefix**: Text to place before this type of log entry.
>
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * [../types/](../types/) **postfix**: Text to place after this type of log entry.
>
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * String color will also work. Example: "Red"
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> * Optional, defaults to an empty String. Empty Strings are not displayed.
> **Example: Example**
> Sets the log style (grey text and a suffix) for the log tag `"seats"`. Then proceeds to log a table of available seat colors, using this tag/style.
>
> ```lua
> logStyle("seats", {0.5, 0.5, 0.5}, "", "End List")
> log(Player.getAvailableColors(), nil, "seats")
> ```
>
> ```lua
> logStyle("seats", {0.5, 0.5, 0.5}, "", "End List")
> log(Player.getAvailableColors(), nil, "seats")
> ```

---

#### print(...) {#print}

[../types/](../types/)Print a string into chat that only the host is able to see. Used for debugging scripts.
> **Info: print(message)**
>
> * [../types/](../types/) **message**: Text to print into the chat log.

---

#### printToAll(...) {#printtoall}

[../types/](../types/)Print a message into the in-game chat of all connected players.
> **Info: printToAll(message, message_tint)**
>
> * [../types/](../types/) **message**: Message to place into players' in-game chats.
> * [../types/#color](../types/#color) **message_tint**: RGB values for the text's color tint.
>
```lua
printToAll("Hello World!", {r=1,g=0,b=0})
```

---

#### printToColor(...) {#printtocolor}

[../types/](../types/)Print a message to the in-game chat of a specific player.
> **Info: printToColor(message, player_color, message_tint)**
>
> * [../types/](../types/) **message**: Message to place into the player's in-game chat.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that will receive the message.
> * [../types/#color](../types/#color) **message_tint**: RGB values for the text's color tint.
>
```lua
printToColor("Hello Red.", "Red", {r=1,g=0,b=0})
```

---

### Hand Select Mode Function Details {#hand-select-mode-function-details}

#### chooseInHand(...) {#chooseinhand}

[../types/](../types/)Begins the hand selection mode (or enqueues it if one is already in effect). Returns a list of the affected player colors.
> **Info: chooseInHand(label, min_selection_count, max_selection_count, prompt, players)**
>
> * [../types/](../types/) **label**: Label associated with this mode. This is how you will tell which hand select is active in the callback.
> * [../types/](../types/) **min_selection_count**: The minimum number of cards the player must select.
> * [../types/](../types/) **max_selection_count**: The maximum number of cards the player can select.
> * [../types/](../types/) **prompt**: The prompt displayed to the player during this mode.
> * [../types/](../types/) **player_colors**: Optional list of player colors to activate the mode for. If omitted the currently seated players will be selected.
>
> * Optional
> * Optional
See [Wait.collect](../wait/#collect)for an example.

---

#### chooseInHandOrCancel(...) {#chooseinhandorcancel}

[../types/](../types/)Begins the hand selection mode (or enqueues it if one is already in effect), and also displays a Cancel button. Returns a list of the affected player colors.
> **Info: chooseInHandOrCancel(label, min_selection_count, max_selection_count, prompt, players)**
>
> * [../types/](../types/) **label**: Label associated with this mode. This is how you will tell which hand select is active in the callback.
> * [../types/](../types/) **min_selection_count**: The minimum number of cards the player must select.
> * [../types/](../types/) **max_selection_count**: The maximum number of cards the player can select.
> * [../types/](../types/) **prompt**: The prompt displayed to the player during this mode.
> * [../types/](../types/) **player_colors**: Optional list of player colors to activate the mode for. If omitted the currently seated players will be selected.
>
> * Optional
> * Optional
See [Wait.collect](../wait/#collect)for an example.

---

#### clearChooseInHand(...) {#clearchooseinhand}

[../types/](../types/)Clears the current hand selection mode for the specified players. Returns a list of the affected players.
> **Info: clearChooseInHand(players)**
>
> * [../types/](../types/) **player_colors**: List of player colors to clear the mode for.

---

#### currentChooseInHand(...) {#currentchooseinhand}

[../types/](../types/)Returns the current hand selection label for the given player.
> **Info: currentChooseInHand(player_color)**
>
> * [../types/](../types/) **player_color**: Player color to query.

---
