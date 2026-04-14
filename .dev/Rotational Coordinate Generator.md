# Rotational Coordinate Generator

This document describes layout math for player object groups around a table center, and the **implemented** API in [`lib/rotational-seat-layout.ttslua`](../lib/rotational-seat-layout.ttslua).

## Implementation (TTS)

### Parameter reference (skeleton)

```lua
local R = require("lib.rotational-seat-layout")

local computed = R.generateRotationalCoordinates(
    sourceObjects,       -- [1] = anchor; each entry: GameObject, GUID string, or { guid = "..." }
    centerPoint,         -- table or Vector: axis of rotation + cylindrical origin for layout math
    numSegments,         -- integer ≥ 1: seats (polygon vertices) around the table
    angleSegmentOne,     -- number (degrees): azimuth of segment 1; 0° = +Z (see util conventions)
    playerToPositionMap, -- keys = arbitrary non-empty strings (PC colors, NPC seat ids, …); values = segment 1..numSegments
    referencePlayerColor,-- string: templates’ name suffix must be _ .. string.upper(this) (A–Z only in suffix; see pattern below)
    options              -- optional table; omit entirely to use defaults (see below)
)

-- options (all optional keys):
--   frameRefsRelativePath — workspace path for FrameReference Lua (default "debug_logs/seat_layout_frame_refs.lua")
--   frameRefsVarName      — global name in generated file (default "SEAT_LAYOUT_FRAME_REFS")

R.spawnSeatObjectsFromTemplate(
    computed,            -- return value from generateRotationalCoordinates
    sourceObjects,       -- same ordered list as passed to generateRotationalCoordinates
    options              -- optional table; omit to use default path + var name (see below)
)

-- spawn options (all optional):
--   guidMapRelativePath — default "debug_logs/seat_layout_guids.lua"
--   guidMapVarName      — default "SEAT_LAYOUT_OBJECT_GUIDS"
--   guidTransformsVarName — default "SEAT_LAYOUT_OBJECT_TRANSFORMS" (appended to same output file)

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

Assume an octagonal table centered on the table origin, segment 1 toward **+Z**, Red’s templates are already placed at the seat you consider segment **3**, and you want Blue at segment **5** and Yellow at segment **1**. Template objects use the `ROLE_COLOR` pattern (e.g. `PLAYER_LIGHT_1_RED`, `HAND_ZONE_RED` — the **`PLAYER_` prefix is not required**; only the trailing `_UPPERCASECOLOR` must match `referencePlayerColor`).

```lua
local R = require("lib.rotational-seat-layout")

local sourceObjects = {
    getObjectFromGUID("a1b2c3"),  -- anchor (first object); same ROLE_COLOR rule as siblings (any prefix, _RED suffix here)
    getObjectFromGUID("d4e5f6"),
    getObjectFromGUID("789abc"),
}
-- Alternatively: { "a1b2c3", "d4e5f6", "789abc" } — mixed forms are allowed.

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
        frameRefsRelativePath = "debug_logs/seat_layout_frame_refs.lua",
        frameRefsVarName = "SEAT_LAYOUT_FRAME_REFS",
    }
)

R.spawnSeatObjectsFromTemplate(
    computed,
    sourceObjects,
    {
        guidMapRelativePath = "debug_logs/seat_layout_guids.lua",
        guidMapVarName = "SEAT_LAYOUT_OBJECT_GUIDS",
    }
)
```

**Minimal calls** (defaults for workspace paths and table names):

```lua
local computed = R.generateRotationalCoordinates(
    sourceObjects,
    { x = 0, y = 1.5, z = 0 },
    8,
    0,
    { Red = 3, Blue = 5, Yellow = 1 },
    "Red"
)
R.spawnSeatObjectsFromTemplate(computed, sourceObjects)
```

### WORKSPACE

#### Template Objects

* SIGNAL_FIRE_RED = "cc2959"
* SIGNAL_CANDLE_RED = "c81772"
* HAND_ZONE_RED = "b13642"
* PLAYER_LIGHT_1_RED = "0cd76a"
* PLAYER_CHAIR_RED = "474c0d"
* PLAYER_LIGHT_2_RED = "41bbba"
* HUNGER_SMOKE_RED = "5d1338"
* CSHEET_PAGE_1_RED = "f10182"
* CSHEET_PAGE_2_RED = "357ba5"
* DICE_NORMAL_RED = "a3ae6c"
* DICE_HUNGER_RED = "6d1c15"

```lua

local sourceObjects = {
    getObjectFromGUID("b13642"), -- player hand zone is first object
    getObjectFromGUID("cc2959"),
    getObjectFromGUID("c81772"),
    getObjectFromGUID("0cd76a"),
    getObjectFromGUID("474c0d"),
    getObjectFromGUID("41bbba"),
    getObjectFromGUID("5d1338"),
    getObjectFromGUID("f10182"),
    getObjectFromGUID("357ba5"),
    getObjectFromGUID("a3ae6c"),
    getObjectFromGUID("6d1c15")
}

local sourceObjects = {
    getObjectFromGUID("b13642"), -- player hand zone is first object
    getObjectFromGUID("a3ae6c"),
    getObjectFromGUID("6d1c15")
}

local centerPoint = { x = 0, y = 0, z = 50 }

local numSegments = 20

local angleSegmentOne = 0

local playerToPositionMap = {
  Brown = 9,
  Orange = 10,
  Red = 11,
  Pink = 12,
  Purple = 13
}

local referencePlayerColor = "Red"

local computed = R.generateRotationalCoordinates(
    sourceObjects,
    centerPoint,
    numSegments,
    angleSegmentOne,
    playerToPositionMap,
    referencePlayerColor,
    {
        frameRefsRelativePath = "debug_logs/seat_layout_frame_refs.lua",
        frameRefsVarName = "SEAT_LAYOUT_FRAME_REFS",
    }
)

R.spawnSeatObjectsFromTemplate(
    computed,
    sourceObjects,
    {
        guidMapRelativePath = "debug_logs/seat_layout_guids.lua",
        guidMapVarName = "SEAT_LAYOUT_OBJECT_GUIDS",
    }
)

```

```lua
local R = require("lib.rotational-seat-layout")

local sourceObjects = {
    getObjectFromGUID("a1b2c3"),  -- anchor (first object); same ROLE_COLOR rule as siblings (any prefix, _RED suffix here)
    getObjectFromGUID("d4e5f6"),
    getObjectFromGUID("789abc"),
}
-- Alternatively: { "a1b2c3", "d4e5f6", "789abc" } — mixed forms are allowed.

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
        frameRefsRelativePath = "debug_logs/seat_layout_frame_refs.lua",
        frameRefsVarName = "SEAT_LAYOUT_FRAME_REFS",
    }
)

R.spawnSeatObjectsFromTemplate(
    computed,
    sourceObjects,
    {
        guidMapRelativePath = "debug_logs/seat_layout_guids.lua",
        guidMapVarName = "SEAT_LAYOUT_OBJECT_GUIDS",
    }
)
```

**Minimal calls** (defaults for workspace paths and table names):

```lua
local computed = R.generateRotationalCoordinates(
    sourceObjects,
    { x = 0, y = 1.5, z = 0 },
    8,
    0,
    { Red = 3, Blue = 5, Yellow = 1 },
    "Red"
)
R.spawnSeatObjectsFromTemplate(computed, sourceObjects)
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
|----------|------|
| [`U.rotateAroundPoint`](../lib/util.ttslua) | Defines θ → XZ on the table. |
| [`U.XYZToCylindrical`](../lib/util.ttslua) / [`U.XYZToSpherical`](../lib/util.ttslua) horizontal | `atan2(dx, dz)` — inverse of the same convention. |
| [`U.RotateToFrom`](../lib/util.ttslua), [`U.frameAfterRigidYawAboutCenter`](../lib/util.ttslua) | Add yaw delta to `cylindrical.angle` and `rotation.y` in that same space. |
| [`U.lookAtRotation`](../lib/util.ttslua) | Yaw uses `atan2(normX, normZ)` — same azimuth as cylindrical. |
| Animation helpers `cylindricalToXYZ` / `sphericalToXYZ` in [`util.ttslua`](../lib/util.ttslua) | Horizontal ring uses `sin(angle)`, `cos(angle)` like `rotateAroundPoint`. |
| [`calculateHalfDecagonPositions`](../lib/table-positions.ttslua) | Comments state TTS `x = sin(angle)*r`, `z = cos(angle)*r`. |
| [`core/debug.ttslua`](../core/debug.ttslua) `DEBUG.tableRotateTo` | Uses `U.rotateAroundPoint` explicitly for consistency. |

[`core/npcs.ttslua`](../core/npcs.ttslua) places area pivots with **`sin(rad)*distance`, `cos(rad)*distance`** — same θ as util. Local `rotateXZ` applies 2D rotation to **slot offsets**; one code path uses **`-area.rotation`** on those offsets to match the reference-area layout (“fixes mirror” per comment), not to redefine which direction “positive θ” means on the table.

### Template naming

* Each template object’s **Name** or **Nickname** (Name first; if it does not match the pattern, Nickname is used) must match **`^(.+)_(%u+)$`**: non-empty **role** prefix, `_`, then an **all-caps A–Z** suffix only (no digits). The suffix must equal **`string.upper(referencePlayerColor)`**. The role is everything before that final `_SUFFIX` (e.g. `HAND_ZONE_RED` → role `HAND_ZONE`, suffix `RED`; `A_B_C_WOLF` → role `A_B_C`, suffix `WOLF`).
* **`playerToPositionMap` keys** are **not** validated against `Player.getAvailableColors()` or `C.PlayerColors`. Use any string labels you want (e.g. `Brown`, `NPC_RING_1`). They appear in exported Lua tables and in tags as `{key}Object`.
* **`referencePlayerColor`** is which seat owns the placed templates: every template shares its suffix, and `playerToPositionMap[referencePlayerColor]` must match the segment inferred from the **anchor** within **3°**.
* **`spawnSeatObjectsFromTemplate`** only needs `computed` and `sourceObjects`; it uses `computed.referencePlayerColor`.

### Tags and cleanup

* Every object in this workflow gets tag `{seatKey}Object` (e.g. `RedObject`, `NPC_WOLFObject` if you use that key — avoid characters TTS rejects in tags).
* For each non-template seat, objects already tagged `{seatKey}Object` are **matched to template slots by role key** from Name / Custom Name (Nickname): `ROLE_SUFFIX` is parsed and matching uses only `ROLE` (e.g. `PLAYER_HAND_ZONE_BROWN` matches template slot `PLAYER_HAND_ZONE_RED`). Suffix may differ per seat; role must be unique per seat tag. **Only missing roles are cloned.** Extra tagged objects that do not match any template role are **left in place**; a log line reports how many unmatched objects remain per seat.
* When a hand-zone role is **moved or cloned** (role contains `HAND_ZONE`), the script attempts to set hand-zone ownership to that seat key via `setValue(seatKey)` (TTS Hand Zone behavior), and also applies `setColorTint(stringColorToRGB(seatKey))` as cosmetic best-effort. This only applies when `seatKey` is a valid TTS player color; non-player seats (e.g. `NPC_SEAT`) are left unchanged.
* Moved/cloned objects are placed with collision disabled (`setPositionSmooth(..., false, true)` / `setRotationSmooth(..., false, true)` when available) to avoid physics bumping that can skew Y offsets.
* **`clearGeneratedSeatObjects(sourceObjects, seatKeys, blacklist)`** removes every `{seatKey}Object` object for each seat id you list (same `seatKeys` shapes as `playerToPositionMap`: map keys or array of strings). **`sourceObjects` GUIDs are never destroyed** (templates). **`blacklist`** is optional: any seat id present as a **truthy map entry** (`{ NPC_SEAT = true }`) or as an **array element** (`{ "NPC_SEAT", "Brown" }`) is skipped for that call — no destructs for that tag. Returns the number of objects successfully destructed. Does **not** use `sendExternalMessage`.

### Workspace output (TTS Tools)

* **Nothing is written from inside the TTS game executable.** TTS Tools (TTS Editor) receives `sendExternalMessage` and writes each `name` under **`.tts/output/`** inside the workspace folder (e.g. `debug_logs/seat_layout_frame_refs.lua` → `toronto-rising-tts/.tts/output/debug_logs/seat_layout_frame_refs.lua`, not `toronto-rising-tts/debug_logs/...`). Same transport as `DEBUG.logToFile` (see [`dev/DEBUG_FILE_LOGGING.md`](DEBUG_FILE_LOGGING.md)). If **`ttsEditor.enableMessages`** is off or the wrong folder is first in a multi-root window, you may see **no file** even when Lua prints success.
* If **`sendExternalMessage`** is **nil**, `generateRotationalCoordinates` / spawn **error** at write time. If it is a **non-nil stub** but nothing is listening, `DEBUG.writeWorkspaceFile` can still return **true** — check the TTS log for `DEBUG: Wrote .tts/output/...` and the extension Output panel.
* **Frame references** (after `generateRotationalCoordinates`): default `debug_logs/seat_layout_frame_refs.lua`, Lua table `SEAT_LAYOUT_FRAME_REFS` — **single level**: each key is `ROLEKEY_` .. `string.upper(seatKey)` (e.g. `HUNGER_SMOKE_BROWN` → `{ position = Vector(...), rotation = Vector(...) }`). If two role/seat pairs normalize to the same string, export **errors** (rare naming collision).
* **GUID map output** (after `spawnSeatObjectsFromTemplate`): default `debug_logs/seat_layout_guids.lua` now contains two tables:
  * `SEAT_LAYOUT_OBJECT_GUIDS` — **single level** `ROLEKEY_` .. `string.upper(seatKey)` = `"guid"` (e.g. `HUNGER_SMOKE_BROWN = "abc123"`). Same flattening rule/collision behavior as frame refs.
  * `SEAT_LAYOUT_OBJECT_TRANSFORMS` (or `guidTransformsVarName`) — nested `[seatKey][roleKey] = { position = Vector(...), rotation = Vector(...) }`, read from live objects at export time (moved/cloned objects plus reference seat templates).

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
