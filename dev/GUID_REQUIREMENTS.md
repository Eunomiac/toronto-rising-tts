# GUID Requirements for Testing

This document lists all GUIDs that need to be filled in from your actual TTS instance to fully test the module.

## Current Status

### ✅ Already Filled (No Action Needed)
- **HAND Zone GUIDs**: All 6 hand zones have GUIDs filled in
  - `HAND_BLACK` = "8981a0" (Storyteller)
  - `HAND_BROWN` = "14b6cf"
  - `HAND_ORANGE` = "b9d1d9"
  - `HAND_RED` = "b13642"
  - `HAND_PINK` = "926600"
  - `HAND_PURPLE` = "e32d2c"

### ⚠️ Optional GUIDs (For Future Features)

These GUIDs are placeholders and only needed if you plan to use these features:

1. **TABLE** = `@@@@@@TABLE@@@@@@`
   - **Purpose**: Reference to the table object (if needed for positioning/calculations)
   - **How to get**: Right-click the table → Scripting → Copy GUID
   - **Required for**: Advanced table calculations (optional)

2. **PLAYER_LIGHT_BROWN** = `f251e0` ✅ (filled)
3. **PLAYER_LIGHT_ORANGE** = `d3356d` ✅ (filled)
4. **PLAYER_LIGHT_RED** = `0cd76a` ✅ (filled)
5. **PLAYER_LIGHT_PINK** = `937fac` ✅ (filled)
6. **PLAYER_LIGHT_PURPLE** = `b36dfe` ✅ (filled)
   - **Purpose**: Player-specific spotlight objects for lighting
   - **How to get**: Right-click the spotlight object → Scripting → Copy GUID
   - **Required for**: Player spotlight features (configured in lighting module)

## How to Fill GUIDs

1. **In TTS**: Right-click the object you want to get the GUID for
2. **Select**: "Scripting" from the context menu
3. **Copy**: The GUID string (6-character hex code)
4. **In Code**: Replace the placeholder in `lib/guids.ttslua`:
   ```lua
   TABLE = "your_guid_here",  -- Remove @@@@@@ markers
   ```

## Testing Requirements

### Minimum for Current Tests (TOR-3 & TOR-5)

**✅ No GUIDs required** - All current tests work without additional GUIDs:
- `testConstants()` - Tests constants structure (no GUIDs needed)
- `testState()` - Tests state management (no GUIDs needed)
- `testStatePersistence()` - Tests save/load (no GUIDs needed)

The HAND zone GUIDs are already filled, so `G.GetHandZoneGUID()` will work correctly.

### Current Tests (Lighting Module)

- **Lighting Module**: Uses `PLAYER_LIGHT_*` GUIDs (all filled)
- **Zone Module**: May need zone object GUIDs (to be determined)

## Verification

After filling GUIDs, you can verify they work by running:

```lua
lua testConstants()
```

This will check:
- ✅ All HAND zone GUIDs are present
- ✅ `G.GetHandZoneGUID()` returns valid GUIDs (not nil)
- ⚠️ Warns if any GUIDs still contain `@@@@@@` placeholders

## Notes

- GUIDs are 6-character hexadecimal strings (e.g., "8981a0")
- GUIDs are case-insensitive in TTS
- If a GUID is invalid, `getObjectFromGUID()` will return `nil`
- The test functions will warn you if placeholders are still present
