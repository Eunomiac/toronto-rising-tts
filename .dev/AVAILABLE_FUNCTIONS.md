# Available Functions Reference

**Purpose:** Living reference document listing all available utility functions and reusable code patterns in the VTM5E module. **ALWAYS check this document before writing new code** to avoid duplicating existing functionality.

**Status:** This document should be updated whenever new functions are added to any module.

**Last Updated:** 2026-05-19

---

## IMPORTANT: Before Writing Code

**⚠️ CRITICAL:** Before implementing any new function or writing code that performs common operations:

1. **Check this document first** - Search for existing functions that might already do what you need
2. **Check the utilities library** (`lib/util.ttslua`) - It contains 75+ functions for common operations
3. **Check other modules** - State, zones, lighting, main, `U.*` UI utilities, and Storyteller HUD modules may have relevant functions
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

### 1.2 Seat spotlight refs (`L.LIGHTMODES` keys)

Use these instead of hand-rolled `string.sub` checks: the PC prefix `playerLight` is **11** characters (`sub(…, 1, 10)` was a latent bug that never matched).

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.lightRefIsPlayerSeat(lightRef)` | PC seat spotlight registry key | Gate custom lighting paths; seat presets use `U.applyLightingPreset` + `L.reconcileForPlayer` |
| `U.lightRefIsNpcSeat(lightRef)` | NPC seat spotlight key (`npcLight…`) | Same as player row for NPC seat rigs |
| `U.lightRefIsSeatSpotlight(lightRef)` | Player or NPC seat spotlight | `if U.lightRefIsSeatSpotlight(ref) then …` |

### 1.3 Type Checking & Validation

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

### 1.4 Math & Numeric Utilities

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
| `U.rotateAroundPoint(center, radius, angle, y)` | Calculate position rotated around center | Position objects in circle |
| `U.XYZToCylindrical(pos, center)` | Convert XYZ to cylindrical coords | Get angle/radius from position |
| `U.XYZToSpherical(pos, center)` | Convert XYZ to spherical coords | 3D angle calculations |
| `U.Distance(pos1, pos2)` | 3D distance between points | Object proximity |
| `U.HorizontalDistance(pos1, pos2)` | Distance in XZ plane only | Table-top distance |
| `U.RotateToFrom(frameRefs, toAngle, fromAngle, origin)` | Rotate objects/frames in cylindrical coords | Rotate objects around point |

### 1.5 Object & Physics Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.findAboveObject(obj, testFunc, params)` | Physics cast upward, return matching objects | Find stacked cards |
| `U.findBelowObject(obj, testFunc, params)` | Physics cast downward | Find base object |
| `U.isObjectAbove(obj, testObj, params)` | Check if object is above another | Stack validation |
| `U.getScatterPosition(boundsOrPosOrObj, yShift, padPercentOrDiameter)` | Calculate random position within bounds | Random spawn |
| `U.getSnapPoints(board, coordsFilter, sortAxis)` | Get snap points with filtering | Board alignment |
| `U.findSnapPoint(snapPoints, pos, fuzziness)` | Find nearest snap point | Auto-align |
| `U.parsePosition(obj)` | Extract position from object/table | Position extraction |

### 1.6 Zone Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.getZoneBounds(zone)` | Get bounding box of zone | Zone size check |
| `U.isInside(zone, pos, ignoreY)` | Check if position is inside zone | Containment test |
| `U.getHandZone(color)` | Get player's hand zone | Access hand zone |

### 1.7 String & Data Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.split(inputstr, sep)` | Split string by delimiter | Parse CSV |
| `U.sanitizeJsonTextRemoveTrailingCommas(s)` | Strip trailing commas before `}` / `]` for `JSON.decode` (spreadsheet exports) | Scene Constructor import paste |
| `U.GetHex(color, newAlpha)` | Convert Color to hex string | UI color strings |

### 1.8 Tag Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.hasAnyTag(obj, tags)` | Check if object has any of specified tags | Tag filtering |
| `U.findTag(obj, tagList)` | Find matching tag from list | Tag matching |
| `U.findColorTag(obj)` | Extract player color from tags | Get owner color |

### 1.9 Time & Sequence Utilities (COROUTINE-BASED)

**⚠️ IMPORTANT:** These require `startLuaCoroutine(Global, "CoroutineName")` to work.

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.delay(callback, seconds)` | One-shot delayed callback (wraps TTS `Wait.time`) | Debounce, timers, stagger |
| `U.stopDelay(handle)` | Cancel a timer from `U.delay` | Real-time ticker, roll cleanup |
| `U.waitForCondition(onDone, testFn, timeoutSeconds?)` | Poll until true, then run callback | Light component ready |
| `U.scheduleAtOffsets(callback, offsetsSeconds)` | Same callback at multiple delays | Bootstrap retries in `Sync.full` |
| `U.waitUntil(afterFunc, testRef, isForcing, maxWait, testFrequency)` | Wait until condition met, then execute | Wait for object to rest |
| `U.RunSequence(funcs, maxWait, frequency)` | Execute functions sequentially with conditions | Scene transitions |
| `U.sequence(funcs, timeDelay)` | Execute functions with fixed delays | Staggered UI updates |
| `U.runAfterObjectPhysicsSettled(getObject, timeout, callback, completeEarlyIf?)` | `Wait.condition` after object rests | `onObjectRandomize` die settle |
| `U.waitRestingSequence(funcs, maxTime, isLoose)` | Wait for multiple objects to rest | Wait for all cards to settle |

### 1.10 Animation & Interpolation Utilities

**⚠️ IMPORTANT:** These require coroutine context to work.

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.GetEasedPath(start, endVal, duration, ease, easeIntensity, coordinateSystem)` | Pre-compute eased path for PositionOrientationData | Generate orbit path |
| `U.Lerp(setFunc, paramStart, paramEnd, duration, isRotationLerp, easing)` | Interpolate value over time | Smooth position/rotation changes |
| `U.LerpPath(path, setFunc)` | Execute a pre-computed path | Apply eased path |
| `U.LerpDeferred(start, endVal, duration, ease, easeIntensity, coordinateSystem, setFunc)` | Execute deferred path with Object refs | Dynamic targets |
| `U.resolvePositionData(data, coordinateSystem, center)` | Convert coordinate data to XYZ | Debug/test utilities |
| `U.getObject(ref, isSilent?)` | Resolve object from GUID or object | `local obj = U.getObject("abc123")` |
| `U.setPositionSlow(obj, position, duration, easing, isColliding)` | Animate position smoothly | Slide object |
| `U.setRotationSlow(obj, rotation, duration, easing, isColliding)` | Animate rotation smoothly | Rotate object |
| `U.setScaleSlow(obj, scale, duration, easing)` | Animate scale smoothly | Grow/shrink object |

### 1.11 Lighting Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.changeLighting(params)` | Apply global lighting changes | Scene lighting |
| `L.SetColor(light, color)` | Set light color immediately | `L.SetColor(lightObj, Color.Red)` |
| `L.SetRange(light, range)` | Set light range immediately | `L.SetRange(lightObj, 30)` |
| `L.SetAngle(light, angle)` | Set light cone angle immediately | `L.SetAngle(lightObj, 45)` |
| `L.SetIntensity(light, intensity)` | Set light intensity immediately | `L.SetIntensity(lightObj, 12)` |
| `L.GetColor(light)` | Get light color | `local c = L.GetColor(lightObj)` |
| `L.GetRange(light)` | Get light range | `local r = L.GetRange(lightObj)` |
| `L.GetAngle(light)` | Get light cone angle | `local a = L.GetAngle(lightObj)` |
| `L.GetIntensity(light)` | Get light intensity | `local i = L.GetIntensity(lightObj)` |

### 1.12 Clone & Copy Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.clone(t, isDeepCloning)` | Deep copy table (handles Vectors) | Duplicate config tables |

### 1.13 Player & Network Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.getHost()` | Get host player color | Identify game host |
| `U.getUID(length)` | Generate unique identifier | Temporary IDs |

### 1.14 UI Utilities

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.splashUIElement(elemID, duration, delay)` | Flash/highlight UI element | Draw attention |

### 1.15 Debug & Logging Utilities

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
| `S.getGameState(shouldSanitize)` | Get raw or save-safe state table; prefer nested access outside save/debug code | `S.getGameState(true)` in `onSave` |
| `S.setGameState(data)` | Set entire game state | Bulk state update |
| `S.getStateVal(...)` | Get nested state value safely | `S.getStateVal("sessionScene", "clock")` |
| `S.setStateVal(value, ...)` | Set nested state value safely | `S.setStateVal(clock, "sessionScene", "clock")` |
| `S.mergeDefaults(target, defaults)` | Merge default values into state | Ensure all keys exist |
| `S.resetGameState()` | Reset to defaults | New game |
| `S.validateState()` | Validate state structure | State integrity check |
| `S.setCurrentPhase(phase)` | Set game phase | Phase management |
| `S.isInPhase(phase)` | Check current phase | Conditional logic |

### Player-Specific Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `S.getStorageID(player)` | Get steam_id for a Player object | Used internally for state keys |
| `S.getPlayerID(playerRef)` | Get player ID from player or color | `S.getPlayerID(Player.Brown)` or `S.getPlayerID("Red")` |
| `S.initNewPlayer(playerID, color, steamName)` | Initialize new player state, notify GM | Called when player selects seat |
| `S.getPlayerData(playerRef)` | Get player's state data | Access player state |
| `S.setPlayerVal(playerRef, key, value)` | Set player-specific value | `S.setPlayerVal("Red", "hunger", 3)` |
| `S.getPlayerVal(playerRef, key)` | Get player-specific value | `S.getPlayerVal("Red", "hunger")` |
| `S.mergePlayerData(statePlayerData)` | Merge player data with defaults | Player initialization |

### Canonical State Access Patterns

`gameState.playerData` is keyed by Steam ID, not seat color. Resolve a player ID before reading nested player state unless the value is the special hunger helper.

| Field | Read Pattern | Write Pattern |
| :--------- | :------------- | :--------------- |
| Hunger | `S.getPlayerVal(color, "hunger")` | `S.setPlayerVal(color, "hunger", value)` |
| Player stats | `local pid = S.getPlayerID(color); S.getStateVal("playerData", pid, "stats", "willpower", "superficial")` | `S.setStateVal(value, "playerData", pid, "stats", "willpower", "superficial")` |
| Player conditions | `S.getStateVal("playerData", pid, "conditions", conditionKey)` | `S.setStateVal(entry, "playerData", pid, "conditions", conditionKey)` |
| Player HUD | `S.getStateVal("playerData", pid, "hud", "rollData", "active")` | `S.setStateVal(active, "playerData", pid, "hud", "rollData", "active")` |
| Player rolling light context | `S.getStateVal("playerData", pid, "lighting", "isRolling")` | `S.setStateVal(isRolling, "playerData", pid, "lighting", "isRolling")` |
| Scene lighting preset | `S.getStateVal("sessionScene", "lightingPresetKey")` | `S.setStateVal(presetKey, "sessionScene", "lightingPresetKey")` |
| Zone lock state | `S.getStateVal("zones", "allLocked")` | `S.setStateVal(isLocked, "zones", "allLocked")` |

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
| `L.InitLights()` | Reconcile lights from state on load; missing recorded mode defaults to `OFF` (or disables light + warns GM if `OFF` mode is undefined) | Setup function |
| `L.ResetLights()` | Reset all lights to defaults | Cleanup function |
| `L.reconcileLightRef(lightRef, transitionTime)` | Reconcile one registered light from state record (`gameState.lights[lightRef]`) | Targeted light resync |
| `L.SetLightMode(lightName, mode, player, transitionTime)` | Set light to predefined mode | Primary API |
| `L.LoadLights(lightNames, lightMode, transitionTime, playerRef)` | Apply light mode to named lights | Batch control |

---

## 4.1 OBJECTS MODULE (`core/objects.ttslua`)

**Require:** `local O = require("core.objects")`

### Signal Fire Functions

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `O.SetSignalFireState(color, state, duration)` | Set a player's signal fire `"on"` or `"off"` | `O.SetSignalFireState("Brown", "on", 0.2)` |
| `O.GetSignalFireState(color)` | Infer a player's signal fire state from its current height | `local state = O.GetSignalFireState("Brown")` |
| `O.ToggleSignalFireState(color, duration)` | Toggle a player's signal fire and return the new state | `local state = O.ToggleSignalFireState("Brown", 0.2)` |

---

## 5. SOUNDSCAPE MODULE (`core/soundscape.ttslua`)

**Require:** `local Soundscape = require("core.soundscape")`

### Core Functions for Soundscape

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Soundscape.reconcileFromState(opts?)` | Reconcile live soundscape from persisted state; skips deferred apply when fingerprint unchanged unless `opts.force` | `Sync.full()` / `Sync.soundscape()`; `Soundscape.invalidateReconcileCache()` clears incremental memory |
| `Soundscape.markReconciledToCurrentState()` | Prime the reconcile fingerprint to the current `gameState.soundscape` **without** touching emitters — call after `applyContext` when the next `Sync.full` must not re-run the same fades | Library scene apply / location apply / scene presets after direct `applyContext` |
| `Soundscape.getState()` | Return current soundscape state | UI/debug state reads |
| `Soundscape.getSummaryText()` | Return compact soundscape summary text | Storyteller panel summary |
| `Soundscape.applyContext(context)` | Apply weather/site/calendar audio context; optional `appliedSiteKey` updates `soundscape.lastAppliedSiteKey`. `isSilent = true` mutes ambient lanes only (featured unchanged); `isSilent = false` clears that latch. If both `musicMood` and `locationMusic` are set, **only `musicMood` is applied** (one background crossfade). | `Soundscape.applyContext({ isIndoors = true, weather = "lightRain" })`, `Soundscape.applyContext({ isSilent = true })` |
| `Soundscape.contextFromSite(site, siteKey?)` | Build an applyContext table from a `C.Sites` row; optional `siteKey` stamps `appliedSiteKey` for Storyteller Location UI | `Soundscape.applyContext(Soundscape.contextFromSite(C.Sites.CLGrounds, "CLGrounds"))` |
| `Soundscape.mergeSessionSceneNarrativeIntoContext(sessionScene, base)` | Copy `sessionScene.soundscapeNarrative` fields into `base` (mutates `base`); used to merge site + narrative into **one** `applyContext` call | `StorytellerScenesPanel.applyActiveLibraryScene` |
| `Soundscape.applySessionSceneNarrativeOverrides(sessionScene)` | `mergeSessionSceneNarrativeIntoContext(sessionScene, {})` then `applyContext` | Scene import / partial narrative apply |
| `Soundscape.reapplyWeatherNaturalVolumes()` | Reapply indoor/outdoor multipliers to rain/wind emitters from stored natural volumes | After manual indoor toggle without swapping tracks |
| `Soundscape.getPlayingLanesForUi()` | Rows for Storyteller sliders (`music`, `location`, `featured`, `rain`, `wind`) with natural/applied volumes | `core/global_script.ttslua` sound panel refresh |
| `Soundscape.setStorytellerLaneVolume(laneId, volume01)` | Adjust `music` / `location` / `featured` / `rain` / `wind` lane gain | Weather lanes interpret slider as **natural** volume |
| `Soundscape.setMusicMood(moodKey)` | Set trigger-based Storyteller music mood | `Soundscape.setMusicMood("intrigue")` |
| `Soundscape.setLocationMusic(playlistKey)` | Set site-specific background music playlist | `Soundscape.setLocationMusic("CasaLoma")` |
| `Soundscape.playFeaturedMusic(featureKey)` | Play featured music on the dedicated lane | `Soundscape.playFeaturedMusic("TR_Intro")` |
| `Soundscape.stopFeaturedMusic()` | Stop the featured lane only | Intro/song cleanup |
| `Soundscape.resumeBackgroundMusic()` | Restart saved mood/location music context | After featured music |
| `Soundscape.setWeatherCondition(weatherKey)` | Set layered weather preset | `Soundscape.setWeatherCondition("thunderstorm")` |
| `Soundscape.setRainLayer(rainKey)` | Set rain loop directly | `Soundscape.setRainLayer("heavyRain")` |
| `Soundscape.setWindLayer(windKey)` | Set wind loop directly | `Soundscape.setWindLayer("whistlingWind1")` |
| `Soundscape.setThunderEnabled(isEnabled)` | Start/cancel scheduled thunder triggers | `Soundscape.setThunderEnabled(true)` |
| `Soundscape.triggerThunder(hitKey)` | Play one thunder trigger immediately | `Soundscape.triggerThunder("thunder1")` |
| `Soundscape.setLocationAudio(locationKey)` | Set site/location ambience loop | `Soundscape.setLocationAudio("sewers")` |
| `Soundscape.setIndoors(isIndoors)` | Apply indoor/outdoor weather ducking context | `Soundscape.setIndoors(true)` |
| `Soundscape.stopAll()` | Stop all channels with the silent loop | Emergency silence |
| `Soundscape.inspectEmitters()` | List hidden emitters, effects, and AudioSources | Debug verification |
| `Soundscape.testLayeredPlayback()` | Start music, weather, and location together | Live soundscape smoke test |

### Chronicle weather (`lib/chronicle_weather.ttslua`)

**Require:** `local ChronicleWeather = require("lib.chronicle_weather")`
**Data:** `node .dev/scripts/generate_tr_weather_lua.js` embeds `.dev/Chronicle Data/TR_Weather.csv` into `lib/tr_weather_schedule.ttslua`.

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `ChronicleWeather.getRow(month, day, hour)` | Returns `{ wind, rain, thunder }` for that calendar hour or `nil` | Inspect scheduled intent |
| `ChronicleWeather.shouldAutoApply()` | Currently always `true` (gates removed); reserved for future hold/follow wiring | Rarely called directly |
| `ChronicleWeather.applyScheduledWeather(opts)` | Sets `soundscape.weather` to `"none"`, applies rain/wind/thunder via `Soundscape.set*`; on **full success** primes `Soundscape.markReconciledToCurrentState` so the next `Sync.full` does not double-fade; on **partial failure** calls `invalidateReconcileCache` for recovery; `opts.force` | `ChronicleWeather.applyScheduledWeather({ force = true })` |

---

## 5b. SYNC ORCHESTRATOR (`core/sync.ttslua`)

**Require:** `local Sync = require("core.sync")`

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Sync.full(opts?)` | Orchestrate scene + soundscape + seat presentation + UI; `opts.force == true` bypasses fingerprints and runs full `UpdateUIDisplays` | Debug **Sync All (force)**; routine paths omit `force` |
| `Sync.player(color)` | Per-seat lighting + HUD + overlays | Seat-scoped refresh |
| `Sync.ui(delta?)` | Passthrough to `UpdateUIDisplays` | Targeted UI deltas |
| `Sync.lighting(opts?)` | `Scenes.reconcileFromState(opts)` + `L.InitLights` | Lighting-focused repair |
| `Sync.soundscape(opts?)` | `Soundscape.reconcileFromState(opts)` | Audio-focused repair |

---

## 6. MAIN MODULE (`core/main.ttslua`)

**Require:** `local M = require("core.main")`

### Core Functions for Main

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `M.onLoad()` | Main initialization | Setup sequence |
| `M.setupPlayers()` | Configure players | Promote, assign roles |
| `M.forPlayers(func)` | Iterate over all players | DRY pattern |
| `M.advancePhase(newPhase)` | Change game phase | Manual phase control |
| `M.syncPhase()` | Sync phase with state | Phase synchronization |
| `M.setCamera(player, cameraMode, lookAtPos)` | Set camera angle (nudge → lookAt → setCameraMode → 1s wait → repeat lookAt to snap) | Cinematic control |
| `M.onObjectDrop(playerColor, droppedObject, zone)` | Handle object drops | Event delegation |
| `M.onPlayerAction(playerColor, action, clickState)` | Handle player actions | Custom hotkeys |

---

## 7. UI UTILITIES (`lib/util.ttslua`)

**Require:** `local U = require("lib.util")`

General-purpose UI helpers (system-agnostic). Prefer **`U.setAttribute` / `U.setAttributes`** for buttons — TTS can reset button styling when attributes are set one at a time; these wrappers restore key fields by setting them together.

### Button-safe attributes and flashes

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.setAttribute(elemID, attr, val)` | Set one attribute; preserves button color/textSize/textColor when needed | `U.setAttribute("myButton", "text", "OK")` |
| `U.setAttributes(elemID, attrs)` | Set many attributes; same button preservation | `U.setAttributes("btn", { text = "Go", fontSize = 18 })` |
| `U.isButton(elemID)` | True if element has click handlers | Guards / branching |
| `U.splashUIElement(elemID, duration, delay)` | Show element briefly then hide | Notifications |

### Collapse / expand (`active` + `toggleElem_<id>`)

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `U.toggleXmlElement(elemID, button)` | Toggle `active`; syncs `toggleElem_<elemID>` text ► / ▼ | Panel sections |
| `U.showXmlElement(elemID)` | Force expanded | Open section |
| `U.hideXmlElement(elemID)` | Force collapsed | Close section |
| `U.isXmlElementExpanded(elemID)` | Whether `active` reads as true | State checks |

### Global UI `InputField` text

Do not use `UI.getValue` / `UI.getAttribute(id, "text")` to read typed `InputField` content. Use **`onValueChanged` / `onEndEdit`**, stash the callback **`value`**, and prefill with **`U.setAttribute(id, "text", ...)`** (see `uiSetInputField` in `core/roll_ui.ttslua`). Full checklist: [`.dev/SOLVING ISSUES & DEBUGGING.md`](SOLVING%20ISSUES%20&%20DEBUGGING.md) section *Global UI `InputField` — typed text*.

TTS also exposes **`UI.setAttributes`** natively; use **`U.setAttributes`** when the target may be a **Button**.

### Storyteller HUD toolbar (not in `lib/`)

**Require:** `local StorytellerPanelUI = require("core.storyteller_panel_ui")`

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `StorytellerPanelUI.selectStorytellerPanel(panelKey, forceOpen?)` | Mutually exclusive bottom-bar panels; optional `forceOpen` skips “click same tab to close” | `StorytellerPanelUI.selectStorytellerPanel("npcs")` |

---

## 8. SCENES MODULE (`core/scenes.ttslua`)

**Require:** `local Scenes = require("core.scenes")`

### Core Functions for Scenes

| Function | Description | Usage Example |
| :--------- | :------------- | :--------------- |
| `Scenes.loadScene(name)` | Mutate selected scene in state (no live writes) | `Scenes.loadScene("elysium")` |
| `Scenes.fadeToScene(name, duration)` | Mutate selected scene + transition metadata in state | `Scenes.fadeToScene("alley", 2.0)` |
| `Scenes.reconcileFromState(opts?)` | Apply live scene effects from persisted state; skips when scene+transition fingerprint unchanged unless `opts.force` | `Scenes.invalidateReconcileCache()` clears incremental memory |
| `Scenes.getCurrentScene()` | Get current scene name | Scene tracking |
| `Scenes.getScenePreset(name)` | Get scene preset data | Scene info |

---

## 9. CONSTANTS MODULE (`lib/constants.ttslua`)

**Require:** `local C = require("lib.constants")`

### Available Constants

- `C.PlayerColors` - Array of player colors
- `C.StorytellerID` - Hard-coded Storyteller Steam ID. Other IDs extracted on seat selection
- `C.PlayerData` - Static player character data (merged with state on load)
- `C.Clans` - VTM5E clan names
- `C.Disciplines` - VTM5E discipline names
- `C.Phases` - Game phase constants (SESSION_START, SCENE, DOWNTIME, COMBAT, MEMORIAM, SESSION_END)
- `C.UI_IDS` - UI element ID constants
- `C.MAX_HUNGER` - Maximum hunger value (5, VTM5E scale is 0-5)
- `C.DICE_SUCCESS_THRESHOLD` - Dice success threshold (6)
- `C.DICE_CRITICAL_SUCCESS_VALUE` - Critical success value (10)
- `C.StorytellerColor` - Storyteller/GM player color
- `C.CameraAngles` - Camera preset positions (placeholder structure)
- `C.LightModes` - Light mode definitions (scene lighting presets)
- `G.GUIDS` - Placeholder GUIDs for TTS objects (in `lib/guids.ttslua`)

---

## Quick Reference by Task

### Need to iterate over a table?

→ Use `U.map()`, `U.forEach()`, `U.filter()`, `U.find()`

### Need to check object types?

→ Use `U.Type()`, `U.isGameObject()`, `U.isPlayer()`, `U.isArray()`

### Need to access game state?

→ Use `S.getStateVal()` / `S.setStateVal()` for exact schema paths. Use `S.getPlayerID(color)` before nested `playerData` paths. Use `S.getPlayerVal()` / `S.setPlayerVal()` for `hunger` only.

### Need to query objects in zones?

→ Use `Z.getTaggedZoneObjects()`, `Z.getCards()`, `Z.getCard()`

### Need to change lighting?

→ Use `L.SetLightMode()`, `U.changeLighting()`

### Need to animate objects?

→ Use `U.setPositionSlow()`, `U.setRotationSlow()`, `U.setScaleSlow()`, `U.Lerp()`

### Need to control signal fires?

→ Use `O.SetSignalFireState()`, `O.GetSignalFireState()`, `O.ToggleSignalFireState()`

### Need to wait for conditions?

→ Use `U.delay()`, `U.waitForCondition()`, `U.scheduleAtOffsets()`, `U.waitUntil()`, `U.RunSequence()`, `U.sequence()`, `U.runAfterObjectPhysicsSettled()` — not raw `Wait.time` / `Wait.condition` (see `docs/solutions/lua-wait-api-policy.md`)

### Need to manipulate UI?

→ Use `U.toggleXmlElement()` / `U.setAttributes()`, `U.splashUIElement()`; Storyteller tab bar → `StorytellerPanelUI.selectStorytellerPanel()`

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

**MANDATORY (see `.cursorrules` → Documentation Updates):** Keep this file aligned with the codebase **in the same change** — do not wait for a separate doc request.

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

- `.dev/EXTRACTABLE_FUNCTIONS_INDEX.md` - Historical reference of extractable functions
- `lib/util.ttslua` - Source code for utilities module
- `core/state.ttslua` - Source code for state module
- `core/zones.ttslua` - Source code for zones module
- `core/lighting.ttslua` - Source code for lighting module
- `core/main.ttslua` - Source code for main module
- `core/storyteller_panel_ui.ttslua` - Storyteller toolbar mutually exclusive panels
