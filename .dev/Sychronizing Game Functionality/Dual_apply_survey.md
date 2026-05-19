# Dual-apply survey: state authority vs world I/O

**Purpose:** Find places where persisted `gameState` is correct but **two code paths** drive the same **physical** channel (emitters, lights, spawns, `Wait.time` fades) in one user flow—usually **eager apply** plus **`Sync.full` → `reconcileFromState`**.

**Method:** Inventory [`core/sync.ttslua`](../../core/sync.ttslua), bounded ripgrep for `applyContext`, `Soundscape.*` + `Sync.full`, `L.SetLightMode` / `reconcileAllPlayers`, and read hot handlers in [`core/global_script.ttslua`](../../core/global_script.ttslua), [`core/storyteller_scenes_panel.ttslua`](../../core/storyteller_scenes_panel.ttslua), [`lib/chronicle_weather.ttslua`](../../lib/chronicle_weather.ttslua).

**Orchestration order (`Sync.full`):** `Scenes.reconcileFromState` (primary: `sessionScene.lightingPresetKey` → `C.LightModes` via `U.applyLightingPreset`) → `Scenes.reconcileTopFogFromState` → `Soundscape.reconcileFromState` → seat presentation (`L.reconcileAllPlayers`, `HO.syncAll`) → `NPCS.reconcileSessionSceneNpcWorldFromState` → `Sync.ui` → `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked`.

## Risk matrix

| Subsystem | State keys | World I/O | Eager entrypoints | Reconcile entrypoint | Risk | Mitigation pattern | Priority |
|-----------|------------|-----------|-------------------|----------------------|------|-------------------|----------|
| **Soundscape** | `gameState.soundscape` | AssetBundle emitters, `Wait.time` volume steps | `Soundscape.applyContext`, `setMusicMood`, `setRainLayer`, Storyteller HUD | `Soundscape.reconcileFromState` via `Sync.full` | Stacked fades if eager apply then reconcile reapplies same fingerprint | Merge context into one `applyContext`; `markReconciledToCurrentState` after eager apply; `musicMood` wins when both mood + location playlist in one context | **P0** (scene apply) **mitigated**; watch new `applyContext` call sites |
| **Chronicle weather** | `soundscape.weather`, `rain`, `wind`, `thunderEnabled` | Same as soundscape weather lanes | `ChronicleWeather.applyScheduledWeather` → `setRainLayer` / `setWindLayer` / `thunder` then **`invalidateReconcileCache`** | Next `Soundscape.reconcileFromState` reapplies rain/wind from state | **Double weather fades** on Apply clock / library apply / RT tick when followed by `Sync.full` | On full success: **`markReconciledToCurrentState`**; on partial failure: `invalidateReconcileCache` | **P0** → **fix in `lib/chronicle_weather.ttslua`** |
| **Scenes (presets)** | `sessionScene.lightingPresetKey`, `currentScene` (legacy mood), `sceneTransition`, `lightingSeatSpotlightPreset`, `isTopFogActive` | `U.applyLightingPreset` from `C.LightModes`; `Scenes.reconcileTopFogFromState`; legacy mood extras from `Scenes.SCENES` when ambient source is `currentScene` | `Scenes.loadScene` / `fadeToScene` / library apply are **state-only** for lighting | `Scenes.reconcileFromState` + `reconcileTopFogFromState` | Low: fingerprint skips duplicate apply | Single ambient writer in reconciler; seat physical apply only in `L.reconcileForPlayer` | **P2** |
| **Lighting (seats)** | `gameState.lights`, `sessionScene.lightingSeatSpotlightPreset`, seat layout inputs | `L.SetLightMode` via `L.reconcileForPlayer` / `reconcileAllPlayers` | Storyteller seat toggle calls `L.reconcileAllPlayers` then `UpdateUIDisplays` only | `Sync.full` → `reconcileSeatPresentationFromState` → `L.reconcileAllPlayers` again | Reconcile is idempotent; rare redundant lerp same frame | Seat baseline from scene preset; hunger/dark/absent/rolling/conditions override in `computeSeatSpotlightPriorityOverride` | **P2** |
| **NPCs (session layout)** | `npcs.instances`, `sessionScene.npcWorld` | Spawn/move figurines (sync batch) | `NPCS.*` via panel dispatch only | `NPCS.reconcileSessionSceneNpcWorldFromState` in `Sync.full` | Low: no second reconcile for same slice | Fingerprint in `reconcileSessionSceneNpcWorldFromState`; avoid duplicate HUD spawn paths | **P2** |
| **Overlays / HUD** | `playerData`, overlay flags | `HO.syncAll`, `HUDP.updatePlayerUI`, `UI.*` | Various HUD handlers | `Sync.ui` / `UpdateUIDisplays` | UI-only double refresh possible; usually attribute no-op | Deltas in `Sync.ui`; avoid duplicate `HO.syncAll` in same handler | **P2** |
| **End scene narrative** | soundscape state | `setLocationAudio`, weather volume helpers | [`StorytellerScenesPanel.endSceneNarrative`](../../core/storyteller_scenes_panel.ttslua) | `invalidateReconcileCache` + `Sync.full` | **Intentional** force re-sync after manual clears | Keep `invalidate` when world was driven outside normal reconcile snapshot | **P3** (by design) |
| **Table layout** | `sessionScene.tableKey` | `RSL.SetTableTo` + physical layout | Storyteller table toggle before `Sync.full` | `Sync.full` does not re-call RSL | RSL is authoritative for table swap; state must stay in sync | Single writer for `tableKey`; document RSL as world-only exception | **P2** |

## P0 action list (this pass)

1. **Chronicle weather + `Sync.full`:** Replace post-success **`Soundscape.invalidateReconcileCache()`** with **`Soundscape.markReconciledToCurrentState()`** in [`lib/chronicle_weather.ttslua`](../../lib/chronicle_weather.ttslua); call **`invalidateReconcileCache`** only on **partial failure** so a later `Sync.full` can recover.

2. **Soundscape scene / library flows:** Already addressed (`markReconciledToCurrentState`, merged `applyContext`, single music path when mood + location both set)—see [`core/soundscape.ttslua`](../../core/soundscape.ttslua), [`core/storyteller_scenes_panel.ttslua`](../../core/storyteller_scenes_panel.ttslua), [`core/scenes.ttslua`](../../core/scenes.ttslua).

## Repeat survey (suggested cadence)

After adding a feature that both **mutates `gameState`** and **calls a domain setter that touches TTS objects**, grep for **`Sync.full`** on the same code path and confirm either:

- reconcile fingerprint / `markReconciledToCurrentState` prevents a duplicate physical apply, or
- the setter is **state-only** and all world writes go through `reconcileFromState` only.

## Verification

- `node .dev/scripts/soundscape_contract.test.js`
- `npm run build`
- Manual: Apply clock with chronicle weather on, then `Sync.full` incremental—rain/wind should not “stutter” from double fade.
