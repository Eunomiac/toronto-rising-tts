# Outstanding Issues - Easing and Path Generation

## Issue 1: angle2 Calibration Not Working

**Problem:** `angle2` is still calibrated such that `0` positions the light directly above the object, rather than perpendicular to its face (which should be at `0°`).

**Expected Behavior:**
- `angle2 = 0°` → perpendicular/face-on (same height as center)
- `angle2 = -90°` → directly above (center.y + radius)
- `angle2 = +90°` → directly below (center.y - radius)

**Current Behavior:**
- `angle2 = 0°` → directly above (incorrect)
- `angle2 = 90°` → perpendicular (should be at 0°)

**Location:**
- `lib/util.ttslua` - `sphericalToXYZ()` function (line ~1587)
- `lib/util.ttslua` - `U.XYZToSpherical()` function (line 130)

**Attempted Fixes:**
1. Added `+90` shift in `sphericalToXYZ()`: `local angle2Rad = math.rad(spherical.angle2 + 90)`
2. Updated `U.XYZToSpherical()` to subtract 90 from calculated angle2: `angle2 = standardAngle2 - 90`

**Status:** **STILL NOT WORKING** - The offset is not being applied correctly. The issue persists after attempted fixes.

**Root Cause Analysis Needed:**
- Verify that `sphericalToXYZ()` is correctly applying the +90 shift
- Verify that `U.XYZToSpherical()` is correctly subtracting 90 from the standard formula
- Check if there's a mismatch between how angle2 is calculated vs how it's used in conversion
- May need to review the mathematical formula itself to ensure correct calibration

---

## Issue 2: Angle Wrapping Preventing Multiple Revolutions

**Problem:** Angles above 360° are still being prematurely wrapped to 0-360 range, preventing multiple revolutions (e.g., `"+720"` only rotates 80° instead of 720°).

**Expected Behavior:**
- Start angle: `0°`, End angle: `"+720"` → Should rotate 720° (2 full revolutions)
- Start angle: `-500°`, End angle: `"+300"` → Should rotate 800° total
- Large angle deltas (> 360°) should be preserved as-is without wrapping

**Current Behavior:**
- `"+720"` appears to be wrapping to `80°` (720 mod 360 = 0, but maybe getting 80 somehow)
- Animation only completes ~90° instead of full rotation
- Large angle deltas are still being cycled/wrapped

**Location:**
- `lib/util.ttslua` - `U.GetEasedPath()` function (cylindrical and spherical coordinate interpolation)
- `lib/util.ttslua` - `U.LerpDeferred()` function (cylindrical and spherical coordinate interpolation)
- `lib/util.ttslua` - `U.XYZToCylindrical()` function (removed normalization, but issue persists)
- `lib/util.ttslua` - `U.XYZToSpherical()` function (removed normalization, but issue persists)
- `core/debug.ttslua` - `resolveTestData()` function (when parsing `"+720"` strings)

**Attempted Fixes:**
1. Removed `U.cycle()` wrapping calls from interpolation code
2. Removed angle normalization from `U.XYZToCylindrical()` and `U.XYZToSpherical()`
3. Added check to preserve large deltas (> 360°) in shortest path logic

**Status:** **STILL NOT WORKING** - Angles are still being wrapped/cycled despite attempted fixes.

**Root Cause Analysis Needed:**
- Check if `resolveTestData()` is correctly handling `"+720"` string notation
- Verify that angle deltas are being preserved through the entire interpolation pipeline
- Check if there are other places where angles are being normalized or wrapped
- May need to trace through a specific test case (e.g., ORBITING_LIGHT with `"+800"`) to find where wrapping occurs

---

## Issue 3: Light Jumps to Opposite Side on Animation Start

**Problem:** When the ORBITING_LIGHT animation begins, the light immediately jumps to the opposite side of the test object, as if instantly rotated 180° along angle2. It then only animates through a ~90° arc before stopping.

**Symptom:** Light starts at one position, then immediately jumps to the opposite side before animation begins.

**Related to:** Issue 2 - suggests the end angle is being incorrectly resolved/wrapped

**Possible Causes:**
1. Start position resolution (`overrideAngle2 = 0`) is being misinterpreted
2. End angle (`"+360"` or similar) is being wrapped incorrectly
3. Coordinate conversion when resolving "CURRENT" position is incorrect
4. The instant jump suggests a miscalculation in the initial path step

**Location:**
- `core/debug.ttslua` - `resolveTestData()` function
- `lib/util.ttslua` - `U.GetEasedPath()` when resolving "CURRENT" positions
- `lib/util.ttslua` - Coordinate conversion functions

**Test Case:** ORBITING_LIGHT test in `core/debug.ttslua`
- Start: `angle2 = 0` (should be perpendicular)
- End: `angle = "+360"` (should be 360° rotation)
- Actual: Jumps 180° and only rotates ~90°

---

## Root Causes Identified

### Issue 1 Root Cause (Under Investigation):
- Both `U.XYZToSpherical()` and `sphericalToXYZ()` have been modified, but the issue persists
- May be a mathematical formula error or mismatch between conversion functions
- Could be related to how angle2 is calculated from dy/radius vs how it's used in sin/cos
- Need to verify the coordinate system conventions are consistent

### Issue 2 Root Cause (Under Investigation):
- Normalization has been removed from conversion functions, but wrapping still occurs
- Shortest path logic has been updated to preserve large deltas, but issue persists
- May be happening in `resolveTestData()` when parsing `"+720"` strings
- Could be an issue with how relative angles are calculated and stored
- Need to trace through complete path: string → parsed value → interpolation → final angle

### Issue 3 Root Cause:
- Light jumps because start position ("CURRENT") may still be converted incorrectly (Issue 1)
- Then end angle is wrapped (Issue 2), causing incorrect path calculation
- Combined effect: wrong start position + wrapped end angle = jump to wrong side
- Resolving Issues 1 and 2 should fix this

## Next Steps

### Issue 1: angle2 Calibration
1. **Debug the offset:** Add debug logging to verify what angle2 values are being calculated and used
2. **Test coordinate conversion:** Manually test `U.XYZToSpherical()` and `sphericalToXYZ()` with known values
3. **Verify formula:** Check if the mathematical formula for angle2 conversion is correct
4. **Check coordinate system conventions:** Ensure angle2 = 0° meaning is consistent throughout

### Issue 2: Angle Wrapping
1. **Trace angle values:** Add debug logging to track angle values through the entire pipeline
2. **Check `resolveTestData()`:** Verify how `"+720"` strings are parsed and stored
3. **Verify interpolation:** Check if angle deltas are preserved during interpolation
4. **Test with known values:** Create a simple test case with explicit angle values to isolate the issue

### Issue 4: Shortest Path Rotation
1. **Verify implementation:** Confirm shortest path logic is correctly applied in all 4 locations
2. **Test edge cases:** Test with various angle combinations to ensure correct behavior
3. **Test large rotations:** Verify that angles > 360° are preserved (separate from Issue 2)

### Testing
1. **Debug logging:** Add comprehensive logging to trace angle2 and angle values through the system
2. **Isolated tests:** Create minimal test cases for each issue to isolate root causes
3. **Coordinate system validation:** Test coordinate conversions with known expected outputs
4. **Full integration test:** Run ORBITING_LIGHT test and trace through all calculations

---

## Issue 4: Rotation Direction - Shortest Path Not Always Used

**Problem:** With rotations, the direction is ambiguous. Rotating from 270° to 250° could animate the long way around (270° → 360° → 250° = +340°) or the short way (270° → 250° = -20°). The general behavior should always be "shortest path" unless explicitly a full rotation multiple.

**Expected Behavior:**
- **Shortest path by default:** 270° to 250° = -20° (not +340°)
- **Shortest path by default:** 10° to 350° = +20° (not -340°)
- **Preserve full rotations:** 0° to 720° = +720° (explicit multiple of 360)
- **Preserve full rotations:** 0° to -720° = -720° (explicit multiple of 360)

**Current Behavior:**
- After removing all wrapping/normalization, rotations always go the "positive direction" or "linear direction"
- 270° to 250° would interpolate as +340° (long way) instead of -20° (short way)
- This creates unnecessary rotation animation

**Location:**
- `lib/util.ttslua` - `U.GetEasedPath()` function (angle interpolation in cylindrical/spherical)
- `lib/util.ttslua` - `U.LerpDeferred()` function (angle interpolation when resolving Object positions)

**Solution Needed:**
1. **For absolute angles:** Always normalize to shortest path (-180° to +180°) unless delta is exactly a multiple of 360°
2. **For relative angles (e.g., "+720"):** Preserve the full rotation (already handled in `resolveTestData()`)
3. **Detection logic:** If `angleDelta` is close to ±360°, ±720°, etc. (within tolerance), preserve it; otherwise normalize to shortest path

**Current Implementation Status:**
- **`U.GetEasedPath()` - Spherical (line 1934-1950):** HAS shortest path logic, but still wraps with `U.cycle()` (line 1956)
- **`U.GetEasedPath()` - Cylindrical (line 1919-1933):** NO shortest path logic - just linear interpolation
- **`U.LerpDeferred()` - Spherical (line 2104-2119):** NO shortest path logic - just linear interpolation
- **`U.LerpDeferred()` - Cylindrical (line 2086-2102):** NO shortest path logic - just linear interpolation

**Implementation Needed:**
Apply shortest path logic to ALL angle interpolation points:
```lua
local angleDelta = endCoord.angle - startCoord.angle

-- Check if delta is close to a multiple of 360° (full rotation)
-- This preserves explicit full rotations like +720°, +1080°, etc.
local fullRotations = angleDelta / 360
local nearMultiple = math.abs(fullRotations - math.floor(fullRotations + 0.5)) < 0.01

-- If not a multiple, normalize to shortest path (-180 to +180)
if not nearMultiple then
    if angleDelta > 180 then
        angleDelta = angleDelta - 360  -- Go the other way (shorter)
    elseif angleDelta < -180 then
        angleDelta = angleDelta + 360  -- Go the other way (shorter)
    end
end

-- Then interpolate: startAngle + angleDelta * t
local interpAngle = startCoord.angle + angleDelta * tEased
-- DO NOT wrap - sin/cos handle any angle value correctly
```

**Places to Update:**
1. `U.GetEasedPath()` - Cylindrical interpolation (line ~1923)
2. `U.GetEasedPath()` - Spherical interpolation (line ~1937) - Remove `U.cycle()` call
3. `U.LerpDeferred()` - Cylindrical interpolation (line ~2092)
4. `U.LerpDeferred()` - Spherical interpolation (line ~2111)

**Reference:** User notes this is similar to behavior needed in kingsdilemma module.

---

## Central Feature: Smart Angle Interpolation System

**Status:** **TO BE IMPLEMENTED** - This is now a central feature requirement, not a future enhancement.

**Specification:**

### Start Angle
- Must always be a **number** (absolute angle in degrees)
- Direction only matters when compared to the end angle

### End Angle - Number
- Calculate full 360° revolutions between start and end
- Use shortest path for the remainder (normalized to -180° to +180° range)
- Preserve the number of full rotations
- **Examples:**
  - Start 270°, End 250° → Rotate -20° (shortest path, no full rotations)
  - Start 0°, End 720° → Rotate +720° (2 full rotations, ends at same position as start)
  - Start 10°, End 350° → Rotate -20° (shortest path: 340° difference normalized to -20°)

### End Angle - String (with "+" or "-" prefix)
- **Force rotation direction** based on sign
- **"+" prefix:** Positive direction (increasing angle)
- **"-" prefix:** Negative direction (decreasing angle)
- Calculate and preserve full 360° rotations from the offset value
- **Examples:**
  - Start 270°, End "+800" → Rotate +800° total (270° → 1070°, or normalized: 270° with 2 full rotations)
  - Start 270°, End "-20" → Rotate -20° (270° → 250°)
  - Start 0°, End "+720" → Rotate +720° (2 full rotations)
  - Start 350°, End "-20" → Rotate -20° (350° → 330°, NOT +340°)

**Implementation Requirements:**
1. Update `U.GetEasedPath()` to parse and handle angle values according to this specification
2. Update `U.LerpDeferred()` to use the same angle resolution logic
3. Update `resolveTestData()` in debug tests to match this behavior
4. Ensure full rotations are preserved and counted correctly
5. Apply to both cylindrical and spherical coordinate systems (`angle` field)
6. Potentially apply to `angle2` in spherical coordinates (future consideration)

**Use Cases:**
- Precise control over rotation direction (clockwise vs counter-clockwise)
- Multi-rotation animations (spinning objects, orbiting cameras/lights)
- Avoiding unexpected shortest-path behavior when direction matters

**Current Status:**
- Basic string parsing exists in `resolveTestData()` but doesn't fully implement this specification
- Shortest path logic exists but doesn't properly handle full rotations with number inputs
- Need to refactor angle interpolation throughout the codebase

---

**Last Updated:** After fixing shortest path logic to preserve large rotations
