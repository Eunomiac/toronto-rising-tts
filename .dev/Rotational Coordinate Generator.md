# Rotational Coordinate Generator

This document describes layout math for player object groups around a table center, and the **implemented** API in [`lib/rotational-seat-layout.ttslua`](../lib/rotational-seat-layout.ttslua).

## Type Definitions

(TypeScript notation is used for this section for convenience and clarity.)

```typescript
// A Frame describes an object's position and rotation in the game world, in absolute coordinates.
type Frame = {
  position: Vector,
  rotation: Vector
}

// A RelFrame describes an object's position and rotation in the game world, relative to an anchor object and a center point.
type RelFrame = {
  anchorGUID: string, // the GUID of the anchor object
  centerPoint?: Vector, // the center point of the cylindrical coordinate system (default: the centerPoint of the current table as defined in C.Tables[currentTableKey].centerPoint)
  position?: Vector, // the absolute position of the object in the game world (same as Frame.position); mutually exclusive with distanceDelta
  distanceDelta?: number, // the difference in radial distance to centerPoint from the anchor object's position; mutually exclusive with position
  rotation?: Vector, // the absolute rotation of the object in the game world (same as Frame.rotation); mutually exclusive with rotationDelta
  rotationDelta?: Vector, // the difference in rotation to the anchor object's rotation; mutually exclusive with rotation
}

// A Transition describes the position and rotation of an object that is meant to be moved to over a period of time, and includes additional options for how the object should be moved.
type Transition = (Frame | RelFrame) & {
  transitionDuration?: number, // the duration of the transition in seconds, overriding any duration set by the function moving the object (when 0, don't use `setPositionSlow` or `setPositionSmooth`; just use `setPosition` or `setRotation` to avoid collisions or animation glitches)
  transitionDelay?: number, // the delay before the transition starts in seconds, in addition to any sequencing or other transition delays that are set by the function moving the object (default: 0)
  isLocked?: boolean, // if "isLocked" is present, then the object's lock state should be toggled accordingly. When unlocking, this should happen at the very end of the transition. When locking, this should happen at the very beginning of the transition.
}
```

**Note:** `Frame`, `RelFrame`, and `Vector` can all be supplied as `Partial<Frame|RelFrame|Vector>` objects, i.e. tables with only some of the fields present. Lacking fields should simply be derived from the current state of the object. (E.g. `{position = {y = 10}}` would describe the endpoint of a translation along the y-axis by 10 units, while a `Frame` with only a `position` field would leave the `rotation` of the object unchanged.)

## Definitions

| Definition | Description |
| ------------ | ------------- |
| "role" | The name of an object without its uppercase "role suffix" (e.g. "SIGNAL_FIRE" for "SIGNAL_FIRE_RED") |
| "role suffix" | The suffix of an object's name that indicates its player color or NPC slot, with colors converted to proper case alphanumeric (e.g. "Red" for "SIGNAL_FIRE_RED", "NPC1" for "SIGNAL_FIRE_NPC1") |
| "table" | A full table definition as defined in `C.Tables`, including the GUID for the table object itself, its inactive and active positions, any associated component objects and their associated NPC slots, and the parameters necessary to run `R.generateRotationalCoordinates` with that table. |
| "table slot" | A string that identifies a slot on a table, e.g. "Red", "NPC1", "Brown". This will match the "role suffix" of objects associated with that slot. |
| "table slot object" | An object associated with a table slot, e.g. a player light, a player chair, a signal fire, a signal candle, a dice bag, etc. These can be identified by their "table slot tag". **EXCEPTION:** Player hand zones cannot be tagged (as that interferes with the TTS Hand Zone system); they will need to be collected and handled separately. |
| "table slot tag" | A tag on table slot objects (other than hand zones) that identifies them as such, and indicates the table slot to which they are associated. It comprises the "role suffix" of the object followed by "Object" (e.g. "RedObject", "NPC1Object", "BrownObject"). |
| "player color" / "player seat" | One of the five seated player colors defined in `C.PlayerColors`: "Brown", "Orange", "Red", "Pink", "Purple". These are also role suffixes and table slot values. |
| "npc seat" | One of the four NPC seats defined in `C.NPCSeats`: "NPC1", "NPC2", "NPC3", "NPC4". These are also role suffixes and table slot values, but unlike with player colors, they do not exist for every table. |
| "hand zone anchor" | Because only players have physical hand zones, a more flexible reference point is needed to account for NPC slots. For players, the hand zone anchor is the hand zone itself. For NPCs, the hand zone anchor is a `Frame` representing where that seat's hand zone would be if it existed. By reducing player hand zones to hand zone anchors first, we can apply the same positioning logic to both players and NPCs. **Important:** The hand zone anchor is the primary anchor used when rotating objects around a table; it must be derived from actual hand zones (for players) or defined as a virtual `Frame` (for NPCs). As a result, hand zones are omitted from `sourceObjects` and must be derived/defined before the function proceeds. |

## Implementation (TTS)

### Parameter reference (skeleton)

```lua
local R = require("lib.rotational-seat-layout")

local sourceObjects = {
    -- "sourceObjects" is a nested table with the following fields:
    --   - "player": source objects for player seats
    --   - "other": source objects for non-player seats (e.g. NPC1..NPC4)
    --   - "all": source objects for both player + non-player seats
    --   - "relative": objects that rigidly follow their derived seat hand-zone anchor
    --   - "cameraModes.bySeat": keys in C.RedCameraAngles; layout writes playerData.cameraAngles and universalCameraAngles[<mode><seatKey>] (all seats in the map, including NPC slots) from the same derived angles

    -- entries used to move/spawn objects into player seats only
    player = {
        "DICEBAG_HUNGER",
        "f10182",
        getObjectFromGUID("f10182"),
    },

    -- entries used only for non-player seats
    other = {
        "SEAT_LIGHT_3",
    },

    -- entries used to move/spawn objects into player seats and NPC seats
    all = {
        "SEAT_LIGHT_1",
    },

    -- entries used for relative objects; each element always refers to one object
    relative = {
        G.GUIDS.TAROT_DECK_PINK,
    },

    -- camera presets to rotate when applying this table layout
    cameraModes = {
        bySeat = { "default", "sheet", "diceTray", "facing" },
    },
}

local computed = R.generateRotationalCoordinates(
    sourceObjects,       -- nested table: { player = {...}, other = {...}, all = {...}, relative = {...}, cameraModes = {...} }
    centerPoint,         -- table or Vector: axis of rotation + cylindrical origin for layout math
    numSegments,         -- integer ≥ 1: seats (polygon vertices) around the table
    angleSegmentOne,     -- number (degrees): azimuth of segment 1; 0° = +Z (see util conventions)
    playerToPositionMap, -- keys = arbitrary non-empty strings (PC colors or non-player seat ids); values = segment 1..numSegments
    referencePlayerColor,-- string: templates’ suffix must be _ .. string.upper(this) (uppercase alphanumeric suffix)
    options              -- optional table; omit entirely to use defaults (see below)
)

-- options (all optional keys):
--   anchorIndex          — index of anchor slot within active reference-seat slots (default 1)
--   radius               — explicit center radius override (default: inferred from reference anchor placement)
--   frameRefsRelativePath — workspace path for FrameReference Lua (default "debug_logs/seat_layout_frame_refs.lua")
--   frameRefsVarName      — global name in generated file (default "SEAT_LAYOUT_FRAME_REFS")
--   currentTableKey       — optional key written to gameState.seatLayout.currentTableKey

R.resolveSeatObjects(
    computed,            -- return value from generateRotationalCoordinates
    sourceObjects,       -- same nested table passed to generateRotationalCoordinates
    options              -- optional table; omit to use default path + var name (see below)
)

-- resolve options (all optional):
--   isSpawningPlayerObjects — boolean: whether to spawn objects with player color role suffixes if they do not already exist (default: false)
--   isSpawningNPCObjects    — boolean: whether to spawn objects with npc seat role suffixes if they do not already exist (default: true)
--   guidMapRelativePath — default "debug_logs/seat_layout_guids.lua"
--   guidMapVarName      — default "SEAT_LAYOUT_OBJECT_GUIDS"
--   guidTransformsVarName — default "SEAT_LAYOUT_OBJECT_TRANSFORMS" (appended to same output file)
--   guidFollowerTransformsVarName — default "SEAT_LAYOUT_FOLLOWER_OBJECT_TRANSFORMS" (same output file)
--   playerSeatRelativeObjectsBySeat — optional map: seatKey -> array of refs to rigidly follow that seat's hand-zone anchor


-- Main convenience API: wraps generateRotationalCoordinates + resolveSeatObjects, and then applies cameraModes.
--   It rotates bySeat presets into per-player data and into gameState.seatLayout.universalCameraAngles (<mode><seatKey>).
R.resolveSeatObjectsFromTable(
  tableRef,              -- table reference to a table object in C.Tables (which contains values for the other parameters required by `generateRotationalCoordinates`)
  sourceObjects,         -- OPTIONAL sourceObjects table; defaults to C.TableSourceObjects if omitted
  options                -- optional table (as above); omit entirely to use defaults (see above)
)

-- Wipe generated clones (and any other `{seatKey}Object` pieces except templates):
--   seatKeys — same shape as playerToPositionMap (map) or an array of seat id strings
--   blacklist — optional; seat ids to leave untouched (see below)
local removed = R.clearGeneratedSeatObjects(
    sourceObjects,
    computed.playerToPositionMap,
    { NPC_SEAT = true, Brown = true }   -- or: { "NPC_SEAT", "Brown" }
)
```

### Worked example (concrete values)

Assume an octagonal table centered on the table origin, segment 1 toward **+Z**, Red’s templates are already placed at the seat you consider segment **3**, and you want Blue at segment **5** and Yellow at segment **1**. Template objects use the `ROLE_COLOR` pattern (e.g. `SEAT_LIGHT_1_RED`, `HAND_ZONE_RED` — the **`PLAYER_` prefix is not required**; only the trailing `_UPPERCASECOLOR` must match `referencePlayerColor`).

```lua
local R = require("lib.rotational-seat-layout")

local sourceObjects = {
    player = {
        "CSHEET_PAGE_1", -- CSHEET_PAGE_1_BROWN, CSHEET_PAGE_1_ORANGE, CSHEET_PAGE_1_RED, CSHEET_PAGE_1_PINK, CSHEET_PAGE_1_PURPLE (player seats only)
    },
    other = {}, -- Empty; there are no NPC-specific objects in this example
    all = {
        "SEAT_CHAIR", -- SEAT_CHAIR_BROWN, SEAT_CHAIR_ORANGE, SEAT_CHAIR_RED, SEAT_CHAIR_PINK, SEAT_CHAIR_PURPLE, SEAT_CHAIR_NPC1, SEAT_CHAIR_NPC2, SEAT_CHAIR_NPC3, SEAT_CHAIR_NPC4 (all seats, both player and NPC)
        getObjectFromGUID("c81772"), -- SIGNAL_CANDLE_RED (all seats)
    },
    relative = {
      G.GUIDS.TAROT_DECK_PINK, -- The single object named TAROT_DECK_PINK with the table slot tag "PinkObject", which should rigidly follow Pink's hand-zone anchor.
    },
    cameraModes = {
      bySeat = { "sheet", "diceTray", "facing" },
    },
}

local centerPoint = { x = 0, y = 1.5, z = 0 }
-- Or: Vector(0, 1.5, 0)

local numSegments = 8

local angleSegmentOne = 0
-- Azimuth of segment 1 in degrees (0° = +Z). Each higher segment index adds a positive step — clockwise
-- around the table when viewed from above (+Y), same as a clock: 12 o'clock = 0°, 3 o'clock = 90°, etc.

local playerToPositionMap = {
    Red = 3,
    Blue = 5,
    Yellow = 1,
    NPC1 = 6,
}

local referencePlayerColor = "Red"
-- Every name in sourceObjects must end with _RED; map must have Red = segment matching anchor.

local computed = R.generateRotationalCoordinates(
    sourceObjects,
    centerPoint,
    numSegments,
    angleSegmentOne,
    playerToPositionMap,
    referencePlayerColor,
    {
        radius = 24,
        frameRefsRelativePath = "debug_logs/seat_layout_frame_refs.lua",
        frameRefsVarName = "SEAT_LAYOUT_FRAME_REFS",
    }
)

R.resolveSeatObjects(
    computed,
    sourceObjects,
    {
        guidMapRelativePath = "debug_logs/seat_layout_guids.lua",
        guidMapVarName = "SEAT_LAYOUT_OBJECT_GUIDS",
        playerSeatRelativeObjectsBySeat = {
            Pink = { getObjectFromGUID("abcdef") }, -- e.g. tarot deck follows Pink hand zone
        },
    }
)
```

**Low-level minimal call** (manual geometry path):

```lua
local computed = R.generateRotationalCoordinates(
    sourceObjects,
    { x = 0, y = 1.5, z = 0 },
    8,
    0,
    { Red = 3, Blue = 5, Yellow = 1 },
    "Red"
)
R.resolveSeatObjects(computed, sourceObjects)
```

**Recommended minimal call** (table-driven wrapper; applies object transforms + cameraModes):

```lua
R.resolveSeatObjectsFromTable("Table A")
-- Equivalent to:
--   R.resolveSeatObjectsFromTable("Table A", C.TableSourceObjects, nil)
```

### Geometry conventions

* **Azimuth** (same as [`U.rotateAroundPoint`](../lib/util.ttslua) / [`U.XYZToCylindrical`](../lib/util.ttslua)): **`x = sin(θ)·r`**, **`z = cos(θ)·r`** relative to `centerPoint` in XZ.
  * **0°** → **+Z** (“12 o’clock” if you picture +Z as top of the table from above).
  * **90°** → **+X** (“3 o’clock”).
  * **180°** → **−Z** (“6 o’clock”).
  * **270°** → **−X** (“9 o’clock”).
* **Increasing θ** moves **clockwise** around the table when **viewed from above** (+Y looking down): 0° → 90° → 180° → 270° is the same sense as a wall clock’s hand moving from 12 toward 3, 6, 9.
* **Segment index `k` (1-based)** increases in that same clockwise direction:
  `thetaK = angleSegmentOne + (k - 1) * (360 / numSegments)`.
* **Rigid motion**: Each object’s world frame is updated by rotating its position in XZ around **`centerPoint`** and adding the same yaw delta to **`rotation.y`** (see [`U.frameAfterRigidYawAboutCenter`](../lib/util.ttslua)).

**What “old minus rule” referred to:** It was **not** a separate project convention for Y-axis rotation. Nothing else in the repo was documented as “increasing angle = counter-clockwise.” The only mistake was a **short-lived `lib/rotational-seat-layout.ttslua` bug**: segment indices used `angleSegmentOne - (k-1)*step`, which advanced seats in the **wrong** direction relative to the clock / [`U.rotateAroundPoint`](../lib/util.ttslua). That was corrected to **`+ (k-1)*step`**. If you never ran that buggy build or never picked segment numbers from it, you can ignore this. If you did, swap segment indices or `angleSegmentOne` so behavior matches the **plus** formula above.

### Azimuth consistency (quick audit, March 2026)

All **horizontal angle** utilities that share the **`x = sin(θ)·r`, `z = cos(θ)·r`** / **`atan2(dx, dz)`** pairing use the **same** sense: **larger θ** ⇒ move from **+Z toward +X** ⇒ **clockwise** when viewed from **+Y** (12 → 3 → 6 → 9 on a clock with 12 at +Z, 3 at +X).

| Location | Role |
| ---------- | ------ |
| [`U.rotateAroundPoint`](../lib/util.ttslua) | Defines θ → XZ on the table. |
| [`U.XYZToCylindrical`](../lib/util.ttslua) / [`U.XYZToSpherical`](../lib/util.ttslua) horizontal | `atan2(dx, dz)` — inverse of the same convention. |
| [`U.RotateToFrom`](../lib/util.ttslua), [`U.frameAfterRigidYawAboutCenter`](../lib/util.ttslua) | Add yaw delta to `cylindrical.angle` and `rotation.y` in that same space. |
| [`U.lookAtRotation`](../lib/util.ttslua) | Yaw uses `atan2(normX, normZ)` — same azimuth as cylindrical. |
| Animation helpers `cylindricalToXYZ` / `sphericalToXYZ` in [`util.ttslua`](../lib/util.ttslua) | Horizontal ring uses `sin(angle)`, `cos(angle)` like `rotateAroundPoint`. |
| [`core/debug.ttslua`](../core/debug.ttslua) `DEBUG.tableRotateTo` | Uses `U.rotateAroundPoint` explicitly for consistency. |

[`core/npcs.ttslua`](../core/npcs.ttslua) places area pivots with **`sin(rad)*distance`, `cos(rad)*distance`** — same θ as util. Local `rotateXZ` applies 2D rotation to **slot offsets**; one code path uses **`-area.rotation`** on those offsets to match the reference-area layout (“fixes mirror” per comment), not to redefine which direction “positive θ” means on the table.

### Template naming

* Each template object’s **Name** or **Nickname** (Name first; if it does not match the pattern, Nickname is used) must match **`^(.+)_([%u%d]+)$`**: non-empty **role** prefix, `_`, then an **uppercase alphanumeric** suffix (A–Z, 0–9). The suffix must equal **`string.upper(referencePlayerColor)`**. The role is everything before that final `_SUFFIX` (e.g. `HAND_ZONE_RED` → role `HAND_ZONE`, suffix `RED`; `CSHEET_PAGE_1_NPC1` → role `CSHEET_PAGE_1`, suffix `NPC1`).
* **`playerToPositionMap` keys** are **not** validated against `Player.getAvailableColors()` or `C.PlayerColors`. Use any string labels you want (e.g. `Brown`, `NPC_RING_1`). They appear in exported Lua tables and in tags as `{key}Object`.
* **`referencePlayerColor`** is which seat owns the placed templates: every template shares its suffix, and `playerToPositionMap[referencePlayerColor]` must match the segment inferred from the **anchor** within **3°**.
* **`resolveSeatObjects`** only needs `computed` and `sourceObjects`; it uses `computed.referencePlayerColor`.

### Tags and cleanup

* Every object in this workflow gets tag `{seatKey}Object` (e.g. `RedObject`, `NPC_WOLFObject` if you use that key — avoid characters TTS rejects in tags).
* For each non-template seat, objects already tagged `{seatKey}Object` are **matched to template slots by role key** from Name / Custom Name (Nickname): `ROLE_SUFFIX` is parsed and matching uses only `ROLE` (e.g. `PLAYER_HAND_ZONE_BROWN` matches template slot `PLAYER_HAND_ZONE_RED`). Suffix may differ per seat; role must be unique per seat tag. **Only missing roles are cloned.** Extra tagged objects that do not match any template role are **left in place**; a log line reports how many unmatched objects remain per seat.
* When a hand-zone role is **moved or cloned** (role contains `HAND_ZONE`), the script attempts to set hand-zone ownership to that seat key via `setValue(seatKey)` (TTS Hand Zone behavior), and also applies `setColorTint(stringColorToRGB(seatKey))` as cosmetic best-effort. This only applies when `seatKey` is a valid TTS player color; non-player seats (e.g. `NPC_SEAT`) are left unchanged.
* Moved/cloned objects are placed with collision disabled (`setPositionSmooth(..., false, true)` / `setRotationSmooth(..., false, true)` when available) to avoid physics bumping that can skew Y offsets.
* **`clearGeneratedSeatObjects(sourceObjects, seatKeys, blacklist)`** removes every `{seatKey}Object` object for each seat id you list (same `seatKeys` shapes as `playerToPositionMap`: map keys or array of strings). **`sourceObjects` GUIDs are never destroyed** (templates). **`blacklist`** is optional: any seat id present as a **truthy map entry** (`{ NPC_SEAT = true }`) or as an **array element** (`{ "NPC_SEAT", "Brown" }`) is skipped for that call — no destructs for that tag. Returns the number of objects successfully destructed. Does **not** use `sendExternalMessage`.

### Workspace output (TTS Tools)

* **Nothing is written from inside the TTS game executable.** The **External Editor** path delivers `sendExternalMessage` to whatever listens on **39998**; this repo’s **tts-bridge** writes each `name` under **`.dev/.debug/`** (e.g. `debug_logs/seat_layout_frame_refs.lua` → `toronto-rising-tts/.dev/.debug/debug_logs/seat_layout_frame_refs.lua`). See [`.dev/DEBUG_FILE_LOGGING.md`](DEBUG_FILE_LOGGING.md). If nothing listens on **39998** or External Editor is off, you may see **no file** even when Lua prints success.
* If **`sendExternalMessage`** is **nil**, `generateRotationalCoordinates` / `resolveSeatObjects` **error** at write time. If it is a **non-nil stub** but nothing is listening, `DEBUG.writeWorkspaceFile` can still return **true** — check the TTS log for `DEBUG: Wrote .dev/.debug/...`.
* **Frame references** (after `generateRotationalCoordinates`): default `debug_logs/seat_layout_frame_refs.lua`, Lua table `SEAT_LAYOUT_FRAME_REFS` — **single level**: each key is `ROLEKEY_` .. `string.upper(seatKey)` (e.g. `HUNGER_SMOKE_BROWN` → `{ position = Vector(...), rotation = Vector(...) }`). If two role/seat pairs normalize to the same string, export **errors** (rare naming collision).
* **GUID map output** (after `resolveSeatObjects`): default `debug_logs/seat_layout_guids.lua` now contains three tables:
  * `SEAT_LAYOUT_OBJECT_GUIDS` — **single level** `ROLEKEY_` .. `string.upper(seatKey)` = `"guid"` (e.g. `HUNGER_SMOKE_BROWN = "abc123"`). Same flattening rule/collision behavior as frame refs.
  * `SEAT_LAYOUT_OBJECT_TRANSFORMS` (or `guidTransformsVarName`) — nested `[seatKey][roleKey] = { position = Vector(...), rotation = Vector(...) }`, read from live objects at export time (moved/cloned objects plus reference seat templates).
  * `SEAT_LAYOUT_FOLLOWER_OBJECT_TRANSFORMS` (or `guidFollowerTransformsVarName`) — nested `[seatKey][objectGuid] = { position = Vector(...), rotation = Vector(...) }` for objects moved via `playerSeatRelativeObjectsBySeat`.

---

## Original pseudocode (design sketch)

```pseudocode
type FrameReference = {
  position: Vector,
  rotation: Vector
}

/**
  generateRotationalCoordinates(sourceObjects, centerPoint, numSegments, angleSegmentOne, playerToPositionMap)
  @param sourceObjects: a table of source objects, with the first object being the anchor point for the group of objects
  @param centerPoint: the center point of the circle around which new groups of player objects will be generated
  @param numSegments: the number of segments the circle should be divided into, i.e. the number of sides of the reference polygon
  @param angleSegmentOne: the angle of the anchor point of the first segment around the centerPoint, in degrees, with the zero-degree point aligned following existing conventions
  @param playerToPositionMap: a mapping of player colors to the segment their group of player objects should be placed in, with the key being the player color and the value being the segment number
  @return a mapping of the same player colors to an array of FrameReferences describing the positions and rotations of each player object in their respective segments
**/
function generateRotationalCoordinates(sourceObjects, centerPoint, numSegments, angleSegmentOne, playerToPositionMap) {
  const sourceAnchor = a FrameReference describing the position and rotation of the first object in sourceObjects
  const circleRadius = the distance from centerPoint to sourceAnchor.position

  // there may be a better way to perform the 'rigid body' rotation of the group of objects; the below is merely my naive thinking on the matter
  const sourceObjRelativeFrameReferences = a mapping of sourceObjects to a FrameReference describing the position and rotation of each object in the group relative to sourceAnchor (which, being the first object in sourceObjects, should be FrameReference(Vector(0, 0, 0), Vector(0, 0, 0)))
  const rotatedSourceAnchors = a mapping of each segment to a FrameReference defining the anchor point of the group of objects assigned to that segment, derived from circleRadius, numSegments, and angleSegmentOne
  const playerSourceAnchors = a filtered rotatedSourceAnchors to only include the FrameReferences for the segments assigned to the player colors in playerToPositionMap
  const playerFrameReferences = a mapping of player colors to an array of FrameReferences describing the positions and rotations of each player object in their respective segments, derived from playerSourceAnchors and sourceObjRelativeFrameReferences

  return playerFrameReferences
}
```

The shipped implementation uses **center-pivot** cylindrical yaw (not anchor-local composition) via `U.frameAfterRigidYawAboutCenter`, matching [`U.RotateToFrom`](../lib/util.ttslua) for flat tables.
