# Available Functions Reference

**Purpose:** Living reference document listing all available utility functions and reusable code patterns in the VTM5E module. **ALWAYS check this document before writing new code** to avoid duplicating existing functionality.

**Status:** This document should be updated whenever new functions are added to any module.

**Last Updated:** 2026-01-01

---

## IMPORTANT: Before Writing Code

**⚠️ CRITICAL:** Before implementing any new function or writing code that performs common operations:

1. **Check this document first** - Search for existing functions that might already do what you need
2. **Check the utilities library** (`lib/util.ttslua`) - It contains 75+ functions for common operations
3. **Check other modules** - State, zones, lighting, main, and UI helpers may have relevant functions
4. **Only create new functions if no existing function meets your needs**

**Common mistakes to avoid:**

- ❌ Writing a custom `map` function when `U.map()` exists
- ❌ Writing a custom `filter` function when `U.filter()` exists
- ❌ Writing custom type checking when `U.Type()`, `U.isGameObject()`, etc. exist
- ❌ Writing custom table operations when utilities provide them
- ❌ Writing custom state access when `S.getStateVal()` / `S.setStateVal()` exist
- ❌ Writing custom zone queries when `Z.getTaggedZoneObjects()` exists

---

## 1. UTILITIES MODULE (`lib/util.ttslua`)

**Require:** `local U = require("lib.util")`

### 1.1 Table Operations

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.map(tb, func)` | Apply function to each element, return new table | `U.map({1,2,3}, function(x) return x*2 end)` |
| `U.iMap(tb, func)` | Map with index-aware function | Transform with position awareness |
| `U.filter(tb, func)` | Return elements where func returns true | `U.filter(objects, function(obj) return obj.tag == "Card" end)` |
| `U.find(tb, func)` | Return first element matching predicate | `U.find(objects, function(obj) return obj.guid == targetGuid end)` |
| `U.findIndex(tb, func)` | Return index of first matching element | Get position in list |
| `U.forEach(tb, func)` | Execute function for side effects | Iterate and call methods |
| `U.iForEach(tb, func)` | forEach with index parameter | Iterate with position |
| `U.keyMap(tb, keyFunc, valFunc)` | Transform both keys and values | Restructure table |
| `U.pluck(arr, func)` | Extract values from nested objects | Get all names from objects |
| `U.flatten(tb)` | Flatten nested table to single level | Combine arrays |
| `U.shuffle(arr)` | Randomize array in-place | Randomize player order |
| `U.concat(...)` | Concatenate multiple tables | Merge arrays |
| `U.slice(arr, iStart, iEnd)` | Extract subarray | Get subset |
| `U.merge(...)` | Deep merge multiple tables | Combine configs |
| `U.join(tb, delim)` | Join table values with delimiter | Create comma-separated string |
| `U.pop(arr)` | Remove and return last element | Queue operations |
| `U.push(elem, arr)` | Add element to end | Add to queue |
| `U.shift(arr)` | Remove and return first element | Queue operations |
| `U.unshift(elem, arr)` | Add element to beginning | Priority queue |
| `U.compact(tb)` | Remove nil/false values | Clean array |
| `U.reverse(tb)` | Reverse array in-place | Display in reverse order |
| `U.isIn(elem, tb)` | Check if element exists in table | Membership test |
| `U.invert(tb)` | Swap keys and values | Reverse lookup table |
| `U.getValues(tb)` | Extract all values | Get all entries |
| `U.getKeys(tb)` | Extract all keys | Get all identifiers |
| `U.count(T)` | Count table elements | Get length (handles nil) |
| `U.sumVals(tb)` | Sum numeric values in table | Calculate totals |

### 1.2 Type Checking & Validation

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.Type(val)` | Enhanced type checker (handles TTS Userdata) | `U.Type({}) == "table"` |
| `U.ToString(val)` | Safe string conversion (returns "NIL" for nil) | Debug output |
| `U.isGameObject(val)` | Check if value is a TTS Object | Validate object param |
| `U.isPlayer(val)` | Check if value is a TTS Player | Validate player param |
| `U.isInstance(val, super)` | Check if value is instance of type | Type inheritance check |
| `U.isArray(val)` | Check if table is array-like | Validate input format |
| `U.isFlipped(obj)` | Check if object is flipped | Orientation check |
| `U.Val(source, checkVal, testResult, errorMsg, params)` | Assert with custom error handling | Input validation |
| `U.Assert(source, val, typeOrTest, tableType, isSilent)` | Type/condition assertion | Runtime checks |
| `U.error(source, message, val)` | Error logging utility | Debugging |

### 1.3 Math & Numeric Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.pFloat(num)` | Round to 2 decimal places | Position precision |
| `U.pAngle(num, interval)` | Round angle to nearest interval (default 45°) | Snap rotations |
| `U.pRotation(rot, interval)` | Round rotation vector components | Orient objects |
| `U.round(num, sigDigits)` | Round to significant digits | Coordinate precision |
| `U.roundVector(vec, sigDigits)` | Round vector components | Position snap |
| `U.roundTableVals(tb, sigDigits)` | Round all numeric values in table | Clean data |
| `U.randBetween(min, max, isInt)` | Random number in range | Dice-like rolls |
| `U.cycle(val, min, max)` | Wrap value within range | Circular increments |

### 1.4 Object & Physics Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.findAboveObject(obj, testFunc, params)` | Physics cast upward, return matching objects | Find stacked cards |
| `U.findBelowObject(obj, testFunc, params)` | Physics cast downward | Find base object |
| `U.isObjectAbove(obj, testObj, params)` | Check if object is above another | Stack validation |
| `U.getScatterPosition(boundsOrPosOrObj, yShift, padPercentOrDiameter)` | Calculate random position within bounds | Random spawn |
| `U.getSnapPoints(board, coordsFilter, sortAxis)` | Get snap points with filtering | Board alignment |
| `U.findSnapPoint(snapPoints, pos, fuzziness)` | Find nearest snap point | Auto-align |
| `U.parsePosition(obj)` | Extract position from object/table | Position extraction |

### 1.5 Zone Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.getZoneBounds(zone)` | Get bounding box of zone | Zone size check |
| `U.isInside(zone, pos, ignoreY)` | Check if position is inside zone | Containment test |
| `U.getHandZone(color)` | Get player's hand zone | Access hand zone |

### 1.6 String & Data Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.split(inputstr, sep)` | Split string by delimiter | Parse CSV |
| `U.GetHex(color, newAlpha)` | Convert Color to hex string | UI color strings |

### 1.7 Tag Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.hasAnyTag(obj, tags)` | Check if object has any of specified tags | Tag filtering |
| `U.findTag(obj, tagList)` | Find matching tag from list | Tag matching |
| `U.findColorTag(obj)` | Extract player color from tags | Get owner color |

### 1.8 Time & Sequence Utilities (COROUTINE-BASED)

**⚠️ IMPORTANT:** These require `startLuaCoroutine(Global, "CoroutineName")` to work.

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.waitUntil(afterFunc, testRef, isForcing, maxWait, testFrequency)` | Wait until condition met, then execute | Wait for object to rest |
| `U.RunSequence(funcs, maxWait, frequency)` | Execute functions sequentially with conditions | Scene transitions |
| `U.sequence(funcs, timeDelay)` | Execute functions with fixed delays | Staggered UI updates |
| `U.waitRestingSequence(funcs, maxTime, isLoose)` | Wait for multiple objects to rest | Wait for all cards to settle |

### 1.9 Animation & Interpolation Utilities

**⚠️ IMPORTANT:** These require coroutine context to work.

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.Lerp(setFunc, paramStart, paramEnd, duration, isRotationLerp, easing)` | Interpolate value over time | Smooth position/rotation changes |
| `U.setPositionSlow(obj, position, duration, easing, isColliding)` | Animate position smoothly | Slide object |
| `U.setRotationSlow(obj, rotation, duration, easing, isColliding)` | Animate rotation smoothly | Rotate object |
| `U.setScaleSlow(obj, scale, duration, easing)` | Animate scale smoothly | Grow/shrink object |

### 1.10 Lighting Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.changeLighting(params)` | Apply global lighting changes | Scene lighting |

### 1.11 Clone & Copy Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.clone(t, isDeepCloning)` | Deep copy table (handles Vectors) | Duplicate config tables |

### 1.12 Player & Network Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.getHost()` | Get host player color | Identify game host |
| `U.getUID(length)` | Generate unique identifier | Temporary IDs |

### 1.13 UI Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.splashUIElement(elemID, duration, delay)` | Flash/highlight UI element | Draw attention |

### 1.14 Debug & Logging Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.Alert(message, color)` | Print message to all/color | Broadcast notifications |
| `U.AlertGM(message, color)` | Print message to GM only | Private GM alerts |

---

## 2. STATE MODULE (`core/state.ttslua`)

**Require:** `local S = require("core.state")`

### Core Functions for State

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `S.InitializeGameState(saved_data)` | Load or create game state | Called in `onLoad` |
| `S.GetDefaultGameState()` | Return default state structure | Initialization |
| `S.getGameState(shouldSanitize)` | Get global gameState table | Access state |
| `S.setGameState(data)` | Set entire game state | Bulk state update |
| `S.getStateVal(...)` | Get nested state value safely | `S.getStateVal("players", "Red", "hunger")` |
| `S.setStateVal(value, ...)` | Set nested state value safely | `S.setStateVal(3, "players", "Red", "hunger")` |
| `S.mergeDefaults(target, defaults)` | Merge default values into state | Ensure all keys exist |
| `S.resetGameState()` | Reset to defaults | New game |
| `S.validateState()` | Validate state structure | State integrity check |
| `S.setCurrentPhase(phase)` | Set game phase | Phase management |
| `S.isInPhase(phase)` | Check current phase | Conditional logic |

### Player-Specific Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `S.getPlayerID(playerRef)` | Get player ID from player reference | Convert Player to string |
| `S.getPlayerData(playerRef)` | Get player's state data | Access player state |
| `S.setPlayerVal(playerRef, key, value)` | Set player-specific value | `S.setPlayerVal("Red", "hunger", 3)` |
| `S.getPlayerVal(playerRef, key)` | Get player-specific value | `S.getPlayerVal("Red", "hunger")` |
| `S.mergePlayerData(statePlayerData)` | Merge player data with defaults | Player initialization |

---

## 3. ZONES MODULE (`core/zones.ttslua`)

**Require:** `local Z = require("core.zones")`

### Core Functions for Zones

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Z.onLoad()` | Initialize zones | Setup function |
| `Z.activateZones()` | Enable zone event handlers | Turn on triggers |
| `Z.deactivateZones()` | Disable zone event handlers | Turn off triggers |
| `Z.hideZones()` | Hide zones (move below table) | Visual cleanup |
| `Z.showZones()` | Show zones (move above table) | Visual display |

### Object Query Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Z.getTaggedZoneObjects(zone, tags, requireAll)` | Get objects in zone with tags | Find all cards |
| `Z.getCards(zone, tags)` | Get card objects in zone | Get cards |
| `Z.getCard(zone, tags)` | Get single card (first match) | Get top card |
| `Z.hasCard(zone)` | Check if zone has cards | Validation |
| `Z.getSnapPointsInZone(zone, object)` | Get valid snap points within zone | Alignment helper |

### Zone Management Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Z.writePosToTaggedObjectsInZone(zone, tags, mode, stateKey, stateSubKey)` | Save object positions to state | Persistence |
| `Z.onObjectEnterZone(zone, object)` | Handle object entering zone | Event handler |
| `Z.onObjectLeaveZone(zone, object)` | Handle object leaving zone | Event handler |

---

## 4. LIGHTING MODULE (`core/lighting.ttslua`)

**Require:** `local L = require("core.lighting")`

### Core Functions for Lighting

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `L.InitLights()` | Initialize lighting system | Setup function |
| `L.ResetLights()` | Reset all lights to defaults | Cleanup function |
| `L.SetLightMode(lightName, mode, player, transitionTime)` | Set light to predefined mode | Primary API |
| `L.LoadLights(lightNames, lightMode, transitionTime, playerRef)` | Apply light mode to named lights | Batch control |

---

## 5. MAIN MODULE (`core/main.ttslua`)

**Require:** `local M = require("core.main")`

### Core Functions for Main

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `M.onLoad()` | Main initialization | Setup sequence |
| `M.setupPlayers()` | Configure players | Promote, assign roles |
| `M.forPlayers(func)` | Iterate over all players | DRY pattern |
| `M.advancePhase(newPhase)` | Change game phase | Manual phase control |
| `M.syncPhase()` | Sync phase with state | Phase synchronization |
| `M.setCamera(player, cameraMode, lookAtPos)` | Set camera angle | Cinematic control |
| `M.onObjectDrop(playerColor, droppedObject, zone)` | Handle object drops | Event delegation |
| `M.onPlayerAction(playerColor, action, clickState)` | Handle player actions | Custom hotkeys |

---

## 6. UI HELPERS MODULE (`lib/ui_helpers.ttslua`)

**Require:** `local UIHelpers = require("lib.ui_helpers")` or use `UI.*` functions directly

### UI Attribute Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `UI.setAttributes(elementID, attrs)` | Set multiple attributes at once | Batch updates |
| `UIHelpers.setAttributes(elementID, attrs)` | Same as above (wrapper) | Batch updates |

### UI Toggle Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `UIHelpers.toggleXmlElement(elemID, button)` | Toggle panel visibility | Collapse/expand sections |
| `UIHelpers.showXmlElement(elemID)` | Expand panel | Show section |
| `UIHelpers.hideXmlElement(elemID)` | Collapse panel | Hide section |
| `UIHelpers.isXmlElementExpanded(elemID)` | Check if panel is expanded | Check state |

### UI Value Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `UIHelpers.setValue(elementID, value)` | Safely set UI value | Set with type conversion |
| `UIHelpers.getValue(elementID)` | Safely get UI value | Get with type conversion |

---

## 7. SCENES MODULE (`core/scenes.ttslua`)

**Require:** `local Scenes = require("core.scenes")`

### Core Functions for Scenes

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Scenes.loadScene(name)` | Load scene preset instantly | `Scenes.loadScene("elysium")` |
| `Scenes.fadeToScene(name, duration)` | Smooth transition to scene | `Scenes.fadeToScene("alley", 2.0)` |
| `Scenes.getCurrentScene()` | Get current scene name | Scene tracking |
| `Scenes.getScenePreset(name)` | Get scene preset data | Scene info |

---

## 8. CONSTANTS MODULE (`lib/constants.ttslua`)

**Require:** `local C = require("lib.constants")`

### Available Constants

- `C.PlayerColors` - Array of player colors
- `C.PlayerIDs` - Player ID mapping (real names to IDs)
- `C.PlayerData` - Static player character data (merged with state on load)
- `C.Clans` - VTM5E clan names
- `C.Disciplines` - VTM5E discipline names
- `C.Phases` - Game phase constants (SESSION_START, SCENE, DOWNTIME, COMBAT, MEMORIAM, SESSION_END)
- `C.UI_IDS` - UI element ID constants
- `C.MAX_HUNGER` - Maximum hunger value (5, VTM5E scale is 0-5)
- `C.DICE_SUCCESS_THRESHOLD` - Dice success threshold (6)
- `C.DICE_CRITICAL_SUCCESS_VALUE` - Critical success value (10)
- `C.STORYTELLER_COLOR` - Storyteller/GM player color
- `C.CameraAngles` - Camera preset positions (placeholder structure)
- `C.LightModes` - Light mode definitions (scene lighting presets)
- `C.GUIDS` - Placeholder GUIDs for TTS objects

---

## Quick Reference by Task

### Need to iterate over a table?

→ Use `U.map()`, `U.forEach()`, `U.filter()`, `U.find()`

### Need to check object types?

→ Use `U.Type()`, `U.isGameObject()`, `U.isPlayer()`, `U.isArray()`

### Need to access game state?

→ Use `S.getStateVal()`, `S.setStateVal()`, `S.getPlayerVal()`, `S.setPlayerVal()`

### Need to query objects in zones?

→ Use `Z.getTaggedZoneObjects()`, `Z.getCards()`, `Z.getCard()`

### Need to change lighting?

→ Use `L.SetLightMode()`, `U.changeLighting()`

### Need to animate objects?

→ Use `U.setPositionSlow()`, `U.setRotationSlow()`, `U.setScaleSlow()`, `U.Lerp()`

### Need to wait for conditions?

→ Use `U.waitUntil()`, `U.RunSequence()`, `U.sequence()`

### Need to manipulate UI?

→ Use `UIHelpers.toggleXmlElement()`, `UI.setAttributes()`, `U.splashUIElement()`

### Need to work with players?

→ Use `M.forPlayers()`, `U.getHost()`, `S.getPlayerData()`

### Need to work with zones?

→ Use `Z.getTaggedZoneObjects()`, `U.getZoneBounds()`, `U.isInside()`, `U.getHandZone()`

### Need to work with tags?

→ Use `U.hasAnyTag()`, `U.findTag()`, `U.findColorTag()`

### Need to work with math/numbers?

→ Use `U.round()`, `U.pFloat()`, `U.pAngle()`, `U.randBetween()`, `U.cycle()`

### Need to work with strings?

→ Use `U.split()`, `U.join()`, `U.ToString()`, `U.GetHex()`

### Need to work with tables?

→ Use `U.merge()`, `U.clone()`, `U.flatten()`, `U.concat()`, `U.invert()`

### Need to debug/log?

→ Use `U.Alert()`, `U.AlertGM()`, `U.error()`

---

## Maintenance

**This document must be updated when:**

- New functions are added to any module
- Functions are removed or renamed
- Function signatures change significantly
- New modules are created with reusable functions

**Update process:**

1. Add new functions to the appropriate section
2. Update the "Quick Reference by Task" section if needed
3. Update the "Last Updated" date at the top
4. Commit the changes

---

**Related Documentation:**

- `dev/EXTRACTABLE_FUNCTIONS_INDEX.md` - Historical reference of extractable functions
- `lib/util.ttslua` - Source code for utilities module
- `core/state.ttslua` - Source code for state module
- `core/zones.ttslua` - Source code for zones module
- `core/lighting.ttslua` - Source code for lighting module
- `core/main.ttslua` - Source code for main module
- `lib/ui_helpers.ttslua` - Source code for UI helpers module
