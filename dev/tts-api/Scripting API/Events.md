## Table of Contents

* Event Handlers
  * Universal Event Handlers
  * Global Event Handlers
  * Object Event Handlers
* Event Handler Execution
* Event Summary
  * Universal Event Handlers
  * Global Event Handlers
  * Object Event Handlers
* Universal Event Handler Details
  * onBlindfold(...)
  * onChat(...)
  * onExternalMessage(...)
  * onFixedUpdate()
  * onLoad(...)
  * onObjectCollisionEnter(...)
  * onObjectCollisionExit(...)
  * onObjectCollisionStay(...)
  * onObjectDestroy(...)
  * onObjectDrop(...)
  * onObjectEnterContainer(...)
  * onObjectEnterScriptingZone(...)
  * onObjectEnterZone(...)
  * onObjectFlick(...)
  * onObjectHover(...)
  * onObjectLeaveContainer(...)
  * onObjectLeaveScriptingZone(...)
  * onObjectLeaveZone(...)
  * onObjectLoopingEffect(...)
  * onObjectNumberTyped(...)
  * onObjectPageChange(...)
  * onObjectPeek(...)
  * onObjectPickUp(...)
  * onObjectRandomize(...)
  * onObjectRotate(...)
  * onObjectSearchEnd(...)
  * onObjectSearchStart(...)
  * onObjectSpawn(...)
  * onObjectStateChange(...)
  * onObjectTriggerEffect(...)
  * onPlayerAction(...)
    * Actions
  * onPlayerChangeColor(...)
  * onPlayerChangeTeam(...)
  * onPlayerChatTyping(...)
  * onPlayerConnect(...)
  * onPlayerDisconnect(...)
  * onPlayerHandChoice(...)
  * onPlayerPing(...)
  * onPlayerTurn(...)
  * onSave()
  * onScriptingButtonDown(...)
  * onScriptingButtonUp(...)
  * onUpdate()
* Global Event Handler Details
  * filterObjectEnterContainer(...)
  * onZoneGroupSort(...)
  * tryObjectEnterContainer(...)
  * tryObjectRandomize(...)
  * tryObjectRotate(...)
  * tryObjectStateChange(...)
* Object Event Handler Details
  * onCollisionEnter(...)
  * onCollisionExit(...)
  * onCollisionStay(...)
  * onDestroy()
  * onDrop(...)
  * onFlick(...)
  * onGroupSort(...)
  * onHover(...)
  * onNumberTyped(...)
  * onPageChange()
  * onPeek(...)
  * onPickUp(...)
  * onRandomize(...)
  * onRotate(...)
  * onSearchEnd(...)
  * onSearchStart(...)
  * onStateChange(...)
  * tryObjectEnter(...)
  * tryRandomize(...)
  * tryRotate(...)
  * tryStateChange(...)

# Events

Games frequently need to execute code in response to some action, interaction, or change taking place in the game,
collectively referred to as *events*.

## Event Handlers {#event-handlers}

Event handlers are **functions you define**, that Tabletop Simulator calls.
There are many event handlers that you can define. Each one gives you an opportunity to handle occurrences of a
particular event.
When Tabletop Simulator calls your function, it will provide event-specific details as arguments to your event handler
function.
In order for Tabletop Simulator to discover an event handler, it must be defined as a global variable with a specific
name. The name that you use depends on which event you wish to handle. Event-specific details are covered below.
> **Note: Note**
> Whilst event handler *names*corresponds with just one type of event. Each event may have multiple corresponding
> event handlers (i.e. event handler names) that Tabletop Simulator will look for and execute.
There are three types of event handlers:

* [Universal Event Handlers](#universal-event-handlers)
* [Global Event Handlers](#global-event-handlers)
* [Object Event Handlers](#object-event-handlers)

### Universal Event Handlers {#universal-event-handlers}

Universal Event Handlers may be defined in the [Global script](../intro/#global-script) *and/or* [Object scripts](../intro/#object-scripts).

### Global Event Handlers {#global-event-handlers}

Global Event Handlers may *only*be defined in the [Global script](../intro/#global-script).
If you define a function using the name of a Global Event Handler in an [Object script](../intro/#object-scripts). It simply won't be called.

### Object Event Handlers {#object-event-handlers}

Object Event Handlers may *only*be defined in [Object scripts](../intro/#object-scripts).
If you define a function using the name of an Object Event Handler in your [Global script](../intro/#global-script). It simply won't be called.

## Event Handler Execution {#event-handler-execution}

*Typically*, if there are multiple event handlers for the one event i.e. in an Object script and Global Script *and/or*multiple Object scripts, then *all*of these event handlers will be executed.
> **Info: Info**
> Some event handlers permit you to return a value in order to trigger an optional side effect. For example, returning `false` from a "try" event handler will prevent whatever action is being *tried*. If you return a value that
> triggers an optional side effect, then subsequent event handlers (for the same event occurrence) will *not*be
> executed.
>
## Event Summary {#event-summary}

### Universal Event Handlers {#universal-event-handlers-summary}

As described above, you may declare these functions in the [Global script](../intro/#global-script)or in [Object scripts](../intro/#object-scripts).

|Function Name|Description| |
|---|---|---|
|onBlindfold( ` player ` player, ` boolean ` blindfolded)|Called when a player puts on or takes off their blindfold.|[#onblindfold](#onblindfold)|
|onChat( ` string ` message, ` player ` sender)|Called when a user sends an in-game chat message.|[#onchat](#onchat)|
|onExternalMessage( ` table ` data)|Called when a [custom message](../externaleditorapi/#custom-message) is received from an external process via the External Editor API.|[#onexternalmessage](#onexternalmessage)|
|onFixedUpdate()|Called every physics tick (90 times a second). This is a frame independent onUpdate().|[#onfixedupdate](#onfixedupdate)|
|onLoad( ` string ` script_state)|Called when a save has completely finished loading.|[#onload](#onload)|
|onObjectCollisionEnter( ` object ` registered_object, ` table ` collision_info)|Called when an Object starts colliding with a [collision registered](../object/#registercollisions) Object.|[#onobjectcollisionenter](#onobjectcollisionenter)|
|onObjectCollisionExit( ` object ` registered_object, ` table ` collision_info)|Called when an Object stops colliding with a [collision registered](../object/#registercollisions) Object.|[#onobjectcollisionexit](#onobjectcollisionexit)|
|onObjectCollisionStay( ` object ` registered_object, ` table ` collision_info)|Called every frame that an Object is colliding with a [collision registered](../object/#registercollisions) Object.|[#onobjectcollisionstay](#onobjectcollisionstay)|
|onObjectDestroy( ` object ` object)|Called whenever an object is about to be destroyed.|[#onobjectdestroy](#onobjectdestroy)|
|onObjectDrop( ` string ` player_color, ` object ` object)|Called when an object is dropped by a player.|[#onobjectdrop](#onobjectdrop)|
|onObjectEnterContainer( ` object ` container, ` object ` object)|Called when an object enters a container. Includes decks|[#onobjectentercontainer](#onobjectentercontainer)|
|onObjectEnterScriptingZone( ` object ` zone, ` object ` object)|` deprecated ` Use [onObjectEnterZone(...)](#onobjectenterzone). Called when an object enters a scripting zone.| |
|onObjectEnterZone( ` object ` zone, ` object ` object)|Called when an object enters a zone.|[#onobjectenterzone](#onobjectenterzone)|
|onObjectFlick( ` object ` object, ` string ` player_color, ` vector ` impulse)|Called when a player flicks an object.|[#onobjectflick](#onobjectflick)|
|onObjectHover( ` string ` player_color, ` object ` object)|Called when the object being hovered over by a player's pointer (cursor) changes.|[#onobjecthover](#onobjecthover)|
|onObjectLeaveContainer( ` object ` container, ` object ` object)|Called when an object leaves a container.|[#onobjectleavecontainer](#onobjectleavecontainer)|
|onObjectLeaveScriptingZone( ` object ` zone, ` object ` object)|` deprecated ` Use [onObjectLeaveZone(...)](#onobjectleavezone). Called when an object leaves a scripting zone.| |
|onObjectLeaveZone( ` object ` zone, ` object ` object)|Called when an object leaves a zone.|[#onobjectleavezone](#onobjectleavezone)|
|onObjectLoopingEffect( ` object ` object, ` int ` index)|Called whenever the looping effect of an [AssetBundle](../behavior/assetbundle/) is activated.|[#onobjectloopingeffect](#onobjectloopingeffect)|
|onObjectNumberTyped( ` object ` object, ` string ` player_color, ` int ` number, ` boolean ` alt)|Called when a player types a number whilst hovering over an object.|[#onobjectnumbertyped](#onobjectnumbertyped)|
|onObjectPageChange( ` object ` object)|Called when a Custom PDF object changes page.|[#onobjectpagechange](#onobjectpagechange)|
|onObjectPeek( ` object ` object, ` string ` player_color)|Called when a player peeks at an Object.|[#onobjectpeek](#onobjectpeek)|
|onObjectPickUp( ` string ` player_color, ` object ` object)|Called whenever a Player picks up an Object.|[#onobjectpickup](#onobjectpickup)|
|onObjectRandomize( ` object ` object, ` string ` player_color)|Called when an Object is randomized. Like when shuffling a deck or shaking dice.|[#onobjectrandomize](#onobjectrandomize)|
|onObjectRotate( ` object ` object, ` float ` spin, ` float ` flip, ` string ` player_color, ` float ` old_spin, ` float ` old_flip)|Called when a player rotates an object.|[#onobjectrotate](#onobjectrotate)|
|onObjectSearchEnd( ` object ` object, ` string ` player_color)|Called when a search is finished on a container.|[#onobjectsearchend](#onobjectsearchend)|
|onObjectSearchStart( ` object ` object, ` string ` player_color)|Called when a search is started on a container.|[#onobjectsearchstart](#onobjectsearchstart)|
|onObjectSpawn( ` object ` object)|Called when an object is spawned/created.|[#onobjectspawn](#onobjectspawn)|
|onObjectStateChange( ` object ` object, ` string ` old_state_guid)|Called after an object changes state.|[#onobjectstatechange](#onobjectstatechange)|
|onObjectTriggerEffect( ` object ` object, ` int ` index)|Called whenever the trigger effect of an [AssetBundle](../behavior/assetbundle/) is activated.|[#onobjecttriggereffect](#onobjecttriggereffect)|
|onPlayerAction( ` player ` player, [Action](#onplayeraction-actions) action, ` table ` targets)|Called when a player attempts to perform an action.|[#onplayeraction](#onplayeraction)|
|onPlayerChangeColor( ` string ` player_color)|Called when a player changes color or selects it for the first time. It also returns `"Grey"` if they disconnect.|[#onplayerchangecolor](#onplayerchangecolor)|
|onPlayerChangeTeam( ` string ` player_color, ` string ` team)|Called when a player changes team.|[#onplayerchangeteam](#onplayerchangeteam)|
|onPlayerChatTyping( ` player ` player, ` boolean ` typing)|Called when a player starts or stops typing.|[#onplayerchattyping](#onplayerchattyping)|
|onPlayerConnect( ` player ` player)|Called when a [Player](../player/instance/) connects to a game.|[#onplayerconnect](#onplayerconnect)|
|onPlayerDisconnect( ` player ` player)|Called when a [Player](../player/instance/) disconnects from a game.|[#onplayerdisconnect](#onplayerdisconnect)|
|onPlayerHandChoice( ` string ` player_color, ` string ` label, ` table ` objects, ` boolean ` was_confirmed)|Called when a [Player](../player/instance/) makes a choice during a hand select mode.|[#onplayerhandchoice](#onplayerhandchoice)|
|onPlayerPing( ` player ` player, ` vector ` position, ` object ` object)|Called when a player [pings](https://kb.tabletopsimulator.com/game-tools/line-tool/#ping) a location.|[#onplayerping](#onplayerping)|
|onPlayerTurn( ` player ` player, ` player ` previous_player)|Called at the start of a player's turn.|[#onplayerturn](#onplayerturn)|
|onSave()|Called whenever a script needs to save its state.|[#onsave](#onsave)|
|onScriptingButtonDown( ` int ` index, ` string ` player_color)|Called when a scripting button (numpad by default) is pressed. The index range that is returned is 1-10.|[#onscriptingbuttondown](#onscriptingbuttondown)|
|onScriptingButtonUp( ` int ` index, ` string ` player_color)|Called when a scripting button (numpad by default) is released. The index range that is returned is 1-10.|[#onscriptingbuttonup](#onscriptingbuttonup)|
|onUpdate()|Called every frame.|[#onupdate](#onupdate)|

### Global Event Handlers {#global-event-handler-summary}

As described above, you may declare these functions in the [Global script](../intro/#global-script).

|Function Name|Description| |
|---|---|---|
|filterObjectEnterContainer( ` object ` container, ` object ` object)|` deprecated ` Use [tryObjectEnterContainer(...)](#tryobjectentercontainer). Called when an object attempts to enter a container.| |
|onZoneGroupSort( ` object ` zone, ` table ` group, ` boolean ` reversed)|Called when sorting is required for a group of objects being laid out by a layout zone.|[#onzonegroupsort](#onzonegroupsort)|
|tryObjectEnterContainer( ` object ` container, ` object ` object)|Called when an object attempts to enter a container.|[#tryobjectentercontainer](#tryobjectentercontainer)|
|tryObjectRandomize( ` object ` object, ` string ` player_color)|Called when a player attempts to randomize an Object.|[#tryobjectrandomize](#tryobjectrandomize)|
|tryObjectRotate( ` object ` object, ` float ` spin, ` float ` flip, ` string ` player_color, ` float ` old_spin, ` float ` old_flip)|Called when a player attempts to rotate an object.|[#tryobjectrotate](#tryobjectrotate)|
|tryObjectStateChange( ` object ` object, ` int ` new_state_index, ` string ` player_color)|Called when an object is about to change state.|[#tryobjectstatechange](#tryobjectstatechange)|

### Object Event Handlers {#object-event-handlers-summary}

As described [above](#object-event-handlers), you may declare these functions in [Object scripts](../intro/#object-scripts).
These events pertain to the script-owner Object (accessible as ` self ` within the script).
> **Note: Important**
> These **cannot**declare these event handlers in the [Global script](../intro/#global-script).
|Function Name|Description| |
|---|---|---|
|filterObjectEnter( ` object ` object)|` deprecated ` Use [tryObjectEnter(...)](#tryobjectenter). Called when an object attempts to enter the script-owner Object (container).|[#tryobjectenter](#tryobjectenter)|
|onCollisionEnter( ` table ` collision_info)|Called when an Object starts colliding with the script-owner Object.|[#oncollisionenter](#oncollisionenter)|
|onCollisionExit( ` table ` collision_info)|Called when an Object stops colliding with the script-owner Object.|[#oncollisionexit](#oncollisionexit)|
|onCollisionStay( ` table ` collision_info)|Called every frame that an Object is colliding with the script-owner Object.|[#oncollisionstay](#oncollisionstay)|
|onDestroy()|Called when the script-owner Object is about to be destroyed.|[#ondestroy](#ondestroy)|
|onDrop( ` string ` player_color)|Called when a player drops the script-owner Object.|[#ondrop](#ondrop)|
|onFlick( ` string ` player_color, ` vector ` impulse)|Called when a player flicks the script-owner Object|[#onflick](#onflick)|
|onGroupSort( ` table ` group, ` boolean ` reversed)|Called when sorting is required for a group of objects being laid out by the script-owner layout zone.|[#ongroupsort](#ongroupsort)|
|onHover( ` string ` player_color)|Called when a player moves their pointer (cursor) over the script-owner Object.|[#onhover](#onhover)|
|onNumberTyped( ` string ` player_color, ` int ` number, ` boolean ` alt)|Called when a player types a number whilst hovering over the script-owner Object.|[#onnumbertyped](#onnumbertyped)|
|onPageChange()|Called when the script-owner Custom PDF's page is changed.|[#onpagechange](#onpagechange)|
|onPeek( ` string ` player_color)|Called when a player peeks at the script-owner Object.|[#onpeek](#onpeek)|
|onPickUp( ` string ` player_color)|Called when a player picks up the script-owner Object.|[#onpickup](#onpickup)|
|onRandomize( ` string ` player_color)|Called when the script-owner Object is randomized. Like when shuffling a deck or shaking dice.|[#onrandomize](#onrandomize)|
|onRotate( ` float ` spin, ` float ` flip, ` string ` player_color, ` float ` old_spin, ` float ` old_flip)|Called when a player rotates the script-owner Object.|[#onrotate](#onrotate)|
|onSearchEnd( ` string ` player_color)|Called when a player finishes searches the script-owner Object.|[#onsearchend](#onsearchend)|
|onSearchStart( ` string ` player_color)|Called when a player starts searching the script-owner Object.|[#onsearchstart](#onsearchstart)|
|onStateChange( ` string ` old_state_guid)|Called when the script-owner Object spawned as a result of an Object state change.|[#onstatechange](#onstatechange)|
|tryObjectEnter( ` object ` object)|Called when another object attempts to enter the script-owner Object (container).|[#tryobjectenter](#tryobjectenter)|
|tryRandomize( ` string ` player_color)|Called when a player attempts to randomize the script-owner Object.|[#tryrandomize](#tryrandomize)|
|tryRotate( ` float ` spin, ` float ` flip, ` string ` player_color, ` float ` old_spin, ` float ` old_flip)|Called when a player attempts to rotate the script-owner Object.|[#tryrotate](#tryrotate)|
|tryStateChange( ` int ` new_state_index, ` string ` player_color)|Called when the object is about to change state.|[#trystatechange](#trystatechange)|

## Universal Event Handler Details {#universal-event-handler-details}

### onBlindfold(...) {#onblindfold}

Called when a player puts on or takes off their blindfold.
> **Info: onBlindfold(player, blindfolded)**
>
> * [../types/](../types/) **player**: [Player](../player/instance/)who put on or took off their blindfold.
> * [../types/](../types/) **blindfolded**: Whether the player is now blindfolded.
> **Example: Example**
> Print a message indicating which player put on or took off their blindfold.
>
> ```lua
> function onBlindfold(player, blindfolded)
> if blindfolded then
> print(player.color.. " put their blindfold on.")
> else
> print(player.color.. " took their blindfold off.")
> end
> end
> ```
>
> ```lua
> function onBlindfold(player, blindfolded)
> if blindfolded then
> print(player.color.. " put their blindfold on.")
> else
> print(player.color.. " took their blindfold off.")
> end
> end
> ```

---

### onChat(...) {#onchat}

Called when a user sends an in-game chat message.
Return ` false ` to prevent the message appearing in the chat window.
> **Info: onChat(message, sender)**
>
> * [../types/](../types/) **message**: Chat message which triggered the function.
> * [../types/](../types/) **sender**: Player which sent the chat message.
> **Example: Example**
> Prevent the blue player from sending messages to other players. Instead print the message to the host. Permit chat from all other players.
>
> ```lua
> function onChat(message, sender)
> if sender.color == "Blue" then
> print("Blue said: ".. message)
> return false
> end
> return true
> end
> ```
>
> ```lua
> function onChat(message, sender)
> if sender.color == "Blue" then
> print("Blue said: ".. message)
> return false
> end
> return true
> end
> ```

---

### onExternalMessage(...) {#onexternalmessage}

Called when a [custom message](../externaleditorapi/#custom-message)is received from an external process via the External Editor API.
> **Info: onExternalMessage(data)**
>
> * [../types/](../types/) **data**: The data sent by the external process.
> **Example: Example**
> Log the contents of received custom external messages.
>
> ```lua
> function onExternalMessage(data)
> log(data, "External Message")
> end
> ```
>
> ```lua
> function onExternalMessage(data)
> log(data, "External Message")
> end
> ```

---

### onFixedUpdate() {#onfixedupdate}

Called **every physics tick**(90 times a second). This is a frame independent onUpdate().
> **Note: Danger**
> Due to the frequency at which this function is called, any implementation must be very simple/fast, in order to avoid
> slowing down your game.
> **Example: Example**
> Print a message every 180 physics ticks.
>
> ```lua
> local tick_count = 0
> function onFixedUpdate()
> tick_count = tick_count + 1
> if tick_count >= 180 then
> print("180 physics ticks passed.")
> tick_count = 0
> end
> end
> ```
>
> ```lua
> local tick_count = 0
> function onFixedUpdate()
> tick_count = tick_count + 1
> if tick_count >= 180 then
> print("180 physics ticks passed.")
> tick_count = 0
> end
> end
> ```
>
### onLoad(...) {#onload}

**Global Script**
Called when a saved game (and all Objects it contains) has finished loading. This includes manually loaded games/saves,
as well as when a user rewinds.
**Object Script**
This will be called when a saved game finishes loading *or*when the script-owner Object has finished loading for some
other reason e.g. if the script-owner Object was pulled out of a container mid-game.
> **Info: onLoad(script_state)**
>
> * [../types/](../types/) **script_state**: The previously saved script state i.e. value returned
> from [onSave(...)](#onsave), or an empty string if there is no saved script state available.
> **Example: Example**
> Decodes a JSON representation of a game state, consisting of nested tables, strings, numbers and object GUIDs. Then
> obtains an Object from the saved GUID.
>
> ```lua
> local some_object -- We'll store an object reference to use later.
> function onLoad(script_state)
> -- JSON decode our saved state
> local state = JSON.decode(script_state)
> -- In this example, we're assuming the existence of some specific saved state data.
> local questions = state.questions -- access a nested table
> for _, qa in ipairs(state.questions) do
> print("Question: ".. qa.question)
> print("Answer: ".. qa.answer)
> end
> some_object = getObjectFromGUID(state.guids.some_object)
> -- Let's highlight some_object a random color.
> -- Because why not.
> local colors = {'Blue', 'Yellow', 'Green'}
> some_object.highlightOn(colors[math.random(1, 3)])
> end
> ```
>
> Refer to [onSave(...)](#onsave)to see an example of how this same save state structure could be created. Subscribe
> to the [onSave/onLoad example mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2430471959)for a more
> functionally complete example.
>
> ```lua
> local some_object -- We'll store an object reference to use later.
> function onLoad(script_state)
> -- JSON decode our saved state
> local state = JSON.decode(script_state)
> -- In this example, we're assuming the existence of some specific saved state data.
> local questions = state.questions -- access a nested table
> for _, qa in ipairs(state.questions) do
> print("Question: ".. qa.question)
> print("Answer: ".. qa.answer)
> end
> some_object = getObjectFromGUID(state.guids.some_object)
> -- Let's highlight some_object a random color.
> -- Because why not.
> local colors = {'Blue', 'Yellow', 'Green'}
> some_object.highlightOn(colors[math.random(1, 3)])
> end
> ```

---

### onObjectCollisionEnter(...) {#onobjectcollisionenter}

Called when an Object starts colliding with a [collision registered](../object/#registercollisions)Object.
> **Info: onObjectCollisionEnter(registered_object, collision_info)**
>
> * [../types/](../types/) **registered_object**: The object registered to receive collision events.
> * [../types/](../types/) **collision_info**: A table containing data about the collision.
>
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with ` registered_object `.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with ` registered_object `.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
>
```lua
-- Example Usage
function onObjectCollisionEnter(registered_object, info)
 print(tostring(info.collision_object).. " collided with ".. tostring(registered_object))
end
```

```lua
-- Example collision_info table
{
 collision_object = objectReference,
 contact_points = {
 {5, 0, -2}
 },
 relative_velocity = {0, 20, 0}
}
```

---

### onObjectCollisionExit(...) {#onobjectcollisionexit}

Called when an Object stops colliding with a [collision registered](../object/#registercollisions)Object.
> **Info: onObjectCollisionExit(registered_object, collision_info)**
>
> * [../types/](../types/) **registered_object**: The object registered to receive collision events.
> * [../types/](../types/) **collision_info**: A table containing data about the collision.
>
> * [../types/](../types/) **collision_info. collision_object**: Object leaving contact with ` registered_object `.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the velocity of the object that has moved out of contact.
> * [../types/](../types/) **collision_info. collision_object**: Object leaving contact with ` registered_object `.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the velocity of the object that has moved out of contact.
>
```lua
-- Example Usage
function onObjectCollisionExit(registered_object, info)
 print(tostring(info.collision_object).. " stopped colliding with ".. tostring(registered_object))
end
```

```lua
-- Example collision_info table
{
 collision_object = objectReference,
 contact_points = {
 {5, 0, -2}
 },
 relative_velocity = {0, 20, 0}
}
```

---

### onObjectCollisionStay(...) {#onobjectcollisionstay}

Called **every frame**that an Object is colliding with a [collision registered](../object/#registercollisions)Object.
> **Warning: Warning**
> Due to the frequency at which this function may be called, any implementation must be very simple/fast, in order to
> avoid slowing down your game.
> **Info: onObjectCollisionStay(registered_object, collision_info)**
>
> * [../types/](../types/) **registered_object**: The object registered to receive collision events.
> * [../types/](../types/) **collision_info**: A table containing data about the collision.
>
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with ` registered_object `.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with ` registered_object `.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
>
```lua
-- Example Usage
function onObjectCollisionStay(registered_object, info)
 print(tostring(info.collision_object).. " still colliding with ".. tostring(registered_object))
end
```

```lua
-- Example collision_info table
{
 collision_object = objectReference,
 contact_points = {
 {5, 0, -2}
 },
 relative_velocity = {0, 20, 0}
}
```

---

### onObjectDestroy(...) {#onobjectdestroy}

Called whenever an object is about to be destroyed.
The Object reference (` object `) is valid in this callback, but won't be valid next frame (as the Object will be
destroyed by then).
This event fires immediately before the Object’s [onDestroy()](#ondestroy).
> **Info: onObjectDestroy(object)**
>
> * [../types/](../types/) **object**: The object that is about to be destroyed.
> **Example: Example**
> Print the name of the Object which is about to be destroyed.
>
> ```lua
> function onObjectDestroy(object)
> print(object.getName())
> end
> ```
>
> ```lua
> function onObjectDestroy(object)
> print(object.getName())
> end
> ```

---

### onObjectDrop(...) {#onobjectdrop}

Called when an object is dropped by a player.
> **Info: onObjectDrop(player_color, object)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the Player who dropped the Object.
> * [../types/](../types/) **object**: The Object in game which was dropped.
>
```lua
function onObjectDrop(colorName, object)
 print(colorName.. " dropped ".. object.getName())
end
```

---

### onObjectEnterContainer(...) {#onobjectentercontainer}

Called when an object enters a container.
> **Info: onObjectEnterContainer(container, object)**
>
> * [../types/](../types/) **container**: Container that was entered.
> * [../types/](../types/) **object**: Object that entered the container.
> **Example: Example**
> Each time an object enters a container, print the GUID of the object and the GUID of the container it entered.
>
> ```lua
> function onObjectEnterContainer(container, object)
> print("Object ".. object.guid.. " entered container ".. container.guid)
> end
> ```
>
> ```lua
> function onObjectEnterContainer(container, object)
> print("Object ".. object.guid.. " entered container ".. container.guid)
> end
> ```

---

### onObjectEnterZone(...) {#onobjectenterzone}

Called when an object enters a zone.
> **Note: Important**
> Objects with [tags](../object/#tag-functions)will only enter zones with compatible tags.
> **Info: onObjectEnterZone(zone, object)**
>
> * [../types/](../types/) **zone**: Zone that was entered.
> * [../types/](../types/) **object**: Object that entered the zone.
> **Example: Example**
> Each time an object enters a zone, print the GUID of the object and the GUID of the scripting zone it entered.
>
> ```lua
> function onObjectEnterZone(zone, object)
> print("Object ".. object.guid.. " entered zone ".. zone.guid)
> end
> ```
>
> ```lua
> function onObjectEnterZone(zone, object)
> print("Object ".. object.guid.. " entered zone ".. zone.guid)
> end
> ```

---

### onObjectFlick(...) {#onobjectflick}

Called whenever a player [flicks](https://kb.tabletopsimulator.com/game-tools/flick-tool/)an object.
> **Info: onObjectFlick(object, player_color, impulse)**
>
* [../types/](../types/) **object**: The object that was flicked.
* [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who flicked an object.
* [../types/](../types/) **impulse**: The impulse applied to the object.

> **Example: Example**
> Print the player color, type of the flicked object, and magnitude of the flick:
>
> ```lua
> function onObjectFlick(object, player_color, impulse)
> print(player_color.. " flicked a ".. object.type.. " with impulse ".. impulse:magnitude())
> end
> ```
>
> ```lua
> function onObjectFlick(object, player_color, impulse)
> print(player_color.. " flicked a ".. object.type.. " with impulse ".. impulse:magnitude())
> end
> ```

---

### onObjectHover(...) {#onobjecthover}

Called when the object being hovered over by a player's pointer (cursor) changes.
> **Info: onObjectHover(player_color, object)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who moved their pointer over an object.
> * [../types/](../types/) **object**: Object the player's pointer is hovering over, or ` nil ` when a player moves their pointer such that it is no longer hovering over an object.
> **Example: Example**
> Each time a player hovers over an object, print the player color and the GUID of the object being hovered over. If a player moves their cursor such that
> they're no longer hovering over an object, print "Nothing" instead of the object GUID.
>
> ```lua
> function onObjectHover(player_color, object)
> local target = object and object.guid or "Nothing"
> print(player_color.. " hovered over ".. target)
> end
> ```
>
> ```lua
> function onObjectHover(player_color, object)
> local target = object and object.guid or "Nothing"
> print(player_color.. " hovered over ".. target)
> end
> ```

---

### onObjectLeaveContainer(...) {#onobjectleavecontainer}

Called when an object leaves a container.
> **Info: onObjectLeaveContainer(container, object)**
>
> * [../types/](../types/) **container**: Container the object left.
> * [../types/](../types/) **object**: Object that left the container.
> **Example: Example**
> Each time an object leaves a container, print the GUID of the object and the GUID of the container it left.
>
> ```lua
> function onObjectLeaveContainer(container, object)
> print("Object ".. object.guid.. " left container ".. container.guid)
> end
> ```
>
> ```lua
> function onObjectLeaveContainer(container, object)
> print("Object ".. object.guid.. " left container ".. container.guid)
> end
> ```

---

### onObjectLeaveZone(...) {#onobjectleavezone}

Called when an object leaves a zone.
> **Info: onObjectLeaveZone(zone, object)**
>
> * [../types/](../types/) **zone**: Zone that was left.
> * [../types/](../types/) **object**: The object that left.
> **Example: Example**
> Each time an object leaves a zone, print the GUID of the object and the GUID of the zone it left.
>
> ```lua
> function onObjectLeaveZone(zone, object)
> print("Object ".. object.guid.. " left zone ".. zone.guid)
> end
> ```
>
> ```lua
> function onObjectLeaveZone(zone, object)
> print("Object ".. object.guid.. " left zone ".. zone.guid)
> end
> ```

---

### onObjectLoopingEffect(...) {#onobjectloopingeffect}

Called whenever the looping effect of an [AssetBundle](../behavior/assetbundle/)is activated.
> **Info: onObjectLoopingEffect(object, index)**
>
> * [../types/](../types/) **object**: AssetBundle which had its loop activated.
> * [../types/](../types/) **index**: Index number for the loop activated.
>
```lua
function onObjectLoopingEffect(object, index)
 print("Loop ".. index.. " activated.")
end
```

---

### onObjectNumberTyped(...) {#onobjectnumbertyped}

Called when a player types a number whilst hovering over an object.
If you wish to prevent the default behavior (e.g. drawing a card) then you may return ` true ` to indicate you've handled the event yourself.
> **Info: onObjectNumberTyped(object, player_color, number, alt)**
>
> * [../types/](../types/) **object**: The object the player was hovering over whilst typing a number.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that typed the number.
> * [../types/](../types/) **number**: The number typed.
> * [../types/](../types/) **alt**: Whether the Alt key is held down.
> **Example: Example**
> Print the player color, the number they entered and the type of object being hovered over:
>
> ```lua
> function onObjectNumberTyped(object, player_color, number)
> print(player_color.. " typed ".. number.. " whilst hovering over a ".. object.type)
> end
> ```
>
> ```lua
> function onObjectNumberTyped(object, player_color, number)
> print(player_color.. " typed ".. number.. " whilst hovering over a ".. object.type)
> end
> ```
>
> **Example: Example**
> Prevent players drawing more than 2 cards at a time:
>
> ```lua
> function onObjectNumberTyped(object, player_color, number)
> if object.type == 'Deck' and number > 2 then
> print("Sorry. You can only draw a maximum of 2 cards.")
> return true
> end
> end
> ```
>
> ```lua
> function onObjectNumberTyped(object, player_color, number)
> if object.type == 'Deck' and number > 2 then
> print("Sorry. You can only draw a maximum of 2 cards.")
> return true
> end
> end
> ```

---

### onObjectPageChange(...) {#onobjectpagechange}

Called when an object's Custom PDF page is changed.
> **Info: onObjectPageChange(object)**
>
> * [../types/](../types/) **object**: The object that's page changed.
> **Example: Example**
> Print the name of the object and what page it changed to:
>
> ```lua
> function onObjectPageChange(object)
> print(object.getName().. " changed page to ".. object.Book.getPage())
> end
> ```
>
> ```lua
> function onObjectPageChange(object)
> print(object.getName().. " changed page to ".. object.Book.getPage())
> end
> ```

---

### onObjectPeek(...) {#onobjectpeek}

Called when a player [peeks](https://kb.tabletopsimulator.com/player-guides/advanced-controls/#peek)at an Object.
> **Info: onObjectPeek(object, player)**
>
> * [../types/](../types/) **object**: The Object that was peeked at.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that peeked.
> **Example: Example**
> Print the color of the player that peeked at an object.
>
> ```lua
> function onObjectPeek(object, player_color)
> print(player_color.. " peeked at an Object.")
> end
> ```
>
> ```lua
> function onObjectPeek(object, player_color)
> print(player_color.. " peeked at an Object.")
> end
> ```

---

### onObjectPickUp(...) {#onobjectpickup}

Called whenever a Player picks up an Object.
> **Info: onObjectPickUp(player_color, object)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the Player who picked up the object.
> * [../types/](../types/) **object**: Object which was picked up.
>
```lua
function onObjectPickUp(colorName, object)
 print(colorName.. " picked up ".. object.getName())
end
```

---

### onObjectRandomize(...) {#onobjectrandomize}

Called when an Object is randomized. Like when shuffling a deck or shaking dice.
> **Info: onObjectRandomize(object, player_color)**
>
> * [../types/](../types/) **object**: The Object which triggered this function.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.
>
```lua
function onObjectRandomize(object, color)
 print(object.getName().. " was randomized by ".. color)
end
```

---

### onObjectRotate(...) {#onobjectrotate}

Called when a player rotates an object.
> **Warning: Warning**
> Only called in response to explicit player rotation actions. Will *not*be called when physics/collisions cause an
> object to rotate.
> **Info: onObjectRotate(object, spin, flip, player_color, old_spin, old_flip)**
>
> * [../types/](../types/) **object**: The object the player is trying to rotate.
> * [../types/](../types/) **spin**: The object's target spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **flip**: The object's target flip rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that performed the rotation.
> * [../types/](../types/) **old_spin**: The object's previous spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **old_flip**: The object's previous flip rotation in degrees within the interval [0, 360).
> **Example: Example**
> When an object is rotated, print which player was responsible and what rotation was performed.
>
> ```lua
> function onObjectRotate(object, spin, flip, player_color, old_spin, old_flip)
> if spin ~= old_spin then
> print(player_color.. " spun ".. tostring(object).. " from ".. old_spin.. " degrees to ".. spin.. " degrees")
> end
> if flip ~= old_flip then
> print(player_color.. " flipped ".. tostring(object).. " from ".. old_flip.. " degrees to ".. flip.. " degrees")
> end
> end
> ```
>
> ```lua
> function onObjectRotate(object, spin, flip, player_color, old_spin, old_flip)
> if spin ~= old_spin then
> print(player_color.. " spun ".. tostring(object).. " from ".. old_spin.. " degrees to ".. spin.. " degrees")
> end
> if flip ~= old_flip then
> print(player_color.. " flipped ".. tostring(object).. " from ".. old_flip.. " degrees to ".. flip.. " degrees")
> end
> end
> ```

---

### onObjectSearchEnd(...) {#onobjectsearchend}

Called when a search is finished on a container.
> **Info: onObjectSearchEnd(object, player_color)**
>
> * [../types/](../types/) **object**: The Object which was searched.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.

---

### onObjectSearchStart(...) {#onobjectsearchstart}

Called when a search is started on a container.
> **Info: onObjectSearchStart(object, player_color)**
>
> * [../types/](../types/) **object**: The Object which was searched.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.

---

### onObjectSpawn(...) {#onobjectspawn}

Called when an object is spawned/created.
> **Info: onObjectSpawn(object)**
>
> * [../types/](../types/) **object**: Object which was spawned.
>
```lua
function onObjectSpawn(object)
 print(object)
end
```

---

### onObjectStateChange(...) {#onobjectstatechange}

Called after an object changes state.
> **Info: onObjectStateChange(object, old_state_guid)**
>
> * [../types/](../types/) **object**: The new Object that spawned as a result of the state change.
> * [../types/](../types/) **old_state_guid**: The GUID of previous state/Object.
> **Example: Example**
> Print the current and previous Object state GUIDs.
>
> ```lua
> function onObjectStateChange(object, old_state_guid)
> print("New state GUID: ".. object.guid)
> print("Previous state GUID: ".. old_state_guid)
> end
> ```
>
> ```lua
> function onObjectStateChange(object, old_state_guid)
> print("New state GUID: ".. object.guid)
> print("Previous state GUID: ".. old_state_guid)
> end
> ```

---

### onObjectTriggerEffect(...) {#onobjecttriggereffect}

Called whenever the trigger effect of an [AssetBundle](../behavior/assetbundle/)is activated.
> **Info: onObjectTriggerEffect(object, index)**
>
> * [../types/](../types/) **object**: AssetBundle object which had its trigger activated.
> * [../types/](../types/) **index**: Index number for the trigger activated.
>
```lua
function onObjectTriggerEffect(object, index)
 print("Loop ".. index.. " activated.")
end
```

---

### onPlayerAction(...) {#onplayeraction}

[../types/](../types/)Called when a player attempts to perform an action.
Return ` false ` to prevent the action's default behavior.
> **Info: onPlayerAction(player, action, targets)**
>
> * [../types/](../types/) **player**: [Player](../player/instance/)that is attempting the action.
> * [Action](#onplayeraction-actions) **action**: Action that is being attempted.
> * [../types/](../types/) **targets**: List of objects which are the target of the action being attempted.
>
#### Actions {#onplayeraction-actions}

The ` action ` parameter will be provided as an [../types/](../types/)equal to a `Player.Action.*` property e.g. ` Player.Action.FlipOver `.
Please refer to the examples [below](#onplayeraction-flip-example), for a demonstration of how you can check which
action is being attempted.

|Player.Action|Player is attempting to...|
|---|---|
|Copy|Copy (or commence cloning) the targets.|
|Cut|Cut (copy and delete) the targets.|
|Delete|Delete the targets.|
|FlipIncrementalLeft|Incrementally rotate the targets counter-clockwise around their flip axes, typically the scene's Z-axis.|
|FlipIncrementalRight|Incrementally rotate the targets clockwise around their flip axes, typically the scene's Z-axis.|
|FlipOver|Rotate the targets 180 degrees around their flip axes, typically the scene's Z-axis i.e. toggle the targets between face up and face down.|
|Group|Group the targets.|
|Paste|Paste (spawn) the targets.|
|PickUp|Pick up the targets.|
|Randomize|Randomize the targets.|
|RotateIncrementalLeft|Rotate the targets incrementally, typically counter-clockwise around the scene's Y-axis. Instead of being rotated exclusively around the Y-axis, dice will be rotated to the previous rotation value.|
|RotateIncrementalRight|Rotate the targets incrementally, typically clockwise around the scene's Y-axis. Instead of being rotated exclusively around the Y-axis, dice will be rotated to the next rotation value.|
|RotateOver|Rotate the targets 180 degrees around the scene's Y-axis.|
|Select|Add the targets to the player's selection.|
|Under|Move the targets underneath objects below them on table.|

> **Example: Example**
> Prevent more than 2 objects being flipped over at a time.
>
> ```lua
> function onPlayerAction(player, action, targets)
> if action == Player.Action.FlipOver
> or action == Player.Action.FlipIncrementalLeft
> or action == Player.Action.FlipIncrementalRight
> then
> return #targets <= 2
> end
> return true
> end
> ```
>
> Prevent more than 2 objects being flipped over at a time.
>
> ```lua
> function onPlayerAction(player, action, targets)
> if action == Player.Action.FlipOver
> or action == Player.Action.FlipIncrementalLeft
> or action == Player.Action.FlipIncrementalRight
> then
> return #targets <= 2
> end
> return true
> end
> ```
>
> **Example: Example**
> Only allow the black player (Game Master) to delete cards and decks.
>
> ```lua
> function onPlayerAction(player, action, targets)
> if action == Player.Action.Delete and player.color ~= "Black" then
> for _, target in ipairs(targets) do
> if target.type ~= "Card" and target.type ~= "Deck" then
> target.destroy()
> end
> end
> return false
> end
> return true
> end
> ```
>
> ```lua
> function onPlayerAction(player, action, targets)
> if action == Player.Action.Delete and player.color ~= "Black" then
> for _, target in ipairs(targets) do
> if target.type ~= "Card" and target.type ~= "Deck" then
> target.destroy()
> end
> end
> return false
> end
> return true
> end
> ```

---

### onPlayerChangeColor(...) {#onplayerchangecolor}

Called when a player changes color or selects it for the first time. It also returns `"Grey"` if they disconnect.
> **Info: onPlayerChangeColor(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.
>
```lua
function onPlayerChangeColor(color)
 print(color)
end
```

---

### onPlayerChangeTeam(...) {#onplayerchangeteam}

Called when a player changes team.
> **Info: onPlayerChangeTeam(player_color, team)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.
> * [../types/](../types/) **team**: Team to which the player has changed. Options below.
>
> * "" (empty string, if changed to None)
> * Diamonds
> * Hearts
> * Jokers
> * Clubs
> * Spades
> * "" (empty string, if changed to None)
> * Diamonds
> * Hearts
> * Jokers
> * Clubs
> * Spades
>
```lua
function onPlayerChangeTeam(player_color, team)
 print(player_color)
 print(team)
end
```

---

---

### onPlayerChatTyping(...) {#onplayerchattyping}

Called when a player starts or stops typing.
> **Info: onPlayerChatTyping(player, typing)**
>
> * [../types/](../types/) **player**: The player who started or stopped typing.
> * [../types/](../types/) **typing**: True if they just started typing, False if they just stopped.
>
```lua
function onPlayerChatTyping(player, typing)
 print(player)
 print(typing)
end
```

---

### onPlayerConnect(...) {#onplayerconnect}

Called when a [Player](../player/instance/)connects to a game.
> **Info: onPlayerConnect(player)**
>
> * [../types/](../types/) **player**: [Player](../player/instance/)that connected.

---

### onPlayerDisconnect(...) {#onplayerdisconnect}

Called when a [Player](../player/instance/)disconnects from a game.
> **Info: onPlayerDisconnect(player)**
>
> * [../types/](../types/) **player**: [Player](../player/instance/)that disconnected.

---

### onPlayerHandChoice(...) {#onplayerhandchoice}

Called when a [Player](../player/instance/)makes a choice in hand selection mode.
> **Info: onPlayerHandChoice(player)**
>
> * [../types/](../types/) **player_color**: The player color of the player who made the choice.
> * [../types/](../types/) **label**: The label of the hand select mode in question.
> * [../types/](../types/) **objects**: The list of objects (cards) selected by the player.
> * [../types/](../types/) **was_confirmed**: True if the player confirmed the selection, false if they cancelled (Cancel option only appears if you use [chooseInHandOrCancel](../base/#chooseinhandorcancel)).
See [Wait.collect](../wait/#collect)for an example.

---

### onPlayerPing(...) {#onplayerping}

Called when a player [pings](https://kb.tabletopsimulator.com/game-tools/line-tool/#ping)a location.
> **Info: onPlayerPing(player, position)**
>
> * [../types/](../types/) **player**: [Player](../player/instance/)who performed the ping.
> * [../types/](../types/) **position**: The location that was pinged.
> * [../types/](../types/) **object**: If the player pinged on top of an object, that object.
> **Example: Example**
> When a player pings a location, print a message with the player's color and the coordinates pinged.
>
> ```lua
> function onPlayerPing(player, position, object)
> if object then
> print(player.color.. " pinged ".. object.getName().. " at ".. position:string())
> else
> print(player.color.. " pinged ".. position:string())
> end
> end
> ```
>
> ```lua
> function onPlayerPing(player, position, object)
> if object then
> print(player.color.. " pinged ".. object.getName().. " at ".. position:string())
> else
> print(player.color.. " pinged ".. position:string())
> end
> end
> ```

---

### onPlayerTurn(...) {#onplayerturn}

Called at the start of a player's turn. [Turns](../turns/)must be enabled.
> **Info: onPlayerTurn(player, previous_player)**
>
> * [../types/](../types/) **player**: [Player](../player/instance/)whose turn is starting.
> * [../types/](../types/) **previous_player**: [Player](../player/instance/)whose turn just finished, or ` nil ` if this is the first turn.
> **Example: Example**
> When a new turn starts, print whose turn ended and whose turn it now is:
>
> ```lua
> function onPlayerTurn(player, previous_player)
> if previous_player == nil then
> print(player.color.. " is going first. It's now their turn.")
> else
> print(previous_player.color.. "'s turn is over. It's now ".. player.color.. "'s turn.")
> end
> end
> ```
>
> ```lua
> function onPlayerTurn(player, previous_player)
> if previous_player == nil then
> print(player.color.. " is going first. It's now their turn.")
> else
> print(previous_player.color.. "'s turn is over. It's now ".. player.color.. "'s turn.")
> end
> end
> ```

---

### onSave() {#onsave}

Return a [../types/](../types/).
This event handler provides you with an opportunity to persist your script's state, such that when a save game is loaded
(or the user rewinds) the data you've persisted will be made available to [onLoad(...)](#onload).
A script's saved state is just a singular [../types/](../types/). The convention for storing complex
state is to create a Lua table, [JSON.encode(...)](../json/#encode)it, and return the JSON encoded string from this
function.
**Global Script**
This event is called whenever the user manually saves game, when an auto-save is created *and*when a rewind checkpoint
is created, by default, that's every 10 seconds. Due to the frequency at which this event handler is called, it's
important that your function be fast.
**Object Script**
In addition to saves and rewind checkpoints, this event handler will also be called on an Object that requires its state
be saved mid-game e.g. when the script-owner Object enters a container.
> **Tip: Tip**
> [JSON.encode(...)](../json/#encode)has limitations with regards to what data it can encode. It *cannot*encode
> references to Objects. If you wish to encode a reference to an object, encode the Object's [GUID](../object/#guid)and in [onLoad(...)](#onload)obtain a new Object reference via [getObjectFromGUID(...)](../base/#getobjectfromguid).
> **Warning: Warning**
> Pressing "Save & Play" (in either the in-game Scripting Editor or Atom) does *not*trigger the save event.
> In this context "Save" is referring to saving your script only. Save & Play will in fact reload your game, *discarding any non-scripting changes*made since the game was last (manually) loaded/saved.
> **Example: Example**
> Returns a JSON encoding of a game state consisting of nested tables, strings, numbers and object references
> (encoded as GUIDs). In this example, ` some_object ` is an [Object](../object/).
>
> ```lua
> function onSave()
> local state = {
> questions = { -- nested table
> {
> question = "What day comes after Saturday?", -- string
> answer = "Sunday",
> },
> {
> question = "Unknown",
> answer = 42, -- number
> }
> },
> guids = {
> some_object = some_object.guid -- GUID (a string)
> }
> }
> return JSON.encode(state)
> end
> ```
>
> Refer to [onLoad(...)](#onload)to see an example of this same save state structure being loaded. Subscribe to the [onSave/onLoad example mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2430471959)for a more
> functionally complete example.
>
> ```lua
> function onSave()
> local state = {
> questions = { -- nested table
> {
> question = "What day comes after Saturday?", -- string
> answer = "Sunday",
> },
> {
> question = "Unknown",
> answer = 42, -- number
> }
> },
> guids = {
> some_object = some_object.guid -- GUID (a string)
> }
> }
> return JSON.encode(state)
> end
> ```

---

### onScriptingButtonDown(...) {#onscriptingbuttondown}

Called when a scripting button (numpad by default) is pressed. The index range that is returned is 1-10.
> **Info: onScriptingButtonDown(index, player_color)**
>
> * [../types/](../types/) **index**: Index number, representing which key was pressed.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.
>
```lua
function onScriptingButtonDown(index, color)
 print(index)
end
```

---

### onScriptingButtonUp(...) {#onscriptingbuttonup}

Called when a scripting button (numpad by default) is released. The index range that is returned is 1-10.
> **Info: onScriptingButtonUp(index, player_color)**
>
> * [../types/](../types/) **index**: Index number, representing which key was released.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.
>
```lua
function onScriptingButtonUp(index, color)
 print(index)
end
```

---

### onUpdate() {#onupdate}

Called **every frame**.
> **Note: Danger**
> Due to the frequency at which this function is called, any implementation must be very simple/fast, in order to avoid
> slowing down your game.
> **Example: Example**
> Print a message every 180 frames.
>
> ```lua
> local frame_count = 0
> function onFixedUpdate()
> frame_count = frame_count + 1
> if frame_count >= 180 then
> print("180 frames passed.")
> frame_count = 0
> end
> end
> ```
>
> ```lua
> local frame_count = 0
> function onFixedUpdate()
> frame_count = frame_count + 1
> if frame_count >= 180 then
> print("180 frames passed.")
> frame_count = 0
> end
> end
> ```

---

## Global Event Handler Details {#global-event-handler-details}

### onZoneGroupSort(...) {#onzonegroupsort}

[../types/](../types/)Called when sorting is required for a group of objects being laid out by a
layout zone.
Return a table of objects (those provided in ` group `) to override the layout zone's ordering algorithm. Return ` nil ` to
use the layout zone's default order.
> **Info: onZoneGroupSort(zone, group, reversed)**
>
> * [../types/](../types/) **zone**: Layout zone which is laying out the group of objects.
> * [../types/](../types/) **group**: List of objects that are being grouped together in the layout zone.
> * [../types/](../types/) **reversed**: Whether the layout zone has been configured to sort in reverse.
> **Example: Example**
> Sort objects by [value](../object/#value). Please note that, by default, objects do not have a value. You'd have to
> assign your objects values first.
>
> ```lua
> function onZoneGroupSort(zone, group, reversed)
> table.sort(group, function(a, b)
> return a.value < b.value
> end)
> return group
> end
> ```
>
> ```lua
> function onZoneGroupSort(zone, group, reversed)
> table.sort(group, function(a, b)
> return a.value < b.value
> end)
> return group
> end
> ```
>
### tryObjectEnterContainer(...) {#tryobjectentercontainer}

[../types/](../types/)Called when an object attempts to enter a container.
Return ` false ` to prevent the object entering.
> **Info: tryObjectEnterContainer(container, object)**
>
> * [../types/](../types/) **container**: The container the Object is trying to enter.
> * [../types/](../types/) **object**: The Object entering the container.
> **Example: Example**
>
> ```lua
> function tryObjectEnterContainer(container, object)
> print(object.getName()) -- Print entering object's name
> return true -- Allows object to enter.
> end
> ```

---

### tryObjectRandomize(...) {#tryobjectrandomize}

[../types/](../types/)Called when a player attempts to randomize an Object.
Return ` false ` to prevent the Object being randomized.
> **Info: tryObjectRandomize(object, player_color)**
>
> * [../types/](../types/) **object**: The Object the player is trying to randomize.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that is attempting the randomization.
> **Example: Example**
> Only allow the blue player to randomize objects.
>
> ```lua
> function tryObjectRandomize(object, player_color)
> return player_color == "Blue"
> end
> ```
>
> ```lua
> function tryObjectRandomize(object, player_color)
> return player_color == "Blue"
> end
> ```

---

### tryObjectRotate(...) {#tryobjectrotate}

[../types/](../types/)Called when a player attempts to rotate an object.
Return ` false ` to prevent the object being rotated.
> **Info: tryObjectRotate(object, spin, flip, player_color, old_spin, old_flip)**
>
> * [../types/](../types/) **object**: The object the player is trying to rotate.
> * [../types/](../types/) **spin**: The object's target spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **flip**: The object's target flip rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that is attempting the rotation.
> * [../types/](../types/) **old_spin**: The object's current spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **old_flip**: The object's current flip rotation in degrees within the interval [0, 360).
> **Example: Example**
> Only allow the blue player to rotate objects.
>
> ```lua
> function tryObjectRotate(object, spin, flip, player_color, old_spin, old_flip)
> return player_color == "Blue"
> end
> ```
>
> ```lua
> function tryObjectRotate(object, spin, flip, player_color, old_spin, old_flip)
> return player_color == "Blue"
> end
> ```

---

### tryObjectStateChange(...) {#tryobjectstatechange}

Called before an object changes state. Return false to prevent the state change.
> **Info: tryObjectStateChange(object, new_state_index, player_color)**
>
> * [../types/](../types/) **object**: The object in question.
> * [../types/](../types/) **new_state_index**: The state index the object is trying to change to.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that is attempting the change.
> **Example: Example**
> Prevent White from changing object states.
>
> ```lua
> function tryObjectStateChange(object, new_state_index, player_color)
> return player_color ~= "White"
> end
> ```
>
> ```lua
> function tryObjectStateChange(object, new_state_index, player_color)
> return player_color ~= "White"
> end
> ```

---

## Object Event Handler Details {#object-event-handler-details}

### onCollisionEnter(...) {#oncollisionenter}

Called when an Object starts colliding with the script-owner Object.
> **Info: onCollisionEnter(collision_info)**
>
> * [../types/](../types/) **collision_info**: A table containing data about the collision.
>
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with the script-owner Object.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with the script-owner Object.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
>
```lua
-- Example Usage
function onCollisionEnter(info)
 print(tostring(info.collision_object).. " collided with ".. tostring(self))
end
```

```lua
-- Example collision_info table
{
 collision_object = objectReference,
 contact_points = {
 {5, 0, -2}
 },
 relative_velocity = {0, 20, 0}
}
```

---

### onCollisionExit(...) {#oncollisionexit}

Called when an Object stops colliding with the script-owner Object.
> **Info: onCollisionExit(collision_info)**
>
> * [../types/](../types/) **collision_info**: A table containing data about the collision.
>
> * [../types/](../types/) **collision_info. collision_object**: Object leaving contact with the script-owner Object.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the velocity of the object that has moved out of contact.
> * [../types/](../types/) **collision_info. collision_object**: Object leaving contact with the script-owner Object.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the velocity of the object that has moved out of contact.
>
```lua
-- Example Usage
function onCollisionExit(info)
 print(tostring(info.collision_object).. " stopped colliding with ".. tostring(self))
end
```

```lua
-- Example collision_info table
{
 collision_object = objectReference,
 contact_points = {
 {5, 0, -2}
 },
 relative_velocity = {0, 20, 0}
}
```

---

### onCollisionStay(...) {#oncollisionstay}

Called **every frame**that an Object is colliding with the script-owner Object.
> **Warning: Warning**
> Due to the frequency at which this function may be called, any implementation must be very simple/fast, in order to
> avoid slowing down your game.
> **Info: onCollisionStay(collision_info)**
>
> * [../types/](../types/) **collision_info**: A table containing data about the collision.
>
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with the script-owner Object.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
> * [../types/](../types/) **collision_info. collision_object**: Object coming into contact with the script-owner Object.
> * [../types/](../types/) **collision_info. contact_points**: Table/array full of contact points, where each 3D point is represented by a (number indexed) table, *not*a [Vector](../vector/).
> * [../types/](../types/) **collision_info. relative_velocity**: Table (number indexed) representation of a 3D vector (but *not*a [Vector](../vector/)) indicating the direction and magnitude of the collision.
>
```lua
-- Example Usage
function onCollisionStay(info)
 print(tostring(info.collision_object).. " still colliding with ".. tostring(self))
end
```

```lua
-- Example collision_info table
{
 collision_object = objectReference,
 contact_points = {
 {5, 0, -2}
 },
 relative_velocity = {0, 20, 0}
}
```

---

### onDestroy() {#ondestroy}

Called when the script-owner Object is about to be destroyed.
The ` self `(the script-owner Object) is valid in this callback, but won't be valid next frame (as the Object will be
destroyed by then).
This event fires immediately after [onObjectDestroy()](#onobjectdestroy).
> **Example: Example**
> Print a message when the script-owner Object is destroyed.
>
> ```lua
> function onDestroy()
> print("This object was destroyed!")
> end
> ```
>
> ```lua
> function onDestroy()
> print("This object was destroyed!")
> end
> ```

---

### onDrop(...) {#ondrop}

Called when the script-owner Object is dropped.
> **Info: onDrop(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the Player.
>
```lua
function onDrop(color)
 print(color)
end
```

---

### onFlick(...) {#onflick}

Called when a player [flicks](https://kb.tabletopsimulator.com/game-tools/flick-tool/)the script-owner Object.
> **Info: onFlick(player_color, impulse)**
>
* [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who flicked the script-owner Object.
* [../types/](../types/) **impulse**: The impulse applied to the script-owner Object.

> **Example: Example**
> Print the player color and magnitude of the flick:
>
> ```lua
> function onFlick(player_color, impulse)
> print(player_color.. " flicked with impulse ".. impulse:magnitude())
> end
> ```
>
> ```lua
> function onFlick(player_color, impulse)
> print(player_color.. " flicked with impulse ".. impulse:magnitude())
> end
> ```

---

### onGroupSort(...) {#ongroupsort}

[../types/](../types/)Called when sorting is required for a group of objects being laid out by the
script-owner layout zone.
Return a table of objects (those provided in ` group `) to override the layout zone's ordering algorithm. Return ` nil ` to
use the layout zone's default order.
> **Info: onGroupSort(group, reversed)**
>
> * [../types/](../types/) **group**: List of objects that are being grouped together in the layout zone.
> * [../types/](../types/) **reversed**: Whether the layout zone has been configured to sort in reverse.
> **Example: Example**
> Sort objects by [value](../object/#value). Please note that, by default, objects do not have a value. You'd have to
> assign your objects values first.
>
> ```lua
> function onGroupSort(group, reversed)
> table.sort(group, function(a, b)
> return a.value < b.value
> end)
> return group
> end
> ```
>
> ```lua
> function onGroupSort(group, reversed)
> table.sort(group, function(a, b)
> return a.value < b.value
> end)
> return group
> end
> ```

---

### onHover(...) {#onhover}

Called when a player moves their pointer (cursor) over the script-owner Object.
> **Info: onHover(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who moved the pointer over the script-owner Object.
>
```lua
function onHover(player_color)
 print(player_color)
end
```

---

### onNumberTyped(...) {#onnumbertyped}

Called when a player types a number whilst hovering over the script-owner Object.
If you wish to prevent the default behavior (e.g. drawing a card, if the script-owner Object is a deck) then you may
return ` true ` to indicate you've handled the event yourself.
> **Info: onNumberTyped(player_color, number)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that typed the number.
> * [../types/](../types/) **number**: The number typed.
> * [../types/](../types/) **alt**: Whether the Alt key us held down.
> **Example: Example**
> Print the player color and the number they typed:
>
> ```lua
> function onNumberTyped(player_color, number)
> print(player_color.. " typed ".. number)
> end
> ```
>
> ```lua
> function onNumberTyped(player_color, number)
> print(player_color.. " typed ".. number)
> end
> ```
>
> **Example: Example**
> Prevent players drawing more than 2 cards at a time (from the script-owner Object):
>
> ```lua
> function onNumberTyped(player_color, number)
> if self.type == 'Deck' and number > 2 then
> print("Sorry. You can only draw a maximum of 2 cards.")
> return true
> end
> end
> ```
>
> ```lua
> function onNumberTyped(player_color, number)
> if self.type == 'Deck' and number > 2 then
> print("Sorry. You can only draw a maximum of 2 cards.")
> return true
> end
> end
> ```

---

### onPageChange() {#onpagechange}

Called when the script-owner Custom PDF's page is changed.
> **Example: Example**
> Print the script-owner Object's name and what page it changed to:
>
> ```lua
> function onPageChange()
> print(self.getName().. " changed page to ".. self.Book.getPage())
> end
> ```
>
> ```lua
> function onPageChange()
> print(self.getName().. " changed page to ".. self.Book.getPage())
> end
> ```

---

### onPeek(...) {#onpeek}

Called when a player [peeks](https://kb.tabletopsimulator.com/player-guides/advanced-controls/#peek)at the script-owner Object.
> **Info: onPeek(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that peeked.
> **Example: Example**
> Print the color of the player that peeked at the script-owner Object.
>
> ```lua
> function onPeek(player_color)
> print(player_color.. " peeked.")
> end
> ```
>
> ```lua
> function onPeek(player_color)
> print(player_color.. " peeked.")
> end
> ```

---

### onPickUp(...) {#onpickup}

Called when a player picks up the script-owner Object.
> **Info: onPickUp(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the Player.
>
```lua
function onPickUp(color)
 print(color)
end
```

---

### onRandomize(...) {#onrandomize}

Called when the script-owner Object is randomized. Like when shuffling a deck or shaking dice.
> **Info: onRandomize(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player who triggered the function.
>
```lua
function onRandomize(color)
 print(self.getName().. " was randomized by ".. color)
end
```

---

### onRotate(...) {#onrotate}

Called when a player rotates script-owner Object.
> **Warning: Warning**
> Only called in response to explicit player rotation actions. Will *not*be called when physics/collisions cause the
> script-owner Object to rotate.
> **Info: onRotate(spin, flip, player_color, old_spin, old_flip)**
>
> * [../types/](../types/) **spin**: The script-owner Object's target spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **flip**: The script-owner Object's target flip rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that performed the rotation.
> * [../types/](../types/) **old_spin**: The script-owner Object's previous spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **old_flip**: The script-owner Object's previous flip rotation in degrees within the interval [0, 360).
> **Example: Example**
> When the script-owner Object is rotated, print which player was responsible and what rotation was performed.
>
> ```lua
> function onRotate(spin, flip, player_color, old_spin, old_flip)
> if spin ~= old_spin then
> print(player_color.. " spun ".. tostring(self).. " from ".. old_spin.. " degrees to ".. spin.. " degrees")
> end
> if flip ~= old_flip then
> print(player_color.. " flipped ".. tostring(self).. " from ".. old_flip.. " degrees to ".. flip.. " degrees")
> end
> end
> ```
>
> ```lua
> function onRotate(spin, flip, player_color, old_spin, old_flip)
> if spin ~= old_spin then
> print(player_color.. " spun ".. tostring(self).. " from ".. old_spin.. " degrees to ".. spin.. " degrees")
> end
> if flip ~= old_flip then
> print(player_color.. " flipped ".. tostring(self).. " from ".. old_flip.. " degrees to ".. flip.. " degrees")
> end
> end
> ```

---

### onSearchEnd(...) {#onsearchend}

Called when a player first searches the script-owner Object.
> **Info: onSearchEnd( player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the Player.

---

### onSearchStart(...) {#onsearchstart}

Called when a player finishes searching the script-owner Object.
> **Info: onSearchStart( player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the Player.

---

### onStateChange(...) {#onstatechange}

Called when the script-owner Object spawned as a result of an Object state change.
> **Info: onStateChange(old_state_guid)**
>
> * [../types/](../types/) **old_state_guid**: The GUID of previous state/Object.
> **Example: Example**
> Print the current and previous Object state GUIDs.
>
> ```lua
> function onStateChange(old_state_guid)
> print("New state GUID: ".. self.guid)
> print("Previous state GUID: ".. old_state_guid)
> end
> ```
>
> ```lua
> function onStateChange(old_state_guid)
> print("New state GUID: ".. self.guid)
> print("Previous state GUID: ".. old_state_guid)
> end
> ```

---

### tryObjectEnter(...) {#tryobjectenter}

Called when another object attempts to enter the script-owner Object (container).
Return ` false ` to prevent the object entering.
> **Info: tryObjectEnter(object)**
>
> * [../types/](../types/) **object**: The object that has tried to enter the script-owner Object.
> **Example: Example**
> Print the name of the object entering the script-owner container.
>
> ```lua
> function tryObjectEnter(object)
> print(object.getName())
> return true -- Allows the object to enter.
> end
> ```
>
> ```lua
> function tryObjectEnter(object)
> print(object.getName())
> return true -- Allows the object to enter.
> end
> ```

---

### tryRandomize(...) {#tryrandomize}

Called when a player attempts to randomize the script-owner Object.
Return ` false ` to prevent the randomization taking place.
> **Info: tryRandomize(player_color)**
>
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that is attempting the randomization.
> **Example: Example**
> Only allow the blue player to randomize the script-owner Object.
>
> ```lua
> function tryRandomize(player_color)
> return player_color == "Blue"
> end
> ```
>
> ```lua
> function tryRandomize(player_color)
> return player_color == "Blue"
> end
> ```

---

### tryRotate(...) {#tryrotate}

Called when a player attempts to rotate the script-owner Object.
Return ` false ` to prevent the rotation taking place.
> **Info: tryRotate(spin, flip, player_color, old_spin, old_flip)**
>
> * [../types/](../types/) **spin**: The script-owner Object's target spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **flip**: The script-owner Object's target flip rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that is attempting the rotation.
> * [../types/](../types/) **old_spin**: The script-owner Object's current spin (around Y-axis) rotation in degrees within the interval [0, 360).
> * [../types/](../types/) **old_flip**: The script-owner Object's current flip rotation in degrees within the interval [0, 360).
> **Example: Example**
> Only allow the blue player to rotate the script-owner Object.
>
> ```lua
> function tryRotate(spin, flip, player_color, old_spin, old_flip)
> return player_color == "Blue"
> end
> ```
>
> ```lua
> function tryRotate(spin, flip, player_color, old_spin, old_flip)
> return player_color == "Blue"
> end
> ```

---

### tryStateChange(...) {#trystatechange}

Called before an object changes state. Return false to prevent the state change.
> **Info: tryStateChange(new_state_index, player_color)**
>
> * [../types/](../types/) **new_state_index**: The state index the object is trying to change to.
> * [../types/](../types/) **player_color**: [Player Color](../player/colors/)of the player that is attempting the change.
> **Example: Example**
> Prevent White from changing object states.
>
> ```lua
> function tryStateChange(new_state_index, player_color)
> return player_color ~= "White"
> end
> ```
>
> ```lua
> function tryStateChange(new_state_index, player_color)
> return player_color ~= "White"
> end
> ```

---
