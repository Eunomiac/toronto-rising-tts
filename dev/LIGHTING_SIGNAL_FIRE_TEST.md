# Lighting & Signal Fire Sequencing Test

## Overview

The `testLightingAndSignals()` function tests:
1. **Signal Fire Positioning** - Moving signal fires on/off using partial position updates
2. **Lighting Changes** - Testing light mode transitions with smooth animations
3. **Sequencing** - Using `U.RunSequence` to chain multiple operations
4. **Lerp Animations** - Smooth position transitions using `U.setPositionSlow`
5. **Broadcasts** - Visual feedback via broadcast messages

## Partial Position Handling ✅

**Confirmed:** The test function includes a `mergePosition()` helper that properly handles partial positions.

When you specify `{y=2.5}` in `C.ObjectPositions.SIGNAL_FIRE.on`, the function:
1. Gets the current position of the object
2. Merges only the specified axis (y) with current x and z values
3. Creates a complete Vector for `U.setPositionSlow()`

**Example:**
```lua
-- Current position: {x=10, y=0, z=5}
-- Partial position: {y=2.5}
-- Result: {x=10, y=2.5, z=5}  ✅
```

This means `U.setPositionSlow()` receives a complete Vector and can properly lerp between positions.

## Test Sequence

The test runs 8 sequential steps:

1. **Initial Broadcast** - Announces test start
2. **Signal Fire ON (Brown)** - Tests single fire activation
3. **Signal Fire OFF (Brown)** - Tests single fire deactivation
4. **All Signal Fires ON** - Tests batch activation of all player fires
5. **Lighting BRIGHT** - Changes main light to bright mode (2s transition)
6. **Lighting DIM** - Changes main light to dim mode (2s transition)
7. **All Signal Fires OFF** - Tests batch deactivation
8. **Final Summary** - Reports test results

**Total Duration:** ~15-20 seconds

## Requirements

### Signal Fires
- ✅ **GUIDs Already Filled**: All signal fire GUIDs are present in `G.GUIDS`
- **Required Tags**: None (uses GUIDs directly via `G.GetSignalFireGUID()`)
- **Object Setup**: Signal fires must exist in TTS with the GUIDs specified in guids library

### Lighting
- **GUID-Based**: Player lights are found by GUID (not tags)
- **GUIDs**: `G.GUIDS.PLAYER_LIGHT_BROWN`, `G.GUIDS.PLAYER_LIGHT_ORANGE`, etc.
- **Light Modes**: Each player light has `"OFF"` and `"STANDARD"` modes defined in `L.LIGHTMODES`

### Lighting Module Setup

The lighting module has player lights configured in `core/lighting.ttslua`:

```lua
L.LIGHTMODES = {
    playerLightBrown = {
        guid = G.GUIDS.PLAYER_LIGHT_BROWN,
        isPlayerLight = true,
        default = "OFF",
        OFF = {
            enabled = false,
            rotation = Vector(0, -72, 0),
            position = Vector(-36.12, 0, -110),
            range = 40,
            angle = 0,
            intensity = 0
        },
        STANDARD = {
            enabled = true,
            rotation = Vector(0, -72, 60),
            position = Vector(-29.75, 22.6, -90),
            range = 40,
            angle = 90,
            intensity = 10
        }
    },
    -- ... similar entries for Orange, Red, Pink, Purple
}
```

**Important:** Player lights are found by GUID, so no tags are required. The GUIDs must match the actual TTS object GUIDs.

## How to Run

```lua
lua testLightingAndSignals()
```

## What to Watch For

1. **Broadcast Messages** - Colored messages appear in chat before each test step
2. **Signal Fire Movement** - Fires should smoothly move up (y=2.5) when ON and down (y=-25) when OFF
3. **Player Light Changes** - Player lights should transition smoothly between OFF and STANDARD modes
4. **Console Output** - Test results printed with ✓/✗ indicators
5. **Test Summary** - Final pass/fail count at the end

## Expected Results

- ✅ Signal fires move smoothly (lerp animation)
- ✅ Partial positions work correctly (only Y axis changes)
- ✅ Player light transitions are smooth (2 second lerp)
- ✅ Sequencing works (steps execute in order with proper delays)
- ✅ Broadcasts appear before each step
- ✅ GUID-based light lookup works correctly

## Troubleshooting

### Signal Fires Don't Move
- Check that GUIDs in `G.GUIDS` match actual TTS object GUIDs
- Verify objects exist in the game
- Check console for error messages

### Player Lights Don't Change
- Verify GUIDs in `G.GUIDS` match actual TTS object GUIDs (PLAYER_LIGHT_BROWN, etc.)
- Check that `L.LIGHTMODES` has entries for all player lights (playerLightBrown, etc.)
- Ensure each light mode has "OFF" and "STANDARD" modes defined
- Ensure lighting module is loaded (check for errors on game load)

### Sequence Doesn't Complete
- Check console for errors
- Verify `U.RunSequence` is working (requires coroutine support)
- Check that `startLuaCoroutine(Global, "CheckCoroutine")` is called in global.ttslua

## Test Output

The test will output:
- Console messages for each step
- Broadcast messages to all players
- Test results (✓ PASS / ✗ FAIL)
- Final summary with pass/fail counts
- Logged results to `debug_logs/test_results.txt`
