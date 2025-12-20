# Extraction Implementation Plan
## VTM5E Module - Step-by-Step Extraction from Reference Modules

**Purpose:** Detailed execution plan for extracting reusable functions and patterns from Heritage and Kings Dilemma modules into the new VTM5E module.

**Related Documents:**
- `EXTRACTABLE_FUNCTIONS_INDEX.md` - Comprehensive catalog of all extractable elements
- `TTS-Scripting-Guide.htm` - Development methodology and best practices

**Status:** Ready to begin extraction

---

## EXTRACTION STRATEGY

### Principles
1. **Extract systematically** - Follow dependency order (utilities first, then modules that depend on them)
2. **Test incrementally** - Validate each major component before moving to the next
3. **Adapt early** - Remove game-specific logic during extraction, not after
4. **Document changes** - Note any adaptations or deviations from source
5. **Preserve patterns** - Keep the structure and approach even when changing content

### Workflow
1. Copy source file to target location
2. Remove game-specific content
3. Adapt naming/constants to VTM5E
4. Update require paths if needed
5. Test basic functionality
6. Integrate with existing modules
7. Document any issues or adaptations

---

## PHASE 1: FOUNDATION (Priority 1)

### Step 1.1: Extract Utilities Module
**Source:** `dev/TTS-Scripting-Guide-Modules/heritage/lib/utilities.ttslua` OR `dev/TTS-Scripting-Guide-Modules/kingsdilemma/lib/utilities.ttslua`
**Target:** `lib/util.ttslua`

**Actions:**
1. Copy entire file (both versions are identical)
2. Rename `lib/utilities.ttslua` references in comments to `lib/util.ttslua` (if any)
3. Verify all functions are present (compare against index)
4. Test basic functions (Type, map, filter) in TTS console

**Validation:**
- [ ] File copied successfully
- [ ] All 75+ functions present
- [ ] Basic type checking works: `U.Type({}) == "table"`
- [ ] Basic table ops work: `U.map({1,2,3}, function(x) return x*2 end)`

**Dependencies:** None (this is the foundation)

**Estimated Time:** 15 minutes

---

### Step 1.2: Enhance Constants Module
**Source:** Both `heritage/lib/constants.ttslua` and `kingsdilemma/kingsdilemma/lib/constants.ttslua`
**Target:** `lib/constants.ttslua` (already exists, needs enhancement)

**Actions:**
1. Review existing `lib/constants.ttslua`
2. Extract useful constant patterns from both sources
3. Adapt to VTM5E needs:
   - Player colors (keep)
   - Game phases (adapt for VTM: Scene, Downtime, Combat, etc.)
   - UI element IDs (expand as needed)
   - Default values (hunger, willpower, health - already present)
   - Camera angles (keep structure, adapt positions)
   - Light presets (add VTM scene presets)

**Validation:**
- [ ] All VTM-relevant constants defined
- [ ] Constants match expected structure from state module
- [ ] Camera angles are reasonable positions

**Dependencies:** None

**Estimated Time:** 30 minutes

---

### Step 1.3: Enhance State Module
**Source:** `kingsdilemma/kingsdilemma/core/state.ttslua`
**Target:** `core/state.ttslua` (already exists, needs enhancement)

**Actions:**
1. Compare existing `core/state.ttslua` with source
2. Extract missing functions:
   - `S.mergeDefaults` (if missing)
   - `S.resetGameState` (if missing)
   - Any additional helper functions
3. Verify `getStateVal`/`setStateVal` handle nested keys correctly
4. Ensure default game state matches VTM5E needs (hunger, willpower, health)

**Validation:**
- [ ] All functions from index present
- [ ] Nested state access works: `S.setStateVal(3, "players", "Red", "hunger")` then `S.getStateVal("players", "Red", "hunger") == 3`
- [ ] Default state initialization works
- [ ] State persistence (save/load) works

**Dependencies:** `lib/util.ttslua` (U.map used in GetDefaultGameState)

**Estimated Time:** 45 minutes

---

### Step 1.4: Extract Basic Zone Patterns
**Source:** `heritage/core/zones.ttslua`
**Target:** `core/zones.ttslua` (new file)

**Actions:**
1. Copy source file
2. Remove game-specific functions:
   - `Z.updateBloodlineZones` (adapt or remove)
   - `Z.getAnkhs`, `Z.getPowerTokens`, etc. (remove - game-specific)
   - `Z.isTorpored`, `Z.isExhausted` (adapt or remove)
   - `Z.countPower`, `Z.scoreZone` (remove - adapt later if needed)
3. Keep core patterns:
   - `Z.activateZones` / `Z.deactivateZones`
   - `Z.getTaggedZoneObjects`
   - `Z.getSnapPointsInZone`
   - `Z.onObjectEnterZone` / `Z.onObjectLeaveZone` (event handlers)
   - `Z.writePosToTaggedObjectsInZone`
   - `Z.showZones` / `Z.hideZones`
4. Remove dependencies on `G` (guids) module - adapt to use constants or direct GUIDs
5. Update require statements to match new structure

**Validation:**
- [ ] Zone activation/deactivation works
- [ ] `getTaggedZoneObjects` returns correct objects
- [ ] Event handlers can be registered in global.ttslua
- [ ] No game-specific logic remains

**Dependencies:** `lib/util.ttslua`, `core/state.ttslua`

**Estimated Time:** 60 minutes

---

### Step 1.5: Extract Basic Lighting Control
**Source:** `kingsdilemma/kingsdilemma/core/lighting.ttslua`
**Target:** `core/lighting.ttslua` (new file)

**Actions:**
1. Copy source file
2. Remove game-specific light modes (momentumUp, resource lights, etc.)
3. Keep core functions:
   - `L.SetLightMode` (primary API)
   - `L.GetLight` / `L.GetAllLights`
   - `L.InitLights` / `L.ResetLights`
   - Low-level controls (SetIntensity, SetColor, etc.)
4. Simplify mode structure - create basic modes:
   - `off` - light disabled
   - `ambient` - soft ambient light
   - `bright` - full brightness
   - `dim` - low intensity
   - (more can be added later)
5. Remove dependency on `O` (objects) module - adapt to use tags or direct lookup
6. Update require statements

**Validation:**
- [ ] `L.SetLightMode("lightName", "off")` works
- [ ] Smooth transitions work (if U.Lerp is available)
- [ ] Light state persists in gameState
- [ ] No game-specific light modes remain

**Dependencies:** `lib/util.ttslua`, `core/state.ttslua`, `U.Lerp` (from utilities), `U.RunSequence`

**Estimated Time:** 90 minutes

---

### Phase 1 Validation
**Checkpoint:** All foundation modules extracted and tested

- [ ] Utilities module complete and tested
- [ ] Constants module enhanced with VTM values
- [ ] State module enhanced and tested
- [ ] Zone patterns extracted (core functionality)
- [ ] Lighting control extracted (basic modes)
- [ ] All modules load without errors
- [ ] Basic integration test passes (modules can require each other)

**Estimated Total Time:** ~4 hours

---

## PHASE 2: INTEGRATION & UI (Priority 2)

### Step 2.1: Enhance Main Module
**Source:** `heritage/core/main.ttslua`
**Target:** `core/main.ttslua` (already exists, needs enhancement)

**Actions:**
1. Compare existing `core/main.ttslua` with Heritage source
2. Extract patterns:
   - `M.forPlayers(func)` - iterate over all players
   - `M.setupPlayers()` - promote players, assign roles
   - `M.advancePhase(newPhase)` - manual phase control
   - Event delegation patterns (`onObjectDrop`, `onPlayerAction`)
   - Camera control patterns
3. Adapt for VTM5E:
   - Remove Heritage-specific logic (bloodlines, etc.)
   - Add VTM setup (hunger tracking, etc.)
   - Keep manual control pattern (NOT automated director)
4. Integrate with extracted modules (Z, L, S)

**Validation:**
- [ ] `M.forPlayers` works correctly
- [ ] Phase advancement works
- [ ] Event handlers delegate to appropriate modules
- [ ] Integration with state/lighting/zones works

**Dependencies:** All Phase 1 modules

**Estimated Time:** 60 minutes

---

### Step 2.2: Create Scene Preset System
**Source:** Guide suggestions + lighting module patterns
**Target:** `core/scenes.ttslua` (new file)

**Actions:**
1. Create new file based on guide pattern
2. Define scene preset structure (see index section 10)
3. Implement `loadScene(name)` function
4. Implement `fadeToScene(name, duration)` with smooth transitions
5. Integrate with lighting module (`L.SetLightMode`)
6. Integrate with MusicPlayer API for background music
7. Add VTM-specific scenes (Elysium, Alley, Haven, etc.)

**Validation:**
- [ ] Scene presets can be loaded
- [ ] Smooth transitions work
- [ ] Lighting changes correctly
- [ ] Music changes correctly (if tracks available)

**Dependencies:** `core/lighting.ttslua`, `lib/util.ttslua`

**Estimated Time:** 90 minutes

---

### Step 2.3: Extract UI Helper Functions
**Source:** `kingsdilemma/kingsdilemma/hud.ttslua`
**Target:** `lib/ui_helpers.ttslua` (new file) OR add to `lib/util.ttslua`

**Actions:**
1. Extract `toggleXmlElement` function
2. Create `UI.setAttributes` wrapper if needed
3. Add other useful UI helpers
4. Decide: separate file or part of util?

**Validation:**
- [ ] `toggleXmlElement` works
- [ ] `UI.setAttributes` works (or wrapper implemented)

**Dependencies:** None (or minimal)

**Estimated Time:** 20 minutes

---

### Step 2.4: Extract UI XML Templates
**Source:** Multiple XML files from both modules
**Target:** `ui/` directory (create new directory)

**Actions:**
1. Create `ui/` directory
2. Extract panel structure from `heritage/xml/hud.xml`
3. Extract admin panel from `heritage/xml/admin.xml` or `kingsdilemma/kingsdilemma/kdxml/admin.xml`
4. Extract splash/modal pattern from `heritage/xml/splash.xml`
5. Adapt for VTM5E:
   - Remove game-specific content
   - Keep role-based visibility patterns
   - Keep toggle/collapse patterns
   - Adapt button IDs and labels
6. Create basic VTM HUD structure:
   - GM panel (Storyteller controls)
   - Player panel (hunger, willpower, health)
   - Shared elements (scene controls, etc.)

**Validation:**
- [ ] XML files are valid
- [ ] Role-based visibility works
- [ ] Toggle buttons work
- [ ] UI loads without errors

**Dependencies:** UI helper functions (Step 2.3)

**Estimated Time:** 120 minutes

---

### Step 2.5: Update Global Script
**Target:** `global.ttslua` (already exists, needs updates)

**Actions:**
1. Update require statements to match new module structure
2. Integrate all extracted modules:
   - Require Z (zones)
   - Require L (lighting)
   - Ensure S (state) is initialized
3. Register event handlers:
   - `onObjectEnterZone` → `Z.onObjectEnterZone`
   - `onObjectLeaveZone` → `Z.onObjectLeaveZone`
   - Other event delegations
4. Initialize modules in `onLoad`:
   - `S.InitializeGameState(saved_data)`
   - `M.onLoad()`
   - `Z.onLoad()` (if needed)
   - `L.InitLights()` (if needed)
5. Load initial UI XML

**Validation:**
- [ ] All modules load successfully
- [ ] `onLoad` executes without errors
- [ ] `onSave` saves state correctly
- [ ] Event handlers are registered
- [ ] UI displays correctly

**Dependencies:** All previous steps

**Estimated Time:** 45 minutes

---

### Phase 2 Validation
**Checkpoint:** Full integration complete

- [ ] Main module enhanced with Heritage patterns
- [ ] Scene preset system functional
- [ ] UI helpers available
- [ ] UI XML templates extracted and adapted
- [ ] Global script integrates all modules
- [ ] End-to-end test: Load game → Set scene → Use UI → Save/Load

**Estimated Total Time:** ~5.5 hours

---

## PHASE 3: POLISH & EXPANSION (Priority 3)

### Step 3.1: Extract Animation Utilities (If Needed)
**Source:** Already in `lib/util.ttslua`
**Target:** Verify `U.Lerp`, `U.setPositionSlow`, etc. work correctly

**Actions:**
1. Test `U.Lerp` with simple values
2. Test animation functions with objects
3. Verify coroutine context works in Global
4. Document usage patterns

**Validation:**
- [ ] Smooth animations work
- [ ] No coroutine errors

**Estimated Time:** 30 minutes

---

### Step 3.2: Expand Zone Functions (As Needed)
**Actions:**
1. Add VTM-specific zone queries (if needed)
2. Add object management functions for VTM objects
3. Expand event handling patterns

**Estimated Time:** 60 minutes (as needed)

---

### Step 3.3: Expand Lighting Modes (As Needed)
**Actions:**
1. Add more scene-specific light modes
2. Add player-specific spotlight modes
3. Add dramatic effect modes (flicker, pulse, etc.)

**Estimated Time:** 60 minutes (as needed)

---

### Step 3.4: Advanced UI Patterns (As Needed)
**Actions:**
1. Extract modal dialog patterns (if needed beyond TTS built-ins)
2. Extract query/selection patterns
3. Add advanced UI features

**Estimated Time:** 90 minutes (as needed)

---

## TESTING CHECKLIST

### Unit Tests (Per Module)
- [ ] Utilities: Test each function category
- [ ] State: Test get/set, save/load
- [ ] Zones: Test activation, queries, events
- [ ] Lighting: Test mode changes, transitions
- [ ] Main: Test phase control, player iteration

### Integration Tests
- [ ] All modules load together
- [ ] Modules can call each other
- [ ] State persists across save/load
- [ ] Events propagate correctly
- [ ] UI updates reflect state changes

### End-to-End Tests
- [ ] Full game load → play → save → reload
- [ ] Scene changes work smoothly
- [ ] UI controls function correctly
- [ ] Storyteller can control all features
- [ ] Players see appropriate UI

---

## DEPENDENCY GRAPH

```
global.ttslua
  ├── lib/util.ttslua (FOUNDATION - NO DEPS)
  ├── lib/constants.ttslua (FOUNDATION - NO DEPS)
  ├── core/state.ttslua
  │   └── lib/util.ttslua
  ├── core/zones.ttslua
  │   ├── lib/util.ttslua
  │   └── core/state.ttslua
  ├── core/lighting.ttslua
  │   ├── lib/util.ttslua
  │   └── core/state.ttslua
  ├── core/main.ttslua
  │   ├── lib/util.ttslua
  │   ├── lib/constants.ttslua
  │   └── core/state.ttslua
  └── core/scenes.ttslua
      ├── lib/util.ttslua
      └── core/lighting.ttslua
```

**Extraction Order:**
1. util.ttslua (no deps)
2. constants.ttslua (no deps)
3. state.ttslua (needs util)
4. zones.ttslua (needs util, state)
5. lighting.ttslua (needs util, state)
6. main.ttslua (needs util, constants, state)
7. scenes.ttslua (needs util, lighting)

---

## COMMON ADAPTATIONS

### Game-Specific Content to Remove/Adapt

**From Heritage:**
- Bloodline zones → Adapt to VTM concepts (clans, coteries, etc.)
- Ankh tokens → Remove (game-specific)
- Power/Infamy/Boons → Adapt to VTM stats (hunger, willpower, humanity, etc.)
- Torpor/Exhaustion → Adapt to VTM conditions
- Battleground zones → Remove or adapt for VTM scenes

**From Kings Dilemma:**
- House selection → Remove (game-specific)
- Voting mechanics → Remove (game-specific)
- Resource tokens → Remove (game-specific)
- Momentum lights → Adapt to VTM scene lighting
- Director/automated phases → Remove (prefer manual control)

### Naming Conventions
- Keep module prefixes: `U.` (utilities), `S.` (state), `Z.` (zones), `L.` (lighting), `M.` (main), `C.` (constants)
- Use VTM terminology: "hunger", "willpower", "humanity", "discipline", "clan"
- Storyteller = GM = Player.Black or Player.Brown (choose one and be consistent)

---

## ROLLBACK PLAN

If issues arise:
1. **Individual module fails:** Comment out requires, add TODO, continue with other modules
2. **Integration fails:** Isolate problematic module, test others independently
3. **Critical failure:** Restore from git, analyze issue, adjust plan

---

## PROGRESS TRACKING

Use checkboxes in this document to track:
- [ ] Phase 1 Complete
- [ ] Phase 2 Complete
- [ ] Phase 3 Complete (optional)
- [ ] All Tests Pass
- [ ] Documentation Updated
- [ ] Ready for Feature Development

---

## NOTES

- **Estimated Total Time:** ~10-12 hours for Phases 1-2, plus additional time for Phase 3 as needed
- **Risk Areas:**
  - Coroutine context in Global (test early)
  - State persistence (test save/load cycles)
  - UI integration (test role-based visibility)
- **Success Criteria:** All Priority 1 and 2 items extracted, adapted, integrated, and tested

---

**Last Updated:** Created based on Extractable Functions Index
**Next Steps:** Begin Phase 1, Step 1.1
