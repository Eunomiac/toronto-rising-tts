# Agent Review Prompts

Cloud-agent prompts for the four **Agent Reviews** items in [`.dev/RUNNING TASKLIST.md`](../RUNNING%20TASKLIST.md). Each prompt is self-contained: read the cited docs first, deliver the specified artifact, and follow Toronto Rising synchronization policy throughout.

**Repo context (read before any task):**

| Resource | Why |
|----------|-----|
| [`AGENTS.md`](../../AGENTS.md) | Module layout, state access rules, sync contract, player ID vs color |
| [`AGENTS.md`](../../AGENTS.md) and [`.cursor/rules/`](../../.cursor/rules/) | Agent entrypoint, repo-local rules, error visibility, documentation-in-same-change, no `pcall` in production |
| [`.cursor/rules/toronto-rising-synchronization.mdc`](../../.cursor/rules/toronto-rising-synchronization.mdc) | Mutation vs reconciliation, dual-apply rules, lighting priority |
| [`.dev/Sychronizing Game Functionality/Synchronization Architecture Proposal.md`](../Sychronizing%20Game%20Functionality/Synchronization%20Architecture%20Proposal.md) | Orchestrator design, reconciler contract draft (§3.3) |
| [`.dev/Sychronizing Game Functionality/Dual_apply_survey.md`](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md) | Existing dual-apply inventory and mitigation patterns |
| [`core/sync.ttslua`](../../core/sync.ttslua) | **Current** orchestration order and entry points |
| [`.dev/SOLVING ISSUES & DEBUGGING.md`](../SOLVING%20ISSUES%20&%20DEBUGGING.md) | Sync incremental vs force, pipeline integrity checklist |
| [`.dev/AVAILABLE_FUNCTIONS.md`](../AVAILABLE_FUNCTIONS.md) | Existing helpers — do not reimplement |

**Non-negotiable policies (every task):**

1. **`gameState` is the single source of truth** for intent. Mutations use `S.setStateVal` / `S.setPlayerVal` / domain mutation APIs only.
2. **Reconcilers apply the live world** (lights, emitters, spawns, UI). They must be **idempotent**, **diff-based**, and **must not write back to `gameState`** except narrowly-scoped runtime sync flags documented in code.
3. **No hidden world writes in setters.** After mutation, callers invoke `Sync.player(color)`, `Sync.full()`, or a domain `reconcile*` entry point explicitly.
4. **No dual apply:** the same steady-state intent must not drive physical I/O twice in one flow (eager domain setter + `Sync.full` → `reconcileFromState` without fingerprint/`markReconciledToCurrentState`).
5. **Per-player state is keyed by Steam ID**, never by seat color, in `gameState.playerData`.
6. **Fail loudly** — no production `pcall`, no silent fallbacks for missing invariants.

**Useful search roots:** `core/`, `lib/`, `ui/`, `.dev/`. Test harness: [`.dev/testbed/TEST BED.ttslua`](../testbed/TEST%20BED.ttslua). Runtime debug output (not in git): `.dev/.debug/`.

---

## Prompt 1 — Author reconciler contract doc

### Goal

Produce a **current, authoritative** reconciler contract document that a contributor or agent can use to implement features without violating sync architecture.

### Deliverable

Create or fully replace:

**`.dev/Sychronizing Game Functionality/Reconciler Contract.md`**

### Instructions

1. **Inventory every public `reconcile*` (and orchestrator-delegated `sync*`) entry point** in the repo. Start from [`core/sync.ttslua`](../../core/sync.ttslua) and trace delegates. Known domains include at minimum:
   - `Scenes.reconcileFromState`, `Scenes.reconcileTopFogFromState`
   - `Soundscape.reconcileFromState`
   - `L.reconcileForPlayer`, `L.reconcileAllPlayers`, `L.reconcileLightRef`
   - `HO.syncAll` (document whether it is reconciler-shaped or needs rename)
   - `NPCS.reconcileSessionSceneNpcWorldFromState`, `NPCS.restoreAfterStateLoad`
   - `GameStateOverlay.reconcileFromState`
   - `HUDP.reconcileCameraOverlaySelfMatchRowsFromXmlDefaults`, `HUDP.updatePlayerUI`
   - `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked`
   - Any local `reconcile*` helpers in `core/hud_player.ttslua` or other modules

2. For **each** reconciler, document in a consistent table or subsection:
   - **Trigger:** who calls it (`Sync.full`, `Sync.player`, load bootstrap, panel handler, etc.)
   - **Reads:** exact `gameState` paths (and any read-only inputs like `C.*`, `G.*`, `Player[color]`)
   - **Applies:** world I/O (light components, AssetBundle emitters, spawns, `UI.*`, object transforms)
   - **Must not write:** confirm no `S.setStateVal` / `S.setPlayerVal` unless explicitly listed as a documented runtime sync flag
   - **Idempotency mechanism:** fingerprint cache, `lastVisible`, transition epoch, deferred apply, etc.
   - **Opts / force behavior:** e.g. `{ force = true }`, `deferUiRefresh`, bootstrap-only paths

3. Document **`Sync.full` order** as implemented today (not as proposed in older doc sections). Include bootstrap vs runtime differences (`didBootstrapFullSync`, deferred retries, `SYNC_INCREMENTAL_UI_DELTA`).

4. Document **`Sync.player(color)`** scope vs **`Sync.full()`** — what each skips and why.

5. Add a **“Mutation → reconcile cheat sheet”**: common panel actions (hunger change, scene apply, weather tick, seat layout, NPC spawn) with the **required** mutation API + sync call sequence.

6. Add **anti-patterns** section with concrete grep patterns reviewers should flag (direct `lightComp.set`, `Soundscape.applyContext` + `Sync.full` without `markReconciledToCurrentState`, setter-side reconciler calls).

7. Cross-link [`Dual_apply_survey.md`](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md) and note which rows are mitigated vs open.

8. Update [`.dev/RUNNING TASKLIST.md`](../RUNNING%20TASKLIST.md) Agent Reviews section to link this doc and mark the task complete.

### Do not

- Propose a god-function orchestrator or move business logic into `core/sync.ttslua`.
- Describe historical pre-refactor behavior without labeling it **Historical**.
- Leave stale function names from the architecture proposal if the code has renamed them.

### Verification

- Every reconciler named in the doc exists in code (ripgrep confirmation).
- `Sync.full` call order in the doc matches [`core/sync.ttslua`](../../core/sync.ttslua) line-for-line in intent.

---

## Prompt 2 — Dual-apply audit (runtime object updates outside reconcilers)

### Goal

Find code paths where **persisted state is correct** but **physical/world I/O** may run **twice** or **outside** the reconciler pipeline for the same steady-state intent.

### Deliverable

Update **`.dev/Sychronizing Game Functionality/Dual_apply_survey.md`** with a fresh audit section dated **today**, plus a prioritized fix list. If new P0 issues exist, open inline `<!-- TODO -->` fix notes or a short **`.dev/plans/YYYY-MM-DD-dual-apply-fixes.md`** for implementation follow-up.

### Instructions

1. Re-read the current survey and [`.cursor/rules/toronto-rising-synchronization.mdc`](../../.cursor/rules/toronto-rising-synchronization.mdc).

2. **Map the orchestrator:** confirm [`core/sync.ttslua`](../../core/sync.ttslua) `Sync.full` order and what each step touches physically.

3. **Ripgrep passes** (adjust patterns as needed; search `core/`, `lib/`, `ui/`):
   - `Soundscape.applyContext`, `setMusicMood`, `setRainLayer`, `setWindLayer`, `setLocationAudio`
   - `L.SetLightMode`, `lightComp.set`, `L.InitLights`, `L.reconcile`
   - `spawnObject`, `spawnObjectData`, `NPCS.` spawn/move helpers
   - `U.applyLightingPreset`
   - `Sync.full`, `Sync.player`, `invalidateReconcileCache`, `markReconciledToCurrentState`
   - `UpdateUIDisplays`, `HO.syncAll`
   - `Wait.time` / `U.delay` / `U.scheduleAtOffsets` adjacent to the above (stacked fades)

4. For each **mutation handler** (Storyteller panels, global UI handlers, scene library apply, weather/chronicle tick, debug helpers that are production-adjacent):
   - Trace: **state write → eager world apply? → Sync call?**
   - Classify: **OK** (reconcile-only), **mitigated** (fingerprint/mark), **P0 dual-apply**, **P1 redundant idempotent**, **documented exception** (e.g. `RSL.SetTableTo`).

5. Pay special attention to:
   - [`core/storyteller_scenes_panel.ttslua`](../../core/storyteller_scenes_panel.ttslua) scene/weather/end-scene flows
   - [`lib/chronicle_weather.ttslua`](../../lib/chronicle_weather.ttslua) + clock tick paths
   - [`core/scenes.ttslua`](../../core/scenes.ttslua) — confirm `loadScene` / `fadeToScene` are state-only
   - [`core/lighting.ttslua`](../../core/lighting.ttslua) — any eager apply outside reconcile
   - [`core/npcs.ttslua`](../../core/npcs.ttslua) — panel spawn vs `reconcileSessionSceneNpcWorldFromState`
   - [`core/global_script.ttslua`](../../core/global_script.ttslua) onLoad / bootstrap

6. Produce a **risk matrix** (subsystem, state keys, world I/O, eager entrypoints, reconcile entrypoint, risk, mitigation, priority) — extend the existing table, do not duplicate stale rows.

7. List **grep-able sentinel strings** future agents can re-run.

### Policy reminders

- Preferred fix for dual-apply: **route world I/O only through reconciler**, or **`markReconciledToCurrentState`** after intentional eager apply, or **`invalidateReconcileCache`** only when world may be out of sync with state.
- Do not “fix” by adding another hidden apply in a setter.

### Verification

- Run `node .dev/scripts/soundscape_contract.test.js` if soundscape paths changed.
- Run `npm run build` if Lua changed (audit-only passes may skip code changes).

---

## Prompt 3 — Invalid `getStateVal` / `getPlayerVal` paths

### Goal

Find **incorrect, fragile, or policy-violating** state reads and produce a **fix plan** (not necessarily implement all fixes in one pass).

### Deliverable

**`.dev/Sychronizing Game Functionality/State Access Audit.md`** containing:
1. Inventory of violations grouped by severity
2. Correct path / API for each
3. Phased fix plan (P0 data bugs, P1 consistency, P2 doc/comments)
4. Grep patterns for regression prevention

### Instructions

1. Read [`core/state.ttslua`](../../core/state.ttslua) — `S.getStateVal`, `S.getPlayerVal`, `S.getPlayerID`, default shape in `GetDefaultGameState()`.

2. **Forbidden patterns to find:**
   - Direct reads/writes: `gameState.` outside `core/state.ttslua` (except comments/strings)
   - `playerData` keyed by **color** instead of **Steam ID**
   - Wrong paths: e.g. `getStateVal("playerData", id, "hunger")` — hunger lives at `stats.hunger`; prefer `S.getPlayerVal(color, "hunger")`
   - Using `getPlayerVal` for non-`hunger` keys that actually live under nested paths (`stats`, `conditions`, `hud`, `lighting`)
   - Reads that should use `S.getPlayerID(color)` first but don't
   - Legacy keys: `currentScene` vs `sessionScene.lightingPresetKey` confusion
   - `getStateVal` on paths that don't exist in `GetDefaultGameState()` merge/normalize (silent nil → wrong default)

3. **Ripgrep:**
   - `gameState\.`
   - `S\.getStateVal\(`
   - `S\.getPlayerVal\(`
   - `S\.setStateVal\(` / `S\.setPlayerVal\(` (setters without matching read path audit)
   - Compare against schema comments in `core/state.ttslua` and [`.dev/Scene Constructor/SchemaV2.jsonc`](../Scene%20Constructor/SchemaV2.jsonc) where relevant

4. For each finding: file, line, current code, why wrong, recommended fix, estimated blast radius.

5. **Fix plan rules:**
   - P0: wrong data path causes wrong gameplay/UI/lighting behavior
   - P1: works today by accident (nil coalescing) but breaks on load/merge
   - P2: misleading comments/JSDoc examples (e.g. wrong `@usage` in `state.ttslua`)

6. Do **not** blanket-replace valid `getStateVal("playerData", pid, "hud", ...)` reads — those are correct when `pid` is Steam ID.

7. Update [`.dev/AVAILABLE_FUNCTIONS.md`](../AVAILABLE_FUNCTIONS.md) if you document canonical read patterns for common fields.

### Policy reminders

- All production state reads go through `S.getStateVal` / `S.getPlayerVal`.
- Never introduce parallel “live state” tables.

### Verification

- Fix plan references actual line numbers from current main branch files.
- Include count summary: N P0, N P1, N P2.

---

## Prompt 4 — Performance hotspots

### Goal

Identify **expensive or repeatedly-triggered** sync/world/UI paths and recommend **measured, architecture-aligned** optimizations (no bypass reconcilers).

### Deliverable

**`.dev/Sychronizing Game Functionality/Performance Audit.md`** with:
1. Ranked hotspot list (impact × frequency)
2. Evidence (call graph, loop nesting, redundant work, deferred timer stacks)
3. Recommendations constrained to sync architecture
4. Optional: quick-win vs structural split

### Instructions

1. **Primary targets** (read implementations fully):
   - [`core/sync.ttslua`](../../core/sync.ttslua) — `Sync.full`, bootstrap deferred schedules (`U.scheduleAtOffsets` 0.35–8s), incremental UI delta vs force
   - [`core/lighting.ttslua`](../../core/lighting.ttslua) — `L.reconcileForPlayer`, `L.reconcileAllPlayers`, `DEFAULT_RECONCILE_LERP_SECONDS`, per-seat loops
   - [`core/hud_overlays.ttslua`](../../core/hud_overlays.ttslua) — `HO.syncAll` (all seats when one player changes?)
   - [`core/npcs.ttslua`](../../core/npcs.ttslua) — preload pool, `reconcileSessionSceneNpcWorldFromState`, spawn batches
   - [`core/soundscape.ttslua`](../../core/soundscape.ttslua) — deferred reconcile, crossfade generations
   - [`core/global_script.ttslua`](../../core/global_script.ttslua) — `UpdateUIDisplays`, who calls `Sync.full` and how often
   - [`core/hud_player.ttslua`](../../core/hud_player.ttslua) — per-player UI refresh cost

2. **Ripgrep for call frequency risk:**
   - `Sync.full\(`, `Sync.player\(`, `UpdateUIDisplays\(`, `HO.syncAll\(`, `L.reconcileAllPlayers\(`
   - Loops over `C.PlayerColors` containing sync calls
   - `U.scheduleAtOffsets` / `U.delay` chains tied to sync
   - NPC preload / spawn pool sizing

3. For each hotspot document:
   - **Symptom:** e.g. double overlay pass, 6-seat lighting lerp on single hunger tick
   - **Call site list** (top 5 callers)
   - **Why it's legal but costly** under current orchestrator
   - **Recommendation:** e.g. narrow `Sync.player` overlay scope, tighten fingerprint, reduce bootstrap retries, batch UI delta — **must not** reintroduce dual writers or skip reconcile on load

4. Compare **`Sync.full({ force = true })`** vs incremental — when Storyteller repair is necessary vs accidental overuse.

5. Note **TTS-specific costs:** AssetBundle audio fades, light lerps, spawnObjectData on load, UI attribute churn.

6. Optional: reference [`.dev/testbed/TEST BED.ttslua`](../testbed/TEST%20BED.ttslua) for harness ideas; TTS MCP timing notes in [`.dev/TTS_MCP.md`](../TTS_MCP.md) if proposing runtime measurement.

### Policy reminders

- **Do not** recommend “call reconciler less” by writing lights/UI directly from handlers.
- **Do** recommend idempotent no-ops, narrower scope (`Sync.player` vs `Sync.full`), diff caches, and fixing accidental `Sync.full` after local reconcile.
- Performance work must preserve **single authority** per subsystem.

### Verification

- Every recommendation cites specific functions and call sites.
- No recommendation violates [`.cursor/rules/toronto-rising-synchronization.mdc`](../../.cursor/rules/toronto-rising-synchronization.mdc).

---

## After completing any prompt

1. Update [`.dev/RUNNING TASKLIST.md`](../RUNNING%20TASKLIST.md) — check off the matching Agent Review item with a link to the deliverable.
2. If behavior or public sync APIs change during a fix pass, update docs in the **same change**.
3. Commit according to the active session policy; deliver the markdown artifact and a short summary of findings.
