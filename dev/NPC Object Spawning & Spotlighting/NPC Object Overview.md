# NPC Object Overview: Spawning, Positioning & Spotlighting

## NPC Data Structure: `NPCS.characters`

Data for all NPCs is contained in the global `NPCS.characters` table, which is a single-level table of `npcData` tables each describing an NPC object, referenced by their `name`: `NPCS.characters[name]`. This "`npcData`" table is used to spawn the NPC object and its corresponding light object, and contains the following common parameters:

* `name`: The reference key for the NPC in the `NPCS.characters` table, as well as the `name` of the NPC object itself.
* `fullName`: The full name of the NPC, as displayed in the game.
* `figurine`: A table containing the parameters for the NPC figurine object, as described below.
* `stats`: A table containing the statistical data for the NPC, as described below.
* `lighting`: A table containing the lighting data for the NPC, as described below.
* `groups`: A table containing the default grouping data for the NPC, in the form of key/value pairs where key is the name of a group, and the value is the index of the NPC in that group (relevant to NPC spawning areas; see "Spawning NPC Objects & NPC Lights", below). This allows a group of NPCs (e.g. a coterie) to be spawned by the Storyteller with a single command, assign them to an `area`, and they can then be positioned automatically by reference to their assigned `index` value within the `area`.

### `npcData.figurine`

The `figurine` table contains the following parameters:

* `images.front`: The path to an image file depicting the NPC from head-to-toe, standing straight, with a transparent background. This image corresponds to `parameters.image` on the object itself, and is used to display the NPC on the front side of the NPC figurine.
* `images.back`: The path to an image file for a solid black silhouette of the same NPC. This image corresponds to `parameters.image_secondary` on the object itself, and is used to display the NPC on the reverse side of the NPC figurine.
* `scale`: The scale of the NPC figurine. This applies only to the `Transform.scaleX` and `Transform.scaleY` values on the object, and determines the size of the NPC figurine both horizontally and vertically, respectively. (`Transform.scaleZ` remains unchanged, as it affects the "thickness" of the NPC figurine.)

### `npcData.stats`

The `stats` table contains a largely undefined set of statistical data about the NPC. The primary purpose of this table is to display the NPC's statistics to the Storyteller in a readable format. As such, a flexible parsing function (`NPCS.displayStats(npcName)`) must be developed to parse the `stats` table and display the data in a readable format, regardless of the format of the data itself.

### `npcData.lighting`

The `lighting` table contains optional overrides to the lighting mode data that will be dynamically generated when the NPC object is spawned based on common defaults and positional calculations (see "Lighting NPC Objects", below).

## NPC Data Structure: `NPCS.lights`

This table contains the default lighting modes for all NPCs, referenced by the lighting mode, of which there are three:

* `off`: The default lighting mode for all NPCs when they are not in the scene.
* `standard`: The default lighting mode for all NPCs when they are in the scene.
* `spotlight`: The default lighting mode for all NPCs when they are in the spotlight (as triggered by the Storyteller on their HUD).

### Lighting Mode Data: `NPCS.lights.off`, `NPCS.lights.standard`, `NPCS.lights.spotlight`

Most of the data in the NPC lighting mode table aligns with lighting mode data used elsewhere in the game:

* `enabled` (boolean): Whether light is on/off
* `color` (Color): Light color (Color object or table {r,g,b})
* `range` (number): Light range/radius
* `angle` (number): Spotlight angle (degrees); corresponds to `spotAngle` on the light component itself.
* `intensity` (number): Light intensity/brightness

However, instead of providing `position` and `rotation` values directly, the data provided allows these values to be dynamically calculated based on the position and rotation of the NPC object itself. These additional values are:

* `lookAtYShift`: The standard look-at functions, when applied to a spotlight with an NPC figurine as its target, will point towards the center of the RPG figurine: i.e. the NPC's midsection. This value is an offset from the _top_ of the NPC figurine's bounding box, to the NPC's face, given as a percentage of the bounding box height. This value is used to adjust the look-at position of the spotlight to ensure it is always pointing at the NPC's face.
* `positionYShift`: Similar to the above, this value is an offset from the _top_ of the NPC figurine's bounding box, to the NPC's face, given as a percentage of the bounding box height. This value is used to adjust the y-axis position of the spotlight in response to the height of the NPC figurine.
* `distance`: The absolute distance from the look-at target point on the NPC figurine to the spotlight's position, after it has been adjusted for the `lookAtYShift` and `positionYShift` values. Since the light will be centered horizontally on the NPC figurine, this value is enough to fully define the spotlight's position on the x-axis and z-axis, relative to the NPC figurine.

With the look-at target defining rotation values, and scale irrelevant for light objects, the above data is enough to fully define the spotlight's `position` and `rotation` for that lighting mode. Because they are relative to the NPC figurine's position and rotation, they must be dynamically recalculated whenever the NPC object is moved. As with all lighting mode transitions, these values will be lerped smoothly over the course of the transition.

## NPC Data Structure: `NPCS.areas`

Areas describe groups of positions in the game world, at which NPCs can be positioned. `NPCS.areas` data is stored in a table and referenced by a key. Each key corresponds to an area in the game world, which is described by a table with the following structure:

```lua
{
  rotation: number, -- The angle (in cylindrical coordinates) of the area from the center of the table.
  distance: number, -- The distance from the center of the table to the center of the area.
  groundLevel: number -- The height of the ground level of the area.
  positions: [ -- an array of 'slot' offsets within the area, in which NPCs can be positioned by `index` value.
    {x: number, z: number}, -- Offsets from the center of the area, derived BEFORE rotation is applied, for an NPC at index 1.
    {x: number, z: number}, -- Offsets from the center of the area, derived BEFORE rotation is applied, for an NPC at index 2.
    -- ... and so on, for each available slot in the area.
  ]
}
```

## Spawning NPC Objects & NPC Lights

By comining the above data, the Storyteller is able to spawn an NPC object _and_ its corresponding light object into the game world by providing one of two sets of data:

1. The `name` of the NPC to spawn, and the `area` and `index` values to position it in, OR
2. A `group` identifier, and the `area` to position the group in.

### Storyteller UI Elements to Facilitate Spawning of NPCs

#### Current NPCs

All currently-spawned NPCs will be displayed in a top-level panel in the Storyteller HUD, grouped by `area` and sorted by `index`.

* **Moving Between Areas**: The current area for each group of NPCs will be displayed at the top left of their panel. Clicking this will reveal a dropdown menu containing one button for each area in the game world, which will allow the Storyteller to move the entire group of NPCs to the new area.
* **Moving Individuals**: Each NPC will be displayed with a button to the right of their name. Clicking this will reveal a dropdown menu containing one button for each area in the game world, which will allow the Storyteller to move the individual NPC to the new area. The NPC will move to the next available slot/`index` value in the new area.
* **Changing Light Modes**: Each NPC will have one toggle button to the left of their name, corresponding to the `off` and `standard` lighting modes. Additionally, clicking and holding on the NPC's name will switch them to the `spotlight` lighting mode for as long as the mouse button is held down.
* **Clearing Areas**: Each area will have a button to the right of it to clear all NPCs from that area. Clicking this will clear all NPCs from that area, removing them from the game world.
* **Removing Individuals**: Each NPC will have a button to the right of their name to remove them from the game world. Clicking this will remove the individual NPC from the game world.

#### Spawning New NPCs

An "NPCs" button on the main HUD will open a dropdown menu containing one button for each group of NPCs (i.e. all unique values of the `groups` table in the `NPCS.characters` table). Clicking a button will open a sub-panel containing a list of the NPCs in that group, as well as a "Spawn Group" button.

* **Spawning a Group**: Clicking "Spawn Group" will reveal a dropdown menu containing one button for each _unoccupied_ area in the game world, which will allow the Storyteller to spawn the group of NPCs in the selected area.
  * If a member of that group is already in the game world, they will NOT be moved to the new area: only the NPCs in the group that are not currently in the game world will be spawned. (Accordingly, if _all_ members of the group are already in the game world, the group will not be spawned.)
* **Spawning an Individual**: Clicking an NPC's name will reveal a dropdown menu containing one button for each _unoccupied_ area in the game world, which will allow the Storyteller to spawn the individual NPC in the selected area. If the NPC is already in the game world, they will be moved to the new area. The NPC will be moved/spawned into the next available slot/`index` value in the new area.

To complete the `Transform` necessary to spawn the NPC object, the following data must be derived:

* `Transform.posX`: Derived from the `positions` table in the `area` data, and the `index` value provided by the Storyteller (or derived from the `groups` table if the NPC is spawned as part of a group).
* `Transform.posY`: All NPC objects must be positioned on the "ground" of the area to which they are assigned, which is defined in `NPCS.areas[area].groundLevel`. This requires measuring the bounding box of the NPC object after it has spawned and been scaled, and then setting `Transform.posY` to `NPCS.areas[area].groundLevel + (bounding box height / 2)`.
* `Transform.posZ`: Derived from the `positions` table in the `area` data, and the `index` value provided by the Storyteller (or derived from the `groups` table if the NPC is spawned as part of a group).
* `Transform.rotX`: Always `0`.
* `Transform.rotY`: All NPC objects must be rotated to face the center of the table, at `(0, 0, 0)`. (x- and z-axis rotation values are irrelevant for NPC objects, and should remain `0`.)
* `Transform.rotZ`: Always `0`.
* `Transform.scaleX`: Derived from the `scale` value from the NPC's figurine data.
* `Transform.scaleY`: Derived from the `scale` value from the NPC's figurine data.
* `Transform.scaleZ`: Always `1`.

Similarly, to complete the `Transform` of the light object:

* `Transform.posX`: Derived from the `distance` value from the NPC's lighting mode data.
* `Transform.posY`: Derived from the height of the top of the NPC figurine's bounding box and the `positionYShift` value from the NPC's lighting mode data.
* `Transform.posZ`: Derived from the `distance` value from the NPC's lighting mode data.
* `Transform.rotX`: Derived from a look-at function applied to the light, with the center of the NPC figurine as the target.
* `Transform.rotY`: Derived from the `lookAtYShift` value from the NPC's lighting mode data.
* `Transform.rotZ`: Derived from a look-at function applied to the light, with the center of the NPC figurine as the target.
* `Transform.scaleX`: Always `1`.
* `Transform.scaleY`: Always `1`.
* `Transform.scaleZ`: Always `1`.

## Example Data Structures

### `NPCS.characters`

```lua
NPCS.characters = {
  MyleneHamelin = {
    name = "MyleneHamelin",
    fullName = "Mylene Hamelin",
    figurine = {
      images = {
        front = "path/to/myleneHamelin_front.png",
        back = "path/to/myleneHamelin_back.png",
      },
      scale = 15,
    },
    groups = {
      "fiveKeys" = 1,
      "princesCourt" = 4
    },
    lighting = {
      off = {
        color = Color(255/255, 140/255, 0/255),
        lookAtYShift = 0.7
      },
      standard = {
        color = Color(255/255, 140/255, 0/255),
        lookAtYShift = 0.2,
        positionYShift = 0.3
      },
      spotlight = {
        color = Color(255/255, 140/255, 0/255),
        lookAtYShift = 0.2,
        positionYShift = 0.3
      }
    },
    stats = {
      title = "Ventrue Primogen",
      clan = "Ventrue",
      generation = "9th",
      bloodPotency = 3,
      humanity = 6,
      health = 8,
      willpower = 7
      dicePools = {
        standard = {
          physical = 5,
          social = 4,
          mental = 4
        },
        exceptional = {
          ["Animal Ken"] = 9,
          Athletics = 8,
          Awareness = 7,
          Brawl = 8,
          Firearms = 9,
          Melee = 8,
          Dominate = 10,
          Presence = 11
        }
      },
      disciplines = {
        Dominate = {
          value = 3,
          powers = [
            "Compel",
            "Mesmerize",
            "The Forgetful Mind"
          ]
        },
        Presence = {
          value = 1,
          powers = [
            "Awe"
          ]
        },
        ["Blood Sorcery"] = {
          value = 1,
          powers = [
            "Taste of Blood"
          ],
          rituals = {
            1 = [
              "Summon Arnu"
            ]
          }
        }
      },
      special = [
        "Mylene can wield her Dominate powers without eye-contact against anyone who is subject to her Awe."
      ],
      notes = [
        "Mylene still holds a grudge against Lord Lucien for his betrayal during the fight for Praxis.
      ]
    }
  },
}
```

### `NPCS.lights`

```lua
NPCS.lights = {
  off = {
    enabled = false,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 0,
    angle = 0,
    lookAtYShift = 0.6,
    positionYShift = 0.2,
    distance = 20
  },
  standard = {
    enabled = true,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 3,
    angle = 40,
    lookAtYShift = 0.1,
    positionYShift = 0.4,
    distance = 15
  },
  spotlight = {
    enabled = true,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 8,
    angle = 35,
    lookAtYShift = 0.2,
    positionYShift = 0.3,
    distance = 15
  }
}
```

### `NPCS.areas`

```lua
NPCS.areas = {
  "centerForward" = {
    rotation = 0,
    distance = 100,
    groundLevel = -40,
    positions = [
      {x = 0, z = 0},
      {x = 10, z = 5},
      {x = -10, z = 5},
      {x = 20, z = 10},
      {x = -20, z = 10}
      {x = 30, z = 15},
      {x = -30, z = 15}
    ]
  },
  "nearLeft" = {
    rotation = 80,
    distance = 80,
    groundLevel = -40,
    positions = [
      {x = 0, z = 0},
      {x = 10, z = 5},
      {x = -10, z = 5},
      {x = 20, z = 10},
      {x = -20, z = 10}
      {x = 30, z = 15},
      {x = -30, z = 15}
    ]
  },
  "farLeft" = {
    rotation = 70,
    distance = 180,
    groundLevel = 0,
    positions = [
      {x = 0, z = 0},
      {x = 10, z = 5},
      {x = -10, z = 5},
      {x = 20, z = 10},
      {x = -20, z = 10}
      {x = 30, z = 15},
      {x = -30, z = 15}
    ]
  }
}
```
