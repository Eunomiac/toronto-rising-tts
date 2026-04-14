## Table of Contents

* Custom AssetBundle
* Custom Board
* Custom Card
* Custom Deck
* Custom Dice
* Custom Figurine
* Custom Model
* Custom Tile
* Custom Token

# Custom

You can spawn [custom Objects](https://kb.tabletopsimulator.com/custom-content/about-custom-objects/)and then provide the custom content for them after spawning them by calling [setCustomObject()](../object/#setcustomobject). See setCustomObject for usage
You can also use setCustomObject along with [reload()](../object/#reload)to modify an existing custom Object.

## Custom AssetBundle {#custom-assetbundle}

* Custom_Assetbundle

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **assetbundle**: The path/URL for the AssetBundle.
> * [../types/](../types/) **assetbundle_secondary**: The path/URL for the secondary AssetBundle property.
>
> * Optional, is not used by default.
> * [../types/](../types/) **type**: An Int representing the Object's type.
>
> * Optional, defaults to 0.
>
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * [../types/](../types/) **material**: An Int representing the Object's material.
>
> * Optional, defaults to 0.
>
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * [../types/](../types/) **assetbundle**: The path/URL for the AssetBundle.
> * [../types/](../types/) **assetbundle_secondary**: The path/URL for the secondary AssetBundle property.
>
> * Optional, is not used by default.
> * [../types/](../types/) **type**: An Int representing the Object's type.
>
> * Optional, defaults to 0.
>
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * [../types/](../types/) **material**: An Int representing the Object's material.
>
> * Optional, defaults to 0.
>
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * Optional, is not used by default.
> * Optional, defaults to 0.
>
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * Optional, defaults to 0.
>
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
>
## Custom Board {#custom-board}

* Custom_Board

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **image**: The path/URL for the board.
> * [../types/](../types/) **image**: The path/URL for the board.
>
## Custom Card {#custom-card}

* CardCustom

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **type**: The card shape.
>
> * Optional, defaults to 0.
>
> * **0**: Rectangle (Rounded)
> * **1**: Rectangle
> * **2**: Hex (Rounded)
> * **3**: Hex
> * **4**: Circle
> * [../types/](../types/) **face**: The path/URL of the face image.
> * [../types/](../types/) **back**: The path/URL of the back image.
> * [../types/](../types/) **sideways**: If the card is horizontal, instead of vertical.
>
> * Optional, defaults to false.
> * [../types/](../types/) **type**: The card shape.
>
> * Optional, defaults to 0.
>
> * **0**: Rectangle (Rounded)
> * **1**: Rectangle
> * **2**: Hex (Rounded)
> * **3**: Hex
> * **4**: Circle
> * [../types/](../types/) **face**: The path/URL of the face image.
> * [../types/](../types/) **back**: The path/URL of the back image.
> * [../types/](../types/) **sideways**: If the card is horizontal, instead of vertical.
>
> * Optional, defaults to false.
> * Optional, defaults to 0.
>
> * **0**: Rectangle (Rounded)
> * **1**: Rectangle
> * **2**: Hex (Rounded)
> * **3**: Hex
> * **4**: Circle
> * **0**: Rectangle (Rounded)
> * **1**: Rectangle
> * **2**: Hex (Rounded)
> * **3**: Hex
> * **4**: Circle
> * Optional, defaults to false.
>
## Custom Deck {#custom-deck}

* DeckCustom

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **face**: The path/URL of the face cardsheet.
> * [../types/](../types/) **back**: The path/URL of the back cardsheet or card back.
> * [../types/](../types/) **unique_back**: If each card has a unique card back (via a cardsheet).
>
> * Optional, defaults to false.
> * [../types/](../types/) **width**: The number of columns on the cardsheet.
>
> * Optional, defaults to 10.
> * [../types/](../types/) **height**: The number of rows on the cardsheet.
>
> * Optional, defaults to 7.
> * [../types/](../types/) **number**: The number of cards on the cardsheet.
>
> * Optional, defaults to 52.
> * [../types/](../types/) **sideways**: Whether the cards are horizontal, instead of vertical.
>
> * Optional, defaults to false.
> * [../types/](../types/) **back_is_hidden**: Whether the card back should be used as the hidden image (instead of the last slot of the `face` image).
>
> * Optional, defaults to false.
> * [../types/](../types/) **face**: The path/URL of the face cardsheet.
> * [../types/](../types/) **back**: The path/URL of the back cardsheet or card back.
> * [../types/](../types/) **unique_back**: If each card has a unique card back (via a cardsheet).
>
> * Optional, defaults to false.
> * [../types/](../types/) **width**: The number of columns on the cardsheet.
>
> * Optional, defaults to 10.
> * [../types/](../types/) **height**: The number of rows on the cardsheet.
>
> * Optional, defaults to 7.
> * [../types/](../types/) **number**: The number of cards on the cardsheet.
>
> * Optional, defaults to 52.
> * [../types/](../types/) **sideways**: Whether the cards are horizontal, instead of vertical.
>
> * Optional, defaults to false.
> * [../types/](../types/) **back_is_hidden**: Whether the card back should be used as the hidden image (instead of the last slot of the `face` image).
>
> * Optional, defaults to false.
> * Optional, defaults to false.
> * Optional, defaults to 10.
> * Optional, defaults to 7.
> * Optional, defaults to 52.
> * Optional, defaults to false.
> * Optional, defaults to false.
>
## Custom Dice {#custom-dice}

* Custom_Dice

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **image**: The path/URL for the [custom die](https://kb.tabletopsimulator.com/custom-content/custom-dice/).
> * [../types/](../types/) **type**: The type of die, which determines its number of sides.
>
> * Optional, defaults to 1.
>
> * **0**: 4-sided
> * **1**: 6-sided
> * **2**: 8-sided
> * **3**: 10-sided
> * **4**: 12-sided
> * **5**: 20-sided
> * [../types/](../types/) **image**: The path/URL for the [custom die](https://kb.tabletopsimulator.com/custom-content/custom-dice/).
> * [../types/](../types/) **type**: The type of die, which determines its number of sides.
>
> * Optional, defaults to 1.
>
> * **0**: 4-sided
> * **1**: 6-sided
> * **2**: 8-sided
> * **3**: 10-sided
> * **4**: 12-sided
> * **5**: 20-sided
> * Optional, defaults to 1.
>
> * **0**: 4-sided
> * **1**: 6-sided
> * **2**: 8-sided
> * **3**: 10-sided
> * **4**: 12-sided
> * **5**: 20-sided
> * **0**: 4-sided
> * **1**: 6-sided
> * **2**: 8-sided
> * **3**: 10-sided
> * **4**: 12-sided
> * **5**: 20-sided
>
## Custom Figurine {#custom-figurine}

* Figurine_Custom

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **image**: The path/URL for the [custom figurine](https://kb.tabletopsimulator.com/custom-content/custom-figurine/).
> * [../types/](../types/) **image_secondary**: The path/URL for the custom figurine's back.
>
> * Optional, defaults to "image".
> * [../types/](../types/) **image**: The path/URL for the [custom figurine](https://kb.tabletopsimulator.com/custom-content/custom-figurine/).
> * [../types/](../types/) **image_secondary**: The path/URL for the custom figurine's back.
>
> * Optional, defaults to "image".
> * Optional, defaults to "image".
>
## Custom Model {#custom-model}

* Custom_Model

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **mesh**: The path/URL for the.obj mesh used on the [custom model](https://kb.tabletopsimulator.com/custom-content/custom-model/).
> * [../types/](../types/) **diffuse**: The path/URL for the diffuse image.
> * [../types/](../types/) **normal**: The path/URL for the normals image.
>
> * Optional, is not used by default.
> * [../types/](../types/) **collider**: The path/URL for the collider mesh.
>
> * Optional, defaults to a generic box collider.
> * [../types/](../types/) **convex**: Whether the object model is convex.
>
> * Optional, defaults to false.
> * [../types/](../types/) **type**: An Int representing the Object's type.
>
> * Optional, defaults to 0.
>
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * [../types/](../types/) **material**: An Int representing the Object's material.
>
> * Optional, defaults to 0.
>
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * [../types/](../types/) **specular_intensity**: The specular intensity.
>
> * Optional, defaults to 0.1.
> * [../types/](../types/) **specular_color**: The specular [Color](../types/#color).
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * [../types/](../types/) **specular_sharpness**: The specular sharpness.
>
> * Optional, defaults to 3.
> * [../types/](../types/) **freshnel_strength**: The freshnel strength.
>
> * Optional, defaults to 0.1.
> * [../types/](../types/) **cast_shadows**: Whether the Object casts shadows.
>
> * Optional, defaults to true.
> * [../types/](../types/) **mesh**: The path/URL for the.obj mesh used on the [custom model](https://kb.tabletopsimulator.com/custom-content/custom-model/).
> * [../types/](../types/) **diffuse**: The path/URL for the diffuse image.
> * [../types/](../types/) **normal**: The path/URL for the normals image.
>
> * Optional, is not used by default.
> * [../types/](../types/) **collider**: The path/URL for the collider mesh.
>
> * Optional, defaults to a generic box collider.
> * [../types/](../types/) **convex**: Whether the object model is convex.
>
> * Optional, defaults to false.
> * [../types/](../types/) **type**: An Int representing the Object's type.
>
> * Optional, defaults to 0.
>
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * [../types/](../types/) **material**: An Int representing the Object's material.
>
> * Optional, defaults to 0.
>
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * [../types/](../types/) **specular_intensity**: The specular intensity.
>
> * Optional, defaults to 0.1.
> * [../types/](../types/) **specular_color**: The specular [Color](../types/#color).
>
> * Optional, defaults to {r=1, g=1, b=1}.
> * [../types/](../types/) **specular_sharpness**: The specular sharpness.
>
> * Optional, defaults to 3.
> * [../types/](../types/) **freshnel_strength**: The freshnel strength.
>
> * Optional, defaults to 0.1.
> * [../types/](../types/) **cast_shadows**: Whether the Object casts shadows.
>
> * Optional, defaults to true.
> * Optional, is not used by default.
> * Optional, defaults to a generic box collider.
> * Optional, defaults to false.
> * Optional, defaults to 0.
>
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * **0**: Generic
> * **1**: Figurine
> * **2**: Dice
> * **3**: Coin
> * **4**: Board
> * **5**: Chip
> * **6**: Bag
> * **7**: Infinite bag
> * Optional, defaults to 0.
>
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * **0**: Plastic
> * **1**: Wood
> * **2**: Metal
> * **3**: Cardboard
> * Optional, defaults to 0.1.
> * Optional, defaults to {r=1, g=1, b=1}.
> * Optional, defaults to 3.
> * Optional, defaults to 0.1.
> * Optional, defaults to true.
>
## Custom Tile {#custom-tile}

* Custom_Tile

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **image**: The path/URL for the [custom tile](https://kb.tabletopsimulator.com/custom-content/custom-tile/)image.
> * [../types/](../types/) **type**: Determines the shape of the tile.
>
> * Optional, defaults to 0.
>
> * **0**: Square/Rectangle
> * **1**: Hex
> * **2**: Circle
> * **3**: Square/Rectangle (Rounded)
> * [../types/](../types/) **image_bottom**: The path/URL for the bottom-side image.
>
> * Optional, uses the top image by default.
> * [../types/](../types/) **thickness**: How thick the tile is.
>
> * Optional, defaults to 0.5.
> * [../types/](../types/) **stackable**: Whether these tiles stack together into a pile.
>
> * Optional, defaults to false.
> * [../types/](../types/) **image**: The path/URL for the [custom tile](https://kb.tabletopsimulator.com/custom-content/custom-tile/)image.
> * [../types/](../types/) **type**: Determines the shape of the tile.
>
> * Optional, defaults to 0.
>
> * **0**: Square/Rectangle
> * **1**: Hex
> * **2**: Circle
> * **3**: Square/Rectangle (Rounded)
> * [../types/](../types/) **image_bottom**: The path/URL for the bottom-side image.
>
> * Optional, uses the top image by default.
> * [../types/](../types/) **thickness**: How thick the tile is.
>
> * Optional, defaults to 0.5.
> * [../types/](../types/) **stackable**: Whether these tiles stack together into a pile.
>
> * Optional, defaults to false.
> * Optional, defaults to 0.
>
> * **0**: Square/Rectangle
> * **1**: Hex
> * **2**: Circle
> * **3**: Square/Rectangle (Rounded)
> * **0**: Square/Rectangle
> * **1**: Hex
> * **2**: Circle
> * **3**: Square/Rectangle (Rounded)
> * Optional, uses the top image by default.
> * Optional, defaults to 0.5.
> * Optional, defaults to false.
>
## Custom Token {#custom-token}

* Custom_Token

> **Info: Custom Parameters**
>
> * [../types/](../types/) **parameters**: A Table of parameters which determine the properties of the Object.
>
> * [../types/](../types/) **image**: The path/URL for the [custom token](https://kb.tabletopsimulator.com/custom-content/custom-token/)image.
> * [../types/](../types/) **thickness**: How thick the token is.
>
> * Optional, defaults to 0.2.
> * [../types/](../types/) **merge_distance**: How accurately the token shape will trace image edge (in pixels).
>
> * Optional, defaults to 15.
> * [../types/](../types/) **stackable**: Whether these tokens stack together into a pile.
>
> * Optional, defaults to false.
> * [../types/](../types/) **image**: The path/URL for the [custom token](https://kb.tabletopsimulator.com/custom-content/custom-token/)image.
> * [../types/](../types/) **thickness**: How thick the token is.
>
> * Optional, defaults to 0.2.
> * [../types/](../types/) **merge_distance**: How accurately the token shape will trace image edge (in pixels).
>
> * Optional, defaults to 15.
> * [../types/](../types/) **stackable**: Whether these tokens stack together into a pile.
>
> * Optional, defaults to false.
> * Optional, defaults to 0.2.
> * Optional, defaults to 15.
> * Optional, defaults to false.
