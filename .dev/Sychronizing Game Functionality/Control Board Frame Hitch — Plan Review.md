# Control Board Frame Hitch — Plan Review

**Reviewer:** Claude (Opus) · **Date:** 2026-06-15
**Subject:** `control_board_frame_hitch_21323c61.plan.md` ("Control Board Frame Hitch — Bold Remediation Plan")
**Scope:** Validate the plan's claims against the live codebase, assess architecture fit, surface quick wins, and flag risks that could break the app.

---

## TL;DR verdict

The plan correctly identifies the **single biggest, lowest-risk win** (cache the snap catalog) and the diagnosis is broadly sound: the gameboard hot paths force the full NPC orchestrator and rebuild the snap catalog repeatedly. **Ship the catalog cache first — it is safe, isolated, and high-impact.**

However, the plan is **over-scoped and over-aggressive past step 1**. Several of its premises are partially already implemented (early-exit skips, drop-handler defer, orchestrator fingerprinting), one of its load-bearing mechanisms (**`Sync.gameboard(diff)`**) **duplicates a skip system the orchestrator already has but is being deliberately bypassed with `force = true`**, and its **fail-fast `error()` on hot paths + load-time auto-migration** combination is the most dangerous part of the document for a *shipped, GM-operated TTS table*.

My recommendation: **split this into two efforts.** A safe "Tier 1" (catalog cache + remove redundant `force` + instrument) that you can ship today, and a "Tier 2" (Sync.gameboard diff pipeline, Phase A/B, busy lock, migrator) that is gated behind measurement proving Tier 1 is insufficient.

---

## 1. Claim verification (what's true, what's overstated)

| Plan claim | Verdict | Evidence |
|---|---|---|
| `resolveTokenSnapCatalogEntry` at L3847 rebuilds the entire catalog every call | ✅ **True** | `core/npc_gameboard.ttslua:3852` calls `Gameboard.buildControlBoardSnapCatalog(board, config)` unconditionally; no cache. |
| Catalog rebuild is genuinely expensive | ✅ **True** | `buildControlBoardSnapEntries` (L2127) does per-snap trig (`snapYawTowardOriginDeg`), `controlBoardSnapCandidate`, and `boardLocalToWorld` matrix transforms for every ring/ray/family entry **plus** the seat row. Dozens–hundreds of entries per build. |
| "17+ call sites" of catalog rebuild | ⚠️ **Loose but defensible** | `buildControlBoardSnapCatalog` has **9** direct call sites; `resolveTokenSnapCatalogEntry` (each of which triggers a build) has **~10** call sites. The todo wording ("17+ call sites in `resolveTokenSnapCatalogEntry`") conflates the two — there are not 17 sites in that one function. The aggregate rebuild pressure is real. |
| `controlBoardSnapFingerprintFor` already exists to key a cache | ✅ **True (good news)** | L2395. The cache the plan wants can reuse this exactly. Low-risk. |
| Seat Apply / Clear always run orchestrator steps 1–5 | ✅ **True for seat/clear** | `syncNpcsFromControlBoard` (L1006) sets `onlySteps = {1,5}` for placement-only, but `{1,2,3,4,5}` for `seatMutation`/`placementMutation`/`gameboard_clear` (L1013–1016). |
| Hot path bypasses the orchestrator's own skip logic | ✅ **True — and central** | `syncNpcsFromControlBoard` passes **`force = true`** (L1019). `NPCS.reconcileAllFromState` already has a fingerprint skip at L3048 (`if not force and fp == lastNpcReconcileFingerprint`). The hot path forces straight past it. **See §3.** |
| `commitNpcSeatLayout` forces `RSL.SyncTable({ force = true })` (TOR-210) | ✅ **True** | `core/npcs.ttslua:2845`. This is a *different* force from the orchestrator one; do not conflate them. |
| Drop handler runs `waitForCondition` catalog polling on every drop | ⚠️ **Overstated** | `onNpcControlTokenDropped` (L4317) already early-returns after a synchronous scale when `not wantPaletteLight and not wantAnchorSpread` (L4344). The `waitForCondition` (L4349) only runs for **palette-light or anchor-spread** drops — and the comment at L4337 documents a *prior* fix (`b16f26b`) for exactly the "wait on every drop" bug. So "kill the poll on every drop" is largely already done; the residual is the palette/anchor tail. |
| `applyFromControlBoard` has no empty-diff exit | ⚠️ **Partially false** | It already returns early when `not seatChanged and not placementChanged` (L1123). `clearControlBoard` similarly early-exits (L1208). "Empty diff = zero sync" partly exists; the plan generalizes it. |
| `boardUvHalfExtentsCache = {}` is wiped before the fingerprint short-circuit | ✅ **True (real minor bug)** | `installPolarSnaps` clears it at L2459 **before** the `polarSnapInstallFingerprint == fp` early-return at L2466–2468. Also wiped at L3637. So an unchanged re-install still throws away the uv half-extents cache. Easy fix. |

**Net:** The smoking gun is real and well-aimed. Some of the secondary justifications ("waitForCondition on every drop", "no empty-diff exit") describe problems that have already been partially fixed, which inflates the apparent size of the remaining win.

---

## 2. Quick wins (ship these regardless of the larger plan)

These are isolated, low-risk, and individually measurable. In rough value/risk order:

1. **Snap catalog cache (the smoking gun).** Module-level cache keyed by `controlBoardSnapFingerprintFor(board, cfg)`; invalidate on `installPolarSnaps` and board-pose change; pre-warm at load. This is the plan's `catalog-cache-ship` todo and it is genuinely a same-day, self-contained change. *This alone likely removes most of the hitch.* Measure before/after on one Apply before doing anything else.
   - Implementation note: key by **both** GUID+fingerprint **and** the resolved `config` identity. Several call sites pass a non-nil `config`/`cfg` (e.g. L2645, L2722, L4305) — a cache that ignores config will return wrong entries for those. Cleanest: cache only the **default-config** catalog (the vast majority of hot calls pass `nil`), and let explicit-config callers fall through to a live build.

2. **Fix `boardUvHalfExtentsCache` wipe ordering.** Move the `boardUvHalfExtentsCache = {}` reset to *after* the fingerprint short-circuit in `installPolarSnaps` (and reconsider the L3637 reset). Pure win, no behavior change when snaps actually change.

3. **Stop forcing the orchestrator on Apply when the fingerprint already covers it.** See §3 — this is a structural quick win that may make most of "Sync.gameboard" unnecessary. Treat as an *investigation* first (it carries the TOR-210/TOR-178 regression risk), not a blind deletion.

4. **Memoize the two `resolveTokenSnapCatalogEntry` calls inside `clearControlBoard`'s `skipParkIf`.** L1174 and L1186 resolve the *same token* twice per token, each rebuilding the catalog. Even before the global cache lands, this is a trivial dedupe. (Once the cache lands it's moot — but it shows the current cost is partly redundant work, not just missing cache.)

5. **Instrumentation first, not "in parallel."** The plan lists `DEBUG.profileGameboardApply/Clear/TokenDrop` as a parallel task. Land the spans (`catalog_builds`, `phaseA_ms`) **before** the cache so you have a real before/after number. Otherwise you cannot prove which later steps are worth their risk.

---

## 3. The central architectural observation: you may not need `Sync.gameboard`

The plan's headline new mechanism is `Sync.gameboard(diff)` — a diff-driven sync entry that skips the orchestrator when the diff doesn't require it. But the orchestrator **already implements diff-gating**:

```3047:3054:core/npcs.ttslua
    local fp = npcReconcileFingerprint()
    if not force and fp == lastNpcReconcileFingerprint then
        local Gameboard = require("core.npc_gameboard")
        if type(Gameboard.reconcileControlBoardFromState) == "function" then
            Gameboard.reconcileControlBoardFromState()
        end
        return
    end
```

The gameboard hot path defeats this by always passing `force = true`:

```1017:1024:core/npc_gameboard.ttslua
    Sync.npcs({
        reason = reason,
        force = true,
        onlySteps = onlySteps,
        deferUiRefresh = true,
        skipPreloadPopulate = true,
        animateStageMoves = reason == "gameboard_apply",
    })
```

**Implication:** A large fraction of the plan's "diff engine + skipNpcOrchestrator" value can be obtained by **(a) not forcing the orchestrator** when the fingerprint already reflects intent, and **(b) narrowing `onlySteps`**. The fingerprint (`npcReconcileFingerprint` = placements + occupied seats + table + presence) already encodes the very "intent diff" the plan wants to recompute by hand. Building a *second*, parallel intent-diff structure (`computeIntentDiff` → `Sync.gameboard`) risks **two sources of truth for "did anything change"** — which is exactly the dual-authority pattern the project's own synchronization rules warn against.

**Why is `force = true` there today?** Two distinct reasons must be untangled before removing it:
- The **orchestrator-level** force (bypasses `lastNpcReconcileFingerprint`). Given `applyFromControlBoard` already returns early on no-change *and* the fingerprint captures placements/seats/presence, this force is **plausibly redundant** in most cases. Investigate.
- The **`RSL.SyncTable` force inside `commitNpcSeatLayout`** (L2845), which exists precisely because the *layout* fingerprint strips in-area occupants (TOR-210). This one is **load-bearing** and must stay diff-gated, not removed. The plan's "drop `{ force = true }` default" risk note (its highest-rated risk) is about *this* force and is correctly flagged.

**Recommendation:** Before building `Sync.gameboard`, run the experiment: pass `force = false` from `syncNpcsFromControlBoard` (keeping the RSL force inside `commitNpcSeatLayout`) and measure + E2E. If the existing fingerprint skip + narrowed `onlySteps` + catalog cache gets you under budget, **`Sync.gameboard` and `computeIntentDiff` become unnecessary complexity** and should be dropped from scope. If it doesn't, you'll have a precise reason *why* the orchestrator over-runs, which is the right input to designing a narrow entry point.

---

## 4. Risks & dangers (ranked by likelihood × blast radius)

### 🔴 R1 — Fail-fast `error()` on interaction handlers can brick the GM's controls mid-session
The plan mandates `error()` for: missing `npcToken:` after warm-up, stale catalog cache, unknown `characterKey` in a diff, etc. In TTS, an uncaught `error()` inside an `onObjectDrop` / button-click handler aborts that handler and spams the in-game console — and the **Storyteller cannot open a debugger or edit Lua mid-game**. One mis-tagged or workshop-stale token would turn "Apply doesn't seat an NPC" (a cosmetic miss) into "**Apply throws and the control board is dead**" (a session-ending break).

- The plan *says* hot paths only do registry lookups, but its own rules table puts `error()` on hot-path conditions ("`error()` if diff references unknown characterKey", "`error()` if snap catalog cache stale"). That contradiction needs resolving.
- **Mitigation:** Fail-fast belongs at **cold warm-up / load only** (where the author is actively iterating and *can* fix), gated behind `DEBUG`. On the **hot path**, prefer *log + skip the offending row + continue*. A storyteller losing one NPC placement is recoverable; losing the whole Apply is not. This is the single change I'd insist on before this plan ships.

### 🔴 R2 — Load-time auto-migration + fail-fast warm-up is a hard dependency chain
`migrateControlBoardObjects()` uses **name/tag heuristics** to derive `npcToken:<key>`, then warm-up **`error()`s** if anything still lacks it. If the heuristic misses *any* object on the author's existing workshop save, **the gameboard fails to warm up on load** — i.e., the migration's correctness is now a precondition for the table loading at all.

- TTS `onLoad` timing: `getObjectsWithTag` can return an incomplete set if objects are still spawning/streaming. Warming registries on raw `onLoad` risks both false-negative migration (object not present yet → not migrated → later error) and stale object refs. Use the project's existing settle/sequence gates (`U.RunSequence` / physics-settled), not bare `onLoad`.
- **Mitigation:** Make warm-up **non-fatal** (collect + log unresolved objects, don't error), keep migration **idempotent and dry-runnable** (the plan's `dryRun` is good), and **decouple** "table loads" from "every token is perfectly tagged." Migration is fine; *fatal* migration on a live save is the danger.

### 🟠 R3 — `TokenRegistry` holding object references can go stale
A persistent `characterKey ↔ object` registry will hold references that TTS can invalidate: tokens destroyed, table switches stashing/replacing markers (TOR-202 already stashes duplicate-table markers at Y=-200), reload. A "registry hit required, no fallback" policy turns any stale ref into an R1-class error.
- **Mitigation:** Validate `isGameObject()` on every registry read; on miss, re-resolve once (cold) rather than error. Invalidate registry slices on table switch (the plan acknowledges this for markers/mirror — extend to tokens).

### 🟠 R4 — Phase A/B split introduces an observable inconsistency window
Writing intent + figurine ops in Phase A but deferring the **state→world mirror** (`reconcileControlBoardFromState`) and palette park to Phase B (next frame) means there's a frame where `gameState` and the *visible board* disagree. The plan accepts "one-frame marker delay." Real risks:
- **Re-entrancy:** a second Apply/drop/Clear landing in that window. The busy lock addresses *input*, but the **deferred Phase B closure captures `diff`/board state** — if anything mutates between frames (autosave, another player, physics settle moving a token), Phase B applies a stale diff. Capture-by-value and re-validate at Phase B entry.
- **Single-authority rule:** the project's synchronization rule says reconcilers may not write back to state except narrow runtime flags. Phase A "writes intent then applies figurine ops directly" must still route world application through reconcilers, or you reintroduce the dual-apply problem catalogued in `Dual_apply_survey.md`. Phase A applying figurines *and* Phase B reconciling the same slice is exactly the "two world applies for one intent" pattern the rule warns against — watch for double fades / double `setPosition`.

### 🟠 R5 — Deleting legacy paths in the same effort removes your rollback
The plan's `delete-legacy-paths` + `Don't keep old path "for safety" behind flag` is philosophically aligned with the repo's "minimal codebase" rule, **but** combined with R1/R2 it means if Tier 2 regresses TOR-178/TOR-210/TOR-180, there is no quick revert short of git. For a change touching the GM's primary control surface, keep the legacy path until **E2E + author Save & Play confirms** the new path, *then* delete in a follow-up commit. (The repo rule favors deletion of dead code; it does not require deleting a still-load-bearing path before its replacement is proven.)

### 🟡 R6 — Lua local-function-order regressions (repo's #1 runtime bug class)
This plan adds many new locals to the **highest-risk files** (`core/npc_gameboard.ttslua`, `core/npcs.ttslua`, `core/sync.ttslua`, `core/global_script.ttslua`) — `computeIntentDiff`, `applyFigurineOps`, busy-lock helpers, `migrateControlBoardObjects`, registry builders. Per the workspace rule, every new `local function` must be defined above its callers or forward-declared. `resolveTokenSnapCatalogEntry` is *already* a forward-declared local (L57) precisely for this reason. **Budget explicit pre-flight grep of new helper names vs caller line numbers** — `npm run build` will not catch these; they surface as `attempt to call a nil value` only at Save & Play.

### 🟡 R7 — `Sync.gameboard` as a new sync entry widens the API surface the audit just narrowed
The Performance Audit and Reconciler Contract treat `Sync.full` / `Sync.npcs` / `Sync.player` as the sanctioned entry points. Adding `Sync.gameboard` (and scoped step exports like `reconcileStepOneAreaRemovals`) **exposes orchestrator internals** to a caller. That's defensible *if* it replaces `Sync.npcs` on this path, but if both remain it's a third NPC sync entry to keep coherent. Tie its existence to deleting the `syncNpcsFromControlBoard` force path (the plan intends this — make sure it actually happens, not "both during migration").

---

## 5. Sequencing critique

The plan's "aggressive" 10-step order front-loads architecture (migrator, registry, diff engine, new sync entry) at steps 2–4, *before* proving step 1 was insufficient. Given that step 1 alone may close the hitch, this risks building (and having to maintain/delete) a large diff subsystem that the cache made unnecessary.

**Recommended re-sequencing:**

**Tier 1 — Safe, ship now, measure (this is probably "done"):**
1. Instrumentation spans (`catalog_builds`, `phaseA_ms`).
2. Snap catalog cache (default-config) + `boardUvHalfExtentsCache` ordering fix.
3. Investigate dropping orchestrator-level `force` (keep RSL force); narrow `onlySteps`. E2E + Save & Play.
4. **STOP and measure.** Update Performance Audit "Rank 0 — interaction points". If under budget, close TOR-201 and **defer Tier 2 indefinitely.**

**Tier 2 — Only if Tier 1 measurement proves insufficient:**
5. `computeIntentDiff` *as a read of the existing fingerprint inputs*, not a parallel truth.
6. Phase A/B split + busy lock (with R4 re-validation at Phase B entry).
7. Object migration — **non-fatal**, dry-runnable, settle-gated, debug-only fatal mode.
8. Legacy deletion — *after* author confirmation, in a follow-up commit.

The migrator (step 7) and fatal fail-fast are the most expensive/dangerous items and should be **last and optional**, not step 2.

---

## 6. Smaller notes & doc-accuracy fixes

- **"17+ call sites in `resolveTokenSnapCatalogEntry`"** — reword to "9 `buildControlBoardSnapCatalog` sites + ~10 `resolveTokenSnapCatalogEntry` sites" so the todo isn't misleading to the implementing agent.
- **Drop-handler todo** ("Kill waitForCondition catalog polling; drop Phase A = scale only") — acknowledge in the plan that the common-drop scale-only path **already exists** (L4339–4345); scope the change to the palette/anchor tail only, and credit the `b16f26b` fix so the agent doesn't "rediscover" and re-break it.
- **`Sync.gameboard(diff)` contract table** lists `RSL.SyncTable without force` for `seatChanges.layout`. This directly collides with TOR-210's reason for forcing. The contract must say *force only when assign/vacate changed AND fingerprint stale* — and that condition needs an explicit E2E (the plan's risk note says this, but the contract table contradicts it; align them).
- **Event Listener Policy fix** (add `isStorytellerPlayerColor`) and **Performance Audit Rank 0** are good, cheap hygiene — keep them, but they're documentation, not perf.
- **`empty diff = immediate return`** already substantially exists (L1123, L1208); frame the new work as *extending* it (figurine-level granularity) not *introducing* it.
- Per repo rule: update `.dev/` docs (`Storyteller Gameboard Control.md`, `Reconciler Contract.md`, Performance Audit) **in the same change**, and keep Linear/TOR-201 + RUNNING TASKLIST in sync. The plan already calls this out — good.

---

## 7. Bottom line

- **Do now (safe, high ROI):** catalog cache, uv-extents ordering fix, instrumentation, and the `force`/`onlySteps` investigation. Measure.
- **Probably don't need:** `Sync.gameboard` + `computeIntentDiff` as a *parallel* diff system — the orchestrator fingerprint is the existing intent-diff; prefer leveraging it over duplicating it. Re-evaluate only against numbers.
- **Make non-fatal / defer:** load-time auto-migration and *all* hot-path `error()` calls. In a GM-operated TTS table, fail-fast on the primary control surface trades a cosmetic miss for a session-ending break. Fail-fast at cold load behind `DEBUG`; log-and-continue on click.
- **Don't delete the legacy path until the new path is author-confirmed.** Then delete in a follow-up, per repo convention.

The instinct ("audits missed the interaction points; fix the architecture, not just guards") is correct and well-argued. The execution risk is concentrated in the *aggressive* parts — fatal fail-fast, same-PR legacy deletion, and a second diff authority — none of which are required to kill the hitch. Ship the cache, measure, and let the data decide how much of Tier 2 is worth its risk.
