## Table of Contents

* Object Types
  * Blocks
  * Boards
  * Cards
  * Checkers
  * Chess Pieces
  * Chips
  * Dice
  * Dominos
  * Figurines
  * Go Pieces
  * Graphics
  * Piecepack
  * RPG Figurines
  * Tileset Pieces
  * Other
  * Zones
* Spawnable Names

# Built-in

This page has information on each type of non-custom object, including the internal names used in the object's save data, which can be used in the `json.Name`, ` data.Name `, and ` type ` fields of [spawnObjectJSON()](../base/#spawnobjectjson), [spawnObjectData()](../base/#spawnobjectdata), and [spawnObject()](../base/#spawnobject)respectively.
For Custom Objects, see [Custom Game Objects](../custom-game-objects/).

## Object Types {#object-types}

Each item listed below is treated as a unique object type. (ie. A red checker tinted black will not stack on top of a regular black checker.)

### Blocks {#blocks}

|Name|Type|Description|Notes|
|---|---|---|---|
|BlockRectangle|`Block`|A blue rectangular prism.| |
|BlockSquare|` Block `|A red cube.| |
|BlockTriangle|` Block `|A green triangular prism.| |

### Boards {#boards}

All boards spawn locked by default.

|Name|Type|Description|Notes|
|---|---|---|---|
|backgammon_board|` Board `|The fold-open board of Backgammon.|Includes snap-points along each triangle, totalling 120.|
|CardBot_Board|` Board `|The main board and 4 player boards of CardBots, Build & Destroy.|Includes snap-points on each card and deck location, totally 79.|
|Checker_Board|` Board `|The 8x8 board of Checkers.|Includes snap-points on each grid square, totalling 64.|
|Chess_Board|` Board `|The 8x8 board of Chess.|Includes snap-points on each grid square, totalling 64.|
|Chinese_Checkers_Board|` Board `|The 6-pointed board of Sternhalma, or Chinese Checkers.|Includes snap-points on each indent, totalling 121.|
|Go_Board|` Board `|The 9-starred board of Go.|Includes snap-points on each line intersection, totalling 361.|
|Pachisi_board|` Board `|A 6-player Pachisi board.|Includes snap-points on each indent, totall 133.|
|reversi_board|` Board `|The 8x8 board of Reversi.|Includes snap-points on each grid square, totalling 64.|

### Cards {#cards}

|Name|Type|Description|Notes|
|---|---|---|---|
|Card|` Card `|A blank card, standard playing card, or Cardbots card.| |
|Deck|` Deck `|A deck of the 52 standard playing cards.|Shuffles immediately when spawned.|
|Deck_CardBot_Head|` Deck `|A deck of the 10 head cards for CardBots, Build & Destroy.|Shuffles immediately when spawned.|
|Deck_CardBot_Main|` Deck `|A deck of the 152 main cards for CardBots, Build & Destroy.|Shuffles immediately when spawned.|

### Checkers {#checkers}

|Name|Type|Description|Notes|
|---|---|---|---|
|Checker_black|` Checker `|A black checker with a crown emblem on the top side.| |
|Checker_red|` Checker `|A red checker with a crown emblem on the top side.| |
|Checker_white|` Checker `|A white checker with a crown emblem on the top side.| |
|Chinese_Checkers_Piece|` Checker `|A marble for use in Sternhalma, or Chinese Checkers.| |

### Chess Pieces {#chess-pieces}

|Name|Type|Description|Notes|
|---|---|---|---|
|Chess_Bishop|` Chess `|A chrome Chess bishop.|Faces visually to the left.|
|Chess_King|` Chess `|A chrome Chess king.| |
|Chess_Knight|` Chess `|A chrome Chess knight.|Faces visually backward (a common chess practice).|
|Chess_Pawn|` Chess `|A chrome Chess pawn.| |
|Chess_Queen|` Chess `|A chrome Chess queen.| |
|Chess_Rook|` Chess `|A chrome Chess rook.| |

### Chips {#chips}

|Name|Type|Description|Notes|
|---|---|---|---|
|Chip_10|` Chip `|A blue casino chip worth $10|Faces visually to the left.|
|Chip_50|` Chip `|A green casino chip worth $50|Faces visually to the left.|
|Chip_100|` Chip `|A red casino chip worth $100|Faces visually to the left.|
|Chip_500|` Chip `|A silver casino chip worth $500|Faces visually to the left.|
|Chip_1000|` Chip `|A gold casino chip worth $1000|Faces visually to the left.|

### Dice {#dice}

|Name|Type|Description|Notes|
|---|---|---|---|
|Die_4|` Dice `|A 4-sided die.| |
|Die_6|` Dice `|A 6-sided die with dots.| |
|Die_6_Rounded|` Dice `|A 6-sided die with dots and rounded corners.| |
|Die_8|` Dice `|An 8-sided die.| |
|Die_10|` Dice `|A 10-sided die.| |
|Die_12|` Dice `|A 12-sided die.| |
|Die_20|` Dice `|A 20-sided die.| |
|Die_Piecepack|` Dice `|A wooden 6-sided die.| |

### Dominos {#dominos}

|Name|Type|Description|Notes|
|---|---|---|---|
|Domino|` Domino `|A blank domino.| |
|Mahjong_Coin|` Domino `|A coin used in Mahjong.| |
|Mahjong_Stick|` Domino `|A stick used in Mahjong.| |
|Mahjong_Tile|` Domino `|A tile used in Mahjong.| |

### Figurines {#figurines}

|Name|Type|Description|Notes|
|---|---|---|---|
|Figurine_Card_Bot|` Figurine `|A rectangle-based figurine of a CardBot from CardBots, Build & Destroy.|Faces visually to the side.|
|Figurine_Kimi_Kat|` Figurine `|A rectangle-based figurine of two sitting cats.| |
|Figurine_Knil|` Figurine `|A baseless figurine of a sword-wielding knight in full-plate armor.| |
|Figurine_Mara|` Figurine `|A baseless figurine of a bearded man in slacks.| |
|Figurine_Sir_Loin|` Figurine `|A rectangle-based figurine of a sword-wielding warrior with a shield on his back.|Faces visually backwards.|
|Figurine_Zeke|` Figurine `|A baseless figurine of a cloaked character wielding a sword.| |
|Figurine_Zomblor|` Figurine `|A baseless figurine of a zombified riot-officer with knives for hands, wearing a skirt.| |
|Metal Ball|` Figurine `|A metallic marble.|This object's internal name includes a space character and not an underline.|
|PlayerPawn|` Figurine `|A small game piece representing a player.| |

### Go Pieces {#go-pieces}

|Name|Type|Description|Notes|
|---|---|---|---|
|go_game_piece_black|` GoPiece `|A black Go stone.|Spawned from a [black Go bowl](#go_game_bowl_black).|
|go_game_piece_white|` GoPiece `|A white Go stone.|Spawned from a [white Go bowl](#go_game_bowl_white).|
|go_game_bowl_black|` GoPiece `|A bowl that any number of [Black Go Stones](#go_game_piece_black) can be taken from and dropped back into.| |
|go_game_bowl_white|` GoPiece `|A bowl that any number of [White Go Stones](#go_game_piece_white) can be taken from and dropped back into.| |

### Graphics {#graphics}

|Name|Description|Notes|
|---|---|---|
|3DText|The text that the [Text Tool](https://kb.tabletopsimulator.com/game-tools/text-tool/) spawns.| |

### Piecepack {#piecepack}

|Name|Type|Description|Notes|
|---|---|---|---|
|PiecePack_Arms|` Piecepack `|A wooden coin with a blue fleur-de-lis on the underside.| |
|PiecePack_Crowns|` Piecepack `|A wooden coin with a green crown on the underside.| |
|PiecePack_Moons|` Piecepack `|A wooden coin with a black moon on the underside.| |
|PiecePack_Suns|` Piecepack `|A wooden coin with a red sun on the underside.| |

### RPG Figurines {#rpg-figurines}

|Name|Type|Description|Notes|
|---|---|---|---|
|rpg_BARGHEST|` rpgFigurine `|An animated figurine of a mythical barghest.| |
|rpg_BASILISK|` rpgFigurine `|An animated figurine of a mythical basilisk (a.k.a. cockatrice).| |
|rpg_BEAR|` rpgFigurine `|An animated figurine of a bear.| |
|rpg_BLACK_DRAGON|` rpgFigurine `|An animated figurine of an eastern dragon.| |
|rpg_CENTAUR|` rpgFigurine `|An animated figurine of an armoured centaur.| |
|rpg_CERBERUS|` rpgFigurine `|An animated figurine of an infernal 3-headed dog.| |
|rpg_CHIMERA|` rpgFigurine `|An animated figurine of a mythical chimera.| |
|rpg_CRASC|` rpgFigurine `|An animated figurine of a one-eyed manta-like creature.| |
|rpg_CYCLOP|` rpgFigurine `|An animated figurine of a club-wielding cyclops.| |
|rpg_DARKNESS_WARLORD|` rpgFigurine `|An animated figurine of an armoured, morningstar-wielding orc.| |
|rpg_DRAGONIDE|` rpgFigurine `|An animated figurine of an armored humanoid lizard.| |
|rpg_EVIL_WATCHER|` rpgFigurine `|An animated figurine of a cycloptic scaled head with eye-stalks and bat-wings.| |
|rpg_GHOUL|` rpgFigurine `|An animated figurine of an undead humanoid| |
|rpg_GIANT_VIPER|` rpgFigurine `|An animated figurine of a large snake.| |
|rpg_GOBLIN|` rpgFigurine `|An animated figurine of a lightly-armored goblin with two knives.| |
|rpg_GOLEM|` rpgFigurine `|An animated figurine of a large earthen golem.| |
|rpg_GRIFFON|` rpgFigurine `|An animated figurine of a mythical griffon.| |
|rpg_HYDRA|` rpgFigurine `|An animated figurine of a large 3-headed lizard.| |
|rpg_KNIGHT|` rpgFigurine `|An animated figurine of a knight in full-plate armor wielding a sword and shield.| |
|rpg_KOBOLD|` rpgFigurine `|An animated figurine of a small helmeted humanoid.| |
|rpg_LIZARD_WARRIOR|` rpgFigurine `|An animated figurine of a sword-wielding lizard-like humanoid| |
|rpg_MAGE|` rpgFigurine `|An animated figurine of a staff-wielding mage.| |
|rpg_MANTICORA|` rpgFigurine `|An animated figurine of a mythical manticore.|This type is spelled with an A.|
|rpg_MUMMY|` rpgFigurine `|An animated figurine of a living mummy.| |
|rpg_OGRE|` rpgFigurine `|An animated figurine of a large boiled humanoid.| |
|rpg_ORC|` rpgFigurine `|An animated figurine of an axe-wielding orc.| |
|rpg_RANGER|` rpgFigurine `|An animated figurine of a bow-wielding ranger.| |
|rpg_RAT|` rpgFigurine `|An animated figurine of a giant rat.| |
|rpg_SKELETON_KNIGHT|` rpgFigurine `|An animated figurine of an armored living skeleton.| |
|rpg_TEMPLATE|` rpgFigurine `|The base of an RPG figurine.|It has the same animatable triggers as any other RPG Figurine, but no associated animations.|
|rpg_THIEF|` rpgFigurine `|An animated figurine of a cowled knife-wielding thief.| |
|rpg_TREE_ENT|` rpgFigurine `|An animated figurine of a large tree creature.| |
|rpg_TROLL|` rpgFigurine `|An animated figurine of a large green humanoid.| |
|rpg_VAMPIRE|` rpgFigurine `|An animated figurine of a large wingless bat.| |
|rpg_WARRIOR|` rpgFigurine `|An animated figurine of a stout, bearded, axe-wielding warrior in scale mail.| |
|rpg_WEREWOLF|` rpgFigurine `|An animated figurine of a mythical werewolf.| |
|rpg_WOLF|` rpgFigurine `|An animated figurine of a mythical wolf.| |
|rpg_WYVERN|` rpgFigurine `|An animated figurine of a mythical wyvern.| |

### Tileset Pieces {#tileset-pieces}

|Name|Type|Description|Notes|
|---|---|---|---|
|Tileset_Barrel|` Tileset `|A small barrel for use in RPG Tilesets.| |
|Tileset_Chair|` Tileset `|A small chair for use in RPG Tilesets.| |
|Tileset_Chest|` Tileset `|A small chest for use in RPG Tilesets.| |
|Tileset_Corner|` Tileset `|A floor tile with two walls for use in RPG Tilesets.| |
|Tileset_Floor|` Tileset `|A floor tile for use in RPG Tilesets.| |
|Tileset_Rock|` Tileset `|A small rock for use in RPG Tilesets.| |
|Tileset_Table|` Tileset `|A small table for use in RPG Tilesets.| |
|Tileset_Tree|` Tileset `|A small tree for use in RPG Tilesets.| |
|Tileset_Wall|` Tileset `|A floor tile with a wall for use in RPG Tilesets.| |

### Other {#other}

|Name|Type|Description|Notes|
|---|---|---|---|
|backgammon_piece_brown|` Backgammon Piece `|A brown Backgammon piece.| |
|backgammon_piece_white|` Backgammon Piece `|A white Backgammon piece.| |
|Bag|` Bag `|A pouch that objects can be stored in and taken from.| |
|Bowl|` Generic `|A wooden bowl that objects can be dropped in.|The bowl does not have an inventory, objects merely rest within it visually.|
|Calculator|` Calculator `|An interactive calculator.|Faces visually backwards.|
|Counter|` Counter `|An interactive digital counter.| |
|Digital_Clock|` Clock `|An interactive digital clock.| |
|Infinite_Bag|` Infinite `|A pouch that any number of copies of a single object can be taken from and dropped back into.|An object must be put into the bag to become the source object.|
|Notecard|` Notecard `|An editable notecard.| |
|Quarter|` Coin `|An american quarter minted in 1942.|Spawns tails-up, facing to the right.|
|reversi_chip|` Generic `|A dual-colored Reversi chip.|Spawns white-side up.|
|Tablet|` Tablet `|A tablet that displays a webpage.| |

### Zones {#zones}

|Name|Type|Description|
|---|---|---|
|FogOfWar|` Fog `|A [Fog of War Zone](https://kb.tabletopsimulator.com/game-tools/zone-tools/#fog-of-war-zone).|
|FogOfWarTrigger|` FogOfWar `|A [Hidden Zone](https://kb.tabletopsimulator.com/game-tools/zone-tools/#hidden-zone).|
|HandTrigger|` Hand `|A [Hand Zone](https://kb.tabletopsimulator.com/game-tools/zone-tools/#hand-zone).|
|LayoutZone|` Layout `|A [Layout Zone](https://kb.tabletopsimulator.com/game-tools/zone-tools/#layout-zone).|
|RandomizeTrigger|` Randomize `|A [Randomize Zone](https://kb.tabletopsimulator.com/game-tools/zone-tools/#randomize-zone).|
|ScriptingTrigger|` Scripting `|A [Scripting Zone](https://kb.tabletopsimulator.com/game-tools/zone-tools/#scripting-zone).|

## Spawnable Names {#spawnable-names}

When using [spawnObject()](../base/#spawnobject), the ` type ` parameter can be any of the above object types, or any of the below names, which spawns an object of a certain type, and with certain properties different from default.

|Alternate Name|Object|Differences|
|---|---|---|
|Arms Dice|[Die_Piecepack](#Die_Piecepack)|` MaterialIndex ` of `0`.|
|Backgammon Board|[backgammon_board](#backgammon_board)|Snaps to table level immediately upon spawn.|
|Barrel|[Tileset_Barrel](#Tileset_Barrel)|(none)|
|Bear|[rpg_BEAR](#rpg_BEAR)|(none)|
|Bishop Cast Iron|[Chess_Bishop](#Chess_Bishop)|` MaterialIndex ` of `1`.|
|Bishop Chrome|[Chess_Bishop](#Chess_Bishop)|` MaterialIndex ` of `0`.|
|Bishop Dark Wood|[Chess_Bishop](#Chess_Bishop)|` MaterialIndex ` of `3`.|
|Bishop Light Wood|[Chess_Bishop](#Chess_Bishop)|` MaterialIndex ` of `2`.|
|Black Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `6`.|
|Black Checker|[Checker_black](#Checker_black)|(none)|
|Black Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `8`.|
|Blue 10|[Chip_10](#Chip_10)|(none)|
|Blue Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `4`.|
|Blue Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `5`.|
|Blue Rectangle|[BlockRectangle](#BlockRectangle)|(none)|
|Brown Backgammon|[backgammon_piece_brown](#backgammon_piece_brown)|(none)|
|CardBot|[Figurine_Card_Bot](#Figurine_Card_Bot)|(none)|
|CardBots Head Deck|[Deck_CardBot_Head](#Deck_CardBot_Head)|(none)|
|CardBots Main Deck|[Deck_CardBot_Main](#Deck_CardBot_Main)|(none)|
|Chair|[Tileset_Chair](#Tileset_Chair)|(none)|
|Checkers Board|[Checker_Board](#Checker_Board)|Snaps to table level immediately upon spawn.|
|Chess Board|[Chess_Board](#Chess_Board)|Snaps to table level immediately upon spawn.|
|Chest|[Tileset_Chest](#Tileset_Chest)|(none)|
|Chimera|[rpg_CHIMERA](#rpg_CHIMERA)|(none)|
|Chinese Checkers Board|[Chinese_Checkers_Board](#Chinese_Checkers_Board)|Snaps to table level immediately upon spawn.|
|Corner|[Tileset_Corner](#Tileset_Corner)|(none)|
|Crowns Dice|[Die_Piecepack](#Die_Piecepack)|` MaterialIndex ` of `1`.|
|Custom Board|[Custom_Board](../custom-game-objects/#custom-board)|Snaps to table level immediately upon spawn.|
|Custom Deck|[DeckCustom](../custom-game-objects/#custom-deck)|(none)|
|Custom Figurine|[Figurine_Custom](../custom-game-objects/#custom-figurine)|(none)|
|Custom Model|[Custom_Model](../custom-game-objects/#custom-model)|(none)|
|Cyclops|[rpg_CYCLOP](#rpg_CYCLOP)|(none)|
|D10|[Die_10](#Die_10)|` MaterialIndex ` of `0`.|
|D10 Chrome|[Die_10](#Die_10)|` MaterialIndex ` of `1`, ` AltSound ` of ` true `.|
|D12|[Die_12](#Die_12)|` MaterialIndex ` of `0`.|
|D12 Chrome|[Die_12](#Die_12)|` MaterialIndex ` of `1`, ` AltSound ` of ` true `.|
|D20|[Die_20](#Die_20)|` MaterialIndex ` of `0`.|
|D20 Chrome|[Die_20](#Die_20)|` MaterialIndex ` of `1`, ` AltSound ` of ` true `.|
|D4|[Die_4](#Die_4)|` MaterialIndex ` of `0`.|
|D4 Chrome|[Die_4](#Die_4)|` MaterialIndex ` of `1`, ` AltSound ` of ` true `.|
|D6|[Die_6](#Die_6)|` MaterialIndex ` of `0`.|
|D6 Black|[Die_6_Rounded](#Die_6_Rounded)|` MaterialIndex ` of `0`.|
|D6 Blue|[Die_6_Rounded](#Die_6_Rounded)|` MaterialIndex ` of `3`.|
|D6 Chrome|[Die_6](#Die_6)|` MaterialIndex ` of `1`, ` AltSound ` of ` true `.|
|D6 Green|[Die_6_Rounded](#Die_6_Rounded)|` MaterialIndex ` of `2`.|
|D6 Red|[Die_6_Rounded](#Die_6_Rounded)|` MaterialIndex ` of `1`.|
|D8|[Die_8](#Die_8)|` MaterialIndex ` of `0`.|
|D8 Chrome|[Die_8](#Die_8)|` MaterialIndex ` of `1`, ` AltSound ` of ` true `.|
|Digital Clock|[Digital_Clock](#Digital_Clock)|(none)|
|Dragonide|[rpg_DRAGONIDE](#rpg_DRAGONIDE)|(none)|
|Evil Watcher|[rpg_EVIL_WATCHER](#rpg_EVIL_WATCHER)|(none)|
|Floor|[Tileset_Floor](#Tileset_Floor)|(none)|
|Ghoul|[rpg_GHOUL](#rpg_GHOUL)|(none)|
|Giant Rat|[rpg_RAT](#rpg_RAT)|(none)|
|Giant Viper|[rpg_GIANT_VIPER](#rpg_GIANT_VIPER)|(none)|
|Go Board|[Go_Board](#Go_Board)|Snaps to table level immediately upon spawn.|
|GO Bowl Black|[go_game_bowl_black](#go_game_bowl_black)|(none)|
|GO Bowl White|[go_game_bowl_white](#go_game_bowl_white)|(none)|
|GO Piece Black|[go_game_piece_black](#go_game_piece_black)|(none)|
|GO Piece White|[go_game_piece_white](#go_game_piece_white)|(none)|
|Goblin|[rpg_GOBLIN](#rpg_GOBLIN)|(none)|
|Gold 1000|[Chip_1000](#Chip_1000)|(none)|
|Golem|[rpg_GOLEM](#rpg_GOLEM)|(none)|
|Green 50|[Chip_50](#Chip_50)|(none)|
|Green Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `3`.|
|Green Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `4`.|
|Green Triangle|[BlockTriangle](#BlockTriangle)|(none)|
|Griffon|[rpg_GRIFFON](#rpg_GRIFFON)|(none)|
|Hydra|[rpg_HYDRA](#rpg_HYDRA)|(none)|
|Joker|[Card](#Card)|` CardID ` of `52`.|
|Kimi Kat|[Figurine_Kimi_Kat](#Figurine_Kimi_Kat)|(none)|
|King Cast Iron|[Chess_King](#Chess_King)|` MaterialIndex ` of `1`.|
|King Chrome|[Chess_King](#Chess_King)|` MaterialIndex ` of `0`.|
|King Dark Wood|[Chess_King](#Chess_King)|` MaterialIndex ` of `3`.|
|King Light Wood|[Chess_King](#Chess_King)|` MaterialIndex ` of `2`.|
|Knight Cast Iron|[Chess_Knight](#Chess_Knight)|` MaterialIndex ` of `1`.|
|Knight Chrome|[Chess_Knight](#Chess_Knight)|` MaterialIndex ` of `0`.|
|Knight Dark Wood|[Chess_Knight](#Chess_Knight)|` MaterialIndex ` of `3`.|
|Knight Light Wood|[Chess_Knight](#Chess_Knight)|` MaterialIndex ` of `2`.|
|Knight of Knil|[Figurine_Knil](#Figurine_Knil)|(none)|
|Kobold|[rpg_KOBOLD](#rpg_KOBOLD)|(none)|
|Lizard Warrior|[rpg_LIZARD_WARRIOR](#rpg_LIZARD_WARRIOR)|(none)|
|Loot Bag|[Bag](#Bag)|(none)|
|Manticora|[rpg_MANTICORA](#rpg_MANTICORA)|(none)|
|Mara|[Figurine_Mara](#Figurine_Mara)|(none)|
|Moons Dice|[Die_Piecepack](#Die_Piecepack)|` MaterialIndex ` of `2`.|
|Mummy|[rpg_MUMMY](#rpg_MUMMY)|(none)|
|Ogre|[rpg_OGRE](#rpg_OGRE)|(none)|
|Orange Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `2`.|
|Orc|[rpg_ORC](#rpg_ORC)|(none)|
|Pachisi Board|[Pachisi_board](#Pachisi_board)|Snaps to table level immediately upon spawn.|
|Pawn Cast Iron|[Chess_Pawn](#Chess_Pawn)|` MaterialIndex ` of `1`.|
|Pawn Chrome|[Chess_Pawn](#Chess_Pawn)|` MaterialIndex ` of `0`.|
|Pawn Dark Wood|[Chess_Pawn](#Chess_Pawn)|` MaterialIndex ` of `3`.|
|Pawn Light Wood|[Chess_Pawn](#Chess_Pawn)|` MaterialIndex ` of `2`.|
|Pink Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `5`.|
|Pink Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `7`.|
|Purple Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `6`.|
|Quarter|[Quarter](#Quarter)|(none)|
|Queen Cast Iron|[Chess_Queen](#Chess_Queen)|` MaterialIndex ` of `1`.|
|Queen Chrome|[Chess_Queen](#Chess_Queen)|` MaterialIndex ` of `0`.|
|Queen Dark Wood|[Chess_Queen](#Chess_Queen)|` MaterialIndex ` of `3`.|
|Queen Light Wood|[Chess_Queen](#Chess_Queen)|` MaterialIndex ` of `2`.|
|Random Card|[Card](#Card)|Random ` CardID ` between `0` and `51` (inclusive).|
|Random Domino|[Domino](#Domino)|Random ` MeshIndex ` between `0` and `27` (inclusive).|
|Random Mahjong|[Mahjong_Tile](#Mahjong_Tile)|Random ` MeshIndex ` between `0` and `35` (inclusive).|
|Red 100|[Chip_100](#Chip_100)|(none)|
|Red Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `1`.|
|Red Checker|[Checker_red](#Checker_red)|(none)|
|Red Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `1`.|
|Red Square|[BlockSquare](#BlockSquare)|(none)|
|Reversi Board|[reversi_board](#reversi_board)|Snaps to table level immediately upon spawn.|
|Reversi Chip|[reversi_chip](#reversi_chip)|(none)|
|Rock|[Tileset_Rock](#Tileset_Rock)|(none)|
|Rook Cast Iron|[Chess_Rook](#Chess_Rook)|` MaterialIndex ` of `1`.|
|Rook Chrome|[Chess_Rook](#Chess_Rook)|` MaterialIndex ` of `0`.|
|Rook Dark Wood|[Chess_Rook](#Chess_Rook)|` MaterialIndex ` of `3`.|
|Rook Light Wood|[Chess_Rook](#Chess_Rook)|` MaterialIndex ` of `2`.|
|Silver 500|[Chip_500](#Chip_500)|(none)|
|Sir Loin|[Figurine_Sir_Loin](#Figurine_Sir_Loin)|(none)|
|Skeleton Knight|[rpg_SKELETON_KNIGHT](#rpg_SKELETON_KNIGHT)|(none)|
|Standard Deck|[Deck](#Deck)|(none)|
|Suns Dice|[Die_Piecepack](#Die_Piecepack)|` MaterialIndex ` of `3`.|
|Table|[Tileset_Table](#Tileset_Table)|(none)|
|Tree|[Tileset_Tree](#Tileset_Tree)|(none)|
|Tree Ent|[rpg_TREE_ENT](#rpg_TREE_ENT)|(none)|
|Troll|[rpg_TROLL](#rpg_TROLL)|(none)|
|Vampire|[rpg_VAMPIRE](#rpg_VAMPIRE)|(none)|
|Wall|[Tileset_Wall](#Tileset_Wall)|(none)|
|Werewolf|[rpg_WEREWOLF](#rpg_WEREWOLF)|(none)|
|White Backgammon|[backgammon_piece_white](#backgammon_piece_white)|(none)|
|White Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `0`.|
|White Checker|[Checker_white](#Checker_white)|(none)|
|White Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `0`.|
|Wolf|[rpg_WOLF](#rpg_WOLF)|(none)|
|Wyvern|[rpg_WYVERN](#rpg_WYVERN)|(none)|
|Yellow Ball|[Chinese_Checkers_Piece](#Chinese_Checkers_Piece)|` MaterialIndex ` of `2`.|
|Yellow Pawn|[PlayerPawn](#PlayerPawn)|` MaterialIndex ` of `3`.|
|Zeke Kodoku|[Figurine_Zeke](#Figurine_Zeke)|(none)|
|Zomblor|[Figurine_Zomblor](#Figurine_Zomblor)|(none)|
