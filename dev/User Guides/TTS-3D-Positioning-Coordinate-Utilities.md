# TTS 3D Positioning Coordinate Utilities

This guide summarizes the existing 3D positioning helpers in `lib/util.ttslua`, with a focus on cylindrical and spherical coordinates for smooth motion/orbits in Tabletop Simulator (TTS).

## Quick start

```lua
local U = require("lib.util")
```

For motion/orbits that must interpolate smoothly, prefer the path functions:

- `U.GetEasedPath(...)` + `U.LerpPath(...)` (pre-compute path when no object references are involved)
- `U.LerpDeferred(...)` (handles object references and resolves them at execution time)

## Coordinate & angle conventions used here

### Table axes (TTS orientation)

The utilities assume:

- Origin `Vector(0, 0, 0)` is the center of the table
- `+X` is to the right
- `+Y` is up
- `+Z` is away from players (toward the back/far edge)

### Cylindrical + spherical angle conventions

These conventions are used by `U.XYZToCylindrical(...)`, `U.XYZToSpherical(...)`, and the corresponding internal XYZ conversion used by the path functions.

- `angle` (horizontal / XZ-plane)
  - `0°`  => `+Z` (away from players)
  - `90°` => `+X` (right)
  - `180°` => `-Z` (toward players)
  - `270°` => `-X` (left)
- `spherical.angle2` (elevation)
  - `0°` => perpendicular/horizontal (same height as the center)
  - `-90°` => straight up (above center)
  - `+90°` => straight down (below center)

Important: if you provide spherical `angle2`, be consistent with the above definition (the implementation internally shifts `angle2` by `+90` when converting to XYZ).

## Admin/Debug setup helpers (core/debug.ttslua)

The `DEBUG` module is intended for admin/setup-time console commands (not active-play scripting). Use it to:

- calibrate a per-object “look-at” correction offset (because some spotlight assets face a different default direction at rotation `0,0,0`)
- store a reusable cylindrical/spherical “center” reference (so you don't have to pass `centerObjOrGuid` repeatedly)

### 1) `DEBUG.getLookAtOffset(objOrGuid)`

Reads the stored per-object look-at correction offset for `objOrGuid`.

If the calibration vars do not exist on the object, this defaults to `Vector(0, 0, 0)`.

```lua
-- lua DEBUG.getLookAtOffset(lightObjOrGuid)
```

### 2) `DEBUG.calibrateLookAtOffset(objOrGuid, lookAtTargetOrPos, roundIntervalDeg?)`

Calibrates a per-object look-at correction offset so the object aims at the target.

This computes a rounded delta between:

- the base rotation from `U.lookAtRotation(...)`
- the object's current rotation (rounded to the given interval)

```lua
-- lua DEBUG.calibrateLookAtOffset(lightObjOrGuid, targetObjOrPos, 90)
```

### 3) `DEBUG.setRotationLookAt(objOrGuid, lookAtTargetOrPos, useCalibration?)`

Applies a look-at rotation to `objOrGuid`, optionally using calibration by default.

`lookAtTargetOrPos` can be a `GameObject`, a GUID string, or a `{x,y,z}`/`Vector` position.

If calibration vars do not exist, it behaves as if the offset were `Vector(0,0,0)`.

```lua
-- lua DEBUG.setRotationLookAt(lightObjOrGuid, targetObjOrPos)
```

### 4) `DEBUG.setCenterObject(centerObjOrGuid)` / `DEBUG.clearCenterObject()`

Stores (or clears) the center reference used by the cylindrical/spherical positioning helpers.

If you haven't set a center yet (or it's not resolvable), cylindrical/spherical positioning falls back to `Vector(0,0,0)`.

```lua
-- lua DEBUG.setCenterObject(centerObjOrGuid)
-- lua DEBUG.clearCenterObject()
```

### 5) `DEBUG.setPositionCylindrical(objOrGuid, radius, angleDeg, height, lookAtTargetOrPos?)`

Positions `objOrGuid` using cylindrical coordinates relative to the stored center.

If `lookAtTargetOrPos` is provided, it also rotates the object using `DEBUG.setRotationLookAt(...)`.

```lua
-- lua DEBUG.setPositionCylindrical(objOrGuid, 15, 90, 5, targetOrPos?)

-- BROWN ON: lua DEBUG.setPositionCylindrical("f251e0", 78, 180 - (2*36), 23, "14b6cf")
-- BROWN OFF: lua DEBUG.setPositionCylindrical("f251e0", 100, 180 - (2*36), 50, "14b6cf")

-- ORANGE ON: lua DEBUG.setPositionCylindrical("d3356d", 78, 180 - 36, 23, "b9d1d9")
-- ORANGE OFF: lua DEBUG.setPositionCylindrical("d3356d", 100, 180 - 36, 50, "b9d1d9")

-- RED ON: lua DEBUG.setPositionCylindrical("0cd76a", 78, 180, 23, "b13642")
-- RED OFF: lua DEBUG.setPositionCylindrical("0cd76a", 100, 180, 50, "b13642")

-- PINK ON: lua DEBUG.setPositionCylindrical("937fac", 78, 180 + 36, 23, "926600")
-- PINK OFF: lua DEBUG.setPositionCylindrical("937fac", 100, 180 + 36, 50, "926600")

-- PURPLE ON: lua DEBUG.setPositionCylindrical("86117d", 78, 180 + (2*36), 23, "33141c")
-- PURPLE OFF: lua DEBUG.setPositionCylindrical("86117d", 100, 180 + (2*36), 50, "33141c")
```

### 6) `DEBUG.setPositionSpherical(objOrGuid, radius, angleDeg, angle2Deg, lookAtTargetOrPos?)`

Positions `objOrGuid` using spherical coordinates relative to the stored center.

If `lookAtTargetOrPos` is provided, it also rotates the object using `DEBUG.setRotationLookAt(...)`.

```lua
-- lua DEBUG.setPositionSpherical(objOrGuid, 20, 45, -30, targetOrPos?)
```

## Core utilities for cylindrical/spherical work (`lib/util.ttslua`)

### 1) `U.rotateAroundPoint(center, radius, angleDeg, y)`

Rotates a point around a center in the XZ plane (a horizontal circle), returning an XYZ `Vector`.

Usage pattern:

```lua
local pos = U.rotateAroundPoint(center, 15, 90, 2)
-- pos ~= { x = center.x + 15, y = 2, z = center.z + 0 }
```

### 2) `U.XYZToCylindrical(pos, center, centerYaw)`

Converts XYZ `{x, y, z}` into cylindrical coordinates relative to `center`, returning:

- `{ radius, angle, height }`

Notes:

- If `center` is a *GameObject*, the function converts using the center object's local frame (`center.positionToLocal(pos)`), so the returned `angle` is relative to that local frame.
- If `center` is a *Vector/table*, `angle` is computed directly from `pos-center`.

```lua
local cyl = U.XYZToCylindrical(Vector(10, 5, 0), Vector(0, 0, 0))
-- cyl ~= { radius=10, angle=90, height=5 }
```

### 3) `U.XYZToSpherical(pos, center, centerYaw, centerPitch)`

Converts XYZ `{x, y, z}` into spherical coordinates relative to `center`, returning:

- `{ radius, angle, angle2 }`

Notes:

- If `center` is a *GameObject*, spherical coordinates are computed in the center object's local frame (`positionToLocal`).
- `angle` follows the same horizontal conventions as cylindrical `angle`.
- `angle2` uses the elevation definition described above.

```lua
local sph = U.XYZToSpherical(Vector(10, 0, 0), Vector(0, 0, 0))
-- sph ~= { radius=10, angle=90, angle2=90 }  (see angle2 definition)
```

### 4) `U.resolvePositionData(data, coordinateSystem, center, centerYaw, centerPitch)`

Converts a `PositionOrientationData`-like table into an XYZ `Vector`.

Supported `coordinateSystem` values:

- `"xy"` (default behavior): `data.position` is interpreted as an XYZ position
- `"cylindrical"`: `data.position` is interpreted as `{radius, angle, height}` (or a `Vector` as `{x=radius, y=angle, z=height}`)
- `"spherical"`: `data.position` is interpreted as `{radius, angle, angle2}` (or a `Vector` as `{x=radius, y=angle, z=angle2}`)

Example:

```lua
local xyz = U.resolvePositionData(
  { position = { radius = 10, angle = 90, height = 5 } },
  "cylindrical",
  Vector(0, 0, 0)
)
```

## Smooth movement / orbit path generation

The path system operates on a `PositionOrientationData` concept:

- `start` / `endVal` / steps have fields like:
  - `position` (XYZ for `"xy"`, or `{radius,angle,height}` / `{radius,angle,angle2}` for `"cylindrical"`/`"spherical"`)
  - `center` (optional): a `Vector` or `Object` that defines the coordinate origin for cylindrical/spherical
  - `orientation` (optional): either a `Vector` (static rotation) or a target `Object` (look-at each frame)
    - Rotation vector format: `{x = pitchDegrees, y = yawDegrees, z = 0}`

### 5) `U.lookAtRotation(from, to)`

Computes rotation angles `{pitch, yaw, 0}` so a point light/object "looks at" a target position.

The function includes a pitch adjustment (notably for point lights) so the light's forward direction aligns with the intended target.

### 6) `U.GetEasedPath(start, endVal, duration, ease, easeIntensity, coordinateSystem)`

Pre-computes a frame-by-frame array of steps (60 FPS sampling).

Key behavior:

- If `start`/`endVal` contain `Object` references in `position`, `orientation`, or `center`, the function returns `"DEFER"` so you can run a deferred or object-resolving lerp.
- For cylindrical/spherical, it interpolates in coordinate space and converts to XYZ per frame.

Angle interpolation details:

- For `"cylindrical"`:
  - `position.angle` uses an angle interpolator that supports relative strings like `"+360"` / `"-90"` for the *end* angle.
- `position.angleMode` (optional) controls angle interpolation mode when interpolating `position.angle`:
  - `"direct"` (default): interpolate from start angle to end angle directly
  - `"shortest"`: attempt to take the shortest angular route (relative-string end angles bypass this)
- For `"spherical"`:
  - `position.angle` supports `"+X"` / `"-X"` relative strings.
  - `position.angle2` is interpolated numerically; relative-string inputs for `angle2` are not supported by the current implementation.

Example: horizontal spherical circle (XYZ conversions only)

```lua
local center = Vector(0, 0, 0)
local startS = { radius = 15, angle = 0, angle2 = 0 }
local endS   = { radius = 15, angle = 360, angle2 = 0 }

local path = U.GetEasedPath(
  { position = startS, center = center },
  { position = endS,   center = center },
  1.0,
  "linear",
  1.0,
  "spherical"
)

U.LerpPath(path, function(step)
  -- step.position is a Vector
  obj.setPositionSmooth(step.position, false, false)
end)
```

### 7) `U.LerpPath(path, setFunc)`

Executes a precomputed path step-by-step (via coroutine).

Usage:

```lua
local duration = U.LerpPath(path, function(step)
  obj.setPositionSmooth(step.position, false, false)
  if step.orientation ~= nil then
    obj.setRotationSmooth(step.orientation, false, false)
  end
end)
```

### 8) `U.LerpDeferred(start, endVal, duration, ease, easeIntensity, coordinateSystem, setFunc)`

Executes a path while resolving object references at runtime.

Use this when:

- `center` is a `GameObject` (not a `Vector`)
- `orientation` is a target `GameObject` you want to face each frame
- `position`/`orientation` include object references

Skeleton:

```lua
U.LerpDeferred(
  { position = { radius = 15, angle = 0, height = 5 }, center = centerObj, orientation = targetObj },
  { position = { radius = 0,  angle = "+720", height = 5 }, center = centerObj, orientation = targetObj },
  10.0,
  "sineInOut",
  1.0,
  "cylindrical",
  function(step)
    objToMove.setPositionSmooth(step.position, false, false)
    if step.orientation ~= nil then
      objToMove.setRotationSmooth(step.orientation, false, false)
    end
  end
)
```

### 9) Note on `U.Lerp(...)` with cylindrical/spherical

`U.Lerp(...)` can accept `PositionOrientationData`, but when it generates a path from those inputs it hardcodes the coordinate system to `"xy"`.

So:

- Use `U.Lerp(...)` for plain XYZ interpolation.
- Use `U.GetEasedPath(...)` + `U.LerpPath(...)` (or `U.LerpDeferred(...)`) when you need `"cylindrical"` or `"spherical"` interpolation.

## Practical recipes

### Recipe A: Cylindrical "spiral in" (constant height, multiple revolutions)

Use `coordinateSystem = "cylindrical"` and interpolate:

- `radius` decreasing (e.g., `15 -> 0`)
- `angle` increasing (e.g., `0 -> +720`)
- `height` constant

```lua
local center = Vector(0, 0, 0)
local startC = { radius = 15, angle = 0, height = 5 }
local endC   = { radius = 0,  angle = "+720", height = 5 }

local path = U.GetEasedPath(
  { position = startC, center = center, orientation = Vector(0, 90, 0) },
  { position = endC,   center = center, orientation = Vector(0, 90, 0) },
  5.0,
  "sineInOut",
  1.0,
  "cylindrical"
)

U.LerpPath(path, function(step)
  obj.setPositionSmooth(step.position, false, false)
  if step.orientation ~= nil then
    obj.setRotationSmooth(step.orientation, false, false)
  end
end)
```

### Recipe B: Spherical arc (change elevation via `angle2`)

To move on a sphere of radius `R`, vary:

- `angle` to orbit around the center
- `angle2` to change elevation (e.g., `-30 -> 20`)

```lua
local center = Vector(0, 0, 0)
local startS = { radius = 20, angle = 45,  angle2 = -30 }
local endS   = { radius = 20, angle = "+180", angle2 = 20 }

local path = U.GetEasedPath(
  { position = startS, center = center },
  { position = endS,   center = center },
  2.0,
  "sineInOut",
  1.0,
  "spherical"
)

U.LerpPath(path, function(step)
  obj.setPositionSmooth(step.position, false, false)
end)
```

## Extra 3D positioning helpers worth knowing

These aren't coordinate-system-specific, but they're commonly useful during placement/orchestration:

- `U.Distance(pos1, pos2)` and `U.HorizontalDistance(pos1, pos2)` for measuring distances.
- `U.getScatterPosition(boundsOrPosOrObj, yShift, padPercentOrDiameter)` for randomized placement inside a 3D box/zone.
- `U.findAboveObject(obj, testFunc?, params?)`, `U.findBelowObject(...)`, `U.isObjectAbove(...)` for stacking logic using physics casts.
- `U.getSnapPoints(board, coordsFilter?, sortAxis?)` and `U.findSnapPoint(snapPoints, pos, fuzziness?)` for snapping to board-defined attachment points.
- `U.setPositionSlow(obj, position, duration, easing, isColliding)` for smooth position changes.
- `U.setRotationSlow(obj, rotation, duration, easing, isColliding)` for smooth rotation changes.
- `U.setScaleSlow(obj, scale, duration, easing)` for smooth scale changes.

## Related reference modules

- `lib/table-positions.ttslua` provides table/player layout calculations using a polar-like relationship (`x = sin(angle)*radius`, `z = cos(angle)*radius`), which matches the same horizontal angle conventions described above.
