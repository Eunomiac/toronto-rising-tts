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

**Problem:** Some paths still appear to behave as if angles are being wrapped, preventing multi-revolution rotations.

**Expected Behavior (Simplified):**
- Raw angle values are preserved end-to-end (no wrapping or bounding).
- `0° → +720°` rotates two full revolutions.
- `-500° → +300°` rotates 800° total.

**Current Approach (Simplified):**
- **No wrapping** in coordinate conversion or interpolation.
- **Default interpolation mode is direct** (start → end with raw angles).
- **Shortest path is optional** via `angleMode = "shortest"` in position data.
- **String end angles** (e.g., `"+720"`, `"-90"`) always force direct rotation.

**Location:**
- `lib/util.ttslua` - `U.GetEasedPath()` and `U.LerpDeferred()` (angle interpolation)
- `core/debug.ttslua` - `resolveTestData()` (parsing `"+X"`/`"-X"` strings)

**Status:** **NEEDS VERIFICATION** - Logic updated, but must validate against ORBITING_LIGHT and CYLINDRICAL_SPIRAL tests.

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

## Issue 4: Rotation Direction - Optional Shortest Path

**Problem:** Some rotations should use the shortest path, but others should follow the direct raw angle delta.

**Expected Behavior (Simplified):**
- **Direct by default:** start → end uses raw angles (no wrapping).
- **Shortest when requested:** normalize delta to -180..180 when `angleMode = "shortest"`.
- **Forced direction strings:** `"+720"`/`"-90"` always rotate in that direction.

**Location:**
- `lib/util.ttslua` - `U.GetEasedPath()` and `U.LerpDeferred()` (angle interpolation)
- `core/debug.ttslua` - `resolveTestData()` (angle string parsing)

**Status:** **NEEDS VERIFICATION** - Validate `angleMode` for both cylindrical and spherical paths.

---

## Central Feature: Smart Angle Interpolation System (Simplified)

**Status:** **IN PROGRESS** - Unified angle interpolation is now centralized and DRY.

**Specification:**

### Start Angle
- Always a **number** (absolute angle in degrees).

### End Angle - Number (Default Behavior)
- Interpolates directly from start → end with raw angle values.
- No wrapping or bounding is applied.

### End Angle - Number (Shortest Path Mode)
- If `angleMode = "shortest"`, normalize delta to -180..180.
- Use only when shortest-path behavior is desired.

### End Angle - String (with "+" or "-" prefix)
- **Force rotation direction** based on sign.
- **"+" prefix:** Positive direction (increasing angle).
- **"-" prefix:** Negative direction (decreasing angle).
- Always treated as direct rotation (no shortest normalization).

**Implementation Requirements:**
1. Use a shared angle interpolation helper in `U.GetEasedPath()` and `U.LerpDeferred()`.
2. Keep coordinate conversions centralized (no debug-side reimplementation).
3. Apply to both cylindrical and spherical coordinate systems (`angle` field).

---

**Last Updated:** After simplifying angle interpolation and removing wrapping
