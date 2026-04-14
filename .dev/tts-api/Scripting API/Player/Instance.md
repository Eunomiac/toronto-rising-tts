## Table of Contents

* Member Variables
* Function Summary
* Function Details
  * attachCameraToObject(...)
  * broadcast(...)
  * changeColor(...)
  * clearSelectedObjects()
  * copy(...)
  * drawHandStash(...)
  * getHandCount()
  * getHandObjects(...)
  * getHandTransform(...)
  * getHoldingObjects()
  * getHoverObject()
  * getPointerPosition()
  * getPointerRotation()
  * getSelectedObjects()
  * kick()
  * lookAt(...)
  * mute()
  * paste(...)
  * pingTable(...)
  * print(...)
  * promote()
  * setCameraMode(...)
  * setHandStashLocation(...)
  * setHandTransform(...)
  * setUITheme(...)
  * showColorDialog(...)
  * showConfirmDialog(...)
  * showInfoDialog(...)
  * showInputDialog(...)
  * showMemoDialog(...)
  * showOptionsDialog(...)

# Player Instance {#player-instance}

Player instances can be retrieved from the [Player Manager](../manager/)and are also frequently passed to callbacks.

## Member Variables {#member-variables}

|Variable|Type|Description|
|---|---|---|
|admin|`boolean`|If the player is promoted or the host of the game. Read only.|
|blindfolded|` boolean `|If the player is blindfolded.|
|color|` string `|The player's [Player Color](../colors/). Read only.|
|host|` boolean `|If the player is the host. Read only.|
|lift_height|` float `|The lift height for the player. This is how far an object is raised when held in a player's hand. Value is ranged 0 to 1.|
|promoted|` boolean `|If the current player is promoted.|
|seated|` boolean `|If a player is currently seated at this color. Read only.|
|steam_id|` string `|The Steam ID of the player. This is unique to each player's Steam account. Read only.|
|steam_name|` string `|The Steam name of the player. Read only.|
|team|` string `|The team of the player. Options: `"None", "Clubs", "Diamonds", "Hearts", "Spades", "Jokers"`.|

## Function Summary {#function-summary}

|Function Name|Return|Description| |
|---|---|---|---|
|attachCameraToObject( ` table ` parameters)|return ` boolean `|Makes a Player's camera follow an Object.|[#attachcameratoobject](#attachcameratoobject)|
|broadcast( ` string ` message, ` color ` message_color)|return ` boolean `|Print message on Player's screen and their game chat log.|[#broadcast](#broadcast)|
|changeColor( ` string ` player_color)|return ` boolean `|Changes player to this [Player Color](../colors/).|[#changecolor](#changecolor)|
|clearSelectedObjects()|return ` boolean `|Clears a player's current selection.| |
|copy( ` table ` objects)|return ` boolean `|Makes the Player take the Copy action with the specified Objects.|[#copy](#copy)|
|drawHandStash()|return ` boolean `|Draws all the cards in the players hand stash into their hand.|[#drawhandstash](#drawhandstash)|
|getHandCount()|return ` int `|Number of [hand zones](https://kb.tabletopsimulator.com/host-guides/player-hands/) owned by this color.| |
|getHandObjects( ` int ` hand_index)|return ` table `|Objects that are in this [hand zone](https://kb.tabletopsimulator.com/host-guides/player-hands/).|[#gethandobjects](#gethandobjects)|
|getHandTransform( ` int ` hand_index)|return ` table `|Returns a Table of data on this [hand zone](https://kb.tabletopsimulator.com/host-guides/player-hands/).|[#gethandtransform](#gethandtransform)|
|getHoldingObjects()|return ` table `|Objects a Player is holding in their hand.| |
|getHoverObject()|return ` object `|Object that the Player's pointer is hovering over.| |
|getPointerPosition()|return ` vector `|Player's pointer coordinates.| |
|getPointerRotation()|return ` float `|Player's pointer rotation on Y axis.| |
|getSelectedObjects()|return ` table `|Objects that the Player has selected with an area selection.| |
|kick()|return ` boolean `|Kicks Player out of the room.| |
|lookAt( ` table ` parameters)|return ` boolean `|Moves a Player's camera, forcing 3'rd person camera mode.|[#lookat](#lookat)|
|mute()|return ` boolean `|Mutes or unmutes Player, preventing/allowing voice chat.| |
|paste( ` vector ` position)|return ` boolean `|Makes the Player take the Paste action at the specified position|[#paste](#paste)|
|pingTable( ` vector ` position)|return ` boolean `|Emulates the player using the ping tool at the given position (tapping Tab).| |
|print( ` string ` message, ` color ` message_color)|return ` boolean `|Prints a message into the Player's game chat.|[#print](#print)|
|promote()|return ` boolean `|Promotes/demotes a Player. Promoted players have access to most host privileges.| |
|setCameraMode( ` string ` camera_mode)|return ` boolean `|Sets the player's camera mode. Camera modes available: "ThirdPerson", "FirstPerson", "TopDown".|[#setcameramode](#setcameramode)|
|setHandStashLocation( ` vector ` position, ` int ` rotation)|return ` boolean `|Sets the location of the hand stash within the players primary hand.|[#sethandstashlocation](#sethandstashlocation)|
|setHandTransform( ` table ` parameters, ` int ` hand_index)|return ` boolean `|Sets transform elements of a hand zone.|[#sethandtransform](#sethandtransform)|
|setUITheme( ` string ` theme)|return ` boolean `|Sets the UI theme for the player.|[#setuitheme](#setuitheme)|
|showInfoDialog( ` string ` info)|return ` boolean `|Displays ` info ` string to player in the message box dialog.|[#showinfodialog](#showinfodialog)|
|showConfirmDialog( ` string ` info, ` function ` callback)|return ` boolean `|Displays ` info ` string to player in the message box dialog, and executes ` callback ` if they click ` OK `.|[#showconfirmdialog](#showconfirmdialog)|
|showInputDialog( ` string ` description, ` string ` default_text, ` function ` callback)|return ` boolean `|Shows the text input dialog to the player, and executes ` callback ` if they click ` OK `.|[#showinputdialog](#showinputdialog)|
|showMemoDialog( ` string ` description, ` string ` default_text, ` function ` callback)|return ` boolean `|Shows the memo input dialog (large text input) to the player, and executes ` callback ` if they click ` OK `.|[#showmemodialog](#showmemodialog)|
|showOptionsDialog( ` string ` description, ` table ` options, ` int ` default_value, ` function ` callback)|return ` boolean `|Shows the dropdown options dialog to the player, and executes ` callback ` if they click ` OK `.|[#showoptionsdialog](#showoptionsdialog)|
|showColorDialog( ` color ` default_color, ` function ` callback)|return ` boolean `|Shows the color picker dialog to the player with optional ` default_color `, and executes ` callback ` if they click ` OK `.|[#showcolordialog](#showcolordialog)|

---

## Function Details {#function-details}

### attachCameraToObject(...) {#attachcameratoobject}

[../../types/](../../types/)Makes a Player's camera follow an Object.
> **Info: attachCameraToObject(parameters)**
>
> * [../../types/](../../types/) **parameters**: A Table with parameters which guide the function.
>
> * [../../types/](../../types/) **parameters.object**: The Object to attach the camera to.
> * [../../types/#vector](../../types/#vector) **parameters.offset**: A Vector to offset the camera by.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../../types/](../../types/) **parameters.object**: The Object to attach the camera to.
> * [../../types/#vector](../../types/#vector) **parameters.offset**: A Vector to offset the camera by.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=0, y=0, z=0}.
>
```lua
self.attachCameraToObject({object=self})
```

---

### broadcast(...) {#broadcast}

[../../types/](../../types/)Print message on Player's screen and their game chat log.
> **Info: broadcast(message, message_color)**
>
> * [../../types/](../../types/) **message**: The message to be displayed.
> * [../../types/#color](../../types/#color) **message_color**: Tint of the message text.
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * Optional, defaults to {r=1, g=1, b=1}.

---

### changeColor(...) {#changecolor}

[../../types/](../../types/)Changes player to this [Player Color](../colors/)(seat).
> **Info: changeColor(player_color)**
>
> * [../../types/](../../types/) **player_color**: The [Player Color](../colors/)seat to move the Player to.
>
```lua
Player["White"].changeColor("Red")
```

---

### copy(...) {#copy}

[../../types/](../../types/)Makes the Player take the Copy action with the specified Objects.
> **Info: copy(objects)**
>
> * [../../types/](../../types/) **objects**: A Table of Objects.
>
```lua
Player.Green.copy({the_dice, the_deck})
```

---

### drawHandStash(...) {#drawhandstash}

[../../types/](../../types/)Draws all cards in the player's hand stash into their hand.
See [Wait.collect](../../wait/#collect)for an example of using the hand stash.

---

### getHandObjects(...) {#gethandobjects}

[../../types/](../../types/)Returns a Table of Objects that are in this [hand zone](https://kb.tabletopsimulator.com/host-guides/player-hands/).
> **Info: getHandObjects(hand_index)**
>
> * [../../types/](../../types/) **hand_index**: An index, representing which hand zone to return Objects for.
>
> * Optional, defaults to 1.
> * Optional, defaults to 1.
> **Tip: Indexing**
> Hand indexes start at 1 and are numbered in the order of their creation. Each Player color has its own indexes.

---

### getHandTransform(...) {#gethandtransform}

[../../types/](../../types/)Returns a Table of data on this [hand zone](https://kb.tabletopsimulator.com/host-guides/player-hands/).
> **Info: getHandTransform(hand_index)**
>
> * [../../types/](../../types/) **hand_index**: An index, representing which hand zone to return data on.
>
> * Optional, defaults to 1.
> * Optional, defaults to 1.
> **Info: Return Data Table**
> * [../../types/](../../types/) **data**: The Table the data is returned in.
>
> * [../../types/#vector](../../types/#vector) **data.position**: Position of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.rotation**: Rotation of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.scale**: Scale of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.forward**: Forward direction of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.right**: Right direction of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.up**: Up direction of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.position**: Position of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.rotation**: Rotation of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.scale**: Scale of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.forward**: Forward direction of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.right**: Right direction of the hand zone.
> * [../../types/#vector](../../types/#vector) **data.up**: Up direction of the hand zone.
> **Tip: Indexing**
> Hand indexes start at 1 and are numbered in the order of their creation. Each Player color has its own indexes.

---

### lookAt(...) {#lookat}

[../../types/](../../types/)Moves a Player's camera, forcing 3'rd person camera mode.
> **Info: lookAt(parameters)**
>
> * [../../types/](../../types/) **parameters**: A Table of controlling parameters to point the player camera.
>
> * [../../types/#vector](../../types/#vector) **parameters.position**: Position to center the camera on.
> * [../../types/](../../types/) **parameters.pitch**: Pitch angle of the camera. 0 to 90.
>
> * Optional, defaults to 0.
> * [../../types/](../../types/) **parameters.yaw**: Yaw angle of the camera. 0 to 360.
>
> * Optional, defaults to 0.
> * [../../types/](../../types/) **parameters.distance**: Distance the camera is from the position Vector.
>
> * Optional, defaults to 40.
> * [../../types/#vector](../../types/#vector) **parameters.position**: Position to center the camera on.
> * [../../types/](../../types/) **parameters.pitch**: Pitch angle of the camera. 0 to 90.
>
> * Optional, defaults to 0.
> * [../../types/](../../types/) **parameters.yaw**: Yaw angle of the camera. 0 to 360.
>
> * Optional, defaults to 0.
> * [../../types/](../../types/) **parameters.distance**: Distance the camera is from the position Vector.
>
> * Optional, defaults to 40.
> * Optional, defaults to 0.
> * Optional, defaults to 0.
> * Optional, defaults to 40.
>
```lua
-- Assuming someone is in the White seat
Player["White"].lookAt({
 position = {x=0,y=0,z=0},
 pitch = 25,
 yaw = 180,
 distance = 20,
})
```

---

### paste(...) {#paste}

[../../types/](../../types/)Makes the Player take the Paste action at the specified position.
> **Info: paste(position)**
>
> * [../../types/](../../types/) **position**: The position to paste at.
>
```lua
Player.Green.paste({0, 1, 0})
```

---

### print(...) {#print}

[../../types/](../../types/)Prints a message into the Player's game chat.
> **Info: print(message, message_color)**
>
> * [../../types/](../../types/) **message**: The text to be displayed.
> * [../../types/#color](../../types/#color) **message_color**: Color for the message text to be tinted.
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * Optional, defaults to {r=1, g=1, b=1}.

---

### setCameraMode(...) {#setcameramode}

[../../types/](../../types/)Sets the player's camera mode. Camera modes available: "ThirdPerson", "FirstPerson", "TopDown".
> **Info: changeColor(camera_mode)**
>
> * [../../types/](../../types/) **camera_mode**: The Camera Mode to set the Player's Camera to.
>
```lua
Player["White"].setCameraMode("FirstPerson")
```

---

### setHandStashLocation(...) {#sethandstashlocation}

[../../types/](../../types/)Sets the location of the player's hand stash inside their primary hand zone.
> **Info: setHandStashLocation(position, rotation)**
>
> * [../../types/#vector](../../types/#vector) **position**: The position of the stash inside the hand zone. Each ordinal is in the range (**-1.0**.. **+1.0**).
> * [../../types/](../../types/) **rotation_index**: The rotation index of the hand stash.

---

### setHandTransform(...) {#sethandtransform}

[../../types/](../../types/)Sets transform elements of a [hand zone](https://kb.tabletopsimulator.com/host-guides/player-hands/).
> **Info: setHandTransform(parameters, hand_index)**
>
> * [../../types/](../../types/) **parameters**: The Table of data to transform the hand zone with.
>
> * [../../types/#vector](../../types/#vector) **parameters.position**: Position of the hand zone.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../../types/#vector](../../types/#vector) **parameters.rotation**: Rotation of the hand zone.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../../types/#vector](../../types/#vector) **parameters.scale**: Scale of the hand zone.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../../types/](../../types/) **hand_index**: Index, representing which hand zone to modify.
>
> * Optional, defaults to 1.
> * [../../types/#vector](../../types/#vector) **parameters.position**: Position of the hand zone.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../../types/#vector](../../types/#vector) **parameters.rotation**: Rotation of the hand zone.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * [../../types/#vector](../../types/#vector) **parameters.scale**: Scale of the hand zone.
>
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to {x=0, y=0, z=0}.
> * Optional, defaults to 1.
> **Tip: Indexing**
> Hand indexes start at 1 and are numbered in the order of their creation. Each Player color has its own indexes.
>
```lua
-- Example of moving/rotating/scaling hand zone
params = {
 position = {x=0, y=5, z=0},
 rotation = {x=0, y=45, z=0},
 scale = {x=2, y=2, z=2},
}
Player["White"].setHandTransform(params, 2)
```

### setUITheme(...) {#setuitheme}

[../../types/](../../types/)Sets the UI theme for the player.
> **Info: setUITheme(theme)**
>
> * [../../types/](../../types/) **theme**: A string representing a theme.
> **Tip: Theme Format**
> You can view the expected theme format by in-game going to Menu -> Configuration -> Interface -> Theme. Select a
> theme then press "Import/Export".
> **Example: Example**
> Set the White player's default button background to pink.
>
> ```lua
> Player.white.setUITheme("button_normal #FFC0C0")
> ```
>
> ```lua
> Player.white.setUITheme("button_normal #FFC0C0")
> ```
>
### showInfoDialog(...) {#showinfodialog}

[../../types/](../../types/)Shows the info dialog to the player.
> **Info: showInfoDialog(info)**
>
> * [../../types/](../../types/) **info**: Information to display.
> **Example: Example**
>
> ```lua
> Player.white.showInfoDialog("Only active players may floop!")
> ```
>
### showConfirmDialog(...) {#showconfirmdialog}

[../../types/](../../types/)Shows the confirm dialog to the player and executes the callback if they click OK.
> **Info: showConfirmDialog(info, callback)**
>
> * [../../types/](../../types/) **info**: Information to display.
> * [../../types/](../../types/) **callback**: Callback to execute if they click OK. Will be called as `callback(player_color)`
> **Example: Example**
>
> ```lua
> chosen_player.showConfirmDialog("Really roll the dice?",
> function (player_color)
> dice.roll()
> log(player_color.. " rolled the dice.")
> end
> )
> ```
>
### showInputDialog(...) {#showinputdialog}

[../../types/](../../types/)Shows the text input dialog to the player and executes the callback if they click OK.
> **Info: showInputDialog(description, default_text, callback)**
>
> * [../../types/](../../types/) **description**: Optional description of what the player should input.
> * [../../types/](../../types/) **default_text**: Optional default value.
> * [../../types/](../../types/) **callback**: Callback to execute if they click OK. Will be called as `callback(text, player_color)`
> **Example: Example**
>
> ```lua
> chosen_player.showInputDialog("Set Name",
> function (text, player_color)
> chosen_object.setName(text)
> end
> )
> ```
>
### showMemoDialog(...) {#showmemodialog}

[../../types/](../../types/)Shows the memo input dialog (large text input) to the player and executes the callback if they click OK.
> **Info: showMemoDialog(description, default_text, callback)**
>
> * [../../types/](../../types/) **description**: Optional description of what the player should input.
> * [../../types/](../../types/) **default_text**: Optional default value.
> * [../../types/](../../types/) **callback**: Callback to execute if they click OK. Will be called as `callback(text, player_color)`
> **Example: Example**
>
> ```lua
> chosen_player.showMemoDialog("Set Description",
> function (text, player_color)
> chosen_object.setDescription(text)
> end
> )
> ```
>
### showOptionsDialog(...) {#showoptionsdialog}

[../../types/](../../types/)Shows the options dropdown dialog to the player and executes the callback if they click OK.
> **Info: showOptionsDialog(description, options, default_value, callback)**
>
> * [../../types/](../../types/) **description**: Description of what the player is choosing.
> * [../../types/](../../types/) **options**: Table of string options.
> * [../../types/](../../types/) **default_value**: Optional default value, an integer index into the options table. Note you may alternatively use the option string itself.
> * [../../types/](../../types/) **callback**: Callback to execute if they click OK. Will be called as `callback(selected_text, selected_index, player_color)`
> **Example: Example**
>
> ```lua
> chosen_player.showOptionsDialog("Choose Value", {"1", "2", "3", "4", "5", "6"}, dice.getValue(),
> function (text, index, player_color)
> dice.setValue(index)
> end
> )
> ```
>
### showColorDialog(...) {#showcolordialog}

[../../types/](../../types/)Shows the color picker dialog to the player and executes the callback if they click OK.
> **Info: showColorDialog(default_color, callback)**
>
> * [../../types/](../../types/) **default_color**: Optional default color.
> * [../../types/](../../types/) **callback**: Callback to execute if they click Apply. Will be called as `callback(color, player_color)`
> **Example: Example**
>
> ```lua
> chosen_player.showColorDialog(dice.getColorTint(),
> function (color, player_color)
> dice.setColorTint(color)
> end
> )
> ```
