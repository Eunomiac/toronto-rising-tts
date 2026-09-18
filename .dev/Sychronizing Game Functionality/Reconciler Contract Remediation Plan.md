# Reconciler Contract Remediation Plan

This plan reviews the current codebase against [Reconciler Contract](Reconciler%20Contract.md) after the 2026-05-19 audit/fix commits on `master`. It lists remaining violations, documented exceptions that still need cleanup, and an implementation plan for remediation.

## Goal

Keep `gameState` as the single source of truth:

- mutation APIs write intent to `gameState`;
- reconcilers apply live TTS world state from `gameState`;
- eager world writes either avoid `Sync.full` or prime/invalidate the correct fingerprint;
- bootstrap/debug/ephemeral UI exceptions stay explicit and do not become feature patterns.

## Current state of the contract

Already mitigated in the current tree:

- `Sync.player` is seat-scoped: it calls `L.reconcileForPlayer`, `HUDP.updatePlayerUI`, `HO.reconcileForSeat`, `HUP.reconcileForSeat`, and scoped `UpdateUIDisplays({ playerStats = true, colors = { color } })`.
- Steady-state Storyteller Sound HUD actions call `Soundscape.commitEagerSteadyState(ok)`.
- Soundscape deferred reconcile uses pending fingerprint / generation protection.
- Seat-light reconciliation has `lastReconciledModeByRef` and `L.invalidateReconcileCache()` for force repair.
- NPC session scene placement fingerprints only after successful placement.
- Bootstrap retries are unified into one `Sync.full` retry schedule.

## Findings by priority

### P1 - Correctness risks

| ID | Violation | Evidence | Risk | Remediation |
|---|---|---|---|---|
| RC-01 | Reset mutates state but does not reconcile the live world. | `core/global_script.ttslua:1302-1312` destroys NPCs, resets state, calls `Scenes.resetScene(0)`, then only `UpdateUIDisplays()`. | UI labels can reset while lighting, fog, soundscape, seat presentation, NPC scene layout, and reconcile caches remain from the previous world. | Replace the UI-only tail with `Sync.full({ force = true, reason = "HUD_resetGame" })`. Add a sync bootstrap reset helper if reset should re-run first-load retries. |
| RC-02 | Async table switching runs `Sync.full` before geometry finishes. | `core/storyteller_scenes_panel.ttslua:592-595` calls `RSL.SetTableTo(tableKey)` then `Sync.full` immediately. Scene-library apply does the same at `486` and `538-539`. `lib/rotational-seat-layout.ttslua:2928-2936` delays real table movement. | Seat lights, overlays, and NPC scene layout can reconcile against old table geometry; RSL later performs another presentation handoff. | Add `RSL.SetTableTo(tableKey, { onComplete = fn })` or equivalent. Call `Sync.full` from completion for async switches; keep immediate sync only for same-table synchronous repair. |
| RC-03 | Scene/library and location apply mark soundscape reconciled without checking `applyContext` result. | `core/storyteller_scenes_panel.ttslua:521-524` and `702-704` call `SS.applyContext(...)`, then unconditionally `SS.markReconciledToCurrentState()`. | If `applyContext` partially fails, the fingerprint can be primed while emitters do not match state, causing later incremental sync to skip recovery. | Replace with `SS.commitEagerSteadyState(result and result.ok == true)`; on failure, cache should invalidate rather than mark. |
| RC-04 | Seat absence can fail to turn lights off because the priority check is gated by an unwritten flag. | `core/lighting.ttslua:1368-1370` reads `seatLayout.enforceActiveSeatLighting`; `1454-1456` only applies absent-seat `OFF` when the flag is true. No writer for the flag was found in production code. | Contract priority says `DARK/absent` resolves to `OFF`; absent players can keep seat lights if the flag is unset. | Remove the dead flag gate or initialize/write it deliberately. Preferred: `seatPresenceOff = not L.isPlayerPresentInActiveSeatLayout(seatKey)`. |

### P2 - Duplicate apply, scope leaks, and undocumented exceptions

| ID | Violation / debt | Evidence | Risk | Remediation |
|---|---|---|---|---|
| RC-05 | Overlay refresh helpers still duplicate `Sync.player` work. | `lib/pc_stats.ttslua:221-223`, `456-457`, `485-486`, `515-516`, `832-833`; `core/pc_storyteller_panel.ttslua:265-291`; `core/roll_controller.ttslua:1192-1224`. | Paths that already call `Sync.player` can still run all-seat `HO.syncAll()` or repeated seat overlay refreshes, restarting pulse loops and doing unnecessary UI work. | Remove `P.refreshHudOverlays()` after `P.applyActiveConditionPresentation()` and `Sync.player`. For the roll UI frame race, keep one documented deferred `HO.reconcileForSeat`/`HUP.reconcileForSeat` if still required. |
| RC-06 | Seat-presence toggle bypasses `Sync` entry points. | `core/storyteller_scenes_panel.ttslua:621-628` mutates `sessionScene.seatPresent`, then calls `L.reconcileAllPlayers()` and `UpdateUIDisplays({ playerHud = true })` directly. | This is currently documented as scoped behavior, but it is easy to miss future domains affected by presence changes. | Introduce a narrow `Sync.seatPresentation(opts)` or call `Sync.full({ reason = "StorytellerScenesPanel.seatPresent" })` if presence should affect overlays/NPCs/soundscape. Update the contract cheat sheet. |
| RC-07 | Bootstrap retry ticks run overlays twice. | `core/sync.ttslua:121-124` calls `reconcileSeatPresentationFromState({})` (which calls `HO.syncAll`) and then `Sync.ui({ overlays = true })` (which calls `HO.syncAll` again). | Load-time retries restart overlay/pulse work twice per retry. It is bootstrap-only but measurable. | Either keep seat presentation and remove overlay UI delta, or split `Sync.ui` delta to refresh non-overlay UI only after seat presentation. Validate with `sync_metrics` before reducing offsets. |
| RC-08 | `NPCS.registerRestoredInstancesFromState` writes state during bootstrap sync but is not named in the contract exception list. | `core/sync.ttslua:232` calls it directly; `core/npcs.ttslua:1940-1987` sanitizes `npcs.instances`, sets `seatedSeatKey`, and requests seat layout sync. | The contract names `NPCS.restoreAfterStateLoad`, but current `Sync.full` calls the split helper. Contributors may miss this bootstrap repair exception. | Either add `NPCS.registerRestoredInstancesFromState` to the contract exceptions or move the repair back under a single documented bootstrap API. |
| RC-09 | `U.applyLightingPreset` writes `sessionScene.lightingSeatSpotlightPreset` during scene reconcile. | `core/scenes.ttslua:495-496` calls `applyAmbientLighting`; `lib/util.ttslua:2200`, `2207`, and `2237` write the seat spotlight preset. | Scene reconcile still derives and persists state while applying ambient lighting. | Move seat spotlight baseline derivation to scene/admin mutation paths. If kept, list it as a temporary contract exception. |
| RC-10 | Lighting bootstrap sanitizes state inside `Sync.full`. | `core/sync.ttslua:233` / `235` call `L.InitLights` / `L.InitLightsDeferred`; lighting init calls cleanup/sanitizer before applying saved lights. | Bootstrap applies live lights and repairs `gameState.lights` in the same path. | Move cleanup to state validation/save-prepare, or document `L.InitLights` sanitizer as bootstrap repair debt. |
| RC-11 | `L.reconcileForPlayer` still double-persists named modes. | The audit found the reconcile pre-write and then `L.SetLightMode` persistence in `core/lighting.ttslua`. | Both writes target `gameState.lights[lightRef]`, obscuring ownership even with redundant lerps mitigated. | Remove the pre-`SetLightMode` write or split `L.SetLightMode` into persist/mutate and apply-only helpers. |
| RC-12 | NPC session-world reconcile can indirectly trigger RSL state writes. | `NPCS.reconcileSessionSceneNpcWorldFromState` requests seat-layout sync; RSL can write `seatLayout.currentTableKey`, camera angles, and light state while resolving geometry. | NPC scene placement reconciliation can pull in table/camera/light state repair outside a single domain boundary. | Stop queuing `RSL.SyncTable` from session NPC world reconcile unless table geometry changed; move tag-inferred table repair and camera-angle persistence to explicit table mutation/validation. |

### P3 - Direct object channels and stale paths

| ID | Item | Evidence | Risk | Remediation |
|---|---|---|---|---|
| RC-13 | Signal fire uses position as state and has no reconciler. | `ui/ui_signal_candle.ttslua:65`; `core/objects.ttslua:102-163`. | Signal fire cannot be restored by `Sync.full` and is not persisted in `gameState`. | Add a state slice such as `gameState.props.signalFire[color]` and a signal-fire reconciler; click mutates state then reconciles. |
| RC-14 | Dice drawer pose is direct world I/O while rolling lights are state-derived. | `lib/dice_drawer.ttslua:66-102`. | Drawer open/closed pose cannot be restored from state, unlike rolling light state. | Decide whether drawer pose is ephemeral roll choreography or persisted runtime state. If persisted, add `DiceDrawer.reconcileForSeat(color)`. If ephemeral, document as a roll-physics exception. |
| RC-15 | Character sheet page navigation/object UI is direct object I/O. | `ui/ui_csheet.ttslua:169-191`, `254-277`, `457-478`. | Page spread/visibility is not state-backed if it needs to survive reload or sync. | Decide whether sheet page spread is persistent HUD state. If yes, store it under `playerData[id].hud` and add a sheet reconciler; if no, document as object-local UI. |
| RC-16 | `Scenes.onLoad` is stale and bypasses `Sync.full` if used. | `core/scenes.ttslua:532-545`; no repo call sites found. | Dead restore path can mislead future work. | Remove it or mark it historical/deprecated and route load restore through `Sync.full` only. |
| RC-17 | `SceneLibrary.applySoundscapeNarrativePartial` is unused and delegates to an uncommitted eager apply helper. | `core/scene_library.ttslua:311-315`; `core/soundscape.ttslua:1612-1620`. | Future callers could apply soundscape narrative without `commitEagerSteadyState`. | Delete the unused wrapper/helper or make `Soundscape.applySessionSceneNarrativeOverrides` call `commitEagerSteadyState(result.ok)`. |
| RC-18 | Redundant panel refreshes after `Sync.full`. | `StorytellerScenesPanel.refresh()` immediately follows some `Sync.full` calls even though incremental UI includes `scenesPanel`. | UI-only redundancy; low correctness risk. | Clean up opportunistically after higher-priority sync flow fixes. |

## Implementation plan

### Unit 1 - Reset and soundscape correctness

**Files:** `core/global_script.ttslua`, `core/storyteller_scenes_panel.ttslua`, `core/soundscape.ttslua`, `Reconciler Contract.md`, this plan.

1. Change `HUD_resetGame` to call `Sync.full({ force = true, reason = "HUD_resetGame" })`.
2. Add/export a `Sync.resetBootstrapState()` helper if reset needs first-load retry behavior.
3. Replace unconditional `markReconciledToCurrentState()` after scene-library/location `applyContext` with `commitEagerSteadyState(result.ok)`.
4. Add or update tests around failed `applyContext` so failure invalidates rather than primes the fingerprint.

### Unit 2 - Table layout timing

**Files:** `lib/rotational-seat-layout.ttslua`, `core/storyteller_scenes_panel.ttslua`, sync docs.

1. Extend `RSL.SetTableTo(tableKey, opts)` with `opts.onComplete`.
2. Invoke completion only after delayed table resolve, default camera, and blindfold-off flow reaches a stable point.
3. Move table-toggle and scene-library `Sync.full` calls into the completion callback for async switches.
4. Keep same-table `SyncTable` repair synchronous, or return a status so callers know whether completion is immediate.
5. After completion-gated sync works, remove RSL's internal `L.reconcileAllPlayers` / `HO.syncAll` boundary or document why it remains.

### Unit 3 - Overlay and seat-presentation cleanup

**Files:** `lib/pc_stats.ttslua`, `core/pc_storyteller_panel.ttslua`, `core/roll_controller.ttslua`, `core/storyteller_scenes_panel.ttslua`, `core/sync.ttslua`, `core/lighting.ttslua`.

1. Remove `P.refreshHudOverlays()` calls that follow `P.applyActiveConditionPresentation()` or `Sync.player`.
2. Replace rouse post-sync overlay work with one scoped deferred `HO.reconcileForSeat` + `HUP.reconcileForSeat` only if the TTS frame race remains reproducible.
3. Convert PC ST frenzy/blindfold toggles to `Sync.player(color)` after condition mutation.
4. Replace seat-presence direct `L.reconcileAllPlayers` with a named sync entry point.
5. Fix absence lighting by removing or initializing the dead `seatLayout.enforceActiveSeatLighting` gate.
6. Remove bootstrap retry overlay double-work or document the measured reason to keep it.

### Unit 4 - Bootstrap and reconciler state-write boundaries

**Files:** `core/sync.ttslua`, `core/npcs.ttslua`, `core/lighting.ttslua`, `lib/util.ttslua`, `core/scenes.ttslua`, `core/state.ttslua`, docs.

1. Decide whether `NPCS.registerRestoredInstancesFromState` is the new documented bootstrap repair API; update the contract if yes.
2. Move `lightingSeatSpotlightPreset` derivation out of `U.applyLightingPreset` and into mutation/validation paths, or document it as temporary reconcile-time denormalization.
3. Move light-state cleanup out of `L.InitLights`/`L.InitLightsDeferred`, or document it as bootstrap repair debt.
4. Remove duplicate `gameState.lights` writes from `L.reconcileForPlayer`.
5. Break NPC reconcile -> RSL state-repair coupling unless table geometry actually changed.

### Unit 5 - Direct object channel policy

**Files:** `ui/ui_signal_candle.ttslua`, `core/objects.ttslua`, `lib/dice_drawer.ttslua`, `ui/ui_csheet.ttslua`, state defaults, docs.

1. Add persisted signal-fire intent plus a reconciler, or document signal fire as intentionally non-persistent.
2. Decide dice drawer pose policy: ephemeral roll choreography or state-backed runtime object. Implement/document accordingly.
3. Decide character sheet page spread policy: persistent HUD state or object-local UI. Implement/document accordingly.
4. Add force-sync/load verification for any object path made state-backed.

### Unit 6 - Stale path cleanup and audit lock

**Files:** `core/scenes.ttslua`, `core/scene_library.ttslua`, `core/soundscape.ttslua`, `.dev/AVAILABLE_FUNCTIONS.md`, `Reconciler Contract.md`, `Dual_apply_survey.md`.

1. Remove or deprecate `Scenes.onLoad`.
2. Remove unused `SceneLibrary.applySoundscapeNarrativePartial` or make its soundscape apply fingerprint-safe.
3. Update function references in `.dev/AVAILABLE_FUNCTIONS.md`.
4. Re-run the contract grep sentinels and update `Dual_apply_survey.md` mitigated/open rows.

## Suggested execution order

1. Unit 1: fixes reset correctness and prevents a failed soundscape apply from hiding recovery.
2. Unit 2: fixes async table-switch ordering before more layout-dependent features land.
3. Unit 3: removes remaining redundant overlay/pulse work and fixes absence lighting.
4. Unit 4: shrinks reconciler state-write exceptions.
5. Unit 5: decides which direct object channels need state authority.
6. Unit 6: cleans stale paths and locks docs after code moves.

## Verification plan

- Run static grep checks from `Reconciler Contract.md` after every unit.
- Run `npm run build` after code changes.
- For reset: mutate scene/soundscape/lights/NPC layout, trigger reset, then verify `Sync.full({ force = true })` converges world and UI.
- For table layout: switch to a different table and apply a scene-library bundle with a table change; verify `Sync.full` runs after geometry completion.
- For soundscape: simulate an `applyContext` failure and confirm `commitEagerSteadyState(false)` leaves reconcile cache invalidated.
- For overlays: instrument `HO.syncAll`, `HO.reconcileForSeat`, and `HUP.reconcileForSeat` during damage, hunger apply, condition toggle, and rouse failure.
- For absence lighting: mark a seat absent and verify its seat lights resolve to `OFF` without requiring `seatLayout.enforceActiveSeatLighting`.
- For state-backed object channels: disturb the object, call force sync, and verify the reconciler restores it from `gameState`.
