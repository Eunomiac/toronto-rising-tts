# VTM5E Module - Testing Guide

This document outlines comprehensive tests for the VTM5E Tabletop Simulator module. All test functions are available via the TTS console using the `lua` command.

## Quick Start

1. Open TTS and load your mod
2. Press `~` (tilde) to open the console
3. Type `lua debugHelp()` and press Enter to see all available commands
4. Run individual tests as described below

## Available Test Commands

All test functions are exposed globally and can be called from the TTS console:

```
lua testState()              -- Test state management
lua testScenes()             -- Test scene system
lua debugHelp()              -- Show all commands
```

---

## Test Categories

### 1. State Management Tests

#### Basic State Operations
```
lua testState()
```
**What it tests:**
- Setting and getting simple state values
- Nested state access (e.g., `players.Red.hunger`)
- Handling non-existent keys (should return nil)
- Current phase access

**Expected Results:**
- All set/get operations should work correctly
- Nested paths should create intermediate tables automatically
- Non-existent keys should return nil without errors

#### State Persistence
```
lua testStatePersistence()
```
**What it tests:**
- JSON encoding of game state
- JSON decoding of saved data
- Values preserved correctly through save/load cycle

**Expected Results:**
- State should encode to JSON without errors
- Decoded state should match original values
- Nested structures should be preserved

**Visual Check:**
- After running, verify the console shows matching values before/after save

---

### 2. Scene Management Tests

#### Basic Scene Loading
```
lua testScenes()
```
**What it tests:**
- Listing available scenes
- Loading scenes instantly
- Getting current scene
- Handling invalid scene names
- Smooth scene transitions (fade)

**Expected Results:**
- Should list all 8 scene presets (default, elysium, alley, etc.)
- Valid scenes should load successfully
- Invalid scenes should fail gracefully with error message
- Scene transitions should start smoothly

**Visual Check:**
- Lighting should change when scenes load
- Scene name should appear in admin panel
- Transitions should be smooth (2 seconds for fade)

#### Test All Scene Presets
```
lua testAllScenes()
```
**What it tests:**
- All scene presets load without errors
- Each scene applies its lighting correctly

**Expected Results:**
- All scenes should load successfully
- Each scene should have distinct lighting characteristics

**Visual Check:**
- Watch lighting change as each scene loads
- Verify each scene has the expected atmosphere (bright for elysium, dark for alley, etc.)

#### Quick Scene Change
```
lua changeScene("elysium")
lua changeScene("tension")
lua changeScene("alley")
```
**What it tests:**
- Quick scene switching without full test suite

**Visual Check:**
- Immediate lighting change
- Admin panel scene display updates

---

### 3. Zone Management Tests

#### Zone Activation/Deactivation
```
lua testZones()
```
**What it tests:**
- Zone state tracking
- Activating zones (enables `onObjectEnterZone` events)
- Deactivating zones (disables zone events)
- Visual show/hide of zones

**Expected Results:**
- Zone state should toggle correctly
- Zone events should be enabled/disabled accordingly
- Zones should move above/below table when shown/hidden

**Visual Check:**
- Scripting zones should move when hidden/shown
- Zone state button in debug panel should reflect status
- Objects entering zones should trigger events only when active

#### Zone Status Check
```
lua showZones()
```
**What it tests:**
- Current zone state retrieval

**Expected Results:**
- Should display whether zones are locked (inactive) or active

---

### 4. Main Module Tests

#### Main Module Functions
```
lua testMain()
```
**What it tests:**
- `M.forPlayers()` iteration pattern
- Phase management
- Phase advancement

**Expected Results:**
- Should iterate over all connected players
- Should display current phase
- Should successfully advance phase

**Visual Check:**
- Admin panel should show updated phase after advancement
- Console should show player iteration messages

#### Quick Phase Change
```
lua setPhase("PLAY")
lua setPhase("COMBAT")
```
**What it tests:**
- Quick phase switching

**Visual Check:**
- Admin panel phase display should update
- Phase-specific UI elements may change visibility

---

### 5. UI Tests

#### UI Display Updates
```
lua testUI()
```
**What it tests:**
- Phase display updates
- Scene display updates
- Player stat updates (hunger, willpower, health)

**Expected Results:**
- UI elements should update to reflect current state
- Player stats should appear correctly in player HUDs

**Visual Check:**
- **Admin Panel (Storyteller/Host only):**
  - "Current Phase" display should match actual phase
  - "Current Scene" display should match actual scene
- **Player HUDs (visible to each player):**
  - Hunger, Willpower, Health values should update
  - Values should match game state

#### Manual UI Updates
After changing state, manually trigger UI update:
```
lua setHunger("Red", 3)
```
Then verify the Red player's HUD shows hunger: 3

---

### 6. Utility Functions Tests

#### Core Utilities
```
lua testUtilities()
```
**What it tests:**
- `U.Type()` - Type checking
- `U.map()` - Array transformation
- `U.filter()` - Array filtering

**Expected Results:**
- Type checks should correctly identify table, string, number
- Map should transform array correctly
- Filter should return only matching elements

**Note:** These are unit tests - results appear in console only.

---

### 7. Integration Tests

#### Full System Integration
```
lua testIntegration()
```
**What it tests:**
- All modules working together
- State → Scene → Phase → UI flow
- End-to-end functionality

**Expected Results:**
- All steps should complete without errors
- Final state should reflect all changes
- UI should update correctly

**Visual Check:**
- Watch the sequence of changes
- Verify final state matches expected values
- Check UI displays match state

---

### 8. State Inspection

#### View Current State
```
lua showState()
```
**What it displays:**
- Complete game state as formatted JSON
- Useful for debugging state issues

#### View Current Scene
```
lua showScene()
```
**What it displays:**
- Current scene name
- Scene preset data (lighting, lights, music, description)

#### View Zone Status
```
lua showZones()
```
**What it displays:**
- Whether zones are locked (inactive) or active

---

## Quick Reference Commands

### State Manipulation
```
lua setHunger("Red", 3)          -- Set Red player hunger to 3
lua setHunger("Blue", 0)         -- Set Blue player hunger to 0
```

### Scene Control
```
lua changeScene("elysium")       -- Load Elysium scene
lua changeScene("tension")       -- Load Tension scene
lua changeScene("alley")         -- Load Alley scene
```

### Phase Control
```
lua setPhase("PLAY")             -- Set phase to Play
lua setPhase("COMBAT")           -- Set phase to Combat
lua setPhase("INIT")             -- Set phase to Initialization
```

### Inspection
```
lua showState()                  -- View full game state
lua showScene()                  -- View current scene info
lua showZones()                  -- View zone status
lua debugHelp()                  -- Show all commands
```

---

## Manual Testing Checklist

### Module Loading
- [ ] Game loads without Lua errors
- [ ] All modules initialize correctly (check console output)
- [ ] UI loads and displays correctly
- [ ] Initial state is set to defaults

### State Management
- [ ] Game state persists through save/load
- [ ] Nested state access works (e.g., `players.Red.hunger`)
- [ ] State values can be modified and retrieved

### Scene System
- [ ] All 8 scene presets load correctly
- [ ] Lighting changes appropriately for each scene
- [ ] Scene transitions are smooth (fadeToScene)
- [ ] Current scene is saved in game state
- [ ] Scene restores on game load

### Zone Management
- [ ] Zones can be activated/deactivated
- [ ] Zone events fire correctly when active
- [ ] Zone events don't fire when deactivated
- [ ] Zones can be shown/hidden visually
- [ ] Zone state persists through save/load

### UI Functionality
- [ ] Admin panel visible only to Host/Black player
- [ ] Player HUDs visible only to respective players
- [ ] Toggle panels work (collapse/expand)
- [ ] Scene buttons change scenes correctly
- [ ] Phase buttons advance phase correctly
- [ ] Player stats update correctly in UI
- [ ] Phase/Scene displays update correctly

### Player Stats
- [ ] Hunger values display correctly (0-5)
- [ ] Willpower values display correctly (0-5)
- [ ] Health values display correctly (0-7)
- [ ] Values update when changed via `setHunger()`
- [ ] Values persist through save/load

### Error Handling
- [ ] Invalid scene names show error messages
- [ ] Invalid phase names show error messages
- [ ] Missing state keys return nil (no crashes)
- [ ] Console errors are informative

---

## Testing Workflow

### Initial Load Test
1. Load the mod in TTS
2. Check console for any initialization errors
3. Run `lua debugHelp()` to verify debug module loaded
4. Run `lua testState()` to verify basic functionality

### Functional Tests
1. Run each test category in order:
   ```
   lua testState()
   lua testScenes()
   lua testZones()
   lua testMain()
   lua testUI()
   ```
2. Visually verify results in-game
3. Check console output for any errors

### Integration Test
1. Run `lua testIntegration()` for full system test
2. Verify all modules work together
3. Check UI updates correctly
4. Save and reload game, verify state persists

### Manual Verification
1. Use quick setters to change values
2. Verify UI updates immediately
3. Save game, reload, verify persistence
4. Test edge cases (max values, invalid inputs, etc.)

---

## Common Issues and Solutions

### Issue: UI doesn't load
**Solution:** Verify `HUD_XML_PLACEHOLDER` in `global.ttslua` contains the actual XML content from `ui/hud.xml`

### Issue: Test functions not found
**Solution:** Ensure `core/debug.ttslua` is required in `global.ttslua` and the module loaded correctly

### Issue: Scene changes don't affect lighting
**Solution:**
- Verify lights exist in the scene with correct tags
- Check `L.LIGHTMODES` in `core/lighting.ttslua` has matching light definitions
- Verify light GUIDs in `lib/constants.ttslua` match actual light objects

### Issue: Zone events don't fire
**Solution:**
- Check zones are activated: `lua showZones()`
- Verify `ActivateZones()` is called during initialization
- Check zone event handlers are assigned: `onObjectEnterZone` should not be nil

### Issue: UI displays show wrong values
**Solution:**
- Manually trigger update: Ensure `updateUIDisplays()` is called after state changes
- Check UI element IDs match between XML and update function
- Verify player colors match (e.g., "Red" vs "red")

---

## Performance Testing

While not strictly necessary, you can test performance:

1. **Load time:** Note how long `onLoad()` takes to complete
2. **Scene transitions:** Verify smooth transitions don't cause lag
3. **UI updates:** Ensure UI updates don't cause frame drops
4. **State access:** Test nested state access performance with many players

---

## Notes

- All test functions print results to the console
- Tests that require visual verification are marked
- Some tests use `Wait.time()` for async operations - allow time to complete
- Debug module can be disabled in production by not requiring it in `global.ttslua`
- Test functions are safe to run multiple times
- State changes from tests persist until manually reset or game reloaded

---

**Last Updated:** After Phase 2 completion
**Module Version:** Development/Testing
