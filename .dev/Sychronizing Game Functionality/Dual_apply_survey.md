# Dual-apply survey: state authority vs world I/O

**Purpose:** Find places where persisted `gameState` is correct but **two code paths** drive the same **physical** channel (emitters, lights, spawns, `Wait.time` fades) in one user flow—usually **eager apply** plus **`Sync.full` → `reconcileFromState`**.

**Method:** Inventory [`core/sync.ttslua`](../../core/sync.ttslua), bounded ripgrep for `applyContext`, `Soundscape.*` + `Sync.full`, `L.SetLightMode` / `reconcileAllPlayers`, spawn APIs, `U.applyLightingPreset`, `UpdateUIDisplays` / `HO.syncAll`, and read hot handlers in [`core/global_script.ttslua`](../../core/global_script.ttslua), [`core/storyteller_scenes_panel.ttslua`](../../core/storyteller_scenes_panel.ttslua), [`lib/chronicle_weather.ttslua`](../../lib/chronicle_weather.ttslua), [`core/scenes.ttslua`](../../core/scenes.ttslua), [`core/lighting.ttslua`](../../core/lighting.ttslua), and [`core/npcs.ttslua`](../../core/npcs.ttslua).

**Orchestration order (`Sync.full`, 2026-05-19):** `Scenes.reconcileFromState` (primary: `sessionScene.lightingPresetKey` → `C.LightModes` via `U.applyLightingPreset`) → `Scenes.reconcileTopFogFromState` → `Soundscape.reconcileFromState` → bootstrap only: `NPCS.restoreAfterStateLoad`, `L.InitLights`, seat presentation (`L.reconcileAllPlayers`, `HO.syncAll`), deferred `L.InitLightsDeferred` + seat presentation retries → runtime only: seat presentation once → `NPCS.reconcileSessionSceneNpcWorldFromState({ deferUiRefresh = true })` → bootstrap-only `HUDP.reconcileCameraOverlaySelfMatchRowsFromXmlDefaults` → `Sync.ui` (full when forced, narrow delta when incremental) → `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked` → bootstrap-only deferred overlay and NPC panel refreshes.

## Fresh audit — 2026-05-19

**Result:** No new **P0 dual-apply** issue found in this pass. The prior chronicle-weather P0 is fixed in code: successful scheduled weather now primes `Soundscape.markReconciledToCurrentState()`, while partial failures still invalidate the reconcile cache for recovery.

**Notable current risks:**

- **P1:** Direct Storyteller Sound controls (`HUD_soundscapeSetMusicMood`, `HUD_soundscapeSetBackgroundLocation`, featured/debug soundscape actions) intentionally use eager `Soundscape.*` setters without immediately priming the soundscape reconcile fingerprint. They do not call `Sync.full` in the same handler, so this is not a current same-flow P0, but a later incremental sync can replay the same steady-state audio intent.
- **P1:** Seat-light reconciliation is idempotent but not fully diff-skipped before calling `L.SetLightMode`; repeated seat presentation passes (`RSL.SyncTable`, bootstrap `Sync.full` retries, seat toggles) may restart harmless lerps. `transitionEpoch` prevents stale steps from winning.
- **P1:** NPC scene layout reconcile is fingerprinted for duplicate `Sync.full`, but it delegates to the same spawn/move helpers as the NPC panel. This is a documented single-domain authority, not a dual writer; watch async preload/placement edge cases separately from dual-apply work.

## Risk matrix

| Subsystem | State keys | World I/O | Eager entrypoints | Reconcile entrypoint | Risk | Mitigation pattern | Priority |
|-----------|------------|-----------|-------------------|----------------------|------|-------------------|----------|
| **Soundscape scene/location apply** | `gameState.soundscape`, `sessionScene.districtKey`, `sessionScene.siteKey`, `sessionScene.soundscapeNarrative` | AssetBundle emitters, deferred volume fades | `StorytellerScenesPanel.applyActiveLibraryScene`, `StorytellerScenesPanel.applyLocationFromInputs`, legacy `Scenes.SCENES` extras | `Soundscape.reconcileFromState` via `Sync.full` | Mitigated: eager apply is followed by `markReconciledToCurrentState`, so incremental `Sync.full` does not replay the same fingerprint | Merge site + narrative into one context; call `markReconciledToCurrentState` after successful eager apply | **P2** |
| **Storyteller Sound direct controls** | `gameState.soundscape` | AssetBundle emitters, deferred volume fades, featured one-shots | `HUD_soundscapeSetMusicMood`, `HUD_soundscapeSetBackgroundLocation`, `HUD_soundscapePlayFeatured`, `SoundscapeDebugPanel.dispatchPlay` | None in same handler; later `Sync.full` uses `Soundscape.reconcileFromState` | Outside reconciler pipeline; a later incremental sync may replay a steady-state mood/location/weather setter because the fingerprint was not primed | Prefer route through a soundscape domain reconcile entry, or prime `markReconciledToCurrentState` after eager state+world setters that represent steady-state lanes; do not mark one-shot featured/debug tracks as reconciled unless they are modeled as persistent intent | **P1** |
| **Chronicle weather** | `soundscape.weather`, `rain`, `wind`, `thunderEnabled` | Rain/wind emitters, thunder scheduler | `ChronicleWeather.applyScheduledWeather` from scene library apply, Apply clock, realtime clock tick | Next `Soundscape.reconcileFromState` via `Sync.full` | OK: prior double weather fade is fixed on success; partial failure intentionally invalidates cache | On full success: `markReconciledToCurrentState`; on partial failure: `invalidateReconcileCache` | **P2** |
| **Scenes (presets + top fog)** | `sessionScene.lightingPresetKey`, `currentScene`, `sceneTransition`, `lightingSeatSpotlightPreset`, `isTopFogActive` | Global `Lighting`, non-seat `L.SetLightMode`, top fog `setState`, legacy scene soundscape extras | `Scenes.loadScene` / `fadeToScene` / admin lighting buttons are state-only; `Scenes.onLoad` is not called by current global load path | `Scenes.reconcileFromState` + `Scenes.reconcileTopFogFromState` | OK: scene fingerprint skips duplicate ambient/top-fog apply; legacy soundscape extras mark soundscape reconciled | Keep scene world writes in reconcilers; keep seat spotlights stored for `L.reconcileForPlayer` priority | **P2** |
| **Lighting (seat presentation)** | `gameState.lights`, `sessionScene.lightingSeatSpotlightPreset`, `sessionScene.seatPresent`, `seatLayout.*`, player hunger/rolling/conditions | `L.SetLightMode`, Unity light component setters through `L.SetLightMode` | Storyteller seat toggle, `RSL.SyncTable`, NPC seat changes call `L.reconcileAllPlayers` directly | `Sync.full` → seat presentation → `L.reconcileAllPlayers`; `Sync.player` → `L.reconcileForPlayer` | Redundant idempotent applies can restart lerps; no competing state authority because priority is derived from state | `transitionEpoch` makes stale lerp steps no-op; future optimization can add desired-mode fingerprint before `L.SetLightMode` | **P1** |
| **NPCs (session scene layout)** | `npcs.instances`, `sessionScene.npcWorld`, `seatLayout.occupiedNPCSlots`, `gameState.lights[npcLight_*]` | `spawnObjectData`, figurine/light moves, NPC spotlight `L.reconcileLightRef`, `RSL.SyncTable` queue | NPC Storyteller panel spawn/move helpers; scene-library apply writes `sessionScene` then `Sync.full` | `NPCS.reconcileSessionSceneNpcWorldFromState` in `Sync.full` | OK for duplicate `Sync.full` because authored `npcWorld` is fingerprinted; panel actions are separate domain-authority operations, not a second `sessionScene.npcWorld` writer | Keep `sessionScene.npcWorld` applies fingerprinted; keep panel spawn/move helpers as the NPC pool authority; avoid adding a second HUD path that mutates `npcWorld` and also calls panel helpers in one handler | **P1** |
| **Overlays / HUD** | `playerData`, overlay flags, active scene/phase summaries | `HO.syncAll`, `HUDP.updatePlayerUI`, `UI.*` | `Sync.player`, `UpdateUIDisplays`, Storyteller scene seat toggle | `Sync.ui` / `UpdateUIDisplays`; `Sync.full` calls `HO.syncAll` before narrow UI delta | UI-only duplicate refresh possible; mostly no-op because attributes/visibility converge | Incremental `Sync.full` omits overlays after `HO.syncAll`; keep `UpdateUIDisplays` deltas narrow | **P2** |
| **End scene narrative** | soundscape state | `setLocationAudio("none")`, weather natural volume reapply | `StorytellerScenesPanel.endSceneNarrative` | `invalidateReconcileCache` + `Sync.full` | Documented exception: world was intentionally cleared outside the normal reconcile snapshot, then forced to converge | Keep `invalidateReconcileCache` when world may be out of sync with state; do not replace with mark unless state and emitters already match | **P3** |
| **Table layout / rotational seats** | `sessionScene.tableKey`, `seatLayout.currentTableKey`, `seatLayout.occupiedNPCSlots` | `RSL.SetTableTo`, object transforms, blindfolds, delayed table switch, seat lights/overlays at boundary | Storyteller table toggle and library scene apply call `RSL.SetTableTo` before `Sync.full` | `Sync.full` does not re-call `RSL.SetTableTo`; `RSL.SyncTable` calls seat light/overlay reconcilers after geometry | Documented exception: table geometry is outside `Sync.full`; bootstrap and same-table repair can re-run idempotent seat reconciliation | Keep `RSL.SetTableTo` as the single table-geometry writer; keep state keys in sync before calling it | **P2** |
| **Global onLoad / bootstrap** | saved `gameState` slices | early soundscape hard mute, `R.SyncTable`, scene/soundscape/lighting/NPC/UI reconcilers, deferred retry timers | `global_script.onLoad` chunk/onLoad silence, scheduled table sync, initial `Sync.full`, startup-gate `Sync.full` | Same `Sync.full` pipeline, plus bootstrap-only deferred retries | Documented exception: multiple applies are intentional load recovery while objects/components appear; not a runtime steady-state dual-apply path | Soundscape fingerprint + early silence; lighting epoch + deferred retry list; UI/overlay idempotence | **P2** |

## Prioritized fix list (2026-05-19)

No new **P0** dual-apply issues were found in this audit, so no inline `<!-- TODO -->` P0 note or implementation plan was opened.

1. **P1 — Storyteller Sound direct controls:** Decide whether steady-state direct controls should route through `Sync.soundscape()` / `Soundscape.reconcileFromState()` or call `Soundscape.markReconciledToCurrentState()` after successful eager setters. Keep featured/debug one-shots separate unless they are promoted to persisted steady-state intent.
2. **P1 — Seat-light redundant lerps:** Consider a per-light desired fingerprint in `L.reconcileForPlayer` / `L.reconcileLightRef` so repeated `Sync.full`, `RSL.SyncTable`, and seat toggles do not restart identical lerps.
3. **P1 — NPC scene-layout async edge:** Review `NPCS.reconcileSessionSceneNpcWorldFromState` placement failure handling when a missing NPC must spawn into preload first; ensure the fingerprint is not committed before physical placement intent has actually converged.
4. **P2 — Bootstrap documentation:** Keep `Sync.full` order notes current whenever bootstrap-only init/retry steps move; this is the easiest place for accidental runtime dual-apply to hide.

## Repeat survey (suggested cadence)

After adding a feature that both **mutates `gameState`** and **calls a domain setter that touches TTS objects**, grep for **`Sync.full`** on the same code path and confirm either:

- reconcile fingerprint / `markReconciledToCurrentState` prevents a duplicate physical apply, or
- the setter is **state-only** and all world writes go through `reconcileFromState` only.

## Grep-able sentinel strings

Re-run these when auditing future changes:

```text
Soundscape.applyContext|setMusicMood|setRainLayer|setWindLayer|setLocationAudio|setLocationMusic|setWeatherCondition
markReconciledToCurrentState|invalidateReconcileCache|Soundscape.reconcileFromState|Sync.full|Sync.player
L.SetLightMode|lightComp.set|L.InitLights|L.reconcile|U.applyLightingPreset
spawnObjectData|spawnObject\(|NPCS\.(spawn|move|Move|restore|reconcile|ensure)
UpdateUIDisplays|HO.syncAll|HUD_soundscape|HUD_scenes|HUD_sync
Wait.time|U.delay|U.scheduleAtOffsets|RSL.SetTableTo
```

## Verification

- `node .dev/scripts/soundscape_contract.test.js`
- `npm run build`
- Manual: Apply clock with chronicle weather on, then `Sync.full` incremental — rain/wind should not stutter from double fade.
