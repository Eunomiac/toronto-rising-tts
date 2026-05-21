# Dual-apply survey: state authority vs world I/O

**Purpose:** Find places where persisted `gameState` is correct but **two code paths** drive the same **physical** channel (emitters, lights, spawns, `Wait.time` fades) in one user flow—usually **eager apply** plus **`Sync.full` → `reconcileFromState`**.

**Method:** Inventory [`core/sync.ttslua`](../../core/sync.ttslua), bounded ripgrep for `applyContext`, `Soundscape.*` + `Sync.full`, `L.SetLightMode` / `reconcileAllPlayers`, spawn APIs, `U.applyLightingPreset`, `UpdateUIDisplays` / `HO.syncAll`, and read hot handlers in [`core/global_script.ttslua`](../../core/global_script.ttslua), [`core/storyteller_scenes_panel.ttslua`](../../core/storyteller_scenes_panel.ttslua), [`lib/chronicle_weather.ttslua`](../../lib/chronicle_weather.ttslua), [`core/scenes.ttslua`](../../core/scenes.ttslua), [`core/lighting.ttslua`](../../core/lighting.ttslua), and [`core/npcs.ttslua`](../../core/npcs.ttslua).

**Orchestration order (`Sync.full`, 2026-05-19):** `Scenes.reconcileFromState` (primary: `sessionScene.lightingPresetKey` → `C.LightModes` via `U.applyLightingPreset`) → `Scenes.reconcileTopFogFromState` → `Soundscape.reconcileFromState` → bootstrap only: `NPCS.restoreAfterStateLoad`, `L.InitLights`, seat presentation (`L.reconcileAllPlayers`, `HO.syncAll`), deferred `L.InitLightsDeferred` + seat presentation retries → runtime only: seat presentation once → `NPCS.reconcileSessionSceneNpcWorldFromState({ deferUiRefresh = true })` → bootstrap-only `HUDP.reconcileCameraOverlaySelfMatchRowsFromXmlDefaults` → `Sync.ui` (full when forced, narrow delta when incremental) → `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked` → bootstrap-only deferred overlay and NPC panel refreshes.

## Fresh audit — 2026-05-19

**Result:** No new **P0 dual-apply** issue found in this pass. The prior chronicle-weather P0 is fixed in code: successful scheduled weather now primes `Soundscape.markReconciledToCurrentState()`, while partial failures still invalidate the reconcile cache for recovery.

**Notable current risks (post performance-audit implementation, 2026-05-19):**

- **Mitigated:** Storyteller Sound steady-state HUD calls `Soundscape.commitEagerSteadyState(ok)` after eager apply. Featured/debug one-shots remain un-primed.
- **Mitigated:** Seat-light reconcile skips redundant `SetLightMode` via `lastReconciledModeByRef`; `L.invalidateReconcileCache()` pairs with `Sync.full({ force = true })`.
- **Mitigated:** `Soundscape.reconcileFromState` uses pending fingerprint + generation token so duplicate deferred applies within the defer window do not stack fades.
- **Mitigated:** `Sync.player` uses per-seat overlay/pulse reconcilers and scoped `UpdateUIDisplays` (no second `HO.syncAll` from UI delta).
- **Mitigated:** `NPCS.reconcileSessionSceneNpcWorldFromState` stash → preload → place; fingerprint only on full success; `ensureAllNpcsPreloaded` batches missing spawns.
- **Open (P2):** Bootstrap still runs multiple timed retries (now one unified schedule); measure with `sync_metrics` before reducing offsets.

## Risk matrix

| Subsystem | State keys | World I/O | Eager entrypoints | Reconcile entrypoint | Risk | Mitigation pattern | Priority |
|-----------|------------|-----------|-------------------|----------------------|------|-------------------|----------|
| **Soundscape scene/location apply** | `gameState.soundscape`, `sessionScene.districtKey`, `sessionScene.siteKey`, `sessionScene.soundscapeNarrative` | AssetBundle emitters, deferred volume fades | `StorytellerScenesPanel.applyActiveLibraryScene`, `StorytellerScenesPanel.applyLocationFromInputs`, legacy `Scenes.SCENES` extras | `Soundscape.reconcileFromState` via `Sync.full` | Mitigated: eager apply is followed by `markReconciledToCurrentState`, so incremental `Sync.full` does not replay the same fingerprint | Merge site + narrative into one context; call `markReconciledToCurrentState` after successful eager apply | **P2** |
| **Storyteller Sound direct controls** | `gameState.soundscape` | AssetBundle emitters, deferred volume fades, featured one-shots | `HUD_soundscapeSetMusicMood`, `HUD_soundscapeSetBackgroundLocation`, `HUD_soundscapePlayFeatured`, `SoundscapeDebugPanel.onPlay` | None in same handler; later `Sync.full` uses `Soundscape.reconcileFromState` | Mitigated for steady-state mood/location/stop: `commitEagerSteadyState(ok)` after HUD apply. Featured/debug one-shots still un-primed | Steady-state: `commitEagerSteadyState`; one-shots: do not mark unless promoted to persistent intent | **P2** |
| **Chronicle weather** | `soundscape.weather`, `rain`, `wind`, `thunderEnabled` | Rain/wind emitters, thunder scheduler | `ChronicleWeather.applyScheduledWeather` from scene library apply, Apply clock, realtime clock tick | Next `Soundscape.reconcileFromState` via `Sync.full` | OK: prior double weather fade is fixed on success; partial failure intentionally invalidates cache | On full success: `markReconciledToCurrentState`; on partial failure: `invalidateReconcileCache` | **P2** |
| **Scenes (presets + top fog)** | `sessionScene.lightingPresetKey`, `currentScene`, `sceneTransition`, `lightingSeatSpotlightPreset`, `isTopFogActive` | Global `Lighting`, non-seat `L.SetLightMode`, top fog `setState`, legacy scene soundscape extras | `Scenes.loadScene` / `fadeToScene` / admin lighting buttons are state-only; `Scenes.onLoad` is not called by current global load path | `Scenes.reconcileFromState` + `Scenes.reconcileTopFogFromState` | OK: scene fingerprint skips duplicate ambient/top-fog apply; legacy soundscape extras mark soundscape reconciled | Keep scene world writes in reconcilers; keep seat spotlights stored for `L.reconcileForPlayer` priority | **P2** |
| **Lighting (seat presentation)** | `gameState.lights`, `sessionScene.lightingSeatSpotlightPreset`, `sessionScene.seatPresent`, `seatLayout.*`, player hunger/rolling/conditions | `L.SetLightMode`, Unity light component setters through `L.SetLightMode` | Storyteller seat toggle, `RSL.SyncTable`, NPC seat changes call `L.reconcileAllPlayers` directly | `Sync.full` → seat presentation → `L.reconcileAllPlayers`; `Sync.player` → `L.reconcileForPlayer` | Mitigated: `lastReconciledModeByRef` skips redundant `SetLightMode` when desired mode unchanged | `transitionEpoch` for stale steps; `lastReconciledModeByRef` for duplicate reconcile passes | **P2** |
| **NPCs (session scene layout)** | `npcs.instances`, `sessionScene.npcWorld`, `seatLayout.occupiedNPCSlots`, `gameState.lights[npcLight_*]` | `spawnObjectData`, figurine/light moves, NPC spotlight `L.reconcileLightRef`, `RSL.SyncTable` queue | NPC Storyteller panel spawn/move helpers; scene-library apply writes `sessionScene` then `Sync.full` | `NPCS.reconcileSessionSceneNpcWorldFromState` in `Sync.full` | Mitigated: stash → `ensureAllNpcsPreloaded` → `byArea` place; fingerprint only on full success; `ensureNpcInPreloadZone` repair on failed move only | Global preload pool is authoritative; panel helpers remain pool writers for manual moves | **P2** |
| **Overlays / HUD** | `playerData`, overlay flags, active scene/phase summaries | `HO.reconcileForSeat`, `HUP.reconcileForSeat`, `HUDP.updatePlayerUI`, `UI.*` | `Sync.player`, `UpdateUIDisplays`, Storyteller scene seat toggle | `Sync.ui` / `UpdateUIDisplays`; `Sync.full` calls `HO.syncAll` before narrow UI delta | Mitigated for `Sync.player`: per-seat overlay/pulse + `UpdateUIDisplays({ playerStats, colors })` only | Incremental `Sync.full` omits overlays after `HO.syncAll`; use `delta.colors` for seat-scoped stats/HUD | **P2** |
| **End scene narrative** | soundscape state | `setLocationAudio("none")`, weather natural volume reapply | `StorytellerScenesPanel.endSceneNarrative` | `invalidateReconcileCache` + `Sync.full` | Documented exception: world was intentionally cleared outside the normal reconcile snapshot, then forced to converge | Keep `invalidateReconcileCache` when world may be out of sync with state; do not replace with mark unless state and emitters already match | **P3** |
| **Table layout / rotational seats** | `sessionScene.tableKey`, `seatLayout.currentTableKey`, `seatLayout.occupiedNPCSlots` | `RSL.SetTableTo`, `core.hud_blindfold.runTransition` (random variant + 10s settle), seat lights/overlays at boundary | Storyteller table toggle and library scene apply wrap geometry in `HUDBF.runTransition` with `skipTransitionBlindfold` on inner `SetTableTo` | `Sync.full` does not re-call `RSL.SetTableTo`; `RSL.SyncTable` calls seat light/overlay reconcilers after geometry | Documented exception: table geometry is outside `Sync.full`; bootstrap and same-table repair can re-run idempotent seat reconciliation | Keep `RSL.SetTableTo` as the single table-geometry writer; transition blindfold is owned by `core.hud_blindfold` | **P2** |
| **Global onLoad / bootstrap** | saved `gameState` slices | early soundscape hard mute, `R.SyncTable`, scene/soundscape/lighting/NPC/UI reconcilers, deferred retry timers | `global_script.onLoad` chunk/onLoad silence, scheduled table sync, initial `Sync.full`, startup-gate `Sync.full` | Same `Sync.full` pipeline, plus bootstrap-only deferred retries | Documented exception: multiple applies are intentional load recovery while objects/components appear; not a runtime steady-state dual-apply path | Soundscape fingerprint + early silence; lighting epoch + deferred retry list; UI/overlay idempotence | **P2** |

## Prioritized fix list (2026-05-19)

No new **P0** dual-apply issues were found in this audit.

**Implemented (P1, 2026-05-19):**

1. **Storyteller Sound steady-state:** `Soundscape.commitEagerSteadyState(ok)` wired from `HUD_soundscapeSetMusicMood`, `HUD_soundscapeSetBackgroundLocation`, `HUD_soundscapeStopAll`.
2. **Seat-light redundant lerps:** `lastReconciledModeByRef` diff-skip in `L.reconcileForPlayer`, `L.reconcileLightRef`, and `L.SetLightMode`.
3. **NPC scene-layout:** stash → `ensureAllNpcsPreloaded` → `byArea` placement; fingerprint not committed when placement fails; per-NPC preload repair only on failed move.

**Implemented (performance audit, 2026-05-19):**

4. **`Sync.player` / overlay scope:** `HO.reconcileForSeat`, `HUP.reconcileForSeat`, `UpdateUIDisplays.colors`.
5. **Soundscape deferred duplicate:** pending fingerprint + generation in `Soundscape.reconcileFromState`.
6. **Bootstrap coordinator:** unified retry schedule in `core/sync.ttslua`; `NPCS.registerRestoredInstancesFromState` split from batched preload.
7. **Force repair:** `L.invalidateReconcileCache` + `forceSessionNpcWorld` on `Sync.full({ force = true })`.
8. **Metrics:** `Sync.setMetricsEnabled` / `gameState.debug.syncMetricsEnabled` → `sync_metrics` and `npc_preload` agent lines.

**Remaining:**

9. **P2 — Bootstrap tuning:** Reduce retry offsets only after `sync_metrics` load profiles justify it.
10. **P2 — HUD cross-seat split:** optional `HUDP.reconcileCrossSeatRows` if seat-scoped HUD still hot.

## Repeat survey (suggested cadence)

After adding a feature that both **mutates `gameState`** and **calls a domain setter that touches TTS objects**, grep for **`Sync.full`** on the same code path and confirm either:

- reconcile fingerprint / `markReconciledToCurrentState` prevents a duplicate physical apply, or
- the setter is **state-only** and all world writes go through `reconcileFromState` only.

## Grep-able sentinel strings

Re-run these when auditing future changes:

```text
Soundscape.applyContext|setMusicMood|setRainLayer|setWindLayer|setLocationAudio|setLocationMusic|setWeatherCondition
commitEagerSteadyState|markReconciledToCurrentState|invalidateReconcileCache|Soundscape.reconcileFromState|Sync.full|Sync.player
L.SetLightMode|lightComp.set|L.InitLights|L.reconcile|U.applyLightingPreset
spawnObjectData|spawnObject\(|NPCS\.(spawn|move|Move|restore|reconcile|ensure|ensureAllNpcsPreloaded)
UpdateUIDisplays|HO.syncAll|HUD_soundscape|HUD_scenes|HUD_sync
Wait.time|U.delay|U.scheduleAtOffsets|RSL.SetTableTo
```

## Verification

- `node .dev/scripts/soundscape_contract.test.js`
- `npm run build`
- Manual: Apply clock with chronicle weather on, then `Sync.full` incremental — rain/wind should not stutter from double fade.
