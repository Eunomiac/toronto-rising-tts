# State Access Audit

**Date:** 2026-05-19

**Scope:** `core/`, `lib/`, `ui/`, `.dev/`

**Schema baseline:** `core/state.ttslua` `S.GetDefaultGameState()` (`currentPhase`, Steam-ID-keyed `playerData`, `lights`, `zones`, `scene`, `soundscape`, `seatLayout`, `npcs.instances`, `presentDayClock`, `sessionScene`, `sceneLibrary`, `stRollSettings`) and `.dev/Scene Constructor/SchemaV2.jsonc` (`sessionScene.lightingPresetKey`, `seatSlots`, `clock`, `rollDefaults`, `soundscapeNarrative`, `npcWorld.byArea`).

**Count summary:** P0: 3, P1: 5, P2: 7.

## Audit notes

- No executable `gameState.` reads or writes were found outside `core/state.ttslua`; matches outside that file are comments, XML text, or docs.
- Production `S.getPlayerVal(...)` / `S.setPlayerVal(...)` call sites currently use `"hunger"` only. Non-hunger misuse was found in docs, not executable code.
- Valid `S.getStateVal("playerData", pid, "hud", ...)` reads were not flagged when `pid` is a Steam ID resolved by `S.getPlayerID(...)`.

## P0 - wrong path causes wrong gameplay / UI / lighting behavior

| ID | Finding | Current code | Why wrong | Correct path / API | Blast radius |
| --- | --- | --- | --- | --- | --- |
| P0-1 | Seat absence lighting is gated behind an undeclared flag that is never written. | `core/lighting.ttslua:1374` computes `seatPresenceOff = shouldEnforceSeatPresenceLights() and not L.isPlayerPresentInActiveSeatLayout(seatKey)`; `core/lighting.ttslua:1288-1289` reads `S.getStateVal("seatLayout", "enforceActiveSeatLighting") == true`. | `seatLayout.enforceActiveSeatLighting` is not in `GetDefaultGameState()`, not normalized in `S.validateState()`, and has no writer. That makes absent seats stay eligible for scene/default/hunger lighting even though the sync policy says `DARK/absent` collapses to `OFF`. | Remove the flag gate and derive absence from `L.isPlayerPresentInActiveSeatLayout(seatKey)` directly, or add an explicit schema-backed flag with a real UI writer. Current policy favors direct absence-derived `OFF`. | Player/NPC seat lights; scene presence, split-party scenes, table layouts, hunger lighting priority. |
| P0-2 | Legacy scene selection can leave stale `sessionScene.lightingPresetKey` authoritative over `currentScene`. | `core/scenes.ttslua:376-377` and `core/scenes.ttslua:402-406` write `currentScene` / `sceneTransition`; `core/scenes.ttslua:300-316` resolves `sessionScene.lightingPresetKey` first and only falls back to `currentScene`. `core/global_script.ttslua:791-793` has the same legacy write-only scene path. | After an admin preset writes `sessionScene.lightingPresetKey`, a later `Scenes.loadScene(...)` / `HUD_changeScene(...)` only changes `currentScene`; reconcile keeps applying the stale lighting preset. | Make `sessionScene.lightingPresetKey` the canonical lighting intent. Legacy scene APIs must either set/clear that key deliberately or be deprecated behind a migration wrapper. `currentScene` should be a legacy label/fallback, not the primary lighting state. | Scene lighting, admin dark/standard/bright, legacy scene buttons/debug calls, UI scene display. |
| P0-3 | Zone toggle/debug readers use `zones.allZonesLocked`, but the zone module writes `zones.allLocked`. | `core/global_script.ttslua:1332` reads `S.getStateVal("zones", "allZonesLocked")`; `core/debug.ttslua:3660` does the same. `core/zones.ttslua:69` writes `S.setStateVal(false, "zones", "allLocked")`; `core/zones.ttslua:84` writes `true`. | The HUD toggle sees `nil` and takes the wrong branch, so the debug control can repeatedly deactivate instead of toggling. Debug output reports the wrong state. | Replace all `zones.allZonesLocked` reads/docs with `S.getStateVal("zones", "allLocked")`. Add `zones = { allLocked = false }` to defaults. | Debug zone controls, GM troubleshooting, any zone event activation/deactivation workflow. |

## P1 - works today by accident / nil coalescing / load-merge fragility

| ID | Finding | Current code | Why wrong | Correct path / API | Blast radius |
| --- | --- | --- | --- | --- | --- |
| P1-1 | Player seat-color update mutates raw state returned by `S.getGameState(false)`. | `core/main.ttslua:506-509` reads `local state = S.getGameState(false)` and writes `state.playerData[playerID].color = color`. | This bypasses `S.setStateVal`, value-safety validation, and the visible state mutation convention. It also normalizes code toward raw state table edits. | `local row = S.getStateVal("playerData", playerID)` for existence; `S.setStateVal(color, "playerData", playerID, "color")` for the mutation. | Player identity/color mapping, seat switches, future validation around `playerData`. |
| P1-2 | `Scenes.reconcileFromState()` writes back to state while reconciling. | `core/scenes.ttslua:466-470` defaults invalid `currentScene` by calling `S.setStateVal(sceneName, "currentScene")` inside the reconciler. | Reconcilers are supposed to be read-only on state. This also recreates a missing legacy key rather than making the caller repair state explicitly. | Normalize legacy scene state in `S.validateState()` or a scene mutation API before `Sync.full()`. Keep `Scenes.reconcileFromState()` read-only. | Sync orchestration, load repair, scene cache fingerprints, future scene migrations. |
| P1-3 | `currentScene` and `sceneTransition` are live state paths but are missing from defaults/normalization. | `core/scenes.ttslua:510` reads `S.getStateVal("currentScene")`; `core/scenes.ttslua:376-377`, `402-406`, `539`, `543` write `currentScene` / `sceneTransition`. `core/state.ttslua:912-914` saves `currentScene`, but `GetDefaultGameState()` does not declare either path. | Missing defaults make `getStateVal` silently return `nil`; `sceneTransition` is created ad hoc and not persisted, while `currentScene` is saved despite not being in the schema. | Either migrate to `sessionScene.lightingPresetKey` and delete legacy keys, or explicitly add `currentScene` / `sceneTransition` to defaults with comments documenting legacy/runtime-only semantics. | Scene restore, admin lighting UI, save/load, reconcile fingerprints. |
| P1-4 | `seatLayout.virtualHandZoneAnchors` is read/written but absent from defaults and save whitelist. | `lib/rotational-seat-layout.ttslua:1611-1614` reads it with `{}` fallback; `lib/rotational-seat-layout.ttslua:1978` writes it. | The value disappears across save/load unless another path reconstructs it. If it is only runtime scratch data, it should not live in persisted `gameState`; if it is intent, it needs schema/save support. | Decide ownership: add `seatLayout.virtualHandZoneAnchors = {}` to defaults and save it, or move it to module-private runtime cache. | Rotational seat layout, virtual hand-zone movement, load recovery after table swaps. |
| P1-5 | `npcs.ui.groupExpanded` is stored under `gameState.npcs.ui` but default/save shape only declares `npcs.instances`. | `core/npcs.ttslua:1819-1827` reads `S.getStateVal("npcs", "ui")`; `core/npcs.ttslua:1839-1842` writes `S.setStateVal(ui, "npcs", "ui")`. `core/state.ttslua:302-304` defaults only `npcs.instances`; `buildSaveState()` saves only instances at `core/state.ttslua:1081-1095`. | UI expanded state is silently reset on save/load. That may be acceptable, but using `gameState` implies persistence/authority. | Add `npcs.ui = { groupExpanded = {} }` to defaults and save it, or move expansion state to module-private UI cache. | Storyteller NPC panel UX, save/load consistency, future NPC UI state. |

## P2 - misleading docs/comments/JSDoc examples

| ID | Finding | Current code | Why wrong | Correct path / API | Blast radius |
| --- | --- | --- | --- | --- | --- |
| P2-1 | `core/state.ttslua` JSDoc examples point hunger at the old top-level path. | `core/state.ttslua:34`, `54`, `1365`, `1381` show `playerData, playerID, "hunger"`. | Hunger lives at `playerData[id].stats.hunger`; the canonical public helper is `S.getPlayerVal(color, "hunger")` / `S.setPlayerVal(color, "hunger", n)`. | Update examples to `stats.hunger` when demonstrating raw nested access, and use `S.getPlayerVal` / `S.setPlayerVal` for public hunger access. | Future agents copying examples into production code. |
| P2-2 | `.dev/AVAILABLE_FUNCTIONS.md` had `players/Red/hunger` examples. | `.dev/AVAILABLE_FUNCTIONS.md:233-234` previously used `S.getStateVal("players", "Red", "hunger")` / `S.setStateVal(3, "players", "Red", "hunger")`. | `players` is not a state key; `playerData` is Steam-ID keyed; hunger is nested under `stats`. | Updated in this pass to canonical patterns for hunger, stats, conditions, HUD, lighting context, scene lighting, and zones. | Agent onboarding and repeated state-access regressions. |
| P2-3 | `.dev/EXTRACTABLE_FUNCTIONS_INDEX.md` preserves the same stale `players/Red/hunger` examples. | `.dev/EXTRACTABLE_FUNCTIONS_INDEX.md:318-320`. | Historical reference docs still teach a non-existent path. | Replace with `sessionScene` examples or mark the file historical and point to `.dev/AVAILABLE_FUNCTIONS.md`. | Low, but search results can mislead agents. |
| P2-4 | HUD docs describe `currentScene` as the authority and document the wrong zone key. | `.dev/HUD_FUNCTIONS.md:43` says `gameState.currentScene` remains lighting authority; `.dev/HUD_FUNCTIONS.md:134` documents `zones.allZonesLocked`. | Current scene reconciliation prefers `sessionScene.lightingPresetKey`; zone lock state is `zones.allLocked`. | Update Scenes tab authority to `sessionScene.lightingPresetKey`; update `HUD_toggleZones` docs to `zones.allLocked`. | Human/agent debugging of scenes and zone controls. |
| P2-5 | Storyteller Scenes XML copy exposes stale state concepts. | `ui/storyteller/panel_scenes.xml:6` says lighting presets drive `currentScene`; `ui/storyteller/panel_scenes.xml:29` references `enforceActiveSeatLighting`. | UI hints teach the same legacy scene and undeclared seat-light flag issues found above. | Change copy to `sessionScene.lightingPresetKey`; remove the `enforceActiveSeatLighting` mention or back it with a real control/schema. | Storyteller-facing help text, QA, agent screenshots. |
| P2-6 | Dice system docs show `S.setPlayerVal` for non-hunger nested keys. | `.dev/Dice System/Dice System Outline.md:990` mentions `S.setPlayerVal(color, "stains", ...)`; `.dev/Dice System/Dice System Outline.md:1020` mentions `S.setPlayerVal(color, "stats.willpower.superficial", ...)`. | `S.setPlayerVal` only special-cases `"hunger"`; other keys are written as top-level dynamic fields. Nested stats/conditions must use `S.getPlayerID(color)` plus `S.setStateVal(...)`. | Replace with `S.setStateVal(value, "playerData", pid, "stats", "humanity", "stains")` and `S.setStateVal(value, "playerData", pid, "stats", "willpower", "superficial")`. | Roll pipeline docs; future implementation of remorse/willpower code. |
| P2-7 | Debugging checklist repeats legacy scene/seat-presence state descriptions. | `.dev/SOLVING ISSUES & DEBUGGING.md:42-43` says `gameState.currentScene` is the lighting preset key and pairs seat presence with `seatLayout.enforceActiveSeatLighting`. | This conflicts with `sessionScene.lightingPresetKey` and the current absent-seat priority policy. | Update to `sessionScene.lightingPresetKey` as lighting intent; describe absent-seat behavior as direct derived state, not a separate flag. | Debugging playbooks and future incident response. |

## Phased fix plan

### P0 - data bugs first

1. **Fix absent-seat lighting derivation.**
   - Remove or replace `shouldEnforceSeatPresenceLights()` in `core/lighting.ttslua`.
   - Make `computeSeatSpotlightPriorityOverride()` return `OFF` when `not L.isPlayerPresentInActiveSeatLayout(seatKey)` and `lData.OFF` exists.
   - Update `ui/storyteller/panel_scenes.xml` and `.dev/SOLVING ISSUES & DEBUGGING.md` to stop referencing `enforceActiveSeatLighting`.
   - Verify with a scene/table where a seat is absent: `Sync.full({ force = true })` should persist that seat's light as `OFF`.

2. **Resolve scene authority confusion.**
   - Decide whether legacy `Scenes.SCENES` stays as a fallback or is migrated.
   - If it stays, `Scenes.loadScene` / `Scenes.fadeToScene` must deliberately clear or set `sessionScene.lightingPresetKey` so stale admin presets cannot win accidentally.
   - Keep `Scenes.reconcileFromState()` read-only; move any state repair into mutation/normalization.
   - Update admin scene button highlighting to use the same canonical lighting key it writes.

3. **Fix zone lock key mismatch.**
   - Replace `allZonesLocked` with `allLocked` in `core/global_script.ttslua`, `core/debug.ttslua`, `.dev/HUD_FUNCTIONS.md`.
   - Add `zones = { allLocked = false }` to `GetDefaultGameState()` or normalize it in `S.validateState()`.
   - Verify `HUD_toggleZones` alternates activate/deactivate across two clicks.

### P1 - consistency / schema / load-merge safety

1. **Remove raw state table mutation from player setup.**
   - Replace `S.getGameState(false)` in `core/main.ttslua:506-509` with `S.getStateVal` + `S.setStateVal`.
   - Keep `S.getGameState(true)` for `onSave`; restrict unsanitized `S.getGameState(false)` to explicit debug dumps.

2. **Make scene legacy keys explicit or delete them.**
   - If `currentScene` remains, add it to `GetDefaultGameState()` with a legacy comment and normalize it.
   - If `sceneTransition` remains runtime-only, document that in defaults or move it module-local.
   - Remove state writes from `Scenes.reconcileFromState()`.

3. **Classify undeclared runtime state paths.**
   - `seatLayout.virtualHandZoneAnchors`: persist by adding defaults/save support, or move to module-private cache.
   - `npcs.ui.groupExpanded`: persist by adding defaults/save support, or move to module-private cache.
   - `zones.allLocked`: add a default regardless of the zone toggle fix.

4. **Tighten `S.getGameState` use.**
   - Add docs/comments that `S.getGameState(false)` returns the live table and must not be mutated outside `core/state.ttslua`.
   - Consider a future `S.getRawGameStateForDebug()` name if debug dumping remains common.

### P2 - docs/comments

1. Update `core/state.ttslua` usage examples for `stats.hunger`.
2. Update `.dev/EXTRACTABLE_FUNCTIONS_INDEX.md` stale state examples or mark them historical.
3. Update `.dev/HUD_FUNCTIONS.md` scene authority and zone key text.
4. Update `ui/storyteller/panel_scenes.xml` copy for scene lighting and seat presence.
5. Update `.dev/Dice System/Dice System Outline.md` nested stat examples to `S.getPlayerID` + `S.setStateVal`.
6. Update `.dev/SOLVING ISSUES & DEBUGGING.md` scene/seat-presence bullets.
7. Keep `.dev/AVAILABLE_FUNCTIONS.md` canonical patterns current whenever state APIs move.

## Regression grep patterns

Run from repo root.

```text
rg -n --glob '{core,lib,ui,.dev}/**/*' 'gameState\.'
```

Review every executable hit outside `core/state.ttslua`; comments/XML/docs are allowed only when accurate.

```text
rg -n --glob '{core,lib}/**/*.ttslua' 'S\.getGameState\((false)?\)|S\.getGameState\(\)'
```

Allow `S.getGameState(true)` for save serialization and raw calls for explicit debug dumps only. Production mutation through the returned table is forbidden.

```text
rg -n --glob '{core,lib,.dev}/**/*' 'getStateVal\("playerData",\s*(color|seatColor|playerColor|seatKey|"(Brown|Orange|Red|Pink|Purple|Black)")'
rg -n --glob '{core,lib,.dev}/**/*' 'setStateVal\([^,\n]+,\s*"playerData",\s*(color|seatColor|playerColor|seatKey|"(Brown|Orange|Red|Pink|Purple|Black)")'
```

These catch color-keyed `playerData` access. Correct pattern is `local pid = S.getPlayerID(color)` first.

```text
rg -n --glob '{core,lib,.dev}/**/*' 'getStateVal\("playerData",\s*[^,\n]+,\s*"hunger"\)'
rg -n --glob '{core,lib,.dev}/**/*' 'setStateVal\([^,\n]+,\s*"playerData",\s*[^,\n]+,\s*"hunger"\)'
```

These catch stale top-level hunger paths. Correct direct path is `"stats", "hunger"`; preferred color-facing API is `S.getPlayerVal(color, "hunger")` / `S.setPlayerVal(color, "hunger", value)`.

```text
rg -n --glob '{core,lib,.dev}/**/*' 'S\.getPlayerVal\([^,\n]+,\s*"[^"]+"' | rg -v '"hunger"'
rg -n --glob '{core,lib,.dev}/**/*' 'S\.setPlayerVal\([^,\n]+,\s*"[^"]+"' | rg -v '"hunger"'
```

`S.getPlayerVal` / `S.setPlayerVal` should remain hunger-only unless the state module is extended with explicit nested-key support.

```text
rg -n --glob '{core,lib,ui,.dev}/**/*' 'allZonesLocked|enforceActiveSeatLighting'
rg -n --glob '{core,lib,ui,.dev}/**/*' 'currentScene|sceneTransition|lightingPresetKey'
rg -n --glob '{core,lib,.dev}/**/*' 'virtualHandZoneAnchors|S\.getStateVal\("npcs",\s*"ui"\)|S\.setStateVal\([^,\n]+,\s*"npcs",\s*"ui"\)'
```

These are targeted watch patterns for the current audit's fragile keys.
