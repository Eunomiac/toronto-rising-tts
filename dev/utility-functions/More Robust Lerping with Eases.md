## U.GetEasedPath

A function that pre-computes a complete eased path from start to end, returning a table of sequential values. This eliminates dynamic calculation during animation by "baking in" the path at initialization.

**Key Design Decisions:**
- Pre-computes entire path for efficiency (no repeated math during animation)
- Always returns paths in XYZ coordinate space (converts cylindrical/spherical automatically)
- Frame-based output: Always 60 FPS (~0.0167s per frame) - no updateFrequency parameter
- Supports Object references in start/end (deferred computation - resolved at execution time)
- Unified API: `U.Lerp` accepts either traditional `(start, end)` OR pre-computed path
- **Smart angle interpolation:** Supports both absolute angles (shortest path) and relative angles (forced direction)

**Implementation Notes:**
- Frame-based: Always outputs at 60 FPS (~0.0167s per frame)
- Memory usage: ~300 entries for 5-second animation (acceptable for most use cases)
- Path can be cached and reused for repeated animations
- If Object references present: Path generation deferred until execution time (less efficient but necessary)

### Angle Interpolation System

**Central Feature:** Intelligent angle handling for cylindrical and spherical coordinate systems.

**Start Angle:**
- Must always be a **number** (absolute angle in degrees)
- Direction only matters when compared to the end angle

**End Angle:**
- **If a number:**
  - Calculate full 360° revolutions between start and end
  - Use shortest path for the remainder (normalized to -180° to +180° range)
  - Preserve the number of full rotations (e.g., 0° → 720° = 2 full rotations + 0° remainder)
  - Example: Start 270°, End 250° → -20° (shortest path, no full rotations)
  - Example: Start 0°, End 720° → +720° (2 full rotations, ending at same position as start)
  - Example: Start 10°, End 350° → +20° (shortest path: 340° normalized to -20°, but wait... actually it should be -20°)
    - Actually: 350 - 10 = 340° difference
    - Shortest path: 340° > 180, so 340 - 360 = -20°
    - So it rotates -20° (which is equivalent to going from 10° → 0° → 350°, a shorter path than 10° → 360° → 350°)

- **If a string starting with "+" or "-":**
  - **Force rotation direction** based on sign
  - **"+" prefix:** Positive direction (increasing angle)
  - **"-" prefix:** Negative direction (decreasing angle)
  - Calculate full 360° rotations from the offset value
  - Preserve all full rotations in the specified direction
  - Example: Start 270°, End "+800" → Rotate +800° total (270° → 1070°, or normalized: 270° → 350° with 2 full rotations)
  - Example: Start 270°, End "-20" → Rotate -20° (270° → 250°)
  - Example: Start 0°, End "+720" → Rotate +720° (2 full rotations, ending at same position)
  - Example: Start 350°, End "-20" → Rotate -20° (350° → 330°, not +340°)

**Implementation Logic:**
```lua
function resolveAngleInterpolation(startAngle, endAngle)
    if type(endAngle) == "string" then
        -- String notation: force direction
        local sign = endAngle:sub(1, 1)
        local offset = tonumber(endAngle:sub(2))

        if sign == "+" then
            -- Positive direction
            local fullRotations = math.floor(math.abs(offset) / 360)
            local remainder = offset % 360
            -- Return: total rotation in positive direction
            return offset, fullRotations  -- +800° = 800° total, 2 full rotations
        elseif sign == "-" then
            -- Negative direction
            local fullRotations = math.floor(math.abs(offset) / 360)
            local remainder = offset % 360
            -- Return: total rotation in negative direction
            return offset, fullRotations  -- -800° = -800° total, 2 full rotations
        end
    else
        -- Number: use shortest path but preserve full rotations
        local delta = endAngle - startAngle
        local absDelta = math.abs(delta)

        -- Count full rotations
        local fullRotations = math.floor(absDelta / 360)

        -- Calculate normalized remainder for shortest path
        local remainder = delta % 360
        if remainder > 180 then
            remainder = remainder - 360  -- Go the other way (shorter)
        elseif remainder < -180 then
            remainder = remainder + 360  -- Go the other way (shorter)
        end

        -- Total rotation: full rotations * 360 + remainder
        local totalRotation = fullRotations * 360 + remainder
        return totalRotation, fullRotations
    end
end
```

**Note:** This system applies to the `angle` field in both cylindrical and spherical coordinate systems. The same logic may also be applied to `angle2` in spherical coordinates if needed in the future.

```lua
type CylindricalVector = {radius: number, angle: number, height: number}
type SphericalVector = {radius: number, angle: number, angle2: number}
type XYVector = {x: number, y: number, z: number}

type PositionOrientationData = {
  position?: XYVector | CylindricalVector | SphericalVector | Object,
  center?: XYVector | Object = {x=0, y=0, z=0},
  orientation?: Rotation | Object
}

U.GetEasedPath(
  start: PositionOrientationData,
  end: PositionOrientationData,
  duration: number,
  ease?: "linear" | "powerIn" | "powerOut" | "powerInOut" | "sineIn" | "sineOut" | "sineInOut" | "back" | "bounce" = "sineInOut",
  easeIntensity?: number = 1,
  coordinateSystem?: "xy" | "cylindrical" | "spherical" = "xy"
) -> {PositionOrientationData} | "DEFER"
-- start: The starting position and orientation to start from.
-- end: The ending position and orientation to reach.
--    -- position: The position vector to be eased.
--       -- If an Object is provided, the Object's current position is used (resolved at execution time).
--       -- If CylindricalVector/SphericalVector provided, specify coordinateSystem parameter.
--    -- center: The center of the coordinate space in XYZ when using cylindrical/spherical coordinates.
--       -- If an Object is provided, the Object's current position is used (resolved at execution time).
--    -- orientation: The orientation / rotation vector to be eased.
--      -- rotation: A Vector containing the rotation in degrees for x, y and z.
--      -- object: An Object to face at each step of the path (object's position resolved at execution time).
--   -- If position or orientation are not provided, that property will not be eased. If both are provided, both will be eased.
-- duration: The duration of the easing in seconds.
-- ease: The easing function to use.
-- easeIntensity: Multiplier for easing strength (0.0 = linear, 1.0 = standard, >1.0 = more dramatic).
-- coordinateSystem: The coordinate system used by position vectors in start/end.
--    -- "xy": Position vectors are defined by XYZ coordinates (default).
--    -- "cylindrical": Position vectors are interpreted as {radius, angle, height}.
--       -- If Vector provided: Vector(x, y, z) = {radius=x, angle=y, height=z}
--       -- If table provided: {radius=5, angle=90, height=2}
--       -- Optional: angleMode = "direct" (default) or "shortest"
--          -- "direct": Always interpolate start → end with raw angle values (no wrapping).
--          -- "shortest": Normalize delta to -180..180 when end angle is a number.
--          -- String end angles like "+720"/"-90" always force direct rotation.
--       -- If center is a GameObject, angle is relative to the object's yaw rotation.
--    -- "spherical": Position vectors are interpreted as {radius, angle, angle2}.
--       -- If Vector provided: Vector(x, y, z) = {radius=x, angle=y, angle2=z}
--       -- If table provided: {radius=5, angle=90, angle2=45}
--       -- Optional: angleMode = "direct" (default) or "shortest" (same behavior as cylindrical)
--       -- If center is a GameObject, angle is relative to the object's yaw rotation.
-- return: A table of PositionOrientationData objects, one per frame (60 FPS).
--    -- All positions are converted to XYZ coordinates (cylindrical/spherical converted automatically).
--    -- If Object references present in start/end, returns "DEFER" (computation deferred to execution time).

-- Example: Simple position lerp
local path = U.GetEasedPath(
  {position = Vector(0, 0, 0)},
  {position = Vector(10, 10, 10)},
  1.0,
  "linear",
  1.0,
  "xy"
)
-- Returns ~60 frames (1 second at 60 FPS)

-- Example: Cylindrical coordinate system (orbiting around center)
local orbitPath = U.GetEasedPath(
  {position = {radius = 5, angle = 0, height = 2}, center = Vector(0, 0, 0)},
  {position = {radius = 5, angle = 360, height = 2}, center = Vector(0, 0, 0)},
  3.0,
  "sineInOut",
  1.0,
  "cylindrical"
)
-- Returns ~180 frames (3 seconds at 60 FPS) in XYZ coordinates, automatically converted from cylindrical
-- Note: 0° → 360° is treated as a direct rotation by default (one full revolution)

-- Example: Forced rotation direction (positive, 2 full rotations)
local forcedRotation = U.GetEasedPath(
  {position = {radius = 5, angle = 270, height = 2}, center = Vector(0, 0, 0)},
  {position = {radius = 5, angle = "+720", height = 2}, center = Vector(0, 0, 0)},
  5.0,
  "linear",
  1.0,
  "cylindrical"
)
-- Forces +720° rotation (2 full rotations)
-- Starts at 270°, rotates +720° to 990° (raw angle preserved)

-- Example: Shortest path rotation (number vs number)
local shortestPath = U.GetEasedPath(
  {position = {radius = 5, angle = 270, height = 2, angleMode = "shortest"}, center = Vector(0, 0, 0)},
  {position = {radius = 5, angle = 250, height = 2, angleMode = "shortest"}, center = Vector(0, 0, 0)},
  2.0,
  "sineInOut",
  1.0,
  "cylindrical"
)
-- Uses shortest path: 270° → 250° = -20° (not +340°)

-- Example: Position + orientation with object reference
local path = U.GetEasedPath(
  {position = someObject, orientation = Vector(0, 0, 0)},
  {position = Vector(10, 10, 10), orientation = targetObject},
  2.0,
  "bounce",
  1.5
)
-- Returns "DEFER" - path computation deferred until execution time (Objects resolved then)
```

## Enhanced U.Lerp

`U.Lerp` now accepts either traditional `(start, end)` parameters OR a pre-computed path, providing a unified API.

```lua
U.Lerp(
  setFunc: function,
  paramStart: number | Vector | Color | {PositionOrientationData} | PositionOrientationData,
  paramEnd?: number | Vector | Color | PositionOrientationData,
  duration?: number,
  isRotationLerp?: boolean,
  easing?: string
) -> number

-- Traditional usage (backward compatible)
U.Lerp(function(v) obj.setPositionSmooth(v) end, startPos, endPos, 1.0)

-- Pre-computed path usage
local path = U.GetEasedPath(start, end, 2.0, "bounce", 1.5)
U.Lerp(function(step)
  if step.position then obj.setPositionSmooth(step.position) end
  if step.orientation then obj.setRotationSmooth(step.orientation) end
end, path)

-- PositionOrientationData usage (auto-generates path)
U.Lerp(function(step)
  if step.position then obj.setPositionSmooth(step.position) end
  if step.orientation then obj.setRotationSmooth(step.orientation) end
end, {position = Vector(0,0,0)}, {position = Vector(10,10,10)}, 2.0, false, "bounce")

-- If Object references present, path generation deferred to execution time
```

**Behavior:**
- If `paramStart` is a table of `PositionOrientationData`: Execute as pre-computed path
- If `paramStart` is `PositionOrientationData`: Generate path (may defer if Objects present)
- Otherwise: Use existing behavior (backward compatible)

## U.GetEasedValue

Simple easing for basic types (numbers, Colors) that don't require coordinate systems or complex transforms.

```lua
U.GetEasedValue(
  start: number | Color,
  end: number | Color,
  duration: number,
  ease?: "linear" | "powerIn" | "powerOut" | "powerInOut" | "sineIn" | "sineOut" | "sineInOut" | "back" | "bounce" = "sineInOut",
  easeIntensity?: number = 1
) -> {number | Color}
-- Simplified version of GetEasedPath for basic types.
-- Returns table of interpolated values, one per frame (60 FPS).

local alphaPath = U.GetEasedValue(0.0, 1.0, 1.0, "sineInOut", 1.0)
-- Returns ~60 values (1 second at 60 FPS)
```
