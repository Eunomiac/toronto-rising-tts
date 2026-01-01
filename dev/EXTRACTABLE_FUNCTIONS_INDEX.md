# Extractable Functions & Patterns Index

## VTM5E Module - Reference from Heritage & Kings Dilemma

**Purpose:** Catalog all reusable functions, UI templates, and patterns from both reference modules that can be extracted into the new VTM5E module. This index is organized by category for easy reference during implementation.

**Status:** Both modules verified as self-contained with correct relative paths.

---

## 1. UTILITIES (lib/util.ttslua)

**Source:** Both modules use identical `lib/utilities.ttslua` - this entire file should be extracted.

### 1.1 Table Operations

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.map(tb, func)` | Apply function to each element, return new table | Transform list of objects to GUIDs |
| `U.iMap(tb, func)` | Map with index-aware function | Transform with position awareness |
| `U.filter(tb, func)` | Return elements where func returns true | Find all objects with tag |
| `U.find(tb, func)` | Return first element matching predicate | Find object by GUID |
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
|----------|-------------|---------------|
| `U.Type(val)` | Enhanced type checker (handles TTS Userdata) | Distinguish Object vs table |
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
|----------|-------------|---------------|
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
|----------|-------------|---------------|
| `U.findAboveObject(obj, testFunc, params)` | Physics cast upward, return matching objects | Find stacked cards |
| `U.findBelowObject(obj, testFunc, params)` | Physics cast downward | Find base object |
| `U.isObjectAbove(obj, testObj, params)` | Check if object is above another | Stack validation |
| `U.getScatterPosition(boundsOrPosOrObj, yShift, padPercentOrDiameter)` | Calculate random position within bounds | Random spawn |
| `U.getSnapPoints(board, coordsFilter, sortAxis)` | Get snap points with filtering | Board alignment |
| `U.findSnapPoint(snapPoints, pos, fuzziness)` | Find nearest snap point | Auto-align |
| `U.parsePosition(obj)` | Extract position from object/table | Position extraction |

### 1.5 Zone Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.getZoneBounds(zone)` | Get bounding box of zone | Zone size check |
| `U.isInside(zone, pos, ignoreY)` | Check if position is inside zone | Containment test |
| `U.getHandZone(color)` | Get player's hand zone | Access hand zone |

### 1.6 String & Data Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.split(inputstr, sep)` | Split string by delimiter | Parse CSV |
| `U.GetHex(color, newAlpha)` | Convert Color to hex string | UI color strings |

### 1.7 Tag Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.hasAnyTag(obj, tags)` | Check if object has any of specified tags | Tag filtering |
| `U.findTag(obj, tagList)` | Find matching tag from list | Tag matching |
| `U.findColorTag(obj)` | Extract player color from tags | Get owner color |

### 1.8 Time & Sequence Utilities (COROUTINE-BASED)

| Function | Description | Dependencies | Usage Example |
|----------|-------------|--------------|---------------|
| `U.waitUntil(afterFunc, testRef, isForcing, maxWait, testFrequency)` | Wait until condition met, then execute | Requires `startLuaCoroutine` | Wait for object to rest |
| `U.RunSequence(funcs, maxWait, frequency)` | Execute functions sequentially with conditions | Uses `U.waitUntil` | Scene transitions |
| `U.sequence(funcs, timeDelay)` | Execute functions with fixed delays | Uses `Wait.time` | Staggered UI updates |
| `U.waitRestingSequence(funcs, maxTime, isLoose)` | Wait for multiple objects to rest | Uses coroutines | Wait for all cards to settle |

**Critical Notes:**

- `U.waitUntil` and `U.RunSequence` are **coroutine-based** and require `startLuaCoroutine(Global, "CheckCoroutine")`
- `testRef` can be: number (seconds), object (wait for resting), function (poll until true), or table (wait for all)
- These enable asynchronous workflows essential for smooth animations and state transitions

### 1.9 Animation & Interpolation Utilities

| Function | Description | Dependencies | Usage Example |
|----------|-------------|--------------|---------------|
| `U.Lerp(setFunc, paramStart, paramEnd, duration, isRotationLerp, easing)` | Interpolate value over time | Coroutine-based, uses `os.time()` | Smooth position/rotation changes |
| `U.setPositionSlow(obj, position, duration, easing, isColliding)` | Animate position smoothly | Uses `U.Lerp` | Slide object |
| `U.setRotationSlow(obj, rotation, duration, easing, isColliding)` | Animate rotation smoothly | Uses `U.Lerp` | Rotate object |
| `U.setScaleSlow(obj, scale, duration, easing)` | Animate scale smoothly | Uses `U.Lerp` | Grow/shrink object |

**Notes:**

- `U.Lerp` handles both numbers and Vectors/Colors
- Supports easing: `"speedUp"` accelerates, nil is linear
- Rotation lerp handles shortest path (adds/subtracts 360° as needed)
- Used in `U.RunSequence` by returning table of lerp functions for parallel animation

### 1.10 Lighting Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.changeLighting(params)` | Apply global lighting changes | Scene lighting |

### 1.11 Clone & Copy Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.clone(t, isDeepCloning)` | Deep copy table (handles Vectors) | Duplicate config tables |

### 1.12 Player & Network Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.getHost()` | Get host player color | Identify game host |
| `U.getUID(length)` | Generate unique identifier | Temporary IDs |

### 1.13 UI Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.splashUIElement(elemID, duration, delay)` | Flash/highlight UI element | Draw attention |

### 1.14 Debug & Logging Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `U.Alert(message, color)` | Print message to all/color | Broadcast notifications |
| `U.AlertGM(message, color)` | Print message to GM only | Private GM alerts |

---

## 2. LIGHTING MODULE (core/lighting.ttslua)

**Source:** `kingsdilemma/kingsdilemma/core/lighting.ttslua`

### 2.1 Core Functions

| Function | Description | Dependencies | Notes |
|----------|-------------|--------------|-------|
| `L.InitLights()` | Initialize lighting system | U, S, C, O | Sets up light objects |
| `L.ResetLights()` | Reset all lights to defaults | U, S, C, O | Cleanup function |
| `L.PrimeLights()` | Prepare lights for use | U, S, C, O | Preload states |
| `L.LoadLights(lightNames, lightMode, transitionTime, playerRef)` | Apply light mode to named lights | Uses `U.RunSequence`, `U.Lerp` | Main control function |
| `L.SetLightMode(lightName, mode, transitionTime)` | Set light to predefined mode | Uses `L.LoadLights` | Primary API |
| `L.GetLight(lightName)` | Get light object by name/tag | O (objects module) | Lookup helper |
| `L.GetAllLights(tag)` | Get all lights matching tag | O (objects module) | Batch lookup |
| `L.SetIntensity(light, value)` | Direct intensity control | Light component API | Low-level |
| `L.SetAngle(light, value)` | Direct angle control | Light component API | Low-level |
| `L.SetColor(light, color)` | Direct color control | Light component API | Low-level |
| `L.SetRange(light, value)` | Direct range control | Light component API | Low-level |
| `L.LerpEnable(light, enabled, duration)` | Animate enable/disable | Uses `U.Lerp` | Smooth toggle |
| `L.ShowArrows()` | Show light direction indicators | Helper visuals | Debug/visual aid |
| `L.HideArrows()` | Hide light direction indicators | Helper visuals | Debug/visual aid |

### 2.2 Lighting Patterns

**Light Mode System:**

- Lights are identified by tag/name (stored in constants or objects module)
- Each light has predefined modes (e.g., "off", "ambient", "momentumUp1", "player1")
- Modes define: `enabled`, `color`, `range`, `angle`, `intensity`, `rotation`, `position`
- Transitions use `U.Lerp` for smooth animations
- State is saved via `S.setStateVal("lights", lightName, mode)`

**Example Mode Structure:**

```lua
{
  off = function() return {enabled=false, color=Color.Grey, ...} end,
  ambient = function() return {enabled=true, color=Color.White, ...} end,
  -- etc.
}
```

**Recommended Extraction:**

- Core `L.SetLightMode` function and mode storage pattern
- Smooth transition logic using `U.RunSequence` + `U.Lerp`
- State persistence pattern
- **Skip:** Game-specific modes (momentumUp, resource lights) - adapt to VTM scenes

---

## 3. ZONE MODULE (core/zones.ttslua)

**Source:** `heritage/core/zones.ttslua` (most complete implementation)

### 3.1 Core Functions

| Function | Description | Dependencies | Notes |
|----------|-------------|--------------|-------|
| `Z.onLoad()` | Initialize zones | U, S, G, C | Setup function |
| `Z.updateBloodlineZones()` | Refresh zone hierarchy | U, G | Heritage-specific, adapt |
| `Z.getZoneColor(zone)` | Get player color associated with zone | U, G | Player zone lookup |
| `Z.isInOtherBloodlineZone(zone, object)` | Check if object in different zone | U, G | Zone conflict check |
| `Z.isInHigherBloodlineZone(zone, object)` | Check if object in parent zone | U, G | Hierarchy check |
| `Z.getSnapPointsInZone(zone, object)` | Get valid snap points within zone | U | Alignment helper |
| `Z.activateZones()` | Enable zone event handlers | U, S | Turn on triggers |
| `Z.deactivateZones()` | Disable zone event handlers | U, S | Turn off triggers |
| `Z.hideZones()` | Hide zones (move below table) | U, S | Visual cleanup |
| `Z.showZones()` | Show zones (move above table) | U, S | Visual display |
| `Z.spawnChildZones(color, centerPos, spacing)` | Create child zones programmatically | U | Dynamic zone creation |

### 3.2 Object Query Functions

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `Z.getTaggedZoneObjects(zone, tags, requireAll)` | Get objects in zone with tags | Find all cards |
| `Z.getCards(zone, tags)` | Get card objects in zone | Get cards |
| `Z.getCard(zone, tags)` | Get single card (first match) | Get top card |
| `Z.hasCard(zone)` | Check if zone has cards | Validation |
| `Z.getAnkhs(zone, dir)` | Get ankh tokens (Heritage-specific) | Game-specific |
| `Z.getPowerTokens(zone)` | Get power tokens | Game-specific |
| `Z.getInfamyTokens(zone)` | Get infamy tokens | Game-specific |
| `Z.getBoons(zone)` | Get boon tokens | Game-specific |
| `Z.getExhaustionTokens(zone)` | Get exhaustion tokens | Game-specific |
| `Z.getTorporTokens(zone)` | Get torpor tokens | Game-specific |

### 3.3 State Query Functions

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `Z.isTorpored(zone)` | Check if player is in torpor | Status check |
| `Z.isExhausted(zone)` | Check if player is exhausted | Status check |
| `Z.isEnemy(zone)` | Check if zone represents enemy | Game logic |
| `Z.hasTitle(zone)` | Check if zone has title | Game logic |
| `Z.countPower(zone, isCountingTorpored)` | Count power tokens | Scoring |
| `Z.countInfamy(zone, isCountingTorpored)` | Count infamy tokens | Scoring |
| `Z.countBoons(zone)` | Count boon tokens | Scoring |
| `Z.scoreZone(zone)` | Calculate zone score | Scoring |
| `Z.scoreBloodline(color)` | Calculate player score | Scoring |

### 3.4 Zone Management Functions

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `Z.writePosToTaggedObjectsInZone(zone, tags, mode, stateKey, stateSubKey)` | Save object positions to state | Persistence |
| `Z.onObjectEnterZone(zone, object)` | Handle object entering zone | Event handler |
| `Z.onObjectLeaveZone(zone, object)` | Handle object leaving zone | Event handler |
| `Z.refreshUI(zone)` | Update zone UI display | UI sync |
| `Z.showScores()` | Display scores on zones | UI display |
| `Z.hideScores()` | Hide scores on zones | UI cleanup |
| `Z.showPowerOnly()` | Show only power counts | UI filter |
| `Z.showSuspicion()` | Show suspicion indicators | UI display |
| `Z.hideSuspicion()` | Hide suspicion indicators | UI cleanup |
| `Z.alignCard(zone)` | Align card in zone | Positioning |
| `Z.discardEnemyScheme(enemyScheme)` | Remove scheme card | Game action |
| `Z.discardTorporedVamps()` | Remove torpor tokens | Game action |

**Recommended Extraction:**

- Core zone activation/deactivation pattern
- `getTaggedZoneObjects` - universally useful
- `getSnapPointsInZone` - alignment helper
- `onObjectEnterZone` / `onObjectLeaveZone` event pattern
- `writePosToTaggedObjectsInZone` - state persistence pattern
- **Skip:** Game-specific scoring/counting functions (adapt for VTM needs)

---

## 4. STATE MODULE (core/state.ttslua)

**Source:** Both modules have state management. `kingsdilemma` version is more complete.

### 4.1 Core Functions

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `S.InitializeGameState(saved_data)` | Load or create game state | Called in `onLoad` |
| `S.GetDefaultGameState()` | Return default state structure | Initialization |
| `S.getGameState()` | Get global gameState table | Access state |
| `S.getStateVal(...)` | Get nested state value safely | `S.getStateVal("players", "Red", "hunger")` |
| `S.setStateVal(val, ...)` | Set nested state value safely | `S.setStateVal(3, "players", "Red", "hunger")` |
| `S.mergeDefaults(target, defaults)` | Merge default values into state | Ensure all keys exist |
| `S.resetGameState()` | Reset to defaults | New game |
| `S.setCurrentPhase(phase)` | Set game phase | Phase management |
| `S.isInPhase(phase)` | Check current phase | Conditional logic |

**Pattern:**

- Global `gameState` table (defined in global.ttslua, used in state module)
- JSON encode/decode in `onSave`/`onLoad`
- Nested access via `getStateVal`/`setStateVal` handles missing keys gracefully
- Default merging ensures new keys are added to old saves

**Recommended Extraction:**

- **All functions** - these are universally useful
- Nested get/set pattern is essential for complex state

---

## 5. UI XML TEMPLATES

**Source:** Multiple XML files in both modules

### 5.1 Heritage Module UI

**Location:** `heritage/xml/`

| File | Purpose | Extractable Elements |
|------|---------|---------------------|
| `hud.xml` | Main HUD with role-based visibility | Panel structure, button patterns, role-based visibility (`visibility="Red"` for GM) |
| `admin.xml` | GM/admin controls | Debug panel structure, toggle buttons |
| `splash.xml` | Splash/startup screen | Modal dialog pattern |
| `turn-tracker.xml` | Turn tracking UI | Sequential display pattern |
| `!heritage.xml` | Main game UI | Combined UI structure |
| `objects/charQueue.xml` | Object-specific UI | Embedded UI in objects |

### 5.2 Kings Dilemma Module UI

**Location:** `kingsdilemma/kingsdilemma/kdxml/`

| File | Purpose | Extractable Elements |
|------|---------|---------------------|
| `hud.xml` | Main HUD | Panel structure |
| `admin.xml` | Admin/debug panel | Toggle panels, debug controls |
| `debug.xml` | Debug interface | Test function buttons |
| `splash.xml` | Splash screen | Modal pattern |
| `contentFetcher.xml` | Content lookup UI | Search/display pattern |
| `lore.xml` | Lore display | Text display panels |
| `consequences.xml` | Consequence tracking | List display pattern |
| `houseSelection.xml` / `houseSelectionNew.xml` | Selection UI | Multi-choice selection pattern |
| `turn.xml` | Turn tracker | Sequential display |
| `defaults.xml` | Default UI definitions | Shared UI constants |

### 5.3 UI Patterns to Extract

**Role-Based Visibility:**

```xml
<Panel visibility="Brown">  <!-- GM only -->
<Panel visibility="Red,Blue,Yellow">  <!-- Players only -->
<Panel visibility="All">  <!-- Everyone -->
```

**Toggle Panels:**

- Collapsible sections with expand/collapse buttons
- Pattern: `toggleElem_<PanelID>` button naming convention
- Uses `UI.setAttribute(elemID, "active", "True"/"False")`

**Button Patterns:**

- Generic onClick handlers with ID pattern matching
- Example: `onClick="HUD_ButtonClick"` with `onClickParams="buttonID"`
- Allows single function to handle multiple buttons

**Modal Dialogs:**

- Splash screen patterns for queries/confirmation
- Can use TTS built-ins: `Player.showInputDialog`, `showConfirmDialog`, `showOptionsDialog`
- Custom modals via hidden panels that become visible

**Dynamic Text Updates:**

- Pattern: `UI.setAttribute("labelID", "text", newValue)`
- Used extensively for counters, labels, status displays

**Recommended Extraction:**

- Panel structure templates (header, content, footer)
- Role-based visibility patterns
- Toggle/collapse button pattern
- Modal dialog structure (if custom modals needed)
- Button ID pattern matching approach
- **Adapt:** Game-specific content (clans, resources, etc.)

---

## 6. MAIN/CORE PATTERNS (core/main.ttslua)

**Source:** Both modules - Heritage version is more manual control oriented

### 6.1 Core Functions (Heritage Pattern)

| Function | Description | Notes |
|----------|-------------|-------|
| `M.onLoad()` | Main initialization | Setup sequence |
| `M.setupPlayers()` | Configure players | Promote, assign roles |
| `M.setupInitialUI()` | Initialize UI elements | HUD setup |
| `M.forPlayers(func)` | Iterate over all players | DRY pattern |
| `M.advancePhase(newPhase)` | Change game phase | Manual phase control (preferred for VTM) |
| `M.onObjectDrop(playerColor, droppedObject, zone)` | Handle object drops | Event delegation |
| `M.onPlayerAction(playerColor, action, clickState)` | Handle player actions | Custom hotkeys |
| `M.setCamera(player, cameraMode)` | Set camera angle | Cinematic control |
| `M.showLightArrows()` / `M.hideLightArrows()` | Light debug visuals | Debug helpers |

**Recommended Pattern (VTM5E):**

- **Manual phase control** (like Heritage) - Storyteller controls flow
- **NOT automated phase management** (like Kings Dilemma director) - too rigid for VTM
- Event delegation to modules (Z, L, etc.)
- Player iteration pattern for batch operations

---

## 7. UI HELPER FUNCTIONS

**Source:** `kingsdilemma/kingsdilemma/hud.ttslua`

### 7.1 UI Utilities

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `toggleXmlElement(elemID, button)` | Toggle panel visibility | Collapse/expand sections |
| `UI.setAttributes(elementID, attrs)` | Set multiple attributes at once | Batch updates |

**Note:** `UI.setAttributes` may need to be implemented if not available:

```lua
function UI.setAttributes(elementID, attrs)
    for k, v in pairs(attrs) do
        UI.setAttribute(elementID, k, v)
    end
end
```

---

## 8. OBJECT UTILITIES

**Source:** `kingsdilemma/kingsdilemma/objects/objUtilities.ttslua`

### 8.1 Object Helpers

These are game-specific but demonstrate reusable patterns:

- Object combination/splitting logic
- Token management
- Card manipulation
- **Extract patterns, not implementations** - adapt for VTM objects (dice, tokens, cards, etc.)

---

## 9. CONSTANTS (lib/constants.ttslua)

**Source:** Both modules have constants files

### 9.1 Recommended Constants for VTM5E

| Category | Examples | Notes |
|----------|----------|-------|
| Player Colors | `C.PlayerColors = {"Brown", "Orange", "Red", "Yellow", "Green"}` | VTM5E player colors (Storyteller is Black) |
| Game Phases | `C.Phases = {INIT, SETUP, PLAY, ...}` | VTM-specific phases |
| UI Element IDs | `C.UI_IDS = {GM_PANEL = "gmControlPanel", ...}` | Consistent naming |
| Default Values | `C.DEFAULT_HUNGER = 0, C.MAX_HUNGER = 5` | Game rules |
| Camera Angles | `C.CameraAngles = {OVERVIEW = {...}, ...}` | Preset views |
| Light Presets | `C.LightModes = {BRIGHT = {...}, DIM = {...}}` | Scene lighting |

**Pattern:** All tunable values in constants file for easy modification

---

## 10. SCENE PRESET SYSTEM (Recommended Pattern)

**Source:** Guide suggestions + lighting module patterns

### 10.1 Scene Preset Structure

```lua
scenes = {
    elysium = {
        ambient = {intensity=1.0, type=1, lightColor={r=1,g=0.95,b=0.8}},
        lights = {{name="Chandelier", mode="bright"}},
        musicTrack = 2,
        background = "EveningCity"  -- if supported
    },
    alley = {
        ambient = {intensity=0.2, type=2, ...},
        lights = {{name="Streetlamp", mode="dim"}},
        musicTrack = 5
    }
}
```

### 10.2 Scene Functions

| Function | Description | Implementation |
|----------|-------------|----------------|
| `loadScene(name)` | Apply scene preset | Set lighting, lights, music |
| `fadeToScene(name, duration)` | Smooth transition | Use `U.Lerp` for ambient, `L.SetLightMode` for lights |

**Recommended:** Create `core/scenes.ttslua` module for VTM scene management

---

## EXTRACTION PRIORITY

### Priority 1 (Essential - Extract First)

1. **All of `lib/utilities.ttslua`** - Core functionality
2. **State module functions** (`getStateVal`, `setStateVal`, `InitializeGameState`)
3. **Basic lighting control** (`L.SetLightMode` pattern, without game-specific modes)
4. **Zone activation/deactivation** (without game-specific logic)
5. **Constants structure** (adapt to VTM)

### Priority 2 (Important - Extract Second)

1. **UI XML templates** (panel structure, role-based visibility)
2. **UI helper functions** (`toggleXmlElement`, `setAttributes`)
3. **Camera control patterns**
4. **Scene preset system** (lighting + music integration)
5. **Object query patterns** (getTaggedZoneObjects, etc.)

### Priority 3 (Useful - Extract As Needed)

1. Game-specific zone functions (adapt for VTM needs)
2. Animation utilities (if needed for smooth transitions)
3. Advanced UI patterns (modals, queries)
4. Object manipulation patterns

---

## NOTES FOR EXTRACTION

1. **Coroutine Context:** Functions using `U.waitUntil`, `U.RunSequence`, `U.Lerp` require `startLuaCoroutine(Global, "CoroutineName")`. In Global context, `self` refers to `Global`.

2. **Dependencies:** Most utilities depend on `U.Type` for type checking. Ensure this is extracted first.

3. **TTS API Changes:** Some functions may need adjustment for newer TTS API versions (e.g., `UI.setAttributes` may now be built-in).

4. **Game-Specific Adaptation:**
   - Remove game-specific logic (bloodlines, houses, etc.)
   - Replace with VTM concepts (clans, disciplines, hunger, etc.)
   - Keep the patterns and structure

5. **State Management:** The nested get/set pattern (`S.getStateVal`, `S.setStateVal`) is essential for complex state. Extract this early.

6. **Lighting System:** The lighting module is complex but reusable. Start with `L.SetLightMode` and basic mode definitions, then expand.

7. **Manual vs Automated Control:** Prefer Heritage's manual control pattern (Storyteller-driven) over Kings Dilemma's automated director for VTM flexibility.

---

## FILES TO CREATE/EXTRACT

1. `lib/util.ttslua` - Copy entire utilities file
2. `lib/constants.ttslua` - Adapt from both modules
3. `core/state.ttslua` - Extract state functions (already created, needs enhancement)
4. `core/main.ttslua` - Adapt manual control pattern from Heritage (already created, needs enhancement)
5. `core/lighting.ttslua` - Extract lighting control from Kings Dilemma
6. `core/zones.ttslua` - Extract zone patterns (simplified)
7. `core/scenes.ttslua` - NEW: Scene preset system
8. `ui/hud.xml` - Adapt from templates
9. `ui/admin.xml` - GM controls
10. `ui/splash.xml` - Modal patterns

---

**Last Updated:** Based on analysis of Heritage and Kings Dilemma modules
**Status:** Ready for extraction and adaptation
