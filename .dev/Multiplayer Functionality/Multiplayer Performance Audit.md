# Multiplayer Performance Audit — Agent Instructions

**Audience:** AI agent performing a repository-wide audit and producing an implementation plan.

**Ongoing development:** Agents implementing **new features** (not only audits) must uphold **§1 policies P1–P10** in [Preparing For Multiplayer](Preparing%20For%20Multiplayer.md) until **TOR-144 (multiplayer E2E)** passes. Always-on rule: [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc).

**Goal:** Bring the codebase into full compliance with **Section 1** of [Preparing For Multiplayer](Preparing%20For%20Multiplayer.md) (policies **P1–P10**, helper contracts, high-risk paths, pre-flight checklist). This audit covers **multiplayer authority, fan-out safety, and join-client performance guards** — not general frame-time optimization (see [Performance Audit](../Sychronizing%20Game%20Functionality/Performance%20Audit.md) for latency hotspots).

**Do not implement fixes in the audit pass** unless the author explicitly asks in the same session. **Deliver:** (1) findings report, (2) prioritized implementation plan.

**Linear:** Anchor findings to **TOR-144** (multiplayer E2E), **TOR-221** (bootstrap/host guards), **TOR-197** (event listener policy). Create new `TOR-*` issues for material gaps; do not mark host-authority work **Done** until [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) passes with two clients.

---

## 0. Authoritative contracts (audit against these)

Read fully before scanning code:

| Doc | Use |
| --- | --- |
| [Preparing For Multiplayer §1](Preparing%20For%20Multiplayer.md) | Policies P1–P10, helper table, high-risk paths, grep commands |
| [Bootstrap Authority](../Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md) | Tiers A/B/C, fan-out vs clicker, roll split, join `onLoad` |
| [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) | Host Authority Inventory — compare code to tables |
| [Reconciler Contract](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md) | Mutation → sync shape; reconciler exceptions |
| [Dual-apply survey](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md) | P7 dual-apply matrix |
| [lua-local-function-order](../../docs/solutions/lua-local-function-order.md) | Pre-flight for any moved helpers |

### Policy checklist (every finding must map to one or more)

| ID | One-line test |
| --- | --- |
| **P1** | World writes only after state mutation via public APIs; no reconcile hidden in setters |
| **P2** | Tier C guarded with `U.requireHostForWorldMutation(context)` on Host execution path |
| **P3** | ST interaction uses `U.isStorytellerSteamPlayer`; not conflated with host-only |
| **P4** | Hot handlers: O(1) tag/GUID/color guard before `require` / loops / `Sync.*` |
| **P5** | Join-client Tier C from PC UI/objects → `Global.call` → host-guarded Global callee |
| **P6** | Fan-out handlers not fully host-gated when Tier B must run on all clients (rolls) |
| **P7** | No stacked physical apply (eager + reconcile) without fingerprint / invalidate |
| **P8** | Object scripts: no `require("core.*")` on mutating paths; `Global.call` + bundle gates |
| **P9** | Event Listener Policy inventory matches code |
| **P10** | No “fix” that removes host guards to paper over live `gameState` broadcast gap |

---

## 1. Agent workflow (mandatory order)

### Phase A — Baseline inventory (read-only)

1. Read the docs in §0.
2. Run mechanical searches (§3); save hit counts and file lists.
3. Build a **handler registry** (spreadsheet or markdown table): every Global handler, `Global.*` entry, `HUD_*`, object `click_*` / `onLoad`, and module entry points called from fan-out paths.
4. Compare registry to [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) — flag **missing rows**, **stale Phase/Pass status**, **new handlers since inventory**.

### Phase B — Deep audit by domain (read-only)

Work through §4 domains in order. For each entry point, record:

- **Delivery:** fan-out | clicker | save-only | unknown
- **Tier:** A | B | C | split (document split)
- **Guards present:** steam / host / tag / none
- **World I/O:** list APIs (`spawnObject`, `setPosition`, `L.SetLightMode`, AssetBundle audio, `Sync.npcs`, etc.)
- **Verdict:** pass | fail | risk | intentional exception (cite doc)

### Phase C — Supplemental discovery (required)

Beyond §4, the agent **must** independently find gaps:

1. **`rg` for world I/O without nearby host guard** — see §3.3.
2. **Call-site trace** — for each `Sync.full`, `Sync.npcs`, `Sync.lighting`, `Sync.player`, `L.reconcileForPlayer`, `NPCS.reconcileAllFromState`, note whether caller is fan-out-safe.
3. **New/changed files** — any `.ttslua` under `core/`, `objects/`, `ui/`, `global/` not listed in §4: classify from scratch.
4. **HUD audit** — `grep '^function HUD_' core/global_script.ttslua`; classify ST state+world vs UI-only vs roll (policy table incomplete for full list).
5. **Coroutines / `U.delay` / `startLuaCoroutine`** started from fan-out handlers — can non-host schedule duplicate timed world writes?
6. **Cross-check** [Performance Audit](../Sychronizing%20Game%20Functionality/Performance%20Audit.md) rank-0 gameboard path — P4 guards must remain if optimizing.

### Phase D — Implementation plan (output)

Produce §5 artifact. Group fixes into **waves** (bootstrap → fan-out → Global.call → HUD → object scripts → docs). Each item: file, function, change summary, policies, risk of over-gating, verification step.

### Phase E — Linear & tasklist sync

- Set related issues **In Progress** during audit if not already.
- Comment on **TOR-144** / **TOR-221** with summary + link to plan file path.
- Propose new issues for P0/P1 gaps; add `module:*` labels.
- Update [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) inventory **only in implementation**, not in audit-only pass — but **list required doc updates** in the plan.

---

## 2. Deliverables (exact format)

Write output to **`.dev/Multiplayer Functionality/audit-YYYY-MM-DD.md`** (create on audit day).

### 2.1 Findings report sections

```markdown
# Multiplayer Authority Audit — YYYY-MM-DD

## Executive summary
- N pass / N fail / N risk / N doc drift
- Top 3 ship blockers for TOR-144

## Mechanical search summary
(table: query → count → notes)

## Findings table
| ID | Severity | Policy | Location | Issue | Recommended fix |

## Registry drift
(handlers in code but not in Event Listener Policy, or marked Pass but failing)

## Intentional exceptions
(cited to Reconciler Contract / Dual-apply survey)

## Supplemental discoveries
(items not in §4 seed list)
```

**Severity:**

| Level | Meaning |
| --- | --- |
| **P0** | Duplicate Tier C on fan-out likely in multiplayer (missing host guard, dual apply) |
| **P1** | Over-gate or broken join-client path (whole handler gated, PC click no `Global.call`) |
| **P2** | P4 performance on fan-out (heavy work before guard) |
| **P3** | Doc/inventory drift (P9) |
| **P4** | Follow-up / known gap (P10 broadcast, debug-only) |

### 2.2 Implementation plan sections

```markdown
# Multiplayer Authority — Implementation Plan (from audit YYYY-MM-DD)

## Wave 1 — …
| Task | Files | Change | Policies | Over-gate risk | Verify |

## Wave 2 — …

## Doc updates
## Out of scope (with reason)
## TOR-144 retest matrix (map each wave to playbook phases A–E)
```

---

## 3. Mechanical searches (run all; extend as needed)

```bash
# Host authority coverage in Global
rg "function Global" core/global_script.ttslua
rg "requireHostForWorldMutation|isHostClient" core/global_script.ttslua core/sync.ttslua

# Global mutators possibly missing host guard (manual review each)
rg "^function Global" core/global_script.ttslua -A 3 | rg -v "requireHostForWorldMutation|GlobalIs|GlobalGet|GlobalRequire|GlobalReport|GlobalResolve|GlobalCollect|GlobalRegister"

# Built-in fan-out handlers
rg "^function on(Object|Player)" core/global_script.ttslua

# Sync chokepoints
rg "function Sync\." core/sync.ttslua
rg "isHostClient" core/sync.ttslua

# World I/O APIs (review each hit in fan-out / object / ui context)
rg "spawnObject|spawnObjectData|destroyObject|setPosition|SetLightMode|setLightMode|AssetBundle" core/ objects/ ui/ lib/ --glob "*.ttslua"

# Object → Global routing
rg "Global\.call" objects/ ui/

# Forbidden core requires in bundled object/ui scripts
rg 'require\("core\.' objects/ ui/

# Hot path requires inside handlers (not chunk top)
rg "function onObject" core/global_script.ttslua -A 25 | rg "require\("

# HUD surface area
rg "^function HUD_" core/global_script.ttslua

# Coroutines from global handlers
rg "startLuaCoroutine|U\.delay|waitForCondition" core/global_script.ttslua core/npc_gameboard.ttslua core/npcs.ttslua

# Dual-apply suspects
rg "markReconciledToCurrentState|invalidateReconcileCache|commitEagerSteadyState" core/ lib/
rg "Sync\.full" core/ --glob "*.ttslua"
```

**§3.3 Heuristic:** For each `spawnObject|setPosition|L\.SetLightMode` hit in `objects/` or `ui/`, confirm either (a) host-guarded Global callee, (b) read-only/UI-only, or (c) flagged P0.

---

## 4. Seed audit scopes (verify every item; do not treat as exhaustive)

### 4.1 Helpers & gates (`lib/util.ttslua`, `core/global_script.ttslua`)

| Symbol | Audit |
| --- | --- |
| `U.isStorytellerSteamPlayer` | Used with correct `playerRef` shape (Player vs color) per Bootstrap Authority callback table |
| `U.isHostClient` | Solo fallback documented; not used alone where steam+host both needed on fan-out |
| `U.requireHostForWorldMutation` | Context strings unique enough for DEBUG; every Tier C path uses it |
| `GlobalIsStorytellerSteamPlayer` | Object scripts use this, not raw `Black` check alone |
| `GlobalRequireHostForWorldMutation` | Exposed for object scripts that need host check before local I/O |

### 4.2 Bootstrap & load

| Entry | File | Policies | Verify |
| --- | --- | --- | --- |
| `onLoad` | `core/global_script.ttslua` | P2, P6 | `S.InitializeGameState` all clients; early return non-host before `trEarlySilence*`, `M.onLoad`, `R.SyncTable`, world `Sync.full` |
| `onLoadJoinClient` | `core/main.ttslua` | P2 | UI-only; no `setupPlayers` world side effects |
| `onSave` | `core/global_script.ttslua` | P1, P2 | Host sanitization; no join-client world writes |
| `Sync.full` non-host branch | `core/sync.ttslua` | P2, P6 | Returns `false`; `Sync.ui` only |
| `npc_control_board_palette.onLoad` | `objects/npc_control_board_palette.ttslua` | P2 | `GlobalGameboardInstallPaletteSnaps` → host inside Global |
| `soundscape_emitter_object.onLoad` | `core/soundscape_emitter_object.ttslua` | P2 | Local mute only — document if fan-out redundant |
| `dice_bag.onLoad` | `objects/dice_bag.ttslua` | P4 | Destroy stale dice on load — host-only or safe on all clients? |
| `ui_csheet_core.onLoad` | `ui/ui_csheet_core.ttslua` | — | Must not replace Global `onLoad` (comment warns) |

### 4.3 Built-in Global event handlers

| Handler | Expected guards | Module callees to trace |
| --- | --- | --- |
| `onObjectPickUp` | steam + host + tag | `Gameboard.onNpcControlTokenPickUp` |
| `onObjectDrop` | steam + host + tag | `NPCS.onObjectDropped`, `Gameboard.onNpcControlTokenDropped` |
| `onObjectRandomize` | **split P6:** d10 tag; Tier B FSM; Tier C via `Sync.player` host-only inside | `core/roll_controller.ttslua` |
| `onObjectLeaveContainer` | d10 tag + host for spawn path | bag die spawn |
| `onPlayerConnect` | host for state rows | `M.setupPlayers` fragments |
| `onPlayerChangeColor` | host for world-affecting state | seat layout / lights |

### 4.4 `Global.call` mutators (`core/global_script.ttslua`)

Audit **each** function below for `requireHostForWorldMutation` at entry (or documented Tier A read-only):

**Gameboard (Tier C):**
`GlobalGameboardApply`, `GlobalGameboardClear`, `GlobalGameboardClearClick`, `GlobalGameboardToggleControlBoardSnaps`, `GlobalGameboardInstallPaletteSnaps`, `GlobalStageLerpOrchestrator`, `GlobalGameboardTokenDroppedOnDiceBag`

**Signal (Tier C):**
`GlobalToggleSignalFireState`

**Dice / rolls (Tier B+C — verify split):**
`GlobalDiceBagClick`, `GlobalDiceBagRightClick`, `GlobalStorytellerDiceBagClick`, `GlobalSpawnDieFromStorytellerBag`, `GlobalSpawnDieFromBag`, `GlobalSpawnDefaultPoolDiceForActive`, `GlobalSpawnActivePoolDiceForActive`, `GlobalSpawnBloodSurgeDice`, `GlobalDestroyAllPlayerBagDice`, `GlobalDestroyBagDice`, `GlobalDestroyBloodSurgeDice`, `GlobalDestroyOneTableBloodSurgeRouse`, `GlobalDestroyNonRouseDiceForRoll`, `GlobalDestroyPlayerTableDiceForRoll`, `GlobalRemoveDieFromBag`, `GlobalReleaseBagDice`, `GlobalReleaseRouseDiceForActiveRoll`, `GlobalWaitDrawerThenReleaseBagDice`, `GlobalOnBagDieSpawned`, `GlobalOnBagDieRemoved`, `GlobalTagDieForActiveRoll`, `GlobalPostRollRemoveDie`, `GlobalPostRollAddDie`, `GlobalPostRollModifyPool`, `GlobalInitiateRoll`, `GlobalRollSpawnDieRequest`, `GlobalAdjustStorytellerPoolKind`, `GlobalConsumePendingRollCleanup`, `GlobalCancelPendingRollCleanup`

**Read-only / gates (should NOT host-guard):**
`GlobalIsStorytellerSteamPlayer`, `GlobalRequireHostForWorldMutation`, `GlobalGetRollPhase`, `GlobalResolveSheetPlayerID`, `GlobalGetMergedPlayerData`, `GlobalGetResolvedStatChangesForPlayer`, `GlobalGetSeatLayoutCenterPoint`, `GlobalIsPlayerDiceBagEnabled`, `GlobalReportBagDiceCount`, `GlobalCollectSheetImageUpdates`, `GlobalRollSeatCamera`, `GlobalGameboardSyncSnapsToggleLabel`, `GlobalRegisterTrackerDisplay`, `GlobalSetSheetCamera`

### 4.5 Sync orchestrator (`core/sync.ttslua`)

| API | Non-host must | Host-only section |
| --- | --- | --- |
| `Sync.full` | UI delta only | full reconcile chain |
| `Sync.npcs` | no-op | `NPCS.reconcileAllFromState` |
| `Sync.lighting` | no-op | scenes + `L.InitLights` |
| `Sync.soundscape` / `Sync.lightRef` / `Sync.npcCutouts` | no-op | domain reconcilers |
| `Sync.player` | HUD/overlays/`UpdateUIDisplays` | `L.reconcileForPlayer` |
| `Sync.ui` | allowed all clients | — |

Trace **call sites** outside `sync.ttslua`: `grep 'Sync\.(full|npcs|player|lighting)' core/ lib/ ui/ objects/`.

### 4.6 HUD handlers (`core/global_script.ttslua`)

Classify every `HUD_*` (80+ functions). Priority **ST state+world** (must host-guard Tier C or delegate to guarded Global):

- Scenes: `HUD_changeScene`, `HUD_scenesLibApply`, `HUD_scenesLibEnd`, `HUD_scenesApplyLocation`, `HUD_scenesApplyClock`, `HUD_scenesCtorImportConfirm`, `HUD_scenesCtorForkConfirm`, …
- Soundscape: `HUD_soundscapeSetMusicMood`, `HUD_soundscapeSetBackgroundLocation`, `HUD_soundscapePlayFeatured`, `HUD_soundscapeStopFeatured`, `HUD_soundscapeStopAll`, …
- Roll: `HUD_rollRollButton`, `HUD_rollInitiate`, `HUD_rollConfirm`, … — **P5:** `Global.call` for spawn/release
- System: `HUD_resetGame`, `HUD_syncAll`, `HUD_advancePhase`
- UI-only (Tier A): panel toggles, modal open/close, debug sliders that only affect local debug state

Cross-check [Dual-apply survey](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md) for soundscape/scene HUD eager apply + `Sync.full`.

### 4.7 Domain modules (called from Global or fan-out)

| Module | Key mutators / reconcilers | Audit focus |
| --- | --- | --- |
| `core/npc_gameboard.ttslua` | `syncNpcsFromControlBoard`, `onNpcControlTokenDropped`, Apply/Clear | P2 host at Global entry; P4 tag guards; P7 no force+bypass without reason |
| `core/npcs.ttslua` | `reconcileAllFromState`, `onObjectDropped`, figurine moves | Must only run host-side via Sync/Global |
| `core/scenes.ttslua` | `reconcileFromState`, `loadScene` | P1 no hidden world writes in mutation APIs |
| `core/soundscape.ttslua` | `reconcileFromState`, HUD eager paths | P7 fingerprint |
| `core/lighting.ttslua` | `reconcileForPlayer`, `SetLightMode`, `InitLights` | Tier C host-only entry |
| `core/roll_controller.ttslua` | FSM, `Sync.player` calls | P6 split |
| `core/storyteller_scenes_panel.ttslua` | scene apply | P7 + host |

### 4.8 Object & UI scripts

| Script | Pattern | Policies |
| --- | --- | --- |
| `objects/npc_control_board.ttslua` | `Global.call` + `GlobalIsStorytellerSteamPlayer` | P8 reference implementation |
| `objects/dice_bag.ttslua` | clicks → `GlobalDiceBagClick` etc. | P5, P8 |
| `objects/npc_control_board_palette.ttslua` | onLoad → Global install | P2 |
| `ui/ui_signal_candle.ttslua` | → `GlobalToggleSignalFireState` | P5 |
| `ui/ui_tarot_button.ttslua` | local `setPosition`? | P2 host before move |
| `ui/ui_csheet_core.ttslua` | `Global.call` mutators | P5 host inside Global |

Scan **all** `objects/*.ttslua`, `ui/ui_*.ttslua` not listed — supplemental requirement.

### 4.9 P7 Dual-apply (cross-cutting)

For each flow in [Dual-apply survey](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md) matrix row, re-verify code still matches **Mitigated** / **Open** status. Flag any new eager apply + `Sync.full` in same handler without `markReconciledToCurrentState` / `commitEagerSteadyState` / `invalidateReconcileCache`.

### 4.10 P10 Live state broadcast (document only)

Do **not** plan removal of host guards. If join-client HUD staleness is root-caused, plan a **future** broadcast bridge separately; note in **Out of scope** unless author directs implementation.

---

## 5. Implementation plan requirements

When drafting the plan from findings:

### 5.1 Fix patterns (prefer in order)

1. **Add missing `requireHostForWorldMutation(context)`** at Tier C entry — use stable context string matching function name.
2. **Add steam gate** where ST-only interaction missing on fan-out.
3. **Add O(1) tag/GUID guard** before heavy work (P4).
4. **Split handler** — early Tier B for all clients; host-only block for Tier C (rolls pattern).
5. **Route through `Global.call`** — object/UI join-client Tier C; callee host-guards.
6. **Dual-apply** — prime fingerprint or invalidate cache per Dual-apply survey.
7. **Refactor** — only when 1–6 insufficient; document why.

### 5.2 Anti-patterns (do not recommend)

- Removing host guards so join clients mutate world to “sync faster”
- Host-guarding entire `onObjectRandomize` (P6)
- `require("core.*")` inside object scripts for mutations (P8)
- Hiding `Sync.full` inside `S.setStateVal` (P1)
- Broad `Sync.full({ force = true })` to fix dual-apply without fingerprint (P7)

### 5.3 Each plan item must include

- **Files + function names** (line refs if helpful)
- **Policies satisfied**
- **Over-gating risk** — what join-client behavior to retest (TOR-144 phase)
- **Lua local function order** — if adding/moving helpers
- **Doc updates** — Event Listener Policy row, Bootstrap Authority if new handler
- **Solo regression** — Gameboard Apply/Clear, one dice path, `npm run build` if UI

### 5.4 Suggested waves (default grouping)

| Wave | Scope | Typical policies |
| --- | --- | --- |
| **W1** | Bootstrap / `onLoad` / `onSave` / object onLoad | P2 |
| **W2** | Fan-out handlers + missing Global host guards | P2, P3, P4, P6 |
| **W3** | HUD ST world + soundscape/scene dual-apply | P1, P5, P7 |
| **W4** | Object/UI scripts + `Global.call` routing | P5, P8 |
| **W5** | Inventory + docs + grep CI suggestions | P9 |
| **W6** | Human TOR-144 session | validation |

---

## 6. Verification mapping

Map every **P0/P1** plan item to [Preparing For Multiplayer §2](Preparing%20For%20Multiplayer.md) phase:

| Playbook phase | Exercises |
| --- | --- |
| A | Join bootstrap, `isHostClient` |
| B | Apply/Clear/drop/scene/signal/soundscape |
| C | Join-client roll / `Global.call` dice |
| D | HUD refresh; document P10 count mismatch |
| E | Reconnect |

Agent has **not** closed the audit until the plan includes this mapping.

---

## 7. Agent quality bar

- **No bare TOR-*** in findings — always label (e.g. TOR-144 multiplayer E2E).
- Cite code with `filepath` and symbol names; line numbers optional (may drift).
- Distinguish **confirmed fail** vs **risk / needs human multiplayer test**.
- Supplemental discoveries section must be non-empty or explicitly state codebase matches seed list with mechanical search evidence.
- Keep audit report and implementation plan **separate files** or clearly separated H1 sections if combined.
- Do not conflate this audit with [Performance Audit](../Sychronizing%20Game%20Functionality/Performance%20Audit.md) rank-0–7 latency work unless a finding violates P4 on fan-out.

---

## 8. Related follow-ups (reference in plan Out of scope)

| Item | Linear / doc |
| --- | --- |
| Multi-client E2E execution | TOR-144, [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) |
| `Sync.full` / `Sync.npcs` call-site pass | TOR-168 |
| Dual-apply agent review | TOR-102 |
| Live `gameState` broadcast | Bootstrap Authority § follow-up; P10 |
| Event listener lag (P4 only) | TOR-197, Performance Audit |

---

*End of agent instructions. Seed list current as of audit doc authoring; agent must reconcile with live `git` state and update seed tables when reporting registry drift.*
