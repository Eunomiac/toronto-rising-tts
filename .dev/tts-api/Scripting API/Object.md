## Table of Contents

* Member Variables
  * Common Variables
  * Behavior Variables
* Function Summary
  * Transform Functions
  * Tag Functions
  * UI Functions
    * Classic UI
    * Custom UI
  * Get Functions
  * Set Functions
  * Action Function
  * Component Functions
  * Hide Functions
  * Global Function
* Function Details
  * Transform Function Details
    * addForce(...)
    * addTorque(...)
    * getAngularVelocity()
    * getBounds()
    * getBoundsNormalized()
    * getPosition()
    * getPositionSmooth()
    * getRotation()
    * getRotationSmooth()
    * getScale()
    * getTransformForward()
    * getTransformRight()
    * getTransformUp()
    * getVelocity()
    * getVisualBoundsNormalized()
    * isSmoothMoving()
    * positionToLocal(...)
    * positionToWorld(...)
    * rotate(...)
    * scale(...)
    * setAngularVelocity(...)
    * setPosition(...)
    * setPositionSmooth(...)
    * setRotation(...)
    * setRotationSmooth(...)
    * setScale(...)
    * setVelocity(...)
    * translate(...)
  * Tag Function Details
    * addTag(...)
    * getTags()
    * hasAnyTag()
    * hasMatchingTag(...)
    * hasTag(...)
    * removeTag(...)
    * setTags(...)
  * UI Function Details
    * clearButtons()
    * clearInputs()
    * createButton(...)
    * createInput(...)
    * editButton(...)
    * editInput(...)
    * getButtons()
    * getInputs()
    * removeButton(...)
    * removeInput(...)
  * Get Function Details
    * getAttachments()
    * getColorTint()
    * getCustomObject()
    * getData()
    * getDescription()
    * getFogOfWarReveal()
    * getGMNotes()
    * getGUID()
    * getJoints()
    * getJSON(...)
    * getLock()
    * getName()
    * getObjects(...)
      * Containers (Bags/Decks)
      * Zones
    * getQuantity()
    * getRotationValue()
    * getRotationValues()
    * getSelectingPlayers()
    * getStateId()
    * getStates()
    * getValue()
    * getZones()
    * isDestroyed()
  * Set Function Details
    * setColorTint(...)
    * setCustomObject(...)
    * setDescription(...)
    * setFogOfWarReveal(...)
    * setGMNotes(...)
    * setLock(...)
    * setName(...)
    * setRotationValue(...)
    * setRotationValues(...)
    * setState(...)
    * setValue(...)
  * Action Function Details
    * addAttachment(...)
    * addContextMenuItem(...)
    * addToPlayerSelection(...)
    * clearContextMenu()
    * clone(...)
    * cut(...)
    * deal(...)
    * dealToColorWithOffset(...)
    * destroyAttachment(...)
    * destroyAttachments()
    * destruct()
    * drop()
    * flip()
    * highlightOff(...)
    * highlightOn(...)
    * jointTo(...)
    * moveToHandStash(...)
    * putObject(...)
    * randomize(...)
    * registerCollisions(...)
    * reload()
    * removeAttachment(...)
    * removeAttachments()
    * removeFromPlayerSelection(...)
    * reset()
    * roll()
    * shuffle()
    * shuffleStates()
    * split(...)
    * spread(...)
    * takeObject(...)
    * unregisterCollisions(...)
  * Component Function Details
    * getChild(...)
    * getChildren()
    * getComponent(...)
    * getComponentInChildren(...)
    * getComponents(...)
    * getComponentsInChildren(...)
  * Hide Function Details
    * attachHider(...)
    * attachInvisibleHider(...)
    * setHiddenFrom(...)
    * setInvisibleTo(...)
  * Global Function Details
    * addDecal(...)
    * call(...)
    * getDecals()
    * getLuaScript()
    * getSnapPoints()
    * getTable(...)
    * getVar(...)
    * getVectorLines()
    * setDecals(...)
    * setLuaScript(...)
    * setSnapPoints(...)
    * setTable(...)
    * setVar(...)
    * setVectorLines(...)

# Object

The Object class represents any entity within tabletop simulator. Once you have a reference to an object in your script you can call functions on it directly. Example: `obj.getPosition(...)`. You can get a reference to an object multiple ways;

* Using the ` self ` property if your script is on an Object and referring to that Object.
* Using [getObjectFromGUID(...)](../base/#getobjectfromguid)with the object's GUID (found by right clicking it with the pointer).
* Getting it as a return from another function, like with [spawnObject(...)](../base/#spawnobject).

## Member Variables {#member-variables}

### Common Variables {#common-variables}

These are variables that are common to all objects. Some variables are read-only, which means you can query the
property, but are unable to assign a new value to it.
> **Example: Example**
> Locking/freezing an object by assigning ` true ` to [locked](#locked).
>
> ```lua
> object.locked = true
> ```
>
> ```lua
> object.locked = true
> ```
>
> **Example: Example**
> Printing whether or not object is [locked](#locked).
>
> ```lua
> if object.locked then
> print("Object is locked")
> else
> print("Object is not locked")
> end
> ```
>
> ```lua
> if object.locked then
> print("Object is locked")
> else
> print("Object is not locked")
> end
> ```
>
|Variable|Description|Type|
|---|---|---|
|alt_view_angle|When non-zero, the Alt view will use the specified Euler angle to look at the object.|` vector `|
|angular_drag|Angular drag. [Unity rigidbody property](https://docs.unity3d.com/2019.1/Documentation/Manual/class-Rigidbody.html).|` float `|
|auto_raise|If the object should be lifted above other objects to avoid collision when held by a player.|` boolean `|
|bounciness|Bounciness, value of 0-1. [Unity physics material](https://docs.unity3d.com/2019.1/Documentation/Manual/class-PhysicMaterial.html).|` float `|
|drag|Drag. [Unity rigidbody property](https://docs.unity3d.com/2019.1/Documentation/Manual/class-Rigidbody.html).|` float `|
|drag_selectable|When ` false `, the object will not be selected by regular (click and drag) selection boxes that are drawn around the object. Players may proceed to override this behavior by holding the "Shift" modifier whilst drag selecting.|` boolean `|
|dynamic_friction|Dynamic friction, value of 0-1. [Unity physics material](https://docs.unity3d.com/2019.1/Documentation/Manual/class-PhysicMaterial.html).|` float `|
|gizmo_selectable|When ` false `, the object cannot be selected with the Gizmo tool.|` boolean `|
|grid_projection|If grid lines can appear on the Object if visible grids are turned on.|` boolean `|
|guid|The 6 character unique Object identifier within Tabletop Simulator. It is assigned correctly once the ` spawning ` member variable becomes false.|` string `|
|held_by_color|The Color of the Player that is holding the object.|` string `|
|held_flip_index|0-23 value. Changes when a Player hits flip or alt + rotate.|` int `|
|held_position_offset|Position offset from pointer.|` vector `|
|held_reduce_force|When the Object collides with something while moving this is automatically enabled and reduces the movement force.|` boolean `|
|held_rotation_offset|Rotation offset from pointer.|` vector `|
|held_spin_index|0-23 value. Changes when a Player rotates the Object.|` int `|
|hide_when_face_down|Hide the Object when face-down as if it were in a hand zone. The face is the "top" of the Object, the direction of its positive Y coordinate. Cards/decks default to ` true `.|` boolean `|
|ignore_fog_of_war|Makes the object not be hidden by [Fog of War](https://kb.tabletopsimulator.com/game-tools/zone-tools/#fog-of-war-zone).|` boolean `|
|interactable|If the object can be interacted with by Players. Other object will still be able to interact with it.|` boolean `|
|is_face_down|If the Object is roughly face-down (like with cards). The face is the "top" of the Object, the direction of its positive Y coordinate. Read only.|` boolean `|
|loading_custom|If the Object's custom elements (images/models/etc) are loading. Read only.|` boolean `|
|locked|If the object is frozen in place (preventing physics interactions).|` boolean `|
|mass|Mass. [Unity rigidbody property](https://docs.unity3d.com/2019.1/Documentation/Manual/class-Rigidbody.html).|` float `|
|max_typed_number|Determines the maximum number of digits which a user may type whilst hovering over the object. If typing another digit would exceed the value assigned here, the corresponding behavior (e.g. [onObjectNumberTyped](../events/#onobjectnumbertyped) / [onNumberTyped](../events/#onnumbertyped) ) is triggered immediately, improving responsiveness.|` int `|
|measure_movement|Measure Tool will automatically be used when moving the Object.|` boolean `|
|memo|A string where you may persist user-data associated with the object. Tabletop Simulator saves this field, but otherwise does not use it. Store whatever information you see fit.|` string `|
|name|Internal resource name for this Object. Read only, and only useful for [spawnObjectData()](../base/#spawnobjectdata). Generally, you want [getName()](#getname).|` string `|
|pick_up_position|The position the Object was picked up at. Read only.|` vector `|
|pick_up_rotation|The rotation the Object was picked up at. Read only.|` vector `|
|remainder|If this object is a container that cannot exist with less than two contained objects (e.g. a deck), [taking out](#takeobject) the second last contained object will result in the container being destroyed. In its place the last remaining object in the container will be spawned. This variable provides a reference to the remaining object when it is being spawned. Otherwise, it's ` nil `. Read only.|` object `|
|resting|If the Object is at rest. [Unity rigidbody property](https://docs.unity3d.com/2019.1/Documentation/Manual/RigidbodiesOverview.html).|` boolean `|
|script_code|The Lua Script on the Object.|` string `|
|script_state|The saved data on the object. See [onSave()](../events/#onsave).|` string `|
|spawning|If the Object is finished spawning. Read only.|` boolean `|
|static_friction|Static friction, value of 0-1. [Unity physics material](https://docs.unity3d.com/2019.1/Documentation/Manual/class-PhysicMaterial.html).|` float `|
|sticky|If other Objects on top of this one are also picked up when this Object is.|` boolean `|
|tag|` deprecated ` Use [type](#type). This object's type. Read only.|` string `|
|tooltip|If the tooltip opens when a pointer hovers over the object. Tooltips display name and description.|` boolean `|
|type|This object's type. Read only.|` string `|
|use_gravity|If gravity affects this object.|` boolean `|
|use_grid|If snapping to grid is enabled or not.|` boolean `|
|use_hands|If this object can be held in a hand zone.|` boolean `|
|use_rotation_value_flip|Switches the axis the Object rotates around when flipped.|` boolean `|
|use_snap_points|If snap points are used or ignored.|` boolean `|
|value|A numeric value associated with the object, which when non-zero, will be displayed when hovering over the object. In the case of stacks, the value shown in the UI will be multiplied by the stack size i.e. you can use ` value ` to create custom stackable chips. When multiple objects are selected, values will be summed together with objects sharing overlapping [object tags](#tag-functions).|` int `|
|value_flags|` deprecated ` Use [object tags](#tag-functions). A [bit field](https://en.wikipedia.org/wiki/Bit_field). When objects with overlapping ` value_flags ` are selected and hovered over, their [values](#value) will be summed together.|` int `|

### Behavior Variables {#behavior-variables}

Some objects provide additional behavior. This functionality is accessible as Object member variables, but will be ` nil ` unless the Object includes the behavior.
> **Example: Example**
> The "Counter" Object has a ` Counter ` member variable. We'll use it to increment and retrieve the counter's value.
>
> ```lua
> object.Counter.increment()
> print("The counter value is now ".. object.Counter.getValue())
> ```
>
> ```lua
> object.Counter.increment()
> print("The counter value is now ".. object.Counter.getValue())
> ```
>
|Variable|Type|Available On|
|---|---|---|
|AssetBundle|[AssetBundle](../behavior/assetbundle/)|Custom "AssetBundle" objects.|
|Book|[Book](../behavior/book/)|"Custom PDF" objects.|
|Browser|[Browser](../behavior/browser/)|"Tablet" objects.|
|Clock|[Clock](../behavior/clock/)|"Digital Clock" objects.|
|Counter|[Counter](../behavior/counter/)|"Counter" objects.|
|LayoutZone|[LayoutZone](../behavior/layoutzone/)|Layout zones.|
|RPGFigurine|[RPGFigurine](../behavior/rpgfigurine/)|"RPG Kit" animated figurine objects i.e. [type](#type) "rpgFigurine".|
|TextTool|[TextTool](../behavior/texttool/)|3D Text objects e.g. text created with the in-game Text tool.|

## Function Summary {#function-summary}

### Transform Functions {#transform-functions}

These functions handle the physical attributes of an Object: Position, Rotation, Scale, Bounds, Velocity. In other words, moving objects around as well as getting information on how they are moving.

|Function Name|Description|Return| |
|---|---|---|---|
|addForce( ` vector ` vector, ` int ` force_type)|Adds force to an object in a directional Vector.|return ` boolean `|[#addforce](#addforce)|
|addTorque( ` vector ` vector, ` int ` force_type)|Adds torque to an object in a rotational Vector.|return ` boolean `|[#addtorque](#addtorque)|
|getAngularVelocity()|Returns a Vector of the current angular velocity.|return ` vector `| |
|getBounds()|Returns a Vector describing the size of an object in Global terms.|return ` vector `|[#getbounds](#getbounds)|
|getBoundsNormalized()|Returns a Vector describing the size of the merged colliders on an object in Global terms, as if it was rotated to {0,0,0}.|return ` vector `|[#getboundsnormalized](#getboundsnormalized)|
|getPosition()|Returns a Vector of the current [World Position](../types/#position).|return ` vector `| |
|getPositionSmooth()|Returns a Vector of the current smooth move target if the object is smooth moving, otherwise returns ` nil `.|return ` vector `| |
|getRotation()|Returns a Vector of the current rotation.|return ` vector `| |
|getRotationSmooth()|Returns a Vector of the current smooth rotation target if the object is smooth moving, otherwise returns ` nil `.|return ` vector `| |
|getScale()|Returns a Vector of the current scale.|return ` vector `|[#getscale](#getscale)|
|getTransformForward()|Returns a Vector of the forward direction of this object.|return ` vector `|[#gettransformforward](#gettransformforward)|
|getTransformRight()|Returns a Vector of the right direction of this object.|return ` vector `|[#gettransformright](#gettransformright)|
|getTransformUp()|Returns a Vector of the up direction of this object.|return ` vector `|[#gettransformup](#gettransformup)|
|getVelocity()|Returns a Vector of the current velocity.|return ` vector `| |
|getVisualBoundsNormalized()|Returns a Vector describing the size of the merged renderers on an object in Global terms, as if it was rotated to {0,0,0}.|return ` vector `|[#getvisualboundsnormalized](#getvisualboundsnormalized)|
|isSmoothMoving()|Indicates if an object is traveling as part of a Smooth move. Smooth moving is performed by setPositionSmooth and setRotationSmooth.|return ` boolean `| |
|positionToLocal( ` vector ` vector)|Returns a Vector after converting a world Vector (World Position) to a local Vector ( [Local Position](../types/#position) ).|return ` vector `|[#positiontolocal](#positiontolocal)|
|positionToWorld( ` vector ` vector)|Returns a Vector after converting a local Vector (Local Position) to a world Vector ( [World Position](../types/#position) ).|return ` vector `|[#positiontoworld](#positiontoworld)|
|rotate( ` vector ` vector)|Rotates Object smoothly in the direction of the given Vector.|return ` boolean `|[#rotate](#rotate)|
|scale( ` vector ` vector or ` float ` )|Scales Object by a multiple.|return ` boolean `|[#scale](#scale)|
|setAngularVelocity( ` vector ` vector)|Sets a Vector as the current angular velocity.|return ` boolean `| |
|setPosition( ` vector ` vector)|Instantly moves an Object to the given Vector. The Vector is interpreted as [World Position](../types/#position).|return ` boolean `| |
|setPositionSmooth( ` vector ` vector, ` boolean ` collide, ` boolean ` fast)|Moves the Object smoothly to the given Vector. The Vector is interpreted as [World Position](../types/#position).|return ` boolean `|[#setpositionsmooth](#setpositionsmooth)|
|setRotation( ` vector ` vector)|Instantly rotates an Object to the given Vector.|return ` boolean `| |
|setRotationSmooth( ` vector ` vector, ` boolean ` collide, ` boolean ` fast)|Rotates the Object smoothly to the given Vector.|return ` boolean `|[#setrotationsmooth](#setrotationsmooth)|
|setScale( ` vector ` vector)|Sets a Vector as the current scale.|return ` boolean `| |
|setVelocity( ` vector ` vector)|Sets a Vector as the current velocity.|return ` boolean `| |
|translate( ` vector ` vector)|Smoothly moves Object by the given Vector offset.|return ` boolean `| |

### Tag Functions {#tag-functions}

These functions deal with the [tags](https://kb.tabletopsimulator.com/game-tools/object-tags/)associated with the object. An individual tag is a [../types/](../types/)and is case-insensitive.

|Function Name|Description|Return| |
|---|---|---|---|
|addTag( ` string ` tag)|Adds the specified tag to the object.|return ` boolean `| |
|getTags()|Returns a table of tags ( ` string ` ) that have been added to the object.|return ` table `| |
|hasAnyTag()|Returns whether the object has any tags.|return ` boolean `| |
|hasMatchingTag( ` object ` other)|Returns whether the object and the specified ` other ` object share at least one tag in common.|return ` boolean `| |
|hasTag( ` string ` tag)|Returns whether the object has the specified tag.|return ` boolean `| |
|removeTag( ` string ` tag)|Removes the specified tag from the object.|return ` boolean `| |
|setTags( ` table ` tags)|Replaces all tags on the object with those contained in the specified table (containing ` string ` ).|return ` boolean `| |

If you want to create your own system in which object tags govern the interactions, the canonical logic is that if the system has no tags it interacts with everything, but if it has any tags then it only interacts with objects which share one of them. i.e. (assuming the system is represented by an in-game object):

```lua
allow_interaction = not system.hasAnyTag() or system.hasMatchingTag(object)
```

### UI Functions {#ui-functions}

A new UI system was added to Tabletop Simulator which allows for more flexibility in the creation of UI elements on Objects. The old system (Classic UI) and new system (Custom UI) both work, and each has its own strengths.

#### Classic UI {#classic-ui}

These functions allow for the creation/editing/removal of functional buttons and text inputs which themselves trigger code within your scripts. These buttons/inputs are attached to the object they are created on.

|Function Name|Description|Return| |
|---|---|---|---|
|clearButtons()|Removes all scripted buttons.|return ` boolean `| |
|clearInputs()|Removes all scripted inputs.|return ` boolean `| |
|createButton( ` table ` parameters)|Creates a scripted button attached to the Object.|return ` boolean `|[#createbutton](#createbutton)|
|createInput( ` table ` parameters)|Creates a scripted input attached to the Object.|return ` boolean `|[#createinput](#createinput)|
|editButton( ` table ` parameters)|Modify an existing button.|return ` boolean `|[#editbutton](#editbutton)|
|editInput( ` table ` parameters)|Modify an existing input.|return ` boolean `|[#editinput](#editinput)|
|getButtons()|Returns a Table of all buttons on this Object.|return ` table `|[#getbuttons](#getbuttons)|
|getInputs()|Returns a Table of all inputs on this Object.|return ` table `|[#getinputs](#getinputs)|
|removeButton( ` int ` index)|Removes a specific button.|return ` boolean `|[#removebutton](#removebutton)|
|removeInput( ` int ` index)|Removes a specific button.|return ` boolean `|[#removeinput](#removeinput)|

#### Custom UI {#custom-ui}

Custom UI gives you a wide variety of element types, not just buttons and inputs, to place onto an Object. It is an extension of the UI class, and details on its use can be found [on the UI page](../ui/).

### Get Functions {#get-functions}

These functions obtain information from an object.

|Function Name|Description|Return| |
|---|---|---|---|
|getAttachments()|Returns a table in the same format as [getObjects()](#getobjects) for containers.|return ` table `| |
|getColorTint()|Color tint.|return ` color `| |
|getCustomObject()|Returns a Table with the Custom Object information of a Custom Object.|return ` table `|[#getcustomobject](#getcustomobject)|
|getData()|Returns a table data structure representation of the object. Works with [spawnObjectData(...)](../base/#spawnobjectdata).|return ` table `| |
|getDescription()|Description, also shows as part of Object's tooltip.|return ` string `| |
|getFogOfWarReveal()|Settings impacting [Fog of War](https://kb.tabletopsimulator.com/game-tools/zone-tools/#fog-of-war-zone) being revealed.|return ` table `|[#getfogofwarreveal](#getfogofwarreveal)|
|getGMNotes()|Game Master Notes only visible for [Player Color](../player/colors/) Black.|return ` string `| |
|getGUID()|String of the Object's unique identifier.|return ` string `| |
|getJoints()|Returns information on any joints attached to this object.|return ` table `|[#getjoints](#getjoints)|
|getJSON( ` boolean ` indented)|Returns a JSON string representation of the object. Works with [spawnObjectJSON(...)](../base/#spawnobjectjson). ` indented ` is optional and defaults to ` true `.|return ` string `| |
|getLock()|If the Object is locked.|return ` boolean `| |
|getName()|Name, also shows as part of Object's tooltip.|return ` string `| |
|getObjects()|Returns data describing the objects contained within in the zone/bag/deck.|return ` variable `|[#getobjects](#getobjects)|
|getQuantity()|Returns the number of objects contained within (if the Object is a bag, deck or stack), otherwise -1.|return ` int `| |
|getRotationValue()|Returns the current rotationValue. Rotation values are used to give value to different rotations (like dice).|return ` variable `|[#getrotationvalue](#getrotationvalue)|
|getRotationValues()|Returns a Table of rotation values. Rotation values are used to give value to different rotations (like dice).|return ` table `|[#getrotationvalues](#getrotationvalues)|
|getSelectingPlayers()|Returns a table of the player colors currently selecting the object.|return ` table `| |
|getStateId()|Current [state](https://kb.tabletopsimulator.com/host-guides/creating-states/) ID (index) an object is in. Returns -1 if there are no other states. State ids (indexes) start at 1.|return ` int `| |
|getStates()|Returns a Table of information on the [states](https://kb.tabletopsimulator.com/host-guides/creating-states/) of an Object.|return ` table `|[#getstates](#getstates)|
|getValue()|Returns the Object's value. This represents something different depending on the Object's [type](#type).|return ` variable `|[#getvalue](#getvalue)|
|getZones()|Returns a list of zones that the object is currently occupying.|return ` table `|[#getzones](#getzones)|
|isDestroyed()|Returns true if the Object is (or will be) destroyed.|return ` boolean `| |

### Set Functions {#set-functions}

These functions apply action to an object. They take some property in order to work.

|Function Name|Description|Return| |
|---|---|---|---|
|setColorTint( ` color ` Color)|Sets the Color tint.|return ` boolean `| |
|setCustomObject( ` table ` parameters)|Sets a custom Object's properties.|return ` boolean `|[#setcustomobject](#setcustomobject)|
|setDescription( ` string ` description)|Sets a description for an Object. Shows in tooltip after delay.|return ` boolean `| |
|setFogOfWarReveal( ` table ` fog_settings)|Establish the settings and enable/disable an Object's revealing of [Fog of War](https://kb.tabletopsimulator.com/game-tools/zone-tools/#fog-of-war-zone).|return ` boolean `|[#setfogofwarreveal](#setfogofwarreveal)|
|setGMNotes( ` string ` notes)|Sets Game Master Notes only visible for [Player Color](../player/colors/) Black.|return ` boolean `| |
|setLock( ` boolean ` lock)|Sets if an object is locked in place.|return ` boolean `| |
|setName( ` string ` name)|Sets a name for an Object. Shows in tooltip.|return ` boolean `| |
|setRotationValue( ` variable ` rotation_value)|Sets the Object's rotation value i.e. physically rotates the object.| |[#setrotationvalue](#setrotationvalue)|
|setRotationValues( ` table ` rotation_values)|Sets rotation values of an object. Rotation values are used to give value to different rotations (like dice).|return ` boolean `|[#setrotationvalues](#setrotationvalues)|
|setState( ` int ` state_id)|Sets [state](https://kb.tabletopsimulator.com/host-guides/creating-states/) of an Object. State ids (indexes) start at 1.|return ` object `| |
|setValue( ` variable ` value)|Sets the Object's value. This represents something different depending on the Object's [type](#type).|return ` boolean `|[#setvalue](#setvalue)|

### Action Function {#action-function}

These functions perform general actions on objects.

|Function Name|Description|Return| |
|---|---|---|---|
|addAttachment( ` object ` Object)|The Object supplied as param is destroyed and becomes a dummy Object child.|return ` boolean `| |
|addContextMenuItem( ` string ` label, ` function ` callback, ` boolean ` keep_open)|Adds a menu item to the objects right-click context menu.|return ` boolean `|[#addcontextmenuitem](#addcontextmenuitem)|
|addToPlayerSelection( ` string ` player_color)|Adds object to player's selection.|return ` boolean `| |
|clearContextMenu()|Clears all menu items added by function [addContextMenuItem(...)](#addcontextmenuitem).|return ` boolean `| |
|clone( ` table ` parameters)|Copy/Paste this Object, returning a reference to the new Object.|return ` object `|[#clone](#clone)|
|cut( ` int ` count)|Cuts (splits) a deck at the given card count.|return ` table `|[#cut](#cut)|
|deal( ` int ` number, ` string ` player_color, ` int ` index, ` boolean ` deal_from_bottom)|Deals Objects. Will deal from decks/bags/stacks/individual items.|return ` boolean `|[#deal](#deal)|
|dealToColorWithOffset( ` vector ` offset, ` boolean ` flip, ` string ` player_color)|Deals from a deck to a position relative to the hand zone.|return ` object `|[#dealtocolorwithoffset](#dealtocolorwithoffset)|
|destroyAttachment( ` int ` index)|Destroys an attachment with the given index.|return ` boolean `| |
|destroyAttachments()|Destroys all attachments.|return ` boolean `| |
|destruct()|Destroys Object. Allows for `self.destruct()`.|return ` boolean `| |
|drop()|Forces an Object, if held by a player, to be dropped.|return ` boolean `| |
|flip()|Flips Object over.|return ` boolean `| |
|highlightOff( ` color ` color)|Removes a highlight from around an Object.|return ` boolean `| |
|highlightOn( ` color ` color, ` float ` duration)|Creates a highlight around an Object. ` duration ` is optional and specified in seconds, when omitted the Object remains highlighted.|return ` boolean `| |
|jointTo( ` object ` object, ` table ` parameters)|Joints objects together, in the same way the Joint tool does.|return ` boolean `|[#jointto](#jointto)|
|moveToHandStash()|Moves a card in hand into the player's hand stash.|return ` boolean `|[#movetohandstash](#movetohandstash)|
|putObject( ` object ` put_object, ` int ` index)|Places an object into a container (chip stacks/bags/decks).|return ` object `|[#putobject](#putobject)|
|randomize( ` string ` color)|Shuffles deck/bag, rolls dice/coin, lifts other objects into the air. Same as pressing R by default. If the optional parameter ` color ` is used, this function will trigger `onObjectRandomized()`, passing that player color.|return ` boolean `| |
|registerCollisions( ` boolean ` stay)|Registers this object for Global collision events.|return ` boolean `|[#registercollisions](#registercollisions)|
|reload()|Returns Object reference of itself after it respawns itself.|return ` object `|[#reload](#reload)|
|removeAttachment( ` int ` index)|Removes a child with the given index. Use [getAttachments()](#getattachments) to find out the index property.|return ` object `| |
|removeAttachments()|Detaches the children of this Object. Returns a table of object references|return ` table `| |
|removeFromPlayerSelection( ` string ` player_color)|Removes object from player's selection.|return ` boolean `| |
|reset()|Resets this Object. Resetting a Deck brings all the Cards back into it. Resetting a Bag clears its contents (works for both Loot and Infinite Bags).|return ` boolean `| |
|roll()|Rolls dice/coins.|return ` boolean `| |
|shuffle()|Shuffles/shakes up contents of a deck or bag.|return ` boolean `| |
|shuffleStates()|Returns an Object reference to a new [state](https://kb.tabletopsimulator.com/host-guides/creating-states/) after randomly selecting and changing to one.|return ` object `| |
|split( ` int ` piles)|Splits a deck, as evenly as possible, into a number of piles.|return ` table `|[#split](#split)|
|spread( ` float ` distance)|Uses the spread action on a deck.|return ` table `|[#spread](#spread)|
|takeObject( ` table ` parameters)|Takes an object out of a container (bag/deck/chip stack), returning a reference to the object that was taken out.|return ` object `|[#takeobject](#takeobject)|
|unregisterCollisions()|Unregisters this object for Global collision events.|return ` boolean `|[#unregistercollisions](#unregistercollisions)|

### Component Functions {#component-functions}

Component APIs are an advanced feature. An **understanding of how Unity works is required**to utilize them. See the [Introduction to Components](../components/introduction/)for more information.

|Name|Return|Description|
|---|---|---|
|getChild( ` string ` name)|[GameObject](../components/gameobject/)|Returns a child GameObject matching the specified ` name `.|
|getChildren()|return ` table `|Returns the list of children GameObjects.|
|getComponent( ` string ` name)|[Component](../components/component/)|Returns a Component matching the specified ` name ` from the Object's list of Components.|
|getComponentInChildren( ` string ` name)|[Component](../components/component/)|Returns a Component matching the specified ` name `. Found by searching the Components of the Object and its [children](#getchildren) recursively (depth first).|
|getComponents( ` string ` name)|return ` table `|Returns the Object's list of Components. ` name ` is optional, when specified only Components with specified ` name ` will be included.|
|getComponentsInChildren( ` string ` name)|return ` table `|Returns a list of Components found by searching the Object and its [children](#getchildren) recursively (depth first). ` name ` is optional, when specified only Components with specified ` name ` will be included.|

### Hide Functions {#hide-functions}

These functions can hide Objects, similar to how hand zones or hidden zones do.

|Function Name|Description|Return| |
|---|---|---|---|
|setHiddenFrom( ` table ` players)|Hides the Object from the specified players, as if it were in a hand zone.|return ` boolean `|[#sethiddenfrom](#sethiddenfrom)|
|setInvisibleTo( ` table ` players)|Hides the Object from the specified players, as if it were in a hidden zone.|return ` boolean `|[#setinvisibleto](#setinvisibleto)|
|attachHider( ` string ` id, ` boolean ` hidden, ` table ` players)|A more advanced version of `setHiddenFrom(...)`.|return ` boolean `|[#attachhider](#attachhider)|
|attachInvisibleHider( ` string ` id, ` boolean ` hidden, ` table ` players)|A more advanced version of `setInvisibleTo(...)`.|return ` boolean `|[#attachinvisiblehider](#attachinvisiblehider)|

### Global Function {#global-function}

The functions can be used on Objects, but can also be used on the game world using ` Global `.
> **Note: Examples of Using Global and Object**
>
> * `self.getSnapPoints()` gets snap points attached to that Object.
> * `Global.getSnapPoints()` gets snap points not attached to any specific Object but instead are attached to the game world.
|Function Name|Description|Return| |
|---|---|---|---|
|addDecal( ` table ` parameters)|Add a Decal onto an object or the game world.|return ` boolean `|[#adddecal](#adddecal)|
|call( ` string ` func_name, ` table ` func_params)|Used to call a Lua function on another entity.|return ` variable `|[#call](#call)|
|getDecals()|Returns information on all decals attached to this object or the world.|return ` table `|[#getdecals](#getdecals)|
|getLuaScript()|Get a Lua script as a string from the entity.|return ` string `| |
|getSnapPoints()|Returns a table representing a list of snap points.|return ` table `|[#getsnappoints](#getsnappoints)|
|getTable( ` string ` table_name)|Data value of a variable in another Object's script. Can only return a table.|return ` table `| |
|getVar( ` string ` var_name)|Data value of a variable in another entity's script. Cannot return a table.|return ` variable `| |
|getVectorLines()|Returns Table of data representing the current Vector Lines on this entity. See [setVectorLines](#setvectorlines) for table format.|return ` table `| |
|setDecals( ` table ` parameters)|Sets which decals are on an object. This removes other decals already present, and can remove all decals as well.|return ` boolean `|[#setdecals](#setdecals)|
|setLuaScript( ` string ` script)|Input a string as an entity's Lua script. Generally only used after spawning a new Object.|return ` boolean `| |
|setSnapPoints( ` table ` snap_points)|Replaces existing snap points with the specified list of snap points.|return ` boolean `|[#setsnappoints](#setsnappoints)|
|setTable( ` string ` func_name, ` table ` data)|Creates/updates a variable in another entity's script. Only used for tables.|return ` boolean `| |
|setVar( ` string ` func_name, ` variable ` data)|Creates/updates a variable in another entity's script. Cannot set a table.|return ` boolean `| |
|setVectorLines( ` table ` parameters)|Spawns Vector Lines from a list of parameters on this entity.|return ` boolean `|[#setvectorlines](#setvectorlines)|

---

## Function Details {#function-details}

### Transform Function Details {#transform-function-details}

#### addForce(...) {#addforce}

[../types/](../types/)Adds force to an object in a directional Vector.
> **Info: addForce(vector, force_type)**
>
> * [../types/](../types/) **vector**: A Vector of the direction and magnitude of force.
> * [../types/](../types/) **force_type**: An Int representing the force type to apply. Options below.
>
> * Optional, defaults to 3.
> * **1**: Continuous force, uses mass. *(Force)*
> * **2**: Continuous acceleration, ignores mass. *(Acceleration)*
> * **3**: Instant force impulse, uses mass. *(Impulse)*
> * **4**: Instant velocity change, ignores mass. *(Velocity Change)*
> * Optional, defaults to 3.
> * **1**: Continuous force, uses mass. *(Force)*
> * **2**: Continuous acceleration, ignores mass. *(Acceleration)*
> * **3**: Instant force impulse, uses mass. *(Impulse)*
> * **4**: Instant velocity change, ignores mass. *(Velocity Change)*

---

#### addTorque(...) {#addtorque}

[../types/](../types/)Adds torque to an object in a rotational Vector.
> **Info: addTorque(vector, force_type)**
>
> * [../types/](../types/) **vector**: A Vector of the direction and magnitude of rotational force.
> * [../types/](../types/) **force_type**: An Int representing the force type to apply. Options below.
>
> * Optional, defaults to 3.
> * **1**: Continuous force, uses mass. *(Force)*
> * **2**: Continuous acceleration, ignores mass. *(Acceleration)*
> * **3**: Instant force impulse, uses mass. *(Impulse)*
> * **4**: Instant velocity change, ignores mass. *(Velocity Change)*
> * Optional, defaults to 3.
> * **1**: Continuous force, uses mass. *(Force)*
> * **2**: Continuous acceleration, ignores mass. *(Acceleration)*
> * **3**: Instant force impulse, uses mass. *(Impulse)*
> * **4**: Instant velocity change, ignores mass. *(Velocity Change)*

---

#### getBounds() {#getbounds}

[../types/](../types/)Returns a Table of Vector information describing the size of an object in Global terms. [Bounds](https://docs.unity3d.com/2019.1/Documentation/ScriptReference/Bounds.html)are part of Unity, and represent an imaginary square box that can be drawn around an object. Unlike scale, it can help indicate the size of an object in in-game units, not just relative model size.
> **Info: Return Table**
>
> * [../types/](../types/) **center**: The Vector of the center of the bounding box.
> * [../types/](../types/) **size**: The Vector of the size of the bounding box.
> * [../types/](../types/) **offset**: The Vector of the offset of the center of the bounding box from the middle of the Object model.
>
```lua
-- Example returned Table
{
 center = {x=0, y=3, z=0, 0, 3, 0},
 size = {x=5, y=5, z=5}, 5, 5, 5},
 offset = {x=0, y=-1, z=0, 0, -1, 0}
}
```

---

#### getBoundsNormalized() {#getboundsnormalized}

[../types/](../types/)Returns a Table of Vector information describing the size of the merged colliders on an object in Global terms, as if it was rotated to {0,0,0}. [Bounds](https://docs.unity3d.com/2019.1/Documentation/ScriptReference/Bounds.html)are part of Unity, and represent an imaginary square box that can be drawn around an object. Unlike scale, it can help indicate the size of an object in in-game units, not just relative model size.
> **Info: Return Table**
>
> * [../types/](../types/) **center**: The Vector of the center of the bounding box.
> * [../types/](../types/) **size**: The Vector of the size of the bounding box.
> * [../types/](../types/) **offset**: The Vector of the offset of the center of the bounding box from the middle of the Object model.
>
```lua
-- Example returned Table
{
 center = {x=0, y=3, z=0, 0, 3, 0},
 size = {x=5, y=5, z=5}, 5, 5, 5},
 offset = {x=0, y=-1, z=0, 0, -1, 0}
}
```

---

#### getScale() {#getscale}

[../types/](../types/)Returns a Vector of the current scale. Scale is not an absolute measurement, it is a multiple of the Object's default model size. So {x=2, y=2, z=2} would be a model twice its default size, not 2 units large.

---

#### getTransformForward() {#gettransformforward}

[../types/](../types/)Returns a Vector of the forward direction of this Object. The direction is relative to how the object is facing.

```lua
-- Example of moving forward 5 units
function onLoad()
 distance = 5
 pos_target = self.getTransformForward()
 pos_current = self.getPosition()
 pos = {
 x = pos_current.x + pos_target.x * distance,
 y = pos_current.y + pos_target.y * distance,
 z = pos_current.z + pos_target.z * distance,
 }
 self.setPositionSmooth(pos)
end
```

---

#### getTransformRight() {#gettransformright}

[../types/](../types/)Returns a Vector of the forward direction of this object. The direction is relative to how the object is facing.

```lua
-- Example of moving right 5 units
function onLoad()
 distance = 5
 pos_target = self.getTransformRight()
 pos_current = self.getPosition()
 pos = {
 x = pos_current.x + pos_target.x * distance,
 y = pos_current.y + pos_target.y * distance,
 z = pos_current.z + pos_target.z * distance,
 }
 self.setPositionSmooth(pos)
end
```

---

#### getTransformUp() {#gettransformup}

[../types/](../types/)Returns a Vector of the up direction of this Object. The direction is relative to how the object is facing.

```lua
-- Example of moving up 5 units
function onLoad()
 distance = 5
 pos_target = self.getTransformUp()
 pos_current = self.getPosition()
 pos = {
 x = pos_current.x + pos_target.x * distance,
 y = pos_current.y + pos_target.y * distance,
 z = pos_current.z + pos_target.z * distance,
 }
 self.setPositionSmooth(pos)
end
```

---

#### getVisualBoundsNormalized() {#getvisualboundsnormalized}

[../types/](../types/)Returns a Table of Vector information describing the size of the merged renderers on an object in Global terms, as if it was rotated to {0,0,0}. [Bounds](https://docs.unity3d.com/2019.1/Documentation/ScriptReference/Bounds.html)are part of Unity, and represent an imaginary square box that can be drawn around an object. Unlike scale, it can help indicate the size of an object in in-game units, not just relative model size.
> **Info: Return Table**
>
> * [../types/](../types/) **center**: The Vector of the center of the bounding box.
> * [../types/](../types/) **size**: The Vector of the size of the bounding box.
> * [../types/](../types/) **offset**: The Vector of the offset of the center of the bounding box from the middle of the Object model.
>
```lua
-- Example returned Table
{
 center = {x=0, y=3, z=0, 0, 3, 0},
 size = {x=5, y=5, z=5}, 5, 5, 5},
 offset = {x=0, y=-1, z=0, 0, -1, 0}
}
```

---

#### positionToLocal(...) {#positiontolocal}

[../types/](../types/)Returns a Vector after converting a world vector to a local Vector. A world Vector is a positional Vector using the world's coordinate system. A Local Vector is a positional Vector that is relative to the position of the given object.
> **Tip: Object Scale**
> This function takes the Object's scale into account, as the Object is the key relative point.
> **Info: positionToLocal(vector)**
>
> * [../types/](../types/) **vector**: The world position to convert into a local position.

---

#### positionToWorld(...) {#positiontoworld}

[../types/](../types/)Returns a Vector after converting a local Vector to a world Vector. A world Vector is a positional Vector using the world's coordinate system. A Local Vector is a positional Vector that is relative to the position of the given object.
> **Tip: Object Scale**
> This function takes the Object's scale into account, as the Object is the key relative point.
> **Info: positionToLocal(vector)**
>
> * [../types/](../types/) **vector**: The local position to convert into a world position.

---

#### rotate(...) {#rotate}

[../types/](../types/)Rotates Object smoothly in the direction of the given Vector. This does not set the Object to face a specific rotation, it rotates the Object around by the number of degrees given for x/y/z.
> **Info: rotate(vector)**
>
> * [../types/](../types/) **vector**: The amount of x/y/z to rotate by.
>
```lua
--Rotates object 90 degrees around its Y axis
self.rotate({x=0, y=90, z=0})
```

---

#### scale(...) {#scale}

[../types/](../types/)Scales Object by a multiple. This does not set the Object to a specific scale, it scales the Object by the given multiple.
> **Info: scale(scale)**
>
> * [../types/#vector](../types/#vector) **scale**: Multiplier for scale.
>
> * {x=1, y=1, z=1} would not change the scale.
> * {x=1, y=1, z=1} would not change the scale.
> **Info: scale(scale)**
> * [../types/](../types/) **scale**: Multiplier for scale which is applied to the X/Y/Z.
>
> * 1 would not change the scale.
> * 1 would not change the scale.
>
```lua
-- Both examples work to scale an object to be twice its current scale
self.scale({x=2, y=2, z=2})
self.scale(2)
```

---

#### setPositionSmooth(...) {#setpositionsmooth}

[../types/](../types/)Moves the Object smoothly to the given Vector.
> **Info: setPositionSmooth(vector, collide, fast)**
>
> * [../types/](../types/) **vector**: A positional Vector.
> * [../types/](../types/) **collide**: If the Object will collide with other Objects while moving.
> * [../types/](../types/) **fast**: If the Object is moved quickly.

---

#### setRotationSmooth(...) {#setrotationsmooth}

[../types/](../types/)Rotates the Object smoothly to the given Vector.
> **Info: setRotationSmooth(vector, collide, fast)**
>
> * [../types/](../types/) **vector**: A rotational Vector.
> * [../types/](../types/) **collide**: If the Object will collide with other Objects while rotating.
> * [../types/](../types/) **fast**: If the Object is rotated quickly.

---

### UI Function Details {#ui-function-details}

#### createButton(...) {#createbutton}

[../types/](../types/)Creates a scripted button attached to the Object. Scripted buttons are buttons that can be clicked while in-game that trigger a function in a script.

##### Button Tips

* Buttons can not be clicked from their back side.
* Buttons can not be clicked if there is another object between the pointer and the button. This does not include the Object the button is attached to.
* Buttons are placed relative to the Object they are attached to.
* The maximum font size is capped at 1000.
* The minimum width/height is 60. Any lower number (besides 0) will appear to be 60. This prevents visual glitches involving the corner rounding.
* A button width/height of 0 will cause the button not to be drawn, but its label will be. This can be a way to attach text to an Object.
* You cannot assign an index to a button. It is given one automatically.

> **Info: createButton(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing the information used to spawn the button.
>
> * [../types/](../types/) **parameters.click_function**: A String of the function's name that will be run when button is clicked.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the click_function function.
>
> * Optional, Defaults to Global.
> * [../types/](../types/) **parameters.label**: Text that appears on the button.
>
> * Optional, defaults to an empty string.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the button appears, relative to the Object's center.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the button is rotated, relative to the Object's rotation.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the button, relative to the Object's scale.
>
> * Optional, defaults to {x=1, y=1, z=1}.
> * [../types/](../types/) **parameters.width**: How wide the button will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.height**: How tall the button will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.font_size**: Size the label font will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the clickable button.
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the label text.
>
> * Optional, defaults to {r=0, g=0, b=0}.
> * [../types/#color](../types/#color) **parameters.hover_color**: A Color for the background during mouse-over.
>
> * Optional.
> * [../types/#color](../types/#color) **parameters.press_color**: A Color for the background when clicked.
>
> * Optional.
> * [../types/](../types/) **parameters.tooltip**: Popup of text, similar to how an Object's name is displayed on mouseover.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **parameters.click_function**: A String of the function's name that will be run when button is clicked.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the click_function function.
>
> * Optional, Defaults to Global.
> * [../types/](../types/) **parameters.label**: Text that appears on the button.
>
> * Optional, defaults to an empty string.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the button appears, relative to the Object's center.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the button is rotated, relative to the Object's rotation.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the button, relative to the Object's scale.
>
> * Optional, defaults to {x=1, y=1, z=1}.
> * [../types/](../types/) **parameters.width**: How wide the button will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.height**: How tall the button will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.font_size**: Size the label font will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the clickable button.
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the label text.
>
> * Optional, defaults to {r=0, g=0, b=0}.
> * [../types/#color](../types/#color) **parameters.hover_color**: A Color for the background during mouse-over.
>
> * Optional.
> * [../types/#color](../types/#color) **parameters.press_color**: A Color for the background when clicked.
>
> * Optional.
> * [../types/](../types/) **parameters.tooltip**: Popup of text, similar to how an Object's name is displayed on mouseover.
>
> * Optional, defaults to an empty string.
> * Optional, Defaults to Global.
> * Optional, defaults to an empty string.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=1, y=1, z=1}.
> * Optional, defaults to 100.
> * Optional, defaults to 100.
> * Optional, defaults to 100.
> * Optional, defaults to {r=1, g=1, b=1}.
> * Optional, defaults to {r=0, g=0, b=0}.
> * Optional.
> * Optional.
> * Optional, defaults to an empty string.
> **Info: click_function(obj, player_clicker_color, alt_click)**
> *The click function which is activated by clicking this button has its own parameters it is passed automatically.*
> * [../types/](../types/) **obj**: The Object the button is attached to.
> * [../types/](../types/) **player_clicker_color**: [Player Color](../player/colors/)of the player that pressed the button.
> * [../types/](../types/) **alt_click**: True if a button other than left-click was used to click the button.

```lua
function onLoad()
 params = {
 click_function = "click_func",
 function_owner = self,
 label = "Test",
 position = {0, 1, 0},
 rotation = {0, 180, 0},
 width = 800,
 height = 400,
 font_size = 340,
 color = {0.5, 0.5, 0.5},
 font_color = {1, 1, 1},
 tooltip = "This text appears on mouseover.",
 }
 self.createButton(params)
end
function click_func(obj, color, alt_click)
 print(obj)
 print(color)
 print(alt_click)
end
```

> **Note: Bug**
> Button scale currently distorts button height and width if the button is rotated at anything besides `{0,0,0}`.

---

#### createInput(...) {#createinput}

[../types/](../types/)Creates a scripted input attached to the Object. Scripted inputs are boxes you can click inside of in-game to input/edit text. Every letter typed triggers the function. The bool that is returned as part of the input_function allows you to determine when a player has finished editing the input.

> ##### Input Tips
>
> * Inputs can not be clicked from their back side.
> * Inputs can not be clicked if there is another object between the pointer and the inputs. This does not include the Object the input is attached to.
> * Inputs are placed relative to the Object they are attached to.
> * The maximum font size is capped at 1000.
> * The minimum width/height is 60. Any lower number (besides 0) will appear to be 60. This prevents visual glitches involving the corner rounding.
> * Font that does not fit in the input window's width/height does NOT display. To know how much height you need for each line, the formula is `(font_size * # of lines) + 23`. In other words, multiply how many lines of text you want to display by your font_size and add 23. That is your height value.
> * You cannot assign an index to an input. It is given one automatically.

##### **Info: createInput(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing the information used to spawn the input.
>
> * [../types/](../types/) **parameters.input_function**: A String of the function's name that will be run when a key is used or when it is deselected.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the input_function function.
>
> * Optional, Defaults to Global.
> * [../types/](../types/) **parameters.label**: Text that appears as greyed out text when there is no value in the input.
>
> * Optional, defaults to an empty string.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the input appears, relative to the Object's center.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the input is rotated, relative to the Object's rotation.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the input, relative to the Object's scale.
>
> * Optional, defaults to {x=1, y=1, z=1}.
> * [../types/](../types/) **parameters.width**: How wide the input will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.height**: How tall the input will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.font_size**: Size the label/value font will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the input's background.
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the value text.
>
> * Optional, defaults to {r=0, g=0, b=0}.
> * [../types/](../types/) **parameters.tooltip**: A popup of text, similar to how an Object's name is displayed on mouseover.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **parameters.alignment**: How text is aligned in the input box.
>
> * Optional, defaults to 1.
> * **1**: Automatic
> * **2**: Left
> * **3**: Center
> * **4**: Right
> * **5**: Justified
> * [../types/](../types/) **parameters.value**: Text entered into the input.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **parameters.validation**: What characters can be input into the input value field.
>
> * Optional, defaults to 1.
> * **1**: None
> * **2**: Integer
> * **3**: Float
> * **4**: Alphanumeric
> * **5**: Username
> * **6**: Name
> * [../types/](../types/) **parameters.tab**: How the pressing of "tab" is handled when inputting.
>
> * Optional, defaults to 1.
> * **1**: None
> * **2**: Select Next Input
> * **3**: Indent
> * [../types/](../types/) **parameters.input_function**: A String of the function's name that will be run when a key is used or when it is deselected.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the input_function function.
>
> * Optional, Defaults to Global.
> * [../types/](../types/) **parameters.label**: Text that appears as greyed out text when there is no value in the input.
>
> * Optional, defaults to an empty string.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the input appears, relative to the Object's center.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the input is rotated, relative to the Object's rotation.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the input, relative to the Object's scale.
>
> * Optional, defaults to {x=1, y=1, z=1}.
> * [../types/](../types/) **parameters.width**: How wide the input will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.height**: How tall the input will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/](../types/) **parameters.font_size**: Size the label/value font will be, relative to the Object.
>
> * Optional, defaults to 100.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the input's background.
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the value text.
>
> * Optional, defaults to {r=0, g=0, b=0}.
> * [../types/](../types/) **parameters.tooltip**: A popup of text, similar to how an Object's name is displayed on mouseover.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **parameters.alignment**: How text is aligned in the input box.
>
> * Optional, defaults to 1.
> * **1**: Automatic
> * **2**: Left
> * **3**: Center
> * **4**: Right
> * **5**: Justified
> * [../types/](../types/) **parameters.value**: Text entered into the input.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **parameters.validation**: What characters can be input into the input value field.
>
> * Optional, defaults to 1.
> * **1**: None
> * **2**: Integer
> * **3**: Float
> * **4**: Alphanumeric
> * **5**: Username
> * **6**: Name
> * [../types/](../types/) **parameters.tab**: How the pressing of "tab" is handled when inputting.
>
> * Optional, defaults to 1.
> * **1**: None
> * **2**: Select Next Input
> * **3**: Indent
> * Optional, Defaults to Global.
> * Optional, defaults to an empty string.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=1, y=1, z=1}.
> * Optional, defaults to 100.
> * Optional, defaults to 100.
> * Optional, defaults to 100.
> * Optional, defaults to {r=1, g=1, b=1}.
> * Optional, defaults to {r=0, g=0, b=0}.
> * Optional, defaults to an empty string.
> * Optional, defaults to 1.
> * **1**: Automatic
> * **2**: Left
> * **3**: Center
> * **4**: Right
> * **5**: Justified
> * Optional, defaults to an empty string.
> * Optional, defaults to 1.
> * **1**: None
> * **2**: Integer
> * **3**: Float
> * **4**: Alphanumeric
> * **5**: Username
> * **6**: Name
> * Optional, defaults to 1.
> * **1**: None
> * **2**: Select Next Input
> * **3**: Indent
> **Info: input_function(obj, player_clicker_color, input_value, selected)**
> *The click function which is activated by editing the text in this input has its own parameters it is passed automatically.*
> * [../types/](../types/) **obj**: The Object the input is attached to.
> * [../types/](../types/) **player_clicker_color**: [Player Color](../player/colors/)of the player that has selected/edited the input.
> * [../types/](../types/) **input_value**: Text currently in the input.
> * [../types/](../types/) **selected**: If the value box is still being edited or not.
>
```lua
function onLoad()
 self.createInput({
 input_function = "input_func",
 function_owner = self,
 label = "Gold",
 alignment = 4,
 position = {x=0, y=1, z=0},
 width = 800,
 height = 300,
 font_size = 323,
 validation = 2,
 })
end
function input_func(obj, color, input, stillEditing)
 print(input)
 if not stillEditing then
 print("Finished editing.")
 end
end
```

---

#### editButton(...) {#editbutton}

[../types/](../types/)Modify an existing button. The only parameter that is required is the index. The rest are optional, and not using them will cause the edited button's element to remain. Indexes start at 0. The first button on any given Object has an index of 0, the next button on it has an index of 1, etc. Each Object has its own indexes.
> **Info: editButton(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing the information used to spawn the button.
>
> * [../types/](../types/) **parameters.index**: Index of the button you want to edit.
> * [../types/](../types/) **parameters.click_function**: Function's name that will be run when button is clicked.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the click_function function.
> * [../types/](../types/) **parameters.label**: Text that appears on the button.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the button appears, relative to the Object's center.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the button is rotated, relative to the Object's rotation.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the button, relative to the Object's scale.
> * [../types/](../types/) **parameters.width**: How wide the button will be, relative to the Object.
> * [../types/](../types/) **parameters.height**: How tall the button will be, relative to the Object.
> * [../types/](../types/) **parameters.font_size**: Size the label font will be, relative to the Object.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the clickable button.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the label text.
> * [../types/#color](../types/#color) **parameters.hover_color**: A Color for the background during mouse-over.
> * [../types/#color](../types/#color) **parameters.press_color**: A Color for the background when clicked.
> * [../types/](../types/) **parameters.tooltip**: Text of a popup of text, similar to how an Object's name is displayed on mouseover.
> * [../types/](../types/) **parameters.index**: Index of the button you want to edit.
> * [../types/](../types/) **parameters.click_function**: Function's name that will be run when button is clicked.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the click_function function.
> * [../types/](../types/) **parameters.label**: Text that appears on the button.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the button appears, relative to the Object's center.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the button is rotated, relative to the Object's rotation.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the button, relative to the Object's scale.
> * [../types/](../types/) **parameters.width**: How wide the button will be, relative to the Object.
> * [../types/](../types/) **parameters.height**: How tall the button will be, relative to the Object.
> * [../types/](../types/) **parameters.font_size**: Size the label font will be, relative to the Object.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the clickable button.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the label text.
> * [../types/#color](../types/#color) **parameters.hover_color**: A Color for the background during mouse-over.
> * [../types/#color](../types/#color) **parameters.press_color**: A Color for the background when clicked.
> * [../types/](../types/) **parameters.tooltip**: Text of a popup of text, similar to how an Object's name is displayed on mouseover.
>
```lua
self.editButton({index=0, label="New Label"})
```

---

#### editInput(...) {#editinput}

[../types/](../types/)Modify an existing input. The only parameter that is required is the index. The rest are optional, and not using them will cause the edited input's element to remain. Indexes start at 0. The first input on any given Object has an index of 0, the next input on it has an index of 1, etc. Each Object has its own indexes.
> **Info: editInput(parameters)**
> *All fields besides index are optional. If not used, the element will default to the element's current setting.*
>
> * [../types/](../types/) **parameters**: A Table containing the information used to spawn the input.
>
> * [../types/](../types/) **parameters.index**: Index of the input you want to edit.
> * [../types/](../types/) **parameters.input_function**: The function's name that will be run when the input is selected.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the input_function function.
> * [../types/](../types/) **parameters.label**: Text that appears as greyed out text when there is no value in the input.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the input appears, relative to the Object's center.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the input is rotated, relative to the Object's rotation.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the input, relative to the Object's scale.
> * [../types/](../types/) **parameters.width**: How wide the input will be, relative to the Object.
> * [../types/](../types/) **parameters.height**: How tall the input will be, relative to the Object.
> * [../types/](../types/) **parameters.font_size**: Size the label/value font will be, relative to the Object.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the input's background.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the value text.
> * [../types/](../types/) **parameters.tooltip**: A popup of text, similar to how an Object's name is displayed on mouseover.
> * [../types/](../types/) **parameters.alignment**: How text is aligned in the input box.
>
> * **1**: Automatic
> * **2**: Left
> * **3**: Center
> * **4**: Right
> * **5**: Justified
> * [../types/](../types/) **parameters.value**: A String of the text entered into the input.
> * [../types/](../types/) **parameters.validation**: An Int which determines what characters can be input into the value.
>
> * **1**: None
> * **2**: Integer
> * **3**: Float
> * **4**: Alphanumeric
> * **5**: Username
> * **6**: Name
> * [../types/](../types/) **parameters.tab**: An Int which determines how pressing tab is handled when inputting.
>
> * **1**: None
> * **2**: Select Next Input
> * **3**: Indent
> * [../types/](../types/) **parameters.index**: Index of the input you want to edit.
> * [../types/](../types/) **parameters.input_function**: The function's name that will be run when the input is selected.
> * [../types/](../types/) **parameters.function_owner**: The Object which contains the input_function function.
> * [../types/](../types/) **parameters.label**: Text that appears as greyed out text when there is no value in the input.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the input appears, relative to the Object's center.
> * [../types/#vector](../types/#vector) **parameters.rotation**: How the input is rotated, relative to the Object's rotation.
> * [../types/#vector](../types/#vector) **parameters.scale**: Scale of the input, relative to the Object's scale.
> * [../types/](../types/) **parameters.width**: How wide the input will be, relative to the Object.
> * [../types/](../types/) **parameters.height**: How tall the input will be, relative to the Object.
> * [../types/](../types/) **parameters.font_size**: Size the label/value font will be, relative to the Object.
> * [../types/#color](../types/#color) **parameters.color**: A Color for the input's background.
> * [../types/#color](../types/#color) **parameters.font_color**: A Color for the value text.
> * [../types/](../types/) **parameters.tooltip**: A popup of text, similar to how an Object's name is displayed on mouseover.
> * [../types/](../types/) **parameters.alignment**: How text is aligned in the input box.
>
> * **1**: Automatic
> * **2**: Left
> * **3**: Center
> * **4**: Right
> * **5**: Justified
> * [../types/](../types/) **parameters.value**: A String of the text entered into the input.
> * [../types/](../types/) **parameters.validation**: An Int which determines what characters can be input into the value.
>
> * **1**: None
> * **2**: Integer
> * **3**: Float
> * **4**: Alphanumeric
> * **5**: Username
> * **6**: Name
> * [../types/](../types/) **parameters.tab**: An Int which determines how pressing tab is handled when inputting.
>
> * **1**: None
> * **2**: Select Next Input
> * **3**: Indent
> * **1**: Automatic
> * **2**: Left
> * **3**: Center
> * **4**: Right
> * **5**: Justified
> * **1**: None
> * **2**: Integer
> * **3**: Float
> * **4**: Alphanumeric
> * **5**: Username
> * **6**: Name
> * **1**: None
> * **2**: Select Next Input
> * **3**: Indent
>
```lua
self.editInput({index=0, value="New Value"})
```

---

#### getButtons() {#getbuttons}

[../types/](../types/)Returns a Table of all buttons on this Object. The Table contains parameters tables with the same keys as seen in the [createButton](#createbutton)section, except each Table of parameters also contains an **index**entry. This is used to identify each button, used by [editButton](#editbutton)and [removeButton](#removebutton).
Indexes start at 0.

---

#### getInputs() {#getinputs}

[../types/](../types/)Returns a Table of all inputs on this Object. The Table contains parameters tables with the same keys as seen in the [createInput](#createinput)section, except each Table of parameters also contains an **index**entry. This is used to identify each input, used by [editInput](#editinput)and [removeInput](#removeinput).
Indexes start at 0.

---

#### removeButton(...) {#removebutton}

[../types/](../types/)Removes a specific button. Indexes start at 0. The first button on any given Object has an index of 0, the next button on it has an index of 1, etc. Each Object has its own indexes.
Removing an index instantly causes all other higher indexes to shift down 1.
> **Info: removeButton(index)**
>
> * [../types/](../types/) **index**: Button index to remove.

---

#### removeInput(...) {#removeinput}

[../types/](../types/)Removes a specific input. Indexes start at 0. The first input on any given Object has an index of 0, the next input on it has an index of 1, etc. Each Object has its own indexes.
Removing an index instantly causes all other higher indexes to shift down 1.
> **Info: removeInput(index)**
>
> * [../types/](../types/) **index**: Input index to remove.

---

### Get Function Details {#get-function-details}

#### getCustomObject() {#getcustomobject}

[../types/](../types/)Returns a Table with the Custom Object information of a Custom Object. See the [Custom Game Objects](../custom-game-objects/)page for the kind of information returned.

```lua
-- Example returned Table for a custom token
{
 image = "SOME URL HERE",
 thickness = 0.2,
 merge_distance = 15,
 stackable = false,
}
```

> **Tip: Jigsaw Puzzles**
> If you use getCustomObject() on a puzzle piece, it will also return ` desired_position `, which is its position if the puzzle is "solved". You can use this to determine where to put the piece.

---

#### getFogOfWarReveal() {#getfogofwarreveal}

[../types/](../types/)Settings impacting [Fog of War](https://kb.tabletopsimulator.com/game-tools/zone-tools/#fog-of-war-zone)being revealed. In the example returned table, these are the default values of any object.
> **Note: Color Selection**
> "Black" and "All" are synonymous for Fog of War. Either means that all players can see the revealed area when ` reveal = true `.

```lua
-- Example returned Table for a custom token
{
 reveal = false,
 color = 'All',
 range = 5
}
```

---

#### getJoints() {#getjoints}

[../types/](../types/)Returns information on any joints attached to this object. This information included the GUID of the other objects attached via the joints.
This function returns a table of sub-tables, each sub-table representing one joint.
Example of a return table of an object with 2 joints:

```lua
{
 {
 type = "Spring",
 joint_object_guid = "555555",
 collision = false,
 break_force = 1000,
 break_torgue = 1000,
 axis = {0,0,0},
 anchor = {0,0,0},
 connector_anchor = {0,0,0},
 motor_force = 0,
 motor_velocity = 0,
 motor_free_spin = false,
 spring = 50,
 damper = 0.1
 max_distance = 10
 min_distance = 0
 },
 {
 type = "Spring",
 joint_object_guid = "888888",
 collision = false,
 break_force = 1000,
 break_torgue = 1000,
 axis = {0,0,0},
 anchor = {0,0,0},
 connector_anchor = {0,0,0},
 motor_force = 0,
 motor_velocity = 0,
 motor_free_spin = false,
 spring = 50,
 damper = 0.1
 max_distance = 10
 min_distance = 0
 },
}
```

Example of printing the first sub-table's information:

```lua
local jointsInfo = self.getJoints()
for k, v in pairs(jointsInfo[1]) do
 print(k, ": ", v)
end
```

---

#### getObjects(...) {#getobjects}

[../types/](../types/)Returns data describing the objects contained within in the zone/bag/deck.
The format of the data returned depends on the kind of object.

##### Containers (Bags/Decks) {#getobjects-containers}

Containers return a (numerically indexed) table consisting of sub-tables that each have the following properties:

|Name|Type|Description|
|---|---|---|
|description|` string `|[Description](#getdescription) of the contained object.|
|gm_notes|` string `|[GM Notes](#getgmnotes) on the contained object.|
|guid|` string `|[GUID](#guid) of the contained object.|
|index|` int `|Index of the contained object, represents the item's order in the container.|
|lua_script|` string `|[Lua script](#script_code) on the contained object.|
|lua_script_state|` string `|[Lua script saved state](#script_state) of the contained object.|
|memo|` string `|[Memo](#memo) on the contained object.|
|name|` string `|Name of the contained object. Will correspond with [getName()](#getname), unless it's blank, in which case it'll be the [internal resource name](#name).|
|nickname|` string `|` deprecated ` Use ` name `. [Name](#getname) of the item.|
|tags|` table `|A table of ` string ` representing the [tags](https://kb.tabletopsimulator.com/game-tools/object-tags/) on the contained object.|

> **Example: Example**
> Find a contained object with the name "Super Card" (within the Bag/Deck ` object `), and use its index to [take the object out](#takeobject)of the container.
>
> ```lua
> -- Iterate through each contained object
> for _, containedObject in ipairs(object.getObjects()) do
> if containedObject.name == "Super Card" then
> object.takeObject({
> index = containedObject.index
> })
> break -- Stop iterating
> end
> end
> ```
>
> ```lua
> -- Iterate through each contained object
> for _, containedObject in ipairs(object.getObjects()) do
> if containedObject.name == "Super Card" then
> object.takeObject({
> index = containedObject.index
> })
> break -- Stop iterating
> end
> end
> ```
>
##### Zones {#getobjects-zones}

Zones return a (numerically indexed) table of game Objects occupying the zone.
> **Info: getObjects(ignore_tags=false)**
>
> * [../types/](../types/) **ignore_tags**: If ` true ` then all objects in the zone will be returned, regardless of tags.
> **Note: Important**
> If the zone has [tags](#tag-functions), then only objects with compatible tags will occupy the zone (unless ` ignore_tags ` is true).
> **Example: Example**
> [Highlight](#highlighton)red all cards occupying a zone (` object `), regardless of tag.
>
> ```lua
> -- Iterate through object occupying the zone
> for _, occupyingObject in ipairs(object.getObjects(true)) do
> if occupyingObject.type == "Card" then
> occupyingObject.highlightOn('Red')
> end
> end
> ```
>
> ```lua
> -- Iterate through object occupying the zone
> for _, occupyingObject in ipairs(object.getObjects(true)) do
> if occupyingObject.type == "Card" then
> occupyingObject.highlightOn('Red')
> end
> end
> ```

---

#### getRotationValue() {#getrotationvalue}

[../types/](../types/)Returns the current rotationValue. Rotation values are used to give value to different rotations (like dice) and are set using scripting or the Gizmo tool. The value returned is for the rotation that is closest to being pointed "up".
The returned value will either be a number or a string, depending on the value that was given to that rotation.

```lua
local value = self.getRotationValue()
print(value)
```

---

#### getRotationValues() {#getrotationvalues}

[../types/](../types/)Returns a Table of rotation values. Rotation values are used to give value to different rotations (like dice) based on which side is pointed "up". It works by checking all of the rotation values assigned to an object and determining which one of them is closest to pointing up, and then displaying the value associated with that rotation.
You can manually assign rotation values to objects using the Rotation Value Gizmo tool (in the left side Gizmo menu) or using [setRotationValues(...)](#setrotationvalues).
> **Info: Return Table**
> The returned Table contains sub-Tables, each sub-Table containing these 2 key/value pairs.
>
> * [../types/](../types/) **value**: What value is associated with a given rotation. Often a String or Int.
>
> * Starting a value with a # will cause it not to show in the Object's tooltip.
> * [../types/#vector](../types/#vector) **rotation**: Rotation of the Object that best represents the given value pointing up.
> * Starting a value with a # will cause it not to show in the Object's tooltip.
>
```lua
-- Example returned Table for a coin
{
 {value="Heads", rotation={x=0, y=0, z=0}},
 {value="Tails", rotation={x=180, y=0, z=0}},
}
```

---

#### getStates() {#getstates}

[../types/](../types/)Returns a Table of information on the [states](https://kb.tabletopsimulator.com/host-guides/creating-states/)of an Object. Stated Objects have ids (indexes) starting with 1.
> **Tip: The returned table will NOT include data on the current state.**
>
> **Info: Return Table**
> Returns a table of sub-tables. Each sub-table represents one other state.
>
> * [../types/](../types/) **name**: Name of the item.
> * [../types/](../types/) **description**: Description of the item.
> * [../types/](../types/) **guid**: GUID of the item.
> * [../types/](../types/) **id**: Index of the item, represents the item's order in the states.
> * [../types/](../types/) **lua_script**: Any Lua scripting saved on the item.
> * [../types/](../types/) **lua_script_state**: Any JSON save data on this item.
> * nickname: A duplicate of the "name" field.
>
> * This is for backwards compatibility purposes only.
> * This is for backwards compatibility purposes only.
>
```lua
-- Example returned Table
{
 {
 name = "First State",
 description = "",
 guid = "AAA111",
 id = 1,
 lua_script = "",
 lua_script_state = "",
 },
 {
 name = "Second State",
 description = "",
 guid = "BBB222",
 id = 2,
 lua_script = "",
 lua_script_state = "",
 },
}
```

---

#### getValue() {#getvalue}

[../types/](../types/)Returns the Object's value. This represents something different depending on the Object's [type](#type).
> **Note: Important**
> If the Object has [rotation values](#getrotationvalues), then this method will return the rotation value i.e. behave
> the same as [getRotationValue()](#getrotationvalue).
See [setValue(...)](#setvalue)for more information.

---

#### getZones() {#getzones}

[../types/](../types/)Returns a list of zones that the object is currently occupying.
> **Note: Important**
> If the object has [tags](./#tag-functions), then the object will only occupy zones with compatible tags.
> **Example: Example**
> Print a comma separated list of GUIDs belonging to zones an object is currently occupying.
>
> ```lua
> local guids = {}
> for _, zone in ipairs(object.getZones()) do
> table.insert(guids, zone.guid)
> end
> if #guids > 0 then
> print("Object is contained within ".. table.concat(guids, ", "))
> else
> print("Object is not contained within any zones")
> end
> ```
>
> ```lua
> local guids = {}
> for _, zone in ipairs(object.getZones()) do
> table.insert(guids, zone.guid)
> end
> if #guids > 0 then
> print("Object is contained within ".. table.concat(guids, ", "))
> else
> print("Object is not contained within any zones")
> end
> ```
>
### Set Function Details {#set-function-details}

#### setCustomObject(...) {#setcustomobject}

[../types/](../types/)Sets a custom Object's properties. It can be used after [spawnObject](../base/#spawnobject)or on an already existing custom Object. If used on an already existing custom Object, you must use [reload](#reload)on the object after setCustomObject for the changes to be displayed.
> **Info: setCustomObject(parameters)**
> The Table of parameters varies, depending on which type of custom Object it is. See the [Custom Game Objects](../custom-game-objects/)page for the parameters needed.

```lua
-- Example of a custom token
params = {
 image = "SOME URL HERE",
 thickness = 0.2,
 merge_distance = 15,
 stackable = false,
}
obj.setCustomObject(params)
```

---

#### setFogOfWarReveal(...) {#setfogofwarreveal}

[../types/](../types/)Establish the settings and enable/disable an Object's revealing of [Fog of War](https://kb.tabletopsimulator.com/game-tools/zone-tools/#fog-of-war-zone).
> **Info: setFogOfWarReveal(fog_settings)**
>
> * [../types/](../types/) **fog_settings**: A Table containing information on if/how this Object should reveal Fog of War.
>
> * [../types/](../types/) **reveal**: Can the Object currently
>
> * If this is not used, the current setting for this Object is kept.
> * [../types/#vector](../types/#vector) **color**: The rotation Vector of the Object that best represents the given value pointing up.
>
> * If this is not used, the current setting for this Object is kept.
> * "Black" means "visible to all players."
> * "All" means "visible to all players."
> * [../types/#vector](../types/#vector) **range**: How far from the Object the reveal effect reaches (radius, inches).
>
> * If this is not used, the current setting for this Object is kept.
> * [../types/](../types/) **reveal**: Can the Object currently
>
> * If this is not used, the current setting for this Object is kept.
> * [../types/#vector](../types/#vector) **color**: The rotation Vector of the Object that best represents the given value pointing up.
>
> * If this is not used, the current setting for this Object is kept.
> * "Black" means "visible to all players."
> * "All" means "visible to all players."
> * [../types/#vector](../types/#vector) **range**: How far from the Object the reveal effect reaches (radius, inches).
>
> * If this is not used, the current setting for this Object is kept.
> * If this is not used, the current setting for this Object is kept.
> * If this is not used, the current setting for this Object is kept.
> * "Black" means "visible to all players."
> * "All" means "visible to all players."
> * If this is not used, the current setting for this Object is kept.
>
```lua
-- Example of enabling reveal for all players at 3 units of radius.
params = {
 reveal = true,
 color = "Black",
 range = 3,
}
self.setFogOfWarReveal(params)
```

---

#### setRotationValue(...) {#setrotationvalue}

Sets the Object's rotation value i.e. physically rotates the object.
> **Info: setRotationValue(rotation_value)**
>
> * [../types/](../types/) **rotation_value**: A [rotation value](#getrotationvalues). Should be a [../types/](../types/), [../types/](../types/)or [../types/](../types/).
The Object will be elevated (smooth moved upward), smoothly rotated to the rotation corresponding with the specified ` rotation_value ` and then released to fall back into place.
> **Example: Example**
> Rotate a die to show the value 6.
>
> ```lua
> die.setRotationValue(6)
> ```
>
> ```lua
> die.setRotationValue(6)
> ```

---

#### setRotationValues(...) {#setrotationvalues}

[../types/](../types/)Sets rotation values of an object. Rotation values are used to give value to different rotations (like dice). It works by checking all of the rotation values assigned to an object and determining which one of them is closest to pointing up, and then displaying the value associated with that rotation.
> **Info: setRotationValues(rotation_values)**
>
> * [../types/](../types/) **rotation_values**: A Table containing Tables with the following values. 1 sub-Table per "face".
>
> * [../types/](../types/) **value**: Value associated with the rotation. Should be a [../types/](../types/), [../types/](../types/)or [../types/](../types/).
>
> * If ` value ` is a string starting with "#", then it will not be displayed in the Object's tooltip.
> * [../types/#vector](../types/#vector) **rotation**: The rotation of the Object that corresponds with the provided ` value `.
> * [../types/](../types/) **value**: Value associated with the rotation. Should be a [../types/](../types/), [../types/](../types/)or [../types/](../types/).
>
> * If ` value ` is a string starting with "#", then it will not be displayed in the Object's tooltip.
> * [../types/#vector](../types/#vector) **rotation**: The rotation of the Object that corresponds with the provided ` value `.
> * If ` value ` is a string starting with "#", then it will not be displayed in the Object's tooltip.
> **Example: Example**
> Set the two different sides (rotations) of a coin to have the values "Heads" and "Tails".
>
> ```lua
> self.setRotationValues({
> {
> value="Heads",
> rotation={x=0, y=0, z=0}
> },
> {
> value="Tails",
> rotation={x=180, y=0, z=0}
> },
> })
> ```
>
> ```lua
> self.setRotationValues({
> {
> value="Heads",
> rotation={x=0, y=0, z=0}
> },
> {
> value="Tails",
> rotation={x=180, y=0, z=0}
> },
> })
> ```

---

#### setValue(...) {#setvalue}

[../types/](../types/)Sets the Object's value. This represents something different depending on the Object's [type](#type).
> **Note: Important**
> If the Object has [rotation values](#getrotationvalues), then this method will set the rotation value i.e. behave
> the same as [setRotationValue(...)](#setrotationvalue).
> **Info: setValue(value)**
>
> * [../types/](../types/) **value**: The value to set. Represents something different depending on the Object's [type](#type). Refer to the [value type table](#setvalue-types).
|Object Type|Value Type|Description|
|---|---|---|
|`3D Text`|` string `|Replaces the 3D Text's content.|
|` Clock `|` int `|Sets the remaining "Stopwatch" time (in seconds) on the Clock.|
|` Counter ` (Digital Counter)|` int `|Sets the counter's value.|
|` Fog ` (Hidden Zone)|` string `|Changes the hidden zone owner to the specified [Player Color](../player/colors/).|
|` Hand ` (Hand Zone)|` string `|Changes the hand owner to the specified [Player Color](../player/colors/).|
|` Tablet `|` string `|Loads the specified URL in the tablet's browser.|

---

### Action Function Details {#action-function-details}

#### addContextMenuItem(...) {#addcontextmenuitem}

[../types/](../types/)Adds a menu item to the objects right-click context menu.
> **Info: addContextMenuItem(label, callback, keep_open)**
>
> * [../types/](../types/) **label**: Label for the menu item.
> * [../types/](../types/) **callback**: Execute if menu item is selected. Called as `callback(player_color, object_position, object)`
>
> * [../types/](../types/) **player_color** [Player Color](../player/colors/)who selected the menu item.
> * [../types/](../types/) **object_position**Position of object.
> * [../types/](../types/) **object**Object in question.
> * [../types/](../types/) **keep_open**: Keep context menu open after menu
> item was selected.
>
> * Optional, Default: keep_open = false. Close context menu after selection.
> * [../types/](../types/) **player_color** [Player Color](../player/colors/)who selected the menu item.
> * [../types/](../types/) **object_position**Position of object.
> * [../types/](../types/) **object**Object in question.
> * Optional, Default: keep_open = false. Close context menu after selection.
>
```lua
function onLoad()
 self.addContextMenuItem("doStuff", itemAction)
end
function itemAction(player_color, position, object)
 log({player_color, position, object})
end
```

---

#### clone(...) {#clone}

[../types/](../types/)Copy/Paste this Object.
> **Info: clone(parameters)**
>
> * [../types/](../types/) **parameters**: A Table with information used when pasting.
>
> * [../types/#vector](../types/#vector) **parameters.position**: Where the Object is placed.
>
> * Optional, defaults to {x=0, y=3, z=0}.
> * [../types/](../types/) **parameters.snap_to_grid**: If the Object snaps to grid.
>
> * Optional, defaults to false.
> * [../types/#vector](../types/#vector) **parameters.position**: Where the Object is placed.
>
> * Optional, defaults to {x=0, y=3, z=0}.
> * [../types/](../types/) **parameters.snap_to_grid**: If the Object snaps to grid.
>
> * Optional, defaults to false.
> * Optional, defaults to {x=0, y=3, z=0}.
> * Optional, defaults to false.

---

#### cut(...) {#cut}

[../types/](../types/)Cuts (splits) a deck down to a given card. In other words, it counts down from the top of the deck and makes a new deck of that size and puts the remaining cards in the other pile.
After the cut, the resulting decks much each have at least 2 cards. This means the parameter used must be between **2**and **totalNumberOfCards - 2**.
> **Note: Important**
> New decks take a frame to be created. This means trying to act on them immediately will not work. Use a coroutine or timer to add a delay.
> **Info: cut(count)**
>
> * [../types/](../types/) **count**: How many cards down to cut the deck.
>
> * Optional, if no value is provided the deck is cut in half.
> * Optional, if no value is provided the deck is cut in half.
> **Info: Returned table**
> * [../types/](../types/)The table that is returned
>
> * [../types/](../types/) **1**: The lower deck, containing the remaining cards in the deck.
> * [../types/](../types/) **2**: The upper deck, containing *count*number of cards.
> * [../types/](../types/) **1**: The lower deck, containing the remaining cards in the deck.
> * [../types/](../types/) **2**: The upper deck, containing *count*number of cards.
>
```lua
newDecks = deck.cut(5)
--A delay would be required here for these next two lines to work.
--The decks haven't been fully created yet.
newDecks[1].deal(1)
newDecks[2].deal(1)
```

#### deal(...) {#deal}

[../types/](../types/)Deals Objects to hand zones. Will deal from decks/bags/stacks as well as individual items. If dealing an individual item to a hand zone, it is a good idea to make sure that its [Member Variable](#member-variables)for ` use_hands ` is ` true `.
> **Info: deal(number, player_color, index)**
>
> * [../types/](../types/) **number**: How many to deal.
> * [../types/](../types/) **player_color**: The [Player Color](../player/colors/)to deal to.
>
> * Optional, defaults to an empty string. If not supplied, it will attempt to deal to all seated players.
> * [../types/](../types/) **index**: Index of hand zone to deal to.
>
> * Optional, defaults to the first created hand zone.
> * [../types/](../types/) **deal_from_bottom**: Deal the card from the bottom of the deck instead of the top.
>
> * Optional, defaults to the top card of the deck.
> * Optional, defaults to an empty string. If not supplied, it will attempt to deal to all seated players.
> * Optional, defaults to the first created hand zone.
> * Optional, defaults to the top card of the deck.

---

#### dealToColorWithOffset(...) {#dealtocolorwithoffset}

[../types/](../types/)Deals from a deck to a position relative to the hand zone.
> **Info: dealToColorWithOffset(offset, flip, player_color)**
>
> * [../types/#vector](../types/#vector) **offset**: The x/y/z offset to deal to around the given hand zone.
> * [../types/](../types/) **flip**: If the card is flipped over when dealt.
> * [../types/](../types/) **player_color**: Hand zone [Player Color](../player/colors/)to offset dealing to.
>
```lua
-- Example of dealing 2 cards in front of the White player, face up.
self.dealToColorWithOffset({-2,0,5}, true, "White")
self.dealToColorWithOffset({ 2,0,5}, true, "White")
```

---

#### jointTo(...) {#jointto}

[../types/](../types/)Joints objects together, in the same way the Joint tool does.
**Using obj.jointTo(), with no object or parameter used as arguments, will remove all joints from that Object.**
> **Info: jointTo(object, parameters)**
>
> * [../types/](../types/) **object**: The Object that the selected object will be jointed to.
> * [../types/](../types/) **parameters**: A table of parameters. Which parameters depends on the joint type. See below for more.
> * All parameters have defaults, the same as the Joint Tool.
Example of Fixed:

```lua
self.jointTo(obj, {
 ["type"] = "Fixed",
 ["collision"] = true,
 ["break_force"] = 1000.0,
 ["break_torgue"] = 1000.0,
})
```

Example of Spring:

```lua
self.jointTo(obj, {
 ["type"] = "Spring",
 ["collision"] = false,
 ["break_force"] = 1000.0,
 ["break_torgue"] = 1000.0,
 ["spring"] = 50,
 ["damper"] = 0.1,
 ["max_distance"] = 10,
 ["min_distance"] = 1
})
```

Example of Hinge:

```lua
self.jointTo(obj, {
 ["type"] = "Hinge",
 ["collision"] = true,
 ["axis"] = {1,1,1},
 ["anchor"] = {1,1,1},
 ["break_force"] = 1000.0,
 ["break_torgue"] = 1000.0,
 ["motor_force"] = 100.0,
 ["motor_velocity"] = 10.0,
 ["motor_free_spin"] = true
})
```

---

#### moveToHandStash(...) {#movetohandstash}

[../types/](../types/)Can be called on card objects held in the player's hand; will move the card into the player's hand stash. The stash is a temporary holding area for cards, useful when implementing drafting mechanics. The stash is not generally interactable by players (though they can dislodge it by using the gizmo tool).
> **Info: Retrieving cards from the hand stash**
> You should always use [Player.drawHandStash()](../player/instance/#drawhandstash)to retreive cards from the hand stash.
See [Wait.collect](../wait/#collect)for an example of using the hand stash.

---

#### putObject(...) {#putobject}

[../types/](../types/)Places an object into a container (chip stacks/bags/decks). If neither Object is a container, but they are able to be combined (like with 2 cards), then they form a deck/stack.
> **Info: putObject(put_object, index)**
>
> * [../types/](../types/) **put_object**: An Object to place into the container.
> * [../types/](../types/) **index**: Target index inside the container.
>
> * Optional
> * Optional
> **Info: Returned Object**
> The container is returned as the Object reference. Either this is the container/deck/stack the other Object was placed into, or the deck/stack that was formed by the putObject action.
> **Info: Putting Cards into Decks**
> When you call this `putObject()` to put a card into a deck, the card goes into the end of the deck which is closest to it in Y elevation. So, if both the card and the deck are resting on the table, the card will be put at the bottom of the deck. if the card is hovering above the deck, it will be put at the top."
>
```lua
-- Example of a script on a bag that places Object into itself
local obj = getObjectFromGUID("AAA111")
self.putObject(obj)
```

---

#### registerCollisions(...) {#registercollisions}

[../types/](../types/)Registers this object for Global collision events, such as [onObjectCollisionEnter](../events/#onobjectcollisionenter). Always returns ` true `.
> **Info: registerCollision(stay)**
>
> * [../types/](../types/) **stay**: Whether we should register for [onObjectCollisionStay](../events/#onobjectcollisionstay). Stay events may negatively impact performance, only set this to ` true ` if absolutely necessary.
>
> * Optional, defaults to ` false `.
> * Optional, defaults to ` false `.

---

#### reload() {#reload}

[../types/](../types/)Returns Object reference of itself after it respawns itself. This function causes the Object to be deleted and respawned instantly to refresh it, so its old Object reference will no longer be valid.
Most often this is used after using [setCustomObject(...)](#setcustomobject)to modify a custom object.

---

#### split(...) {#split}

[../types/](../types/)Splits a deck, as evenly as possible, into a number of piles.
> **Note: Important**
> New decks take a frame to be created. This means trying to act on them immediately will not work. Use a coroutine or timer to add a delay.
> **Info: split(piles)**
>
> * [../types/](../types/) **piles**: How many piles to split the deck into.
>
> * Optional, if no value is provided, it is split into two piles.
> * Minimum Value: 2
> * Maximum Value: Number-Of-Cards-In-Deck / 2
> * Optional, if no value is provided, it is split into two piles.
> * Minimum Value: 2
> * Maximum Value: Number-Of-Cards-In-Deck / 2
> **Info: Returned table**
> The number of Objects in the table is equal to the number of decks created by the split. They are ordered so any larger decks come first.
> * [../types/](../types/)The table that is returned
>
> * [../types/](../types/) **1**: The first deck created
> * [../types/](../types/) **2**: The second deck created
> * [../types/](../types/) **3**: The third deck created (etc)
> * [../types/](../types/) **1**: The first deck created
> * [../types/](../types/) **2**: The second deck created
> * [../types/](../types/) **3**: The third deck created (etc)
>
```lua
newDecks = deck.split(4)
--A delay would be required here for these next four lines to work.
--The decks haven't been fully created yet.
newDecks[1].deal(1)
newDecks[2].deal(1)
newDecks[3].deal(1)
newDecks[4].deal(1)
```

---

#### spread(...) {#spread}

[../types/](../types/)Spreads the cards of a deck out on the table.
> **Note: Important**
> Cards take a frame to be created. This means trying to act on them immediately will not work. Use a coroutine or timer to add a delay.
> **Info: spread(distance)**
>
> * [../types/](../types/) **distance**: How far apart should the cards be.
>
> * Optional, if no value is provided, they will be 0.6 inches apart.
> * Negative values will spread to the left instead of the right.
> * Optional, if no value is provided, they will be 0.6 inches apart.
> * Negative values will spread to the left instead of the right.
> **Info: Returned table**
> The number of Objects in the table is equal to the number of cards in the deck. They are returned in the order they were in the deck.
> * [../types/](../types/)The table that is returned
>
> * [../types/](../types/) **1**: The first card in the deck
> * [../types/](../types/) **2**: The second card in the deck
> * [../types/](../types/) **3**: The third card in the deck (etc)
> * [../types/](../types/) **1**: The first card in the deck
> * [../types/](../types/) **2**: The second card in the deck
> * [../types/](../types/) **3**: The third card in the deck (etc)

---

#### takeObject(...) {#takeobject}

[../types/](../types/)Takes an object out of a container (bag/deck/chip stack), returning a reference to the object that was taken.
Objects that are taken out of a container will take one or more frames to spawn.
Certain interactions (e.g. physics) will not be able to take place until the object has finished spawning.
> **Info: takeObject(parameters)**
>
> * [../types/](../types/) **parameters**: A Table of parameters used to determine how takeObject will act.
>
> * [../types/#vector](../types/#vector) **parameters.position**: A Vector of the position to place Object.
>
> * Optional, defaults to container's position + 2 on the x axis.
> * [../types/#vector](../types/#vector) **parameters.rotation**: A Vector of the rotation of the Object.
>
> * Optional, defaults to the container's rotation.
> * [../types/](../types/) **parameters.flip**: If the Object is flipped over.
>
> * Optional, defaults to false. Only used with decks, not bags/stacks.
> * If rotation is used, flip's Bool will be ignored.
> * [../types/](../types/) **parameters.guid**: GUID of the Object to take.
>
> * Optional, no default. Only use index or guid, never both.
> * [../types/](../types/) **parameters.index**: Index of the Object to take.
>
> * Optional, no default. Only use index or guid, never both.
> * [../types/](../types/) **parameters.top**: If an object is taken from the top (vs bottom).
>
> * Optional, defaults to true.
> * [../types/](../types/) **parameters.smooth**: If the taken Object moves smoothly or instantly.
>
> * Optional, defaults to true.
> * [../types/#function](../types/#function) **parameters.callback_function**: Callback which will be called when the taken object has finished spawnning.
>
> * Optional, no default.
> * This function takes a single parameter: the object that was taken.
> * [../types/#vector](../types/#vector) **parameters.position**: A Vector of the position to place Object.
>
> * Optional, defaults to container's position + 2 on the x axis.
> * [../types/#vector](../types/#vector) **parameters.rotation**: A Vector of the rotation of the Object.
>
> * Optional, defaults to the container's rotation.
> * [../types/](../types/) **parameters.flip**: If the Object is flipped over.
>
> * Optional, defaults to false. Only used with decks, not bags/stacks.
> * If rotation is used, flip's Bool will be ignored.
> * [../types/](../types/) **parameters.guid**: GUID of the Object to take.
>
> * Optional, no default. Only use index or guid, never both.
> * [../types/](../types/) **parameters.index**: Index of the Object to take.
>
> * Optional, no default. Only use index or guid, never both.
> * [../types/](../types/) **parameters.top**: If an object is taken from the top (vs bottom).
>
> * Optional, defaults to true.
> * [../types/](../types/) **parameters.smooth**: If the taken Object moves smoothly or instantly.
>
> * Optional, defaults to true.
> * [../types/#function](../types/#function) **parameters.callback_function**: Callback which will be called when the taken object has finished spawnning.
>
> * Optional, no default.
> * This function takes a single parameter: the object that was taken.
> * Optional, defaults to container's position + 2 on the x axis.
> * Optional, defaults to the container's rotation.
> * Optional, defaults to false. Only used with decks, not bags/stacks.
> * If rotation is used, flip's Bool will be ignored.
> * Optional, no default. Only use index or guid, never both.
> * Optional, no default. Only use index or guid, never both.
> * Optional, defaults to true.
> * Optional, defaults to true.
> * Optional, no default.
> * This function takes a single parameter: the object that was taken.
> **Note: Caution**
> Certain containers only exist whilst they have more than one object contained within them (e.g. decks). Once you
> remove the second last object from a container, the container will be destroyed and the remaining contained object
> will spawn in its place. After calling `takeObject(...)` you can check for a [remainder](#remainder).
> **Example: Example**
> Take an object out of a container. As we take it out we'll instruct the object to smooth move (default positioning
> behavior) to coordinates (0, 5, 0). Additionally, we're going to add a blue highlight on the object we've taken out.
>
> ```lua
> local takenObject = container.takeObject({
> position = {x = 0, y = 5, z = 0},
> })
> takenObject.highlightOn('Blue')
> ```
>
> ```lua
> local takenObject = container.takeObject({
> position = {x = 0, y = 5, z = 0},
> })
> takenObject.highlightOn('Blue')
> ```
>
> **Example: Advanced example**
> Take an object out of a container, and then apply an upward force (impulse) shooting it into the air.
> We can only [apply an impulse](#addforce)to an object once its (underlying rigid body) has finished spawning
> Additionally, freshly spawned objects are frozen in place for a single frame. So we need to wait for the taken
> object to finish spawning (i.e. ` callback_function `) *then* [wait one more frame](../wait/#frames)before applying
> the impulse.
>
> ```lua
> container.takeObject({
> callback_function = function(spawnedObject)
> Wait.frames(function()
> -- We've just waited a frame, which has given the object time to unfreeze.
> -- However, it's also given the object time to enter another container, if
> -- it spawned on one. Thus, we must confirm the object is not destroyed.
> if not spawnedObject.isDestroyed() then
> spawnedObject.addForce({0, 30, 0})
> end
> end)
> end,
> smooth = false, -- Smooth moving objects cannot have forces applied to them.
> })
> ```
>
> Take an object out of a container, and then apply an upward force (impulse) shooting it into the air.
> We can only [apply an impulse](#addforce)to an object once its (underlying rigid body) has finished spawning
> Additionally, freshly spawned objects are frozen in place for a single frame. So we need to wait for the taken
> object to finish spawning (i.e. ` callback_function `) *then* [wait one more frame](../wait/#frames)before applying
> the impulse.
>
> ```lua
> container.takeObject({
> callback_function = function(spawnedObject)
> Wait.frames(function()
> -- We've just waited a frame, which has given the object time to unfreeze.
> -- However, it's also given the object time to enter another container, if
> -- it spawned on one. Thus, we must confirm the object is not destroyed.
> if not spawnedObject.isDestroyed() then
> spawnedObject.addForce({0, 30, 0})
> end
> end)
> end,
> smooth = false, -- Smooth moving objects cannot have forces applied to them.
> })
> ```

---

#### unregisterCollisions(...) {#unregistercollisions}

[../types/](../types/)Unregisters this object for Global collision events. Returns ` true ` if the object was previously registered, ` false ` otherwise.
> **Info: unregisterCollision()**
>

---

### Hide Function Details {#hide-function-details}

#### setHiddenFrom(...) {#sethiddenfrom}

[../types/](../types/)Hides the Object from the specified players, as if it were in a hand zone.
Using an empty table will cause the Object to remove the hiding effect.
> **Info: setHiddenFrom(players)**
>
> * [../types/](../types/) **players**: A table containing colors to hide the Object from.
>
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
>
```lua
function onLoad()
 self.setHiddenFrom({"Blue", "White"})
end
```

> **Tip: Tip**
> Just like Objects in a hand zone, the player/s the object is hidden from can still interact/move the hidden Object. It still exists to them, but is shown as a question mark or as a hidden card.

---

#### setInvisibleTo(...) {#setinvisibleto}

[../types/](../types/)Hides the Object from the specified players, as if it were in a hidden zone.
Using an empty table will cause the Object to remove the hiding effect.
> **Info: setInvisibleTo(players)**
>
> * [../types/](../types/) **players**: A table containing colors to hide the Object from.
>
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
>
```lua
function onLoad()
 self.setInvisibleTo({"Blue", "White"})
end
```

> **Tip: Tip**
> Just like Objects in a hidden zone, the player/s the object is hidden from can still interact/move the hidden Object. It still exists to them, just invisibly so.

---

#### attachHider(...) {#attachhider}

[../types/](../types/)A more advanced version of `setHiddenFrom(...)`, this function is also used to hide objects as if they were in a hand zone. It allows you to identify multiple sources of "hiding" by an ID and toggle the effect on/off easily.
This function is slightly more complicated to use for basic hiding, but allows for much easier hiding in complex situations.
> **Info: attachHider(id, hidden, players)**
>
> * [../types/](../types/) **id**: The unique name for this hiding effect.
>
> * Tip: You can use descriptive tag names like "fog" or "blindness"
> * [../types/](../types/) **hidden**: If the hiding effect is enabled or not.
> * [../types/](../types/) **players**: A table containing colors to hide the Object from.
>
> * Optional, an empty table (or no table) hides for everyone.
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
> * Tip: You can use descriptive tag names like "fog" or "blindness"
> * Optional, an empty table (or no table) hides for everyone.
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
>
```lua
function onLoad()
 --Enable hide
 self.attachHider("hide", true, {"Blue", "White"})
 --Disable hide
 --self.attachHider("hide", false, {"Blue", "White"})
end
```

> **Tip: Tip**
> Just like Objects in a hand zone, the player/s the object is hidden from can still interact/move the hidden Object. It still exists to them, but is shown as a question mark or as a hidden card.

---

#### attachInvisibleHider(...) {#attachinvisiblehider}

[../types/](../types/)A more advanced version of `setInvisibleTo(...)`, this function is also used to hide objects as if they were in a hidden zone. It allows you to identify multiple sources of "hiding" by an ID and toggle the effect on/off easily.
This function is slightly more complicated to use for basic hiding, but allows for much easier hiding in complex situations.
> **Info: attachInvisibleHider(id, hidden, players)**
>
> * [../types/](../types/) **id**: The unique name for this hiding effect.
>
> * Tip: You can use descriptive tag names like "fog" or "blindness"
> * [../types/](../types/) **hidden**: If the hiding effect is enabled or not.
> * [../types/](../types/) **players**: A table containing colors to hide the Object from.
>
> * Optional, an empty table (or no table) hides for everyone.
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
> * Tip: You can use descriptive tag names like "fog" or "blindness"
> * Optional, an empty table (or no table) hides for everyone.
> * [../types/](../types/) **(color_name)**: Strings of the color name of each player.
>
```lua
function onLoad()
 --Enable hide
 self.attachInvisibleHider("hide", true, {"Blue", "White"})
 --Disable hide
 --self.attachInvisibleHider("hide", false, {"Blue", "White"})
end
```

> **Tip: Tip**
> Just like Objects in a hidden zone, the player/s the object is hidden from can still interact/move the hidden Object. It still exists to them, just invisibly so.

---

### Global Function Details {#global-function-details}

#### addDecal(...) {#adddecal}

[../types/](../types/)Add a Decal onto an object or the game world.
> **Tip: Relative Vectors**
> When using this function, the vector parameters (position, rotation) are relative to what the decal is being placed on. For example, if you put a decal at `{0,0,0}` on Global, it will attach to the center of the game room. If you do the same to an object, it will place the decal on the origin point of the object.
> **Info: addDecal(parameters)**
>
> * [../types/](../types/) **parameters**: A Table of parameters used to determine how the function will act.
>
> * [../types/](../types/) **parameters.name**: The name of the decal being placed.
> * [../types/](../types/) **parameters.url**: The file path or URL for the image to be displayed.
> * [../types/#vector](../types/#vector) **parameters.position**: Position to place Object.
> * [../types/#vector](../types/#vector) **parameters.rotation**: Rotation of the Object.
> * [../types/#vector](../types/#vector) **parameters.scale**: How the image is scaled.
>
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
> * [../types/](../types/) **parameters.name**: The name of the decal being placed.
> * [../types/](../types/) **parameters.url**: The file path or URL for the image to be displayed.
> * [../types/#vector](../types/#vector) **parameters.position**: Position to place Object.
> * [../types/#vector](../types/#vector) **parameters.rotation**: Rotation of the Object.
> * [../types/#vector](../types/#vector) **parameters.scale**: How the image is scaled.
>
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
>
```lua
function onLoad()
 local params = {
 name = "API Icon",
 url = "https://api.tabletopsimulator.com/img/TSIcon.png",
 position = {0, 5, 0},
 rotation = {90, 0, 0},
 scale = {1, 1, 1},
 }
 Global.addDecal(params)
end
```

---

#### call(...) {#call}

[../types/](../types/)Used to call a Lua function on another entity.
*Var is only returned if the function called has a return. Otherwise return is nil. See example.*
> This function can also be used directly on the game world using Global.
> **Info: call(func_name, func_param)**
>
> * [../types/](../types/) **func_name**: Function name you want to activate.
> * [../types/](../types/) **func_param**: A single parameter you want to pass to that function (can be a table).
>
> * Optional, will not be sent by default.
> * Optional, will not be sent by default.
>
```lua
-- Call, used from an entity's script
params = {
 msg = "Hello world!",
 color = {r=0.2, g=1, b=0.2},
}
-- Success would be set to true by the return value in the function
success = Global.call("testFunc", params)
```

```lua
-- Function in Global
function testFunc(params)
 broadcastToAll(params.msg, params.color)
 return true
end
```

> **Tip: Tip**
> Since `.call()` can only pass a single parameter, it's often necessary to bundle multiple variables into a single table to pass all of them at once.

---

#### getDecals() {#getdecals}

[../types/](../types/)Returns a table of sub-tables, each sub-table representing one decal.
> **Info: Sub-table elements**
>
> * [../types/](../types/) **parameters.name**: The name of the decal being placed.
> * [../types/](../types/) **parameters.url**: The file path or URL for the image to be displayed.
> * [../types/#vector](../types/#vector) **parameters.position**: Position to place Object.
> * [../types/#vector](../types/#vector) **parameters.rotation**: Rotation of the Object.
> * [../types/#vector](../types/#vector) **parameters.scale**: How the image is scaled.
>
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
Example returned table:

```lua
-- If this object had 2 of the same decal on it
decalTable = self.getDecals()
--[[ This is what the table would look like
{
 {
 name = "API Icon",
 url = "https://api.tabletopsimulator.com/img/TSIcon.png",
 position = {0, 5, 0},
 rotation = {90, 0, 0},
 scale = {5, 5, 5}
 },
 {
 name = "API Icon",
 url = "https://api.tabletopsimulator.com/img/TSIcon.png",
 position = {0, 5, 0},
 rotation = {90, 0, 0},
 scale = {5, 5, 5}
 },
}
]]--
-- Accessing the name of of the second entry would look like this
print(decalTable[2].name)
```

---

#### getSnapPoints() {#getsnappoints}

[../types/](../types/)Returns a table representing a list of snap points.
> **Tip: Tip**
> This function may be called on ` Global ` in order to return a list of global snap points (i.e. snap points on the
> table).
>
##### Return value {#getsnappoints-return-value}

The returned value is a list (numerically indexed table) of sub-tables, where each sub-table represents a snap point and
has the following properties:

|Name|Type|Description|
|---|---|---|
|position|[Vector](../vector/)|[Local Position](../types/#position) of the snap point. When attached to an object, position is relative to the object's center.|
|rotation|[Vector](../vector/)|[Local Rotation](../types/#rotation) of the snap point. When attached to an object, rotation is relative to the object's rotation.|
|rotation_snap|` boolean `|Whether the snap point is a [rotation snap point](https://kb.tabletopsimulator.com/game-tools/snap-point-tool/#rotation-snap).|
|tags|` table `|Table of ` string ` representing the [tags](https://kb.tabletopsimulator.com/game-tools/object-tags/) associated with the snap point.|

> **Example: Example**
> Log the list of global snap points:
>
> ```lua
> log(Global.getSnapPoints())
> ```
>
> ```lua
> log(Global.getSnapPoints())
> ```

---

#### setDecals(...) {#setdecals}

[../types/](../types/)Sets which decals are on an object. This removes other decals already present, and can remove all decals as well.
> **Tip: Removing decals**
> Using this function with an empty table will remove all decals from Global or the object it is used on. `Global.setDecals({})`
> **Info: setDecals(parameters)**
>
> * [../types/](../types/) **parameters**: The main table, which will contain all of the sub-tables.
>
> * [../types/](../types/) **subtable**: The sub-table containing each individual decal's information. The sub-tables are unnamed.
>
> * [../types/](../types/) **parameters.subtable.name**: The name of the decal being placed.
> * [../types/](../types/) **parameters.subtable.url**: The file path or URL for the image to be displayed.
> * [../types/#vector](../types/#vector) **parameters.subtable.position**: A Vector of the position to place Object.
> * [../types/#vector](../types/#vector) **parameters.subtable.rotation**: A Vector of the rotation of the Object.
> * [../types/](../types/) **parameters.subtable.scale**: How the image is scaled.
>
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
> * [../types/](../types/) **subtable**: The sub-table containing each individual decal's information. The sub-tables are unnamed.
>
> * [../types/](../types/) **parameters.subtable.name**: The name of the decal being placed.
> * [../types/](../types/) **parameters.subtable.url**: The file path or URL for the image to be displayed.
> * [../types/#vector](../types/#vector) **parameters.subtable.position**: A Vector of the position to place Object.
> * [../types/#vector](../types/#vector) **parameters.subtable.rotation**: A Vector of the rotation of the Object.
> * [../types/](../types/) **parameters.subtable.scale**: How the image is scaled.
>
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
> * [../types/](../types/) **parameters.subtable.name**: The name of the decal being placed.
> * [../types/](../types/) **parameters.subtable.url**: The file path or URL for the image to be displayed.
> * [../types/#vector](../types/#vector) **parameters.subtable.position**: A Vector of the position to place Object.
> * [../types/#vector](../types/#vector) **parameters.subtable.rotation**: A Vector of the rotation of the Object.
> * [../types/](../types/) **parameters.subtable.scale**: How the image is scaled.
>
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
> * 1 is normal scale, 0.5 would be half sized, 2 would be twice as large, etc.
>
```lua
function onLoad()
 local parameters = {
 {
 name = "API Icon",
 url = "https://api.tabletopsimulator.com/img/TSIcon.png",
 position = {-2, 5, 0},
 rotation = {90, 0, 0},
 scale = 5,
 },
 {
 name = "API Icon",
 url = "https://api.tabletopsimulator.com/img/TSIcon.png",
 position = {2, 5, 0},
 rotation = {90, 0, 0},
 scale = 5,
 },
 }
 Global.setDecals(parameters)
end
```

---

#### setSnapPoints(...) {#setsnappoints}

[../types/](../types/)Replaces existing snap points with the specified list of snap points.
> **Tip: Tip**
> This function can also be called on ` Global ` in order to create snap points directly within the scene, which are not
> attached to any other Object.
> **Info: setSnapPoints(snap_points)**
>
> * [../types/](../types/) **snap_points**: A list (numerically indexed table) of [snap points](#setsnappoints-snap-points).
>
##### Snap Points {#setsnappoints-snap-points}

` snap_points ` must be provided as a list (numerically indexed table) of sub-tables, where each sub-table represents a
snap point and may have the following properties:

|Name|Type|Default|Description|
|---|---|---|---|
|position|` vector `|`{0, 0, 0}`|[Local Position](../types/#position) of the snap point. When attached to an object, position is relative to the object's center.|
|rotation|` vector `|`{0, 0, 0}`|[Local Rotation](../types/#position) of the snap point. When attached to an object, rotation is relative to the object's rotation.|
|rotation_snap|` boolean `|` false `|Whether the snap point is a [rotation snap point](https://kb.tabletopsimulator.com/game-tools/snap-point-tool/#rotation-snap).|
|tags|` table `|`{}`|Table of ` string ` representing the [tags](https://kb.tabletopsimulator.com/game-tools/object-tags/) associated with the snap point.|

All properties are optional. When a property is omitted, it will be given the corresponding default value (above).
> **Example: Example**
> Give an object 3 snap points. A regular snap point, a rotation snap point, and a rotation snap point with a tag.
>
> ```lua
> object.setSnapPoints({
> {
> position = {5, 2, 5}
> },
> {
> position = {5, 2, 5},
> rotation = {0, 180, 0},
> rotation_snap = true
> },
> {
> position = {-3, 2, 0},
> rotation = {0, 45, 0},
> rotation_snap = true,
> tags = {"meeple"}
> }
> })
> ```
>
> ```lua
> object.setSnapPoints({
> {
> position = {5, 2, 5}
> },
> {
> position = {5, 2, 5},
> rotation = {0, 180, 0},
> rotation_snap = true
> },
> {
> position = {-3, 2, 0},
> rotation = {0, 45, 0},
> rotation_snap = true,
> tags = {"meeple"}
> }
> })
> ```

---

#### setVectorLines(...) {#setvectorlines}

[../types/](../types/)Spawns Vector Lines from a list of parameters.
> This function can also be used on the game world itself using Global.
> **Info: setVectorLines(parameters)**
>
> * [../types/](../types/) **parameters**: The table containing each "line's" data. Each contiguous line has its own sub-table.
>
> * [../types/](../types/) **points**: Table containing [Vector positions](../types/#vector)for each "point" on the line.
> * [../types/#color](../types/#color) **color**: Color the line will be.
>
> * Optional, defaults to {1,1,1}.
> * [../types/](../types/) **thickness**: How thick the line is (in Unity units).
>
> * Optional, defaults to default line size (0.1).
> * [../types/#vector](../types/#vector) **rotation**: Rotation Vector for the line to be angled.
>
> * Optional, defaults to {0,0,0}.
> * [../types/](../types/) **points**: Table containing [Vector positions](../types/#vector)for each "point" on the line.
> * [../types/#color](../types/#color) **color**: Color the line will be.
>
> * Optional, defaults to {1,1,1}.
> * [../types/](../types/) **thickness**: How thick the line is (in Unity units).
>
> * Optional, defaults to default line size (0.1).
> * [../types/#vector](../types/#vector) **rotation**: Rotation Vector for the line to be angled.
>
> * Optional, defaults to {0,0,0}.
> * Optional, defaults to {1,1,1}.
> * Optional, defaults to default line size (0.1).
> * Optional, defaults to {0,0,0}.
>
```lua
function onLoad()
 --Make an X above the middle of the table
 Global.setVectorLines({
 {
 points = { {5,1,5}, {-5,1,-5} },
 color = {1,1,1},
 thickness = 0.5,
 rotation = {0,0,0},
 },
 {
 points = { {-5,1,5}, {5,1,-5} },
 color = {0,0,0},
 thickness = 0.5,
 rotation = {0,0,0},
 },
 })
end
```

---
