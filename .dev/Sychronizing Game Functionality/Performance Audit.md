# Performance Audit — Sync / World / UI Paths

## Scope and guardrails

This audit ranks expensive or repeatedly-triggered paths by static **impact x frequency hypotheses**. It is based on source reading and bounded ripgrep of `Sync.full(`, `Sync.player(`, `UpdateUIDisplays(`, `HO.syncAll(`, `L.reconcileAllPlayers(`, `U.scheduleAtOffsets`, `U.delay`, and NPC preload/spawn paths. Runtime counters should validate these rankings before behavior-tuning work lands.

All recommendations preserve the synchronization contract: `gameState` remains the source of truth, handlers mutate state first, and reconcilers apply live TTS world/UI/audio state. Do **not** optimize by writing lights, UI, spawned objects, or AssetBundle audio directly from handlers.

## Ranked hotspots

| Rank | Hotspot | Impact hypothesis | Frequency evidence | Classification |
| --- | --- | --- | --- | --- |
| 1 | `Sync.player(color)` double all-seat overlay/HUD fan-out | High | Common: hunger, conditions, rouse/remorse | Quick win + structural split |
| 2 | Startup `Sync.full` plus deferred retry stacks | High | Every load / reload | Structural bootstrap coordinator |
| 3 | Seat lighting all-player reconciliation and 2s lerp churn | High | Full sync, table/seat changes, load retries | Diff cache / force-aware reconcile |
| 4 | Soundscape deferred reconcile duplicate scheduling | High | Scene/location/clock/full sync; force repair | Pending fingerprint / generation guard |
| 5 | NPC preload pool and scene NPC world reconcile | Medium-high | Load, scene library apply, scene NPC placement | Measurement + batch split |
| 6 | `UpdateUIDisplays` broad deltas and full refresh fallbacks | Medium | Panel opens, reset, debug, sync | Narrow UI delta API |
| 7 | Map/HUD player UI refresh work | Medium | Player HUD delta, map hover/pan | Keep targeted map path; add player-scoped HUD path |

## 1. `Sync.player(color)` double all-seat overlay/HUD fan-out

**Symptom:** A single player-scoped mutation can trigger one seat light pass, one direct player HUD refresh, **two** all-seat overlay passes, **two** all-seat hunger pulse resets, and an all-player HUD loop.

**Evidence**

- `Sync.player(color)` calls `L.reconcileForPlayer(color)`, `HUDP.updatePlayerUI(player, color)`, `HO.syncAll()`, then `UpdateUIDisplays({ playerStats = true, playerHud = true, overlays = true })`. `UpdateUIDisplays` loops `M.forPlayers` when `playerStats` or `playerHud` is requested, then calls `HO.syncAll()` again for `overlays`. See `core/sync.ttslua:62-88` and `core/global_script.ttslua:1942-1978`.
- `HO.syncAll()` loops every `C.PlayerColors` row, computes all managed overlay ids, always drives six hunger layers via `UI.show` / `UI.hide`, updates hunger smoke, then calls `HUP.syncHungerPulseAll()`. See `core/hud_overlays.ttslua:188-217`.
- `HUP.syncHungerPulseAll()` loops every player color, increments each pulse generation, clears both pulse overlays, and starts heartbeat timers for hunger 4/5. See `core/hud_hunger_pulse.ttslua:209-225`.

**Top call sites**

1. `RC._applyRollConsequences` rouse hunger mutation -> `Sync.player(color)`: `core/roll_controller.ttslua:1183-1194`.
2. `PCST.onHudClick` hunger apply -> `Sync.player(color)`: `core/pc_storyteller_panel.ttslua:261-269`.
3. `P.applyActiveConditionPresentation` condition lighting/overlay update -> `Sync.player(col)`: `lib/pc_stats.ttslua:406-422`.
4. `DEBUG.setHungerAndSync` -> `Sync.player(color)`: `core/debug.ttslua:41-43`.
5. `Sync.player` itself is the central fan-out: `core/sync.ttslua:62-88`.

**Why legal but costly:** The path is architecture-correct because handlers write state and invoke the sync layer. It is costly because the current per-player facade still delegates to all-player overlay/HUD APIs and then asks `UpdateUIDisplays` to redo the same overlay work.

**Recommendations**

- **Quick win:** Remove `overlays = true` from the `UpdateUIDisplays` call inside `Sync.player`; `HO.syncAll()` already ran. This preserves reconciler ownership and eliminates the immediate duplicate overlay/pulse pass.
- **Quick win:** In `Sync.player`, avoid `playerHud = true` until `UpdateUIDisplays` can target one color; `HUDP.updatePlayerUI(player, color)` already refreshes that seat.
- **Structural:** Add `HO.reconcileForSeat(seatColor)` and `HUP.reconcileForSeat(seatColor)`; keep `HO.syncAll()` as the full/load repair path. Then `Sync.player(color)` can remain the sole orchestrator while becoming truly player-scoped.
- **Structural:** Extend `UpdateUIDisplays(delta)` with an optional scoped color list, for example `{ playerStats = true, colors = { color } }`, so the Storyteller stat row can refresh without looping every seated player.

## 2. Startup `Sync.full` plus deferred retry stacks

**Symptom:** Load runs an initial `Sync.full`, schedules two retry stacks, independently schedules table sync, then runs a final startup-gate `Sync.full`. This is safe for late TTS objects, but it layers repeated lighting, overlays, NPC/UI, and soundscape checks into the first seconds of every load.

**Evidence**

- First on-load full sync: `Sync.full({ reason = "onLoad_initial" })`. Final startup-gate sync: `Sync.full({ reason = "onLoad_startup_gate" })`. See `core/global_script.ttslua:542-580`.
- Bootstrap branch in `Sync.full` calls `NPCS.restoreAfterStateLoad`, `L.InitLights`, `reconcileSeatPresentationFromState`, then schedules `L.InitLightsDeferred` + seat presentation at `0.35, 1.5, 3.0, 5.0, 8.0`. See `core/sync.ttslua:147-157`.
- The same bootstrap schedules overlays-only UI refreshes at `1.0, 2.5, 5.0, 8.0`, and schedules NPC panel refresh at `0.15`. See `core/sync.ttslua:181-196`.
- `global_script` separately schedules `R.SyncTable()` at `0.5`; `R.SyncTable` ends by calling `L.reconcileAllPlayers()` and `HO.syncAll()`. See `core/global_script.ttslua:526-536` and `lib/rotational-seat-layout.ttslua:2876-2888`.

**Top call sites**

1. `Global.onLoad` initial sync: `core/global_script.ttslua:542-545`.
2. `Global.onLoad` startup readiness gate: `core/global_script.ttslua:578-580`.
3. `Sync.full` bootstrap light retry schedule: `core/sync.ttslua:147-157`.
4. `Sync.full` bootstrap overlay retry schedule: `core/sync.ttslua:181-196`.
5. `R.SyncTable` seat reconciliation handoff during scheduled table sync: `lib/rotational-seat-layout.ttslua:2876-2888`.

**Why legal but costly:** Load is the correct place to over-reconcile because object readiness is non-deterministic in TTS. The cost comes from multiple independent startup schedulers not sharing readiness/fingerprint state.

**Recommendations**

- **Structural:** Replace the two `U.scheduleAtOffsets` stacks with one bootstrap reconciler coordinator that runs seat lights + overlays together and stops remaining attempts once required seat lights and smoke objects are observed ready.
- **Quick win:** Add measurement counters and timestamps to bootstrap passes (`reason`, pass index, lights attempted, lights deferred, overlay writes, smoke writes) emitted to `.dev/.debug/` or `TR_AGENT_V1` when running through TTS MCP.
- **Structural:** Sequence `R.SyncTable` and first `Sync.full` so table geometry settles before the first seat presentation pass when possible; still keep the deferred retries for late objects.
- **Do not:** Remove load retries blindly. They exist to handle object/component readiness and must be replaced by measured readiness gates, not by skipping reconcilers.

## 3. Seat lighting all-player reconciliation and 2s lerp churn

**Symptom:** Full/table/seat paths can re-run every PC and NPC seat light. `L.reconcileForPlayer` computes desired mode but calls `S.setStateVal` and `L.SetLightMode` for each matched live light without checking whether that exact desired apply was already performed. `L.SetLightMode` increments transition epochs and may schedule 2-second lerps.

**Evidence**

- Default reconciler transition is `L.DEFAULT_RECONCILE_LERP_SECONDS = 2`. See `core/lighting.ttslua:27-28`.
- `L.reconcileForPlayer(seatKey)` loops every `L.LIGHTMODES` entry, filters by suffix match, computes desired resolution, writes `gameState.lights`, and calls `L.SetLightMode(..., L.DEFAULT_RECONCILE_LERP_SECONDS)` for live lights. See `core/lighting.ttslua:1429-1457`.
- `L.reconcileAllPlayers()` loops all `C.PlayerColors` and all `C.NPCSeats`. See `core/lighting.ttslua:1459-1467`.
- `L.InitLights()` and `L.InitLightsDeferred()` both end with `L.reconcileAllPlayers()`. See `core/lighting.ttslua:1904-1951`.
- `L.SetLightMode` persists state, bumps `transitionEpoch`, and uses `U.RunSequence` / `U.Lerp` for properties when transition time is positive. See `core/lighting.ttslua:1579-1865`.

**Top call sites**

1. `Sync.full` via `reconcileSeatPresentationFromState`: `core/sync.ttslua:51-58` and `core/sync.ttslua:147-160`.
2. `R.SyncTable` after geometric layout: `lib/rotational-seat-layout.ttslua:2876-2888`.
3. Scene seat presence toggle: `core/storyteller_scenes_panel.ttslua:594-621`.
4. `L.InitLights`: `core/lighting.ttslua:1904-1930`.
5. `L.InitLightsDeferred`: `core/lighting.ttslua:1932-1951`.

**Why legal but costly:** The call boundary is correct: table/scene/sync paths hand seat lighting back to the lighting module instead of writing light components directly. The current implementation still has a contract smell: `L.reconcileForPlayer` writes `gameState.lights` while reconciling, so `gameState.lights` is acting partly like desired intent and partly like an applied cache. That ambiguity makes repeated desired state look like work and makes any new cache design risky unless the ownership is clarified.

**Recommendations**

- **Structural:** First split seat-light desired-state derivation from persisted `gameState.lights` writes. Seat spotlights should derive from player/scene/table state, while a separate runtime-only applied fingerprint tracks whether `L.SetLightMode` already matched the live world.
- **Structural:** Add a per-light applied fingerprint cache in `core/lighting.ttslua` keyed by `lightRef` and desired resolution (`named:MODE` or stable inline patch). Skip `L.SetLightMode` when unchanged, except when explicit lighting force/invalidation is present or during bootstrap/world-drift repair.
- **Quick win:** Pass a shorter transition time for routine same-session seat reconciliation where the visual target is a state correction, while keeping scene/preset transitions as authored. Measure before changing the global default.
- **Structural:** Add `L.invalidateReconcileCache()` and force-aware lighting reconcile options before describing `Sync.full({ force = true })` as a lighting repair path; this mirrors `Scenes.invalidateReconcileCache` and `Soundscape.invalidateReconcileCache` without using `gameState.lights` as an apply cache.
- **Do not:** Write light components directly from scene/table handlers. Keep `R.SyncTable` geometry-only, then hand back to lighting reconcilers.

## 4. Soundscape deferred reconcile duplicate scheduling

**Symptom:** `Soundscape.reconcileFromState` correctly fingerprints applied intent, but it sets the fingerprint only after the deferred apply runs. Multiple `Sync.full()` calls inside the 0.15s defer window can schedule multiple identical `applySoundscapeReconcileFromStateSnapshot` callbacks and stack AssetBundle fades.

**Evidence**

- `Soundscape.reconcileFromState` computes `desiredFingerprint`, skips if it matches `lastSoundscapeReconcileFingerprint`, clears emitter cache, and schedules `runApply` after `RECONCILE_APPLY_DEFER_SECONDS = 0.15`; the fingerprint is written inside `runApply`. See `core/soundscape.ttslua:1164-1194`.
- `applySoundscapeReconcileFromStateSnapshot` calls setter/apply APIs such as `setMusicMood`, `setLocationMusic`, `setWeatherCondition`, `setRainLayer`, `setWindLayer`, and `setThunderEnabled`. See `core/soundscape.ttslua:1122-1149`.
- Paired and single-emitter fades schedule multiple `Wait.time` volume steps; `fadeEmitterVolume` uses `duration * 10` steps. See `core/soundscape.ttslua:412-438`.
- Scene/location flows already call `markReconciledToCurrentState` after eager `applyContext` to avoid a second full-sync fade. See `core/storyteller_scenes_panel.ttslua:514-523` and `core/storyteller_scenes_panel.ttslua:695-701`.

**Top call sites**

1. `Sync.full` -> `Soundscape.reconcileFromState`: `core/sync.ttslua:143-146`.
2. Scene library apply eager `SS.applyContext` + mark + `Sync.full`: `core/storyteller_scenes_panel.ttslua:500-532`.
3. Location apply eager `SS.applyContext` + mark + `Sync.full`: `core/storyteller_scenes_panel.ttslua:692-701`.
4. Clock apply weather then `Sync.full`: `core/storyteller_scenes_panel.ttslua:764-773`.
5. Force save/repair path: `Soundscape.prepareEmittersForSave` calls `invalidateReconcileCache()` then forced immediate reconcile. See `core/soundscape.ttslua:2064-2072`.

**Why legal but costly:** The reconciler owns soundscape world I/O and uses fingerprints, which is correct. The deferred scheduling window is the gap where identical work can be queued before the fingerprint records success.

**Recommendations**

- **Quick win:** Add `pendingSoundscapeReconcileFingerprint`; set it before scheduling deferred apply, skip new non-force requests matching either last-applied or pending fingerprint, and clear it when the callback runs or is superseded.
- **Structural:** Add a reconcile generation token so stale deferred soundscape callbacks no-op if a newer desired fingerprint was scheduled.
- **Quick win:** Count `fadeEmitterVolume` scheduled steps per sync reason to identify accidental force/duplicate paths before changing fade durations.
- **Do not:** Bypass `Soundscape.reconcileFromState` by applying emitters from `Sync.full`; keep `markReconciledToCurrentState` / `invalidateReconcileCache` as the explicit dual-apply controls.

## 5. NPC preload pool and scene NPC world reconcile

**Symptom:** Load can spawn missing pairs for every NPC character into the under-table preload pool. Scene NPC world reconcile is fingerprinted, but when it does run, it can stash all spawned NPCs to preload, ensure each placement exists, and move/spawn each authored placement.

**Evidence**

- `NPCS.restoreAfterStateLoad()` registers existing NPC spotlights, repairs seated records, calls `requestSeatLayoutSync()`, and calls `NPCS.ensureAllNpcsPreloaded({ deferUiRefresh = true })`. See `core/npcs.ttslua:1901-1954`.
- `NPCS.ensureAllNpcsPreloaded` sorts every `NPCS.characters` key and spawns missing rows into preload. See `core/npcs.ttslua:1956-1977`.
- `NPCS.spawnNpcAtSlot` uses `spawnObjectData` for the figurine, then `spawnObjectData` for the light in the callback, registers the light, and schedules a deferred light apply sequence with `NPC_LIGHT_POST_READY_DELAY_SEC = 1.5`. See `core/npcs.ttslua:1133-1316`.
- `NPCS.reconcileSessionSceneNpcWorldFromState` fingerprints `sessionScene.npcWorld.byArea`, stashes all NPCs to preload when placement intent exists, then ensures and moves each authored placement. See `core/npcs.ttslua:1378-1433`.

**Top call sites**

1. Bootstrap `Sync.full` -> `NPCS.restoreAfterStateLoad`: `core/sync.ttslua:147-151`.
2. `NPCS.restoreAfterStateLoad` -> `ensureAllNpcsPreloaded`: `core/npcs.ttslua:1901-1954`.
3. Runtime `Sync.full` -> `NPCS.reconcileSessionSceneNpcWorldFromState`: `core/sync.ttslua:163-166`.
4. Scene library apply -> `Sync.full`: `core/storyteller_scenes_panel.ttslua:531-532`.
5. NPC panel/group actions call `spawnOrMoveIndividual`, `moveNpcToArea`, or `spawnGroup`: `core/npcs.ttslua:1991-2146`.

**Why legal but costly:** The preload pool is a deliberate TTS workaround to warm figurine art and avoid activation stalls. It is costly because `spawnObjectData` is one of the heaviest TTS calls, paired lights double that count, and deferred light readiness adds timer pressure.

**Recommendations**

- **Quick win:** Add debug counters for character count, missing preload count, spawn pairs issued, spawn callbacks completed, and light-ready delay completions. Emit through `U.emitForAgent` / TTS MCP for measured runs.
- **Structural:** Batch missing preload spawns across short scheduled slices instead of spawning every missing NPC pair in one frame. Keep the same reconciler-owned preload intent.
- **Structural:** Split `restoreAfterStateLoad` into "register existing restored pool" and "spawn missing preload pool" so `Sync.full` bootstrap can report exactly which part is expensive and can resume batching if interrupted.
- **Do not:** Spawn scene NPCs directly from scene handlers outside `NPCS.reconcileSessionSceneNpcWorldFromState`; improve batching inside the NPC reconciler.

## 6. `UpdateUIDisplays` broad deltas and full refresh fallbacks

**Symptom:** `UpdateUIDisplays(delta)` is already delta-aware, but several callers still use full refresh or deltas that fan out to every player. Full refresh includes phase, scene, admin lighting, scenes panel, soundscape, all player stats/HUDs, overlays, NPC admin button, PCST rows/sheets, and game-state overlay.

**Evidence**

- `UpdateUIDisplays` treats non-table `delta` as `refreshAll`, then `wants()` every section. See `core/global_script.ttslua:1899-1910`.
- `playerStats` / `playerHud` loops `M.forPlayers`, computes stat values, and calls `HUDP.updatePlayerUI` per player. See `core/global_script.ttslua:1942-1974`.
- Full refresh fallback exists in `HUD_changeScene` when `Sync.full` is unavailable, and reset still calls `UpdateUIDisplays()` directly. See `core/global_script.ttslua:780-800` and `core/global_script.ttslua:1293-1304`.
- `Sync.full({ force = true })` runs full UI refresh; incremental `Sync.full()` uses `SYNC_INCREMENTAL_UI_DELTA` and omits overlays because `HO.syncAll()` already ran. See `core/sync.ttslua:27-39` and `core/sync.ttslua:172-177`.

**Top call sites**

1. `Sync.ui(delta)` passthrough: `core/sync.ttslua:124-130`.
2. `Sync.player` player/all-overlay delta: `core/sync.ttslua:80-87`.
3. `HUD_resetGame` full refresh: `core/global_script.ttslua:1293-1304`.
4. Storyteller panel tab deferred refreshes: `core/global_script.ttslua:733-754`.
5. Debug/test helpers full refresh: `core/debug.ttslua:959-980` and related UI tests.

**Why legal but costly:** UI is reconciler-owned and delta-aware, but the current delta vocabulary is section-scoped, not seat-scoped. That makes single-seat changes pay all-seat costs.

**Recommendations**

- **Quick win:** Audit production `UpdateUIDisplays()` no-arg calls and replace with explicit deltas where the intended scope is known. Keep no-arg only for reset/repair/debug.
- **Structural:** Add seat-scoped delta support, for example `{ playerStats = true, playerHud = true, colors = { "Red" } }`, consumed by `M.forPlayers` filtering.
- **Structural:** Keep `Sync.full({ force = true })` as the Storyteller repair path only. Add log text or debug UI copy that distinguishes "force repair" from "incremental refresh" to reduce accidental overuse.

## 7. Map/HUD player UI refresh work

**Symptom:** `HUDP.updatePlayerUI` is necessarily broad for a player: core panels, map layers, district cards, pins, reference panels, sidebar active/hover layers, coterie popups, and camera rows. It already has targeted map refresh helpers, but `UpdateUIDisplays({ playerHud = true })` still runs the full player HUD path for all seated players.

**Evidence**

- `HUDP.updatePlayerUI` applies core panels, map panel, location dock, reference panels, sidebar overlays, coterie popups, and camera rows. See `core/hud_player.ttslua:966-1087`.
- `HUDP.updatePlayerMapPanelUI` is a narrower high-frequency hover/toggle/pan path that falls back only when map is inactive. See `core/hud_player.ttslua:1089-1111`.
- Map pan animation uses coarse `0.07s` delay steps and cached offsets to reduce UI replication. See `core/hud_player.ttslua:367-420`.
- `UpdateUIDisplays({ playerHud = true })` ignores that targeted API and loops every player. See `core/global_script.ttslua:1942-1974`.

**Top call sites**

1. `Sync.player` direct `HUDP.updatePlayerUI` then broad `UpdateUIDisplays`: `core/sync.ttslua:70-87`.
2. `UpdateUIDisplays` player HUD loop: `core/global_script.ttslua:1942-1974`.
3. Scene seat presence toggle -> `UpdateUIDisplays({ playerHud = true })`: `core/storyteller_scenes_panel.ttslua:594-621`.
4. Map hover/toggle handlers -> `HUDP.updatePlayerMapPanelUI`: `core/hud_player.ttslua:1523-1713`.
5. Player sidebar handlers -> `HUDP.updatePlayerUI`: `core/hud_player.ttslua:1352-1449`.

**Why legal but costly:** Player HUD writes remain inside the HUD module, and map-specific handlers already use narrower reconcilers. The costly part is the global UI wrapper lacking player-scoped filtering.

**Recommendations**

- **Quick win:** For scene seat presence toggles, keep an all-HUD-owner pass for cross-seat camera rows and map pins; only narrow self-contained player HUD pieces once those dependencies are split.
- **Structural:** Promote `HUDP.updatePlayerMapPanelUI` style scoping into explicit HUD reconcilers: `HUDP.reconcileSeatHud(color)` for self state, `HUDP.reconcileCrossSeatRows()` for camera rows/pins that depend on other seats, and `HUDP.reconcileLocationDock()`.
- **Do not:** Let scene handlers set HUD element attributes directly; they should still call HUD reconcilers or `Sync.ui` with a narrow delta.

## `Sync.full({ force = true })` vs incremental

**Incremental `Sync.full()` is the routine path.** It preserves scene and soundscape fingerprints, runs seat presentation, NPC reconcile, and a narrow UI delta that omits overlays because `HO.syncAll()` already ran. Use it for normal scene/table/location/clock changes unless the code just invalidated a reconcile cache.

**Force `Sync.full({ force = true })` is currently a partial Storyteller repair path.** It bypasses scene and soundscape fingerprints and runs full `UpdateUIDisplays()`, but it does **not** yet propagate force into seat lighting or NPC scene-world reconciliation. Treat it as scene/soundscape/UI repair today; add explicit lighting and NPC force/invalidation plumbing before relying on it to repair those domains after world drift. It is accidental overuse when called after a state-only mutation whose fingerprints already describe the desired state.

**Current force callers**

- `HUD_syncAll` debug/repair button: correct force use. See `core/global_script.ttslua:1419-1430`.
- `Soundscape.prepareEmittersForSave` invalidates and immediately forces soundscape reconcile to silence emitters for save: correct forced domain use. See `core/soundscape.ttslua:2064-2072`.

**Current incremental callers**

- `HUD_syncIncremental`: correct routine repair-lite path. See `core/global_script.ttslua:1432-1443`.
- Storyteller scene/location/clock/table paths call `Sync.full` without force. These are legal, but high cost because `Sync.full` still fans out multiple domains. See `core/storyteller_scenes_panel.ttslua:531-773`.

## TTS-specific cost notes

- **AssetBundle audio fades:** `fadeEmitterVolume` schedules up to `duration * 10` `Wait.time` steps per emitter; paired channel crossfades also schedule old-channel silence after fade. Duplicate soundscape reconcile windows are audible and create timer pressure.
- **Light lerps:** Seat reconciliation currently uses 2-second transitions; each `L.SetLightMode` can schedule per-property lerps and finalizers. Re-running unchanged seat applies is not a free no-op.
- **`spawnObjectData`:** NPC preload spawns are heavy and asynchronous; each NPC can create a figurine and a paired light plus a deferred light-ready apply.
- **Global UI attribute churn:** `UI.show` / `UI.hide`, `U.setAttribute`, and `U.setAttributes` replicate through TTS UI. Player HUD maps and overlays already use some caches; the remaining gains are mostly narrower scope and duplicate-pass removal.

## Measurement harness ideas

- Add lightweight per-sync counters under `Sync.full` / `Sync.player`: reason, force, pass kind, elapsed `os.clock`, counts for seat lights attempted/applied/skipped, overlay show/hide calls, UI attributes set, soundscape fade steps scheduled, NPC spawn pairs issued.
- Emit measurement rows with `U.emitForAgent` / `U.mcpEmitResult` so TTS MCP can parse structured `TR_AGENT_V1` lines. `.dev/TTS_MCP.md` documents structured prints, idle timeouts, and why long `U.RunSequence` work needs explicit completion signals.
- Use `.dev/testbed/TEST BED.ttslua` as the pattern for writing focused workspace logs when a measurement run needs repeatable table/lighting/soundscape setup.

## Recommended implementation order

1. **Measure:** Add sync counters around full/player/bootstrap/soundscape/NPC paths before tuning durations or changing force semantics.
2. **Quick win:** Remove duplicate overlays from `Sync.player` and avoid all-player HUD refresh from that path only after confirming the scoped path still refreshes required cross-seat UI.
3. **Quick win:** Add pending fingerprint/generation guard to `Soundscape.reconcileFromState` deferred apply.
4. **Structural:** Add `HO.reconcileForSeat` / `HUP.reconcileForSeat`, then wire `Sync.player` to those.
5. **Structural:** Add lighting applied-fingerprint cache with explicit invalidation/force semantics.
6. **Structural:** Batch NPC preload spawns and split load restoration from missing-pool creation.

