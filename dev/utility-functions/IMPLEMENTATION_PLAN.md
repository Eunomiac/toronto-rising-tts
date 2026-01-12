# Implementation Plan: Enhanced Lerping with Eases

## Overview

This plan implements a unified lerping system that supports:
- Pre-computed paths for efficiency
- Multiple easing functions with intensity control
- Cylindrical and spherical coordinate systems
- Object references (resolved at execution time)
- Frame-by-frame output (60 FPS = ~0.0167s per frame)

## Key Design Decisions

1. **Frame-based output**: Remove `updateFrequency` parameter - always output at 60 FPS (~0.0167s per frame)
2. **Unified U.Lerp**: Accept either traditional `(start, end)` OR pre-computed path
3. **Object resolution**: Defer path computation when Objects are present (resolve at execution time)
4. **Two functions**: `U.GetEasedValue` (simple types) and `U.GetEasedPath` (positions/rotations)

## Implementation Steps

### Phase 1: Core Easing Functions

#### 1.1 Implement Easing Math Functions

**Location**: `lib/util.ttslua` (new section: EASING FUNCTIONS)

**Functions to implement:**
```lua
-- Internal easing function that applies intensity multiplier
local function applyEase(t, easeType, intensity)
  -- t: normalized time (0 to 1)
  -- easeType: "linear", "powerIn", "powerOut", etc.
  -- intensity: multiplier (0 = linear, 1 = standard, >1 = dramatic)

  -- If intensity is 0, return linear
  if intensity == 0 then return t end

  -- Apply base easing function
  local eased = baseEaseFunction(t, easeType)

  -- Apply intensity multiplier (interpolate between linear and eased)
  return t + (eased - t) * intensity
end

-- Base easing functions (return eased t value 0-1)
local function easeLinear(t) return t end
local function easePowerIn(t, power) return math.pow(t, power) end
local function easePowerOut(t, power) return 1 - math.pow(1 - t, power) end
local function easePowerInOut(t, power)
  -- ... implementation
end
local function easeSineIn(t) return 1 - math.cos(t * math.pi / 2) end
local function easeSineOut(t) return math.sin(t * math.pi / 2) end
local function easeSineInOut(t) return -(math.cos(math.pi * t) - 1) / 2 end
local function easeBack(t)
  -- Overshoot easing (uses intensity for overshoot amount)
  -- ... implementation
end
local function easeBounce(t)
  -- Bounce easing (uses intensity for bounce count)
  -- ... implementation
end
```

**Ease types to support:**
- `linear`: No easing
- `powerIn`: Accelerate (intensity = power, default 2)
- `powerOut`: Decelerate (intensity = power, default 2)
- `powerInOut`: Accelerate then decelerate (intensity = power, default 2)
- `sineIn`: Smooth acceleration
- `sineOut`: Smooth deceleration
- `sineInOut`: Smooth acceleration/deceleration
- `back`: Overshoot (intensity controls overshoot distance)
- `bounce`: Bounce effect (intensity controls bounce count)

**Implementation notes:**
- Intensity multiplier: `0.0` = linear, `1.0` = standard curve, `>1.0` = more dramatic
- For power eases: `intensity` becomes the power exponent (2 = quadratic, 3 = cubic)
- For back: `intensity` controls overshoot distance (1.0 = standard ~0.5 units)
- For bounce: `intensity` controls number of bounces (1.0 = 1 bounce)

---

### Phase 2: Path Generation Functions

#### 2.1 Implement `U.GetEasedValue`

**Location**: `lib/util.ttslua` (ANIMATION & INTERPOLATION UTILITIES section)

**Signature:**
```lua
U.GetEasedValue(
  start: number | Color,
  end: number | Color,
  duration: number,
  ease?: string = "sineInOut",
  easeIntensity?: number = 1
) -> {number | Color}
```

**Implementation:**
1. Calculate number of frames: `math.ceil(duration * 60)` (60 FPS)
2. For each frame `i` from `0` to `frames`:
   - Calculate normalized time: `t = i / frames`
   - Apply easing: `tEased = applyEase(t, ease, easeIntensity)`
   - Interpolate value: `value = lerp(start, end, tEased)`
   - Add to result table
3. Return table of values

**Special handling:**
- Colors: Use `Color:lerp()` method
- Numbers: Linear interpolation
- Ensure final frame is exactly `end` value

---

#### 2.2 Implement `U.GetEasedPath`

**Location**: `lib/util.ttslua` (ANIMATION & INTERPOLATION UTILITIES section)

**Signature:**
```lua
U.GetEasedPath(
  start: PositionOrientationData,
  end: PositionOrientationData,
  duration: number,
  ease?: string = "sineInOut",
  easeIntensity?: number = 1,
  coordinateSystem?: string = "xy"
) -> {PositionOrientationData} | "DEFER"
```

**Key behavior:**
- If `start` or `end` contains Object references → return `"DEFER"` (special marker)
- Otherwise, pre-compute entire path and return table

**Implementation steps:**

1. **Check for Object references:**
```lua
local hasObjects = false
if U.isGameObject(start.position) or U.isGameObject(end.position) then
  hasObjects = true
end
if U.isGameObject(start.orientation) or U.isGameObject(end.orientation) then
  hasObjects = true
end
if hasObjects then
  return "DEFER"  -- Signal to defer computation
end
```

2. **Resolve positions to XYZ:**
   - Extract position from start/end
   - If coordinateSystem != "xy", convert to XYZ:
     - Cylindrical: `x = center.x + radius * sin(angle)`, `z = center.z + radius * cos(angle)`, `y = center.y + height`
     - Spherical: Convert using standard formulas
   - Store resolved XYZ positions

3. **Resolve orientations:**
   - If Vector: use directly
   - If Object: calculate look-at rotation (defer if Object present)

4. **Generate path:**
   - Calculate frames: `math.ceil(duration * 60)`
   - For each frame:
     - Apply easing to get `tEased`
     - Interpolate position: `pos = lerp(startPos, endPos, tEased)`
     - Interpolate orientation: `rot = lerp(startRot, endRot, tEased)` (handle rotation wrapping)
     - Create `PositionOrientationData` entry
   - Return table

**Coordinate conversion helpers:**
```lua
local function cylindricalToXYZ(cylindrical, center)
  local angleRad = math.rad(cylindrical.angle)
  return Vector(
    center.x + cylindrical.radius * math.sin(angleRad),
    center.y + cylindrical.height,
    center.z + cylindrical.radius * math.cos(angleRad)
  )
end

local function sphericalToXYZ(spherical, center)
  -- Standard spherical to Cartesian conversion
  -- ... implementation
end
```

---

### Phase 3: Enhanced U.Lerp Function

#### 3.1 Modify `U.Lerp` to Accept Paths

**Location**: `lib/util.ttslua` (existing `U.Lerp` function)

**New signature:**
```lua
U.Lerp(
  setFunc: function,
  paramStart: number | Vector | Color | {PositionOrientationData} | PositionOrientationData,
  paramEnd?: number | Vector | Color | PositionOrientationData,
  duration?: number,
  isRotationLerp?: boolean,
  easing?: string
) -> number
```

**Behavior:**
- If `paramStart` is a table (array of `PositionOrientationData`): Execute pre-computed path
- If `paramStart` is `PositionOrientationData` and `paramEnd` is `PositionOrientationData`: Generate path on-the-fly (with Object resolution)
- Otherwise: Use existing behavior (backward compatible)

**Implementation:**

```lua
function U.Lerp(setFunc, paramStart, paramEnd, duration, isRotationLerp, easing)
  -- Check if paramStart is a pre-computed path
  if U.Type(paramStart) == "table" and #paramStart > 0 then
    -- Check if it's a path (has PositionOrientationData structure)
    if paramStart[1].position ~= nil or paramStart[1].orientation ~= nil then
      return U.LerpPath(paramStart, setFunc)
    end
  end

  -- Check if paramStart is PositionOrientationData (new path-based lerp)
  if U.Type(paramStart) == "table" and (paramStart.position ~= nil or paramStart.orientation ~= nil) then
    if paramEnd == nil or U.Type(paramEnd) ~= "table" then
      U.error("U.Lerp", "PositionOrientationData requires paramEnd to also be PositionOrientationData")
    end

    -- Generate path (may return "DEFER" if Objects present)
    local path = U.GetEasedPath(paramStart, paramEnd, duration or 0.5, easing or "sineInOut", 1.0, "xy")

    if path == "DEFER" then
      -- Defer path generation - resolve Objects at execution time
      return U.LerpDeferred(paramStart, paramEnd, duration or 0.5, easing or "sineInOut", 1.0, "xy", setFunc)
    else
      -- Use pre-computed path
      return U.LerpPath(path, setFunc)
    end
  end

  -- Existing behavior (backward compatible)
  -- ... existing U.Lerp implementation
end
```

---

#### 3.2 Implement `U.LerpPath`

**Location**: `lib/util.ttslua` (ANIMATION & INTERPOLATION UTILITIES section)

**Signature:**
```lua
U.LerpPath(
  path: {PositionOrientationData},
  setFunc: function
) -> number
```

**Implementation:**
1. Calculate duration from path length: `duration = #path / 60` (60 FPS)
2. Create coroutine that:
   - Iterates through path table
   - Calls `setFunc(step)` for each step
   - Yields each frame (`coroutine.yield(0)`)
3. Start coroutine: `startLuaCoroutine(self, "LerpPathCoroutine")`
4. Return duration

**Coroutine:**
```lua
function LerpPathCoroutine()
  for i = 1, #path do
    setFunc(path[i])
    coroutine.yield(0)  -- One frame per step
  end
  return 1
end
```

---

#### 3.3 Implement `U.LerpDeferred`

**Location**: `lib/util.ttslua` (ANIMATION & INTERPOLATION UTILITIES section)

**Purpose**: Handle paths with Object references (resolve at execution time)

**Signature:**
```lua
U.LerpDeferred(
  start: PositionOrientationData,
  end: PositionOrientationData,
  duration: number,
  ease: string,
  easeIntensity: number,
  coordinateSystem: string,
  setFunc: function
) -> number
```

**Implementation:**
1. Resolve Object references to actual positions/rotations:
   - If `start.position` is Object: `startPos = start.position.getPosition()`
   - If `end.position` is Object: `endPos = end.position.getPosition()`
   - If `start.orientation` is Object: Calculate look-at rotation
   - If `end.orientation` is Object: Calculate look-at rotation
2. Generate path on-the-fly (same as `U.GetEasedPath` but inline)
3. Execute path using same logic as `U.LerpPath`

**Note**: This is less efficient than pre-computed paths, but necessary for dynamic Object references.

---

### Phase 4: Helper Functions

#### 4.1 Object Resolution Helpers

**Location**: `lib/util.ttslua` (ANIMATION & INTERPOLATION UTILITIES section)

```lua
-- Resolve position from PositionOrientationData (handles Objects)
local function resolvePosition(data, coordinateSystem, center)
  if data.position == nil then return nil end

  if U.isGameObject(data.position) then
    return data.position.getPosition()
  elseif coordinateSystem == "cylindrical" then
    return cylindricalToXYZ(data.position, center or Vector(0,0,0))
  elseif coordinateSystem == "spherical" then
    return sphericalToXYZ(data.position, center or Vector(0,0,0))
  else
    return Vector(data.position)
  end
end

-- Resolve orientation from PositionOrientationData (handles Objects)
local function resolveOrientation(data, targetPos)
  if data.orientation == nil then return nil end

  if U.isGameObject(data.orientation) then
    -- Calculate look-at rotation
    return calculateLookAtRotation(currentPos, data.orientation.getPosition())
  else
    return Vector(data.orientation)
  end
end

-- Calculate rotation to face a target position
local function calculateLookAtRotation(from, to)
  local direction = to:subtract(from):normalized()
  -- Convert direction vector to rotation angles
  -- ... implementation
end
```

---

#### 4.2 Rotation Interpolation Helper

**Location**: `lib/util.ttslua` (ANIMATION & INTERPOLATION UTILITIES section)

```lua
-- Interpolate rotation with shortest path wrapping
local function lerpRotation(start, finish, t)
  local function parseAngleLerp(startAngle, finishAngle)
    if math.abs(finishAngle - startAngle) > math.abs(finishAngle + 360 - startAngle) then
      finishAngle = finishAngle + 360
    end
    if math.abs(finishAngle - startAngle) > math.abs(finishAngle - 360 - startAngle) then
      finishAngle = finishAngle - 360
    end
    return finishAngle
  end

  local adjustedFinish = Vector(
    parseAngleLerp(start.x, finish.x),
    parseAngleLerp(start.y, finish.y),
    parseAngleLerp(start.z, finish.z)
  )

  return start:lerp(adjustedFinish, t)
end
```

---

### Phase 5: Update Existing Functions

#### 5.1 Update `U.setPositionSlow`, `U.setRotationSlow`, `U.setScaleSlow`

**Location**: `lib/util.ttslua` (existing functions)

**Changes:**
- These can now optionally use pre-computed paths
- Keep existing behavior as default (backward compatible)
- Add optional parameter to accept pre-computed path

**Example:**
```lua
function U.setPositionSlow(obj, position, duration, easing, isColliding)
  -- If position is a path table, use it directly
  if U.Type(position) == "table" and #position > 0 and position[1].position ~= nil then
    return U.LerpPath(position, function(step)
      if step.position then
        obj.setPositionSmooth(step.position, isColliding or false, false)
      end
    end)
  end

  -- Existing behavior
  return U.Lerp(function(pos) obj.setPositionSmooth(pos, isColliding or false, false) end,
                obj.getPosition(), position, duration, false, easing)
end
```

---

### Phase 6: Testing

#### 6.1 Test Cases

1. **Basic path generation:**
   - Simple position lerp (XYZ)
   - Position + orientation lerp
   - Cylindrical coordinate lerp
   - Spherical coordinate lerp

2. **Easing functions:**
   - All ease types with various intensities
   - Verify intensity multiplier works correctly
   - Verify frame count matches duration

3. **Object references:**
   - Path with Object in start position
   - Path with Object in end position
   - Path with Object in orientation
   - Verify Objects are resolved at execution time

4. **U.Lerp compatibility:**
   - Traditional usage (backward compatible)
   - Pre-computed path usage
   - PositionOrientationData usage
   - Verify all return duration correctly

5. **Integration:**
   - Use with `U.RunSequence` (parallel lerps)
   - Use with existing `U.setPositionSlow` etc.
   - Verify frame timing (60 FPS)

---

## Implementation Order

1. **Phase 1**: Core easing functions (foundation)
2. **Phase 2**: Path generation (`U.GetEasedValue`, `U.GetEasedPath`)
3. **Phase 4**: Helper functions (coordinate conversion, object resolution)
4. **Phase 3**: Enhanced `U.Lerp` and `U.LerpPath`
5. **Phase 5**: Update existing functions
6. **Phase 6**: Testing

---

## Backward Compatibility

- Existing `U.Lerp` calls continue to work unchanged
- `U.setPositionSlow`, `U.setRotationSlow`, `U.setScaleSlow` maintain existing behavior
- New functionality is opt-in (use new parameters/structures)

---

## Performance Considerations

- **Pre-computed paths**: Memory usage ~500 entries for 5-second animation (acceptable)
- **Frame-based**: Always 60 FPS (~0.0167s per frame) - consistent timing
- **Object resolution**: Deferred paths are less efficient but necessary for dynamic references
- **Caching**: Paths can be cached and reused for repeated animations

---

## Documentation Updates

1. Update `dev/AVAILABLE_FUNCTIONS.md` with new functions
2. Update `dev/utility-functions/More Robust Lerping with Eases.md` with final API
3. Add usage examples to function JSDoc comments
4. Document easing intensity behavior clearly
