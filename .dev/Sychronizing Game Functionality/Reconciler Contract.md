# Reconciler Contract

This is the current authoritative contract for Toronto Rising synchronization. It describes the code as implemented today, not the older proposal draft. Historical behavior belongs in explicitly labeled historical sections only.

Related docs:

- [Synchronization Architecture Proposal](Synchronization%20Architecture%20Proposal.md)
- [Dual-apply survey](Dual_apply_survey.md)
- [SOLVING ISSUES & DEBUGGING](../SOLVING%20ISSUES%20%26%20DEBUGGING.md)
- [`core/sync.ttslua`](../../core/sync.ttslua)

## Core rule

`gameState` is the source of truth for intended game state. Mutation APIs write `gameState`; reconciler APIs apply the live TTS world so it matches `gameState`.

New code must follow this shape:

1. Mutate state through `S.setStateVal`, `S.setPlayerVal`, or a domain mutation API.
2. Call the narrowest sync entry point that covers the affected world:
   - `Sync.player(color)` for one PC seat's lights, HUD, overlays, and hunger pulse.
   - `Sync.full(opts)` for scene, soundscape, seat presentation, NPC scene layout, global UI, and scene-library mirrors.
   - Domain reconciler APIs only when the domain is the whole affected scope.
3. Do not hide live-world writes inside setters.
4. Do not drive the same physical channel twice in one flow unless a fingerprint is primed or invalidated deliberately.

## Current exceptions to pure read-only reconcilers

The desired contract is "reconcilers do not write `gameState`." Current code still has these explicit exceptions. Do not copy these patterns into new domains.

| Function | Current state write | Contract status |
|---|---|---|
| `Scenes.reconcileFromState` | Repairs invalid `gameState.currentScene` to `"default"`. | Existing self-healing fallback; prefer validating before reconcile in new code. |
| `L.reconcileForPlayer` | Stores derived named modes in `gameState.lights[lightRef]` before applying seat lights. | Existing lighting model persists resolved light modes; treat as a known exception. |
| `L.reconcileLightRef` | Defaults missing `gameState.lights[lightRef]` to `"OFF"` when possible. | Existing repair behavior for saved light state. |
| `L.SetLightMode` | Persists mode or sanitized inline patch to `gameState.lights[lightRef]`. | Lower-level lighting apply API; not a pure reconciler. |
| `NPCS.restoreAfterStateLoad` | Sanitizes `gameState.npcs.instances` and seated NPC records. | Bootstrap restore/sanitization, not a runtime reconciler. |
| `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked` | Writes live `gameState.sessionScene` into linked `gameState.sceneLibrary.scenes[K].sessionScene`. | Intentional post-reconcile mirror; it is not reconciler-shaped. |

## `Sync.full(opts)` order

`Sync.full` is a thin orchestrator. It delegates; it must not grow business rules.

Runtime order:

1. Normalize `opts`; `force = opts.force == true`; print `opts.reason` when present.
2. Build `reconcileOpts = { force = true }` only when forced, otherwise `{}`.
3. `Scenes.reconcileFromState(reconcileOpts)`.
4. `Scenes.reconcileTopFogFromState(reconcileOpts)`.
5. `Soundscape.reconcileFromState(reconcileOpts)`.
6. Seat presentation:
   - Bootstrap first pass only:
     1. `NPCS.registerRestoredInstancesFromState()`.
     2. `L.InitLights()`.
     3. `L.reconcileAllPlayers()` + `HO.syncAll()` via `reconcileSeatPresentationFromState`.
     4. Schedule unified bootstrap retries at `0.35`, `1.0`, `1.5`, `2.5`, `3.0`, `5.0`, and `8.0` seconds (each tick: `L.InitLightsDeferred()`, seat presentation, `Sync.ui({ overlays = true })`).
     5. After UI refresh: `NPCS.ensureAllNpcsPreloaded({ deferUiRefresh = true })` (batched spawns).
   - Runtime passes:
     1. `L.reconcileAllPlayers()`.
     2. `HO.syncAll()`.
7. `NPCS.reconcileSessionSceneNpcWorldFromState({ deferUiRefresh = true })`.
8. `NPCS.reconcileOccupiedNpcSeatsFromState({ deferUiRefresh = true })` — table seats from `seatLayout.occupiedNPCSlots` / `sessionScene.seatSlots` (after step 7 so `byArea` stash does not leave seats empty).
9. Bootstrap first pass only: `HUDP.reconcileCameraOverlaySelfMatchRowsFromXmlDefaults()`.
10. UI refresh:
   - `force = true`: `Sync.ui()` with full `UpdateUIDisplays` breadth.
   - incremental: `Sync.ui(SYNC_INCREMENTAL_UI_DELTA)`.
11. `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked()`.
12. Bootstrap first pass only:
    - `RUI.refreshAll()` when available.
    - Schedule `NPCS.refreshStorytellerUIIfVisible()` after `0.15` seconds.
    - Overlay-only UI retries are folded into the unified bootstrap retry schedule (step 5 above).
13. Set `didBootstrapFullSync = true`.

`SYNC_INCREMENTAL_UI_DELTA` contains `phase`, `scene`, `adminLighting`, `scenesPanel`, `gameStateOverlay`, `soundscape`, `playerStats`, and `playerHud`. It intentionally omits `overlays` because `HO.syncAll()` already ran in the seat presentation step.

## `Sync.player(color)` scope

`Sync.player(color)` is a cheap per-seat path for hunger, roll, condition, and player HUD changes.

Order:

1. Reject non-string or empty `color`.
2. `L.reconcileForPlayer(color)`.
3. `HUDP.updatePlayerUI(Player[color], color)` only when `Player[color]` exists.
4. `HO.reconcileForSeat(color)`.
5. `HUP.reconcileForSeat(color)`.
6. `UpdateUIDisplays({ playerStats = true, colors = { color } })` when the global exists (no `overlays` or all-player `playerHud` — those are covered by steps 3–5).

It skips scene ambient lighting, top fog, soundscape, NPC scene layout, scene-library mirroring, bootstrap light initialization, deferred retries, and full Storyteller panel refresh. Those domains do not depend on a single PC hunger/roll/HUD mutation.

When `Sync.full({ force = true })`, `L.invalidateReconcileCache()` runs before seat presentation, and `NPCS.reconcileSessionSceneNpcWorldFromState` receives `forceSessionNpcWorld = true`.

## Public reconciler and sync entry points

| Entry point | Trigger | Reads | Applies | Must not write | Idempotency / opts |
|---|---|---|---|---|---|
| `Scenes.reconcileFromState(opts)` | `Sync.full`, `Sync.lighting`, `Scenes.onLoad` | `gameState.currentScene`, `gameState.sceneTransition`, `gameState.sessionScene.lightingPresetKey`, `C.LightModes`, `Scenes.SCENES` | Global `Lighting.set`, `U.applyLightingPreset`, legacy scene `L.SetLightMode`, legacy scene music/soundscape extras | Writes invalid `currentScene` fallback today; no other state writes expected | `lastSceneReconcileFingerprint`; `{ force = true }`; `Scenes.invalidateReconcileCache()` |
| `Scenes.reconcileTopFogFromState(opts)` | `Sync.full`, `Sync.lighting`, bootstrap seat retries | `gameState.sessionScene.isTopFogActive`, `G.GUIDS.TOP_FOG` | `TOP_FOG` object `setState(2)` on / `setState(1)` off | Confirmed no state writes | `lastTopFogReconcileFingerprint`; `{ force = true }`; `Scenes.invalidateReconcileCache()` |
| `Soundscape.reconcileFromState(opts)` | `Sync.full`, `Sync.soundscape`, save-prepare repair path | `gameState.soundscape.siteSilent`, `backgroundMusicEnabled`, `backgroundMusicMode`, `locationMusic`, `musicMood`, `location`, `weather`, `rain`, `wind`, `thunderEnabled` | AssetBundle audio tracks, volumes, mute, weather layers through soundscape setters | Reconciler body does not write directly; delegated setters update soundscape state as part of existing eager apply model | `lastSoundscapeReconcileFingerprint` + `pendingSoundscapeReconcileFingerprint` + generation token; `{ force = true }`; `markReconciledToCurrentState` / `commitEagerSteadyState` / `invalidateReconcileCache` |
| `L.reconcileForPlayer(seatKey, opts?)` | `Sync.player`, `L.reconcileAllPlayers`, `L.onDiceDrawerStateChanged` | `gameState.currentScene`, `gameState.sessionScene.seatPresent`, `gameState.sessionScene.lightingSeatSpotlightPreset`, `gameState.seatLayout.*`, `gameState.playerData[id].lighting.isRolling`, `gameState.playerData[id].conditions[*].lightingModeChanges`, `gameState.playerData[id].stats.hunger`, `L.LIGHTMODES`, `C.PlayerColors`, `C.NPCSeats` | Seat `L.SetLightMode` for PC and NPC seat refs | Writes `gameState.lights[lightRef]` for named modes today | `lastReconciledModeByRef` skips redundant apply; `opts.force` bypasses cache; `L.invalidateReconcileCache()` clears cache for repair |
| `L.reconcileAllPlayers(opts?)` | `Sync.full`, deferred bootstrap retries, layout repair paths | Same as `L.reconcileForPlayer` for all `C.PlayerColors` and `C.NPCSeats` | All PC and NPC seat light refs | Same as `L.reconcileForPlayer` | Forwards `opts` to each seat |
| `L.reconcileLightRef(lightRef, transitionTime)` | `Sync.lightRef`, `L.InitLights`, `L.InitLightsDeferred`, NPC light mode apply | `gameState.lights[lightRef]`, `L.LIGHTMODES[lightRef]`, live light object | Non-seat or targeted `L.SetLightMode`; can force `enabled=false` when no saved mode and no `OFF` mode | Writes missing `gameState.lights[lightRef] = "OFF"` when possible | No fingerprint; returns `false` when object is not ready so deferred init can retry |
| `NPCS.reconcileSessionSceneNpcWorldFromState(opts)` | `Sync.full` after seat presentation | `gameState.sessionScene.npcWorld.byArea`, `gameState.npcs.instances`, NPC data tables | Stash/preload figurines, spawn or move NPCs into authored areas, NPC spotlight mode options, NPC panel/seat layout refresh when deferred | Function does not call `S.setStateVal` directly, but spawn/move helpers update `gameState.npcs.instances`, `gameState.seatLayout.occupiedNPCSlots`, and `gameState.lights` | `lastSessionNpcWorldFingerprint`; `{ forceSessionNpcWorld = true }`; `{ deferUiRefresh = true }` |
| `NPCS.reconcileOccupiedNpcSeatsFromState(opts)` | `Sync.full` immediately after session `npcWorld` reconcile | `gameState.seatLayout.occupiedNPCSlots` (from `sessionScene.seatSlots` via `S.validateState`) | `assignNpcToSeat` / `clearNpcSeat` for table seat slots | Same helpers as manual seating | `lastOccupiedNpcSeatsFingerprint`; `{ forceOccupiedNpcSeats = true }`; `{ deferUiRefresh = true }` |
| `NPCS.restoreAfterStateLoad()` | First `Sync.full` bootstrap; `Sync.npcCutouts` direct API | `gameState.npcs.instances`, occupied NPC seat map, `C.NPCSeats` | Figurine physics lock, spotlight tag registration, NPC spotlight mode registration, preload pool ensure, seat-layout sync request | Sanitizes and rewrites `gameState.npcs.instances`; may update seated records | Bootstrap-only in `Sync.full`; no fingerprint |
| `HUDP.reconcileCameraOverlaySelfMatchRowsFromXmlDefaults()` | First `Sync.full` bootstrap before UI refresh | `C.PlayerColors`; XML defaults | `UI.setAttribute("cameraControls_otherControls<Seat>_<Seat>", "active", "false")` | Confirmed no state writes | One-shot via `didBootstrapFullSync` |
| `HUDP.updatePlayerUI(player, color)` | `Sync.player`, `UpdateUIDisplays({ playerHud = true })`, HUD panel handlers | `gameState.playerData[id].hud`, `gameState.sessionScene.districtKey`, `gameState.sessionScene.siteKey`, other seats via player ID lookup, `C.Sites`, `C.Districts` | Player HUD `active`, sidebar hover/active colors, reference panels, coterie popup images, map pins, location dock cards, camera overlay rows | Confirmed no state writes in `updatePlayerUI`; HUD click handlers mutate state before calling it | Local UI caches including `lastLocationDockUiCache`; delegates local `reconcileLocationDockCardsFromState` |
| `HO.reconcileForSeat(seatColor)` | `Sync.player` | Same as `HO.syncAll` for one seat | Condition/hunger overlays + hunger smoke for that seat | Confirmed no state writes | Does not run hunger pulse animation |
| `HO.syncAll()` | `Sync.full`, `UpdateUIDisplays({ overlays = true })` | `gameState.playerData[id].conditions[*].hudChanges`, `gameState.playerData[id].stats.hunger`, `C.PlayerColors` | Loops `HO.reconcileForSeat`, then `HUP.syncHungerPulseAll()` | Confirmed no state writes | Uses `lastVisible` cache for non-hunger overlays; `HO.invalidateSeatCache(color)` |
| `HUP.reconcileForSeat(seatColor)` | `Sync.player` | Hunger per seat from player data / player value helpers | Pulse overlay alpha + heartbeat for hunger 4/5 on that seat | Confirmed no state writes | `pulseGenByColor` invalidates stale delayed callbacks |
| `HUP.syncHungerPulseAll()` | End of `HO.syncAll()` | All `C.PlayerColors` | Loops `HUP.reconcileForSeat` | Confirmed no state writes | Full-seat pulse repair path |
| `GameStateOverlay.reconcileFromState()` | `UpdateUIDisplays` when full, `gameStateOverlay`, `phase`, or `scenesPanel`; clock tick at zero speed | `gameState.currentPhase`, `gameState.sessionScene.districtKey`, `gameState.sessionScene.siteKey`, `gameState.sessionScene.clock`, `C.Sites`, `C.Districts` | Center-top overlay `UI.setValue` and `UI.setAttribute` | Confirmed no state writes | `overlayTextCache`, `overlayActiveCache`; hides/clears outside phases that show narrative clock |
| `UpdateUIDisplays(delta)` | `Sync.ui`, direct legacy HUD refresh paths | `gameState.currentPhase`, `currentScene`, player stats/HUD, soundscape summary, panel state, `delta` flags | Global and player UI via cached `UI.setValue`, `HUDP.updatePlayerUI`, `HO.syncAll`, `StorytellerScenesPanel.refresh`, `GameStateOverlay.reconcileFromState`, NPC/PCST refresh helpers | Confirmed no direct state writes | `UI_DISPLAY_CACHE`; nil `delta` means full refresh |
| `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked()` | End of every `Sync.full` | `gameState.sceneLibrary.activeKey`, `gameState.sceneLibrary.scenes[K].receivesLiveWrites`, live `gameState.sessionScene` | No world I/O | Writes `gameState.sceneLibrary.scenes[K].sessionScene` | No-op unless active linked row receives live writes; post-reconcile mirror, not a reconciler |

## Local reconcile helpers worth knowing

| Helper | Owner | Trigger | Reads | Applies | Notes |
|---|---|---|---|---|---|
| `reconcileSeatPresentationFromState()` | `core/sync.ttslua` | `Sync.full` runtime and bootstrap/deferred retries | Delegates to lighting and overlays | `L.reconcileAllPlayers`, `HO.syncAll` | Local fan-out helper only. |
| `reconcileLocationDockCardsFromState(seatColor)` | `core/hud_player.ttslua` | `HUDP.updatePlayerUI` | `gameState.sessionScene.districtKey`, `gameState.sessionScene.siteKey`, `C.Sites`, `C.Districts` | Location dock image visibility and current-site sprite refs | Local, not public. |
| `reconcileLocationRowFromState()` | `core/game_state_overlay.ttslua` | `GameStateOverlay.reconcileFromState` | `gameState.sessionScene.districtKey`, `gameState.sessionScene.siteKey` | Center overlay district/site text and parent-site row active flags | Local, not public. |
| `reconcileOverlayAfterClockTick(...)` | `core/game_state_overlay.ttslua` | `GameStateOverlay.tickRealTimeClock` after clock mutation | Current phase / overlay visibility helpers; new clock args | Date/time overlay text only | Local partial UI updater, not called from `Sync`. |

## Mutation -> reconcile cheat sheet

| User action / feature | Required mutation | Required sync sequence | Notes |
|---|---|---|---|
| Hunger change from PC/ST panel or rouse | `S.setPlayerVal(color, "hunger", nextValue)` | `Sync.player(color)` | Covers seat light priority, player HUD, overlays, hunger smoke, and hunger pulse. Existing examples: `core/pc_storyteller_panel.ttslua`, `core/roll_controller.ttslua`, `core/debug.ttslua`. |
| Condition changes with HUD or lighting effects | Write condition data under `gameState.playerData[id].conditions` through the owning condition/stat API | `Sync.player(color)` | Lighting reads `lightingModeChanges`; overlays read `hudChanges`. |
| Admin light scene change | `S.setStateVal(sceneName, "currentScene")`, `S.setStateVal(presetKey, "sessionScene", "lightingPresetKey")`, clear `sceneTransition` | `Sync.full({ reason = "..." })` | Do not call `Lighting.set` directly from the handler. |
| Storyteller scene library Apply | Replace `gameState.sessionScene` / linked scene state through the scene-library panel path | Apply soundscape context eagerly only when followed by `Soundscape.markReconciledToCurrentState()`, then `Sync.full({ reason = "StorytellerScenesPanel.sceneLibraryApply" })` | This is a mitigated dual-apply flow. |
| Site/location Apply | `S.setStateVal(districtKey or nil, "sessionScene", "districtKey")`, `S.setStateVal(siteKey, "sessionScene", "siteKey")` | `Soundscape.applyContext(ctx)`, `Soundscape.markReconciledToCurrentState()`, `Sync.full({ reason = "StorytellerScenesPanel.location" })` | If new code can avoid eager soundscape apply, prefer state-only mutation plus `Sync.full`. |
| Weather clock tick | `S.setStateVal("none", "soundscape", "weather")`, then soundscape weather setters for rain/wind/thunder | On full success, `Soundscape.markReconciledToCurrentState()`; on partial failure, `Soundscape.invalidateReconcileCache()` | This is the fixed pattern in `lib/chronicle_weather.ttslua`. |
| Seat presence toggle | Mutate `gameState.sessionScene.seatPresent[seatKey]` | Current code calls `L.reconcileAllPlayers()`, refreshes scenes panel, then `UpdateUIDisplays({ playerHud = true })` | This is scoped and does not need `Sync.full` unless other scene domains changed. |
| Table layout switch | `S.setStateVal(tableKey, "sessionScene", "tableKey")` | `RSL.SetTableTo(tableKey)`, then `Sync.full({ reason = "StorytellerScenesPanel.table" })` | Rotational layout is a world-layout exception; after it moves objects, sync returns lighting/overlays to state-derived authority. |
| Session-scene NPC `byArea` layout | Mutate `gameState.sessionScene.npcWorld.byArea` | `Sync.full()` or direct `NPCS.reconcileSessionSceneNpcWorldFromState({ deferUiRefresh = true })` when only that slice changed | Reconciler fingerprints authored layout and uses NPC spawn/move helpers. |
| Manual NPC panel spawn/move | Use `NPCS.spawnOrMoveIndividual`, `NPCS.moveNpcToArea`, or `NPCS.dispatchNpcUiClick` | Let NPC helpers refresh panel/seat layout; call `Sync.full()` only if scene/session state also changed | Do not duplicate HUD spawn paths around `reconcileSessionSceneNpcWorldFromState`. |

## Anti-patterns reviewers should grep for

Use these patterns before accepting sync-affecting work:

| Pattern | Why it is risky | Expected shape |
|---|---|---|
| `\\.getComponent.*Light|lightComp\\.set|\\.set\\("enabled"|\\.set\\("range"|\\.set\\("intensity"|\\.set\\("spotAngle"` outside `core/lighting.ttslua` and debug/test files | Direct light component writes bypass `gameState.lights` and lighting transition epochs. | Use `L.SetLightMode`, `L.reconcileForPlayer`, `L.reconcileAllPlayers`, or `Sync.lightRef`. |
| `Soundscape\\.applyContext` near `Sync\\.full` without `Soundscape\\.markReconciledToCurrentState` | Eager emitter apply plus `Sync.full` can stack duplicate fades. | Prefer state-only mutation plus `Sync.full`, or prime the fingerprint after eager apply. |
| `Soundscape\\.invalidateReconcileCache` after successful eager apply | Forces duplicate physical apply even though world already matches state. | Use `markReconciledToCurrentState` on success; reserve invalidation for partial failure or world drift. |
| `function S\\.|S\\.setStateVal.*Sync\\.|S\\.setPlayerVal.*Sync\\.` in setters/state modules | Hidden setter-side reconciliation reintroduces dual authority. | Mutation site calls `Sync.*` explicitly after the state write. |
| `UpdateUIDisplays\\(\\)` immediately after `Sync.full\\(\\)` | Full sync already runs UI refresh; an extra full UI pass can duplicate overlay/HUD work. | Use the existing `Sync.full` result, or choose a narrow `Sync.ui(delta)` when only UI changed. |
| `HO\\.syncAll\\(\\)` in a flow that also calls incremental `Sync.full()` | `Sync.full` already runs overlays through seat presentation. | Call `Sync.player(color)` for hunger/condition work, or rely on `Sync.full`. |
| Direct writes to `gameState.playerData[color]` or `S.state.playerData[color]` | Per-player state must be keyed by Steam ID, not seat color. | Resolve ID and write through `S.setPlayerVal` or `S.setStateVal("playerData", playerID, ...)`. |

## Dual-apply survey status

See [Dual_apply_survey.md](Dual_apply_survey.md) for the source inventory.

| Survey row | Current status | Contract note |
|---|---|---|
| Soundscape scene/library flows | Mitigated. Scene/library eager `applyContext` flows prime `Soundscape.markReconciledToCurrentState()` before `Sync.full`. | New eager soundscape apply paths must do the same, or avoid eager apply. |
| Chronicle weather | Mitigated in current code. Success marks reconciled; partial failure invalidates cache. | This is the model for weather ticks. |
| Scenes presets | Mitigated by `Scenes.reconcileFromState` fingerprint and seat presets flowing through lighting reconciliation. | Keep seat physical apply in `L.reconcileForPlayer`. |
| Lighting seats | Open minor redundancy: `Sync.full` and some scoped handlers may reconcile seats in adjacent calls, but `L.reconcileForPlayer` is state-derived and transition-epoch guarded. | Avoid adding direct `L.SetLightMode` calls in panel handlers. |
| NPC session layout | Mitigated by `NPCS.reconcileSessionSceneNpcWorldFromState` fingerprint. | Keep authored `sessionScene.npcWorld.byArea` through this reconciler. |
| Overlays / HUD | Open minor redundancy: UI-only double refresh is usually no-op, but it can restart hunger pulse via `HO.syncAll`. | Prefer narrow deltas and avoid `HO.syncAll` next to `Sync.full`. |
| End scene narrative | Intentional force re-sync after manual ambience clears. | Keep `invalidateReconcileCache` only because live world was deliberately driven outside the normal snapshot. |
| Table layout | Documented exception. `RSL.SetTableTo` owns physical table movement; `Sync.full` reasserts state-derived lighting/overlay presentation afterward. | Do not add a second table movement path in `Sync.full`. |

## Review checklist for new features

- Does the handler write `gameState` first?
- Is the sync scope as narrow as possible?
- If a domain setter already touched emitters/lights/spawns, does the next `Sync.full` skip or intentionally reapply?
- Does the code avoid new state writes inside reconcilers?
- Are per-player writes keyed by Steam ID, not color?
- Does bootstrap-only work remain guarded by `didBootstrapFullSync` or an equivalent one-shot mechanism?
- Is any new force option paired with a concrete cache invalidation reason?
