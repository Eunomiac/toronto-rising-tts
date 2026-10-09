# Performance Audit — Sync / World / UI Paths

## Agent Routing

Read this when:
- investigating sync, world, UI, NPC, soundscape, or startup performance
- changing broad reconciliation fan-out
- deciding whether to add profiling/debug counters

Source of truth:
- `core/sync.ttslua`
- `core/global_script.ttslua`
- `core/npcs.ttslua`
- `core/hud_overlays.ttslua`
- `core/soundscape.ttslua`

Verification:
- targeted DEBUG profiling helpers named in the relevant section
- `npm run build` for code/UI changes

Status: current performance audit; entries may be done, partial, or deferred as marked.

## Implementation status (updated 2026-07-16)

| Rank | Topic | Status |
| --- | --- | --- |
| 0 | **Stage edits (Dashboard)** | **Retired surface (TOR-687)** - board Apply/Clear/token drop are gone; Dashboard stage edits run `StageApply.applyStageChanges` → one `Sync.npcs` (`force=false`); snap catalog cache keyed by `controlBoardSnapFingerprintFor`; `StageTokens.reconcileFromState` touches only changed placement rows |
| 1 | `Sync.player` duplicate overlay/HUD | **Done** — `HO.reconcileForSeat`; scoped `UpdateUIDisplays`; no duplicate `overlays` / all-player `playerHud` (hunger pulse removed TOR-373) |
| 2 | Startup bootstrap stacks | **Done** — readiness-gated `scheduleBootstrapCoordinator()` (poll `0.35s`, max `10s`) replaces blind `BOOTSTRAP_RETRY_OFFSETS_SEC`; `L.seatSpotlightsResolvable()` + pending init-light probe; bootstrap metrics (`earlyExit`, `ticksRun`, `lightsDeferredRemaining`) |
| 3 | Seat lighting redundant lerps | **Partial** — `lastReconciledModeByRef` + `L.invalidateReconcileCache()`; bootstrap ticks use `opts.bootstrap` → `transitionTime = 0`; seat-presentation orchestrator fingerprint skips full `reconcileAllPlayers` when PC light + overlay inputs unchanged |
| 4 | Soundscape deferred duplicates | **Done** — `pendingSoundscapeReconcileFingerprint` + `soundscapeReconcileGeneration`; fade-step metrics |
| 5 | NPC preload / scene world | **Done** — no runtime figurine spawn or `setCustomObject`/`reload()` on placement; `NPCS.auditPreloadPoolFigurines`; workshop-baked figurine images via inject script; `npc_preload` audit metrics |
| 6 | `UpdateUIDisplays` broad deltas | **Done** — `delta.colors` seat filter; admin-light scene buttons coalesced when `adminLighting` and `scenesPanel` refresh together |
| 7 | Map/HUD scoped refresh | **Deferred** — cross-seat HUD split (`reconcileSeatHud` / `reconcileCrossSeatRows`) not started |
| — | Overlay desired-input fingerprint | **Done** — `HO.reconcileForSeat` per-seat `lastDesiredVisibilityFpBySeat`; `HO.invalidateOverlayInputCache()` on force |
| — | Reconciler invalidation hub | **Done** — `Sync.invalidateAllReconcileCaches()`; `DEBUG.dumpSyncCacheState()` |
| — | Scene-panel duplicate refreshes | **Done (TOR-391)** — scene apply/table/seat/location/clock live paths rely on `Sync.full` incremental `scenesPanel`/`playerHud` deltas instead of immediate duplicate `StorytellerScenesPanel.refresh()` / all-HUD calls |
| — | Top-fog duplicate force reconcile | **Done (TOR-391)** — `Sync.full` reconciles top fog once in the scene phase and passes `skipTopFog` to seat presentation |
| — | Hosted-condition CSHEET refresh scope | **Done (TOR-391)** — hosted-condition reconcile returns changed seat colors; scene/table/location/seat paths announce only those seats (`Sync.player`) after `skipPresentation` |
| — | Seat announcer + CSHEET slice skip | **Done (TOR-677)** — `Sync.player` is the only per-seat presentation path (`Conditions.afterChange` delegates; pc_stats mutators state-only; `Dash.apply` announces once per touched seat). `core/csheet_slices.ttslua` fingerprints each page's inputs in Global, so unchanged CSHEET pages get no `obj.call` (each page refresh was ~46 `Global.call` round trips). Page 3 includes project stakes |
| — | Soft-retired panel paints | **Done (TOR-678)** — PCs row, Stats, Projects and Scenes paints return early unless `StorytellerPanelUI.isPanelVisible`; reopening (click or toolbar hotkey) repaints. Scenes `clockDraft` resync still runs while closed |
| — | Dashboard push | **Done (TOR-676)** — `DashPush.seat` at the end of `Sync.player`; one `JSON.encode` of the slim seat per call, send skipped when unchanged |
| — | Dashboard world push | **Done (TOR-679)** — `DashPush.markWorldDirty` is an O(1) set write; one `U.await` flush 0.25 s later builds and encodes only dirty slices and skips unchanged ones. The real-time clock ticker marks only on hour/day rollover or catch-up end; the dashboard animates minutes from the clock anchor |

Opt-in metrics: `Sync.setMetricsEnabled(true)` or `gameState.debug.syncMetricsEnabled` → `U.emitForAgent("sync_metrics", …)`. See [`.dev/TTS_MCP.md`](../TTS_MCP.md).

Opt-in host console trace (separate from agent metrics): `DEBUG.setSyncTrace(true)` or `gameState.debug.syncTraceEnabled` wraps the `Sync.*` entry points, scene/soundscape/light/overlay reconcilers, NPC and control-board reconcile, snap install, table layout, Spotlight, character-sheet and Storyteller-panel refreshes, `HUDP.updatePlayerUI`, and `UpdateUIDisplays` with `os.clock` timing spans. Each outermost call prints one nested `[SyncTrace] #N` block (ms, self ms, `>1 frame`, `ran`/`skipped`); turning it off prints a per-function summary. `skipped` means that call returned on a fingerprint. Default off; wrappers are removed when off. Format: [TTS_MCP.md § Sync call trace](../TTS_MCP.md#sync-call-trace-synctrace) (TOR-657).

**Sync skip pass (2026-10-01):** `opts.force` on `Sync.full` is the repair hatch (Storyteller sync-all). Load into Play no longer calls `reconcilePlaySessionOnEnter` (that rebuilt the empty table and force-synced). The startup gate runs the only startup `Sync.full` (non-forced, including soundscape; TOR-671 removed the initial pass). Scene restore and the empty-table apply call `Sync.full` without wiping reconcile caches. Same-table `SetTableTo` does not force layout. Control-board snap install ignores token-mirror `force` unless `forceSnaps` (reload cleared the grid). Spotlight stand-ins that are already parked are not hidden again. After layout applies seat lights and overlays, `Sync.noteSeatPresentationReconciled()` primes the seat-presentation fingerprint. Connection relayout (`PC.relayoutAfterOccupancyChange`) still force-syncs the table.

**Event listeners (TOR-197):** High-frequency TTS handlers (`onObjectDrop`, zones, etc.) must use O(1) guards before heavy work. See [Event Listener Policy](Event%20Listener%20Policy.md).

**TTS API heavy-workload catalog (TOR-329):** For grep-friendly API names, doc evidence, tiers, guard patterns, and TOR-390 handoff rules, see [TTS API Heavy-Workload Catalog](TTS-API-Heavy-Workload-Catalog.md). Keep this page focused on Toronto Rising hotspots; do not duplicate the full API catalog here.

**TTS API usage inventory (TOR-390):** For current codebase call sites keyed by cataloged API function, frequency classification, guard/cache notes, and phase-3 dispositions, see [TTS API Heavy-Workload Usage Inventory](TTS-API-Heavy-Workload-Usage-Inventory.md). Use that report as the source map for TOR-391 remediation planning.

## TOR-391 Remediation Notes (2026-07-16)

Resolved:

- `core/global_script.ttslua`: `UpdateUIDisplays` now calls `syncAdminLightSceneButtons()` at most once per invocation when `adminLighting` and `scenesPanel` are both requested.
- `core/storyteller_scenes_panel.ttslua`: live scene apply, table switch, seat-presence, location apply, and clock apply no longer repeat `StorytellerScenesPanel.refresh()` immediately after `Sync.full`; seat-presence no longer follows `Sync.full` with a second broad `UpdateUIDisplays({ playerHud = true })`.
- `core/sync.ttslua`: top fog is owned by the explicit scene phase during `Sync.full`; seat presentation still reconciles top fog when called outside that full pass.
- `core/conditions.ttslua` and `core/storyteller_scenes_panel.ttslua`: hosted-condition reconciliation reports changed seat colors so post-sync CSHEET refreshes use `PCST.refreshCharacterSheetsForColor` instead of scanning every player color.

Deferred:

- `HUD_selectStorytellerPanel` one-frame delayed refreshes remain (now in `refreshStorytellerPanelOnOpen`). They are the reopen paint that TOR-678's visibility guards rely on; a closing click skips them.
- Broader HUD decomposition (`reconcileSeatHud`, `reconcileCrossSeatRows`, location dock split) remains deferred. TOR-391 removed duplicate broad calls without changing cross-seat HUD ownership.
- Temporary sequence instrumentation was not added because the duplicate call chains were clear from the current call graph and the fixes were local.

Verification:

- `npm run build` passed on 2026-07-16 after TOR-391 code changes.
- `npm run tts:smoke` was attempted on 2026-07-16 but could not connect to the local TTS bridge (`ECONNREFUSED 127.0.0.1:39999`).
- Manual TTS smoke still needs a live table check before treating UX behavior as fully verified: scene apply, table switch, location apply, clock apply, seat-presence toggle, Dashboard stage edit / Clear, and storyteller panel switching.

## Scope and guardrails

This audit ranks expensive or repeatedly-triggered paths by static **impact x frequency hypotheses**. It is based on source reading and bounded ripgrep of `Sync.full(`, `Sync.player(`, `UpdateUIDisplays(`, `HO.syncAll(`, `L.reconcileAllPlayers(`, `U.scheduleAtOffsets`, `U.await`, and NPC preload/spawn paths. Runtime counters should validate these rankings before behavior-tuning work lands.

All recommendations preserve the synchronization contract: `gameState` remains the source of truth, handlers mutate state first, and reconcilers apply live TTS world/UI/audio state. Do **not** optimize by writing lights, UI, spawned objects, or AssetBundle audio directly from handlers.

## Living guardrail — TTS API heavy work (TOR-392)

Treat this audit, the [TTS API Heavy-Workload Catalog](TTS-API-Heavy-Workload-Catalog.md), and the [TTS API Heavy-Workload Usage Inventory](TTS-API-Heavy-Workload-Usage-Inventory.md) as living docs. Before adding scans, casts, full UI refresh, spawn/reload/custom-object work, component traversal/writes, AssetBundle/audio mutation, or timer-driven fan-out, verify whether the API family is cataloged and whether current call sites already have a safer pattern.

Hot or repeated paths include `onValueChanged`, object event handlers, physical listeners, timers/delayed fan-out, repeated reconcilers, scene/table/seat/location apply paths, UI refresh fan-out, and object scan/spawn/reload/component-update paths. These paths need at least one O(1) or bounded guard before heavy work: GUID/object identity, seat/color/tag bound, known-object bounds check, dirty/fingerprint skip, cached index, narrowed sync delta, explicit cold/setup/debug-only justification, chunking/defer behavior, or profiling/logging when static risk is unclear.

Do not reintroduce TOR-391 duplicates: no broad `StorytellerScenesPanel.refresh()` or all-HUD `UpdateUIDisplays` immediately after `Sync.full` when incremental sync deltas already cover the work; no duplicate top-fog reconciliation inside nested seat-presentation during full scene sync; refresh changed CSHEET colors rather than scanning all player colors when hosted-condition reconciliation reports changed seats; skip control-board mirror snap/object/UI work when the mirror fingerprint is unchanged; coalesce admin-light scene button refreshes when `adminLighting` and `scenesPanel` are requested together.

### Pre-merge checklist for Lua/XML touching TTS APIs

- Is this call in a hot callback, timer, repeated reconciler, or drag/type path?
- Is it bounded by color, seat, GUID, tag, known object identity, or a board-local bounds check before expensive work starts?
- Is unchanged work skipped by a fingerprint, cache, dirty check, or previous-value comparison?
- Is a broad refresh duplicated immediately after `Sync.full`, `Sync.player`, or another reconciler?
- Would a narrower delta (`playerHud`, `scenesPanel`, changed seat colors, targeted UI id/class/value) replace a broad refresh?
- Does this path scan all objects or tag groups repeatedly when a GUID/cache/index would work?
- Does this path call component setters every refresh even when values did not change?
- Does this path spawn, reload, set XML, set custom objects, or touch AssetBundle/audio APIs in a hot path?
- If acceptable only because it is debug/setup/cold-path, is that explicit in comments or docs?
- Does `npm run build` pass after production Lua/XML edits?
- If behavior depends on live TTS state, is there a manual Save & Play / live-table smoke note?

## Ranked hotspots

| Rank | Hotspot | Impact hypothesis | Frequency evidence | Classification |
| --- | --- | --- | --- | --- |
| 0 | **Dashboard stage edits** | **Medium** | Every Dashboard stage Send / Clear / Reset | Catalog cache + orchestrator fingerprint; per-row stage-token fingerprint |
| 1 | `Sync.player(color)` double all-seat overlay/HUD fan-out | High | Common: hunger, conditions, rouse/remorse | Quick win + structural split |
| 2 | Startup `Sync.full` plus deferred retry stacks | High | Every load / reload | Structural bootstrap coordinator |
| 3 | Seat lighting all-player reconciliation and 2s lerp churn | High | Full sync, table/seat changes, load retries | Diff cache / force-aware reconcile |
| 4 | Soundscape deferred reconcile duplicate scheduling | High | Scene/location/clock/full sync; force repair | Pending fingerprint / generation guard |
| 5 | NPC preload pool and scene NPC world reconcile | Medium-high | Load, scene library apply, scene NPC placement | Measurement + batch split |
| 6 | `UpdateUIDisplays` broad deltas and full refresh fallbacks | Medium | Panel opens, reset, debug, sync | Narrow UI delta API |
| 7 | Map/HUD player UI refresh work | Medium | Player HUD delta, map hover/pan | Keep targeted map path; add player-scoped HUD path |

## 0. Stage edit cost (Dashboard)

The CONTROL_BOARD Apply / Clear / token-drop paths and their profilers were retired in TOR-687. Stage edits now arrive from the Storyteller Dashboard as one bundled `StageApply.applyStageChanges` call, followed by a single `Sync.npcs` with `force = false` (`npcReconcileFingerprint` can skip unchanged work). The snap catalog stays cached by `controlBoardSnapFingerprintFor`; `boardUvHalfExtentsCache` caches board half-extents. `StageTokens.reconcileFromState` keeps a per-row signature and only spawns, moves, flips or destroys tokens whose placement changed.

## 1. `Sync.player(color)` double all-seat overlay/HUD fan-out

> **Resolved** (status table rank 1, then TOR-677). The evidence below is the original 2026-05 snapshot; current `Sync.player` scope lives in [Reconciler Contract § Sync.player](Reconciler%20Contract.md#syncplayercolor-scope--the-single-per-seat-announcer).

**Symptom:** A single player-scoped mutation can trigger one seat light pass, one direct player HUD refresh, **two** all-seat overlay passes, and an all-player HUD loop.

**Evidence**

- `Sync.player(color)` calls `L.reconcileForPlayer(color)`, `HUDP.updatePlayerUI(player, color)`, `HO.syncAll()`, then `UpdateUIDisplays({ playerStats = true, playerHud = true, overlays = true })`. `UpdateUIDisplays` loops `M.forPlayers` when `playerStats` or `playerHud` is requested, then calls `HO.syncAll()` again for `overlays`. See `core/sync.ttslua:62-88` and `core/global_script.ttslua:1942-1978`.
- `HO.syncAll()` loops every `C.PlayerColors` row, computes all managed overlay ids, always drives six hunger layers via `UI.show` / `UI.hide`, updates hunger smoke. See `core/hud_overlays.ttslua`. Hunger 5 is static only (pulse module removed, TOR-373).
- ~~`HUP.syncHungerPulseAll()`~~ removed with `core/hud_hunger_pulse.ttslua` (TOR-373).

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
- **Structural:** Add `HO.reconcileForSeat(seatColor)`; keep `HO.syncAll()` as the full/load repair path. Then `Sync.player(color)` can remain the sole orchestrator while becoming truly player-scoped.
- **Structural:** Extend `UpdateUIDisplays(delta)` with an optional scoped color list, for example `{ playerStats = true, colors = { color } }`, so the Storyteller stat row can refresh without looping every seated player.

## 2. Startup `Sync.full` plus deferred retry stacks

**Status (TOR-671, 2026-10-07):** Startup now runs a single `Sync.full({ reason = "onLoad_startup_gate" })`; the initial pass and the standalone scheduled `R.SyncTable()` were removed (the gate pass lays out the table through the NPC layout commit). The history below describes the earlier shape.

**Symptom (historical):** Load ran an initial `Sync.full`, scheduled two retry stacks, independently scheduled table sync, then ran a final startup-gate `Sync.full`. This was safe for late TTS objects, but it layered repeated lighting, overlays, NPC/UI, and soundscape checks into the first seconds of every load.

**Evidence (historical)**

- First on-load full sync: `Sync.full({ reason = "onLoad_initial" })`. Final startup-gate sync: `Sync.full({ reason = "onLoad_startup_gate" })`.
- Bootstrap branch calls `NPCS.registerRestoredInstancesFromState`, `L.InitLights`, fingerprint-aware `reconcileSeatPresentationFromState`, then `scheduleBootstrapCoordinator()` (readiness poll, early exit when spotlights resolve). See `core/sync.ttslua`.
- `requestSeatLayoutSync` and deferred `R.SyncTable` no-op when `RSL.isLayoutSyncCurrent()` — gate still waits for deferred attempt, not full layout work.
- `global_script` separately schedules `R.SyncTable()` at `0.5`; `R.SyncTable` ends by calling `L.reconcileAllPlayers()` and `HO.syncAll()`. See `core/global_script.ttslua:526-536` and `lib/rotational-seat-layout.ttslua:2876-2888`.
- **Mitigated (2026-06):** `R.SyncTable` / `resolveSeatObjectsFromTable` short-circuit when stable layout fingerprint (table key + filtered `playerToPositionMap` seats) is unchanged; `opts.force` and `R.invalidateLayoutSyncCache()` bypass (same-table `SetTableTo`, `Sync.full({ force = true })`, `NPCS.commitNpcSeatLayout`). Startup passes 2–3 should collapse to one full layout + skip logs.

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
- `L.SetLightMode` persists state, bumps `transitionEpoch`, and uses `U.chain` / `U.Lerp` for properties when transition time is positive. See `core/lighting.ttslua:1579-1865`.

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
5. Save prep path: `Soundscape.prepareEmittersForSave` calls `bootstrapSilenceStrayEmitterLoops()` + `invalidateReconcileCache()` only (physical silence; no state wipe, no forced reconcile). See `core/soundscape.ttslua` (`prepareEmittersForSave`).

**Why legal but costly:** The reconciler owns soundscape world I/O and uses fingerprints, which is correct. The deferred scheduling window is the gap where identical work can be queued before the fingerprint records success.

**Recommendations**

- **Quick win:** Add `pendingSoundscapeReconcileFingerprint`; set it before scheduling deferred apply, skip new non-force requests matching either last-applied or pending fingerprint, and clear it when the callback runs or is superseded.
- **Structural:** Add a reconcile generation token so stale deferred soundscape callbacks no-op if a newer desired fingerprint was scheduled.
- **Quick win:** Count `fadeEmitterVolume` scheduled steps per sync reason to identify accidental force/duplicate paths before changing fade durations.
- **Do not:** Bypass `Soundscape.reconcileFromState` by applying emitters from `Sync.full`; keep `markReconciledToCurrentState` / `invalidateReconcileCache` as the explicit dual-apply controls.

## 5. NPC preload pool and scene NPC world reconcile

**Symptom (resolved):** Load used to spawn missing figurine/light pairs for every NPC character and re-apply `setCustomObject` + `reload()` on every placement sync.

**Evidence (current)**

- `NPCS.restoreAfterStateLoad()` → `NPCS.auditPreloadPoolFigurines` (errors if workshop `npc_figurine` missing; adopt-only `ensureNpcInPreloadZone`; spotlight repair only).
- `applyNpcPairPhysicalPresentation` adjusts Transform scale/tooltip; ImageScalar via `applyFigurineImageScalarIfNeeded` only when seat vs off-seat target differs (no reload if already at target).
- Figurine images injected into save via `npm run custom-ui-assets:inject-npc-world` before Cloud upload.
- `NPCS.reconcileAllFromState` fingerprints placement intent; step 5 adopts missing instance rows without figurine spawn.

**Top call sites**

1. Bootstrap `Sync.full` -> `NPCS.restoreAfterStateLoad`: `core/sync.ttslua`.
2. Scene library apply -> `Sync.full` -> `NPCS.reconcileAllFromState`.
3. NPC panel/group actions call `spawnOrMoveIndividual`, `moveNpcToArea`, or `spawnGroup`.

**Why it was costly:** Runtime `spawnObjectData` for every catalog NPC plus per-placement `reload()` on all figurines. Workshop-baked pool removes both.

**Recommendations**

- **Quick win:** Add debug counters for character count, missing preload count, spawn pairs issued, spawn callbacks completed, and light-ready delay completions. Emit through `U.emitForAgent` / TTS MCP for measured runs.
- **Structural:** Batch missing preload spawns across short scheduled slices instead of spawning every missing NPC pair in one frame. Keep the same reconciler-owned preload intent.
- **Structural:** Split `restoreAfterStateLoad` into "register existing restored pool" and "spawn missing preload pool" so `Sync.full` bootstrap can report exactly which part is expensive and can resume batching if interrupted.
- **Do not:** Spawn scene NPCs directly from scene handlers outside `NPCS.reconcileAllFromState`; improve batching inside the NPC reconciler.

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
- `Soundscape.prepareEmittersForSave` physically silences emitters via bootstrap + invalidates reconcile cache without mutating `gameState.soundscape` (TOR-138). Load soundscape branch → TOR-152.

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
- Emit measurement rows with `U.emitForAgent` / `U.mcpEmitResult` so TTS MCP can parse structured `TR_AGENT_V1` lines. `.dev/TTS_MCP.md` documents structured prints, idle timeouts, and why long `U.chain` work needs explicit completion signals.
- Use `.dev/testbed/TEST BED.ttslua` as the pattern for writing focused workspace logs when a measurement run needs repeatable table/lighting/soundscape setup.

## Recommended implementation order

1. **Measure:** Add sync counters around full/player/bootstrap/soundscape/NPC paths before tuning durations or changing force semantics.
2. **Quick win:** Remove duplicate overlays from `Sync.player` and avoid all-player HUD refresh from that path only after confirming the scoped path still refreshes required cross-seat UI.
3. **Quick win:** Add pending fingerprint/generation guard to `Soundscape.reconcileFromState` deferred apply.
4. **Structural:** Add `HO.reconcileForSeat`, then wire `Sync.player` to it.
5. **Structural:** Add lighting applied-fingerprint cache with explicit invalidation/force semantics.
6. **Structural:** Batch NPC preload spawns and split load restoration from missing-pool creation.
